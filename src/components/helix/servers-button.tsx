import { useCallback, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Globe, Loader2, Play, Square } from "lucide-react";
import { westcode } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import type { Session } from "@/lib/types";

type DevList = Awaited<ReturnType<NonNullable<NonNullable<ReturnType<typeof westcode>>["dev"]>["list"]>>;

/**
 * Claude Desktop's dev-server preview: the configurations in the project's
 * .claude/launch.json, started on request and shown in the preview pane.
 */
export function ServersButton({ session }: { session: Session }) {
  const api = westcode()?.dev;
  const [list, setList] = useState<DevList | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!api) return;
    setList(await api.list(session.cwd));
  }, [api, session.cwd]);

  if (!api) return null;
  const show = (url: string, name: string) =>
    useHelix.setState((st) => ({
      sessions: st.sessions.map((x) => (x.id === session.id ? { ...x, artifact: { title: name, url } } : x)),
    }));
  const running = new Map((list?.running ?? []).map((r) => [r.name, r]));

  return (
    <Popover.Root onOpenChange={(o) => o && void refresh()}>
      <Popover.Trigger asChild>
        <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" title="Dev servers (.claude/launch.json)">
          <Globe className="size-3" />
          Servers
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} className="z-50 w-80 rounded-lg border border-border bg-window p-3 text-xs shadow-window">
          <p className="font-medium">Dev servers</p>
          {!list ? (
            <p className="mt-2 text-subtle">Loading…</p>
          ) : list.error ? (
            <p className="mt-2 text-destructive">{list.error}</p>
          ) : !list.configs?.length ? (
            <p className="mt-2 leading-relaxed text-muted-foreground">
              No <span className="font-mono">.claude/launch.json</span> in this folder. Add one (name, runtimeExecutable,
              runtimeArgs, port) — or ask the agent to — and its servers show up here.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {list.configs.map((c) => {
                const r = running.get(c.name);
                return (
                  <li key={c.name} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate">
                      {c.name}
                      {r ? <span className="ml-1 text-subtle">:{r.port}</span> : null}
                    </span>
                    {r ? (
                      <>
                        <button type="button" onClick={() => show(r.url, c.name)} className="rounded px-1.5 py-0.5 hover:bg-muted">
                          Open
                        </button>
                        <button
                          type="button"
                          aria-label={`Stop ${c.name}`}
                          onClick={async () => {
                            await api.stop(session.cwd, c.name);
                            await refresh();
                          }}
                          className="rounded p-1 hover:bg-muted"
                        >
                          <Square className="size-3" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        aria-label={`Start ${c.name}`}
                        onClick={async () => {
                          setBusy(c.name);
                          setError("");
                          const res = await api.start(session.cwd, c.name);
                          setBusy("");
                          if (res.ok && res.url) show(res.url, c.name);
                          else setError(res.error ?? "Could not start it.");
                          await refresh();
                        }}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted disabled:opacity-50"
                      >
                        {busy === c.name ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                        Start
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {error ? <p className="mt-2 text-2xs text-destructive">{error}</p> : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
