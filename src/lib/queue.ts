/**
 * Reordering queued messages: the queue (what the agent reads next) and the
 * queued bubbles in the transcript move together, so what is shown is the
 * order they will be sent in.
 */
export function moveQueued<Q extends { msgId?: string }, M extends { id: string }>(
  queued: Q[],
  messages: M[],
  msgId: string,
  dir: -1 | 1,
): { queued: Q[]; messages: M[] } | null {
  const i = queued.findIndex((q) => q.msgId === msgId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= queued.length) return null;
  const q = [...queued];
  [q[i], q[j]] = [q[j]!, q[i]!];
  const a = messages.findIndex((m) => m.id === queued[i]!.msgId);
  const b = messages.findIndex((m) => m.id === queued[j]!.msgId);
  const m = [...messages];
  if (a >= 0 && b >= 0) [m[a], m[b]] = [m[b]!, m[a]!];
  return { queued: q, messages: m };
}
