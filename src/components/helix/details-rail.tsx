import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { effortLabel, permissionLabel } from "@/lib/catalog";
import { westcode, type GitStatus } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import { gitCwdOf, type Session } from "@/lib/types";
import { ProviderName } from "./provider";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <h3 className="text-2xs font-medium tracking-wide text-subtle uppercase">{title}</h3>
      <div className="mt-1.5 flex flex-col gap-1 text-xs">{children}</div>
    </section>
  );
}

function Row({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-16 shrink-0 text-2xs text-muted-foreground">{k}</span>
      <span className={`min-w-0 flex-1 truncate ${mono ? "font-mono text-2xs" : ""}`}>{v}</span>
    </div>
  );
}

/**
 * Session details (Claude Desktop's details rail): where it runs, how full
 * the context is, what changed, which servers and background tasks are up.
 */
export function DetailsRail({ session, onClose }: { session: Session; onClose: () => void }) {
  const host = useHelix((s) => s.sshHosts.find((h) => h.id === session.hostId));
  const fallbackStyle = useHelix((s) => s.settings.claudeOutputStyle ?? "");
  const [git, setGit] = useState<GitStatus | null>(null);
  const [servers, setServers] = useState<{ name: string; url: string }[]>([]);
  const cwd = gitCwdOf(session);

  useEffect(() => {
    const api = westcode();
    let dead = false;
    const refresh = () => {
      void api?.gitStatus?.(cwd).then((g) => !dead && setGit(g)).catch(() => {});
      if (!session.hostId) void api?.dev?.list(session.cwd).then((r) => !dead && setServers(r.running ?? [])).catch(() => {});
    };
    refresh();
    const t = window.setInterval(refresh, 5000);
    return () => {
      dead = true;
      window.clearInterval(t);
    };
  }, [cwd, session.cwd, session.hostId]);

  const u = session.usage;
  const pct = u && u.size ? Math.min(100, Math.round((u.used / u.size) * 100)) : null;
  const tasks = (session.tasks ?? []).filter((t) => t.state === "running");
  const style = session.providerId === "claude" ? (session.outputStyle ?? fallbackStyle) : "";

  return (
    <aside aria-label="Session details" className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-window">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium">Details</span>
        <button type="button" aria-label="Close details" onClick={onClose} className="rounded p-0.5 text-subtle hover:bg-muted hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        <Card title="Environment">
          <Row k="Machine" v={host ? `${host.name} (SSH)` : "This Mac"} />
          <Row k="Folder" v={session.cwd} mono />
          {git?.repo ? (
            <Row
              k="Branch"
              v={`${git.branch ?? "detached"}${git.ahead ? ` ↑${git.ahead}` : ""}${git.behind ? ` ↓${git.behind}` : ""}${session.worktree ? " · worktree" : ""}`}
              mono
            />
          ) : null}
          <Row k="Agent" v={<ProviderName id={session.providerId} />} />
          <Row k="Model" v={`${session.model || "default"} · ${effortLabel(session.providerId, session.effort)}`} />
          <Row k="Mode" v={permissionLabel(session.permissionMode || "ask")} />
          {style ? <Row k="Style" v={style} /> : null}
        </Card>
        <Card title="Context">
          {pct == null ? (
            <span className="text-muted-foreground">Not reported yet.</span>
          ) : (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-2xs text-muted-foreground">
                {pct}% · {Math.round(u!.used / 1000)}k of {Math.round(u!.size / 1000)}k tokens
              </span>
            </>
          )}
        </Card>
        <Card title="Changes">
          {!git ? (
            <span className="text-muted-foreground">Checking…</span>
          ) : !git.repo ? (
            <span className="text-muted-foreground">Not a git repository.</span>
          ) : git.files ? (
            <span>
              {git.files} file{git.files === 1 ? "" : "s"} · <span className="text-success">+{git.adds ?? 0}</span>{" "}
              <span className="text-destructive">−{git.dels ?? 0}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">No uncommitted changes.</span>
          )}
        </Card>
        {!session.hostId ? (
          <Card title="Servers">
            {servers.length ? (
              servers.map((s) => <Row key={s.name} k={s.name} v={s.url} mono />)
            ) : (
              <span className="text-muted-foreground">None running.</span>
            )}
          </Card>
        ) : null}
        <Card title="Background">
          {tasks.length ? (
            tasks.map((t) => <Row key={t.id} k={t.kind === "subagent" ? "Agent" : "Task"} v={t.description || t.id} />)
          ) : (
            <span className="text-muted-foreground">Nothing running.</span>
          )}
        </Card>
      </div>
    </aside>
  );
}
