/**
 * Saved session setups (Claude Desktop's saved environments): where a session
 * runs and how — provider, machine, folder, worktree, model, effort — picked
 * with one click in the New session dialog.
 */
export type SessionPreset = {
  id: string;
  name: string;
  providerId: string;
  hostId?: string;
  cwd: string;
  worktree?: boolean;
  model?: string;
  effort?: string;
};

/** "Claude · wc-verify" / "Grok · app on nas" — the chip's default label. */
export function presetName(p: Omit<SessionPreset, "id" | "name">, providerName: string, hostName?: string): string {
  const folder = p.cwd.split("/").filter(Boolean).pop() || p.cwd || "folder";
  return `${providerName} · ${folder}${hostName ? ` on ${hostName}` : ""}${p.worktree ? " (worktree)" : ""}`;
}

/** Add or replace (same provider, host, folder and worktree) and keep the 8 most recent. */
export function upsertPreset(list: SessionPreset[], next: SessionPreset): SessionPreset[] {
  const same = (a: SessionPreset) =>
    a.providerId === next.providerId &&
    (a.hostId || "") === (next.hostId || "") &&
    a.cwd === next.cwd &&
    Boolean(a.worktree) === Boolean(next.worktree);
  return [next, ...list.filter((p) => !same(p) && p.id !== next.id)].slice(0, 8);
}
