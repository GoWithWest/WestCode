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
import {
  EMPTY_GROUPS,
  GROUPS_KEY,
  assignSkill,
  groupPreamble,
  matchGroup,
  mergeGroups,
  resolveGroup,
  slugGroupId,
  unassignSkill,
  type GroupsPersist,
  type SkillGroup,
  type SkillRef,
} from "./skill-groups";
import { GROUP_CATALOG } from "./skill-group-catalog";
import { deskPreamble, formatRoster } from "./prompts";
import {
  PROVIDER_ORDER,
  PROVIDERS_KEY,
  resolveProvider,
  type CustomProvider,
} from "./providers";
import {
  westcode,
  type LearnProposal,
  type CliProbe,
  type CliSession,
  type CliUpdate,
  type LiveAddon,
  type SessionEvent,
  type SshHost,
} from "./desktop";
import type {
  AgentRosterItem,
  Attachment,
  Block,
  ChatMessage,
  IncomingRef,
  LayoutView,
  Session,
  ToolBlock,
} from "./types";
import { projectById } from "./types";
import { uid } from "./utils";

const FOLDERS_KEY = "helix-folders-v1";
const DESK_KEY = "helix-desk-v1";
const UPDATES_KEY = "helix-cli-updates-dismissed-v1";
const COLORS_KEY = "helix-provider-colors-v1";
const SETTINGS_KEY = "helix-settings-v1";
const SCHEDULES_KEY = "helix-schedules-v1";

export type ScheduledTask = {
  id: string;
  name: string;
  prompt: string;
  /** Agent name, provider, or "" for the default provider. */
  to: string;
  everyMinutes: number;
  enabled: boolean;
  lastRun?: number;
  /** Dedicated session this task delivers into (created on first fire). */
  sessionId?: string;
};

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
  /**
   * How much of the agent's work shows: normal (tools collapsed, thinking
   * summarised), thinking (thoughts open), verbose (everything open).
   * Cmd/Ctrl+O cycles it.
   */
  transcriptDetail: "normal" | "thinking" | "verbose";
  /**
   * The desk learns from finished sessions (Hermes-style): after enough
   * turns or tool calls a read-only reviewer proposes skills and memory.
   * "ask" stages them for approval, "auto" applies them, "off" never reviews.
   */
  learning: "off" | "ask" | "auto";
  /**
   * The shared memory store: a git repository (preferred — memory follows
   * the user) or "" for WestCode's local desk memory.
   */
  memoryRepo: string;
  /** Keep a shared-memory block in every installed CLI's global rules file. */
  memorySync: boolean;
  /** Appearance: follow the OS, or force dark / light. */
  theme: "system" | "dark" | "light";
  /** Start WestCode when the user logs in (keeps schedules running). */
  launchAtLogin: boolean;
  /** Group the sidebar's sessions by machine (this Mac / SSH hosts). */
  groupByMachine?: boolean;
  /** Archive a session once its branch's PR is merged or closed. */
  autoArchivePr?: boolean;
  /** Last permission mode chosen per folder (Plan is per session only). */
  folderModes?: Record<string, string>;
  /** Keep the Mac from sleeping while an agent is mid-turn. */
  keepAwake?: boolean;
  /** Branch name prefix for session worktrees. */
  worktreeBranchPrefix?: string;
  /** Where worktrees go; empty = <repo>/.claude/worktrees. */
  worktreeLocation?: string;
  /** Output style for new Claude sessions; empty = Claude Code's own setting. */
  claudeOutputStyle?: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultProviderId: null,
  defaultModel: "",
  defaultEffort: "",
  defaultPermissionMode: DEFAULT_PERMISSION,
  defaultCwd: "",
  delegatedAuto: true,
  transcriptCompact: false,
  transcriptDetail: "normal",
  learning: "ask",
  theme: "dark",
  memoryRepo: "",
  memorySync: false,
  launchAtLogin: false,
  keepAwake: true,
  worktreeBranchPrefix: "westcode/",
  worktreeLocation: "",
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
/** Sessions whose transcript is being replayed, so it happens once. */
const hydrating = new Set<string>();
/** Panes whose CLI history is already in memory (memory-only, like it). */
const hydrated = new Set<string>();
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
  /** What the user bubble shows when the prompt itself is long scaffolding. */
  display?: string;
};

type CreateOpts = {
  /** Make this a side chat of that session (read-only drawer). */
  sideOf?: string;
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
  /** Run on this SSH host instead of this Mac. */
  hostId?: string;
  /** The session's own git worktree (cwd is its path). */
  worktree?: Session["worktree"];
};

