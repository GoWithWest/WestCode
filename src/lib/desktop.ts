export type CliProbe = {
  id: string;
  name: string;
  binary: string;
  found: boolean;
  path: string | null;
  version: string | null;
  loggedIn: boolean | null;
  connected: boolean;
  install: string;
  installAlt: string | null;
  detail: string;
};

export type LiveAddon = {
  id: string;
  kind: "skill" | "plugin" | "connector";
  name: string;
  source: string;
  summary: string;
  providers: string[];
};

/** A session a provider CLI stores itself, from its own `session/list`. */
export type CliSession = {
  providerId: string;
  agentSessionId: string;
  cwd: string;
  title: string;
  updatedAt: number;
  /** Stored on this SSH host (see SshHost); absent = this Mac. */
  hostId?: string;
};

/** A machine sessions can run on over SSH (Settings → SSH hosts). */
export type SshHost = {
  id: string;
  name: string;
  host: string;
  user?: string;
  port?: number;
  identityFile?: string;
};

export type SshProbe = {
  ok: boolean;
  error?: string;
  home?: string;
  os?: string;
  clis?: Record<"claude" | "grok" | "codex", { path: string; version?: string } | null>;
  git?: boolean;
};

export type SessionEvent = {
  sessionId: string;
  type:
    | "text"
    | "thought"
    | "tool"
    | "commands"
    | "permission"
    | "done"
    | "error"
    | "models"
    | "ready"
    | "user"
    | "plan"
    | "usage"
    | "info"
    | "mode"
    | "task"
    | "caps"
    | "noop";
  text?: string;
  toolId?: string;
  name?: string;
  title?: string;
  toolKind?: string;
  diffs?: { path: string; oldText: string; newText: string }[];
  plan?: { content: string; status: "pending" | "in_progress" | "completed" }[];
  usage?: { used: number; size: number };
  modeId?: string;
  suggestion?: string | null;
  task?: { id: string; kind: "background" | "subagent"; description?: string; state: string; summary?: string };
  steering?: boolean;
  path?: string;
  command?: string;
  content?: string;
  status?: "running" | "done" | "error";
  commands?: { cmd: string; hint: string; kind: "builtin" | "skill" }[];
  rpcId?: number;
  tool?: string;
  options?: { optionId?: string; kind?: string; name?: string }[];
  message?: string;
  models?: { id: string; label: string }[];
  agentSessionId?: string;
};

export type GitStatus = {
  repo: boolean;
  branch?: string;
  adds?: number;
  dels?: number;
  files?: number;
  ahead?: number;
  behind?: number;
  remote?: string;
};

export type GitFile = {
  path: string;
  oldPath?: string;
  kind: "modified" | "new" | "deleted" | "renamed" | "copied" | "untracked" | "conflicted";
  staged: boolean;
  submodule: boolean;
};

export type GitSync = {
  action: "none" | "fetch" | "pull" | "push" | "publish-branch" | "publish-repo";
  label: string;
  disabled?: boolean;
  ahead?: number;
  behind?: number;
};

export type GitChanges = {
  ok: boolean;
  error?: string;
  repo?: boolean;
  branch?: string | null;
  upstream?: string | null;
  ahead?: number;
  behind?: number;
  hasUpstream?: boolean;
  tip?: "valid" | "detached" | "unborn" | "unknown";
  remotes?: string[];
  oid?: string | null;
  operation?: "merge" | "rebase" | "cherry-pick" | null;
  files?: GitFile[];
  sync?: GitSync;
};

export type GitCommit = {
  sha: string;
  shortSha: string;
  summary: string;
  body: string;
  author: string;
  email: string;
  at: number;
  parents: string[];
  refs: string[];
};

