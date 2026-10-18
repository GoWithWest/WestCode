import type { Block, ToolBlock } from "./types";

const VERBS: Record<string, [string, string]> = {
  read: ["Read", "files"],
  edit: ["Edited", "files"],
  delete: ["Deleted", "files"],
  move: ["Moved", "files"],
  search: ["Searched", "times"],
  execute: ["Ran", "commands"],
  fetch: ["Fetched", "pages"],
};

/** "Read 3 files, edited 1, ran 2 commands" — the collapsed group's line. */
export function activityLine(blocks: Block[]): string {
  const counts = new Map<string, number>();
  let other = 0;
  for (const b of blocks) {
    if (b.type !== "tool") continue;
    const k = toolKindOf(b);
    if (VERBS[k]) counts.set(k, (counts.get(k) ?? 0) + 1);
    else other++;
  }
  const parts = [...counts.entries()].map(([k, n], i) => {
    const [verb, noun] = VERBS[k]!;
    const v = i === 0 ? verb : verb.toLowerCase();
    if (k === "search") return `${v} ${n === 1 ? "once" : `${n} times`}`;
    const unit = n === 1 ? noun.replace(/s$/, "").replace(/^time$/, "time") : noun;
    return `${v} ${n} ${unit}`;
  });
  if (other) parts.push(`${parts.length ? "used" : "Used"} ${other} ${other === 1 ? "tool" : "tools"}`);
  const thoughtMs = blocks.reduce((t, b) => t + (b.type === "think" ? (b.ms ?? 0) : 0), 0);
  if (!parts.length) {
    return thoughtMs ? `Thought for ${formatSeconds(thoughtMs)}` : "Thought";
  }
  return parts.join(", ");
}

export function formatSeconds(ms: number) {
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function toolKindOf(t: ToolBlock): string {
  if (t.toolKind && t.toolKind !== "other") return t.toolKind;
  const n = `${t.name} ${t.title ?? ""}`.toLowerCase();
  if (/send_?message|sendmessage/.test(n)) return "send";
  if (/^(bash|terminal|shell|run|exec)|execute|command/.test(n)) return "execute";
  if (/edit|write|patch|replace|create/.test(n)) return "edit";
  if (/read|view|cat\b/.test(n)) return "read";
  if (/grep|glob|search|find|list/.test(n)) return "search";
  if (/fetch|web|http|browse/.test(n)) return "fetch";
  if (/delete|remove|rm\b/.test(n)) return "delete";
  if (/todo|plan|think/.test(n)) return "think";
  return "other";
}

export function liveLabel(blocks: Block[]): string {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i]!;
    if (b.type === "tool" && b.status === "running") return toolLabel(b);
    if (b.type === "think" && b.ms == null) return "Thinking";
  }
  return "Working";
}

export function toolLabel(t: ToolBlock): string {
  if (t.title && t.title !== t.name) return t.title.replace(/`/g, "");
  if (t.command) return t.command;
  const target = t.to ?? t.path?.split("/").pop();
  return target ? `${t.name} ${target}` : t.name;
}