export type HelixState = {
  sessions: Session[];
  activeId: string | null;
  splitIds: [string, string] | null;
  view: LayoutView;
  mobileNav: "desk" | "sessions";
  clock: number;
  newOpen: boolean;
  newProviderId: string | null;
  /** Fills the New session dialog (from a westcode:// link); the user confirms. */
  newPrefill: { cwd?: string; hostId?: string; prompt?: string } | null;
  openNewWith: (p: { cwd?: string; hostId?: string; prompt?: string; providerId?: string }) => void;
  /** Copy the conversation into a new session (Claude Desktop's Fork). */
  forkSession: (sessionId: string) => Promise<string | null>;
  /**
   * Rewind to before one of your messages (Claude Desktop's "Rewind to
   * here"): the conversation is forked at the reply before it, the files go
   * back to that message's checkpoint, and its text returns to the composer.
   */
  rewindTo: (sessionId: string, messageId: string) => Promise<boolean>;
  enabledAddons: string[];
  customAddons: Addon[];
  customProviders: CustomProvider[];
  recentFolders: RecentFolder[];
  agents: AgentProfile[];
  agentsPersist: AgentsPersist;
  skillGroups: SkillGroup[];
  groupsPersist: GroupsPersist;
  /** Learning proposals waiting for the user. */
  learnPending: LearnProposal[];
  /** Session ids with a review running now. */
  reviewing: string[];
  /** Session ids whose stored history is being read from the CLI now. */
  loadingHistory: string[];
  /** Approved desk memory, as injected into new CLI sessions. */
  deskMemory: string;
  providerColors: Record<string, string>;
  settings: AppSettings;
  schedules: ScheduledTask[];
  cliStatus: CliProbe[];
  cliUpdates: CliUpdate[];
  updateBusy: string | null;
  updateError: string | null;
  liveAddons: LiveAddon[];
  libraryStatus: "idle" | "loading" | "ready";
  /** Sessions the provider CLIs store themselves (their own session/list). */
  cliSessions: CliSession[];
  cliSessionStatus: "idle" | "loading" | "ready";
  /** Providers that failed to list, so a broken CLI is not silently empty. */
  cliSessionErrors: string[];
  /** Sessions a CLI here lists whose folder is on another machine. */
  cliSessionsElsewhere: number;
  /** Machines sessions can run on over SSH (Settings → SSH hosts). */
  sshHosts: SshHost[];
  /** Hosts named in ~/.ssh/config, offered for import. */
  sshConfigHosts: (Omit<SshHost, "id"> & { hostName?: string })[];
  refreshSshHosts: () => Promise<void>;

  setView: (v: LayoutView) => void;
  setActive: (id: string) => void;
  setSplit: (ids: [string, string]) => void;
  setNewOpen: (open: boolean, providerId?: string | null) => void;
  setMobileNav: (v: "desk" | "sessions") => void;
  tick: () => void;
  restoreState: () => Promise<void>;
  refreshCli: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  refreshUpdates: () => Promise<void>;
  applyCliUpdate: (id: string) => Promise<void>;
  dismissCliUpdate: (id: string) => void;
  answerPermission: (sessionId: string, optionId: string) => void;
  /** answers null = decline. */
  answerQuestion: (sessionId: string, answers: Record<string, string | string[]> | null) => void;
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
  setSessionOutputStyle: (sessionId: string, style: string) => void;
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
  /** Focus the session running this agent, or start one; optionally send. */
  openAgent: (agentId: string, prompt?: string) => string | null;
  addSkillGroup: (g: Omit<SkillGroup, "id" | "builtin">) => string;
  updateSkillGroup: (id: string, patch: Partial<Pick<SkillGroup, "label" | "description" | "icon">>) => void;
  removeSkillGroup: (id: string) => void;
  restorePresetGroups: () => void;
  assignSkillToGroup: (groupId: string, skill: SkillRef) => void;
  unassignSkillFromGroup: (groupId: string, name: string) => void;
  refreshLearning: () => Promise<void>;
  /** Review a session now (or when counters fire), staging proposals. */
  reviewSession: (sessionId: string, opts?: { manual?: boolean }) => Promise<void>;
  decideProposal: (id: string, verdict: "approve" | "reject", edited?: string) => Promise<string | null>;
  /** After a turn: ask the judge and keep going toward the session's goal. */
  advanceGoal: (sessionId: string) => Promise<void>;
  stopGoal: (sessionId: string) => void;
  /** Interrupt the running turn and send this queued message now (steer). */
  steerNow: (sessionId: string, msgId: string) => void;
  /** Take a queued message back before the agent reads it. */
  unqueue: (sessionId: string, msgId: string) => void;
  /** Preview a file the agent made, or inline html/svg, in the artifact pane. */
  openArtifact: (sessionId: string, what: { path?: string; code?: string; lang?: string }) => Promise<string | null>;
  /** Put the session's folder back to a checkpoint (undoable). */
  restoreCheckpoint: (sessionId: string, sha: string, label: string) => Promise<void>;
  /** Link (or unlink) a skill group to a session. */
  linkSkillGroup: (sessionId: string, groupId: string, linked: boolean) => void;
  setProviderColor: (providerId: string, color: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  addSchedule: (t: Omit<ScheduledTask, "id" | "lastRun">) => void;
  updateSchedule: (id: string, patch: Partial<ScheduledTask>) => void;
  removeSchedule: (id: string) => void;
  runScheduledTask: (to: string, prompt: string, name: string) => void;
  refreshCliSessions: () => Promise<void>;
  openCliSession: (row: CliSession) => Promise<string | null>;
  hydrateSession: (sessionId: string) => Promise<void>;
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

// Unsent composer text per session, kept in the state file like settings
// (localStorage alone is per-port, and the app's port changes per launch).
const DRAFTS_KEY = "westcode-drafts-v1";
export function readDrafts(): Record<string, string> {
  const d = readJson<Record<string, string>>(DRAFTS_KEY, {});
  return d && typeof d === "object" ? d : {};
}
export function writeDrafts(d: Record<string, string>) {
  saveState(DRAFTS_KEY, d);
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

/**
 * The CLIs keep their own transcript (~/.claude, ~/.grok, ~/.codex) and hand
 * it back through session/load, so WestCode stores the pointer rather than a
 * second copy. Custom API providers have no such store — their messages stay
 * here, as they always have.
 */
export function cliBacked(s: Session): boolean {
  return (
    Boolean(s.agentSessionId) &&
    (PROVIDER_ORDER as readonly string[]).includes(s.providerId)
  );
}

const msgText = (m: ChatMessage) =>
  m.blocks
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();

/** Every checkpoint the session knows: saved ones plus those on messages. */
function collectCheckpoints(s: Session): { text: string; sha: string }[] {
  const out = [...(s.checkpoints ?? [])];
  const seen = new Set(out.map((c) => c.sha));
  for (const m of s.messages) {
    if (m.role === "user" && m.checkpoint && !seen.has(m.checkpoint)) {
      out.push({ text: msgText(m), sha: m.checkpoint });
      seen.add(m.checkpoint);
    }
  }
  return out.slice(-50);
}

/** Put saved checkpoints back on re-read messages, in order, by their text. */
export function attachCheckpoints(
  messages: ChatMessage[],
  checkpoints: { text: string; sha: string }[] = [],
): ChatMessage[] {
  if (!checkpoints.length) return messages;
  const used = new Set(messages.map((m) => m.checkpoint).filter(Boolean));
  let from = 0;
  return messages.map((m) => {
    if (m.role !== "user" || m.checkpoint) return m;
    const text = msgText(m);
    for (let i = from; i < checkpoints.length; i++) {
      const c = checkpoints[i]!;
      if (c.text === text && !used.has(c.sha)) {
        from = i + 1;
        used.add(c.sha);
        return { ...m, checkpoint: c.sha };
      }
    }
    return m;
  });
}

function sanitizeSession(s: Session): Session {
  const checkpoints = collectCheckpoints(s);
  return {
    ...s,
    checkpoints: checkpoints.length ? checkpoints : undefined,
    status: s.status === "running" ? "waiting" : s.status,
    permission: null,
    question: null,
    queued: undefined,
    permissionMode: s.permissionMode || DEFAULT_PERMISSION,
    agentSessionId: s.agentSessionId,
    messages: cliBacked(s)
      ? []
      : s.messages.map((m) => ({ ...m, streaming: false })),
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
  return sessions.filter((s) => !s.archivedAt).map((s) => ({
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
    .filter((s) => s.id !== selfId && !s.archivedAt)
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

/**
 * The CLIs title a session from its first user message, and WestCode's first
 * message carries the desk preamble — so its own sessions come back titled
 * "[WestCode desk] You are one session…". Strip that for display and fall
 * back to the folder name.
 */
export function cliSessionTitle(row: CliSession): string {
  let t = (row.title || "").trim();
  if (/^\[WestCode desk\]/i.test(t)) {
    const line = t
      .split("\n")
      .map((l) => l.trim())
      .find(
        (l) =>
          l &&
          !/^\[WestCode desk\]/i.test(l) &&
          !/^(You are one session|Other sessions|Installed (skills|connectors)|- ses-)/i.test(l),
      );
    t = line ?? "";
  }
  t = t.replace(/\s+/g, " ").trim();
  if (t.length > 60) t = `${t.slice(0, 57)}…`;
  return t || row.cwd.split("/").filter(Boolean).pop() || "session";
}

/**
 * Every prompt WestCode sends is prefixed with desk/persona scaffolding, so a
 * replayed user turn starts with it. Show only what the human typed: cut at
 * the last line of whichever scaffolding blocks are present.
 */
export function stripDeskPreamble(text: string): string {
  // A history re-injection from an older WestCode restart is scaffolding in
  // full: the turns it quotes are already in the transcript above it.
  if (text.startsWith("[WestCode restored this thread")) return "";
  if (!text.startsWith("[WestCode desk]")) return text;
  // Turns sent since the end marker existed say where the scaffolding stops.
  const marked = text.indexOf(PREAMBLE_END);
  if (marked >= 0) return stripMentionNotes(text.slice(marked + PREAMBLE_END.length)).trim() || text;
  // Older turns: the desk block is always first and always present here.
  const deskEnd = "Never acknowledge a completion report.";
  const at = text.indexOf(deskEnd);
  if (at < 0) return text;
  let rest = text.slice(at + deskEnd.length);
  // Then the optional blocks WestCode may add, in whatever order a version
  // composed them. Each is consumed only when its OPENING marker starts what
  // is left, so a phrase the human happens to use later in their own message
  // is never a cut point — the blocks are scaffolding at the front or they
  // are not there.
  const ended: [RegExp, string[]][] = [
    [/^\s*\[Shared memory\]/, ["Check it before work that may depend on earlier decisions."]],
    [/^\s*\[Agent profile:/, ["delegate to them with westcode_send_message when a task belongs to their role."]],
    [
      /^\s*\[Peer agent:/,
      ["the sender is waiting for your reply.", "acknowledgment ping-pong wastes both sessions."],
    ],
  ];
  // Blocks that are a header line, maybe one sentence, then bullet lines.
  const listed: [RegExp, number][] = [
    [/^\s*\[Desk memory\b[^\n]*\n/, 0],
    [/^\s*\[Skill groups linked to this session\][^\n]*\n/, 1],
  ];
  for (let progress = true; progress; ) {
    progress = false;
    for (const [opens, ends] of ended) {
      if (!opens.test(rest)) continue;
      const stop = ends
        .map((e) => rest.indexOf(e))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b)[0];
      if (stop === undefined) continue;
      rest = rest.slice(stop + ends.find((e) => rest.startsWith(e, stop))!.length);
      progress = true;
    }
    for (const [opens, sentences] of listed) {
      const m = rest.match(opens);
      if (!m) continue;
      const lines = rest.slice(m[0].length).split("\n");
      let i = sentences;
      while (i < lines.length && /^(- |About the user:|About their setup and projects:)/.test(lines[i]!)) i++;
      rest = lines.slice(i).join("\n");
      progress = true;
    }
  }
  return stripMentionNotes(rest).trim() || text;
}

// Delegation notes for @mentioned agents sit between the scaffolding and the
// human's own words.
function stripMentionNotes(rest: string): string {
  return rest.replace(/^(\s*\[@[^\]]*\]\s*)+/, "");
}

/** Last line of every preamble WestCode puts in front of a turn. */
export const PREAMBLE_END = "[End of WestCode context. The user's message follows.]";

/** Send the first queued message of an idle pane, as send()'s finally does. */
function drainQueued(sessionId: string) {
  const ses = useHelix.getState().sessions.find((s) => s.id === sessionId);
  const next = ses?.queued?.[0];
  if (!next || ses?.status === "running") return;
  useHelix.setState((s) => ({
    sessions: patchSession(s.sessions, sessionId, (x) => ({
      ...x,
      queued: (x.queued ?? []).slice(1),
    })),
  }));
  queueMicrotask(() => {
    void useHelix.getState().send(sessionId, next.text, {
      incoming: next.incoming,
      replay: true,
      replayOf: next.msgId,
    });
  });
}

/**
 * Fold a history read into a pane. Whatever is on screen is newer than the
 * stored transcript — a turn started while the read ran — so history goes in
 * front of it, and a stale failure note goes. A failed read only ADDS its
 * note: it must never cost the user messages that are already there.
 */
export function mergeHistory(
  ses: Session,
  incoming: ChatMessage[],
  ok: boolean,
): ChatMessage[] {
  if (!ok) return [...ses.messages, ...incoming];
  const local = ses.messages.filter((m) => m.role !== "system");
  if (!local.length) return incoming;
  // A turn that FINISHED before the read (a desk delivery or a scheduled
  // task on a pane nobody had opened yet) is in the stored transcript AND
  // on screen. Drop the tail of the history those rows repeat, or the
  // conversation shows twice. An in-flight turn matches nothing and stays.
  // Match on what BOTH sides agree about. Not blocksToPlain: it keys a tool
  // by `path`, and the live stream puts the tool id there where the replay
  // puts a real path — so every tool-using turn would look different. Think
  // text is out too (a replay need not carry thoughts), and a row still
  // streaming can never be one the CLI has already recorded.
  const key = (m: ChatMessage) => {
    if (m.streaming) return `live:${m.id}`;
    const body = m.blocks
      .map((b) =>
        b.type === "text"
          ? b.text
          : b.type === "tool"
            ? `${b.name} ${b.command ?? ""} ${b.content}`
            : "",
      )
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
    return `${m.role === "agent" ? "user" : m.role}:${body}`;
  };
  const localKeys = local.map(key);
  let overlap = 0;
  for (let k = Math.min(incoming.length, local.length); k > 0; k--) {
    let same = true;
    for (let i = 0; i < k; i++) {
      if (key(incoming[incoming.length - k + i]!) !== localKeys[i]) {
        same = false;
        break;
      }
    }
    if (same) {
      overlap = k;
      break;
    }
  }
  return [...incoming.slice(0, incoming.length - overlap), ...local];
}

/** Turn a session/load replay into transcript messages. */
/** Follow the agent's API message ids: text of the latest one, for Rewind. */
function nextAcp(cur: ChatMessage["lastAcp"], ev: { messageId?: string; text?: string }): ChatMessage["lastAcp"] {
  if (!ev.messageId) return cur;
  return cur?.id === ev.messageId ? { id: cur.id, text: cur.text + (ev.text ?? "") } : { id: ev.messageId, text: ev.text ?? "" };
}

export function replayToMessages(events: SessionEvent[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  let asst: ChatMessage | null = null;
  const tools = new Map<string, ToolBlock>();
  const push = (m: ChatMessage) => out.push(m);
  for (const ev of events) {
    if (ev.type === "user") {
      const text = stripDeskPreamble(ev.text ?? "");
      if (!text.trim()) continue;
      asst = null;
      tools.clear();
      push({
        id: uid("msg"),
        role: "user",
        createdAt: Date.now(),
        blocks: [{ type: "text", text }],
      });
      continue;
    }
    if (ev.type !== "text" && ev.type !== "thought" && ev.type !== "tool") continue;
    if (!asst) {
      asst = { id: uid("msg"), role: "assistant", createdAt: Date.now(), blocks: [] };
      push(asst);
    }
    if (ev.type === "tool") {
      const key = ev.toolId || uid("tool");
      const known = tools.get(key);
      if (known) {
        if (ev.name) known.name = ev.name;
        if (ev.title) known.title = ev.title;
        if (ev.toolKind) known.toolKind = ev.toolKind;
        if (ev.path) known.path = ev.path;
        if (ev.command) known.command = ev.command;
        if (ev.content) known.content = ev.content;
        if (ev.diffs) known.diffs = ev.diffs;
        if (ev.status) known.status = ev.status;
        continue;
      }
      const block: ToolBlock = {
        type: "tool",
        toolId: ev.toolId,
        name: ev.name || "Tool",
        title: ev.title || undefined,
        toolKind: ev.toolKind,
        diffs: ev.diffs,
        path: ev.path,
        command: ev.command,
        content: ev.content || "",
        status: ev.status || "done",
      };
      tools.set(key, block);
      asst.blocks.push(block);
      continue;
    }
    // Chunks stream in pieces — keep appending to the trailing block of the
    // same kind instead of making one block per chunk.
    const kind = ev.type === "thought" ? "think" : "text";
    if (ev.type === "text") asst.lastAcp = nextAcp(asst.lastAcp, ev);
    const last = asst.blocks[asst.blocks.length - 1];
    if (last && last.type === kind) last.text += ev.text ?? "";
    else asst.blocks.push({ type: kind, text: ev.text ?? "" });
  }
  return out.filter((m) => m.blocks.some((b) => b.type !== "text" || b.text.trim()));
}

/** A thought ends when the agent moves on to text or a tool. */
export function closeThinking(blocks: Block[]): Block[] {
  const last = blocks[blocks.length - 1];
  if (last?.type === "think" && last.ms == null && last.startedAt) {
    blocks[blocks.length - 1] = { ...last, ms: Date.now() - last.startedAt };
  }
  return blocks;
}

function applyEvent(sessionId: string, asstId: string, ev: SessionEvent) {
  const patch = (fn: (s: Session) => Session) =>
    useHelix.setState((s) => ({
      sessions: patchSession(s.sessions, sessionId, fn),
    }));

  if (ev.type === "ready" && ev.agentSessionId) {
    // A session WestCode STARTED owns what is on screen, so its CLI history
    // must not be replayed over the top of it. A restored pane is the other
    // way round: it already carries a pointer and is still waiting for its
    // history, so a turn that lands before the read (a desk delivery, a
    // scheduled task) must not lock it out.
    const shown = useHelix.getState().sessions.find((x) => x.id === sessionId);
    if (shown?.messages.length && !shown.agentSessionId) hydrated.add(sessionId);
    patch((ses) => ({
      ...ses,
      agentSessionId: ev.agentSessionId,
      updatedAt: Date.now(),
    }));
    return;
  }
  if (ev.type === "plan" && ev.plan) {
    patch((ses) => ({ ...ses, plan: ev.plan, updatedAt: Date.now() }));
    return;
  }
  if (ev.type === "usage" && ev.usage) {
    patch((ses) => ({ ...ses, usage: ev.usage }));
    return;
  }
  if (ev.type === "info") {
    // The agent's own title for the work (until the user names it), and its
    // guess at your next prompt.
    patch((ses) => ({
      ...ses,
      ...(ev.title && !ses.titleLocked ? { title: ev.title } : {}),
      ...(ev.suggestion !== undefined ? { suggestion: ev.suggestion } : {}),
    }));
    return;
  }
  if (ev.type === "task" && ev.task) {
    const t = ev.task;
    patch((ses) => {
      const cur = ses.tasks ?? [];
      const i = cur.findIndex((x) => x.id === t.id);
      const tasks = i >= 0 ? cur.map((x, j) => (j === i ? { ...x, ...t, description: t.description ?? x.description } : x)) : [...cur, t];
      return { ...ses, tasks: tasks.slice(-30) };
    });
    return;
  }
  if (ev.type === "caps") {
    patch((ses) => ({ ...ses, canSteer: Boolean(ev.steering) }));
    return;
  }
  if (ev.type === "mode" && ev.modeId) {
    patch((ses) => ({ ...ses, agentMode: ev.modeId }));
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
      question: null,
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
  if (ev.type === "question" && ev.rpcId != null) {
    patch((ses) => ({
      ...ses,
      question: { rpcId: ev.rpcId!, message: ev.message || "", fields: ev.fields || [] },
      updatedAt: Date.now(),
    }));
    const ses = useHelix.getState().sessions.find((s) => s.id === sessionId);
    notifyBackground(sessionId, `${ses?.title ?? "Session"} has a question`, ev.message || "Waiting for your answer.");
    return;
  }
  if (ev.type === "permission" && ev.rpcId != null) {
    patch((ses) => ({
      ...ses,
      permission: {
        rpcId: ev.rpcId!,
        tool: ev.tool || "tool",
        toolKind: ev.toolKind,
        command: ev.command,
        diffs: ev.diffs,
        options: ev.options || [],
      },
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
        if (last?.type === "think" && last.ms == null) {
          blocks[blocks.length - 1] = { ...last, text: last.text + ev.text };
        } else {
          blocks.push({ type: "think", text: ev.text!, startedAt: Date.now() });
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
        const blocks = closeThinking([...m.blocks]);
        const last = blocks[blocks.length - 1];
        if (last?.type === "text") {
          blocks[blocks.length - 1] = { type: "text", text: last.text + ev.text };
        } else {
          blocks.push({ type: "text", text: ev.text! });
        }
        return { ...m, blocks, raw: (m.raw ?? "") + ev.text, streaming: true, lastAcp: nextAcp(m.lastAcp, ev) };
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
        const blocks = closeThinking([...m.blocks]);
        // Match on the agent's call id. Matching on `path` used to work only
        // for tools that HAVE no path (the id was stored there), so a Read or
        // Edit update opened a second card instead of completing the first.
        const idx = blocks.findIndex(
          (b) =>
            b.type === "tool" &&
            (ev.toolId
              ? b.toolId === ev.toolId || (!b.toolId && b.name === ev.name)
              : b.name === ev.name && b.status === "running"),
        );
        const tool: ToolBlock = {
          type: "tool",
          toolId: ev.toolId,
          name: ev.name || "Tool",
          title: ev.title || undefined,
          toolKind: ev.toolKind,
          path: ev.path,
          command: ev.command,
          content: ev.content || "",
          diffs: ev.diffs,
          status: ev.status || "running",
        };
        if (idx >= 0) {
          const prev = blocks[idx] as ToolBlock;
          // tool_call_update is a PATCH: a completion event often carries only
          // {toolCallId, status}. Never let a fabricated/generic name replace
          // the recorded one — extractSendMessages relies on the original
          // westcode_send_message name to suppress double sends.
          const meaningfulName =
            ev.name && ev.name !== "Tool" ? ev.name : prev.name;
          blocks[idx] = {
            ...tool,
            name: meaningfulName,
            title: tool.title || prev.title,
            toolKind: tool.toolKind || prev.toolKind,
            toolId: tool.toolId || prev.toolId,
            content: tool.content || prev.content,
            diffs: tool.diffs || prev.diffs,
            path: tool.path || prev.path,
            command: tool.command || prev.command,
            // A patch without a status leaves the card where it was.
            status: ev.status || prev.status,
          };
        } else {
          blocks.push(tool);
          bumpLearn(sessionId, "tools");
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
        ev.type === "question" ||
        ev.type === "models" ||
        ev.type === "ready" ||
        ev.type === "plan" ||
        ev.type === "usage" ||
        ev.type === "info" ||
        ev.type === "mode" ||
        ev.type === "task" ||
        ev.type === "caps"
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
  api.onScheduleFire?.((p) => {
    const state = useHelix.getState();
    const task = state.schedules.find((t) => t.id === p.id);
    // lastRun updates first so a slow turn cannot double-fire on the next tick.
    if (task) state.updateSchedule(task.id, { lastRun: Date.now() });
    state.runScheduledTask(p.to, p.prompt, p.name);
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
    const pinRaw = toProviderRaw?.trim().toLowerCase();
    const pinnedProvider = pinRaw
      ? (PROVIDER_ORDER as readonly string[]).includes(pinRaw)
        ? pinRaw
        : state.customProviders.find(
            (c) => c.id.toLowerCase() === pinRaw || c.name.toLowerCase() === pinRaw,
          )?.id
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
        (s) =>
          s.agentId === agent.id &&
          s.id !== p.from &&
          !s.archivedAt &&
          // A pin like quinn@claude must not deliver to Quinn-on-Grok.
          (!pinnedProvider || s.providerId === pinnedProvider),
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
/** Per session, since the last review: user turns and tool calls. */
const learnCounters = new Map<string, { turns: number; tools: number }>();
const LEARN_EVERY = 10;
function bumpLearn(sessionId: string, key: "turns" | "tools") {
  const c = learnCounters.get(sessionId) ?? { turns: 0, tools: 0 };
  c[key] += 1;
  learnCounters.set(sessionId, c);
}
let viewTouched = false;

export const useHelix = create<HelixState>((set, get) => ({
  sessions: [],
  activeId: null,
  splitIds: null,
  view: "mosaic",
  mobileNav: "desk",
  clock: Date.now(),
  newOpen: false,
  newProviderId: null,
  newPrefill: null,
  rewindTo: async (sessionId, messageId) => {
    const api = westcode();
    const ses = get().sessions.find((s) => s.id === sessionId);
    if (!api?.forkSession || !ses?.agentSessionId || ses.hostId || ses.status === "running") return false;
    const idx = ses.messages.findIndex((m) => m.id === messageId);
    const msg = ses.messages[idx];
    if (!msg || msg.role !== "user") return false;
    const note = (text: string) =>
      set((st) => ({ sessions: patchSession(st.sessions, sessionId, (x) => ({ ...x, messages: [...x.messages, systemNote(text)] })) }));
    const before = [...ses.messages.slice(0, idx)].reverse().find((m) => m.role === "assistant" && m.lastAcp?.id);
    // Forking starts the agent, which takes a while: say so.
    const working = { ...systemNote("Rewinding — forking the conversation before that message…"), id: uid("rw") };
    set((st) => ({ sessions: patchSession(st.sessions, sessionId, (x) => ({ ...x, messages: [...x.messages, working] })) }));
    const dropWorking = () =>
      set((st) => ({ sessions: patchSession(st.sessions, sessionId, (x) => ({ ...x, messages: x.messages.filter((m) => m.id !== working.id) })) }));
    let agentSessionId: string | undefined;
    if (before?.lastAcp) {
      const r = await api.forkSession({
        providerId: ses.providerId,
        cwd: ses.cwd,
        agentSessionId: ses.agentSessionId,
        model: ses.model,
        effort: ses.effort,
        at: { messageId: before.lastAcp.id, text: before.lastAcp.text },
      });
      if (!r.ok || !r.agentSessionId) {
        dropWorking();
        note(`Could not rewind: ${r.error ?? "unknown error"}`);
        return false;
      }
      agentSessionId = r.agentSessionId;
    }
    // Files back to how they were before that message (undoable).
    if (msg.checkpoint && api.git?.restore) {
      const r = await api.git.restore(ses.cwd, msg.checkpoint);
      if (!r.ok) note(`Conversation rewound, but the files could not be restored: ${r.error ?? "unknown error"}`);
    }
    const text = msg.blocks.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    void westcode()?.stopSession(sessionId);
    set((st) => ({
      sessions: patchSession(st.sessions, sessionId, (x) => ({
        ...x,
        agentSessionId,
        messages: x.messages.slice(0, idx),
        queued: undefined,
        updatedAt: Date.now(),
      })),
    }));
    hydrated.add(sessionId);
    persistDesk();
    window.dispatchEvent(new CustomEvent("westcode:compose", { detail: { sessionId, text } }));
    return true;
  },

  forkSession: async (sessionId) => {
    const api = westcode();
    const ses = get().sessions.find((s) => s.id === sessionId);
    if (!api?.forkSession || !ses?.agentSessionId || ses.hostId) return null;
    const note = (text: string) =>
      set((st) => ({ sessions: patchSession(st.sessions, sessionId, (x) => ({ ...x, messages: [...x.messages, systemNote(text)] })) }));
    const r = await api.forkSession({
      providerId: ses.providerId,
      cwd: ses.cwd,
      agentSessionId: ses.agentSessionId,
      model: ses.model,
      effort: ses.effort,
    });
    if (!r.ok || !r.agentSessionId) {
      note(`Could not fork: ${r.error ?? "unknown error"}`);
      return null;
    }
    const id = uid("ses");
    const fork: Session = {
      ...ses,
      id,
      title: `Fork of ${ses.title}`.slice(0, 80),
      titleLocked: true,
      agentSessionId: r.agentSessionId,
      messages: [],
      status: "idle",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archivedAt: undefined,
      sideOpen: undefined,
      queued: undefined,
      permission: null,
      question: null,
      checkpoints: undefined,
      worktree: undefined,
    };
    set((st) => ({ sessions: [fork, ...st.sessions], activeId: id, view: "focus" as const }));
    await get().hydrateSession(id);
    return id;
  },
  openNewWith: ({ providerId, ...prefill }) =>
    set({ newOpen: true, newProviderId: providerId || null, newPrefill: prefill }),
  enabledAddons: DEFAULT_ENABLED,
  customAddons: [],
  customProviders: [],
  recentFolders: [],
  agents: PRESET_AGENTS,
  agentsPersist: { custom: [], overrides: {}, removed: [] },
  skillGroups: mergeGroups(EMPTY_GROUPS),
  groupsPersist: EMPTY_GROUPS,
  learnPending: [],
  reviewing: [],
  loadingHistory: [],
  deskMemory: "",
  providerColors: {},
  settings: DEFAULT_SETTINGS,
  schedules: [],
  cliStatus: [],
  cliUpdates: [],
  updateBusy: null,
  updateError: null,
  liveAddons: [],
  libraryStatus: "idle",
  cliSessions: [],
  cliSessionStatus: "idle",
  cliSessionErrors: [],
  cliSessionsElsewhere: 0,
  sshHosts: [],
  sshConfigHosts: [],
  refreshSshHosts: async () => {
    const api = westcode()?.ssh;
    if (!api) return;
    try {
      const r = await api.list();
      set({ sshHosts: r.hosts ?? [], sshConfigHosts: r.config ?? [] });
    } catch {
      /* keep what we had */
    }
  },

  setView: (view) => {
    viewTouched = true;
    set({ view, mobileNav: "desk" });
  },
  setActive: (id) => {
    // Leaving a session marks what was on screen as seen (sidebar unread dot).
    const prev = get().activeId;
    const now = Date.now();
    set((s) => ({
      activeId: id,
      view: "focus",
      mobileNav: "desk",
      sessions: s.sessions.map((x) => (x.id === prev || x.id === id ? { ...x, seenAt: now } : x)),
    }));
    // A pane whose history has not been painted yet (including one that
    // only holds a failure note) asks the CLI again on focus.
    void get().hydrateSession(id);
  },
  setSplit: (ids) => {
    set({ splitIds: ids, view: "split", mobileNav: "desk" });
    // Both halves are on screen, so both need their transcript.
    for (const id of new Set(ids)) void get().hydrateSession(id);
  },
  setNewOpen: (newOpen, providerId = null) =>
    set({ newOpen, newProviderId: newOpen ? providerId : null, ...(newOpen ? {} : { newPrefill: null }) }),
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
    const groupsRaw = readJson<Partial<GroupsPersist>>(GROUPS_KEY, {});
    const groupsPersist: GroupsPersist = {
      custom: Array.isArray(groupsRaw.custom) ? groupsRaw.custom : [],
      overrides: groupsRaw.overrides && typeof groupsRaw.overrides === "object" ? groupsRaw.overrides : {},
      removed: Array.isArray(groupsRaw.removed) ? groupsRaw.removed : [],
    };
    const providerColors = readJson<Record<string, string>>(COLORS_KEY, {});
    const settings = {
      ...DEFAULT_SETTINGS,
      ...readJson<Partial<AppSettings>>(SETTINGS_KEY, {}),
    };
    const schedules = readJson<ScheduledTask[]>(SCHEDULES_KEY, []);
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
      groupsPersist,
      skillGroups: mergeGroups(groupsPersist),
      providerColors,
      settings,
      schedules: Array.isArray(schedules) ? schedules : [],
      recentFolders: Array.isArray(folders) ? folders : [],
      sessions,
      activeId: live.length
        ? get().activeId
        : (desk.activeId ?? sessions[0]?.id ?? null),
      splitIds: live.length ? get().splitIds : (desk.splitIds ?? null),
      // A view the user already picked while the desk was loading wins.
      view:
        live.length || viewTouched
          ? get().view
          : (desk.view ?? (sessions.length ? "focus" : "mosaic")),
    });
    // Restored CLI sessions carry only a pointer — refill the ones on screen
    // from the CLI itself. Off-screen panes wait until they are opened, so a
    // restart does not spawn every agent at once.
    const onScreen = [get().activeId, ...(get().splitIds ?? [])].filter(
      Boolean,
    ) as string[];
    for (const id of new Set(onScreen)) void get().hydrateSession(id);
    bindDeskPersist();
    void get().refreshCli();
    void get().refreshSshHosts();
    westcode()?.setKeepAwake?.(get().settings.keepAwake ?? true);
    void get().refreshLibrary();
    void get().refreshUpdates();
    void get().refreshLearning();
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

  answerQuestion: (sessionId, answers) => {
    const rpcId = get().sessions.find((s) => s.id === sessionId)?.question?.rpcId;
    set((s) => ({ sessions: patchSession(s.sessions, sessionId, (x) => ({ ...x, question: null })) }));
    if (rpcId == null) return;
    void westcode()?.question?.({ sessionId, rpcId, answers });
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

  refreshCliSessions: async () => {
    const api = westcode();
    if (!api?.cliSessions) return;
    if (get().cliSessionStatus === "loading") return;
    const had = get().cliSessions;
    set({ cliSessionStatus: "loading" });
    try {
      const res = await api.cliSessions(PROVIDER_ORDER.slice());
      set({
        cliSessions: res.ok ? res.sessions : had,
        cliSessionErrors: res.errors ?? [],
        cliSessionsElsewhere: res.elsewhere ?? 0,
        cliSessionStatus: "ready",
      });
    } catch (err) {
      set({
        cliSessions: had,
        cliSessionErrors: [(err as Error).message],
        cliSessionStatus: "ready",
      });
    }
  },

  hydrateSession: async (sessionId) => {
    const api = westcode();
    const ses = get().sessions.find((s) => s.id === sessionId);
    // A CLI-backed pane holds no transcript across a restart on purpose —
    // the CLI has it. The guard is "have we already painted this pane's
    // history", NOT "does the pane have messages": a turn the user started
    // before the history arrived must not cost them the history.
    if (!api?.openSession || !ses || !cliBacked(ses)) return;
    if (hydrating.has(sessionId) || hydrated.has(sessionId)) return;
    hydrating.add(sessionId);
    set((s) => ({ loadingHistory: [...s.loadingHistory, sessionId] }));
    try {
      const res = await api.openSession({
        sessionId: ses.id,
        providerId: ses.providerId,
        cwd: ses.cwd,
        model: ses.model,
        effort: ses.effort,
        permissionMode: ses.permissionMode,
        agentSessionId: ses.agentSessionId!,
        hostId: ses.hostId,
      });
      const messages = res.ok
        ? replayToMessages(res.history ?? [])
        : [
            systemNote(
              `Could not reload this session's history from ${resolveProvider(ses.providerId, get().customProviders).name}: ${res.output || "the CLI did not return it"}. Sending a message starts a fresh turn.`,
            ),
          ];
      if (!messages.length) return;
      if (res.ok) hydrated.add(sessionId);
      set((state) => ({
        sessions: patchSession(state.sessions, sessionId, (s) => ({
          ...s,
          messages: attachCheckpoints(mergeHistory(s, messages, res.ok), collectCheckpoints(s)),
          status: res.ok ? (s.status === "error" ? "idle" : s.status) : "error",
        })),
      }));
    } finally {
      hydrating.delete(sessionId);
      set((s) => ({ loadingHistory: s.loadingHistory.filter((id) => id !== sessionId) }));
    }
  },

  openCliSession: async (row) => {
    const api = westcode();
    if (!api?.openSession) return null;
    // Already on the desk? Focus that pane (un-archiving it) rather than
    // opening a second view of one agent-side session. A pane whose history
    // never loaded is retried instead of being a dead end.
    const existing = get().sessions.find(
      (s) => s.agentSessionId === row.agentSessionId && (s.hostId || null) === (row.hostId || null),
    );
    if (existing) {
      set((state) => ({
        activeId: existing.id,
        view: "focus" as const,
        mobileNav: "desk" as const,
        sessions: patchSession(state.sessions, existing.id, (s) => ({
          ...s,
          archivedAt: undefined,
        })),
      }));
      await get().hydrateSession(existing.id);
      return existing.id;
    }
    const p = resolveProvider(row.providerId, get().customProviders);
    const settings = get().settings;
    const scoped = settings.defaultProviderId === row.providerId;
    const session: Session = {
      id: uid("ses"),
      title: cliSessionTitle(row),
      providerId: row.providerId,
      projectId: "scratch",
      cwd: row.cwd,
      model: (scoped && settings.defaultModel) || p.defaultModel,
      effort: (scoped && settings.defaultEffort) || defaultEffortFor(row.providerId),
      permissionMode: settings.defaultPermissionMode || DEFAULT_PERMISSION,
      status: "running",
      createdAt: row.updatedAt || Date.now(),
      updatedAt: Date.now(),
      messages: [],
      turns: 0,
      agentSessionId: row.agentSessionId,
      ...(row.hostId ? { hostId: row.hostId } : {}),
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeId: session.id,
      view: "focus" as const,
      mobileNav: "desk" as const,
    }));
    const res = await api.openSession({
      sessionId: session.id,
      providerId: session.providerId,
      cwd: session.cwd,
      model: session.model,
      effort: session.effort,
      permissionMode: session.permissionMode,
      agentSessionId: row.agentSessionId,
      hostId: row.hostId,
    });
    set((state) => ({
      sessions: patchSession(state.sessions, session.id, (ses) => ({
        ...ses,
        status: res.ok ? "idle" : "error",
        updatedAt: Date.now(),
        messages: mergeHistory(
          ses,
          res.ok
            ? replayToMessages(res.history ?? [])
            : [systemNote(res.output || "Could not open that session.")],
          res.ok,
        ),
      })),
    }));
    if (res.ok) hydrated.add(session.id);
    // The pane was "running" while the history loaded, so anything typed in
    // that window queued behind it. Nothing else drains that queue — send()
    // only drains from its own finally — so kick it now.
    drainQueued(session.id);
    return session.id;
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
    sideOf,
    hostId,
    worktree,
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
      titleLocked: Boolean(title?.trim()),
      providerId,
      projectId,
      cwd: path,
      model: model ?? ((scoped && settings.defaultModel) || p.defaultModel),
      effort:
        effort ??
        ((scoped && settings.defaultEffort) || defaultEffortFor(providerId)),
      permissionMode:
        permissionMode ||
        settings.folderModes?.[hostId ? `${hostId}:${path}` : path] ||
        settings.defaultPermissionMode ||
        DEFAULT_PERMISSION,
      status: "idle",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      turns: 0,
      agentId,
      sideOf,
      ...(hostId ? { hostId } : {}),
      ...(worktree ? { worktree } : {}),
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      ...(background || sideOf
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

  setSessionOutputStyle: (sessionId, style) => {
    set((state) => ({
      sessions: patchSession(state.sessions, sessionId, (s) => ({ ...s, outputStyle: style, updatedAt: Date.now() })),
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
    // Claude Desktop remembers the mode per folder; Plan stays per session.
    const ses = get().sessions.find((s) => s.id === sessionId);
    if (ses && mode !== "plan" && !ses.sideOf) {
      const key = ses.hostId ? `${ses.hostId}:${ses.cwd}` : ses.cwd;
      const folderModes = { ...(get().settings.folderModes ?? {}), [key]: mode };
      get().updateSettings({ folderModes });
    }
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
          ? (sessions.find((x) => !x.archivedAt && !x.sideOf)?.id ?? null)
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
    // A session's worktree goes with it (Claude Desktop keeps it until
    // archive); one with uncommitted changes stays, and says where.
    const wt = get().sessions.find((x) => x.id === id)?.worktree;
    const git = westcode()?.git;
    if (!wt || !git) return;
    const note = (text: string) =>
      set((st) => ({
        sessions: patchSession(st.sessions, id, (x) => ({ ...x, messages: [...x.messages, systemNote(text)] })),
      }));
    if (archived) {
      void git.worktreeRemove?.(wt.path).then((r) => {
        if (r && !r.ok) {
          note(
            r.dirty
              ? `Worktree kept: ${wt.path} has uncommitted changes. Commit or discard them, then archive again to remove it. Branch ${wt.branch} keeps your commits either way.`
              : `Could not remove the worktree at ${wt.path}: ${r.error ?? "unknown error"}`,
          );
        }
      });
    } else {
      void git.worktreeReattach?.(wt.repo, wt.path, wt.branch).then((r) => {
        if (r && !r.ok) note(`Could not bring back the worktree for ${wt.branch}: ${r.error ?? "unknown error"}`);
      });
    }
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
        titleLocked: true,
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
    if ("launchAtLogin" in patch) {
      void westcode()?.setLoginItem?.(settings.launchAtLogin);
    }
    if ("keepAwake" in patch) westcode()?.setKeepAwake?.(settings.keepAwake ?? true);
  },

  addSchedule: (t) => {
    // Seed lastRun so a brand-new task first fires after its interval,
    // not the moment it is added.
    const schedules = [
      ...get().schedules,
      { ...t, id: uid("sch"), lastRun: Date.now() },
    ];
    saveState(SCHEDULES_KEY, schedules);
    set({ schedules });
  },

  updateSchedule: (id, patch) => {
    const schedules = get().schedules.map((t) =>
      t.id === id ? { ...t, ...patch } : t,
    );
    saveState(SCHEDULES_KEY, schedules);
    set({ schedules });
  },

  removeSchedule: (id) => {
    const schedules = get().schedules.filter((t) => t.id !== id);
    saveState(SCHEDULES_KEY, schedules);
    set({ schedules });
  },

  runScheduledTask: (to, prompt, name) => {
    const state = get();
    // Same provider resolution as the desk bus (custom API providers
    // included). Each task owns a DEDICATED session ("<name> — scheduled")
    // so an interval prompt never lands in a session the user is using.
    const agent = matchAgent(to, state.agents, { minScore: 80 });
    const title = `${name} — scheduled`;
    const task = state.schedules.find((t) => t.name === name && t.prompt === prompt);
    const bySavedId = task?.sessionId
      ? state.sessions.find((x) => x.id === task.sessionId && !x.archivedAt)
      : undefined;
    const dedicated =
      bySavedId ??
      state.sessions.find((x) => x.title === title && !x.archivedAt);
    let sessionId: string | null = dedicated?.id ?? null;
    if (!sessionId) {
      const provQuery = to.trim().toLowerCase();
      const customHit = state.customProviders.find(
        (c) =>
          c.id.toLowerCase() === provQuery || c.name.toLowerCase() === provQuery,
      )?.id;
      const prov = agent
        ? spawnableProviderId(
            agent.providerId ||
              state.settings.defaultProviderId ||
              PROVIDER_ORDER[0]!,
            state,
          )
        : (PROVIDER_ORDER as readonly string[]).includes(provQuery)
          ? provQuery
          : (customHit ??
            state.settings.defaultProviderId ??
            PROVIDER_ORDER[0]!);
      sessionId = state.createSession({
        providerId: prov,
        projectId: "scratch",
        cwd: state.settings.defaultCwd || "~",
        title,
        agentId: agent?.id,
        background: true,
        model: agent?.model || undefined,
        effort: agent?.effort || undefined,
        permissionMode: agent?.permissionMode || "bypass",
      });
      if (task) get().updateSchedule(task.id, { sessionId });
    }
    if (sessionId) {
      void get().send(sessionId, `[Scheduled task: ${name}]\n${prompt}`);
    }
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

  openAgent: (agentId, prompt) => {
    const st = get();
    const agent = st.agents.find((a) => a.id === agentId);
    if (!agent) return null;
    const running = st.sessions
      .filter((x) => x.agentId === agentId && !x.archivedAt)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (running) {
      st.setActive(running.id);
      if (prompt?.trim()) void st.send(running.id, prompt);
      return running.id;
    }
    return st.createSession({
      providerId: agent.providerId || st.settings.defaultProviderId || "claude",
      projectId: "scratch",
      title: agent.name,
      agentId: agent.id,
      model: agent.model,
      effort: agent.effort,
      permissionMode: agent.permissionMode,
      prompt,
    });
  },

  addSkillGroup: (g) => {
    const persist = get().groupsPersist;
    const taken = new Set([
      ...get().skillGroups.map((x) => x.id),
      ...GROUP_CATALOG.map((x) => x.id),
      ...persist.removed,
    ]);
    const id = slugGroupId(g.label || "group", taken);
    const next: GroupsPersist = {
      ...persist,
      custom: [...persist.custom, { ...g, id, builtin: false }],
    };
    saveState(GROUPS_KEY, next);
    set({ groupsPersist: next, skillGroups: mergeGroups(next) });
    return id;
  },

  updateSkillGroup: (id, patch) => {
    const persist = get().groupsPersist;
    const isPreset = GROUP_CATALOG.some((g) => g.id === id);
    const next: GroupsPersist = isPreset
      ? {
          ...persist,
          overrides: { ...persist.overrides, [id]: { ...persist.overrides[id], ...patch } },
        }
      : {
          ...persist,
          custom: persist.custom.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        };
    saveState(GROUPS_KEY, next);
    set({ groupsPersist: next, skillGroups: mergeGroups(next) });
  },

  removeSkillGroup: (id) => {
    const persist = get().groupsPersist;
    const next: GroupsPersist = {
      ...persist,
      custom: persist.custom.filter((g) => g.id !== id),
      removed: [...new Set([...persist.removed, id])],
    };
    saveState(GROUPS_KEY, next);
    set((s) => ({
      groupsPersist: next,
      skillGroups: mergeGroups(next),
      sessions: s.sessions.map((ses) =>
        ses.skillGroupIds?.includes(id)
          ? { ...ses, skillGroupIds: ses.skillGroupIds.filter((g) => g !== id) }
          : ses,
      ),
    }));
  },

  restorePresetGroups: () => {
    const persist = get().groupsPersist;
    const presetIds = new Set(GROUP_CATALOG.map((g) => g.id));
    const next: GroupsPersist = {
      ...persist,
      removed: persist.removed.filter((r) => !presetIds.has(r)),
      overrides: Object.fromEntries(
        Object.entries(persist.overrides).filter(([k]) => !presetIds.has(k)),
      ),
    };
    saveState(GROUPS_KEY, next);
    set({ groupsPersist: next, skillGroups: mergeGroups(next) });
  },

  assignSkillToGroup: (groupId, skill) => {
    const next = assignSkill(get().groupsPersist, groupId, skill);
    saveState(GROUPS_KEY, next);
    set({ groupsPersist: next, skillGroups: mergeGroups(next) });
  },

  unassignSkillFromGroup: (groupId, name) => {
    const next = unassignSkill(get().groupsPersist, groupId, name);
    saveState(GROUPS_KEY, next);
    set({ groupsPersist: next, skillGroups: mergeGroups(next) });
  },

  refreshLearning: async () => {
    const api = westcode()?.learn;
    if (!api) return;
    const [pending, memory] = await Promise.all([api.pending(), api.memory()]);
    set({ learnPending: pending, deskMemory: memory.snapshot });
  },

  reviewSession: async (sessionId, opts) => {
    const st = get();
    const api = westcode()?.learn;
    const ses = st.sessions.find((x) => x.id === sessionId);
    if (!api || !ses || st.reviewing.includes(sessionId)) return;
    if (!(PROVIDER_ORDER as readonly string[]).includes(ses.providerId)) return;
    const c = learnCounters.get(sessionId) ?? { turns: 0, tools: 0 };
    const doMemory = opts?.manual || c.turns >= LEARN_EVERY;
    const doSkill = opts?.manual || c.tools >= LEARN_EVERY;
    if (!opts?.manual && (st.settings.learning === "off" || (!doMemory && !doSkill))) return;
    learnCounters.set(sessionId, { turns: doMemory ? 0 : c.turns, tools: doSkill ? 0 : c.tools });
    const messages = ses.messages
      .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "agent")
      .slice(-60)
      .map((m) => ({ role: m.role, text: blocksToPlain(m.blocks).slice(0, 4000) }))
      .filter((m) => m.text.trim());
    if (messages.length < 2) {
      if (opts?.manual) {
        set((s) => ({
          sessions: patchSession(s.sessions, sessionId, (x) => ({
            ...x,
            messages: [...x.messages, systemNote("Nothing to learn from yet — this session is too short.")],
          })),
        }));
      }
      return;
    }
    set((s) => ({ reviewing: [...s.reviewing, sessionId] }));
    try {
      const r = await api.review({
        sessionId,
        providerId: ses.providerId,
        cwd: ses.cwd,
        model: ses.model,
        messages,
        doMemory,
        doSkill,
      });
      const staged = r.staged ?? [];
      if (get().settings.learning === "auto") {
        for (const p of staged) await api.decide(p.id, "approve");
      }
      await get().refreshLearning();
      const summary = staged.length
        ? `${get().settings.learning === "auto" ? "Learned" : "Proposed"}: ${staged
            .map((p) => (p.kind === "skill" ? `${p.action === "update" ? "improve" : "new"} skill ${p.name}` : `remember (${p.target}) “${(p.text ?? "").slice(0, 60)}”`))
            .join("; ")}${get().settings.learning === "auto" ? "." : " — review in Library → Learned."}`
        : r.ok
          ? opts?.manual
            ? "Reviewed this session: nothing worth keeping."
            : ""
          : `Review failed: ${r.error ?? "unknown error"}`;
      if (summary) {
        set((s) => ({
          sessions: patchSession(s.sessions, sessionId, (x) => ({ ...x, messages: [...x.messages, systemNote(summary)] })),
        }));
      }
    } finally {
      set((s) => ({ reviewing: s.reviewing.filter((x) => x !== sessionId) }));
    }
  },

  decideProposal: async (id, verdict, edited) => {
    const api = westcode()?.learn;
    if (!api) return "Needs the desktop app.";
    const st = get().settings;
    const r = await api.decide(id, verdict, edited, { memoryRepo: st.memoryRepo || undefined, memorySync: st.memorySync });
    await get().refreshLearning();
    if (verdict === "approve") void get().refreshLibrary();
    return r.ok ? null : (r.error ?? "Failed.");
  },

  advanceGoal: async (sessionId) => {
    const ses = get().sessions.find((x) => x.id === sessionId);
    const g = ses?.goal;
    const api = westcode();
    if (!ses || !g || g.status !== "active" || !api?.judgeGoal) return;
    const patchGoal = (goal: Partial<NonNullable<Session["goal"]>>) =>
      set((s) => ({
        sessions: patchSession(s.sessions, sessionId, (x) => (x.goal ? { ...x, goal: { ...x.goal, ...goal } } : x)),
      }));
    if (g.turns >= g.budget) {
      patchGoal({ status: "stopped", reason: `Used its ${g.budget}-turn budget.` });
      return;
    }
    patchGoal({ status: "judging" });
    const messages = ses.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({ role: m.role, text: blocksToPlain(m.blocks).slice(0, 3000) }));
    const v = await api.judgeGoal({ sessionId, providerId: ses.providerId, cwd: ses.cwd, model: ses.model, goal: g.text, messages });
    // The user may have stopped the goal while the judge ran.
    if (get().sessions.find((x) => x.id === sessionId)?.goal?.status !== "judging") return;
    if (v.verdict === "continue") {
      patchGoal({ status: "active", turns: g.turns + 1, reason: v.reason });
      void get().send(
        sessionId,
        `Continue toward the goal: ${g.text}${v.reason ? `\nNext, per the review: ${v.reason}` : ""}`,
        { display: `Continue toward the goal${v.reason ? ` — ${v.reason}` : ""}` },
      );
    } else {
      patchGoal({ status: v.verdict, reason: v.reason });
    }
  },

  stopGoal: (sessionId) => {
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (x) => (x.goal ? { ...x, goal: { ...x.goal, status: "stopped", reason: "Stopped by you." } } : x)),
    }));
  },

  steerNow: (sessionId, msgId) => {
    const ses = get().sessions.find((x) => x.id === sessionId);
    const item = ses?.queued?.find((q) => q.msgId === msgId);
    if (!ses || !item) return;
    // The agent can take it into the running turn: no interruption at all.
    const api = westcode();
    if (ses.canSteer && ses.status === "running" && api?.steer) {
      void api.steer(sessionId, item.text).then((r) => {
        if (r.ok) {
          set((s) => ({
            sessions: patchSession(s.sessions, sessionId, (x) => ({
              ...x,
              queued: (x.queued ?? []).filter((q) => q.msgId !== msgId),
            })),
          }));
        } else {
          interruptAndSend();
        }
      });
      return;
    }
    interruptAndSend();
    function interruptAndSend() {
    // Cancel the running turn the way stop() does (its late events must not
    // land on the new turn), but keep the rest of the queue.
    abortBySession.get(sessionId)?.abort();
    abortBySession.delete(sessionId);
    promptAsst.delete(sessionId);
    void westcode()?.cancel(sessionId);
    void westcode()?.stopSession(sessionId);
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (x) => ({
        ...x,
        status: "waiting",
        permission: null,
        question: null,
        queued: (x.queued ?? []).filter((q) => q.msgId !== msgId),
        messages: x.messages.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
      })),
    }));
    queueMicrotask(() => {
      void get().send(sessionId, item!.text, { incoming: item!.incoming, replay: true, replayOf: item!.msgId });
    });
    }
  },

  unqueue: (sessionId, msgId) => {
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (x) => ({
        ...x,
        queued: (x.queued ?? []).filter((q) => q.msgId !== msgId),
        messages: x.messages.filter((m) => m.id !== msgId),
      })),
    }));
  },

  openArtifact: async (sessionId, what) => {
    const api = westcode()?.artifact;
    const ses = get().sessions.find((x) => x.id === sessionId);
    if (!api || !ses) return "Previews need the WestCode desktop app.";
    const r = what.path ? await api.file(ses.cwd, what.path) : await api.inline(what.code ?? "", what.lang ?? "html");
    if (!r.ok || !r.url) return r.ok ? "No preview." : ((r as { error?: string }).error ?? "No preview.");
    const title = what.path ? what.path.split("/").pop()! : `${(what.lang ?? "html").toUpperCase()} from the reply`;
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (x) => ({
        ...x,
        artifact: { title, url: r.url!, path: what.path, markdown: /\.(md|markdown)$/i.test(what.path ?? "") },
      })),
    }));
    return null;
  },

  restoreCheckpoint: async (sessionId, sha, label) => {
    const api = westcode()?.git;
    const ses = get().sessions.find((x) => x.id === sessionId);
    if (!api?.restore || !ses) return;
    const r = await api.restore(ses.cwd, sha);
    const note: ChatMessage = r.ok
      ? {
          ...systemNote(
            `Files restored to before “${label}”.${r.removed?.length ? ` Removed ${r.removed.length} file${r.removed.length === 1 ? "" : "s"} created after it.` : ""}${r.skipped?.length ? ` Could not remove ${r.skipped.join(", ")} (in use) — delete ${r.skipped.length === 1 ? "it" : "them"} by hand.` : ""} The conversation is unchanged.`,
          ),
          restoreUndo: r.undo,
        }
      : systemNote(`Could not restore: ${r.error ?? "unknown error"}`);
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (x) => ({ ...x, messages: [...x.messages, note] })),
    }));
  },

  linkSkillGroup: (sessionId, groupId, linked) => {
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (ses) => {
        const cur = ses.skillGroupIds ?? [];
        const ids = linked
          ? [...new Set([...cur, groupId])]
          : cur.filter((g) => g !== groupId);
        return { ...ses, skillGroupIds: ids, updatedAt: Date.now() };
      }),
    }));
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
        question: null,
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
      bumpLearn(sessionId, "turns");
      // A new message from the user wins over a review still running.
      if (get().reviewing.includes(sessionId)) void westcode()?.learn?.cancel(sessionId);
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
            blocks: [{ type: "text", text: opts?.display || trimmed || "Attached files" }],
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
            blocks: [{ type: "text", text: opts?.display || trimmed || "Attached files" }],
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
        suggestion: null,
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
    // The preamble lists what the CLI actually has installed (live probe),
    // not a UI toggle — installed is active on these CLIs.
    const liveFor = (kind: AddonKind) => [
      ...new Set(
        get()
          .liveAddons.filter(
            (a) => a.kind === kind && a.providers.includes(latest.providerId),
          )
          .map((a) => a.name),
      ),
    ].slice(0, 12);
    const bus = deskPreamble(sessionId, latest.providerId, roster, {
      skills: liveFor("skill"),
      connectors: liveFor("connector"),
    });
    // Persona brief for this session, plus notes for other agents @mentioned
    // in the message ("Get @Ivy-Ben to build X" → where to delegate).
    const selfAgent = get().agents.find((a) => a.id === latest.agentId);
    const persona = selfAgent ? `${agentPreamble(selfAgent)}\n` : "";
    const installedSkills = get()
      .liveAddons.filter((a) => a.kind === "skill" && a.providers.includes(latest.providerId))
      .map((a) => a.name);
    const linkedGroups = (latest.skillGroupIds ?? [])
      .map((gid) => get().skillGroups.find((g) => g.id === gid))
      .filter((g): g is SkillGroup => Boolean(g))
      .map((g) => resolveGroup(g, installedSkills));
    const groupsText = groupPreamble(linkedGroups);
    // Approved desk memory rides the first turn of each CLI session (a
    // frozen snapshot — it never changes mid-session).
    const repoLine = get().settings.memoryRepo
      ? `[Shared memory] Durable memories for this user live in the git repository ${get().settings.memoryRepo}: one Markdown file per fact (frontmatter name/description/type), add a line to its index or TIMELINE.md if it has one, then commit and push. Check it before work that may depend on earlier decisions.\n`
      : "";
    const memoryText = !latest.agentSessionId && (get().deskMemory || repoLine) ? `${repoLine}${get().deskMemory}\n` : "";
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
      ? `${bus}\n${persona}${groupsText}[Peer agent: ${resolveProvider(opts.incoming.fromProviderId, get().customProviders).short} · ${opts.incoming.fromTitle} · session ${opts.incoming.fromSessionId}]\n${incomingNote}\n${PREAMBLE_END}\n\n`
      : `${bus}\n${memoryText}${persona}${groupsText}${mentionNotes}${PREAMBLE_END}\n`;
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
    // Snapshot the folder first (git repos only), so this turn's file
    // changes can be rolled back from the message.
    // Checkpoints are git snapshots of a folder on this Mac; a session on an
    // SSH host keeps its files there.
    if (userMsg && userMsg.role === "user" && api.git?.checkpoint && !latest.hostId) {
      try {
        const cp = await api.git.checkpoint(latest.cwd, trimmed.slice(0, 60));
        if (cp.ok && cp.sha) {
          set((s) => ({
            sessions: patchSession(s.sessions, sessionId, (ses) => ({
              ...ses,
              messages: ses.messages.map((m) => (m.id === userMsg.id ? { ...m, checkpoint: cp.sha } : m)),
              // Keyed by what the CLI records, which is what a re-read shows.
              checkpoints: [
                ...(ses.checkpoints ?? []),
                { text: outgoing.replace(/\s+/g, " ").trim(), sha: cp.sha! },
              ].slice(-50),
            })),
          }));
        }
      } catch {
        /* not a repo, or git missing — no checkpoint */
      }
    }
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
        hostId: latest.hostId,
        outputStyle:
          latest.providerId === "claude" ? (latest.outputStyle ?? get().settings.claudeOutputStyle ?? "") : undefined,
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
          // The turn ended: a thought still open is over, and a tool the
          // agent never sent a final status for is finished.
          messages: ses.messages.map((m) =>
            m.id === asstId
              ? {
                  ...m,
                  streaming: false,
                  blocks: closeThinking([...m.blocks]).map((b) =>
                    b.type === "tool" && b.status === "running"
                      ? { ...b, status: "done" as const }
                      : b,
                  ),
                }
              : m,
          ),
        })),
      }));
      if (!opts?.incoming) void get().reviewSession(sessionId);
      void get().advanceGoal(sessionId);
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
    "group",
    "ungroup",
    "reflect",
    "btw",
    "goal",
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

  if (cmd === "goal") {
    // Grok has its own /goal; let the CLI run it.
    if (session.slashCommands?.some((c) => c.cmd === "goal")) return false;
    if (!arg) {
      const g = session.goal;
      note(
        g
          ? `Goal: ${g.text}\nStatus: ${g.status} · turn ${g.turns}/${g.budget}${g.reason ? `\n${g.reason}` : ""}`
          : "Usage: /goal <what done looks like> — WestCode keeps the agent working until a judge says it is done or blocked. /goal stop ends it.",
      );
      return true;
    }
    if (/^(stop|off|clear|cancel)$/i.test(arg)) {
      get().stopGoal(sessionId);
      note("Goal stopped.");
      return true;
    }
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (x) => ({
        ...x,
        goal: { text: arg, turns: 1, budget: 20, status: "active" },
      })),
    }));
    void get().send(
      sessionId,
      `Goal: ${arg}\nWork toward this goal. Keep going across turns until it is met; say clearly what is done and what is left at the end of each turn.`,
      { display: `🎯 ${arg}` },
    );
    return true;
  }

  if (cmd === "btw") {
    if (!arg) {
      note("Usage: /btw <question> — asks on the side without touching this session's work.");
      return true;
    }
    const parent = session.sideOf ? (get().sessions.find((x) => x.id === session.sideOf) ?? session) : session;
    const context = parent.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-12)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${blocksToPlain(m.blocks).replace(/\s+/g, " ").slice(0, 600)}`)
      .join("\n");
    const prompt = `[Side chat]
