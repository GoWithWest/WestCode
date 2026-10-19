import { useCallback, useEffect, useState } from "react";
import { CircleDashed, ExternalLink, Hammer, RefreshCw } from "lucide-react";
import { westcode, type WestCreateSnapshot } from "@/lib/desktop";
import { dotStateFor } from "@/lib/dots";
import { useHelix } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AgentAvatar } from "./agents-view";

const MASON = "maker-westcreate";

const QUICK = [
  "What is open in WestCreate right now?",
  "Make a finger-jointed box, 100 × 60 × 40 mm, 3 mm plywood.",
  "Plan the laser job for this drawing and tell me if it fits the bed.",
  "Check the drawing for problems before I cut it.",
];

/** Read a nested value from WestCreate's JSON without trusting its shape. */
function pick(obj: Record<string, unknown> | null | undefined, ...keys: string[]): unknown {
  for (const k of keys) if (obj && obj[k] != null) return obj[k];
  return undefined;
}

function count(v: unknown): number | null {
  return Array.isArray(v) ? v.length : null;
}

/**
 * WestCreate, natively on the desk: live state of the open drawing, the
 * planned job and the machine (read-only), and Mason one click away. The
 * agents drive the app through its MCP tools; this view only looks.
 */
export function WestCreateView() {
  const api = westcode();
  const agents = useHelix((s) => s.agents);
  const sessions = useHelix((s) => s.sessions);
  const clock = useHelix((s) => s.clock);
  const openAgent = useHelix((s) => s.openAgent);
  const [snap, setSnap] = useState<WestCreateSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const mason = agents.find((a) => a.id === MASON);
  const masonSession = sessions
    .filter((s) => s.agentId === MASON && !s.archivedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  const refresh = useCallback(async () => {
    if (!api?.westcreate) return;
    setLoading(true);
    try {
      setSnap(await api.westcreate());
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(t);
  }, [refresh]);

  const doc = snap?.document ?? null;
  const job = snap?.job ?? null;
  const machine = snap?.machine ?? null;
  const items = count(pick(doc, "items"));
  const layers = count(pick(doc, "layers"));
  // WestCreate's job resource (laser.plan) gives the planned time as estimatedSeconds.
  const seconds = Number(pick(job, "estimatedSeconds", "timeSeconds", "seconds", "time"));
  const fits = pick(job, "fitsBed", "fits");

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-medium tracking-tight">
              <Hammer className="size-4" />
              WestCreate
              <StatusPill snap={snap} />
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Laser cutting, CNC and 3D printing. Every Claude, Grok and Codex session on this desk
              can use WestCreate&apos;s tools; Mason knows the app best. This view only reads.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => void refresh()} aria-label="Refresh WestCreate">
              {loading ? <CircleDashed className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            </Button>
            {snap && !snap.running && snap.installed ? (
              <Button
                size="sm"
                variant="outline"
                disabled={opening}
                onClick={async () => {
                  setOpening(true);
                  const r = await api?.openWestcreate?.();
                  setOpening(false);
                  setNote(r?.ok ? "Opening WestCreate…" : (r?.error ?? "Could not open WestCreate."));
                  window.setTimeout(() => void refresh(), 3000);
                }}
              >
                <ExternalLink className="size-3.5" />
                Open WestCreate
              </Button>
            ) : null}
          </div>
        </div>
        {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}

        {snap && !snap.installed ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium">WestCreate is not on this Mac yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Install and open WestCreate once; it registers itself with your CLIs and shows up here.
            </p>
          </div>
        ) : null}

        {snap?.installed ? (
          <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <section className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="truncate text-sm font-medium">
                  {String(pick(doc, "name", "title") ?? (snap.running ? "Untitled drawing" : "No drawing open"))}
                </span>
                {pick(doc, "revision") != null ? (
                  <span className="text-2xs text-subtle">rev {String(pick(doc, "revision"))}</span>
                ) : null}
              </div>
              <div className="grid aspect-[4/3] place-items-center bg-window">
                {snap.view ? (
                  <img src={snap.view} alt="The open WestCreate drawing" className="max-h-full max-w-full object-contain" />
                ) : (
                  <p className="text-xs text-subtle">
                    {snap.running ? "No picture yet." : "Open WestCreate to see the drawing."}
                  </p>
                )}
              </div>
              {snap.running ? (
                <dl className="grid grid-cols-3 divide-x divide-border border-t border-border text-center">
                  <Stat label="Items" value={items ?? "—"} />
                  <Stat label="Layers" value={layers ?? "—"} />
                  <Stat label="Units" value={String(pick(doc, "units") ?? "mm")} />
                </dl>
              ) : null}
            </section>

            <div className="flex flex-col gap-4">
              <section className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-2xs font-medium tracking-wide text-subtle uppercase">Job</p>
                {job ? (
                  <p className="mt-1.5 text-sm">
                    {Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s` : "Planned"}
                    {fits === true ? (
                      <span className="ml-2 text-xs text-success">fits the bed</span>
                    ) : fits === false ? (
                      <span className="ml-2 text-xs text-danger">does not fit the bed</span>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">No job planned.</p>
                )}
                <p className="mt-3 text-2xs font-medium tracking-wide text-subtle uppercase">Machine</p>
                <p className="mt-1.5 text-sm">
                  {machine
                    ? `${pick(machine, "connected") ? "Connected" : "Not connected"}${pick(machine, "state") ? ` · ${String(pick(machine, "state"))}` : ""}`
                    : "—"}
                </p>
                <p className="mt-3 text-2xs text-subtle">
                  {snap.tools?.length ? `${snap.tools.length} tools available to agents` : null}
                  {snap.registeredWith?.length
                    ? ` · registered with ${snap.registeredWith.join(", ")}`
                    : snap.bridge
                      ? " · WestCode adds it to every session"
                      : ""}
                </p>
              </section>

              {mason ? (
                <section className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <AgentAvatar agent={mason} state={dotStateFor(masonSession, clock)} size={44} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{mason.name}</p>
                      <p className="truncate text-2xs text-muted-foreground">{mason.purpose}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    {QUICK.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => openAgent(MASON, q)}
                        className={cn(
                          "rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground",
                          "hover:border-border-strong hover:text-foreground",
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" className="mt-3 w-full" onClick={() => openAgent(MASON)}>
                    {masonSession ? "Open Mason's session" : "Work with Mason"}
                  </Button>
                </section>
              ) : null}
            </div>
          </div>
        ) : null}
        {snap?.error ? <p className="mt-3 text-xs text-danger">{snap.error}</p> : null}
      </div>
    </div>
  );
}

function StatusPill({ snap }: { snap: WestCreateSnapshot | null }) {
  if (!snap) return null;
  const running = snap.running;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium",
        running ? "border-success/40 text-success" : "border-border text-subtle",
      )}
    >
      <span className={cn("size-1.5 rounded-full", running ? "bg-success" : "bg-subtle")} />
      {running ? (snap.mode === "headless" ? "Running (headless)" : "Running") : snap.installed ? "Closed" : "Not installed"}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-2 py-2.5">
      <dt className="text-2xs text-subtle">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
