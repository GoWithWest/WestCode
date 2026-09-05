import type { Block } from "./types";

const TOOL_RE =
  /<tool\s+name="([^"]+)"([^>]*)>([\s\S]*?)<\/tool>/gi;
const THINK_RE = /<think>([\s\S]*?)<\/think>/gi;

function attrs(src: string) {
  const path = /path="([^"]*)"/.exec(src)?.[1];
  const command = /command="([^"]*)"/.exec(src)?.[1];
  const to =
    /(?:\bto|\bsession|\bagent)="([^"]+)"/.exec(src)?.[1] ??
    /(?:\bto|\bsession|\bagent)=([^\s>"']+)/.exec(src)?.[1] ??
    path;
  return { path, command, to };
}

function pushText(blocks: Block[], text: string) {
  const t = text.replace(/\n{3,}/g, "\n\n").trim();
  if (t) blocks.push({ type: "text", text: t });
}

export function parseAgentOutput(raw: string): Block[] {
  const strippedThink: { text: string; thinks: string[] } = {
    text: raw,
    thinks: [],
  };
  strippedThink.text = raw.replace(THINK_RE, (_, body: string) => {
    strippedThink.thinks.push(String(body).trim());
    return "";
  });

  const blocks: Block[] = [];
  for (const t of strippedThink.thinks) {
    if (t) blocks.push({ type: "think", text: t });
  }

  const src = strippedThink.text;
  let last = 0;
  const re = new RegExp(TOOL_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    pushText(blocks, src.slice(last, m.index));
    const a = attrs(m[2] ?? "");
    const name = m[1] ?? "Tool";
    blocks.push({
      type: "tool",
      name,
      path: a.path,
      command: a.command,
      to: /^sendmessage$/i.test(name) ? a.to : undefined,
      content: (m[3] ?? "").trim(),
      status: "done",
    });
    last = m.index + m[0].length;
  }

  const rest = src.slice(last);
  const open = /<tool\s+name="([^"]+)"([^>]*)>([\s\S]*)$/i.exec(rest);
  if (open && !/<\/tool>/i.test(rest)) {
    pushText(blocks, rest.slice(0, open.index));
    const a = attrs(open[2] ?? "");
    const name = open[1] ?? "Tool";
    blocks.push({
      type: "tool",
      name,
      path: a.path,
      command: a.command,
      to: /^sendmessage$/i.test(name) ? a.to : undefined,
      content: (open[3] ?? "").trim(),
      status: "running",
    });
  } else {
    pushText(blocks, rest);
  }

  return blocks.length ? blocks : [{ type: "text", text: raw.trim() }];
}

export function blocksToPlain(blocks: Block[]): string {
  return blocks
    .map((b) => {
      if (b.type === "text") return b.text;
      if (b.type === "think") return b.text;
      if (/^sendmessage$/i.test(b.name)) {
        return `SendMessage → ${b.to ?? ""}\n${b.content}`.trim();
      }
      const target = b.path ?? b.command ?? "";
      return `${b.name} ${target}\n${b.content}`.trim();
    })
    .join("\n\n");
}

/** Trailing text after the last tool/think is the reply; everything before is work. */
export function splitActivity(blocks: Block[]): {
  activity: Block[];
  reply: Block[];
} {
  let cut = -1;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i]?.type !== "text") cut = i;
  }
  if (cut < 0) return { activity: [], reply: blocks };
  return {
    activity: blocks.slice(0, cut + 1),
    reply: blocks.slice(cut + 1),
  };
}

export function activitySummary(blocks: Block[]): string {
  const tools = blocks.filter((b) => b.type === "tool").length;
  const thinking = blocks.some((b) => b.type === "think");
  const parts: string[] = [];
  if (tools) parts.push(tools === 1 ? "1 tool" : `${tools} tools`);
  if (thinking) parts.push("thinking");
  return parts.join(" · ") || "activity";
}

export function lastSnippet(blocks: Block[], max = 140): string {
  const { activity, reply } = splitActivity(blocks);
  const prefer = reply.length ? reply : activity;
  for (const group of [prefer, blocks]) {
    for (let i = group.length - 1; i >= 0; i--) {
      const b = group[i];
      if (!b) continue;
      if (b.type === "text" && b.text.trim()) {
        const t = b.text.replace(/\s+/g, " ").trim();
        return t.length > max ? `${t.slice(0, max)}…` : t;
      }
      if (b.type === "tool") {
        if (/^sendmessage$/i.test(b.name)) {
          return `SendMessage · ${b.to ?? "session"}`;
        }
        const target = b.path ?? b.command ?? b.name;
        return `${b.name} · ${target}`;
      }
    }
  }
  return "No output yet";
}

