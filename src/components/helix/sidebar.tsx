import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, Blocks, Brain, CircleDashed, Hammer, Plus, Search, Server, Settings2, SlidersHorizontal, Users, X } from "lucide-react";
import { dotActivity, dotStateFor } from "@/lib/dots";
import type { Session } from "@/lib/types";
import { AgentAvatar } from "./agents-view";
import { westcode } from "@/lib/desktop";
import { cliSessionTitle, useHelix } from "@/lib/store";
import { relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProviderDot, StatusLabel, useAllProviders } from "./provider";

export function Sidebar() {
  const sessions = useHelix((s) => s.sessions);
  const activeId = useHelix((s) => s.activeId);
  const view = useHelix((s) => s.view);
  const clock = useHelix((s) => s.clock);
  const liveAddons = useHelix((s) => s.liveAddons);
  const setActive = useHelix((s) => s.setActive);
  const setView = useHelix((s) => s.setView);
  const learnPending = useHelix((s) => s.learnPending.length);
  const setNewOpen = useHelix((s) => s.setNewOpen);
  const providers = useAllProviders();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const q = query.trim().toLowerCase();
  // Side chats live in their parent's drawer, not in the list.
  const pool = sessions.filter((s) => !s.sideOf && (showArchived || !s.archivedAt));
  const archivedCount = sessions.filter((s) => s.archivedAt).length;
  const visible = q
    ? pool.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.providerId.toLowerCase().includes(q) ||
          s.cwd.toLowerCase().includes(q),
      )
    : pool;

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
      <div className="relative px-3 pb-2">
        <Search className="pointer-events-none absolute top-1/2 left-5 size-3 -translate-y-[80%] text-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sessions"
          className="h-7 w-full rounded-md border border-border bg-window pr-2 pl-6 text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
        />
      </div>
      <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
        {visible.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {q ? "No matches" : "No sessions yet"}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {visible.map((ses) => {
              const active = ses.id === activeId && view === "focus";
              return (
                <li key={ses.id} className="group/row relative">
                  <button
                    type="button"
                    aria-label={ses.archivedAt ? `Restore ${ses.title}` : `Archive ${ses.title}`}
                    onClick={() =>
                      useHelix.getState().archiveSession(ses.id, !ses.archivedAt)
                    }
                    className="absolute top-1.5 right-6 z-10 rounded p-0.5 text-subtle opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-foreground"
                  >
                    {ses.archivedAt ? (
                      <ArchiveRestore className="size-3" />
                    ) : (
                      <Archive className="size-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${ses.title}`}
                    onClick={() => {
                      if (window.confirm(`Delete session "${ses.title}"?`)) {
                        useHelix.getState().removeSession(ses.id);
                      }
                    }}
                    className="absolute top-1.5 right-1.5 z-10 rounded p-0.5 text-subtle opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActive(ses.id)}
                    className={`flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors duration-(--motion-quick) ${
                      active ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <SessionGlyph session={ses} />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {ses.title}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2 pl-[1.375rem] text-2xs text-subtle">
                      <SessionState session={ses} unread={!active && ses.updatedAt > (ses.seenAt ?? 0) && ses.status === "waiting"} />
                      <span className="shrink-0 tabular-nums">
                        {relativeTime(ses.updatedAt, clock)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {archivedCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="mt-1 w-full px-2.5 py-1 text-left text-2xs text-subtle hover:text-foreground"
          >
            {showArchived
              ? "Hide archived"
              : `${archivedCount} archived — show`}
          </button>
        ) : null}
        <CliSessionList query={q} />
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
          <span className="ml-auto text-2xs tabular-nums text-subtle">{liveAddons.length}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={
            view === "agents"
              ? "w-full justify-start bg-muted/60"
              : "w-full justify-start text-muted-foreground"
          }
          onClick={() => setView("agents")}
        >
          <Users className="size-3.5" />
          Agents
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={view === "memory" ? "w-full justify-start bg-muted/60" : "w-full justify-start text-muted-foreground"}
          onClick={() => setView("memory")}
        >
          <Brain className="size-3.5" />
          Memory
          {learnPending ? (
            <span
              className="ml-auto rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground tabular-nums"
              title={`${learnPending} learning proposal${learnPending === 1 ? "" : "s"} to review`}
            >
              {learnPending}
            </span>
          ) : null}
        </Button>
        <WestCreateNav active={view === "westcreate"} onOpen={() => setView("westcreate")} />
        <Button
          variant="ghost"
          size="sm"
          className={
            view === "settings"
              ? "w-full justify-start bg-muted/60"
              : "w-full justify-start text-muted-foreground"
          }
          onClick={() => setView("settings")}
        >
          <SlidersHorizontal className="size-3.5" />
          Settings
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

/**
 * Sessions the CLIs themselves have stored — including ones started in a
 * terminal, which never existed in WestCode's own list. Opening one resumes
 * the real agent session and replays its transcript.
 */
function CliSessionList({ query }: { query: string }) {
  const rows = useHelix((s) => s.cliSessions);
  const status = useHelix((s) => s.cliSessionStatus);
  const errors = useHelix((s) => s.cliSessionErrors);
  const sessions = useHelix((s) => s.sessions);
  const refresh = useHelix((s) => s.refreshCliSessions);
  const open = useHelix((s) => s.openCliSession);
  const elsewhere = useHelix((s) => s.cliSessionsElsewhere);
  const hosts = useHelix((s) => s.sshHosts);
  const setView = useHelix((s) => s.setView);
  const hostName = (id?: string) => (id ? (hosts.find((h) => h.id === id)?.name ?? id) : "");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (status === "idle") void refresh();
  }, [status, refresh]);

  // Anything already open in a pane is in the list above; don't show it
  // twice. Archived panes are not in that list, so their CLI row stays —
  // clicking it brings the pane back.
  const openIds = new Set(
    sessions
      .filter((s) => !s.archivedAt)
      .map((s) => s.agentSessionId)
      .filter(Boolean) as string[],
  );
  const pool = rows.filter((r) => !openIds.has(r.agentSessionId));
  const matched = query
    ? pool.filter(
        (r) =>
          cliSessionTitle(r).toLowerCase().includes(query) ||
          r.providerId.toLowerCase().includes(query) ||
          r.cwd.toLowerCase().includes(query) ||
          hostName(r.hostId).toLowerCase().includes(query),
      )
    : pool;
  const visible = expanded || query ? matched : matched.slice(0, 5);
  if (!matched.length && !errors.length && !elsewhere) return null;

  return (
    <div className="mt-3 border-t border-border pt-2">
      <div className="flex items-center justify-between px-2.5 pb-1">
        <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
          From your CLIs
        </span>
        <button
          type="button"
          aria-label="Refresh CLI sessions"
          onClick={() => void refresh()}
          className="text-2xs text-subtle hover:text-foreground"
        >
          {status === "loading" ? "…" : "↻"}
        </button>
      </div>
      {errors.length ? (
        <p className="px-2.5 pb-1 text-2xs leading-relaxed text-subtle">
          {errors.join(" · ").slice(0, 200)}
        </p>
      ) : null}
      {elsewhere && !hosts.length ? (
        <button
          type="button"
          onClick={() => setView("settings")}
          className="px-2.5 pb-1 text-left text-2xs leading-relaxed text-subtle hover:text-foreground"
        >
          {elsewhere} session{elsewhere === 1 ? " is" : "s are"} on another machine (SSH). Add the SSH host to open
          {elsewhere === 1 ? " it" : " them"} →
        </button>
      ) : null}
      <ul className="flex flex-col">
        {visible.map((r) => (
          <li key={`${r.hostId ?? "local"}:${r.providerId}:${r.agentSessionId}`}>
            <button
              type="button"
              disabled={busy === r.agentSessionId}
              onClick={async () => {
                setBusy(r.agentSessionId);
                try {
                  await open(r);
                } finally {
                  setBusy(null);
                }
              }}
              className="w-full rounded-md px-2.5 py-1.5 text-left hover:bg-muted/50 disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                <ProviderDot id={r.providerId} />
                <span className="min-w-0 flex-1 truncate text-xs">
                  {cliSessionTitle(r)}
                </span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 pl-4 text-2xs text-subtle">
                {r.hostId ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-muted-foreground" title={`On ${hostName(r.hostId)} over SSH`}>
                    <Server className="size-2.5" />
                    {hostName(r.hostId)}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">
                  {r.cwd.split("/").filter(Boolean).pop() || r.cwd}
                </span>
                <span className="shrink-0">
                  {busy === r.agentSessionId
                    ? "opening…"
                    : r.updatedAt
                      ? relativeTime(r.updatedAt)
                      : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!query && matched.length > 5 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 w-full px-2.5 py-1 text-left text-2xs text-subtle hover:text-foreground"
        >
          {expanded ? "Show fewer" : `${matched.length - 5} more — show all`}
        </button>
      ) : null}
    </div>
  );
}

/** Shown once WestCreate is on this Mac; the dot says whether it is open. */
function WestCreateNav({ active, onOpen }: { active: boolean; onOpen: () => void }) {
  const [state, setState] = useState<{ installed: boolean; running: boolean } | null>(null);
  useEffect(() => {
    const api = westcode();
    if (!api?.westcreate) return;
    let dead = false;
    const tick = () =>
      void api.westcreate!()
        .then((s) => !dead && setState({ installed: s.installed, running: s.running }))
        .catch(() => {});
    tick();
    const t = window.setInterval(tick, 30_000);
    return () => {
      dead = true;
      window.clearInterval(t);
    };
  }, []);
  if (!state?.installed) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={active ? "w-full justify-start bg-muted/60" : "w-full justify-start text-muted-foreground"}
      onClick={onOpen}
    >
      <Hammer className="size-3.5" />
      WestCreate
      <span
        className={state.running ? "ml-auto size-1.5 rounded-full bg-success" : "ml-auto size-1.5 rounded-full bg-subtle"}
        aria-label={state.running ? "WestCreate is open" : "WestCreate is closed"}
      />
    </Button>
  );
}

/** Persona character for agent sessions, provider dot otherwise. */
function SessionGlyph({ session }: { session: Session }) {
  const agent = useHelix((s) => s.agents.find((a) => a.id === session.agentId));
  const clock = useHelix((s) => s.clock);
  if (agent) return <AgentAvatar agent={agent} state={dotStateFor(session, clock)} size={16} />;
  return (
    <span className="grid size-4 shrink-0 place-items-center">
      <ProviderDot id={session.providerId} />
    </span>
  );
}

/**
 * One line on where a session stands (Claude/Grok sidebar style): needs
 * approval (amber), working (live activity), unread result (blue), error.
 */
function SessionState({ session, unread }: { session: Session; unread: boolean }) {
  if (session.permission) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-warn">
        <span className="size-1.5 shrink-0 rounded-full bg-warn" />
        <span className="truncate">Needs approval</span>
      </span>
    );
  }
  if (session.status === "running") {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <CircleDashed className="size-3 shrink-0 animate-spin" />
        <span className="truncate">{dotActivity(session)}</span>
      </span>
    );
  }
  if (session.status === "error") return <StatusLabel status="error" />;
  if (unread) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-accent">
        <span className="size-1.5 rounded-full bg-[#4d9bff]" />
        New reply
      </span>
    );
  }
  return <span className="text-subtle">{session.status === "waiting" ? "Your turn" : "Idle"}</span>;
}
