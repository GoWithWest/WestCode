import { create } from "zustand";
import {
  DEFAULT_PERMISSION,
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
  AGENTS_KEY,
  PRESET_AGENTS,
  agentPreamble,
  extractMentions,
  personaAssignment,
  type AgentProfile,
} from "./agents";
import { blocksToPlain, extractSendMessages } from "./parse-agent";
import { deskPreamble, formatRoster } from "./prompts";
import {
  PROVIDER_ORDER,
  PROVIDERS_KEY,
  resolveProvider,
  type CustomProvider,
} from "./providers";
import {
  westcode,
  type CliProbe,
  type CliUpdate,
  type LiveAddon,
  type SessionEvent,
} from "./desktop";
import type {
  AgentRosterItem,
  Attachment,
  Block,
  ChatMessage,
  IncomingRef,
  LayoutView,
  Session,
} from "./types";
import { projectById } from "./types";
import { uid } from "./utils";

const ONBOARD_KEY = "helix-onboarding-v1";
const FOLDERS_KEY = "helix-folders-v1";
const DESK_KEY = "helix-desk-v1";
const UPDATES_KEY = "helix-cli-updates-dismissed-v1";
const COLORS_KEY = "helix-provider-colors-v1";

type AgentsPersist = {
  custom: AgentProfile[];
  overrides: Record<string, Partial<AgentProfile>>;
  removed: string[];
};

function mergeAgents(p: AgentsPersist): AgentProfile[] {
  const removed = new Set(p.removed);
  const presets = PRESET_AGENTS.filter((a) => !removed.has(a.id)).map((a) => ({
    ...a,
    ...(p.overrides[a.id] ?? {}),
    id: a.id,
    builtin: true,
  }));
  return [...presets, ...p.custom.filter((a) => !removed.has(a.id))];
}

function persistAgents(p: AgentsPersist) {
  try {
    localStorage.setItem(AGENTS_KEY, JSON.stringify(p));
  } catch {
    /* ignore quota */
  }
}
const MAX_HOP = 6;
const abortBySession = new Map<string, AbortController>();
const hopBySession = new Map<string, number>();
const busLog: { from: string; to: string; at: number; hash: string }[] = [];

export type RecentFolder = {
  name: string;
  path: string;
  language: string;
  hint: string;
};

export type Incoming = IncomingRef;

export type SendOpts = {
  attachments?: Attachment[];
  incoming?: Incoming;
  replay?: boolean;
};

