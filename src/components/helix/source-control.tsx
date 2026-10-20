import { useCallback, useEffect, useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  CircleDashed,
  GitBranch,
  GitCommitHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { parsePatch } from "@/lib/diff";
import { westcode, type GitChanges, type GitCommit, type GitFile } from "@/lib/desktop";
import { cn, relativeTime } from "@/lib/utils";
import { useHelix } from "@/lib/store";
import { gitCwdOf, type Session } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DiffRows } from "./blocks";

const KIND_BADGE: Record<GitFile["kind"], { letter: string; cls: string; label: string }> = {
  modified: { letter: "M", cls: "text-warn", label: "Modified" },
  new: { letter: "A", cls: "text-success", label: "Added" },
  untracked: { letter: "U", cls: "text-success", label: "New file" },
  deleted: { letter: "D", cls: "text-danger", label: "Deleted" },
  renamed: { letter: "R", cls: "text-accent", label: "Renamed" },
  copied: { letter: "C", cls: "text-accent", label: "Copied" },
  conflicted: { letter: "!", cls: "text-danger", label: "Conflicted" },
};

/**
 * GitHub Desktop inside the session: the working tree of the session's
 * folder — pick files, read their diff, commit, switch branches, sync, and
 * browse history. Everything runs git in the main process (desktop/git.mjs).
 */
