import type { BuiltinProviderId } from "./providers";

export type ModelOpt = { id: string; label: string };
export type EffortOpt = { id: string; label: string; hint: string };
export type PermissionMode = "ask" | "auto" | "plan" | "bypass";
export type PermissionOpt = {
  id: PermissionMode;
  label: string;
  hint: string;
};
export type SlashCmd = {
  cmd: string;
  args?: string;
  hint: string;
  kind: "builtin" | "skill";
};

export const MODELS: Record<BuiltinProviderId, ModelOpt[]> = {
  claude: [
    { id: "opus", label: "Opus" },
    { id: "sonnet", label: "Sonnet" },
    { id: "haiku", label: "Haiku" },
  ],
  codex: [
    { id: "gpt-5.4-codex", label: "GPT-5.4 Codex" },
    { id: "gpt-5.4", label: "GPT-5.4" },
    { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
  ],
  cursor: [
    { id: "Composer 2", label: "Composer 2" },
    { id: "Composer 1.5", label: "Composer 1.5" },
    { id: "Sonnet 4.6", label: "Sonnet 4.6" },
    { id: "Opus 4.6", label: "Opus 4.6" },
    { id: "GPT-5.4", label: "GPT-5.4" },
    { id: "Grok 4", label: "Grok 4" },
  ],
  grok: [
    { id: "grok-4.6", label: "Grok 4.6" },
    { id: "grok-4.5", label: "Grok 4.5" },
  ],
};

/** Effort is provider-specific. Claude uses Extra (= xhigh) and Supercode (= ultracode). */
export const EFFORTS: Record<BuiltinProviderId, EffortOpt[]> = {
  claude: [
    { id: "low", label: "Low", hint: "Fast, light on limits" },
    { id: "medium", label: "Medium", hint: "Everyday coding" },
    { id: "high", label: "High", hint: "Default for Opus" },
    { id: "extra", label: "Extra", hint: "xhigh — long agentic work" },
    { id: "max", label: "Max", hint: "Single-pass maximum" },
    { id: "supercode", label: "Supercode", hint: "ultracode — session-only" },
  ],
  codex: [
    { id: "minimal", label: "Minimal", hint: "CLI: cheapest thinking" },
    { id: "low", label: "Low", hint: "Desktop calls this Light" },
    { id: "medium", label: "Medium", hint: "Recommended default" },
    { id: "high", label: "High", hint: "Harder tasks" },
    { id: "xhigh", label: "Extra high", hint: "Long-horizon work" },
  ],
  cursor: [
    { id: "low", label: "Low", hint: "Quick edits" },
    { id: "medium", label: "Medium", hint: "Default" },
    { id: "high", label: "High", hint: "Deeper reasoning" },
    { id: "xhigh", label: "Extra high", hint: "Hardest Composer turns" },
  ],
  grok: [
    { id: "low", label: "Low", hint: "Quick implementations" },
    { id: "medium", label: "Medium", hint: "Balanced" },
    { id: "high", label: "High", hint: "Default for Grok 4.6" },
    { id: "xhigh", label: "Extra high", hint: "Highest reasoning" },
  ],
};

export const DEFAULT_EFFORT: Record<BuiltinProviderId, string> = {
  claude: "high",
  codex: "medium",
  cursor: "medium",
  grok: "high",
};

export const PERMISSION_MODES: PermissionOpt[] = [
  { id: "ask", label: "Ask", hint: "Approve tools as they run" },
  { id: "auto", label: "Auto", hint: "Accept edits without asking" },
  { id: "plan", label: "Plan", hint: "Read-only until a plan is approved" },
  { id: "bypass", label: "Bypass", hint: "Run tools without asking" },
];

export const DEFAULT_PERMISSION: PermissionMode = "ask";

export function permissionLabel(mode: string): string {
  return PERMISSION_MODES.find((m) => m.id === mode)?.label ?? mode;
}

export function permissionFlag(providerId: string, mode: string): string {
  if (mode === "plan") return "plan";
  if (mode === "bypass") return "bypassPermissions";
  if (mode === "auto") {
    return providerId === "claude" ? "acceptEdits" : "auto";
  }
  return "default";
}

export const SLASH: Record<BuiltinProviderId, SlashCmd[]> = {
  claude: [
    { cmd: "clear", hint: "Start a new conversation", kind: "builtin" },
    { cmd: "compact", args: "[focus]", hint: "Summarize history to free context", kind: "builtin" },
    { cmd: "model", args: "[name]", hint: "Switch model for this session", kind: "builtin" },
    { cmd: "effort", args: "[level]", hint: "Set effort: low … supercode", kind: "builtin" },
    { cmd: "plan", args: "[task]", hint: "Enter plan mode", kind: "builtin" },
    { cmd: "fast", hint: "Toggle fast mode", kind: "builtin" },
    { cmd: "context", hint: "Show context usage", kind: "builtin" },
    { cmd: "cost", hint: "Session usage", kind: "builtin" },
    { cmd: "permissions", hint: "Tool allowlist", kind: "builtin" },
    { cmd: "mcp", hint: "Manage MCP connectors", kind: "builtin" },
    { cmd: "plugin", hint: "Manage plugins", kind: "builtin" },
    { cmd: "skills", hint: "List enabled skills", kind: "builtin" },
    { cmd: "memory", hint: "Edit CLAUDE.md", kind: "builtin" },
    { cmd: "init", hint: "Write CLAUDE.md for this repo", kind: "builtin" },
    { cmd: "diff", hint: "Review working tree", kind: "builtin" },
    { cmd: "code-review", args: "[path]", hint: "Review diff for bugs", kind: "skill" },
    { cmd: "debug", args: "[issue]", hint: "Debug with extra logging", kind: "skill" },
    { cmd: "doctor", hint: "Diagnose Claude Code setup", kind: "skill" },
    { cmd: "batch", args: "[instruction]", hint: "Split work across subagents", kind: "skill" },
    { cmd: "loop", args: "[prompt]", hint: "Repeat until done", kind: "skill" },
    { cmd: "help", hint: "List commands for this provider", kind: "builtin" },
  ],
  codex: [
    { cmd: "clear", hint: "New thread", kind: "builtin" },
    { cmd: "compact", hint: "Compact context", kind: "builtin" },
    { cmd: "model", args: "[name]", hint: "Choose model and reasoning effort", kind: "builtin" },
    { cmd: "fast", hint: "Toggle GPT-5.4 fast tier", kind: "builtin" },
    { cmd: "plan", args: "[task]", hint: "Plan before editing", kind: "builtin" },
    { cmd: "approvals", hint: "What Codex may do unattended", kind: "builtin" },
    { cmd: "status", hint: "Runtime and auth", kind: "builtin" },
    { cmd: "diff", hint: "Show uncommitted changes", kind: "builtin" },
    { cmd: "undo", hint: "Revert last Codex turn", kind: "builtin" },
    { cmd: "review", hint: "Review the current diff", kind: "builtin" },
    { cmd: "mcp", hint: "MCP servers", kind: "builtin" },
    { cmd: "skills", hint: "Enabled skills", kind: "builtin" },
    { cmd: "init", hint: "Write AGENTS.md", kind: "builtin" },
    { cmd: "help", hint: "List Codex commands", kind: "builtin" },
  ],
  cursor: [
    { cmd: "clear", hint: "Reset the agent thread", kind: "builtin" },
    { cmd: "compress", hint: "Compress context", kind: "builtin" },
    { cmd: "model", args: "[name]", hint: "Switch Composer / frontier model", kind: "builtin" },
    { cmd: "plan", args: "[task]", hint: "Read-only plan mode", kind: "builtin" },
    { cmd: "ask", args: "[q]", hint: "Q&A, no edits", kind: "builtin" },
    { cmd: "mode", args: "[agent|plan|ask]", hint: "Set agent mode", kind: "builtin" },
    { cmd: "rules", hint: "Project rules", kind: "builtin" },
    { cmd: "mcp", hint: "MCP connectors", kind: "builtin" },
    { cmd: "skills", hint: "Enabled skills", kind: "builtin" },
    { cmd: "apply", hint: "Apply pending diffs", kind: "builtin" },
    { cmd: "help", hint: "List Cursor commands", kind: "builtin" },
  ],
  grok: [
    { cmd: "clear", hint: "New conversation", kind: "builtin" },
    { cmd: "compact", hint: "Compress conversation history", kind: "builtin" },
    { cmd: "always-approve", hint: "Skip permission prompts", kind: "builtin" },
    { cmd: "context", hint: "Context window usage", kind: "builtin" },
    { cmd: "plugins", hint: "Manage plugins", kind: "builtin" },
    { cmd: "session-info", hint: "Session details", kind: "builtin" },
    { cmd: "feedback", hint: "Send session feedback", kind: "builtin" },
    { cmd: "deep-research", args: "[topic]", hint: "Bounded parallel research", kind: "builtin" },
    { cmd: "workflow", args: "[name]", hint: "Launch or manage a workflow", kind: "builtin" },
    { cmd: "goal", args: "[text]", hint: "Set or check an autonomous goal", kind: "builtin" },
    { cmd: "loop", args: "[prompt]", hint: "Run a prompt on an interval", kind: "builtin" },
    { cmd: "help", hint: "List Grok commands", kind: "builtin" },
  ],
};

const GENERIC_SLASH: SlashCmd[] = [
  { cmd: "clear", hint: "New conversation", kind: "builtin" },
  { cmd: "compact", hint: "Summarize history", kind: "builtin" },
  { cmd: "model", args: "[name]", hint: "Switch model", kind: "builtin" },
  { cmd: "effort", args: "[level]", hint: "low / medium / high", kind: "builtin" },
  { cmd: "skills", hint: "Enabled skills", kind: "builtin" },
  { cmd: "mcp", hint: "Connectors", kind: "builtin" },
  { cmd: "help", hint: "List commands", kind: "builtin" },
];

const BUS_SLASH: SlashCmd[] = [
  { cmd: "agents", hint: "List other sessions on this desk", kind: "builtin" },
  {
    cmd: "msg",
    args: "<session> <text>",
    hint: "Message another WestCode session",
    kind: "builtin",
  },
];

const GENERIC_EFFORT: EffortOpt[] = [
  { id: "low", label: "Low", hint: "Faster" },
  { id: "medium", label: "Medium", hint: "Default" },
  { id: "high", label: "High", hint: "Deeper" },
];

export function isBuiltin(id: string): id is BuiltinProviderId {
  return id === "claude" || id === "codex" || id === "cursor" || id === "grok";
}

export function modelsFor(id: string, extras: string[] = []): ModelOpt[] {
  if (isBuiltin(id)) return MODELS[id];
  return extras.map((m) => ({ id: m, label: m }));
}

export function effortsFor(id: string): EffortOpt[] {
  if (isBuiltin(id)) return EFFORTS[id];
  return GENERIC_EFFORT;
}

export function defaultEffortFor(id: string): string {
  if (isBuiltin(id)) return DEFAULT_EFFORT[id];
  return "medium";
}

export function slashFor(id: string, live?: SlashCmd[]): SlashCmd[] {
  const catalog = isBuiltin(id) ? SLASH[id] : GENERIC_SLASH;
  const base = live && live.length ? live : catalog;
  const seen = new Set(base.map((c) => c.cmd));
  const extra = BUS_SLASH.filter((c) => !seen.has(c.cmd));
  const help = base.filter((c) => c.cmd === "help");
  const rest = base.filter((c) => c.cmd !== "help");
  if (!help.length) {
    return [...rest, ...extra, { cmd: "help", hint: "List commands", kind: "builtin" }];
  }
  return [...rest, ...extra, ...help];
}

export function filterSlash(
  id: string,
  query: string,
  live?: SlashCmd[],
): SlashCmd[] {
  const q = query.replace(/^\//, "").toLowerCase();
  return slashFor(id, live).filter(
    (c) => c.cmd.startsWith(q) || c.hint.toLowerCase().includes(q),
  );
}

export function matchModel(
  id: string,
  query: string,
  extras: string[] = [],
): ModelOpt | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const list = modelsFor(id, extras);
  return (
    list.find((m) => m.id.toLowerCase() === q) ??
    list.find((m) => m.label.toLowerCase() === q) ??
    list.find(
      (m) =>
        m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q),
    )
  );
}

export function matchEffort(
  id: string,
  query: string,
): EffortOpt | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const list = effortsFor(id);
  return (
    list.find((e) => e.id.toLowerCase() === q) ??
    list.find((e) => e.label.toLowerCase() === q) ??
    list.find(
      (e) =>
        e.id.toLowerCase().includes(q) || e.label.toLowerCase().includes(q),
    )
  );
}

export function effortLabel(id: string, effort: string): string {
  return effortsFor(id).find((e) => e.id === effort)?.label ?? effort;
}

export function modelLabel(
  id: string,
  model: string,
  extras: string[] = [],
): string {
  return modelsFor(id, extras).find((m) => m.id === model)?.label ?? model;
}