export function extractSendMessages(blocks: Block[]) {
  // Any tool block whose name mentions westcode_send_message — the raw tool
  // id, an MCP-prefixed id, or a display title built from it — means the
  // message already went out over the MCP desk bus. Re-dispatching from the
  // XML tool blocks or the surrounding narration ("I sent it with
  // westcode_send_message to=grok …") would deliver the same task twice, so
  // this check runs before every extraction path.
  const deliveredViaMcp = blocks.some(
    (b) => b.type === "tool" && /westcode_send_message/i.test(b.name),
  );
  if (deliveredViaMcp) return [];

  const fromTools = blocks
    .filter(
      (b): b is Extract<Block, { type: "tool" }> =>
        b.type === "tool" && /^sendmessage$/i.test(b.name),
    )
    .map((b) => ({
      to: (b.to ?? b.path ?? "").trim(),
      text: b.content.trim(),
    }))
    .filter((s) => s.to && s.text);
  if (fromTools.length) return fromTools;

  const plain = blocksToPlain(blocks);
  const out: { to: string; text: string }[] = [];
  const xml =
    /<tool\s+name="SendMessage"\s+to="([^"]+)">([\s\S]*?)<\/tool>/gi;
  // No /m flag: with it, \s*$ matches at every line end and truncates a
  // multi-line body to its first line. Anchor to line starts by hand instead.
  const fence =
    /(?:^|\n)\s*westcode_send_message\s+(?:to[=:\s]+)([^\s\n]+)[\s\n]+([\s\S]+?)(?=\nwestcode_send_message|\s*$)/gi;
  const legacy =
    /(?:^|\n)\s*SendMessage\s+(?:to[=:\s"]+)([a-z0-9._-]+)["']?\s*\n+([\s\S]+?)(?=\nSendMessage\s+to|\s*$)/gi;
  let m: RegExpExecArray | null;
  for (const re of [xml, fence, legacy]) {
    re.lastIndex = 0;
    while ((m = re.exec(plain))) {
      out.push({ to: m[1]!.trim(), text: m[2]!.trim() });
    }
  }
  return out.filter((s) => s.to && s.text);
}

/** Render a session transcript as Markdown for export. */
export function exportTranscript(session: {
  title: string;
  providerId: string;
  model: string;
  cwd: string;
  createdAt: number;
  messages: {
    role: string;
    createdAt: number;
    blocks: Block[];
    fromTitle?: string;
    streaming?: boolean;
  }[];
}): string {
  const lines = [
    `# ${session.title}`,
    "",
    `Provider: ${session.providerId} · Model: ${session.model} · Folder: ${session.cwd}`,
    `Created: ${new Date(session.createdAt).toISOString()}`,
    "",
  ];
  for (const m of session.messages) {
    if (m.streaming || !m.blocks.length) continue;
    const who =
      m.role === "user"
        ? "User"
        : m.role === "assistant"
          ? "Assistant"
          : m.role === "agent"
            ? `Agent (${m.fromTitle ?? "peer"})`
            : "System";
    lines.push(`## ${who} — ${new Date(m.createdAt).toLocaleString()}`, "");
    if (m.role === "assistant") {
      const { activity, reply } = splitActivity(m.blocks);
      if (activity.length) {
        lines.push(
          "<details>",
          `<summary>${activitySummary(activity)}</summary>`,
          "",
        );
        writeBlocks(lines, activity);
        lines.push("</details>", "");
      }
      writeBlocks(lines, reply);
    } else {
      writeBlocks(lines, m.blocks);
    }
  }
  return lines.join("\n");
}

function writeBlocks(lines: string[], blocks: Block[]) {
  for (const b of blocks) {
    if (b.type === "text") lines.push(b.text, "");
    else if (b.type === "think") {
      lines.push(`> _${b.text.replaceAll("\n", " ")}_`, "");
    } else if (b.type === "tool") {
      lines.push(
        `**${b.name}**${b.path ? ` · ${b.path}` : ""}${b.command ? ` · \`${b.command}\`` : ""}`,
        "",
      );
      if (b.content) {
        // A fence longer than any run of backticks in the payload keeps
        // tool output that itself contains ``` from breaking the document.
        const runs = b.content.match(/`+/g) ?? [];
        const fence = "`".repeat(Math.max(3, ...runs.map((r) => r.length + 1)));
        lines.push(fence, b.content, fence, "");
      }
    }
  }
}
