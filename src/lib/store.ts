import { create } from "zustand";
import {
  defaultEffortFor,
  effortLabel,
  effortsFor,
  matchEffort,
  matchModel,
  modelsFor,
  slashFor,
} from "./catalog";
import { formatOutgoing } from "./fs";
import {
  DEFAULT_ENABLED,
  LIBRARY,
  LIBRARY_KEY,
  type Addon,
  type AddonKind,
} from "./library";
import {
  blocksToPlain,
  extractSendMessages,
  parseAgentOutput,
} from "./parse-agent";
import { formatRoster, titleFromPrompt } from "./prompts";
import {
  PROVIDERS_KEY,
  resolveProvider,
  type CustomProvider,
} from "./providers";
import { SEED_SESSIONS } from "./seed";
import type {
  AgentRosterItem,
  Attachment,
  Block,
  ChatMessage,
  LayoutView,
  Session,
} from "./types";
import { projectById } from "./types";
import { uid } from "./utils";

const ONBOARD_KEY = "helix-onboarding-v1";
const FOLDERS_KEY = "helix-folders-v1";
const MAX_HOP = 3;
const abortBySession = new Map<string, AbortController>();
const hopBySession = new Map<string, number>();

type InboxItem = {
  text: string;
  incoming: Incoming;
};
const inbox = new Map<string, InboxItem[]>();
const busLog: { from: string; to: string; at: number; hash: string }[] = [];

export type RecentFolder = {
  name: string;
  path: string;
  language: string;
  hint: string;
};

export type Incoming = {
  fromSessionId: string;
  fromProviderId: string;
  fromTitle: string;
  hop: number;
};

export type SendOpts = {
  attachments?: Attachment[];
  incoming?: Incoming;
};

type CreateOpts = {
  providerId: string;
  projectId: string;
  prompt: string;
  model?: string;
  effort?: string;
  cwd?: string;
  attachments?: Attachment[];
};

export type HelixState = {
  sessions: Session[];
  activeId: string | null;
  splitIds: [string, string] | null;
  view: LayoutView;
  onboarding: boolean;
  mobileNav: "desk" | "sessions";
  clock: number;
  newOpen: boolean;
  enabledAddons: string[];
  customAddons: Addon[];
  customProviders: CustomProvider[];
  recentFolders: RecentFolder[];

  setView: (v: LayoutView) => void;
  setActive: (id: string) => void;
  setSplit: (ids: [string, string]) => void;
  setNewOpen: (open: boolean) => void;
  setMobileNav: (v: "desk" | "sessions") => void;
  tick: () => void;
  restoreOnboarding: () => void;
  dismissOnboarding: () => void;
  resetDemo: () => void;
  finishCodexDemo: () => void;
  rememberFolder: (folder: RecentFolder) => void;
  createSession: (opts: CreateOpts) => void;
  send: (sessionId: string, text: string, opts?: SendOpts) => Promise<void>;
  messageSession: (
    fromId: string,
    toQuery: string,
    text: string,
    opts?: { echo?: boolean },
  ) => boolean;
  stop: (sessionId: string) => void;
  setSessionModel: (sessionId: string, model: string) => void;
  setSessionEffort: (sessionId: string, effort: string) => void;
  toggleAddon: (id: string) => void;
  importAddon: (addon: Omit<Addon, "id" | "custom">) => void;
  removeAddon: (id: string) => void;
  addCustomProvider: (
    p: Omit<CustomProvider, "connected" | "id"> & { id?: string },
  ) => void;
  removeCustomProvider: (id: string) => void;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persistLibrary(enabled: string[], custom: Addon[]) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify({ enabled, custom }));
  } catch {
    /* ignore quota */
  }
}

