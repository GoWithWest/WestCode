import { useEffect, useState } from "react";
import { Wifi } from "lucide-react";
import { useHelix } from "@/lib/store";
import { formatClock } from "@/lib/utils";
import { HelixMark } from "./mark";

type Action = "providers" | "library" | "new" | "mosaic" | "focus" | "split";

const MENUS: { label: string; items: { label: string; action: Action }[] }[] = [
  {
    label: "WestCode",
    items: [
      { label: "About WestCode", action: "providers" },
      { label: "Library", action: "library" },
      { label: "New Session", action: "new" },
    ],
  },
  {
    label: "View",
    items: [
      { label: "Mosaic", action: "mosaic" },
      { label: "Focus", action: "focus" },
      { label: "Split", action: "split" },
      { label: "Library", action: "library" },
      { label: "Connections", action: "providers" },
    ],
  },
  {
    label: "Session",
    items: [{ label: "New Session", action: "new" }],
  },
];

export function MenuBar() {
  const setView = useHelix((s) => s.setView);
  const setNewOpen = useHelix((s) => s.setNewOpen);
  const sessions = useHelix((s) => s.sessions);
  const [open, setOpen] = useState<string | null>(null);
  const [clock, setClock] = useState(() => formatClock());

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatClock()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  function run(action: Action) {
    setOpen(null);
    if (action === "new") setNewOpen(true);
    else setView(action);
  }

  const running = sessions.filter((s) => s.status === "running").length;

  return (
    <header className="relative z-30 flex h-8 items-center justify-between border-b border-white/5 bg-menubar px-3 text-2xs text-foreground backdrop-blur-md">
      <div className="flex items-center gap-1">
        <HelixMark className="mr-1 size-3.5" />
        {MENUS.map((m) => (
          <div key={m.label} className="relative">
            <button
              type="button"
              onClick={() => setOpen(open === m.label ? null : m.label)}
              className={`rounded-xs px-2 py-0.5 ${
                open === m.label ? "bg-white/10" : "hover:bg-white/8"
              }`}
            >
              {m.label}
            </button>
            {open === m.label ? (
              <div className="absolute top-full left-0 mt-1 min-w-40 rounded-md border border-border bg-surface py-1 shadow-window">
                {m.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => run(item.action)}
                    className="block w-full px-3 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="hidden tabular-nums sm:inline">
          {running} running
        </span>
        <Wifi className="size-3" />
        <span className="tabular-nums text-foreground">{clock}</span>
      </div>
    </header>
  );
}
