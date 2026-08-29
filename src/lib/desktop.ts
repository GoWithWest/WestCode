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
    | "noop";
  text?: string;
  toolId?: string;
  name?: string;
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
  pickFile: () => Promise<{
    name: string;
    path: string;
    snippet: string;
  } | null>;
  gitStatus: (cwd: string) => Promise<GitStatus>;
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
  prompt: (payload: {
    sessionId: string;
    providerId: string;
    cwd: string;
    model: string;
    effort: string;
    permissionMode?: string;
    agentSessionId?: string;
    history?: { role: string; text: string }[];
    text: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  cancel: (sessionId: string) => Promise<{ ok: boolean }>;
  stopSession: (sessionId: string) => Promise<{ ok: boolean }>;
  permission: (payload: {
    sessionId: string;
    rpcId: number;
    optionId: string;
  }) => Promise<{ ok: boolean }>;
  onEvent: (fn: (e: SessionEvent) => void) => () => void;
  onMenu: (fn: (action: string) => void) => () => void;
  syncDesk: (rows: {
    id: string;
    title: string;
    providerId: string;
    provider: string;
    cwd: string;
    model: string;
    status: string;
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
