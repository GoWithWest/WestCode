export type SessionStatus = "running" | "waiting" | "idle" | "error";
export type LayoutView =
  | "mosaic"
  | "focus"
  | "split"
  | "providers"
  | "library";

export type Attachment = {
  id: string;
  name: string;
  size: number;
  mime: string;
  kind: "text" | "image" | "binary";
  text?: string;
};

export type ToolBlock = {
  type: "tool";
  name: string;
  path?: string;
  command?: string;
  to?: string;
  content: string;
  status: "running" | "done" | "error";
};

export type TextBlock = {
  type: "text";
  text: string;
};

export type ThinkBlock = {
  type: "think";
  text: string;
};

export type Block = TextBlock | ToolBlock | ThinkBlock;

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "agent";
  createdAt: number;
  blocks: Block[];
  raw?: string;
  streaming?: boolean;
  attachments?: Attachment[];
  fromSessionId?: string;
  fromProviderId?: string;
  fromTitle?: string;
  hop?: number;
};

export type Project = {
  id: string;
  name: string;
  path: string;
  language: string;
  hint: string;
  custom?: boolean;
};

export type PermissionPrompt = {
  rpcId: number;
  tool: string;
  options: { optionId?: string; kind?: string; name?: string }[];
};

export type Session = {
  id: string;
  title: string;
  providerId: string;
  projectId: string;
  cwd: string;
  model: string;
  effort: string;
  permissionMode?: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  turns: number;
  slashCommands?: { cmd: string; args?: string; hint: string; kind: "builtin" | "skill" }[];
  permission?: PermissionPrompt | null;
  availableModels?: { id: string; label: string }[];
  queued?: { text: string; incoming?: IncomingRef }[];
  agentSessionId?: string;
};

export type IncomingRef = {
  fromSessionId: string;
  fromProviderId: string;
  fromTitle: string;
  hop: number;
};

export type AgentRosterItem = {
  id: string;
  title: string;
  providerId: string;
  provider: string;
  cwd: string;
  model: string;
  status: SessionStatus;
};

export const PROJECTS: Project[] = [
  {
    id: "harbor",
    name: "harbor",
    path: "~/src/harbor",
    language: "TypeScript",
    hint: "Checkout, auth, Playwright",
  },
  {
    id: "lumen",
    name: "lumen-api",
    path: "~/src/lumen-api",
    language: "Go",
    hint: "Payments service",
  },
  {
    id: "atlas",
    name: "atlas",
    path: "~/src/atlas",
    language: "Rust",
    hint: "CLI + TUI",
  },
  {
    id: "scratch",
    name: "scratch",
    path: "~/scratch",
    language: "Mixed",
    hint: "Unbound session",
  },
];

export function projectById(id: string) {
  return PROJECTS.find((p) => p.id === id) ?? PROJECTS[0];
}
