/**
 * Usage limits (Claude Desktop: "continue automatically when it resets").
 * Claude's adapter reports the CLI's rate-limit state on usage updates
 * (`_meta["_claude/rateLimit"]`: status, resetsAt in epoch seconds).
 */
export type RateLimit = { status?: string; resetsAt?: number; type?: string };

/** When a rejected limit resets (ms), null when the limit is not hit, undefined when unknown. */
export function limitResetAt(rl: RateLimit | undefined): number | null | undefined {
  if (!rl || !rl.status) return undefined;
  if (rl.status !== "rejected") return null;
  return typeof rl.resetsAt === "number" && rl.resetsAt > 0 ? rl.resetsAt * 1000 : undefined;
}

/** A minute after the reset, so the first request does not race the window. */
export const RESUME_GRACE_MS = 60_000;

export function resumeAt(resetAt: number | undefined, now = Date.now()): number | null {
  if (!resetAt || resetAt + RESUME_GRACE_MS <= now) return null;
  return resetAt + RESUME_GRACE_MS;
}

/** "15:01", or "Tue 15:01" when it is not today. */
export function resumeLabel(at: number, now = Date.now()): string {
  const d = new Date(at);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return new Date(now).toDateString() === d.toDateString() ? time : `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
}

export const CONTINUE_PROMPT = "Your usage limit has reset. Continue where you left off.";
