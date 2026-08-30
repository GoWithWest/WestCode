import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FolderOpen } from "lucide-react";
import { defaultEffortFor, effortsFor, modelsFor } from "@/lib/catalog";
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

  async function browse() {
    const folder = await pickDirectory();
    if (!folder) return;
    rememberFolder(folder);
    setProjectId("scratch");
    setCwd(folder.path);
  }

  function start() {
    if (!provider) return;
    if (!cwd.trim()) return;
    createSession({
      providerId: provider.id,
      projectId,
      cwd: cwd.trim(),
      title: title.trim(),
      model,
      effort,
    });
    setTitle("");
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
          <div className="mt-2 flex flex-wrap gap-1.5">
            {recents.map((f) => (
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
                  start();
                }
              }}
              placeholder="Optional — defaults to the folder name"
              className="mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
            />
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={start} disabled={!cwd.trim() || !provider}>
              Start session
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
