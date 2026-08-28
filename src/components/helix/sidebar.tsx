import { Blocks, Plus, Settings2 } from "lucide-react";
import { useHelix } from "@/lib/store";
import { relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProviderDot, StatusLabel, useAllProviders } from "./provider";

export function Sidebar() {
  const sessions = useHelix((s) => s.sessions);
  const activeId = useHelix((s) => s.activeId);
  const view = useHelix((s) => s.view);
  const clock = useHelix((s) => s.clock);
  const enabledAddons = useHelix((s) => s.enabledAddons);
  const setActive = useHelix((s) => s.setActive);
  const setView = useHelix((s) => s.setView);
  const setNewOpen = useHelix((s) => s.setNewOpen);
  const providers = useAllProviders();

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-surface md:w-60">
      <div className="flex h-11 items-center justify-between px-3">
        <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
          Sessions
        </span>
        <Button
          size="icon"
          variant="ghost"
          aria-label="New session"
          onClick={() => setNewOpen(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
        {sessions.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            No sessions yet
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {sessions.map((ses) => {
              const active = ses.id === activeId && view === "focus";
              return (
                <li key={ses.id}>
                  <button
                    type="button"
                    onClick={() => setActive(ses.id)}
                    className={`flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors duration-(--motion-quick) ${
                      active ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ProviderDot id={ses.providerId} />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {ses.title}
                      </span>
                    </span>
                    <span className="flex items-center justify-between pl-4 text-2xs text-subtle">
                      <StatusLabel status={ses.status} />
                      <span className="tabular-nums">
                        {relativeTime(ses.updatedAt, clock)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
      <div className="border-t border-border p-2">
        <p className="px-2 pb-1.5 text-2xs font-medium tracking-wide text-subtle uppercase">
          Providers
        </p>
        <ul className="flex flex-col">
          {providers.map((p) => {
            const count = sessions.filter((s) => s.providerId === p.id).length;
            return (
              <li
                key={p.id}
                className="flex items-center justify-between px-2 py-1.5"
              >
                <span className="inline-flex items-center gap-2 text-xs">
                  <ProviderDot id={p.id} />
                  {p.short}
                </span>
                <span className="text-2xs tabular-nums text-subtle">
                  {p.live ? "live" : `${count}`}
                </span>
              </li>
            );
          })}
        </ul>
        <Button
          variant="ghost"
          size="sm"
          className={
            view === "library"
              ? "mt-1 w-full justify-start bg-muted/60"
              : "mt-1 w-full justify-start text-muted-foreground"
          }
          onClick={() => setView("library")}
        >
          <Blocks className="size-3.5" />
          Library
          <span className="ml-auto text-2xs tabular-nums text-subtle">
            {enabledAddons.length}
          </span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={
            view === "providers"
              ? "w-full justify-start bg-muted/60"
              : "w-full justify-start text-muted-foreground"
          }
          onClick={() => setView("providers")}
        >
          <Settings2 className="size-3.5" />
          Connections
        </Button>
      </div>
    </aside>
  );
}