function persistProviders(list: CustomProvider[]) {
  try {
    localStorage.setItem(PROVIDERS_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
}

function persistFolders(list: RecentFolder[]) {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
}

function slugId(name: string, taken: Set<string>) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "provider";
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

function systemNote(text: string): ChatMessage {
  return {
    id: uid("m"),
    role: "system",
    createdAt: Date.now(),
    blocks: [{ type: "text", text }],
  };
}

function patchSession(
  sessions: Session[],
  id: string,
  fn: (s: Session) => Session,
): Session[] {
  return sessions.map((s) => (s.id === id ? fn(s) : s));
}

function addonNames(
  enabled: string[],
  custom: Addon[],
  kind: AddonKind,
  providerId: string,
) {
  return [...LIBRARY, ...custom]
    .filter(
      (a) =>
        a.kind === kind &&
        enabled.includes(a.id) &&
        (a.providers.includes(providerId) ||
          a.providers.includes("*") ||
          a.custom),
    )
    .map((a) => a.name);
}

function rosterFor(
  sessions: Session[],
  selfId: string,
  custom: CustomProvider[],
): AgentRosterItem[] {
  return sessions
    .filter((s) => s.id !== selfId)
    .map((s) => ({
      id: s.id,
      title: s.title,
      providerId: s.providerId,
      provider: resolveProvider(s.providerId, custom).short,
      cwd: s.cwd,
      model: s.model,
      status: s.status,
    }));
}

function resolveTarget(
  sessions: Session[],
  fromId: string,
  query: string,
  custom: CustomProvider[],
): Session | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const others = sessions.filter((s) => s.id !== fromId);
  const scored = others
    .map((s) => {
      const short = resolveProvider(s.providerId, custom).short.toLowerCase();
      const title = s.title.toLowerCase();
      const id = s.id.toLowerCase();
      let score = 0;
      if (id === q || short === q) score = 100;
      else if (id.startsWith(q) || short.startsWith(q)) score = 80;
      else if (id.includes(q) || short.includes(q) || title.includes(q)) score = 50;
      else if (s.providerId.toLowerCase() === q) score = 70;
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.s.updatedAt - a.s.updatedAt);
  return scored[0]?.s;
}

function hashText(s: string) {
  return s.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 240);
}

function busAllowed(from: string, to: string, text: string, hop: number) {
  if (from === to) return "Cannot message this session.";
  if (hop > MAX_HOP) return "Desk bus stopped the loop (hop limit).";
  const now = Date.now();
  const h = hashText(text);
  const recent = busLog.filter((e) => now - e.at < 90_000);
  busLog.length = 0;
  busLog.push(...recent);
  if (recent.filter((e) => e.from === from && e.to === to).length >= 4) {
    return "Desk bus rate-limited this pair.";
  }
  if (recent.some((e) => e.from === from && e.to === to && e.hash === h)) {
    return "Dropped a duplicate message.";
  }
  busLog.push({ from, to, at: now, hash: h });
  return null;
}

function fillListAgents(blocks: Block[], roster: string): Block[] {
  return blocks.map((b) =>
    b.type === "tool" && /^listagents$/i.test(b.name)
      ? { ...b, content: roster, status: "done" as const }
      : b,
  );
}

export const useHelix = create<HelixState>((set, get) => ({
  sessions: SEED_SESSIONS,
  activeId: SEED_SESSIONS[0]?.id ?? null,
  splitIds: null,
  view: "mosaic",
  onboarding: true,
  mobileNav: "desk",
  clock: Date.now(),
  newOpen: false,
  enabledAddons: DEFAULT_ENABLED,
  customAddons: [],
  customProviders: [],
  recentFolders: [],

  setView: (view) => set({ view, mobileNav: "desk" }),
  setActive: (id) =>
    set({ activeId: id, view: "focus", mobileNav: "desk" }),
  setSplit: (ids) => set({ splitIds: ids, view: "split", mobileNav: "desk" }),
  setNewOpen: (newOpen) => set({ newOpen }),
  setMobileNav: (mobileNav) => set({ mobileNav }),
  tick: () => set({ clock: Date.now() }),

  restoreOnboarding: () => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(ONBOARD_KEY);
    const lib = readJson<{ enabled?: string[]; custom?: Addon[] }>(
      LIBRARY_KEY,
      {},
    );
    const prov = readJson<CustomProvider[]>(PROVIDERS_KEY, []);
    const folders = readJson<RecentFolder[]>(FOLDERS_KEY, []);
    set({
      onboarding: seen !== "1",
      enabledAddons: lib.enabled ?? DEFAULT_ENABLED,
      customAddons: Array.isArray(lib.custom) ? lib.custom : [],
      customProviders: Array.isArray(prov) ? prov : [],
      recentFolders: Array.isArray(folders) ? folders : [],
    });
  },

  dismissOnboarding: () => {
    try {
      localStorage.setItem(ONBOARD_KEY, "1");
    } catch {
      /* ignore */
    }
    set({ onboarding: false });
  },

  resetDemo: () =>
    set({
      sessions: SEED_SESSIONS,
      activeId: SEED_SESSIONS[0]?.id ?? null,
      splitIds: null,
      view: "mosaic",
    }),

  finishCodexDemo: () => {
    set((state) => ({
      sessions: patchSession(state.sessions, "ses-codex-flake", (s) => {
        if (s.status !== "running") return s;
        const messages = s.messages.map((m) => {
          if (m.id !== "m-x-a1") return m;
          const blocks = m.blocks.map((b) => {
            if (b.type === "tool" && b.status === "running") {
              return {
                ...b,
                status: "done" as const,
                content: `${b.content}
[5/8] passed
[6/8] passed
[7/8] passed
[8/8] passed

  8 passed (8)`,
              };
            }
            return b;
          });
          return {
            ...m,
            blocks: [
              ...blocks,
              {
                type: "text" as const,
                text: "8/8 green after waiting on `data-ready`. Race was the webhook vs navigate, not Playwright itself.",
              },
            ],
          };
        });
        return { ...s, messages, status: "idle", updatedAt: Date.now() };
      }),
    }));
  },

  rememberFolder: (folder) => {
    const next = [
      folder,
      ...get().recentFolders.filter((f) => f.path !== folder.path),
    ].slice(0, 6);
    persistFolders(next);
    set({ recentFolders: next });
  },

  createSession: ({
    providerId,
    projectId,
    prompt,
    model,
    effort,
    cwd,
    attachments,
  }) => {
    const p = resolveProvider(providerId, get().customProviders);
    const project = projectById(projectId);
    const session: Session = {
      id: uid("ses"),
      title: titleFromPrompt(prompt),
      providerId,
      projectId,
      cwd: cwd?.trim() || project.path,
      model: model ?? p.defaultModel,
      effort: effort ?? defaultEffortFor(providerId),
      status: "idle",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      turns: 0,
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeId: session.id,
      view: "focus",
      newOpen: false,
      mobileNav: "desk",
    }));
    void get().send(session.id, prompt, { attachments });
  },

  setSessionModel: (sessionId, model) => {
    set((state) => ({
      sessions: patchSession(state.sessions, sessionId, (s) => ({
        ...s,
        model,
        updatedAt: Date.now(),
      })),
    }));
  },

  setSessionEffort: (sessionId, effort) => {
    set((state) => ({
      sessions: patchSession(state.sessions, sessionId, (s) => ({
        ...s,
        effort,
        updatedAt: Date.now(),
      })),
    }));
  },

  toggleAddon: (id) => {
    const { enabledAddons, customAddons } = get();
    const next = enabledAddons.includes(id)
      ? enabledAddons.filter((x) => x !== id)
      : [...enabledAddons, id];
    persistLibrary(next, customAddons);
    set({ enabledAddons: next });
  },

  importAddon: (addon) => {
    const item: Addon = { ...addon, id: uid("addon"), custom: true };
    const { enabledAddons, customAddons } = get();
    const custom = [...customAddons, item];
    const enabled = [...enabledAddons, item.id];
    persistLibrary(enabled, custom);
    set({ customAddons: custom, enabledAddons: enabled });
  },

  removeAddon: (id) => {
    const { enabledAddons, customAddons } = get();
    const custom = customAddons.filter((a) => a.id !== id);
    const enabled = enabledAddons.filter((x) => x !== id);
    persistLibrary(enabled, custom);
    set({ customAddons: custom, enabledAddons: enabled });
  },

  addCustomProvider: (p) => {
    const taken = new Set(get().customProviders.map((c) => c.id));
    const id = p.id && !taken.has(p.id) ? p.id : slugId(p.name, taken);
    const next: CustomProvider = {
      id,
      name: p.name,
      vendor: p.vendor,
      auth: p.auth,
      authLabel: p.authLabel,
      endpoint: p.endpoint,
      apiKey: p.apiKey,
      models: p.models.length ? p.models : ["default"],
      defaultModel: p.defaultModel || p.models[0] || "default",
      connected: true,
    };
    const list = [...get().customProviders.filter((c) => c.id !== id), next];
    persistProviders(list);
    set({ customProviders: list });
  },

  removeCustomProvider: (id) => {
    const list = get().customProviders.filter((c) => c.id !== id);
    persistProviders(list);
    set({ customProviders: list });
  },

  stop: (sessionId) => {
    abortBySession.get(sessionId)?.abort();
    abortBySession.delete(sessionId);
    set((state) => ({
      sessions: patchSession(state.sessions, sessionId, (s) => ({
        ...s,
        status: "waiting",
        updatedAt: Date.now(),
        messages: s.messages.map((m) =>
          m.streaming ? { ...m, streaming: false } : m,
        ),
      })),
    }));
  },

  messageSession: (fromId, toQuery, text, opts) => {
    const state = get();
    const from = state.sessions.find((s) => s.id === fromId);
    if (!from) return false;
    const target = resolveTarget(
      state.sessions,
      fromId,
      toQuery,
      state.customProviders,
    );
    if (!target) return false;
    const hop = (hopBySession.get(fromId) ?? 0) + 1;
    const blocked = busAllowed(fromId, target.id, text, hop);
    if (blocked) {
      set((s) => ({
        sessions: patchSession(s.sessions, fromId, (ses) => ({
          ...ses,
          messages: [...ses.messages, systemNote(blocked)],
          updatedAt: Date.now(),
        })),
      }));
      return true;
    }
    const toShort = resolveProvider(target.providerId, state.customProviders)
      .short;
    if (opts?.echo) {
      set((s) => ({
        sessions: patchSession(s.sessions, fromId, (ses) => ({
          ...ses,
          updatedAt: Date.now(),
          messages: [
            ...ses.messages,
            {
              id: uid("m"),
              role: "assistant" as const,
              createdAt: Date.now(),
              blocks: [
                {
                  type: "tool" as const,
                  name: "SendMessage",
                  to: `${toShort} · ${target.title}`,
                  content: text,
                  status: "done" as const,
                },
              ],
            },
          ],
        })),
      }));
    }
    void deliverTo(get, {
      fromId,
      fromProviderId: from.providerId,
      fromTitle: from.title,
      targetId: target.id,
      text,
      hop,
    });
    return true;
  },

  send: async (sessionId, text, opts) => {
    const trimmed = text.trim();
    const attachments = opts?.attachments ?? [];
    if (!trimmed && attachments.length === 0) return;

    if (!opts?.incoming && trimmed.startsWith("/")) {
      const handled = runSlash(get, set, sessionId, trimmed);
      if (handled) return;
    }

    const state = get();
    const session = state.sessions.find((s) => s.id === sessionId);
    if (!session) return;

    if (session.status === "running") {
      if (opts?.incoming) {
        const q = inbox.get(sessionId) ?? [];
        if (q.length < 8) {
          inbox.set(sessionId, [
            ...q,
            { text: trimmed, incoming: opts.incoming },
          ]);
        }
      }
      return;
    }

    abortBySession.get(sessionId)?.abort();
    const ac = new AbortController();
    abortBySession.set(sessionId, ac);

    const hop = opts?.incoming?.hop ?? 0;
    hopBySession.set(sessionId, hop);

    const outgoing = formatOutgoing(trimmed, attachments);
    const userMsg: ChatMessage = opts?.incoming
      ? {
          id: uid("m"),
          role: "agent",
          createdAt: Date.now(),
          blocks: [{ type: "text", text: trimmed }],
          fromSessionId: opts.incoming.fromSessionId,
          fromProviderId: opts.incoming.fromProviderId,
          fromTitle: opts.incoming.fromTitle,
          hop,
        }
      : {
          id: uid("m"),
          role: "user",
          createdAt: Date.now(),
          blocks: [{ type: "text", text: trimmed || "Attached files" }],
          attachments: attachments.length ? attachments : undefined,
        };

    const asstId = uid("m");
    const asstMsg: ChatMessage = {
      id: asstId,
      role: "assistant",
      createdAt: Date.now(),
      blocks: [],
      raw: "",
      streaming: true,
    };

    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (ses) => ({
        ...ses,
        title:
          ses.turns === 0 && ses.messages.length === 0
            ? titleFromPrompt(trimmed || attachments[0]?.name || "Session")
            : ses.title,
        status: "running",
        updatedAt: Date.now(),
        turns: ses.turns + 1,
        messages: [...ses.messages, userMsg, asstMsg],
      })),
    }));

    const latest = get().sessions.find((s) => s.id === sessionId);
    if (!latest) return;
    const provider = resolveProvider(latest.providerId, get().customProviders);
    const history = latest.messages
      .filter(
        (m) =>
          m.role === "user" || m.role === "assistant" || m.role === "agent",
      )
      .filter((m) => m.id !== asstId)
      .map((m) => {
        if (m.role === "agent") {
          const who = resolveProvider(
            m.fromProviderId ?? "",
            get().customProviders,
          ).short;
          return {
            role: "user" as const,
            content: `[Peer agent: ${who} · ${m.fromTitle ?? "session"}]\nIncoming message from another WestCode session. Act on it. SendMessage a result back if they need one.\n\n${blocksToPlain(m.blocks)}`.slice(
              0,
              6000,
            ),
          };
        }
        const content =
          m.role === "user"
            ? formatOutgoing(blocksToPlain(m.blocks), m.attachments)
            : blocksToPlain(m.blocks);
        return {
          role: m.role as "user" | "assistant",
          content: content.slice(0, 6000),
        };
      });

    if (opts?.incoming) {
      const last = history[history.length - 1];
      if (last) last.content = last.content;
    } else if (attachments.length && history.length) {
      const last = history[history.length - 1];
      if (last && last.role === "user") last.content = outgoing.slice(0, 6000);
    }

    const { enabledAddons, customAddons, customProviders } = get();
    const roster = rosterFor(get().sessions, sessionId, customProviders);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: latest.providerId,
          providerName: provider.name,
          vendor: provider.vendor,
          projectId: latest.projectId,
          cwd: latest.cwd,
          model: latest.model,
          effort: latest.effort,
          selfId: latest.id,
          roster,
          skills: addonNames(
            enabledAddons,
            customAddons,
            "skill",
            latest.providerId,
          ),
          connectors: addonNames(
            enabledAddons,
            customAddons,
            "connector",
            latest.providerId,
          ),
          messages: history,
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Chat failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let carry = "";
      let raw = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        carry += dec.decode(value, { stream: true });
        const lines = carry.split("\n");
        carry = lines.pop() ?? "";
        for (const line of lines) {
          const row = line.trim();
          if (!row.startsWith("data:")) continue;
          const data = row.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data) as {
              content?: string;
              error?: string;
            };
            if (json.error) throw new Error(json.error);
            if (json.content) {
              raw += json.content;
              const blocks = parseAgentOutput(raw);
              set((s) => ({
                sessions: patchSession(s.sessions, sessionId, (ses) => ({
                  ...ses,
                  updatedAt: Date.now(),
                  messages: ses.messages.map((m) =>
                    m.id === asstId
                      ? { ...m, raw, blocks, streaming: true }
                      : m,
                  ),
                })),
              }));
            }
          } catch (err) {
            if (err instanceof SyntaxError) continue;
            throw err;
          }
        }
      }

      const rosterText = formatRoster(roster);
      const finalBlocks = fillListAgents(parseAgentOutput(raw), rosterText);

      set((s) => ({
        sessions: patchSession(s.sessions, sessionId, (ses) => ({
          ...ses,
          status: "waiting",
          updatedAt: Date.now(),
          messages: ses.messages.map((m) =>
            m.id === asstId
              ? {
                  ...m,
                  streaming: false,
                  blocks: finalBlocks,
                }
              : m,
          ),
        })),
      }));

      const sends = extractSendMessages(finalBlocks);
      if (sends.length) {
        queueMicrotask(() => {
          for (const msg of sends) {
            get().messageSession(sessionId, msg.to, msg.text);
          }
        });
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      set((s) => ({
        sessions: patchSession(s.sessions, sessionId, (ses) => ({
          ...ses,
          status: "error",
          updatedAt: Date.now(),
          messages: ses.messages.map((m) =>
            m.id === asstId
              ? {
                  ...m,
                  streaming: false,
                  blocks: [
                    {
                      type: "text" as const,
                      text: `The agent did not respond. ${(err as Error).message}`,
                    },
                  ],
                }
              : m,
          ),
        })),
      }));
    } finally {
      abortBySession.delete(sessionId);
      const queued = inbox.get(sessionId);
      if (queued?.length) {
        const next = queued.shift();
        inbox.set(sessionId, queued);
        if (next) {
          queueMicrotask(() => {
            void get().send(sessionId, next.text, { incoming: next.incoming });
          });
        }
      }
    }
  },
}));

