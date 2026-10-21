import { useCallback, useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CheckCircle2, CircleDot, ExternalLink, GitPullRequest, Loader2, XCircle } from "lucide-react";
import { westcode, type PrStatus } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import type { Session } from "@/lib/types";

/**
 * The branch's pull request (Claude Desktop's Changes card): CI checks,
 * review state, Fix failing checks (asks this session's agent), Merge when
 * ready (GitHub auto-merge), or Create PR when there is none yet.
 */
export function PrChip({ session }: { session: Session }) {
  const api = westcode()?.pr;
  const send = useHelix((s) => s.send);
  const [st, setSt] = useState<PrStatus | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      setSt(await api.status(session.cwd));
    } catch {
      /* keep last */
    }
  }, [api, session.cwd]);

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(t);
  }, [refresh]);
  // A finished turn may have pushed or opened a PR.
  useEffect(() => {
    if (session.status === "idle" || session.status === "waiting") void refresh();
  }, [session.status, refresh]);

  // Claude Desktop's "Auto-archive after PR merge or close".
  const autoArchive = useHelix((s) => s.settings.autoArchivePr ?? false);
  const prState = st?.pr?.state;
  useEffect(() => {
    if (!autoArchive || !prState || prState === "OPEN" || session.archivedAt) return;
    useHelix.getState().archiveSession(session.id, true);
  }, [autoArchive, prState, session.id, session.archivedAt]);

  if (!api || !st || st.missing || st.noRemote) return null;
  if (!st.ok) return null;
  const pr = st.pr;

  const act = async (what: string, fn: () => Promise<{ ok: boolean; error?: string; url?: string }>) => {
    setBusy(what);
    setNote("");
    try {
      const r = await fn();
      setNote(r.ok ? (r.url ? `Opened ${r.url}` : "Done.") : (r.error ?? "Failed."));
      await refresh();
    } finally {
      setBusy("");
    }
  };

  if (!pr) {
    return (
      <Popover.Root>
        <Popover.Trigger asChild>
          <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" title="No pull request for this branch">
            <GitPullRequest className="size-3" />
            PR
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content sideOffset={6} className="z-50 w-64 rounded-lg border border-border bg-window p-3 text-xs shadow-window">
            <p className="text-muted-foreground">No pull request for this branch yet.</p>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void act("create", () => api.create(session.cwd))}
              className="mt-2 w-full rounded-md border border-border px-2 py-1.5 hover:bg-muted disabled:opacity-60"
            >
              {busy === "create" ? "Pushing and creating…" : "Create PR (push, fill from commits)"}
            </button>
            {note ? <p className="mt-2 text-2xs text-muted-foreground">{note}</p> : null}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  const c = pr.checks;
  const icon =
    pr.state !== "OPEN" ? (
      <GitPullRequest className="size-3" />
    ) : c.failed ? (
      <XCircle className="size-3 text-destructive" />
    ) : c.pending ? (
      <Loader2 className="size-3 animate-spin" />
    ) : c.total ? (
      <CheckCircle2 className="size-3 text-accent" />
    ) : (
      <CircleDot className="size-3" />
    );

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-px text-foreground hover:bg-muted"
          title={`PR #${pr.number}: ${pr.title}`}
        >
          {icon}
          #{pr.number}
          {pr.state !== "OPEN" ? ` · ${pr.state.toLowerCase()}` : c.total ? ` · ${c.passed}/${c.total}` : ""}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} className="z-50 w-80 rounded-lg border border-border bg-window p-3 text-xs shadow-window">
          <p className="font-medium">
            #{pr.number} {pr.title}
          </p>
          <p className="mt-0.5 text-2xs text-muted-foreground">
            {pr.head} → {pr.base} · {pr.state.toLowerCase()}
            {pr.draft ? " · draft" : ""}
            {pr.review ? ` · review: ${pr.review.toLowerCase().replace(/_/g, " ")}` : ""}
            {pr.autoMerge ? " · merges when ready" : ""}
          </p>
          <p className="mt-2 text-2xs">
            Checks: {c.passed} passed · {c.failed} failed · {c.pending} running
          </p>
          {c.failing.length ? (
            <ul className="mt-1 space-y-0.5 text-2xs text-destructive">
              {c.failing.map((f) => (
                <li key={f.name}>✕ {f.name}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 grid gap-1.5">
            <button
              type="button"
              onClick={() => window.open(pr.url, "_blank")}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 hover:bg-muted"
            >
              <ExternalLink className="size-3" /> Open on GitHub
            </button>
            {c.failed && pr.state === "OPEN" ? (
              <button
                type="button"
                disabled={session.status === "running"}
                onClick={() =>
                  void send(
                    session.id,
                    `CI is failing on PR #${pr.number} (${pr.url}): ${c.failing.map((f) => f.name).join(", ")}. Look at the failing checks (gh pr checks ${pr.number}, gh run view --log-failed), fix the cause, commit and push.`,
                  )
                }
                className="rounded-md border border-border px-2 py-1.5 hover:bg-muted disabled:opacity-60"
              >
                Fix failing checks (asks this agent)
              </button>
            ) : null}
            {pr.state === "OPEN" && !pr.autoMerge ? (
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => {
                  if (window.confirm(`Turn on auto-merge for PR #${pr.number}? GitHub squash-merges it once checks and reviews pass.`)) {
                    void act("merge", () => api.mergeWhenReady(session.cwd));
                  }
                }}
                className="rounded-md border border-border px-2 py-1.5 hover:bg-muted disabled:opacity-60"
              >
                {busy === "merge" ? "Turning on…" : "Merge when ready"}
              </button>
            ) : null}
          </div>
          {note ? <p className="mt-2 text-2xs text-muted-foreground">{note}</p> : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
