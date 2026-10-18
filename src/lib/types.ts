export type SessionStatus = "running" | "waiting" | "idle" | "error";
export type LayoutView =
  | "mosaic"
  | "focus"
  | "split"
  | "providers"
  | "library"
  | "agents"
  | "westcreate"
  | "settings";

export type Attachment = {
  id: string;
  name: string;
  size: number;
  mime: string;
  kind: "text" | "image" | "binary";
  text?: string;
};

export type FileDiff = { path: string; oldText: string; newText: string };

export type ToolBlock = {
  type: "tool";
  /** The agent's own call id — identity, so updates patch the right card. */
  toolId?: string;
  name: string;
  /** Human label from the agent ("Read calc.py"). */
  title?: string;
  /** ACP tool kind: read, edit, delete, move, search, execute, think, fetch, other. */
  toolKind?: string;
  diffs?: FileDiff[];
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
  /** When the agent started this thought, and how long it took once done. */
  startedAt?: number;
  ms?: number;
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
  /** Working-tree snapshot taken just before this message's turn ran. */
  checkpoint?: string;
  /** On a "restored" note: the snapshot that undoes the restore. */
  restoreUndo?: string;
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
  toolKind?: string;
  command?: string;
  diffs?: FileDiff[];
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
  queued?: { text: string; incoming?: IncomingRef; msgId?: string }[];
  agentSessionId?: string;
  /** Persona from the Agents menu ("You are @Oz" assigns it). */
  agentId?: string;
  /** Hidden from the default sidebar list; restorable. */
  archivedAt?: number;
  /** Skill groups linked to this session (their skills ride every turn). */
  skillGroupIds?: string[];
  /** The agent's live task list (ACP plan updates). */
  plan?: PlanEntry[];
  /** Context window use from the agent (ACP usage_update). */
  usage?: { used: number; size: number };
  /** Mode the agent reports it is in (it can leave plan mode by itself). */
  agentMode?: string;
  /** The user named this session; agent-suggested titles stop applying. */
  titleLocked?: boolean;
};

export type PlanEntry = {
  content: string;
  status: "pending" | "in_progress" | "completed";
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
  /** Human agent name when the session runs a persona (e.g. "Oz"). */
  agentName?: string;
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
