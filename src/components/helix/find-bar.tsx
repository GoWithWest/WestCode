import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

type HighlightRegistry = { set: (n: string, h: unknown) => void; delete: (n: string) => void };
type HighlightCtor = new (...ranges: Range[]) => unknown;

function registry(): { reg: HighlightRegistry; Ctor: HighlightCtor } | null {
  const css = (globalThis as unknown as { CSS?: { highlights?: HighlightRegistry } }).CSS;
  const Ctor = (globalThis as unknown as { Highlight?: HighlightCtor }).Highlight;
  return css?.highlights && Ctor ? { reg: css.highlights, Ctor } : null;
}

/** Every case-insensitive match of `text` in the page, outside the find bar. */
function findRanges(text: string, skip: Element | null): Range[] {
  const needle = text.toLowerCase();
  if (!needle) return [];
  const out: Range[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const el = n.parentElement;
      if (!el || (skip && skip.contains(el))) return NodeFilter.FILTER_REJECT;
      if (el.closest("script,style,noscript,[aria-hidden='true']")) return NodeFilter.FILTER_REJECT;
      return el.offsetParent === null && getComputedStyle(el).position !== "fixed" ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = walker.nextNode(); n && out.length < 5000; n = walker.nextNode()) {
    const hay = (n.nodeValue ?? "").toLowerCase();
    for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + needle.length)) {
      const r = document.createRange();
      r.setStart(n, i);
      r.setEnd(n, i + needle.length);
      out.push(r);
    }
  }
  return out;
}

/**
 * ⌘F: find in the window, like Claude Desktop. Matches are painted with the
 * CSS Custom Highlight API, so typing never loses focus and the find box
 * itself is never a match.
 */
export function FindBar() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [ranges, setRanges] = useState<Range[]>([]);
  const [current, setCurrent] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const hl = registry();

  const clear = useCallback(() => {
    hl?.reg.delete("westcode-find");
    hl?.reg.delete("westcode-find-current");
  }, [hl]);

  const paint = useCallback(
    (rs: Range[], at: number) => {
      if (!hl) return;
      hl.reg.set("westcode-find", new hl.Ctor(...rs));
      const cur = rs[at];
      if (cur) {
        hl.reg.set("westcode-find-current", new hl.Ctor(cur));
        (cur.startContainer.parentElement ?? null)?.scrollIntoView({ block: "center" });
      } else hl.reg.delete("westcode-find-current");
    },
    [hl],
  );

  const search = useCallback(
    (t: string) => {
      const rs = findRanges(t, box.current);
      setRanges(rs);
      setCurrent(0);
      if (rs.length) paint(rs, 0);
      else clear();
    },
    [paint, clear],
  );

  useEffect(() => {
    const show = () => {
      setOpen(true);
      window.setTimeout(() => input.current?.select(), 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("westcode:find", show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("westcode:find", show);
    };
  }, []);

  if (!open) return null;
  const close = () => {
    clear();
    setOpen(false);
    setRanges([]);
  };
  const step = (dir: 1 | -1) => {
    if (!ranges.length) return;
    const next = (current + dir + ranges.length) % ranges.length;
    setCurrent(next);
    paint(ranges, next);
  };

  return (
    <div
      ref={box}
      role="search"
      className="absolute top-12 right-4 z-40 flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1.5 shadow-window"
    >
      <input
        ref={input}
        autoFocus
        value={text}
        aria-label="Find in WestCode"
        placeholder="Find"
        onChange={(e) => {
          setText(e.target.value);
          search(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            step(e.shiftKey ? -1 : 1);
          } else if (e.key === "Escape") {
            e.preventDefault();
            close();
          }
        }}
        className="h-7 w-48 rounded-md border border-border bg-window px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
      />
      <span className="w-14 text-center text-2xs text-subtle tabular-nums" aria-live="polite">
        {text ? `${ranges.length ? current + 1 : 0}/${ranges.length}` : ""}
      </span>
      <button type="button" aria-label="Previous match" onClick={() => step(-1)} className="rounded p-1 text-subtle hover:bg-muted hover:text-foreground">
        <ChevronUp className="size-3.5" />
      </button>
      <button type="button" aria-label="Next match" onClick={() => step(1)} className="rounded p-1 text-subtle hover:bg-muted hover:text-foreground">
        <ChevronDown className="size-3.5" />
      </button>
      <button type="button" aria-label="Close find" onClick={close} className="rounded p-1 text-subtle hover:bg-muted hover:text-foreground">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
