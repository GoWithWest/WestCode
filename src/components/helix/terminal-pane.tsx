import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { westcode } from "@/lib/desktop";
import type { Session } from "@/lib/types";

/** One shell, drawn with xterm.js, fed by the main process's pty. */
function Shell({ id, session, visible }: { id: string; session: Session; visible: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const fit = useRef<FitAddon | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const api = westcode()?.term;
    if (!api || !host.current) return;
    const css = getComputedStyle(document.documentElement);
    const term = new Terminal({
      fontFamily: css.getPropertyValue("--font-mono") || "ui-monospace, Menlo, monospace",
      fontSize: 12,
      cursorBlink: true,
      allowProposedApi: false,
      theme: { background: "#0e0e10", foreground: "#e6e6e6" },
    });
    const f = new FitAddon();
    term.loadAddon(f);
    term.open(host.current);
    fit.current = f;
    try {
      f.fit();
    } catch {
      /* hidden */
    }
    let dead = false;
    const offData = api.onData((m) => {
      if (m.id === id) term.write(m.data);
    });
    const offExit = api.onExit((m) => {
      if (m.id === id) term.write(`\r\n\x1b[2m[process exited ${m.code}]\x1b[0m\r\n`);
    });
    const sub = term.onData((d) => api.write(id, d));
    const subResize = term.onResize(({ cols, rows }) => api.resize(id, cols, rows));
    void api.open({ id, cwd: session.cwd, hostId: session.hostId, cols: term.cols, rows: term.rows }).then((r) => {
      if (!dead && !r.ok) setError(r.error || "Could not start the terminal.");
    });
    const ro = new ResizeObserver(() => {
      try {
        f.fit();
      } catch {
        /* hidden */
      }
    });
    ro.observe(host.current);
    return () => {
      dead = true;
      ro.disconnect();
      sub.dispose();
      subResize.dispose();
      offData();
      offExit();
      api.close(id);
      term.dispose();
    };
    // The shell belongs to this tab; a later cwd change opens a new tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (visible) window.setTimeout(() => fit.current?.fit(), 0);
  }, [visible]);

  return (
    <div className={visible ? "relative h-full min-h-0" : "hidden"}>
      {error ? <p className="p-3 text-xs text-destructive">{error}</p> : null}
      <div ref={host} className="h-full w-full px-2 py-1" />
    </div>
  );
}

/**
 * Claude Desktop's terminal pane (Ctrl+`): shells in the session's folder,
 * on the same machine as the session (this Mac or its SSH host), in tabs.
 */
export function TerminalPane({ session, onClose }: { session: Session; onClose: () => void }) {
  const [tabs, setTabs] = useState<string[]>(() => [`${session.id}:1`]);
  const [active, setActive] = useState(tabs[0]!);
  const counter = useRef(1);

  const add = () => {
    counter.current += 1;
    const id = `${session.id}:${counter.current}`;
    setTabs((t) => [...t, id]);
    setActive(id);
  };
  const close = (id: string) => {
    setTabs((t) => {
      const next = t.filter((x) => x !== id);
      if (!next.length) onClose();
      else if (active === id) setActive(next[next.length - 1]!);
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-border bg-[#0e0e10]" aria-label="Terminal">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1 text-2xs">
        {tabs.map((id, i) => (
          <span
            key={id}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${id === active ? "bg-muted text-foreground" : "text-subtle"}`}
          >
            <button type="button" onClick={() => setActive(id)}>
              Terminal {i + 1}
            </button>
            <button type="button" aria-label={`Close terminal ${i + 1}`} onClick={() => close(id)} className="hover:text-foreground">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <button type="button" aria-label="New terminal" onClick={add} className="rounded p-0.5 text-subtle hover:bg-muted hover:text-foreground">
          <Plus className="size-3.5" />
        </button>
        <span className="ml-auto truncate text-subtle">{session.cwd}</span>
        <button type="button" aria-label="Hide terminal" onClick={onClose} className="rounded p-0.5 text-subtle hover:bg-muted hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {tabs.map((id) => (
          <Shell key={id} id={id} session={session} visible={id === active} />
        ))}
      </div>
    </div>
  );
}