async function deliverTo(
  get: () => HelixState,
  opts: {
    fromId: string;
    fromProviderId: string;
    fromTitle: string;
    targetId: string;
    text: string;
    hop: number;
  },
) {
  const target = get().sessions.find((s) => s.id === opts.targetId);
  if (!target) return;
  await get().send(opts.targetId, opts.text, {
    incoming: {
      fromSessionId: opts.fromId,
      fromProviderId: opts.fromProviderId,
      fromTitle: opts.fromTitle,
      hop: opts.hop,
    },
  });
}

function runSlash(
  get: () => HelixState,
  set: (
    partial:
      | Partial<HelixState>
      | ((s: HelixState) => Partial<HelixState>),
  ) => void,
  sessionId: string,
  raw: string,
): boolean {
  const session = get().sessions.find((s) => s.id === sessionId);
  if (!session) return true;
  const match = /^\/([a-z0-9-]+)(?:\s+([\s\S]+))?$/i.exec(raw);
  if (!match) return false;
  const cmd = match[1]!.toLowerCase();
  const arg = (match[2] ?? "").trim();
  const known = slashFor(session.providerId);
  const spec = known.find((c) => c.cmd === cmd);

  const note = (text: string) => {
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (ses) => ({
        ...ses,
        updatedAt: Date.now(),
        messages: [...ses.messages, systemNote(text)],
      })),
    }));
  };

  const local = new Set([
    "help",
    "clear",
    "compact",
    "compress",
    "model",
    "effort",
    "skills",
    "mcp",
    "plugin",
    "cost",
    "status",
    "permissions",
    "context",
    "fast",
    "approvals",
    "rules",
    "agents",
    "peers",
    "list-agents",
    "msg",
  ]);

  if (!spec && !local.has(cmd)) return false;
  if (spec && spec.kind === "skill") return false;
  if (!local.has(cmd)) return false;

  if (cmd === "help") {
    const lines = known
      .map((c) => `/${c.cmd}${c.args ? ` ${c.args}` : ""}  — ${c.hint}`)
      .join("\n");
    note(
      `${resolveProvider(session.providerId, get().customProviders).short} commands\n\n${lines}`,
    );
    return true;
  }

  if (cmd === "agents" || cmd === "peers" || cmd === "list-agents") {
    const roster = rosterFor(
      get().sessions,
      sessionId,
      get().customProviders,
    );
    note(`WestCode desk roster\n\n${formatRoster(roster)}`);
    return true;
  }

  if (cmd === "msg") {
    const split = arg.match(/^(\S+)\s+([\s\S]+)$/);
    if (!split) {
      note("Usage: /msg <session> <text>\nTry /agents for the roster.");
      return true;
    }
    const ok = get().messageSession(sessionId, split[1]!, split[2]!, {
      echo: true,
    });
    if (!ok) note(`No session matching “${split[1]}”. Try /agents.`);
    return true;
  }

  if (cmd === "clear") {
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (ses) => ({
        ...ses,
        messages: [systemNote("Conversation cleared.")],
        turns: 0,
        updatedAt: Date.now(),
        status: "idle",
      })),
    }));
    return true;
  }

  if (cmd === "compact" || cmd === "compress") {
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (ses) => {
        const kept = ses.messages.filter((m) => m.role !== "system").slice(-4);
        const focus = arg ? ` Focus: ${arg}.` : "";
        return {
          ...ses,
          messages: [
            systemNote(`Context compacted.${focus} Last turns kept.`),
            ...kept,
          ],
          updatedAt: Date.now(),
        };
      }),
    }));
    return true;
  }

  if (cmd === "model") {
    const extras = resolveProvider(session.providerId, get().customProviders)
      .models;
    if (!arg) {
      const list = modelsFor(session.providerId, extras)
        .map((m) =>
          m.id === session.model ? `• ${m.label}  (current)` : `  ${m.label}`,
        )
        .join("\n");
      note(`Models for this provider\n\n${list}`);
      return true;
    }
    const found = matchModel(session.providerId, arg, extras);
    if (!found) {
      note(`Unknown model “${arg}”. Try /model for the list.`);
      return true;
    }
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (ses) => ({
        ...ses,
        model: found.id,
        updatedAt: Date.now(),
        messages: [
          ...ses.messages,
          systemNote(`Model set to ${found.label}.`),
        ],
      })),
    }));
    return true;
  }

  if (cmd === "effort") {
    if (!arg) {
      const list = effortsFor(session.providerId)
        .map((e) =>
          e.id === session.effort
            ? `• ${e.label}  (${e.id}) — ${e.hint}  (current)`
            : `  ${e.label}  (${e.id}) — ${e.hint}`,
        )
        .join("\n");
      note(`Effort for this provider\n\n${list}`);
      return true;
    }
    const found = matchEffort(session.providerId, arg);
    if (!found) {
      note(`Unknown effort “${arg}”. Try /effort for the list.`);
      return true;
    }
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (ses) => ({
        ...ses,
        effort: found.id,
        updatedAt: Date.now(),
        messages: [
          ...ses.messages,
          systemNote(`Effort set to ${found.label}.`),
        ],
      })),
    }));
    return true;
  }

  if (cmd === "fast") {
    const low = session.effort === "low" || session.effort === "minimal";
    const next = low
      ? defaultEffortFor(session.providerId)
      : effortsFor(session.providerId).some((e) => e.id === "minimal")
        ? "minimal"
        : "low";
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (ses) => ({
        ...ses,
        effort: next,
        updatedAt: Date.now(),
        messages: [
          ...ses.messages,
          systemNote(
            low
              ? `Fast mode off. Effort ${effortLabel(session.providerId, next)}.`
              : `Fast mode on. Effort ${effortLabel(session.providerId, next)}.`,
          ),
        ],
      })),
    }));
    return true;
  }

  if (cmd === "skills" || cmd === "plugin" || cmd === "mcp") {
    const kind: AddonKind =
      cmd === "skills" ? "skill" : cmd === "plugin" ? "plugin" : "connector";
    const { enabledAddons, customAddons } = get();
    const names = addonNames(
      enabledAddons,
      customAddons,
      kind,
      session.providerId,
    );
    const label =
      kind === "skill" ? "Skills" : kind === "plugin" ? "Plugins" : "Connectors";
    note(
      names.length
        ? `${label} enabled for this provider\n\n${names.map((n) => `• ${n}`).join("\n")}\n\nToggle more in Library.`
        : `No ${label.toLowerCase()} enabled for this provider. Open Library to add them.`,
    );
    return true;
  }

  if (cmd === "cost" || cmd === "context") {
    note(
      `Turns: ${session.turns}\nModel: ${session.model}\nEffort: ${effortLabel(session.providerId, session.effort)}\nMessages: ${session.messages.length}\nAuth: ${resolveProvider(session.providerId, get().customProviders).authLabel}`,
    );
    return true;
  }

  if (
    cmd === "status" ||
    cmd === "permissions" ||
    cmd === "approvals" ||
    cmd === "rules"
  ) {
    const p = resolveProvider(session.providerId, get().customProviders);
    note(
      `${p.name}\n${p.protocol}\nAuth: ${p.authLabel}\nBinary: ${p.binary}\nCwd: ${session.cwd}\n${cmd === "permissions" || cmd === "approvals" ? "Unattended tools: Read, Grep. Write/Edit/Bash ask first." : "Project rules load from the repo (CLAUDE.md / AGENTS.md)."}`,
    );
    return true;
  }

  return false;
}
