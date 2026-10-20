import { FilesPane } from "./files-pane";
import { TerminalPane } from "./terminal-pane";
import { PrChip } from "./pr-chip";
import { useEffect, useRef, useState } from "react";
import { Code2, Download, Folder, FolderTree, GitBranch, GitFork, Pencil, Server, SquareTerminal, Terminal, X } from "lucide-react";
import { effortLabel } from "@/lib/catalog";
import { westcode, type GitStatus } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import { exportTranscript, lastSnippet } from "@/lib/parse-agent";
import { relativeTime } from "@/lib/utils";
import type { Session } from "@/lib/types";
import { MessageList } from "./blocks";
import { Composer } from "./composer";
import { ProviderChip, ProviderName, StatusLabel, useResolvedProvider } from "./provider";
import { GoalCard, PermissionCard, PlanCard, TasksCard } from "./session-extras";
import { AgentAvatar } from "./agents-view";
import { SourceControlPanel } from "./source-control";
import { ArtifactPane } from "./artifact-pane";
import { dotStateFor } from "@/lib/dots";

export function SessionPane({ session, compact }: { session: Session; compact?: boolean }) {
  const setActive = useHelix((s) => s.setActive);
  const compactPref = useHelix((s) => s.settings.transcriptCompact);
  const loadingHistory = useHelix((s) => s.loadingHistory.includes(session.id));
  const provider = useResolvedProvider(session.providerId);
  const persona = useHelix((s) => s.agents.find((a) => a.id === session.agentId));
  const agentName = persona?.name ?? provider.short;
  const [scmOpen, setScmOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const side = useHelix((s) =>
    session.sideOpen ? s.sessions.find((x) => x.id === session.sideOpen) : undefined,
  );
  const scroller = useRef<HTMLDivElement>(null);
  // Follow the stream only while the reader is at the bottom; scrolling up
  // to read earlier work must not be yanked back down by every chunk.
  const pinned = useRef(true);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !pinned.current) return;
    el.scrollTop = el.scrollHeight;
  }, [session.messages, session.status, session.permission]);

  useEffect(() => {
    pinned.current = true;
  }, [session.id]);

  // An approval request always comes into view, wherever the reader was.
  useEffect(() => {
    if (!session.permission) return;
    pinned.current = true;
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [session.permission]);

  // ⌘⇧G toggles source control for the focused pane (not split panes).
  useEffect(() => {
    if (compact) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setScmOpen((v) => !v);
      }
      // Ctrl+` toggles the terminal pane, as in Claude Desktop.
      if (e.ctrlKey && !e.metaKey && (e.key === "`" || e.code === "Backquote")) {
        e.preventDefault();
        setTermOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compact]);

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
            {session.hostId ? <HostChip hostId={session.hostId} /> : null}
            <CwdPicker session={session} />
            {/* Source control and the editor act on this Mac's files. */}
            {!session.hostId ? (
              <GitChip session={session} open={scmOpen} onToggle={() => setScmOpen((v) => !v)} />
            ) : null}
            {!session.hostId ? <PrChip session={session} /> : null}
            {session.worktree ? (
              <span
                className="rounded-full border border-border px-1.5 py-px text-foreground"
                title={`Its own worktree on branch ${session.worktree.branch}, at ${session.worktree.path}. Removed when the session is archived.`}
              >
                worktree
              </span>
            ) : null}
            {!compact ? (
              <>
                <ExportButton session={session} />
                {session.agentSessionId && !session.hostId ? <ForkButton session={session} /> : null}
                <button
                  type="button"
                  onClick={() => setTermOpen((v) => !v)}
                  aria-pressed={termOpen}
                  className={`inline-flex items-center gap-1 hover:text-foreground ${termOpen ? "text-foreground" : ""}`}
                  title={`Terminal in this folder${session.hostId ? " on the host" : ""} (Ctrl+\`)`}
                >
                  <SquareTerminal className="size-3" />
                  Terminal
                </button>
                <button
                  type="button"
                  onClick={() => setFilesOpen((v) => !v)}
                  aria-pressed={filesOpen}
                  className={`inline-flex items-center gap-1 hover:text-foreground ${filesOpen ? "text-foreground" : ""}`}
                  title="Files in this session's folder"
                >
                  <FolderTree className="size-3" />
                  Files
                </button>
                <ResumeButton session={session} />
                {!session.hostId ? <EditorButton session={session} /> : null}
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={scroller}
            onScroll={(e) => {
              const el = e.currentTarget;
              pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
            className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-5 md:px-5"
          >
            {session.messages.length === 0 ? (
              <EmptySession
                loading={loadingHistory}
                name={provider.short}
                cwd={session.cwd}
                model={session.model}
                effort={effortLabel(session.providerId, session.effort)}
              />
            ) : (
              <MessageList messages={session.messages} compact={compact || compactPref} sessionId={session.id}
              awaiting={session.permission?.tool}
              queuedIds={session.queued?.flatMap((q) => (q.msgId ? [q.msgId] : []))} />
            )}
          </div>

          <div className="flex flex-col gap-2 pb-2 empty:hidden">
            <PermissionCard session={session} agentName={agentName} />
            {!session.permission ? <PlanCard session={session} /> : null}
          {!session.permission ? <TasksCard session={session} /> : null}
          <GoalCard session={session} />
          </div>

          <Composer key={session.id} session={session} />
          {termOpen && !compact ? (
            <div className="h-[38%] min-h-44 shrink-0">
              <TerminalPane key={session.id} session={session} onClose={() => setTermOpen(false)} />
            </div>
          ) : null}
        </div>
        {filesOpen && !compact ? <FilesPane session={session} onClose={() => setFilesOpen(false)} /> : null}
        {scmOpen ? (
          <SourceControlPanel session={session} onClose={() => setScmOpen(false)} />
        ) : null}
        {!scmOpen && session.artifact ? <ArtifactPane session={session} /> : null}
        {!scmOpen && !session.artifact && side ? (
          <aside
            aria-label="Side chat"
            className="flex h-full min-h-0 w-[min(26rem,45vw)] shrink-0 flex-col border-l border-border bg-surface"
          >
            <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
              <span className="truncate text-xs font-medium">Side chat · read-only</span>
              <button
                type="button"
                aria-label="Close side chat"
                onClick={() =>
                  useHelix.setState((st) => ({
                    sessions: st.sessions.map((x) => (x.id === session.id ? { ...x, sideOpen: undefined } : x)),
                  }))
                }
                className="text-subtle hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <SessionPane session={side} compact />
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function SessionTitle({ session, onFocus }: { session: Session; onFocus: () => void }) {
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
  const clock = useHelix((s) => s.clock);
  const agent = agents.find((a) => a.id === session.agentId);
  if (!agent) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 py-0.5 pr-2 pl-0.5 text-2xs font-medium">
      <AgentAvatar agent={agent} state={dotStateFor(session, clock)} size={18} />
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

function ResumeButton({ session }: { session: Session }) {
  const [copied, setCopied] = useState(false);
  const host = useHelix((s) => s.sshHosts.find((h) => h.id === session.hostId));
  const bin =
    session.providerId === "grok"
      ? "grok"
      : session.providerId === "claude"
        ? "claude"
        : session.providerId === "codex"
          ? "codex"
          : null;
  if (!bin) return null;
  const resume =
    bin === "codex"
      ? `codex resume${session.agentSessionId ? ` ${session.agentSessionId}` : ""}`
      : session.agentSessionId
        ? `${bin} --resume ${session.agentSessionId}`
        : `${bin} --resume`;
  const local = `cd ${JSON.stringify(session.cwd)} && ${resume}`;
  // On an SSH host the CLI and its transcript are there: resume there.
  const cmd = host
    ? `ssh -t ${host.port ? `-p ${host.port} ` : ""}${host.user ? `${host.user}@` : ""}${host.host} ${JSON.stringify(local)}`
    : local;
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(cmd);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 hover:text-foreground"
      title={`Copy: ${cmd}`}
    >
      <Terminal className="size-3" />
      {copied ? "Copied" : "Copy resume"}
    </button>
  );
}

function ForkButton({ session }: { session: Session }) {
  const fork = useHelix((s) => s.forkSession);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy || session.status === "running"}
      onClick={async () => {
        setBusy(true);
        try {
          await fork(session.id);
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-50"
      title="Fork: copy this conversation into a new session to try another direction"
    >
      <GitFork className="size-3" />
      {busy ? "Forking…" : "Fork"}
    </button>
  );
}

function HostChip({ hostId }: { hostId: string }) {
  const host = useHelix((s) => s.sshHosts.find((h) => h.id === hostId));
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-px text-foreground"
      title={host ? `Runs on ${host.user ? `${host.user}@` : ""}${host.host} over SSH` : "SSH host not set up any more"}
    >
      <Server className="size-3" />
      {host?.name ?? hostId}
    </span>
  );
}

function EditorButton({ session }: { session: Session }) {
  const api = westcode();
  if (!api?.openEditor) return null;
  return (
    <button
      type="button"
      onClick={() => void api.openEditor(session.cwd)}
      className="inline-flex items-center gap-1 hover:text-foreground"
      title="Open folder in your editor (Cursor / VS Code / Zed)"
    >
      <Code2 className="size-3" />
      Editor
    </button>
  );
}

function CwdPicker({ session }: { session: Session }) {
  const setCwd = useHelix((s) => s.setSessionCwd);
  const api = westcode();
  return (
    <button
      type="button"
      disabled={Boolean(session.hostId)}
      onClick={async () => {
        if (!api?.pickFolder || session.hostId) return;
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

function GitChip({
  session,
  open,
  onToggle,
}: {
  session: Session;
  open: boolean;
  onToggle: () => void;
}) {
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

  if (!git?.repo) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label="Source control"
        title="Source control: repositories in this folder (⌘⇧G)"
        className={
          open
            ? "inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-muted px-2 py-0.5 text-2xs"
            : "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-2xs hover:text-foreground"
        }
      >
        <GitBranch className="size-3" />
        Source control
      </button>
    );
  }
  // Normalize every GitHub remote shape (https, git@:, ssh://git@,
  // ssh.github.com, org-scoped scp) to https://github.com/owner/repo.
  const gh = /(?:^|@|\/\/)(?:ssh\.)?github\.com[/:]([^/\s]+\/[^/\s]+?)(?:\.git)?$/.exec(
    git.remote ?? "",
  );
  const compare = gh
    ? `https://github.com/${gh[1]}/compare/${encodeURIComponent(git.branch ?? "")}?expand=1`
    : null;
  return (
    <span
      className={
        open
          ? "inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-muted px-2 py-0.5 text-2xs"
          : "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-2xs"
      }
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label="Source control"
        title="Changes, commit, branches and history (⌘⇧G)"
        className="inline-flex items-center gap-1.5 hover:text-foreground"
      >
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
      </button>
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
  loading,
  name,
  cwd,
  model,
  effort,
}: {
  loading?: boolean;
  name: string;
  cwd: string;
  model: string;
  effort: string;
}) {
  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center" role="status">
        <p className="text-sm font-medium">Loading this conversation from {name}…</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {name} keeps the transcript; WestCode is reading it back. You can type now.
        </p>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-sm font-medium">{name} is ready</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {model} · {effort} · {cwd}. Attach files with +, @ another session, or type / for commands.
      </p>
    </div>
  );
}

export function SessionCard({ session, onOpen }: { session: Session; onOpen: () => void }) {
  const clock = useHelix((s) => s.clock);
  const last = session.messages[session.messages.length - 1];
  const snippet = last ? lastSnippet(last.blocks) : "New session";

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
