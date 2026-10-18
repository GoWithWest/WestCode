import type { Session } from "../../src/lib/types";

export function deskWith(sessions: Partial<Session>[], extra: Record<string, unknown> = {}) {
  const now = Date.now();
  const full = sessions.map((s, i) => ({
    id: `ses-${i + 1}`,
    title: `Session ${i + 1}`,
    providerId: "claude",
    projectId: "scratch",
    cwd: "/work",
    model: "opus",
    effort: "high",
    permissionMode: "ask",
    status: "idle",
    createdAt: now,
    updatedAt: now,
    messages: [],
    turns: 0,
    ...s,
  }));
  return {
    "helix-desk-v1": { sessions: full, activeId: full[0]?.id ?? null, splitIds: null, view: "focus" },
    ...extra,
  };
}
