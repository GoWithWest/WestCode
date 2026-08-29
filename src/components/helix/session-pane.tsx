import { useEffect, useRef } from "react";
import { Folder } from "lucide-react";
import { effortLabel } from "@/lib/catalog";
import { useHelix } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { lastSnippet } from "@/lib/parse-agent";
import { relativeTime } from "@/lib/utils";
import type { Session } from "@/lib/types";
import { MessageList } from "./blocks";
import { Composer } from "./composer";
import { ProviderChip, ProviderName, StatusLabel, useResolvedProvider } from "./provider";

export function SessionPane({
  session,
  compact,
}: {
  session: Session;
  compact?: boolean;
}) {
  const setActive = useHelix((s) => s.setActive);
  const provider = useResolvedProvider(session.providerId);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [session.messages, session.status]);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-window">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={() => setActive(session.id)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-medium tracking-tight">
                {session.title}
              </h2>
              <StatusLabel status={session.status} />
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-2xs text-muted-foreground">
              <ProviderChip id={session.providerId} />
              <span className="inline-flex items-center gap-1 truncate">
                <Folder className="size-3" />
                {session.cwd}
              </span>
            </div>
          </div>
        </button>
      </header>

      <div
        ref={scroller}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5"
      >
        {session.messages.length === 0 ? (
          <EmptySession
            name={provider.short}
            cwd={session.cwd}
            model={session.model}
            effort={effortLabel(session.providerId, session.effort)}
          />
        ) : (
          <MessageList messages={session.messages} compact={compact} />
        )}
      </div>

      {session.permission ? (
        <div className="border-t border-border bg-surface px-3 py-3 md:px-4">
          <p className="text-xs font-medium">
            {provider.short} wants to run {session.permission.tool}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(session.permission.options.length
              ? session.permission.options
              : [
                  { optionId: "allow-once", name: "Allow once" },
                  { optionId: "allow-always", name: "Allow always" },
                  { optionId: "reject", name: "Reject" },
                ]
            ).map((opt) => (
              <Button
                key={opt.optionId || opt.name}
                size="sm"
                variant={
                  (opt.kind || opt.optionId || "").toLowerCase().includes("reject")
                    ? "ghost"
                    : "default"
                }
                onClick={() =>
                  useHelix
                    .getState()
                    .answerPermission(
                      session.id,
                      opt.optionId || "allow-once",
                    )
                }
              >
                {opt.name || opt.optionId}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <Composer key={session.id} session={session} />
    </section>
  );
}

function EmptySession({
  name,
  cwd,
  model,
  effort,
}: {
  name: string;
  cwd: string;
  model: string;
  effort: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-sm font-medium">{name} is ready</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {model} · {effort} · {cwd}. Attach files with +, @ another session, or
        type / for commands.
      </p>
    </div>
  );
}

export function SessionCard({
  session,
  onOpen,
}: {
  session: Session;
  onOpen: () => void;
}) {
  const clock = useHelix((s) => s.clock);
  const last = session.messages[session.messages.length - 1];
  const snippet = last ? lastSnippet(last.blocks) : "New session";
  const provider = useResolvedProvider(session.providerId);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full min-h-40 flex-col overflow-hidden rounded-lg border border-border bg-surface text-left transition-opacity duration-(--motion-quick) hover:border-border-strong"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium">
          <ProviderName id={session.providerId} />
          <span className="text-subtle">·</span>
          <span className="truncate text-muted-foreground">{session.cwd}</span>
        </span>
        <StatusLabel status={session.status} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug tracking-tight">
          {session.title}
        </h3>
        <p className="mt-2 line-clamp-4 flex-1 text-xs leading-relaxed text-muted-foreground">
          {snippet}
        </p>
        <div className="mt-3 flex items-center justify-between text-2xs text-subtle">
          <span>
            {session.model}
            <span className="text-subtle"> · </span>
            {effortLabel(session.providerId, session.effort)}
            <span className="text-subtle"> · </span>
            {relativeTime(session.updatedAt, clock)}
          </span>
          <span className="opacity-0 transition-opacity duration-(--motion-quick) group-hover:opacity-100">
            Open
          </span>
        </div>
      </div>
    </button>
  );
}