type CreateOpts = {
  providerId: string;
  projectId: string;
  title?: string;
  prompt?: string;
  model?: string;
  effort?: string;
  permissionMode?: string;
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
  agents: AgentProfile[];
  agentsPersist: AgentsPersist;
  providerColors: Record<string, string>;
  cliStatus: CliProbe[];
  cliUpdates: CliUpdate[];
  updateBusy: string | null;
  updateError: string | null;
  liveAddons: LiveAddon[];
  libraryStatus: "idle" | "loading" | "ready";

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
  refreshCli: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  refreshUpdates: () => Promise<void>;
  applyCliUpdate: (id: string) => Promise<void>;
  dismissCliUpdate: (id: string) => void;
  answerPermission: (sessionId: string, optionId: string) => void;
  rememberFolder: (folder: RecentFolder) => void;
  createSession: (opts: CreateOpts) => void;
  send: (sessionId: string, text: string, opts?: SendOpts) => Promise<void>;
  messageSession: (
    fromId: string,
    toQuery: string,
    text: string,
    opts?: { echo?: boolean },
  ) => string | false;
  stop: (sessionId: string) => void;
  setSessionModel: (sessionId: string, model: string) => void;
  setSessionEffort: (sessionId: string, effort: string) => void;
  setSessionPermissionMode: (sessionId: string, mode: string) => void;
  toggleAddon: (id: string) => void;
  importAddon: (addon: Omit<Addon, "id" | "custom">) => void;
  removeAddon: (id: string) => void;
  addCustomProvider: (
    p: Omit<CustomProvider, "connected" | "id"> & { id?: string },
  ) => void;
  removeCustomProvider: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  setSessionCwd: (id: string, cwd: string) => void;
  setSessionAgent: (id: string, agentId: string | undefined) => void;
  addAgent: (a: Omit<AgentProfile, "id" | "builtin"> & { id?: string }) => void;
  updateAgent: (id: string, patch: Partial<AgentProfile>) => void;
  removeAgent: (id: string) => void;
  setProviderColor: (providerId: string, color: string) => void;
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

function sanitizeSession(s: Session): Session {
  return {
    ...s,
    status: s.status === "running" ? "waiting" : s.status,
    permission: null,
    queued: undefined,
    permissionMode: s.permissionMode || DEFAULT_PERMISSION,
    agentSessionId: s.agentSessionId,
    messages: s.messages.map((m) => ({ ...m, streaming: false })),
  };
}

function persistDesk() {
  if (typeof window === "undefined") return;
  try {
    const { sessions, activeId, splitIds, view } = useHelix.getState();
    localStorage.setItem(
      DESK_KEY,
      JSON.stringify({
        sessions: sessions.map(sanitizeSession),
        activeId,
        splitIds,
        view,
      }),
    );
  } catch {
    /* quota */
  }
}

let deskBound = false;
function deskRows(
  sessions: Session[],
  custom: CustomProvider[],
) {
  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
    providerId: s.providerId,
    provider: resolveProvider(s.providerId, custom).short,
    cwd: s.cwd,
    model: s.model,
    status: s.status,
  }));
}

function bindDeskPersist() {
  if (deskBound || typeof window === "undefined") return;
  deskBound = true;
  const push = (s: HelixState) => {
    persistDesk();
    westcode()?.syncDesk?.(deskRows(s.sessions, s.customProviders));
  };
  push(useHelix.getState());
  useHelix.subscribe((s, prev) => {
    if (
      s.sessions !== prev.sessions ||
      s.activeId !== prev.activeId ||
      s.splitIds !== prev.splitIds ||
      s.view !== prev.view
    ) {
      push(s);
    }
  });
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
  live: LiveAddon[] = [],
) {
  const names = [...LIBRARY, ...custom, ...live]
    .filter(
      (a) =>
        a.kind === kind &&
        enabled.includes(a.id) &&
        ((a.providers ?? []).includes(providerId) ||
          (a.providers ?? []).includes("*") ||
          ("custom" in a && a.custom)),
    )
    .map((a) => a.name);
  return [...new Set(names)];
}

function rosterFor(
  sessions: Session[],
  selfId: string,
  custom: CustomProvider[],
  agents: AgentProfile[] = [],
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
      agentName: agents.find((a) => a.id === s.agentId)?.name,
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
  if (recent.filter((e) => e.from === from && e.to === to).length >= 8) {
    return "Desk bus rate-limited this pair.";
  }
  if (recent.some((e) => e.from === from && e.to === to && e.hash === h)) {
    return "Dropped a duplicate message.";
  }
  busLog.push({ from, to, at: now, hash: h });
  return null;
}

