import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, Blocks, Plus, Search, Settings2, SlidersHorizontal, Users, X } from "lucide-react";
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
  const setNewOpen = useHelix((s) => s.setNewOpen);
  const providers = useAllProviders();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const q = query.trim().toLowerCase();
  const pool = sessions.filter((s) => showArchived || !s.archivedAt);
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
          <span className="ml-auto text-2xs tabular-nums text-subtle">
            {liveAddons.length}
          </span>
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
          r.cwd.toLowerCase().includes(query),
      )
    : pool;
  const visible = expanded || query ? matched : matched.slice(0, 5);
  if (!matched.length && !errors.length) return null;

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
      <ul className="flex flex-col">
        {visible.map((r) => (
          <li key={`${r.providerId}:${r.agentSessionId}`}>
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
