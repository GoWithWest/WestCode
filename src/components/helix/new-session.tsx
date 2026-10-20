import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, Folder, FolderOpen, Laptop, Server } from "lucide-react";
import { defaultEffortFor, effortsFor, modelsFor } from "@/lib/catalog";
import { westcode } from "@/lib/desktop";
import { pickDirectory } from "@/lib/fs";
import { useHelix } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProviderDot, useAllProviders } from "./provider";

export function NewSessionDialog() {
  const open = useHelix((s) => s.newOpen);
  const pinnedProviderId = useHelix((s) => s.newProviderId);
  const setNewOpen = useHelix((s) => s.setNewOpen);
  const createSession = useHelix((s) => s.createSession);
  const rememberFolder = useHelix((s) => s.rememberFolder);
  const recents = useHelix((s) => s.recentFolders);
  const settings = useHelix((s) => s.settings);
  const allProviders = useAllProviders();
  const providers = allProviders.filter((p) => p.connected);
  const list = providers.length ? providers : allProviders;
  const initialProvider =
    (settings.defaultProviderId &&
      list.find((p) => p.id === settings.defaultProviderId)?.id) ||
    list[0]?.id ||
    "grok";
  const [providerId, setProviderId] = useState(initialProvider);
  const [projectId, setProjectId] = useState("scratch");
  const [cwd, setCwd] = useState(settings.defaultCwd);
  const [title, setTitle] = useState("");
  const sshHosts = useHelix((s) => s.sshHosts);
  const prefill = useHelix((s) => s.newPrefill);
  const [prompt, setPrompt] = useState("");
  const setView = useHelix((s) => s.setView);
  const [hostId, setHostId] = useState("");
  // Claude Desktop's "Worktree": the session gets its own branch and copy.
  const [worktree, setWorktree] = useState(false);
  const [startError, setStartError] = useState("");
  const [starting, setStarting] = useState(false);
  // Folder browser for an SSH host (the native picker only sees this Mac).
  const [remote, setRemote] = useState<{ path: string; dirs: string[]; error?: string; loading?: boolean } | null>(null);
  const scoped = settings.defaultProviderId === initialProvider;
  const [model, setModel] = useState(
    (scoped && settings.defaultModel) ||
      list.find((p) => p.id === initialProvider)?.defaultModel ||
      "grok-4.6",
  );
  const [effort, setEffort] = useState(
    (scoped && settings.defaultEffort) || defaultEffortFor(initialProvider),
  );

  // Re-seed from Settings each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    const id =
      (pinnedProviderId && list.find((p) => p.id === pinnedProviderId)?.id) ||
      (settings.defaultProviderId &&
        list.find((p) => p.id === settings.defaultProviderId)?.id) ||
      list[0]?.id ||
      "grok";
    setProviderId(id);
    const p = list.find((x) => x.id === id);
    const match = settings.defaultProviderId === id;
    setModel((match && settings.defaultModel) || p?.defaultModel || "");
    setEffort((match && settings.defaultEffort) || defaultEffortFor(id));
    if (settings.defaultCwd) setCwd(settings.defaultCwd);
    setHostId("");
    setRemote(null);
    setPrompt("");
    if (prefill) {
      const host = prefill.hostId
        ? sshHosts.find((h) => h.id === prefill.hostId || h.name === prefill.hostId || h.host === prefill.hostId)
        : undefined;
      if (host) setHostId(host.id);
      if (prefill.cwd) setCwd(prefill.cwd);
      if (prefill.prompt) setPrompt(prefill.prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const provider = list.find((p) => p.id === providerId) ?? list[0];
  const modelOpts = useMemo(
    () => modelsFor(provider?.id ?? "claude", provider?.models ?? []),
    [provider],
  );
  const effortOpts = useMemo(
    () => effortsFor(provider?.id ?? "claude"),
    [provider],
  );

  function pickProvider(id: string) {
    setProviderId(id);
    const p = list.find((x) => x.id === id);
    const models = modelsFor(id, p?.models ?? []);
    setModel(p?.defaultModel ?? models[0]?.id ?? "");
    setEffort(defaultEffortFor(id));
  }

  async function browseRemote(path?: string) {
    const api = westcode()?.ssh;
    if (!api || !hostId) return;
    setRemote((r) => ({ path: r?.path ?? "", dirs: r?.dirs ?? [], loading: true }));
    const res = await api.ls(hostId, path);
    if (!res.ok) setRemote((r) => ({ path: r?.path ?? "", dirs: r?.dirs ?? [], error: res.error }));
    else {
      setRemote({ path: res.path ?? "", dirs: res.dirs ?? [] });
      setCwd(res.path ?? "");
    }
  }

  function pickHost(id: string) {
    setHostId(id);
    setRemote(null);
    setCwd(id ? "" : settings.defaultCwd);
  }

  async function browse() {
    if (hostId) {
      await browseRemote(cwd.trim() || undefined);
      return;
    }
    const folder = await pickDirectory();
    if (!folder) return;
    rememberFolder(folder);
    setProjectId("scratch");
    setCwd(folder.path);
  }

  async function start() {
    if (!provider) return;
    if (!cwd.trim() || starting) return;
    setStartError("");
    let folder = cwd.trim();
    let wt: { path: string; branch: string; repo: string } | undefined;
    if (worktree && !hostId) {
      const add = westcode()?.git?.worktreeAdd;
      if (!add) return;
      setStarting(true);
      const name = title.trim() || folder.split("/").filter(Boolean).pop() || "session";
      const r = await add(folder, {
        name,
        branchPrefix: settings.worktreeBranchPrefix,
        location: settings.worktreeLocation || undefined,
      });
      setStarting(false);
      if (!r.ok || !r.path) {
        setStartError(r.error || "Could not create the worktree.");
        return;
      }
      wt = { path: r.path, branch: r.branch!, repo: r.repo! };
      folder = r.path;
    }
    createSession({
      providerId: provider.id,
      projectId,
      cwd: folder,
      title: title.trim() || (wt ? wt.branch.split("/").pop() : ""),
      model,
      effort,
      ...(hostId ? { hostId } : {}),
      ...(wt ? { worktree: wt } : {}),
      ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
    });
    setPrompt("");
    setTitle("");
    setWorktree(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setNewOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/70" />
        <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[min(90dvh,42rem)] w-auto max-w-md -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-window focus:outline-none">
          <Dialog.Title className="text-lg font-medium tracking-tight">
            New session
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            Pick a provider and the folder it should work in. Browse this Mac,
            or use a recent project.
          </Dialog.Description>

          <div className="mt-4">
            <span className="text-2xs font-medium tracking-wide text-subtle uppercase">Runs on</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Runs on">
              {[{ id: "", name: "This Mac" }, ...sshHosts].map((h) => (
                <button
                  key={h.id || "local"}
                  type="button"
                  role="radio"
                  aria-checked={hostId === h.id}
                  onClick={() => pickHost(h.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                    hostId === h.id
                      ? "border-accent bg-muted text-foreground"
                      : "border-border text-muted-foreground hover:border-border-strong",
                  )}
                >
                  {h.id ? <Server className="size-3" /> : <Laptop className="size-3" />}
                  {h.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setNewOpen(false);
                  setView("settings");
                }}
                className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-subtle hover:text-foreground"
              >
                + SSH host
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {list.map((p) => {
              const selected = p.id === providerId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickProvider(p.id)}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left transition-colors duration-(--motion-quick)",
                    selected
                      ? "border-accent bg-muted"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <ProviderDot id={p.id} />
                    {p.name}
                  </span>
                  <span className="mt-1 block text-2xs text-muted-foreground">
                    {p.authLabel}
                    {p.connected ? " · ready" : " · install CLI"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
                Model
              </span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-border bg-window px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
              >
                {modelOpts.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
                Effort
              </span>
              <select
                value={effort}
                onChange={(e) => setEffort(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-border bg-window px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
              >
                {effortOpts.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
              Folder
            </span>
            <div className="mt-1.5 flex gap-2">
              <input
                value={cwd}
                onChange={(e) => {
                  setCwd(e.target.value);
                  setProjectId("scratch");
                }}
                spellCheck={false}
                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-window px-2.5 font-mono text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                type="button"
                variant="outline"
                className="h-9 shrink-0"
                onClick={() => void browse()}
              >
                <FolderOpen className="size-3.5" />
                Browse
              </Button>
            </div>
          </label>
          {hostId && remote ? (
            <div className="mt-2 rounded-md border border-border bg-window" aria-label="Folders on the host">
              <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
                <button
                  type="button"
                  aria-label="Up one folder"
                  className="rounded p-0.5 text-subtle hover:bg-muted hover:text-foreground"
                  onClick={() => void browseRemote(remote.path.replace(/\/[^/]+\/?$/, "") || "/")}
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="min-w-0 flex-1 truncate font-mono text-2xs">{remote.path}</span>
                {remote.loading ? <span className="text-2xs text-subtle">Loading…</span> : null}
              </div>
              {remote.error ? (
                <p className="px-2.5 py-2 text-2xs text-destructive" role="alert">
                  {remote.error}
                </p>
              ) : (
                <ul className="scrollbar-thin max-h-44 overflow-y-auto py-1">
                  {remote.dirs.length ? (
                    remote.dirs.map((d) => (
                      <li key={d}>
                        <button
                          type="button"
                          onClick={() => void browseRemote(`${remote.path.replace(/\/$/, "")}/${d}`)}
                          className="flex w-full items-center gap-1.5 px-2.5 py-1 text-left text-xs hover:bg-muted"
                        >
                          <Folder className="size-3 text-subtle" />
                          {d}
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="px-2.5 py-1 text-2xs text-subtle">No folders here.</li>
                  )}
                </ul>
              )}
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(hostId ? [] : recents).map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => {
                  setProjectId("scratch");
                  setCwd(f.path);
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-2xs",
                  cwd === f.path
                    ? "border-accent bg-muted text-foreground"
                    : "border-border text-muted-foreground hover:border-border-strong",
                )}
              >
                {f.name}
              </button>
            ))}
          </div>

          <label className="mt-3 block">
            <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
              Session name
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void start();
                }
              }}
              placeholder="Optional — defaults to the folder name"
              className="mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
            />
          </label>

          {prompt ? (
            <label className="mt-3 block">
              <span className="text-2xs font-medium tracking-wide text-subtle uppercase">First message (from a link)</span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-md border border-border bg-window px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </label>
          ) : null}
          {!hostId ? (
            <label className="mt-3 flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={worktree}
                onChange={(e) => setWorktree(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Worktree</span>
                <span className="block text-2xs text-muted-foreground">
                  Work on a new branch in its own copy of the repository, so parallel sessions never touch the same
                  files. Removed when you archive the session (kept if it has uncommitted changes).
                </span>
              </span>
            </label>
          ) : null}
          {startError ? (
            <p className="mt-2 text-2xs text-destructive" role="alert">
              {startError}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void start()} disabled={!cwd.trim() || !provider || starting}>
              {starting ? "Creating worktree…" : "Start session"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
