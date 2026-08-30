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
  matchAgent,
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

const FOLDERS_KEY = "helix-folders-v1";
const DESK_KEY = "helix-desk-v1";
const UPDATES_KEY = "helix-cli-updates-dismissed-v1";
const COLORS_KEY = "helix-provider-colors-v1";
const SETTINGS_KEY = "helix-settings-v1";

export type AppSettings = {
  /** Preselected provider in the New Session dialog. */
  defaultProviderId: string | null;
  /** Default model label per provider ("" = provider default). */
  defaultModel: string;
  defaultEffort: string;
  /** Permission mode every new session starts in. */
  defaultPermissionMode: string;
  /** Folder prefilled in the New Session dialog. */
  defaultCwd: string;
  /**
   * Delegated (desk-bus spawned) sessions run in Bypass so an orchestrator's
   * hand-offs execute without a human approval per tool call. When off they
   * inherit the sender's permission mode instead.
   */
  delegatedAuto: boolean;
  /** Render transcripts in the tighter compact layout everywhere. */
  transcriptCompact: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultProviderId: null,
  defaultModel: "",
  defaultEffort: "",
  defaultPermissionMode: DEFAULT_PERMISSION,
  defaultCwd: "",
  delegatedAuto: true,
  transcriptCompact: false,
};

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
  const custom = p.custom
    .filter((a) => !removed.has(a.id))
    .map((a) =>
      a.avatar === "cleo-sam" ? { ...a, avatar: "lib-01" } : a,
    );
  return [...presets, ...custom];
}

async function migrateProviderKey(
  get: () => HelixState,
  set: (fn: (s: HelixState) => Partial<HelixState>) => void,
  id: string,
  apiKey: string,
) {
  const secretStore = westcode()?.setSecret;
  if (!secretStore || !apiKey) return;
  try {
    const r = await secretStore(id, apiKey);
    if (!r?.ok) return;
    // Compare-and-strip: only blank the local copy if it is still the exact
    // value that just landed in the vault — the user may have re-entered a
    // new key while this write was in flight.
    const list = get().customProviders.map((c) =>
      c.id === id && c.apiKey === apiKey ? { ...c, apiKey: "" } : c,
    );
    persistProviders(list);
    set(() => ({ customProviders: list }));
  } catch {
    /* keep the local key; retried on next launch */
  }
}

function persistAgents(p: AgentsPersist) {
  saveState(AGENTS_KEY, p);
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
  /** Transcript message id of the queued row a replay re-sends. */
  replayOf?: string;
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
  /** Persona to run in the new session (Agents menu id). */
  agentId?: string;
  /** Do not steal focus — used when the desk bus spawns a session. */
  background?: boolean;
};

