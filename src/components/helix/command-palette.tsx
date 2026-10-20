import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { useHelix } from "@/lib/store";
import type { LayoutView } from "@/lib/types";
import { ProviderDot } from "./provider";

const VIEWS: [LayoutView, string][] = [
  ["mosaic", "All agents (mosaic)"],
  ["library", "Library"],
  ["agents", "Agents"],
  ["memory", "Memory & learning"],
  ["westcreate", "WestCreate"],
  ["providers", "Connections"],
  ["settings", "Settings"],
];

/** ⌘K: jump to any session or view, start one, archive the open one. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const sessions = useHelix((s) => s.sessions);
  const activeId = useHelix((s) => s.activeId);
  const view = useHelix((s) => s.view);
  const hosts = useHelix((s) => s.sshHosts);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onMenu = () => setOpen((v) => !v);
    window.addEventListener("keydown", onKey);
    window.addEventListener("westcode:palette", onMenu);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("westcode:palette", onMenu);
    };
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  const st = () => useHelix.getState();
  const visible = sessions.filter((s) => !s.sideOf);
  const live = visible.filter((s) => !s.archivedAt);
  const archived = visible.filter((s) => s.archivedAt);
  const current = view === "focus" ? sessions.find((s) => s.id === activeId) : undefined;
  const hostName = (id?: string) => (id ? (hosts.find((h) => h.id === id)?.name ?? id) : "");

  const item =
    "flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-sm aria-selected:bg-muted data-[disabled=true]:opacity-50";
  const group = "px-1 py-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-subtle [&_[cmdk-group-heading]]:uppercase";

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/60" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-4 top-[14vh] z-50 mx-auto w-auto max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-window focus:outline-none"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Command label="Command palette" loop>
            <Command.Input
              autoFocus
              placeholder="Search sessions and commands…"
              className="h-11 w-full border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-subtle"
            />
            <Command.List className="scrollbar-thin max-h-[60vh] overflow-y-auto">
              <Command.Empty className="px-4 py-6 text-center text-xs text-subtle">Nothing matches.</Command.Empty>
              <Command.Group heading="Actions" className={group}>
                <Command.Item className={item} onSelect={() => run(() => st().setNewOpen(true))}>
                  New session
                  <kbd className="ml-auto text-2xs text-subtle">⌘N</kbd>
                </Command.Item>
                {current ? (
                  <Command.Item
                    className={item}
                    value={`archive ${current.title}`}
                    onSelect={() => run(() => st().archiveSession(current.id, true))}
                  >
                    Archive “{current.title}”
                  </Command.Item>
                ) : null}
                <Command.Item
                  className={item}
                  onSelect={() =>
                    run(() => {
                      const order = ["normal", "thinking", "verbose"] as const;
                      const cur = order.indexOf(st().settings.transcriptDetail ?? "normal");
                      st().updateSettings({ transcriptDetail: order[(cur + 1) % order.length]! });
                    })
                  }
                >
                  Cycle transcript detail (Normal / Thinking / Verbose)
                  <kbd className="ml-auto text-2xs text-subtle">⌘O</kbd>
                </Command.Item>
              </Command.Group>
              <Command.Group heading="Go to" className={group}>
                {VIEWS.map(([v, label]) => (
                  <Command.Item key={v} className={item} onSelect={() => run(() => st().setView(v))}>
                    {label}
                  </Command.Item>
                ))}
              </Command.Group>
              {live.length ? (
                <Command.Group heading="Sessions" className={group}>
                  {live.map((s) => (
                    <Command.Item
                      key={s.id}
                      className={item}
                      value={`${s.title} ${s.cwd} ${hostName(s.hostId)} ${s.id}`}
                      onSelect={() => run(() => st().setActive(s.id))}
                    >
                      <ProviderDot id={s.providerId} />
                      <span className="min-w-0 flex-1 truncate">{s.title}</span>
                      <span className="max-w-40 shrink-0 truncate text-2xs text-subtle">
                        {s.hostId ? `${hostName(s.hostId)} · ` : ""}
                        {s.cwd.split("/").filter(Boolean).pop()}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}
              {archived.length ? (
                <Command.Group heading="Archived" className={group}>
                  {archived.map((s) => (
                    <Command.Item
                      key={s.id}
                      className={item}
                      value={`archived ${s.title} ${s.cwd} ${s.id}`}
                      onSelect={() =>
                        run(() => {
                          st().archiveSession(s.id, false);
                          st().setActive(s.id);
                        })
                      }
                    >
                      <ProviderDot id={s.providerId} />
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.title}</span>
                      <span className="shrink-0 text-2xs text-subtle">unarchive</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
