/**
 * Bot looks: each agent persona is a small glossy character — one saturated
 * colour, a soft 3D body, two black oval eyes, an optional black accessory —
 * that moves with what its session is doing. (The style follows ChatGPT's
 * dots and Grok Bot teammates; the shapes and motion here are our own.)
 */
import type { Session } from "./types";

export const DOT_SHAPES = ["sphere", "squircle", "heart", "gumdrop", "cloud", "flower", "blob"] as const;
export type DotShape = (typeof DOT_SHAPES)[number];

export const DOT_ACCESSORIES = [
  "none",
  "glasses",
  "sunglasses",
  "beret",
  "bowtie",
  "headphones",
  "monocle",
  "cap",
] as const;
export type DotAccessory = (typeof DOT_ACCESSORIES)[number];

export const DOT_COLORS = [
  "#3A8BFF",
  "#A8E03A",
  "#FFC21A",
  "#FF6F8E",
  "#E14FD6",
  "#FF6A4A",
  "#2EC4B6",
  "#8B7CFF",
  "#F2F2F2",
] as const;

export type DotLook = {
  shape: DotShape;
  color: string;
  accessory: DotAccessory;
};

export type DotState =
  | "idle"
  | "thinking"
  | "working"
  | "speaking"
  | "needs-input"
  | "done"
  | "error"
  | "paused";

/** Looks for the preset personas, keyed by agent id. */
export const PRESET_LOOKS: Record<string, DotLook> = {
  "planner-architect": { shape: "gumdrop", color: "#FFC21A", accessory: "glasses" },
  "implementer-builder": { shape: "blob", color: "#A8E03A", accessory: "cap" },
  "bulk-worker": { shape: "flower", color: "#FF6A4A", accessory: "headphones" },
  "reviewer-qa": { shape: "heart", color: "#E14FD6", accessory: "monocle" },
  "researcher-docs": { shape: "cloud", color: "#3A8BFF", accessory: "beret" },
  "orchestrator-router": { shape: "sphere", color: "#FF6F8E", accessory: "headphones" },
  "maker-westcreate": { shape: "squircle", color: "#2EC4B6", accessory: "bowtie" },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A stable look for any agent: its own, its preset's, or one from its id. */
export function lookFor(agent: { id: string; look?: Partial<DotLook> }): DotLook {
  const base = PRESET_LOOKS[agent.id];
  const h = hash(agent.id);
  const fallback: DotLook = {
    shape: DOT_SHAPES[h % DOT_SHAPES.length]!,
    color: DOT_COLORS[(h >>> 3) % (DOT_COLORS.length - 1)]!,
    accessory: DOT_ACCESSORIES[(h >>> 7) % DOT_ACCESSORIES.length]!,
  };
  return { ...fallback, ...base, ...(agent.look ?? {}) } as DotLook;
}

/** Text colour that reads on the dot's colour (for its name pill / bubbles). */
export function inkFor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#111111";
  const n = parseInt(m[1]!, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return lum > 0.4 ? "#111111" : "#ffffff";
}

/** What the character is doing, from the session it runs in. */
export function dotStateFor(session: Session | undefined, now = Date.now()): DotState {
  if (!session) return "idle";
  if (session.permission) return "needs-input";
  if (session.status === "error") return "error";
  if (session.status === "running") {
    const last = session.messages[session.messages.length - 1];
    const block = last?.role === "assistant" ? last.blocks[last.blocks.length - 1] : undefined;
    if (!block || block.type === "think") return "thinking";
    if (block.type === "text") return "speaking";
    return "working";
  }
  if (session.status === "waiting" && now - session.updatedAt < 4000) return "done";
  return "idle";
}

/** One line on what a bot is up to — the subtitle under its name. */
export function dotActivity(session: Session | undefined): string {
  if (!session) return "No session yet";
  if (session.permission) return `Needs your OK: ${session.permission.tool.replace(/`/g, "")}`;
  if (session.status === "error") return "Hit an error";
  const current = session.plan?.find((p) => p.status === "in_progress");
  if (session.status === "running") return current?.content ?? "Working";
  if (session.plan?.length && session.plan.every((p) => p.status === "completed")) return "All tasks done";
  return session.title;
}
