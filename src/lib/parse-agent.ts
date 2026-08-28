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

export function lastSnippet(blocks: Block[], max = 140): string {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
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
  return "No output yet";
}

export function extractSendMessages(blocks: Block[]) {
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
  const re =
    /SendMessage\s+(?:to[=:\s"]+)([a-z0-9._-]+)["']?\s*\n+([\s\S]+?)(?=\nSendMessage\s+to|\s*$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(plain))) {
    out.push({ to: m[1]!.trim(), text: m[2]!.trim() });
  }
  return out.filter((s) => s.to && s.text);
}
