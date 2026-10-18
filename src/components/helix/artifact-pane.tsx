import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Monitor, RotateCw, Smartphone, Tablet, X } from "lucide-react";
import { westcode } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import type { Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Markdown } from "./blocks";

const WIDTHS = [
  { id: "full", label: "Full width", icon: Monitor, px: 0 },
  { id: "tablet", label: "Tablet", icon: Tablet, px: 820 },
  { id: "phone", label: "Phone", icon: Smartphone, px: 390 },
] as const;

/**
 * Live preview of what the agent made — a page with its assets, an SVG, an
 * image, a PDF or a Markdown document — the desk's take on Claude's
 * artifacts and Design canvas. Reloads when the agent edits the file again.
 */
export function ArtifactPane({ session }: { session: Session }) {
  const a = session.artifact!;
  const [width, setWidth] = useState<(typeof WIDTHS)[number]["id"]>("full");
  const [key, setKey] = useState(0);
  const [md, setMd] = useState<string | null>(null);

  // A finished edit to the previewed file reloads the preview.
  const editsToFile = useMemo(() => {
    if (!a.path) return 0;
    let n = 0;
    for (const m of session.messages) {
      for (const b of m.blocks) {
        if (b.type === "tool" && b.status === "done" && (b.path === a.path || b.diffs?.some((d) => d.path === a.path))) n++;
      }
    }
    return n;
  }, [session.messages, a.path]);
  useEffect(() => setKey((k) => k + 1), [editsToFile]);

  useEffect(() => {
    if (!a.markdown) return;
    let dead = false;
    void fetch(a.url)
      .then((r) => r.text())
      .then((t) => !dead && setMd(t))
      .catch(() => !dead && setMd("Could not read the file."));
    return () => {
      dead = true;
    };
  }, [a.url, a.markdown, key]);

  const close = () =>
    useHelix.setState((st) => ({
      sessions: st.sessions.map((x) => (x.id === session.id ? { ...x, artifact: undefined } : x)),
    }));
  const px = WIDTHS.find((w) => w.id === width)!.px;

  return (
    <aside
      aria-label="Preview"
      className="flex h-full min-h-0 w-[min(40rem,55vw)] shrink-0 flex-col border-l border-border bg-surface"
    >
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
        <span className="min-w-0 flex-1 truncate px-1 text-xs font-medium" title={a.path ?? a.title}>
          {a.title}
        </span>
        {!a.markdown
          ? WIDTHS.map((w) => (
              <button
                key={w.id}
                type="button"
                aria-label={w.label}
                aria-pressed={width === w.id}
                onClick={() => setWidth(w.id)}
                className={cn(
                  "grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                  width === w.id && "bg-muted text-foreground",
                )}
              >
                <w.icon className="size-3.5" />
              </button>
            ))
          : null}
        <button
          type="button"
          aria-label="Reload preview"
          onClick={() => setKey((k) => k + 1)}
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RotateCw className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Open in browser"
          onClick={() => void westcode()?.artifact?.openExternal(a.url)}
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Close preview"
          onClick={close}
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-window p-0">
        {a.markdown ? (
          <div className="w-full max-w-2xl p-6">
            {md === null ? <p className="text-xs text-subtle">Loading…</p> : <Markdown text={md} />}
          </div>
        ) : (
          <iframe
            key={key}
            title={`Preview of ${a.title}`}
            src={a.url}
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
            className={cn("h-full border-0 bg-white", px ? "my-3 rounded-lg shadow-window" : "w-full")}
            style={px ? { width: px, height: "calc(100% - 1.5rem)" } : undefined}
          />
        )}
      </div>
    </aside>
  );
}