export function SourceControlPanel({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const api = westcode()?.git;
  // The session's folder, or a repository inside it the user picked.
  const cwd = gitCwdOf(session);
  const pickRepo = (path: string | undefined) =>
    useHelix.setState((st) => ({
      sessions: st.sessions.map((x) => (x.id === session.id ? { ...x, scmRepo: path } : x)),
    }));
  const [state, setState] = useState<GitChanges | null>(null);
  const [tab, setTab] = useState<"changes" | "history">("changes");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [patch, setPatch] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCommit, setLastCommit] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ title: string; percent: number } | null>(null);

  const refresh = useCallback(async () => {
    if (!api) return;
    const next = await api.changes(cwd);
    setState(next);
  }, [api, cwd]);

  // Refresh when opened, when the agent finishes a turn, on focus, and on a
  // slow timer while the panel is open.
  useEffect(() => {
    void refresh();
  }, [refresh, session.status]);
  useEffect(() => {
    const t = window.setInterval(() => void refresh(), 10_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  useEffect(() => api?.onProgress((p) => p.cwd === cwd && setProgress(p)), [api, cwd]);

  const files = useMemo(() => state?.files ?? [], [state]);
  const included = files.filter((f) => !excluded.has(f.path));
  const selectedFile = files.find((f) => f.path === selected) ?? null;

  useEffect(() => {
    if (!api || !selectedFile) {
      setPatch(null);
      return;
    }
    let dead = false;
    void api.diff(cwd, selectedFile).then((d) => {
      if (dead) return;
      setPatch(d.binary ? "__binary__" : d.tooLarge ? "__large__" : (d.patch ?? ""));
    });
    return () => {
      dead = true;
    };
  }, [api, cwd, selectedFile]);

  async function run(label: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(label);
    setError(null);
    try {
      const r = await fn();
      if (!r.ok) setError(r.error || `${label} failed`);
      return r;
    } finally {
      setBusy(null);
      setProgress(null);
      void refresh();
    }
  }

  if (!api) {
    return (
      <PanelShell onClose={onClose} title="Source control">
        <p className="p-4 text-xs text-muted-foreground">
          Source control needs the WestCode desktop app.
        </p>
      </PanelShell>
    );
  }
  if (state && !state.repo) {
    return (
      <PanelShell onClose={onClose} title="Source control">
        <RepoPicker
          folder={session.cwd}
          onPick={(p) => {
            setState(null);
            pickRepo(p);
          }}
          onInit={async () => {
            const r = await api.init?.(session.cwd);
            if (r && !r.ok) setError(r.error ?? "git init failed");
            pickRepo(undefined);
            void refresh();
          }}
        />
        {error ? <p className="px-4 text-2xs text-danger">{error}</p> : null}
      </PanelShell>
    );
  }

  const sync = state?.sync;
  const canCommit = Boolean(summary.trim()) && included.length > 0 && !busy;

  return (
    <PanelShell onClose={onClose} title="Source control">
      {session.scmRepo && session.scmRepo !== session.cwd ? (
        <button
          type="button"
          onClick={() => {
            setState(null);
            pickRepo(undefined);
          }}
          className="flex w-full items-center gap-1.5 border-b border-border px-3 py-1.5 text-left text-2xs text-muted-foreground hover:text-foreground"
        >
          ← Repositories in {session.cwd.split("/").filter(Boolean).pop()} ·{" "}
          <span className="truncate font-medium text-foreground">{session.scmRepo.split("/").pop()}</span>
        </button>
      ) : null}
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <BranchPicker cwd={cwd} current={state?.branch ?? null} onChanged={refresh} />
        {sync && sync.action !== "none" ? (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            disabled={Boolean(busy) || sync.disabled}
            title={sync.label}
            onClick={() => void run(sync.label, () => api.sync(cwd, sync.action))}
          >
            {busy === sync.label ? (
              <CircleDashed className="size-3.5 animate-spin" />
            ) : sync.action === "push" || sync.action === "publish-branch" ? (
              <Upload className="size-3.5" />
            ) : sync.action === "pull" ? (
              <ArrowDown className="size-3.5" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {busy === sync.label && progress
              ? `${progress.title} ${progress.percent}%`
              : sync.label}
            {sync.behind ? (
              <span className="inline-flex items-center text-2xs tabular-nums">
                <ArrowDown className="size-3" />
                {sync.behind}
              </span>
            ) : null}
            {sync.ahead ? (
              <span className="inline-flex items-center text-2xs tabular-nums">
                <ArrowUp className="size-3" />
                {sync.ahead}
              </span>
            ) : null}
          </Button>
        ) : null}
      </div>

      {state?.operation ? (
        <div className="border-b border-border bg-warn/10 px-3 py-2 text-2xs text-warn">
          A {state.operation} is in progress. Resolve the conflicted files, then ask the agent to
          continue it.
        </div>
      ) : null}

      <div className="flex border-b border-border px-2" role="tablist">
        {(["changes", "history"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-2.5 py-2 text-xs font-medium",
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "changes" ? `Changes${files.length ? ` ${files.length}` : ""}` : "History"}
          </button>
        ))}
      </div>

      {error ? (
        <div className="flex items-start gap-2 border-b border-border bg-danger/10 px-3 py-2 text-2xs text-danger">
          <pre className="min-w-0 flex-1 whitespace-pre-wrap font-sans">{error}</pre>
          <button type="button" aria-label="Dismiss" onClick={() => setError(null)}>
            <X className="size-3" />
          </button>
        </div>
      ) : null}

      {tab === "changes" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {files.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
              <Check className="size-5 text-success" />
              <p className="text-sm font-medium">No local changes</p>
              <p className="text-xs text-muted-foreground">
                {sync?.action === "push"
                  ? `${sync.ahead} commit${sync.ahead === 1 ? "" : "s"} to push.`
                  : "The working tree matches the last commit."}
              </p>
              {lastCommit ? <UndoStrip sha={lastCommit} onUndo={undo} /> : null}
            </div>
          ) : (
            <>
              <label className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-2xs text-muted-foreground">
                <input
                  type="checkbox"
                  aria-label="Include all files"
                  checked={excluded.size === 0}
                  ref={(el) => {
                    if (el) el.indeterminate = excluded.size > 0 && included.length > 0;
                  }}
                  onChange={(e) =>
                    setExcluded(e.target.checked ? new Set() : new Set(files.map((f) => f.path)))
                  }
                  className="size-3.5 accent-[var(--color-accent)]"
                />
                {included.length} of {files.length} files selected
              </label>
              <ul
                className="scrollbar-thin max-h-[38%] shrink-0 overflow-y-auto border-b border-border py-1"
                aria-label="Changed files"
              >
                {files.map((f) => {
                  const badge = KIND_BADGE[f.kind];
                  const dir = f.path.includes("/")
                    ? f.path.slice(0, f.path.lastIndexOf("/") + 1)
                    : "";
                  const base = f.path.slice(dir.length);
                  return (
                    <li
                      key={f.path}
                      className={cn(
                        "group/file flex items-center gap-2 px-3 py-1 text-xs",
                        selected === f.path ? "bg-muted" : "hover:bg-muted/50",
                      )}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Include ${f.path}`}
                        checked={!excluded.has(f.path)}
                        onChange={(e) =>
                          setExcluded((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.delete(f.path);
                            else next.add(f.path);
                            return next;
                          })
                        }
                        className="size-3.5 shrink-0 accent-[var(--color-accent)]"
                      />
                      <button
                        type="button"
                        onClick={() => setSelected(f.path)}
                        className="flex min-w-0 flex-1 items-center gap-1 text-left"
                        title={f.oldPath ? `${f.oldPath} → ${f.path}` : f.path}
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-subtle">{dir}</span>
                          <span className="font-medium">{base}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Discard changes to ${f.path}`}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Discard your changes to ${f.path}? New files go to the Trash.`,
                            )
                          ) {
                            void run("Discard", () => api.discard(cwd, [f]));
                          }
                        }}
                        className="text-subtle opacity-0 group-hover/file:opacity-100 hover:text-danger focus-visible:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                      <span
                        className={cn(
                          "w-3 shrink-0 text-center font-mono text-2xs font-semibold",
                          badge.cls,
                        )}
                        title={badge.label}
                      >
                        {badge.letter}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex min-h-0 flex-1 flex-col p-2">
                {selectedFile ? (
                  <PatchPane patch={patch} path={selectedFile.path} sessionId={session.id} />
                ) : (
                  <p className="m-auto text-xs text-subtle">Select a file to see its diff.</p>
                )}
              </div>
              <form
                className="border-t border-border p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!canCommit) return;
                  void run("Commit", async () => {
                    const r = await api.commit(cwd, {
                      paths: included.map((f) => f.path),
                      oldPaths: included.flatMap((f) => (f.oldPath ? [f.oldPath] : [])),
                      summary,
                      description,
                    });
                    if (r.ok) {
                      setSummary("");
                      setDescription("");
                      setExcluded(new Set());
                      setSelected(null);
                      setLastCommit(r.sha ?? "");
                    }
                    return r;
                  });
                }}
              >
                <input
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Summary (required)"
                  aria-label="Commit summary"
                  className="h-8 w-full rounded-md border border-border bg-window px-2.5 text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
                />
                {summary.length > 72 ? (
                  <p className="mt-1 text-2xs text-warn">
                    Summaries read best under 72 characters.
                  </p>
                ) : null}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  aria-label="Commit description"
                  rows={2}
                  className="mt-1.5 w-full resize-none rounded-md border border-border bg-window px-2.5 py-1.5 text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
                />
                <Button type="submit" size="sm" className="mt-1.5 w-full" disabled={!canCommit}>
                  {busy === "Commit" ? (
                    <CircleDashed className="size-3.5 animate-spin" />
                  ) : (
                    <GitCommitHorizontal className="size-3.5" />
                  )}
                  Commit {included.length} file{included.length === 1 ? "" : "s"} to{" "}
                  <span className="font-semibold">{state?.branch ?? "HEAD"}</span>
                </Button>
                {lastCommit ? <UndoStrip sha={lastCommit} onUndo={undo} /> : null}
              </form>
            </>
          )}
        </div>
      ) : (
        <HistoryTab cwd={cwd} refreshKey={`${state?.oid ?? ""}`} />
      )}
    </PanelShell>
  );

  function undo() {
    void run("Undo", async () => {
      const r = await api!.undo(cwd);
      if (r.ok) {
        setSummary(r.summary ?? "");
        setDescription(r.description ?? "");
        setLastCommit(null);
      }
      return r;
    });
  }
}

/** The folder is not a repository: list the ones inside it, or start one. */
function RepoPicker({
  folder,
  onPick,
  onInit,
}: {
  folder: string;
  onPick: (path: string) => void;
  onInit: () => void;
}) {
  const api = westcode()?.git;
  const [repos, setRepos] = useState<{ path: string; name: string }[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    void api?.findRepos?.(folder).then((r) => setRepos(r.repos ?? []));
  }, [api, folder]);
  const shown = (repos ?? []).filter((r) => !q.trim() || r.path.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-3 py-3">
        <p className="text-xs font-medium">This folder is not a git repository</p>
        <p className="mt-0.5 text-2xs text-muted-foreground">
          {repos === null
            ? "Looking for repositories inside it…"
            : repos.length
              ? `Pick one of the ${repos.length} repositories inside ${folder.split("/").filter(Boolean).pop()}, or start one here.`
              : "No repositories inside it. Start one here to track changes."}
        </p>
        <div className="mt-2 flex gap-1.5">
          {repos && repos.length > 6 ? (
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter repositories"
              className="h-7 min-w-0 flex-1 rounded-md border border-border bg-window px-2 text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
            />
          ) : null}
          <Button size="sm" variant="outline" onClick={onInit}>
            <Plus className="size-3.5" />
            Initialize repository
          </Button>
        </div>
      </div>
      <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto py-1" aria-label="Repositories in this folder">
        {shown.map((r) => (
          <li key={r.path}>
            <button
              type="button"
              onClick={() => onPick(r.path)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted"
            >
              <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{r.name}</span>
                <span className="block truncate text-2xs text-subtle">{r.path.slice(folder.length + 1)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UndoStrip({ sha, onUndo }: { sha: string; onUndo: () => void }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-2xs text-muted-foreground">
      <span>
        Committed <span className="font-mono">{sha.slice(0, 7)}</span>
      </span>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
      >
        <RotateCcw className="size-3" />
        Undo
      </button>
    </div>
  );
}

function PatchPane({ patch, path, sessionId }: { patch: string | null; path: string; sessionId?: string }) {
  if (patch === null) return <p className="m-auto text-xs text-subtle">Loading diff…</p>;
  if (patch === "__binary__")
    return <p className="m-auto text-xs text-subtle">Binary file — no text diff.</p>;
  if (patch === "__large__")
    return <p className="m-auto text-xs text-subtle">This diff is too large to show.</p>;
  const parsed = parsePatch(patch);
  const rows = parsed.flatMap((f) => f.rows);
  if (!rows.length)
    return <p className="m-auto text-xs text-subtle">No text changes (mode or rename only).</p>;
  return <DiffRows rows={rows} path={path} fill commentFor={sessionId} />;
}

function HistoryTab({ cwd, refreshKey }: { cwd: string; refreshKey: string }) {
  const api = westcode()?.git;
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [patch, setPatch] = useState<string | null>(null);
  useEffect(() => {
    if (!api) return;
    void api.log(cwd, { limit: 100 }).then((r) => setCommits(r.commits));
  }, [api, cwd, refreshKey]);
  useEffect(() => {
    if (!api || !open) return;
    setPatch(null);
    void api.show(cwd, open).then((r) => setPatch(r.patch ?? ""));
  }, [api, cwd, open]);
  const clock = Date.now();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul
        className={cn(
          "scrollbar-thin overflow-y-auto py-1",
          open ? "max-h-[45%] shrink-0 border-b border-border" : "flex-1",
        )}
        aria-label="Commits"
      >
        {commits.map((c) => (
          <li key={c.sha}>
            <button
              type="button"
              onClick={() => setOpen(open === c.sha ? null : c.sha)}
              className={cn(
                "flex w-full flex-col gap-0.5 px-3 py-1.5 text-left",
                open === c.sha ? "bg-muted" : "hover:bg-muted/50",
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{c.summary}</span>
                {c.refs
                  .filter((r) => !r.startsWith("HEAD"))
                  .slice(0, 2)
                  .map((r) => (
                    <span
                      key={r}
                      className="shrink-0 rounded-full border border-border px-1.5 text-[10px] text-muted-foreground"
                    >
                      {r.replace(/^tag: /, "")}
                    </span>
                  ))}
              </span>
              <span className="text-2xs text-subtle">
                {c.author} · {relativeTime(c.at, clock)} ·{" "}
                <span className="font-mono">{c.shortSha}</span>
              </span>
            </button>
          </li>
        ))}
        {!commits.length ? (
          <li className="px-3 py-6 text-center text-xs text-subtle">No commits yet.</li>
        ) : null}
      </ul>
      {open ? (
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
          {patch === null ? (
            <p className="m-auto text-xs text-subtle">Loading…</p>
          ) : (
            parsePatch(patch).map((f) => (
              <DiffRows key={f.path} rows={f.rows} path={f.path} compact />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function BranchPicker({
  cwd,
  current,
  onChanged,
}: {
  cwd: string;
  current: string | null;
  onChanged: () => void;
}) {
  const api = westcode()?.git;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [list, setList] = useState<{ name: string; remote: boolean }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!open || !api) return;
    void api.branches(cwd).then((r) => setList(r.branches));
  }, [open, api, cwd]);
  const needle = q.trim().toLowerCase();
  const shown = list.filter((b) => !needle || b.name.toLowerCase().includes(needle));
  const exact = list.some((b) => !b.remote && b.name === q.trim());

  async function go(p: { name: string; remote?: boolean; create?: boolean }) {
    if (!api) return;
    const r = await api.checkout(cwd, p);
    if (!r.ok) {
      setErr(r.error ?? "Could not switch branch.");
      return;
    }
    setErr(null);
    setOpen(false);
    setQ("");
    onChanged();
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Current branch"
          className="inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium hover:bg-muted"
        >
          <GitBranch className="size-3.5 shrink-0" />
          <span className="truncate">{current ?? "Detached HEAD"}</span>
          <ChevronDown className="size-3 shrink-0 opacity-60" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-72 rounded-lg border border-border bg-window p-1.5 shadow-window"
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter or name a new branch"
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
          />
          {err ? <p className="mt-1 px-1 text-2xs text-danger">{err}</p> : null}
          <ul className="scrollbar-thin mt-1 max-h-64 overflow-y-auto">
            {q.trim() && !exact ? (
              <li>
                <button
                  type="button"
                  onClick={() => void go({ name: q.trim(), create: true })}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  <Plus className="size-3.5" />
                  Create branch <span className="font-medium">{q.trim()}</span>
                </button>
              </li>
            ) : null}
            {shown.map((b) => (
              <li key={`${b.remote ? "r" : "l"}:${b.name}`}>
                <button
                  type="button"
                  onClick={() => void go({ name: b.name, remote: b.remote })}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  {b.name === current ? (
                    <Check className="size-3.5" />
                  ) : (
                    <span className="size-3.5" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{b.name}</span>
                  {b.remote ? <span className="text-2xs text-subtle">remote</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function PanelShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside
      aria-label={title}
      className="flex h-full min-h-0 w-[min(26rem,45vw)] shrink-0 flex-col border-l border-border bg-surface"
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-xs font-medium">{title}</span>
        <button
          type="button"
          aria-label={`Close ${title.toLowerCase()}`}
          onClick={onClose}
          className="text-subtle hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {children}
    </aside>
  );
}
