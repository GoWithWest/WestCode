import { useCallback, useEffect, useState } from "react";
import { Brain, ChevronRight, ExternalLink, FolderGit2, RefreshCw } from "lucide-react";
import { westcode, type MemoryHubBridge, type MemorySource } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LearnedPanel } from "./learned-panel";
import { ProviderDot } from "./provider";

type HubState = Awaited<ReturnType<MemoryHubBridge["state"]>>;

const PROVIDER_NAME: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  grok: "Grok",
  gemini: "Gemini CLI",
  hermes: "Hermes",
  westcode: "WestCode",
};

/**
 * Memory & learning: one shared memory for every agent on this computer —
 * a git repository when the user has (or creates) one — synced into each
 * CLI's own rules file, every CLI's own memory shown side by side, and the
 * learning loop's proposals.
 */
export function MemoryView() {
  const hub = westcode()?.memoryHub;
  const settings = useHelix((s) => s.settings);
  const update = useHelix((s) => s.updateSettings);
  const [state, setState] = useState<HubState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [remote, setRemote] = useState("");

  const refresh = useCallback(async () => {
    if (!hub) return;
    setState(await hub.state(settings.memoryRepo || undefined));
  }, [hub, settings.memoryRepo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(label: string, fn: () => Promise<string | null>) {
    setBusy(label);
    setNote(null);
    try {
      setNote(await fn());
    } finally {
      setBusy(null);
      void refresh();
    }
  }

  async function resync(repo: string, on = settings.memorySync) {
    if (!hub || !on) return null;
    const r = await hub.sync(true, repo || undefined);
    const failed = r.results.filter((x) => x.status === "failed");
    return failed.length ? `Could not update: ${failed.map((f) => f.path).join(", ")}` : null;
  }

  if (!hub) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Memory needs the WestCode desktop app.</div>
    );
  }

  const repo = state?.repo;
  const usingRepo = Boolean(settings.memoryRepo && repo?.repo);

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-medium tracking-tight">
            <Brain className="size-4" /> Memory &amp; learning
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            One memory for every agent on this computer. Keep it in a git repository and it follows you to
            every machine; WestCode tells each CLI where it is and how to save to it.
          </p>
        </div>

        {/* Shared store */}
        <section className="rounded-2xl border border-border bg-surface p-4" aria-label="Shared memory store">
          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted">
              <FolderGit2 className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Shared memory store</p>
              {usingRepo ? (
                <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span className="truncate font-mono text-foreground">{repo!.root}</span>
                  <span>
                    {repo!.remote ? (
                      <>
                        Pushed to <span className="font-mono">{repo!.remote}</span>
                        {repo!.unpushed ? ` · ${repo!.unpushed} not pushed yet` : ""}
                      </>
                    ) : (
                      "No remote yet — memory stays on this computer until you add one."
                    )}
                  </span>
                  {repo!.lastCommit ? <span className="text-subtle">Last change {repo!.lastCommit}</span> : null}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Not set: approved memories stay in WestCode&apos;s local store ({state?.local ?? "~/.westcode/memory"}).
                </p>
              )}
            </div>
          </div>

          {!usingRepo && state?.detected ? (
            <div className="mt-3 rounded-lg border border-accent/30 bg-muted/40 p-3 text-xs">
              <p>
                Found a memory repository you already keep:{" "}
                <span className="font-mono">{state.detected.path}</span> ({state.detected.remote}), used by{" "}
                {state.detected.from}.
              </p>
              <Button
                size="sm"
                className="mt-2"
                disabled={Boolean(busy)}
                onClick={() =>
                  void run("use", async () => {
                    update({ memoryRepo: state.detected!.path });
                    return (await resync(state.detected!.path)) ?? "Using it as the shared memory store.";
                  })
                }
              >
                Use this repository
              </Button>
            </div>
          ) : null}

          {!usingRepo && !state?.detected ? (
            <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs">
              <p>
                No memory repository yet. A git repository (private on GitHub) is the best home for memory: every
                agent can read and push to it, on every computer.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void run("create", async () => {
                      const dir = await hub.pickFolder();
                      if (!dir) return null;
                      const r = await hub.createRepo(dir);
                      if (!r.ok) return r.error ?? "Could not create it.";
                      update({ memoryRepo: r.dir });
                      return "Memory repository created. Add a GitHub remote below so it follows you.";
                    })
                  }
                >
                  Create memory repository…
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void run("existing", async () => {
                      const dir = await hub.pickFolder();
                      if (!dir) return null;
                      update({ memoryRepo: dir });
                      return null;
                    })
                  }
                >
                  Use an existing folder…
                </Button>
              </div>
            </div>
          ) : null}

          {settings.memoryRepo && repo && !repo.repo ? (
            <p className="mt-3 text-xs text-danger">
              {settings.memoryRepo} is not a git repository any more.
            </p>
          ) : null}

          {usingRepo && !repo!.remote ? (
            <form
              className="mt-3 flex flex-wrap items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                void run("remote", async () => {
                  const r = await hub.setRemote(settings.memoryRepo, remote.trim());
                  return r.ok ? "Remote added and pushed." : (r.error ?? "Could not push.");
                });
              }}
            >
              <input
                value={remote}
                onChange={(e) => setRemote(e.target.value)}
                placeholder="git@github.com:you/memory.git"
                aria-label="Remote URL"
                className="h-8 min-w-0 flex-1 rounded-md border border-border bg-window px-2.5 font-mono text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
              />
              <Button size="sm" type="submit" disabled={!remote.trim() || Boolean(busy)}>
                Add remote &amp; push
              </Button>
              <a
                href="https://github.com/new?name=memory&visibility=private"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                New private repo on GitHub <ExternalLink className="size-3" />
              </a>
            </form>
          ) : null}

          {settings.memoryRepo ? (
            <button
              type="button"
              className="mt-3 text-2xs text-subtle hover:text-foreground"
              onClick={() =>
                void run("stop", async () => {
                  update({ memoryRepo: "" });
                  return (await resync("")) ?? "Back to WestCode's local memory store.";
                })
              }
            >
              Stop using this repository
            </button>
          ) : null}
        </section>

        {/* Sync into each CLI */}
        <section className="rounded-2xl border border-border bg-surface p-4" aria-label="Sync with each CLI">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Share with every CLI</p>
              <p className="mt-0.5 max-w-lg text-xs text-muted-foreground">
                Adds a short, marked block to each installed CLI&apos;s own global rules file, saying where the shared
                memory is and how to save to it, plus what is already known. Nothing else in those files changes; the
                first write keeps a backup.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.memorySync}
              aria-label="Share memory with every CLI"
              disabled={Boolean(busy)}
              onClick={() =>
                void run("sync", async () => {
                  const on = !settings.memorySync;
                  const r = await hub.sync(on, settings.memoryRepo || undefined);
                  update({ memorySync: on });
                  const failed = r.results.filter((x) => x.status === "failed");
                  return failed.length ? `Could not update ${failed.map((f) => f.path).join(", ")}` : null;
                })
              }
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                settings.memorySync ? "bg-success" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0 size-4 rounded-full bg-white transition-transform",
                  settings.memorySync ? "translate-x-[1.125rem]" : "translate-x-0.5",
                )}
              />
            </button>
          </div>
          <ul className="mt-3 flex flex-col gap-1">
            {(state?.sync ?? []).map((t) => (
              <li key={t.path} className="flex items-center gap-2 text-xs">
                <ProviderDot id={t.provider} />
                <span className="w-24 shrink-0">{PROVIDER_NAME[t.provider] ?? t.provider}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-2xs text-subtle">{t.path}</span>
                <span className={cn("shrink-0 text-2xs", t.synced ? "text-success" : "text-subtle")}>
                  {t.synced ? "in sync" : "not synced"}
                </span>
              </li>
            ))}
            {state && !state.sync.length ? <li className="text-xs text-subtle">No CLIs found on this computer.</li> : null}
          </ul>
          {settings.memorySync ? (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              disabled={Boolean(busy)}
              onClick={() => void run("resync", async () => (await resync(settings.memoryRepo, true)) ?? "Synced.")}
            >
              <RefreshCw className="size-3.5" /> Sync now
            </Button>
          ) : null}
        </section>

        {note ? <p className="text-xs text-muted-foreground" role="status">{note}</p> : null}

        {/* Learning */}
        <section aria-label="Learning">
          <h3 className="text-sm font-medium">Learning from your sessions</h3>
          <LearnedPanel />
        </section>

        {/* Each CLI's own memory */}
        <section aria-label="Each agent's own memory">
          <h3 className="text-sm font-medium">Each agent&apos;s own memory</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">What every CLI on this computer keeps for itself.</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {(state?.sources ?? []).map((s) => (
              <SourceRow key={s.path} source={s} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function SourceRow({ source }: { source: MemorySource }) {
  const hub = westcode()?.memoryHub;
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ files: string[]; text: string } | null>(null);
  useEffect(() => {
    if (open && !preview && hub) void hub.preview(source.path).then(setPreview);
  }, [open, preview, hub, source.path]);
  return (
    <li className="overflow-hidden rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
      >
        <ProviderDot id={source.provider} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium">{source.label}</span>
          <span className="block truncate font-mono text-2xs text-subtle">{source.path}</span>
        </span>
        <span className="shrink-0 text-2xs text-subtle">
          {source.kind === "rules" ? "rules" : source.entries != null ? `${source.entries} files` : "memory"}
        </span>
        <ChevronRight className={cn("size-3.5 shrink-0 text-subtle transition-transform", open && "rotate-90")} />
      </button>
      {open ? (
        <div className="border-t border-border px-3 py-2">
          {preview === null ? (
            <p className="text-2xs text-subtle">Reading…</p>
          ) : (
            <>
              {preview.files.length ? (
                <p className="mb-1.5 flex flex-wrap gap-1">
                  {preview.files.slice(0, 40).map((f) => (
                    <span key={f} className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {f}
                    </span>
                  ))}
                  {preview.files.length > 40 ? <span className="text-[10px] text-subtle">+{preview.files.length - 40} more</span> : null}
                </p>
              ) : null}
              {preview.text ? (
                <pre className="scrollbar-thin max-h-48 overflow-auto whitespace-pre-wrap font-mono text-2xs text-muted-foreground">
                  {preview.text}
                </pre>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}

