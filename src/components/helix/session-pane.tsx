import { useEffect, useRef, useState } from "react";
import { Download, Folder, GitBranch, Pencil } from "lucide-react";
import { effortLabel } from "@/lib/catalog";
import { westcode, type GitStatus } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { exportTranscript, lastSnippet } from "@/lib/parse-agent";
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SessionTitle session={session} onFocus={() => setActive(session.id)} />
            <StatusLabel status={session.status} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
            <ProviderChip id={session.providerId} />
            <AgentBadge session={session} />
            <CwdPicker session={session} />
            <GitChip session={session} />
            <ExportButton session={session} />
          </div>
        </div>
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

function SessionTitle({
  session,
  onFocus,
}: {
  session: Session;
  onFocus: () => void;
}) {
  const rename = useHelix((s) => s.renameSession);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          rename(session.id, draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            rename(session.id, draft);
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-6 min-w-0 flex-1 rounded-md border border-border bg-window px-1.5 text-sm font-medium outline-none focus:ring-1 focus:ring-ring"
      />
    );
  }
  return (
    <span className="group/title flex min-w-0 items-center gap-1.5">
      <button
        type="button"
        onClick={onFocus}
        onDoubleClick={() => {
          setDraft(session.title);
          setEditing(true);
        }}
        className="truncate text-left text-sm font-medium tracking-tight"
        title="Double-click to rename"
      >
        {session.title}
      </button>
      <button
        type="button"
        aria-label="Rename session"
        onClick={() => {
          setDraft(session.title);
          setEditing(true);
        }}
        className="text-subtle opacity-0 transition-opacity group-hover/title:opacity-100 hover:text-foreground"
      >
        <Pencil className="size-3" />
      </button>
    </span>
  );
}

function AgentBadge({ session }: { session: Session }) {
  const agents = useHelix((s) => s.agents);
  const agent = agents.find((a) => a.id === session.agentId);
  if (!agent) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-2xs font-medium">
      <img
        src={`/avatars/${agent.avatar}.svg`}
        alt=""
        className="size-3.5 rounded-full"
      />
      {agent.name}
    </span>
  );
}

function ExportButton({ session }: { session: Session }) {
  const api = westcode();
  if (!api?.saveText || !session.messages.length) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const name = `${session.title.replace(/[^\w.-]+/g, "-").slice(0, 60) || "session"}.md`;
        void api.saveText(name, exportTranscript(session));
      }}
      className="inline-flex items-center gap-1 hover:text-foreground"
      title="Export transcript as Markdown"
    >
      <Download className="size-3" />
      Export
    </button>
  );
}

function CwdPicker({ session }: { session: Session }) {
  const setCwd = useHelix((s) => s.setSessionCwd);
  const api = westcode();
  return (
    <button
      type="button"
      onClick={async () => {
        if (!api?.pickFolder) return;
        const folder = await api.pickFolder();
        if (folder) setCwd(session.id, folder.path);
      }}
      className="inline-flex min-w-0 items-center gap-1 truncate hover:text-foreground"
      title={api?.pickFolder ? "Change working directory" : session.cwd}
    >
      <Folder className="size-3 shrink-0" />
      <span className="truncate">{session.cwd}</span>
    </button>
  );
}

function GitChip({ session }: { session: Session }) {
  const [git, setGit] = useState<GitStatus | null>(null);
  const api = westcode();
  const status = session.status;
  const cwd = session.cwd;

  useEffect(() => {
    if (!api?.gitStatus) return;
    let dead = false;
    const refresh = () => {
      api
        .gitStatus(cwd)
        .then((g) => {
          if (!dead) setGit(g);
        })
        .catch(() => {});
    };
    refresh();
    const timer = window.setInterval(refresh, 20_000);
    return () => {
      dead = true;
      window.clearInterval(timer);
    };
    // re-poll when a turn finishes so fresh edits show up quickly
  }, [api, cwd, status]);

  if (!git?.repo) return null;
  // Normalize every GitHub remote shape (https, git@:, ssh://git@,
  // ssh.github.com, org-scoped scp) to https://github.com/owner/repo.
  const gh = /(?:^|@|\/\/)(?:ssh\.)?github\.com[/:]([^/\s]+\/[^/\s]+?)(?:\.git)?$/.exec(
    git.remote ?? "",
  );
  const compare = gh
    ? `https://github.com/${gh[1]}/compare/${encodeURIComponent(git.branch ?? "")}?expand=1`
    : null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-2xs">
      <GitBranch className="size-3" />
      <span className="max-w-28 truncate font-medium">{git.branch}</span>
      {git.files ? (
        <span className="tabular-nums">
          <span className="text-claude">+{git.adds}</span>{" "}
          <span className="text-danger">−{git.dels}</span>
        </span>
      ) : (
        <span className="text-subtle">clean</span>
      )}
      {git.ahead ? <span className="text-subtle">↑{git.ahead}</span> : null}
      {git.behind ? <span className="text-subtle">↓{git.behind}</span> : null}
      {compare && (git.ahead || git.files) ? (
        <a
          href={compare}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-accent hover:underline"
        >
          PR
        </a>
      ) : null}
    </span>
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