export type GitBridge = {
  changes: (cwd: string) => Promise<GitChanges>;
  diff: (cwd: string, file: GitFile) => Promise<{ patch?: string; binary?: boolean; tooLarge?: boolean; ok?: boolean; error?: string }>;
  commit: (
    cwd: string,
    p: { paths: string[]; oldPaths?: string[]; summary: string; description?: string },
  ) => Promise<{ ok: boolean; sha?: string; error?: string }>;
  undo: (cwd: string) => Promise<{ ok: boolean; summary?: string; description?: string; error?: string }>;
  discard: (cwd: string, files: GitFile[]) => Promise<{ ok: boolean; error?: string }>;
  branches: (cwd: string) => Promise<{
    ok: boolean;
    error?: string;
    branches: { ref: string; name: string; upstream: string | null; sha: string; remote: boolean }[];
  }>;
  checkout: (
    cwd: string,
    p: { name: string; remote?: boolean; create?: boolean; startPoint?: string },
  ) => Promise<{ ok: boolean; error?: string }>;
  sync: (cwd: string, action: string) => Promise<{ ok: boolean; error?: string }>;
  log: (cwd: string, p?: { limit?: number; skip?: number }) => Promise<{ ok: boolean; commits: GitCommit[] }>;
  show: (cwd: string, sha: string) => Promise<{ ok: boolean; patch?: string; error?: string }>;
  findRepos?: (cwd: string) => Promise<{ ok: boolean; repos: { path: string; name: string; mtime: number }[] }>;
  init?: (cwd: string) => Promise<{ ok: boolean; error?: string }>;
  checkpoint?: (cwd: string, label: string) => Promise<{ ok: boolean; sha?: string; error?: string }>;
  restore?: (cwd: string, sha: string) => Promise<{ ok: boolean; undo?: string; removed?: string[]; skipped?: string[]; error?: string }>;
  worktreeAdd?: (
    cwd: string,
    payload: { name: string; branchPrefix?: string; location?: string },
  ) => Promise<{ ok: boolean; path?: string; branch?: string; repo?: string; copied?: string[]; error?: string }>;
  worktreeRemove?: (path: string, force?: boolean) => Promise<{ ok: boolean; dirty?: boolean; gone?: boolean; error?: string }>;
  worktreeReattach?: (repo: string, path: string, branch: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
  onProgress: (
    fn: (p: { cwd: string; title: string; percent: number }) => void,
  ) => () => void;
};

export type LearnProposal = {
  id: string;
  kind: "skill" | "memory";
  name?: string;
  action?: "create" | "update";
  target?: "user" | "memory";
  op?: "add" | "replace" | "remove";
  text?: string;
  before: string;
  after: string;
  diff: string;
  why: string;
  origin?: { sessionId?: string };
  createdAt: number;
};

export type LearnBridge = {
  review: (p: {
    sessionId: string;
    providerId: string;
    cwd: string;
    model: string;
    messages: { role: string; text: string }[];
    doMemory: boolean;
    doSkill: boolean;
  }) => Promise<{ ok: boolean; error?: string; reply?: string; staged: LearnProposal[] }>;
  cancel: (origin: string) => Promise<{ ok: boolean }>;
  pending: () => Promise<LearnProposal[]>;
  decide: (
    id: string,
    verdict: "approve" | "reject",
    edited?: string,
    opts?: { memoryRepo?: string; memorySync?: boolean },
  ) => Promise<{ ok: boolean; error?: string; shared?: { ok: boolean; pushed?: boolean; note?: string; error?: string } }>;
  memory: () => Promise<{ user: string; memory: string; snapshot: string }>;
};

export type MemorySource = {
  provider: string;
  kind: "rules" | "memory";
  label: string;
  path: string;
  entries: number | null;
};

export type RepoInfo = {
  exists: boolean;
  repo: boolean;
  root?: string;
  remote?: string;
  lastCommit?: string;
  unpushed?: number | null;
};

export type MemoryHubBridge = {
  state: (memoryRepo?: string) => Promise<{
    ok: boolean;
    sources: MemorySource[];
    repo: RepoInfo | null;
    detected: { path: string; from: string; remote: string } | null;
    sync: { provider: string; path: string; synced: boolean }[];
    facts: string[];
    local: string;
  }>;
  preview: (path: string) => Promise<{ files: string[]; text: string }>;
  createRepo: (dir?: string) => Promise<{ ok: boolean; dir: string; error?: string }>;
  pickFolder: () => Promise<string | null>;
  setRemote: (dir: string, url: string) => Promise<{ ok: boolean; error?: string }>;
  sync: (
    enabled: boolean,
    memoryRepo?: string,
  ) => Promise<{ ok: boolean; results: { provider: string; path: string; status: string; error?: string }[] }>;
};

export type WestCreateSnapshot = {
  ok: boolean;
  error?: string;
  installed: boolean;
  bridge: boolean;
  running: boolean;
  mode?: string | null;
  startedAt?: string | null;
  registeredWith?: string[];
  tools?: string[];
  document?: Record<string, unknown> | null;
  job?: Record<string, unknown> | null;
  machine?: Record<string, unknown> | null;
  view?: string | null;
};

export type CliUpdate = {
  id: string;
  name: string;
  current: string;
  latest: string;
};

type WestcodeBridge = {
  desktop: true;
  probe: () => Promise<CliProbe[]>;
  library: (providerId: string) => Promise<LiveAddon[]>;
  addonAction: (payload: {
    providerId: string;
    kind: string;
    action: string;
    name: string;
    source?: string;
  }) => Promise<{ ok: boolean; output: string }>;
  registrySearch: (q: string) => Promise<{
    ok: boolean;
    output?: string;
    servers: {
      name: string;
      title: string;
      description: string;
      remote: string;
      npmPkg: string;
      repo: string;
    }[];
  }>;
  addonMcpAdd: (payload: {
    providerId: string;
    name: string;
    commandOrUrl: string;
    args?: string[];
    transport?: string;
    env?: Record<string, string>;
    header?: string;
  }) => Promise<{ ok: boolean; output: string }>;
  updates: () => Promise<CliUpdate[]>;
  updateCli: (providerId: string) => Promise<{ ok: boolean; output: string }>;
  installCli: (providerId: string) => Promise<{ ok: boolean; output: string }>;
  login: (providerId: string) => Promise<{ ok: boolean }>;
  logout: (providerId: string) => Promise<{ ok: boolean }>;
  pickFolder: () => Promise<{
    name: string;
    path: string;
    language: string;
    hint: string;
  } | null>;
  saveText: (
    defaultName: string,
    content: string,
  ) => Promise<{ ok: boolean; path?: string }>;
  installSkillFile: (
    path: string,
    name: string,
    providers: string[],
  ) => Promise<{ ok: boolean; output: string }>;
  pickFile: () => Promise<{
    name: string;
    path: string;
    snippet: string;
  } | null>;
  gitStatus: (cwd: string) => Promise<GitStatus>;
  git?: GitBridge;
  westcreate?: () => Promise<WestCreateSnapshot>;
  learn?: LearnBridge;
  judgeGoal?: (p: {
    sessionId: string;
    providerId: string;
    cwd: string;
    model: string;
    goal: string;
    messages: { role: string; text: string }[];
  }) => Promise<{ ok: boolean; verdict: "done" | "blocked" | "continue"; reason: string }>;
  memoryHub?: MemoryHubBridge;
  artifact?: {
    file: (root: string, file: string) => Promise<{ ok: boolean; url?: string; error?: string }>;
    inline: (code: string, lang: string) => Promise<{ ok: boolean; url?: string }>;
    openExternal: (url: string) => Promise<{ ok: boolean }>;
  };
  openWestcreate?: () => Promise<{ ok: boolean; error?: string }>;
  apiPrompt: (payload: {
    endpoint: string;
    apiKey?: string;
    providerId?: string;
    model: string;
    messages: { role: string; content: string }[];
  }) => Promise<{ ok: boolean; text?: string; error?: string }>;
  setSecret: (
    id: string,
    value: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  stateLoad: () => Promise<Record<string, unknown>>;
  setLoginItem: (enabled: boolean) => Promise<{ ok: boolean }>;
  openEditor: (cwd: string) => Promise<{ ok: boolean; editor?: string; output?: string }>;
  onScheduleFire: (
    fn: (p: { id: string; to: string; prompt: string; name: string }) => void,
  ) => () => void;
  stateSave: (
    key: string,
    value: unknown,
  ) => Promise<{ ok: boolean; error?: string }>;
  cliSessions: (providerIds?: string[]) => Promise<{
    ok: boolean;
    sessions: CliSession[];
    errors: string[];
    /** Sessions a CLI here lists whose folder is on another machine. */
    elsewhere?: number;
  }>;
  ssh?: {
    list: () => Promise<{ hosts: SshHost[]; config: (Omit<SshHost, "id"> & { hostName?: string })[] }>;
    save: (host: Partial<SshHost>) => Promise<{ ok: boolean; host?: SshHost; error?: string }>;
    remove: (id: string) => Promise<{ ok: boolean }>;
    test: (host: string | Partial<SshHost>) => Promise<SshProbe>;
    ls: (hostId: string, path?: string) => Promise<{ ok: boolean; path?: string; dirs?: string[]; error?: string }>;
    installClaude?: (hostId: string) => Promise<{ ok: boolean; error?: string }>;
  };
  openSession: (payload: {
    sessionId: string;
    providerId: string;
    cwd: string;
    model: string;
    effort: string;
    permissionMode?: string;
    agentSessionId: string;
    hostId?: string;
  }) => Promise<{
    ok: boolean;
    output?: string;
    resumed?: boolean;
    history?: SessionEvent[];
  }>;
  prompt: (payload: {
    sessionId: string;
    providerId: string;
    cwd: string;
    model: string;
    effort: string;
    permissionMode?: string;
    agentSessionId?: string;
    hostId?: string;
    history?: { role: string; text: string }[];
    text: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  cancel: (sessionId: string) => Promise<{ ok: boolean }>;
  steer?: (sessionId: string, text: string) => Promise<{ ok: boolean; error?: string }>;
  stopTask?: (sessionId: string, taskId: string) => Promise<{ ok: boolean; error?: string }>;
  stopSession: (sessionId: string) => Promise<{ ok: boolean }>;
  permission: (payload: {
    sessionId: string;
    rpcId: number;
    optionId: string;
  }) => Promise<{ ok: boolean }>;
  onEvent: (fn: (e: SessionEvent) => void) => () => void;
  onMenu: (fn: (action: string) => void) => () => void;
  setKeepAwake?: (enabled: boolean) => void;
  find?: {
    start: (text: string, opts?: { forward?: boolean; next?: boolean }) => void;
    stop: () => void;
    onResult: (fn: (r: { active: number; total: number }) => void) => () => void;
  };
  syncDesk: (rows: {
    id: string;
    title: string;
    providerId: string;
    provider: string;
    cwd: string;
    model: string;
    status: string;
    agentName?: string;
  }[]) => void;
  onDeskDeliver: (
    fn: (p: {
      requestId?: string;
      from: string;
      to: string;
      text: string;
    }) => void,
  ) => () => void;
  deskDelivered: (result: {
    requestId?: string;
    ok: boolean;
    error?: string;
    deliveredTo?: string;
  }) => void;
  window: {
    close: () => void;
    minimize: () => void;
    maximize: () => void;
  };
};

declare global {
  interface Window {
    westcode?: WestcodeBridge;
  }
}

export function isDesktop() {
  return typeof window !== "undefined" && Boolean(window.westcode?.desktop);
}

export function westcode() {
  return typeof window !== "undefined" ? window.westcode : undefined;
}
