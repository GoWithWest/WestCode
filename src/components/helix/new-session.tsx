import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FolderOpen } from "lucide-react";
import { defaultEffortFor, effortsFor, modelsFor } from "@/lib/catalog";
import { pickDirectory } from "@/lib/fs";
import { useHelix } from "@/lib/store";
import { PROJECTS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProviderDot, useAllProviders } from "./provider";

export function NewSessionDialog() {
  const open = useHelix((s) => s.newOpen);
  const setNewOpen = useHelix((s) => s.setNewOpen);
  const createSession = useHelix((s) => s.createSession);
  const rememberFolder = useHelix((s) => s.rememberFolder);
  const recents = useHelix((s) => s.recentFolders);
  const providers = useAllProviders().filter((p) => p.connected);
  const [providerId, setProviderId] = useState("claude");
  const [projectId, setProjectId] = useState("harbor");
  const [cwd, setCwd] = useState("~/src/harbor");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("Opus 4.7");
  const [effort, setEffort] = useState("high");

  const provider = providers.find((p) => p.id === providerId) ?? providers[0];
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
    const p = providers.find((x) => x.id === id);
    const models = modelsFor(id, p?.models ?? []);
    setModel(p?.defaultModel ?? models[0]?.id ?? "");
    setEffort(defaultEffortFor(id));
  }

  function pickProject(id: string, path: string) {
    setProjectId(id);
    setCwd(path);
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
    createSession({
      providerId: provider.id,
      projectId,
      cwd: cwd.trim() || PROJECTS[0]!.path,
      prompt: prompt.trim() || "Inspect the repo and wait for a task.",
      model,
      effort,
    });
    setPrompt("");
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
            {providers.map((p) => {
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
                    {p.live
                      ? " · live in preview"
                      : p.builtin
                        ? " · ACP"
                        : " · added"}
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
            {PROJECTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickProject(p.id, p.path)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-2xs",
                  cwd === p.path
                    ? "border-accent bg-muted text-foreground"
                    : "border-border text-muted-foreground hover:border-border-strong",
                )}
              >
                {p.name}
              </button>
            ))}
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
              First prompt
            </span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="What should this agent do?"
              className="mt-1.5 w-full resize-none rounded-md border border-border bg-window px-3 py-2 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
            />
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={start}>Start session</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
