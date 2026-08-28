import { Plus } from "lucide-react";
import { useHelix } from "@/lib/store";
import { SessionCard } from "./session-pane";

export function Mosaic() {
  const sessions = useHelix((s) => s.sessions);
  const setActive = useHelix((s) => s.setActive);
  const setNewOpen = useHelix((s) => s.setNewOpen);

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium tracking-tight">All agents</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every live session across connected providers. Attach files, pick a
            folder, and let them SendMessage each other.
          </p>
        </div>
        <span className="text-2xs tabular-nums text-subtle">
          {sessions.length} open
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sessions.map((ses) => (
          <SessionCard
            key={ses.id}
            session={ses}
            onOpen={() => setActive(ses.id)}
          />
        ))}
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong text-muted-foreground transition-opacity duration-(--motion-quick) hover:border-accent hover:text-foreground"
        >
          <Plus className="size-4" />
          <span className="text-xs font-medium">New session</span>
        </button>
      </div>
    </div>
  );
}