function applyEvent(sessionId: string, asstId: string, ev: SessionEvent) {
  const patch = (fn: (s: Session) => Session) =>
    useHelix.setState((s) => ({
      sessions: patchSession(s.sessions, sessionId, fn),
    }));

  if (ev.type === "ready" && ev.agentSessionId) {
    patch((ses) => ({
      ...ses,
      agentSessionId: ev.agentSessionId,
      updatedAt: Date.now(),
    }));
    return;
  }
  if (ev.type === "commands" && ev.commands) {
    patch((ses) => ({ ...ses, slashCommands: ev.commands, updatedAt: Date.now() }));
    return;
  }
  if (ev.type === "models" && ev.models?.length) {
    patch((ses) => ({
      ...ses,
      updatedAt: Date.now(),
      availableModels: ev.models,
      model: ev.models!.some((m) => m.id === ses.model)
        ? ses.model
        : (ev.models![0]!.id ?? ses.model),
    }));
    return;
  }
  if (ev.type === "error" && ev.message) {
    patch((ses) => ({
      ...ses,
      status: "error",
      permission: null,
      updatedAt: Date.now(),
      messages: ses.messages.map((m) =>
        m.id === asstId
          ? {
              ...m,
              streaming: false,
              blocks: m.blocks.length
                ? m.blocks
                : [{ type: "text" as const, text: ev.message! }],
            }
          : m,
      ),
    }));
    return;
  }
  if (ev.type === "permission" && ev.rpcId != null) {
    patch((ses) => ({
      ...ses,
      permission: { rpcId: ev.rpcId!, tool: ev.tool || "tool", options: ev.options || [] },
      updatedAt: Date.now(),
    }));
    return;
  }
  if (ev.type === "thought" && ev.text) {
    patch((ses) => ({
      ...ses,
      updatedAt: Date.now(),
      messages: ses.messages.map((m) => {
        if (m.id !== asstId) return m;
        const blocks = [...m.blocks];
        const last = blocks[blocks.length - 1];
        if (last?.type === "think") {
          blocks[blocks.length - 1] = { type: "think", text: last.text + ev.text };
        } else {
          blocks.push({ type: "think", text: ev.text! });
        }
        return { ...m, blocks, raw: (m.raw ?? "") + ev.text, streaming: true };
      }),
    }));
    return;
  }
  if (ev.type === "text" && ev.text) {
    patch((ses) => ({
      ...ses,
      updatedAt: Date.now(),
      messages: ses.messages.map((m) => {
        if (m.id !== asstId) return m;
        const blocks = [...m.blocks];
        const last = blocks[blocks.length - 1];
        if (last?.type === "text") {
          blocks[blocks.length - 1] = { type: "text", text: last.text + ev.text };
        } else {
          blocks.push({ type: "text", text: ev.text! });
        }
        return { ...m, blocks, raw: (m.raw ?? "") + ev.text, streaming: true };
      }),
    }));
    return;
  }
  if (ev.type === "tool") {
    patch((ses) => ({
      ...ses,
      updatedAt: Date.now(),
      messages: ses.messages.map((m) => {
        if (m.id !== asstId) return m;
        const blocks = [...m.blocks];
        const idx = blocks.findIndex(
          (b) =>
            b.type === "tool" &&
            (ev.toolId
              ? b.path === ev.toolId || b.name === ev.name
              : b.name === ev.name && b.status === "running"),
        );
        const tool: Block = {
          type: "tool",
          name: ev.name || "Tool",
          path: ev.path || ev.toolId,
          command: ev.command,
          content: ev.content || "",
          status: ev.status || "running",
        };
        if (idx >= 0) {
          const prev = blocks[idx] as Extract<Block, { type: "tool" }>;
          // tool_call_update is a PATCH: a completion event often carries only
          // {toolCallId, status}. Never let a fabricated/generic name replace
          // the recorded one — extractSendMessages relies on the original
          // westcode_send_message name to suppress double sends.
          const meaningfulName =
            ev.name && ev.name !== "Tool" ? ev.name : prev.name;
          blocks[idx] = {
            ...tool,
            name: meaningfulName,
            content: tool.content || prev.content,
            path: tool.path || prev.path,
            command: tool.command || prev.command,
          };
        } else {
          blocks.push(tool);
        }
        return { ...m, blocks, streaming: true };
      }),
    }));
  }
}