This is a side question asked next to another session. The context below is reference only: do not continue that session's plan, todo list or approvals, and do not change files, git state or anything else — read, search and answer. Keep the answer short.

Context from the main session:
${context || "(nothing yet)"}

Question: ${arg}`;
    const sideId = get().createSession({
      providerId: parent.providerId,
      projectId: parent.projectId,
      cwd: parent.cwd,
      model: parent.model,
      effort: parent.effort,
      permissionMode: "plan",
      title: `Side: ${arg.slice(0, 40)}`,
      sideOf: parent.id,
      hostId: parent.hostId,
    });
    set((s) => ({
      sessions: patchSession(s.sessions, parent.id, (x) => ({ ...x, sideOpen: sideId, updatedAt: Date.now() })),
    }));
    void get().send(sideId, prompt, { display: arg });
    return true;
  }

  if (cmd === "reflect") {
    note("Reviewing this session for skills and memory worth keeping…");
    void get().reviewSession(sessionId, { manual: true });
    return true;
  }

  if (cmd === "group" || cmd === "ungroup") {
    const groups = get().skillGroups;
    const linked = new Set(session.skillGroupIds ?? []);
    if (!arg) {
      const lines = groups
        .map((g) => `${linked.has(g.id) ? "●" : "○"} ${g.label} (/group ${g.id}) — ${g.skills.length} skills`)
        .join("\n");
      note(`Skill groups — ● linked to this session\n\n${lines}\n\nEdit groups in Library → Groups.`);
      return true;
    }
    const g = matchGroup(arg, groups);
    if (!g) {
      note(`No skill group matching “${arg}”. Type /group to list them.`);
      return true;
    }
    const on = cmd === "group";
    get().linkSkillGroup(sessionId, g.id, on);
    const installed = get()
      .liveAddons.filter((a) => a.kind === "skill" && a.providers.includes(session.providerId))
      .map((a) => a.name);
    const r = resolveGroup(g, installed);
    note(
      on
        ? `Linked ${g.label}: ${r.available.length} of ${g.skills.length} skills installed for this provider${r.available.length ? ` (${r.available.join(", ")})` : ""}.${r.missing.length ? `\nNot installed: ${r.missing.map((m) => m.name).join(", ")} — install them from Library.` : ""}`
        : `Unlinked ${g.label}.`,
    );
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
    // Retire any in-flight turn the same way stop() does, or its late
    // events would paint over — and its queue replay into — the freshly
    // cleared transcript.
    abortBySession.get(sessionId)?.abort();
    abortBySession.delete(sessionId);
    promptAsst.delete(sessionId);
    void westcode()?.stopSession(sessionId);
    set((st) => ({
      sessions: patchSession(st.sessions, sessionId, (ses) => ({
        ...ses,
        agentSessionId: undefined,
      })),
    }));
    set((s) => ({
      sessions: patchSession(s.sessions, sessionId, (ses) => ({
        ...ses,
        messages: [systemNote("Conversation cleared.")],
        turns: 0,
        updatedAt: Date.now(),
        status: "idle",
        permission: null,
        question: null,
        queued: [],
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

// Dev/E2E handle on the store (never in a production build).
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __helix: typeof useHelix }).__helix = useHelix;
}