export type HelixState = {
  sessions: Session[];
  activeId: string | null;
  splitIds: [string, string] | null;
  view: LayoutView;
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
  settings: AppSettings;
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
  restoreState: () => Promise<void>;
  refreshCli: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  refreshUpdates: () => Promise<void>;
  applyCliUpdate: (id: string) => Promise<void>;
  dismissCliUpdate: (id: string) => void;
  answerPermission: (sessionId: string, optionId: string) => void;
  rememberFolder: (folder: RecentFolder) => void;
  createSession: (opts: CreateOpts) => string;
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
  removeSession: (id: string) => void;
  archiveSession: (id: string, archived: boolean) => void;
  setSessionCwd: (id: string, cwd: string) => void;
  setSessionAgent: (id: string, agentId: string | undefined) => void;
  addAgent: (a: Omit<AgentProfile, "id" | "builtin"> & { id?: string }) => void;
  updateAgent: (id: string, patch: Partial<AgentProfile>) => void;
  removeAgent: (id: string) => void;
  restorePresetAgents: () => void;
  setProviderColor: (providerId: string, color: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
};

// Desktop state lives in ~/.westcode/state.json (loaded once at startup) so
// it survives app replacement; localStorage is only the browser fallback —
// the packaged app's origin includes a random port, so its localStorage is
// empty on every launch.
let fileState: Record<string, unknown> | null = null;

function readJson<T>(key: string, fallback: T): T {
  if (fileState && key in fileState) return fileState[key] as T;
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveState(key: string, value: unknown) {
  if (fileState) fileState[key] = value;
  void westcode()?.stateSave?.(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

function persistLibrary(enabled: string[], custom: Addon[]) {
  saveState(LIBRARY_KEY, { enabled, custom });
}

function persistProviders(list: CustomProvider[]) {
  saveState(PROVIDERS_KEY, list);
}

function persistFolders(list: RecentFolder[]) {
  saveState(FOLDERS_KEY, list);
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
  const { sessions, activeId, splitIds, view } = useHelix.getState();
  saveState(DESK_KEY, {
    sessions: sessions.map(sanitizeSession),
    activeId,
    splitIds,
    view,
  });
}

let deskBound = false;
function deskRows(
  sessions: Session[],
  custom: CustomProvider[],
) {
  const agents = useHelix.getState().agents;
  return sessions.map((s) => ({
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

let persistTimer: number | null = null;
function persistDeskDebounced() {
  if (persistTimer != null) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    persistDesk();
  }, 800);
}

function flushDeskPersist() {
  if (persistTimer != null) {
    window.clearTimeout(persistTimer);
    persistTimer = null;
  }
  persistDesk();
}

function bindDeskPersist() {
  if (deskBound || typeof window === "undefined") return;
  deskBound = true;
  // The debounce window must not survive quit: the IPC write is posted here
  // and lands on the main-process queue before the renderer dies.
  window.addEventListener("beforeunload", flushDeskPersist);
  const push = (s: HelixState) => {
    persistDeskDebounced();
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

// One OS notification per event for sessions the user is not looking at —
// without this, unattended stalls (permission prompts, errors, finished
// turns) are invisible.
const notifiedPermission = new Set<string>();
let notifyPermissionAsked = false;
function notifyBackground(sessionId: string, title: string, body: string) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission === "default" && !notifyPermissionAsked) {
    notifyPermissionAsked = true;
    void Notification.requestPermission();
  }
  const state = useHelix.getState();
  const focusedElsewhere =
    document.hidden || state.activeId !== sessionId || state.view === "mosaic";
  if (!focusedElsewhere) return;
  try {
    new Notification(title, { body: body.slice(0, 160), silent: false });
  } catch {
    /* notifications unavailable */
  }
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
  // Exact-id targeting may reach an archived session; fuzzy matching and
  // provider routing must not resurrect one.
  const others = sessions.filter(
    (s) => s.id !== fromId && (!s.archivedAt || s.id.toLowerCase() === q),
  );
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
    const key = `${sessionId}:${ev.rpcId}`;
    if (!notifiedPermission.has(key)) {
      notifiedPermission.add(key);
      if (notifiedPermission.size > 200) {
        for (const old of [...notifiedPermission].slice(0, 100)) {
          notifiedPermission.delete(old);
        }
      }
      const ses = useHelix.getState().sessions.find((s) => s.id === sessionId);
      notifyBackground(
        sessionId,
        `${ses?.title ?? "Session"} needs approval`,
        `Wants to run ${ev.tool || "a tool"}.`,
      );
    }
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

/**
 * Providers acp-host can actually spawn (plus renderer-side API providers).
 * Cursor is listed in the UI but has no spawn branch — auto-spawn falls back
 * to the first hostable provider rather than creating a session that errors.
 */
function spawnableProviderId(providerId: string, state: HelixState): string {
  if ((PROVIDER_ORDER as readonly string[]).includes(providerId)) return providerId;
  if (state.customProviders.some((c) => c.id === providerId)) return providerId;
  return PROVIDER_ORDER[0]!;
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
    const state = useHelix.getState();
    // Agent-name resolution runs FIRST: the prompts tell agents to address
    // personas by name, and resolveTarget's title-substring scoring would
    // otherwise steal that mail for any session whose title contains the
    // name ("Ask Quinn later" must not swallow to="Quinn").
    // "quinn@claude" pins the agent to a provider for this spawn; a bare
    // provider name ("claude") starts a plain session with no persona.
    const [toName, toProviderRaw] = p.to.split("@", 2);
    const pinnedProvider =
      toProviderRaw &&
      (PROVIDER_ORDER as readonly string[]).includes(toProviderRaw.trim().toLowerCase())
        ? toProviderRaw.trim().toLowerCase()
        : undefined;
    // A confident match only — an exact name/id/first-name/initials hit,
    // not a 3-letter prefix typo. Weak queries fall through to the fuzzy
    // session resolver instead of entering the agent branch at all.
    const agent = matchAgent(toName ?? p.to, state.agents, { minScore: 80 });
    const sender = state.sessions.find((s) => s.id === p.from);
    let deliveredTo: string | false = false;
    let started = "";
    if (agent) {
      const existing = state.sessions.find(
        (s) => s.agentId === agent.id && s.id !== p.from && !s.archivedAt,
      );
      if (existing) {
        deliveredTo = state.messageSession(p.from, existing.id, p.text, {
          echo: false,
        });
      } else if (
        sender &&
        // Do not spawn a session the hop limit will immediately orphan.
        (hopBySession.get(p.from) ?? 0) < MAX_HOP
      ) {
        // Runtime priority: explicit @provider pin > the agent's own config
        // > the sender's provider. Model/effort/permissions come from the
        // agent's config when set.
        const spawnable = spawnableProviderId(
          pinnedProvider || agent.providerId || sender.providerId,
          state,
        );
        const newId = state.createSession({
          providerId: spawnable,
          projectId: sender.projectId,
          cwd: sender.cwd,
          title: `${agent.name} — ${agent.role}`,
          agentId: agent.id,
          background: true,
          model: agent.model || undefined,
          effort: agent.effort || undefined,
          // Delegated work must not stall on approval prompts: Bypass skips
          // them entirely (acp-host maps it to bypassPermissions /
          // --always-approve); off = inherit whatever the sender runs in.
          permissionMode:
            agent.permissionMode ||
            (state.settings.delegatedAuto ? "bypass" : sender.permissionMode),
        });
        started = ` (started a new ${agent.name} session)`;
        // Deliver by the returned id — never back through the fuzzy
        // resolver, which cannot see e.g. to="reviewer-qa" in the title.
        deliveredTo = useHelix
          .getState()
          .messageSession(p.from, newId, p.text, { echo: false });
      }
    }
    // Fuzzy title/provider resolution ONLY when the query named no agent —
    // an agent-path failure (rate limit, duplicate, hop) must fail, not be
    // re-resolved onto whichever session title happens to contain the name.
    if (!agent && !deliveredTo) {
      deliveredTo = state.messageSession(p.from, p.to, p.text, {
        echo: false,
      });
    }
    // A bare provider name with no live session on that provider starts a
    // PLAIN session there (no persona) — "ask @claude to ping me back" must
    // not dead-end on an empty desk, and must not adopt an agent profile the
    // user did not name.
    if (!agent && !deliveredTo && sender) {
      const provQuery = p.to.trim().toLowerCase();
      const prov = (PROVIDER_ORDER as readonly string[]).includes(provQuery)
        ? provQuery
        : state.customProviders.find(
              (c) =>
                c.id.toLowerCase() === provQuery ||
                c.name.toLowerCase() === provQuery,
            )?.id;
      if (prov && (hopBySession.get(p.from) ?? 0) < MAX_HOP) {
        const newId = state.createSession({
          providerId: prov,
          projectId: sender.projectId,
          cwd: sender.cwd,
          title: `${resolveProvider(prov, state.customProviders).short} — desk`,
          background: true,
          permissionMode: state.settings.delegatedAuto
            ? "bypass"
            : sender.permissionMode,
        });
        started = ` (started a new ${resolveProvider(prov, state.customProviders).short} session)`;
        deliveredTo = useHelix
          .getState()
          .messageSession(p.from, newId, p.text, { echo: false });
      }
    }
    api.deskDelivered?.({
      requestId: p.requestId,
      ok: Boolean(deliveredTo),
      error: deliveredTo
        ? undefined
        : `No session or agent matching “${p.to}”. Try westcode_list_sessions, or use an agent name from the Agents menu.`,
      deliveredTo: deliveredTo ? `${deliveredTo}${started}` : undefined,
    });
  });
}

const promptAsst = new Map<string, string>();

export const useHelix = create<HelixState>((set, get) => ({
  sessions: [],
  activeId: null,
  splitIds: null,
  view: "mosaic",
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
  settings: DEFAULT_SETTINGS,
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

  restoreState: async () => {
    if (typeof window === "undefined") return;
    bindDesktopEvents();
    const api = westcode();
    if (api?.stateLoad) {
      try {
        fileState = await api.stateLoad();
      } catch {
        fileState = {};
      }
    }
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
    const settings = {
      ...DEFAULT_SETTINGS,
      ...readJson<Partial<AppSettings>>(SETTINGS_KEY, {}),
    };
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
    // Merge, never replace: a session the user created while stateLoad was
    // in flight must not cause the saved desk to be skipped (and then
    // overwritten by the next persist).
    const sessions = [
      ...live,
      ...saved.filter((sv) => live.every((l) => l.id !== sv.id)),
    ];
    set({
      enabledAddons: lib.enabled ?? DEFAULT_ENABLED,
      customAddons: Array.isArray(lib.custom) ? lib.custom : [],
      customProviders: Array.isArray(prov) ? prov : [],
      agentsPersist,
      agents: mergeAgents(agentsPersist),
      providerColors,
      settings,
      recentFolders: Array.isArray(folders) ? folders : [],
      sessions,
      activeId: live.length
        ? get().activeId
        : (desk.activeId ?? sessions[0]?.id ?? null),
      splitIds: live.length ? get().splitIds : (desk.splitIds ?? null),
      view: live.length
        ? get().view
        : (desk.view ?? (sessions.length ? "focus" : "mosaic")),
    });
    bindDeskPersist();
    void get().refreshCli();
    void get().refreshLibrary();
    void get().refreshUpdates();
    void (async () => {
      for (const c of get().customProviders) {
        if (c.apiKey) {
          await migrateProviderKey(get, (fn) => set(fn), c.id, c.apiKey);
        }
      }
    })();
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
      saveState(UPDATES_KEY, [...dismissed, `${u.id}@${u.latest}`].slice(-12));
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
    agentId,
    background,
  }) => {
    const p = resolveProvider(providerId, get().customProviders);
    const settings = get().settings;
    const project = projectById(projectId);
    const path = cwd?.trim() || settings.defaultCwd || project.path;
    const folderName = path.split("/").filter(Boolean).pop() || "session";
    // Model/effort defaults are only meaningful for the provider they were
    // chosen for — a saved grok-4.6 must never seed a Claude session.
    const scoped = settings.defaultProviderId === providerId;
    const session: Session = {
      id: uid("ses"),
      title: title?.trim() || folderName,
      providerId,
      projectId,
      cwd: path,
      model: model ?? ((scoped && settings.defaultModel) || p.defaultModel),
      effort:
        effort ??
        ((scoped && settings.defaultEffort) || defaultEffortFor(providerId)),
      permissionMode:
        permissionMode || settings.defaultPermissionMode || DEFAULT_PERMISSION,
      status: "idle",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      turns: 0,
      agentId,
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      ...(background
        ? {}
        : {
            activeId: session.id,
            view: "focus" as const,
            newOpen: false,
            mobileNav: "desk" as const,
          }),
    }));
    if (prompt?.trim() || attachments?.length) {
      void get().send(session.id, prompt ?? "", { attachments });
    }
    return session.id;
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
    // Move the key into the OS-encrypted secret store; strip the local copy
    // only after the store CONFIRMS the write, so a failed secret:set never
    // leaves a provider with no key anywhere.
    void migrateProviderKey(get, set, id, p.apiKey);
  },

  removeCustomProvider: (id) => {
    void westcode()?.setSecret?.(id, "");
    const list = get().customProviders.filter((c) => c.id !== id);
    persistProviders(list);
    set({ customProviders: list });
  },

  archiveSession: (id, archived) => {
    set((s) => {
      const sessions = patchSession(s.sessions, id, (ses) => ({
        ...ses,
        archivedAt: archived ? Date.now() : undefined,
        updatedAt: Date.now(),
      }));
      const nextActive =
        archived && s.activeId === id
          ? (sessions.find((x) => !x.archivedAt)?.id ?? null)
          : s.activeId;
      const splitHit =
        s.splitIds && (s.splitIds[0] === id || s.splitIds[1] === id);
      return {
        sessions,
        activeId: nextActive,
        splitIds: archived && splitHit ? null : s.splitIds,
        view:
          archived && s.activeId === id && s.view === "focus" && !nextActive
            ? ("mosaic" as const)
            : archived && splitHit && s.view === "split"
              ? ("mosaic" as const)
              : s.view,
      };
    });
    persistDesk();
  },

  removeSession: (id) => {
    void westcode()?.stopSession(id);
    abortBySession.get(id)?.abort();
    abortBySession.delete(id);
    promptAsst.delete(id);
    hopBySession.delete(id);
    set((s) => ({
      sessions: s.sessions.filter((ses) => ses.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
      splitIds:
        s.splitIds && (s.splitIds[0] === id || s.splitIds[1] === id)
          ? null
          : s.splitIds,
      view:
        s.activeId === id && s.view === "focus" ? ("mosaic" as const) : s.view,
    }));
    persistDesk();
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
    // Stop any running turn cleanly BEFORE dropping the process — killing
    // the agent under an in-flight send() would paint the turn as an error.
    if (get().sessions.find((s) => s.id === id)?.status === "running") {
      get().stop(id);
    }
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
    // Reserve preset and tombstoned ids too, so a custom "Reviewer / QA"
    // cannot silently resurrect a deleted preset under the same id.
    const taken = new Set([
      ...get().agents.map((x) => x.id),
      ...PRESET_AGENTS.map((x) => x.id),
      ...get().agentsPersist.removed,
    ]);
    const id = a.id && !taken.has(a.id) ? a.id : slugId(a.name || "agent", taken);
    const persist = get().agentsPersist;
    const next: AgentsPersist = {
      ...persist,
      custom: [
        ...persist.custom.filter((x) => x.id !== id),
        { ...a, id, builtin: false },
      ],
    };
    persistAgents(next);
    set({ agentsPersist: next, agents: mergeAgents(next) });
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveState(SETTINGS_KEY, settings);
    set({ settings });
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
    set((s) => ({
      agentsPersist: next,
      agents: mergeAgents(next),
      // Sessions must not keep injecting a deleted persona's brief.
      sessions: s.sessions.map((ses) =>
        ses.agentId === id ? { ...ses, agentId: undefined } : ses,
      ),
    }));
    persistDesk();
  },

  restorePresetAgents: () => {
    const persist = get().agentsPersist;
    const presetIds = new Set(PRESET_AGENTS.map((a) => a.id));
    const next: AgentsPersist = {
      ...persist,
      removed: persist.removed.filter((r) => !presetIds.has(r)),
    };
    persistAgents(next);
    set({ agentsPersist: next, agents: mergeAgents(next) });
  },

  setProviderColor: (providerId, color) => {
    const colors = { ...get().providerColors };
    if (color) colors[providerId] = color;
    else delete colors[providerId];
    saveState(COLORS_KEY, colors);
    set({ providerColors: colors });
  },

  stop: (sessionId) => {
    abortBySession.get(sessionId)?.abort();
    abortBySession.delete(sessionId);
    // Fence the cancelled turn completely: drop the pending assistant id so
    // stale stream events are ignored, and kill the agent process so its
    // late done/error cannot land on the NEXT turn (the next prompt
    // respawns and resumes via agentSessionId + history replay).
    promptAsst.delete(sessionId);
    void westcode()?.cancel(sessionId);
    void westcode()?.stopSession(sessionId);
    const hadQueued = (get().sessions.find((s) => s.id === sessionId)?.queued ?? [])
      .length;
    set((state) => ({
      sessions: patchSession(state.sessions, sessionId, (s) => ({
        ...s,
        status: "waiting",
        permission: null,
        updatedAt: Date.now(),
        // Stop discards pending work: queued rows are already visible in the
        // transcript and must not auto-replay after some later send.
        queued: [],
        messages: [
          ...s.messages.map((m) =>
            m.streaming ? { ...m, streaming: false } : m,
          ),
          ...(hadQueued
            ? [systemNote(`Stopped. ${hadQueued} queued message${hadQueued === 1 ? " was" : "s were"} discarded — resend what you still need.`)]
            : []),
        ],
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

    // Persona assignment happens when the human message is first ACCEPTED —
    // including messages queued while a turn runs. The replay drain skips it
    // (already assigned here) and incoming peer mail never assigns.
    if (!opts?.incoming && !replay) {
      const assigned = personaAssignment(trimmed, get().agents);
      if (assigned) get().setSessionAgent(sessionId, assigned.id);
    }

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
          queued: [...(ses.queued ?? []), { text: outgoing, incoming: opts?.incoming, msgId: userMsg.id }].slice(0, 8),
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
              : `[@${m.agent.name} — ${m.agent.role}: ${m.agent.purpose} No session runs this agent yet — calling westcode_send_message with to="${m.agent.name}" will START one automatically and deliver your message. Delegate; do not do their work yourself.]`;
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
      const historyRaw = latest.messages
        .filter(
          (m) =>
            m.id !== asstId &&
            // This turn's text travels in promptText; a copy in history makes
            // acp-host's restored-history banner replay it on fresh spawns.
            m.id !== userMsg?.id &&
            m.id !== opts?.replayOf &&
            (m.role === "user" || m.role === "assistant" || m.role === "agent"),
        )
        .slice(-16);
      const history = historyRaw
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
        const apiRows = [...historyRaw];
        // Persisted queues from before msgId existed replay without an id —
        // fall back to popping the trailing queued copy by text.
        if (replay && !opts?.replayOf) {
          const lastRow = apiRows[apiRows.length - 1];
          if (
            lastRow &&
            lastRow.role !== "assistant" &&
            blocksToPlain(lastRow.blocks).trim() === trimmed
          ) {
            apiRows.pop();
          }
        }
        const res = await api.apiPrompt({
          endpoint: customApi.endpoint,
          apiKey: customApi.apiKey || undefined,
          providerId: customApi.id,
          model: latest.model || customApi.defaultModel,
          messages: [
            { role: "system", text: preambleText },
            ...apiRows
              .map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                text: blocksToPlain(m.blocks).slice(0, 1500),
              }))
              .filter((m) => m.text.trim()),
            { role: "user", text: outgoing },
          ].map((m) => ({ role: m.role, content: m.text })),
        });
        // Stop or a newer send may have superseded this turn while the HTTP
        // call was in flight — discard the result instead of writing blocks
        // or dispatching desk-bus work for a dead turn.
        if (ac.signal.aborted || abortBySession.get(sessionId) !== ac) return;
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
        notifyBackground(sessionId, `${latest.title} finished`, res.text);
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
      // Same supersede/abort rule as the HTTP branch: a stopped or replaced
      // turn must not paint results or dispatch desk-bus work.
      if (ac.signal.aborted || abortBySession.get(sessionId) !== ac) return;
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
      notifyBackground(
        sessionId,
        `${latest.title} finished`,
        blocksToPlain(
          get().sessions.find((x) => x.id === sessionId)?.messages.find((m) => m.id === asstId)?.blocks ?? [],
        ) || "Turn complete.",
      );
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
      // A Stop (cancel surfaces as {ok:false}) or a newer turn owns the
      // session now — do not flicker waiting→error over it.
      if (ac.signal.aborted || abortBySession.get(sessionId) !== ac) return;
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
      notifyBackground(
        sessionId,
        `${latest.title} hit an error`,
        (err as Error).message,
      );
    } finally {
      // A newer send() may own these maps now — only clean up (and drain the
      // queue) when this turn is still the current one, or a superseded turn
      // would wipe the live abort handle and double-drain queued messages.
      const current = abortBySession.get(sessionId) === ac;
      if (promptAsst.get(sessionId) === asstId) promptAsst.delete(sessionId);
      if (current) abortBySession.delete(sessionId);
      const ses = get().sessions.find((x) => x.id === sessionId);
      const next = current ? ses?.queued?.[0] : undefined;
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
            replayOf: next.msgId,
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
