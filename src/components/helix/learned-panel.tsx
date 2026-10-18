import { useEffect, useState } from "react";
import { Brain, Check, Pencil, Sparkles, X } from "lucide-react";
import { diffLines, withContext } from "@/lib/diff";
import { memoryEntries } from "@/lib/memory-text";
import { westcode, type LearnProposal } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import { cn, relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DiffRows } from "./blocks";

/**
 * Library → Learned. What the desk's reviewers proposed after past sessions
 * (new or improved skills, memory facts), each with its diff and the reason,
 * waiting for Approve / Edit / Reject; and the memory as it stands.
 */
export function LearnedPanel() {
  const pending = useHelix((s) => s.learnPending);
  const learning = useHelix((s) => s.settings.learning);
  const update = useHelix((s) => s.updateSettings);
  const refresh = useHelix((s) => s.refreshLearning);
  const [memory, setMemory] = useState<{ user: string; memory: string } | null>(null);

  useEffect(() => {
    void refresh();
    void westcode()?.learn?.memory().then(setMemory);
  }, [refresh, pending.length]);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-md text-xs text-muted-foreground">
          After enough turns or tool calls, a read-only reviewer looks back at a session and proposes
          skills and memory worth keeping. Type <code className="font-mono text-2xs">/reflect</code> to review one now.
        </p>
        <div className="inline-flex rounded-md border border-border p-0.5" role="radiogroup" aria-label="Learning">
          {(
            [
              ["ask", "Ask first"],
              ["auto", "Automatic"],
              ["off", "Off"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={learning === id}
              onClick={() => update({ learning: id })}
              className={cn(
                "rounded-sm px-2.5 py-1 text-xs",
                learning === id ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {pending.length ? (
        <ul className="flex flex-col gap-2">
          {pending.map((p) => (
            <ProposalCard key={p.id} p={p} />
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <Sparkles className="mx-auto size-4 text-subtle" />
          <p className="mt-2 text-sm text-muted-foreground">Nothing waiting for you.</p>
        </div>
      )}

      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Brain className="size-4" /> Desk memory
        </h3>
        <p className="mt-1 text-2xs text-muted-foreground">
          Given to every new Claude, Grok and Codex session on its first turn.
        </p>
        <MemoryList title="About you" text={memory?.user ?? ""} />
        <MemoryList title="Your setup and projects" text={memory?.memory ?? ""} />
      </section>
    </div>
  );
}

function MemoryList({ title, text }: { title: string; text: string }) {
  const entries = memoryEntries(text);
  return (
    <div className="mt-3">
      <p className="text-2xs font-medium tracking-wide text-subtle uppercase">{title}</p>
      {entries.length ? (
        <ul className="mt-1 flex flex-col gap-0.5">
          {entries.map((e) => (
            <li key={e} className="text-xs leading-relaxed">
              · {e}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-subtle">Nothing yet.</p>
      )}
    </div>
  );
}

function ProposalCard({ p }: { p: LearnProposal }) {
  const decide = useHelix((s) => s.decideProposal);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p.kind === "skill" ? p.after : (p.text ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const title =
    p.kind === "skill"
      ? `${p.action === "update" ? "Improve skill" : "New skill"} ${p.name}`
      : `${p.op === "add" ? "Remember" : p.op === "replace" ? "Update memory" : "Forget"} · ${p.target === "user" ? "about you" : "your setup"}`;

  async function act(verdict: "approve" | "reject") {
    setBusy(true);
    const err = await decide(p.id, verdict, editing ? draft : undefined);
    setBusy(false);
    setError(err);
  }

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-start gap-3 px-4 pt-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted">
          {p.kind === "skill" ? <Sparkles className="size-3.5" /> : <Brain className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{p.why}</p>
          <p className="mt-0.5 text-2xs text-subtle">{relativeTime(p.createdAt, Date.now())}</p>
        </div>
      </div>
      <div className="px-4 pt-2">
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={p.kind === "skill" ? 14 : 2}
            aria-label="Edit proposal"
            className="w-full resize-y rounded-md border border-border bg-window p-2.5 font-mono text-2xs outline-none focus:ring-1 focus:ring-ring"
          />
        ) : p.kind === "memory" && p.op === "add" ? (
          <p className="rounded-md bg-success/10 px-3 py-2 text-xs">{p.text}</p>
        ) : (
          <DiffRows rows={withContext(diffLines(p.before, p.after), 3)} compact />
        )}
      </div>
      {error ? <p className="px-4 pt-2 text-2xs text-danger">{error}</p> : null}
      <div className="flex gap-1.5 px-4 py-3">
        <Button size="sm" disabled={busy} onClick={() => void act("approve")}>
          <Check className="size-3.5" />
          {editing ? "Save & approve" : "Approve"}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing((v) => !v)}>
          <Pencil className="size-3.5" />
          {editing ? "Show diff" : "Edit"}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act("reject")}>
          <X className="size-3.5" />
          Reject
        </Button>
      </div>
    </li>
  );
}
