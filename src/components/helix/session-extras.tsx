import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Circle, CircleDot, Layers, ShieldQuestion } from "lucide-react";
import { westcode } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import type { Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DiffView } from "./blocks";

/** The agent's task list, pinned above the composer while it has one. */
export function PlanCard({ session }: { session: Session }) {
  const plan = session.plan ?? [];
  const [open, setOpen] = useState(true);
  if (!plan.length) return null;
  const done = plan.filter((p) => p.status === "completed").length;
  const current = plan.find((p) => p.status === "in_progress");
  const finished = done === plan.length;
  return (
    <div className="mx-auto w-full max-w-3xl px-3 md:px-5">
      <div className="rounded-xl border border-border bg-surface">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3 py-2 text-left"
        >
          <ProgressRing value={done / plan.length} />
          <span className="min-w-0 flex-1 truncate text-xs font-medium">
            {finished ? "All tasks done" : (current?.content ?? `${plan.length} tasks`)}
          </span>
          <span className="shrink-0 text-2xs tabular-nums text-subtle">
            {done}/{plan.length}
          </span>
          <ChevronDown
            className={cn("size-3.5 shrink-0 text-subtle transition-transform", !open && "-rotate-90")}
          />
        </button>
        {open ? (
          <ol className="flex flex-col gap-0.5 border-t border-border px-3 py-2">
            {plan.map((p, i) => (
              <li key={`${i}-${p.content}`} className="flex items-start gap-2 py-0.5 text-xs">
                {p.status === "completed" ? (
                  <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                ) : p.status === "in_progress" ? (
                  <CircleDot className="mt-0.5 size-3.5 shrink-0 animate-pulse text-foreground" />
                ) : (
                  <Circle className="mt-0.5 size-3.5 shrink-0 text-subtle" />
                )}
                <span
                  className={cn(
                    "leading-snug",
                    p.status === "completed" && "text-subtle line-through decoration-subtle/60",
                    p.status === "in_progress" && "font-medium",
                  )}
                >
                  {p.content}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}

function ProgressRing({ value, size = 16 }: { value: number; size?: number }) {
  const r = size / 2 - 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border-strong)" strokeWidth="2" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-success)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
        className="transition-[stroke-dashoffset] duration-(--motion-slow)"
      />
    </svg>
  );
}

/** Context use as a small ring in the composer; full numbers on hover. */
export function UsageRing({ session }: { session: Session }) {
  const u = session.usage;
  if (!u || !u.size) return null;
  const frac = u.used / u.size;
  const pct = Math.round(frac * 100);
  const size = 18;
  const r = 7;
  const c = 2 * Math.PI * r;
  const color =
    frac > 0.85 ? "var(--color-danger)" : frac > 0.6 ? "var(--color-warn)" : "var(--color-muted-foreground)";
  return (
    <span
      className="inline-flex h-8 items-center gap-1 px-1 text-2xs text-subtle tabular-nums"
      title={`Context: ${u.used.toLocaleString()} of ${u.size.toLocaleString()} tokens (${pct}%)`}
      aria-label={`Context ${pct} percent used`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={9} cy={9} r={r} fill="none" stroke="var(--color-border-strong)" strokeWidth="2" />
        <circle
          cx={9}
          cy={9}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, frac))}
        />
      </svg>
      {pct}%
    </span>
  );
}

/**
 * The agent asks before a tool runs. Shows exactly what it will do (the diff
 * or the command); number keys pick an option, as in the CLIs.
 */
export function PermissionCard({ session, agentName }: { session: Session; agentName: string }) {
  const answer = useHelix((s) => s.answerPermission);
  const p = session.permission;
  const options = useMemo(
    () =>
      p?.options.length
        ? p.options
        : [
            { optionId: "allow-once", name: "Allow once", kind: "allow_once" },
            { optionId: "allow-always", name: "Always allow", kind: "allow_always" },
            { optionId: "reject", name: "Deny", kind: "reject_once" },
          ],
    [p],
  );

  useEffect(() => {
    if (!p) return;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT") && (t as HTMLTextAreaElement).value) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > options.length || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      const opt = options[n - 1]!;
      answer(session.id, opt.optionId || "allow-once");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p, options, answer, session.id]);

  if (!p) return null;
  return (
    <div className="mx-auto w-full max-w-3xl px-3 md:px-5">
      <div id="permission-card" className="rounded-xl border border-warn/40 bg-surface shadow-window">
        <div className="flex items-start gap-2.5 px-3.5 pt-3">
          <ShieldQuestion className="mt-0.5 size-4 shrink-0 text-warn" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{agentName} wants to {verbFor(p.toolKind)}</p>
            <p className="mt-0.5 truncate font-mono text-2xs text-muted-foreground" title={p.tool}>
              {p.tool.replace(/`/g, "")}
            </p>
          </div>
        </div>
        {p.command ? (
          <pre className="scrollbar-thin mx-3.5 mt-2 max-h-28 overflow-auto rounded-md bg-background/70 p-2.5 font-mono text-2xs text-foreground/90">
            $ {p.command}
          </pre>
        ) : null}
        {p.diffs?.length ? (
          <div className="mx-3.5 mt-2 flex flex-col gap-2">
            {p.diffs.map((d, i) => (
              <DiffView key={`${d.path}-${i}`} diff={d} compact />
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1.5 px-3.5 py-3">
          {options.map((opt, i) => {
            const reject = /reject|deny/i.test(`${opt.kind ?? ""} ${opt.optionId ?? ""}`);
            return (
              <Button
                key={opt.optionId || opt.name}
                size="sm"
                variant={i === 0 ? "default" : reject ? "ghost" : "outline"}
                onClick={() => answer(session.id, opt.optionId || "allow-once")}
              >
                <kbd className="mr-0.5 font-mono text-[10px] opacity-60">{i + 1}</kbd>
                {opt.name || opt.optionId}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function verbFor(kind?: string) {
  switch (kind) {
    case "edit":
      return "edit a file";
    case "delete":
      return "delete a file";
    case "execute":
      return "run a command";
    case "fetch":
      return "fetch from the web";
    case "read":
      return "read a file";
    default:
      return "use a tool";
  }
}

/** Background tasks and subagents the agent started (Claude Code). */
export function TasksCard({ session }: { session: Session }) {
  const tasks = (session.tasks ?? []).filter((t) => t.state === "running" || Date.now() - session.updatedAt < 60_000);
  const [open, setOpen] = useState(true);
  if (!tasks.length) return null;
  const running = tasks.filter((t) => t.state === "running").length;
  return (
    <div className="mx-auto w-full max-w-3xl px-3 md:px-5">
      <div className="rounded-xl border border-border bg-surface">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3 py-2 text-left"
        >
          <Layers className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium">
            {running ? `${running} running in the background` : "Background work finished"}
          </span>
          <ChevronDown className={cn("size-3.5 shrink-0 text-subtle transition-transform", !open && "-rotate-90")} />
        </button>
        {open ? (
          <ul className="flex flex-col gap-0.5 border-t border-border px-3 py-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 py-0.5 text-xs">
                {t.state === "running" ? (
                  <CircleDot className="size-3.5 shrink-0 animate-pulse" />
                ) : t.state === "completed" ? (
                  <Check className="size-3.5 shrink-0 text-success" />
                ) : (
                  <Circle className="size-3.5 shrink-0 text-subtle" />
                )}
                <span className="shrink-0 text-2xs text-subtle">{t.kind === "subagent" ? "Subagent" : "Task"}</span>
                <span className="min-w-0 flex-1 truncate" title={t.summary ?? t.description}>
                  {t.description ?? t.id}
                  {t.summary ? <span className="text-subtle"> — {t.summary}</span> : null}
                </span>
                {t.state === "running" && t.kind === "background" ? (
                  <button
                    type="button"
                    onClick={() => void westcode()?.stopTask?.(session.id, t.id)}
                    className="shrink-0 text-2xs text-muted-foreground hover:text-danger"
                  >
                    Stop
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
