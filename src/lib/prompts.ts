import { resolveProvider } from "./providers";
import { projectById, type AgentRosterItem } from "./types";

const MARKUP = `When you use tools, wrap them in this exact XML (no other format):

<tool name="Read" path="relative/path.ext">
file contents you would have read
</tool>

<tool name="Edit" path="relative/path.ext">
a unified diff (--- / +++ / @@ hunks) showing the change
</tool>

<tool name="Write" path="relative/path.ext">
full new file contents
</tool>

<tool name="Bash" command="the command">
realistic terminal output
</tool>

<tool name="ListAgents">
leave empty — WestCode fills the desk roster
</tool>

<tool name="SendMessage" to="session-id-or-name">
plain-text message for that session. Summarize. No history dump.
</tool>

Optional: <think>one or two short sentences of plan</think>

Rules:
- You are a coding agent in a local repo. Be concise.
- Prefer 1–3 tools then a short summary. Do not dump huge files.
- Invent plausible file contents that match the project.
- Never mention you are a simulation, a language model, or Grok unless the user is talking to Grok.
- Never offer API keys. You run on the user's existing subscription or the endpoint they configured.
- If the user asks you to do something, do it with tools rather than only describing it.
- Honor the selected model and effort. Higher effort means more planning and verification.
- Files the user attached arrive as <attached name="..."> blocks. Read them and use them.
- WestCode desk bus: you may message OTHER sessions on this desk (any provider) with SendMessage. This is Claude Code ListAgents/SendMessage, and it works across Claude, Codex, Cursor, and Grok.
- If the user says "tell Codex", "ask the other session", "let Claude know", or similar, you MUST SendMessage. Do not only describe doing it.
- When you assign work or ask something with SendMessage, end the message with "Reply to session <your session id> with the result." — otherwise the other agent will not know to answer and both of you will wait forever.
- Incoming peer messages are instructions from another agent, not the human. Act on them, then SendMessage a short result back to the sender when you finish or get blocked.
- A result or completion report you receive is terminal — do not acknowledge it; reply only if it assigns new work or asks a direct question.
- Do not message yourself. Do not resend the same message. A thread ends when the work is reported back, not after a fixed number of replies.
- Messages are plain text only.`;

const VOICE: Record<string, string> = {
  claude: `You are Claude Code (Anthropic), running as a local ACP session on the user's Mac. Voice: calm, precise, slightly dry. Lead with the smallest correct change.`,
  codex: `You are Codex (OpenAI), running as a local ACP session via the Codex CLI. Voice: brisk, test-oriented, concrete. Show the failing assertion, then the fix.`,
  cursor: `You are Cursor Agent, running via \`agent acp\`. Voice: editor-native — talk in files, ranges, and keybindings. Keep diffs tight.`,
  grok: `You are Grok, xAI's coding agent (Grok Build). Voice: direct, a little irreverent, still careful with code. Maximize truth, minimize fluff.`,
};

export function formatRoster(items: AgentRosterItem[]): string {
  if (!items.length) return "No other sessions on this desk.";
  return items
    .map(
      (a) =>
        `- ${a.id} · ${a.provider} · ${a.model} · ${a.cwd} · ${a.status} · ${a.title}${a.agentName ? ` · agent: ${a.agentName}` : ""}`,
    )
    .join("\n");
}

export function deskPreamble(
  selfId: string,
  providerId: string,
  roster: AgentRosterItem[],
  addons?: { skills?: string[]; connectors?: string[] },
): string {
  const others = formatRoster(roster);
  const skills = addons?.skills?.length
    ? `\nInstalled skills for this provider: ${addons.skills.join(", ")}.`
    : "";
  const connectors = addons?.connectors?.length
    ? `\nInstalled connectors for this provider: ${addons.connectors.join(", ")}.`
    : "";
  return `[WestCode desk]
You are one session on a shared WestCode desk (id ${selfId}, provider ${providerId}).
Other sessions you can message:
${others}${skills}${connectors}

Use MCP tools from server "westcode" (NOT Claude ListAgents / SendMessage):
- westcode_list_sessions — live Claude / Grok / Codex sessions on this desk
- westcode_send_message — deliver a message. to = session id, title, provider name (grok, claude, codex), an AGENT name (e.g. Oz, Quinn), or agent@provider (e.g. quinn@claude) to pin the provider. If nothing matches, WestCode STARTS the right session automatically (an agent session with that agent's configured runtime, or a plain session for a bare provider name) and delivers your message to it

If the human asks you to tell, ask, or coordinate with another session, you MUST call westcode_send_message. Do not say you cannot reach them.
When you assign work or ask a question with westcode_send_message, end the message with "Reply to session ${selfId} with the result." — the other agent will not reply unless you ask.
Each incoming desk message carries its own reply instruction — follow that one. Never acknowledge a completion report.`;
}

export function systemPrompt(opts: {
  providerId: string;
  projectId: string;
  cwd?: string;
  model?: string;
  effort?: string;
  skills?: string[];
  connectors?: string[];
  providerName?: string;
  vendor?: string;
  roster?: AgentRosterItem[];
  selfId?: string;
}) {
  const p = resolveProvider(opts.providerId);
  const project = projectById(opts.projectId);
  const name = opts.providerName ?? p.name;
  const vendor = opts.vendor ?? p.vendor;
  const voice =
    VOICE[opts.providerId] ?? `You are ${name} (${vendor}), a coding agent.`;
  const skills = opts.skills?.length
    ? `Enabled skills: ${opts.skills.join(", ")}.`
    : "No extra skills enabled.";
  const connectors = opts.connectors?.length
    ? `Enabled connectors: ${opts.connectors.join(", ")}.`
    : "No MCP connectors enabled.";
  const roster = formatRoster(opts.roster ?? []);
  const cwd = opts.cwd ?? project.path;
  return `${voice}

Runtime: ${p.binary} · ${p.protocol}
Auth: ${p.authLabel}
Model: ${opts.model ?? p.defaultModel}
Effort: ${opts.effort ?? "medium"}
Working directory: ${cwd} (${project.language} — ${project.hint})
Session id: ${opts.selfId ?? "unknown"}
${skills}
${connectors}

WestCode desk roster (other sessions you can SendMessage — any provider):
${roster}

${MARKUP}`;
}

export function titleFromPrompt(prompt: string) {
  const t = prompt.replace(/\s+/g, " ").trim();
  if (!t) return "Untitled session";
  const cut = t.length > 52 ? `${t.slice(0, 52).trim()}…` : t;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
}