let eventsBound = false;
function bindDesktopEvents() {
  const api = westcode();
  if (!api || eventsBound) return;
  eventsBound = true;
  api.onEvent((ev) => {
    const pending = promptAsst.get(ev.sessionId);
    if (!pending) {
      if (
        ev.type === "commands" ||
        ev.type === "permission" ||
        ev.type === "models" ||
        ev.type === "ready"
      ) {
        applyEvent(ev.sessionId, "", ev);
      }
      return;
    }
    applyEvent(ev.sessionId, pending, ev);
    if (ev.type === "done" || ev.type === "error") {
      promptAsst.delete(ev.sessionId);
    }
  });
  api.onDeskDeliver?.((p) => {
    const deliveredTo = useHelix
      .getState()
      .messageSession(p.from, p.to, p.text, { echo: false });
    api.deskDelivered?.({
      requestId: p.requestId,
      ok: Boolean(deliveredTo),
      error: deliveredTo
        ? undefined
        : `No session matching “${p.to}”. Try westcode_list_sessions.`,
      deliveredTo: deliveredTo || undefined,
    });
  });
}

const promptAsst = new Map<string, string>();

export const useHelix = create<HelixState>((set, get) => ({
  sessions: [],
  activeId: null,
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
  agents: PRESET_AGENTS,
  agentsPersist: { custom: [], overrides: {}, removed: [] },
  providerColors: {},
  cliStatus: [],
  cliUpdates: [],
  updateBusy: null,
  updateError: null,
  liveAddons: [],
  libraryStatus: "idle",

  setView: (view) => set({ view, mobileNav: "desk" }),
  setActive: (id) =>
    set({ activeId: id, view: "focus", mobileNav: "desk" }),
  setSplit: (ids) => set({ splitIds: ids, view: "split", mobileNav: "desk" }),
  setNewOpen: (newOpen) => set({ newOpen }),
  setMobileNav: (mobileNav) => set({ mobileNav }),
  tick: () => set({ clock: Date.now() }),

  restoreOnboarding: () => {
    if (typeof window === "undefined") return;
    bindDesktopEvents();
    const seen = localStorage.getItem(ONBOARD_KEY);
    const lib = readJson<{ enabled?: string[]; custom?: Addon[] }>(
      LIBRARY_KEY,
      {},
    );
    const prov = readJson<CustomProvider[]>(PROVIDERS_KEY, []);
    const agentsPersist = readJson<AgentsPersist>(AGENTS_KEY, {
      custom: [],
      overrides: {},
      removed: [],
    });
    const providerColors = readJson<Record<string, string>>(COLORS_KEY, {});
    const folders = readJson<RecentFolder[]>(FOLDERS_KEY, []);
    const desk = readJson<{
      sessions?: Session[];
      activeId?: string | null;
      splitIds?: [string, string] | null;
      view?: LayoutView;
    }>(DESK_KEY, {});
    const saved = Array.isArray(desk.sessions)
      ? desk.sessions.map(sanitizeSession)
      : [];
    const live = get().sessions;
    const sessions = live.length ? live : saved;
    set({
      onboarding: seen !== "1",
      enabledAddons: lib.enabled ?? DEFAULT_ENABLED,
      customAddons: Array.isArray(lib.custom) ? lib.custom : [],
      customProviders: Array.isArray(prov) ? prov : [],
      agentsPersist,
      agents: mergeAgents(agentsPersist),
      providerColors,
      recentFolders: Array.isArray(folders) ? folders : [],
      ...(live.length
        ? {}
        : {
            sessions,
            activeId: desk.activeId ?? sessions[0]?.id ?? null,
            splitIds: desk.splitIds ?? null,
            view: desk.view ?? (sessions.length ? "focus" : "mosaic"),
          }),
    });
    bindDeskPersist();
    void get().refreshCli();
    void get().refreshLibrary();
    void get().refreshUpdates();
  },

  refreshCli: async () => {
    const api = westcode();
    if (!api) return;
    try {
      const cliStatus = await api.probe();
      set({ cliStatus });
    } catch {
      /* probe failed; Connections will show install hints */
    }
  },

  refreshUpdates: async () => {
    const api = westcode();
    if (!api?.updates) return;
    try {
      const all = await api.updates();
      const dismissed = readJson<string[]>(UPDATES_KEY, []);
      set({
        cliUpdates: all.filter(
          (u) => !dismissed.includes(`${u.id}@${u.latest}`),
        ),
      });
    } catch {
      /* update check failed; try again next launch */
    }
  },

  applyCliUpdate: async (id) => {
    const api = westcode();
    if (!api?.updateCli || get().updateBusy) return;
    set({ updateBusy: id, updateError: null });
    try {
      const res = await api.updateCli(id);
      if (res.ok) {
        set((s) => ({ cliUpdates: s.cliUpdates.filter((u) => u.id !== id) }));
        void get().refreshCli();
      } else {
        set({
          updateError:
            (res.output || "The update failed.").split("\n").filter(Boolean).slice(-3).join(" ").slice(0, 300),
        });
      }
    } catch (err) {
      set({ updateError: (err as Error).message.slice(0, 300) });
    } finally {
      set({ updateBusy: null });
    }
  },

  dismissCliUpdate: (id) => {
    const u = get().cliUpdates.find((x) => x.id === id);
    if (u) {
      const dismissed = readJson<string[]>(UPDATES_KEY, []);
      try {
        localStorage.setItem(
          UPDATES_KEY,
          JSON.stringify(
            [...dismissed, `${u.id}@${u.latest}`].slice(-12),
          ),
        );
      } catch {
        /* ignore */
      }
    }
    set((s) => ({ cliUpdates: s.cliUpdates.filter((x) => x.id !== id) }));
  },

  refreshLibrary: async () => {
    const api = westcode();
    if (!api) return;
    if (get().libraryStatus === "loading") return;
    const had = get().liveAddons;
    set({ libraryStatus: "loading" });
    try {
      const lists = await Promise.all(
        PROVIDER_ORDER.map((id) => api.library(id)),
      );
      set({
        liveAddons: lists.flat().map((a) => ({
          ...a,
          summary: (a.summary || "").slice(0, 180),
        })),
        libraryStatus: "ready",
      });
    } catch {
      set({ liveAddons: had, libraryStatus: "ready" });
    }
  },

  answerPermission: (sessionId, optionId) => {
    const ses = get().sessions.find((s) => s.id === sessionId);
    const rpcId = ses?.permission?.rpcId;
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (x) => ({
        ...x,
        permission: null,
      })),
    }));
    if (rpcId == null) return;
    void westcode()?.permission({ sessionId, rpcId, optionId });
  },

  dismissOnboarding: () => {
    try {
      localStorage.setItem(ONBOARD_KEY, "1");
    } catch {
      /* ignore */
    }
    set({ onboarding: false });
  },

  resetDemo: () => {
    set({
      sessions: [],
      activeId: null,
      splitIds: null,
      view: "mosaic",
    });
    persistDesk();
  },

  finishCodexDemo: () => {},

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
    title,
    prompt,
    model,
    effort,
    permissionMode,
    cwd,
    attachments,
  }) => {
    const p = resolveProvider(providerId, get().customProviders);
    const project = projectById(projectId);
    const path = cwd?.trim() || project.path;
    const folderName = path.split("/").filter(Boolean).pop() || "session";
    const session: Session = {
      id: uid("ses"),
      title: title?.trim() || folderName,
      providerId,
      projectId,
      cwd: path,
      model: model ?? p.defaultModel,
      effort: effort ?? defaultEffortFor(providerId),
      permissionMode: permissionMode || DEFAULT_PERMISSION,
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
    if (prompt?.trim() || attachments?.length) {
      void get().send(session.id, prompt ?? "", { attachments });
    }
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

  setSessionPermissionMode: (sessionId, mode) => {
    set((state) => ({
      sessions: patchSession(state.sessions, sessionId, (s) => ({
        ...s,
        permissionMode: mode,
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

  renameSession: (id, title) => {
    const t = title.trim();
    if (!t) return;
    set((s) => ({
      sessions: patchSession(s.sessions, id, (ses) => ({
        ...ses,
        title: t.slice(0, 80),
        updatedAt: Date.now(),
      })),
    }));
    persistDesk();
  },

  setSessionCwd: (id, cwd) => {
    const path = cwd.trim();
    if (!path) return;
    // The agent process is keyed on cwd; drop it so the next prompt spawns
    // in the new directory (history is replayed by acp-host).
    void westcode()?.stopSession(id);
    set((s) => ({
      sessions: patchSession(s.sessions, id, (ses) => ({
        ...ses,
        cwd: path,
        agentSessionId: undefined,
        updatedAt: Date.now(),
        messages: [
          ...ses.messages,
          systemNote(`Working directory changed to ${path}.`),
        ],
      })),
    }));
    persistDesk();
  },

  setSessionAgent: (id, agentId) => {
    set((s) => ({
      sessions: patchSession(s.sessions, id, (ses) => ({
        ...ses,
        agentId,
        updatedAt: Date.now(),
      })),
    }));
    persistDesk();
  },

  addAgent: (a) => {
    const taken = new Set(get().agents.map((x) => x.id));
    const id = a.id && !taken.has(a.id) ? a.id : slugId(a.name || "agent", taken);
    const persist = get().agentsPersist;
    const next: AgentsPersist = {
      ...persist,
      custom: [
        ...persist.custom.filter((x) => x.id !== id),
        { ...a, id, builtin: false },
      ],
      removed: persist.removed.filter((r) => r !== id),
    };
    persistAgents(next);
    set({ agentsPersist: next, agents: mergeAgents(next) });
  },

  updateAgent: (id, patch) => {
    const persist = get().agentsPersist;
    const isPreset = PRESET_AGENTS.some((a) => a.id === id);
    const next: AgentsPersist = isPreset
      ? {
          ...persist,
          overrides: {
            ...persist.overrides,
            [id]: { ...persist.overrides[id], ...patch, id, builtin: true },
          },
        }
      : {
          ...persist,
          custom: persist.custom.map((a) =>
            a.id === id ? { ...a, ...patch, id, builtin: false } : a,
          ),
        };
    persistAgents(next);
    set({ agentsPersist: next, agents: mergeAgents(next) });
  },

  removeAgent: (id) => {
    const persist = get().agentsPersist;
    const next: AgentsPersist = {
      ...persist,
      custom: persist.custom.filter((a) => a.id !== id),
      removed: [...new Set([...persist.removed, id])],
    };
    persistAgents(next);
    set({ agentsPersist: next, agents: mergeAgents(next) });
  },

  setProviderColor: (providerId, color) => {
    const colors = { ...get().providerColors };
    if (color) colors[providerId] = color;
    else delete colors[providerId];
    try {
      localStorage.setItem(COLORS_KEY, JSON.stringify(colors));
    } catch {
      /* ignore */
    }
    set({ providerColors: colors });
  },

  stop: (sessionId) => {
    abortBySession.get(sessionId)?.abort();
    abortBySession.delete(sessionId);
    void westcode()?.cancel(sessionId);
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
    const deliveredTo = `${resolveProvider(target.providerId, state.customProviders).short} · ${target.title}`;
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
      return false;
    }
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
                  to: deliveredTo,
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
    return deliveredTo;
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

    const replay = Boolean(opts?.replay);
    const outgoing = replay ? trimmed : formatOutgoing(trimmed, attachments);

    if (session.status === "running" && !replay) {
      const hop = opts?.incoming?.hop ?? 0;
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
      set((s) => ({
        sessions: patchSession(s.sessions, sessionId, (ses) => ({
          ...ses,
          updatedAt: Date.now(),
          queued: [...(ses.queued ?? []), { text: outgoing, incoming: opts?.incoming }].slice(0, 8),
          messages: [...ses.messages, userMsg],
        })),
      }));
      return;
    }

    abortBySession.get(sessionId)?.abort();
    const ac = new AbortController();
    abortBySession.set(sessionId, ac);

    const hop = opts?.incoming?.hop ?? 0;
    hopBySession.set(sessionId, hop);

    const userMsg: ChatMessage | null = replay
      ? null
      : opts?.incoming
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
        status: "running",
        updatedAt: Date.now(),
        turns: ses.turns + 1,
        messages: userMsg
          ? [...ses.messages, userMsg, asstMsg]
          : [...ses.messages, asstMsg],
      })),
    }));

    // Persona: "You are @Cleo-Sam" in a human message assigns that agent
    // profile to this session for every turn that follows.
    if (!opts?.incoming && !replay) {
      const assigned = personaAssignment(trimmed, get().agents);
      if (assigned) get().setSessionAgent(sessionId, assigned.id);
    }

    const latest = get().sessions.find((s) => s.id === sessionId);
    if (!latest) return;
    const provider = resolveProvider(latest.providerId, get().customProviders);
    const roster = rosterFor(
      get().sessions,
      sessionId,
      get().customProviders,
      get().agents,
    );
    const bus = deskPreamble(sessionId, latest.providerId, roster, {
      skills: addonNames(
        get().enabledAddons,
        get().customAddons,
        "skill",
        latest.providerId,
        get().liveAddons,
      ),
      connectors: addonNames(
        get().enabledAddons,
        get().customAddons,
        "connector",
        latest.providerId,
        get().liveAddons,
      ),
    });
    // Persona brief for this session, plus notes for other agents @mentioned
    // in the message ("Get @Ivy-Ben to build X" → where to delegate).
    const selfAgent = get().agents.find((a) => a.id === latest.agentId);
    const persona = selfAgent ? `${agentPreamble(selfAgent)}\n` : "";
    const mentioned = extractMentions(outgoing, get().agents).filter(
      (m) => m.agent.id !== latest.agentId,
    );
    const mentionNotes = mentioned.length
      ? `${mentioned
          .map((m) => {
            const target = roster.find(
              (r) =>
                r.agentName === m.agent.name ||
                get().sessions.find((s) => s.id === r.id)?.agentId === m.agent.id,
            );
            return target
              ? `[@${m.agent.name} — ${m.agent.role} — is running as session ${target.id}. Delegate that part with westcode_send_message to="${target.id}".]`
              : `[@${m.agent.name} — ${m.agent.role}: ${m.agent.purpose} No session runs this agent yet — tell the user to start one from the Agents menu, or handle only the parts that fit YOUR role.]`;
          })
          .join("\n")}\n`
      : "";
    const wantsReply =
      hop <= 1 || /reply to session|reply to me|message (me|us) back/i.test(outgoing);
    const incomingNote = wantsReply
      ? `Incoming work from another WestCode session. Act on it now. When you finish (or if you are blocked), you MUST call westcode_send_message with to="${opts?.incoming?.fromSessionId}" and a short result — the sender is waiting for your reply.`
      : `Incoming status report from another WestCode session. Read it. Do NOT reply unless it assigns you new work or asks a direct question — a completion report is terminal, and acknowledgment ping-pong wastes both sessions.`;
    const preambleText = opts?.incoming
      ? `${bus}\n${persona}[Peer agent: ${resolveProvider(opts.incoming.fromProviderId, get().customProviders).short} · ${opts.incoming.fromTitle} · session ${opts.incoming.fromSessionId}]\n${incomingNote}\n\n`
      : `${bus}\n${persona}${mentionNotes}`;
    const promptText = `${preambleText}${outgoing}`;

    const api = westcode();
    if (!api) {
      set((s) => ({
        sessions: patchSession(s.sessions, sessionId, (ses) => ({
          ...ses,
          status: "error",
          messages: ses.messages.map((m) =>
            m.id === asstId
              ? {
                  ...m,
                  streaming: false,
                  blocks: [
                    {
                      type: "text" as const,
                      text: "WestCode hosts Claude, Grok, and Codex as local CLIs. Run `npm run app` (the Mac desktop shell) — the browser preview cannot spawn those binaries.",
                    },
                  ],
                }
              : m,
          ),
        })),
      }));
      abortBySession.delete(sessionId);
      return;
    }

    promptAsst.set(sessionId, asstId);
    try {
      const history = latest.messages
        .filter((m) => m.id !== asstId && (m.role === "user" || m.role === "assistant" || m.role === "agent"))
        .slice(-16)
        .map((m) => ({
          role: m.role,
          text: blocksToPlain(m.blocks).slice(0, 1500),
        }))
        .filter((m) => m.text.trim());

      // API-only custom providers skip ACP: one OpenAI-compatible
      // chat/completions call through the main process.
      const customApi =
        !provider.builtin && provider.auth === "api"
          ? get().customProviders.find((c) => c.id === latest.providerId)
          : undefined;
      if (customApi) {
        const res = await api.apiPrompt({
          endpoint: customApi.endpoint,
          apiKey: customApi.apiKey,
          model: latest.model || customApi.defaultModel,
          messages: [
            { role: "system", text: preambleText },
            ...history.map((h) => ({
              role: h.role === "assistant" ? "assistant" : "user",
              text: h.text,
            })),
            { role: "user", text: outgoing },
          ].map((m) => ({ role: m.role, content: m.text })),
        });
        if (!res.ok || !res.text) {
          throw new Error(res.error || `${provider.name} failed`);
        }
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
                    raw: res.text,
                    blocks: [{ type: "text" as const, text: res.text! }],
                  }
                : m,
            ),
          })),
        }));
        const sent = extractSendMessages([{ type: "text", text: res.text }]);
        for (const msg of sent) {
          get().messageSession(sessionId, msg.to, msg.text, { echo: true });
        }
        return;
      }

      const res = await api.prompt({
        sessionId,
        providerId: latest.providerId,
        cwd: latest.cwd,
        model: latest.model,
        effort: latest.effort,
        permissionMode: latest.permissionMode,
        agentSessionId: latest.agentSessionId,
        history,
        text: promptText,
      });
      if (!res.ok) throw new Error(res.error || `${provider.name} failed`);
      set((s) => ({
        sessions: patchSession(s.sessions, sessionId, (ses) => ({
          ...ses,
          status: "waiting",
          updatedAt: Date.now(),
          messages: ses.messages.map((m) =>
            m.id === asstId ? { ...m, streaming: false } : m,
          ),
        })),
      }));
      const asst = get()
        .sessions.find((x) => x.id === sessionId)
        ?.messages.find((m) => m.id === asstId);
      if (asst) {
        for (const msg of extractSendMessages(asst.blocks)) {
          get().messageSession(sessionId, msg.to, msg.text, { echo: true });
        }
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
      promptAsst.delete(sessionId);
      abortBySession.delete(sessionId);
      const ses = get().sessions.find((x) => x.id === sessionId);
      const next = ses?.queued?.[0];
      if (next) {
        set((s) => ({
          sessions: patchSession(s.sessions, sessionId, (x) => ({
            ...x,
            queued: (x.queued ?? []).slice(1),
          })),
        }));
        queueMicrotask(() => {
          void get().send(sessionId, next.text, {
            incoming: next.incoming,
            replay: true,
          });
        });
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
  const known = slashFor(session.providerId, session.slashCommands);
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
    void westcode()?.stopSession(sessionId);
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (ses) => ({
        ...ses,
        messages: [systemNote("Conversation cleared.")],
        turns: 0,
        updatedAt: Date.now(),
        status: "idle",
        permission: null,
        slashCommands: undefined,
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
