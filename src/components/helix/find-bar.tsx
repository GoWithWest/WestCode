import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { westcode } from "@/lib/desktop";

/** ⌘F: find in the transcript (the whole window), like Claude Desktop. */
export function FindBar() {
  const api = westcode()?.find;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ active: number; total: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!api) return;
    const off = api.onResult(setResult);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setOpen(true);
        window.setTimeout(() => input.current?.select(), 0);
      }
    };
    const onMenu = () => {
      setOpen(true);
      window.setTimeout(() => input.current?.select(), 0);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("westcode:find", onMenu);
    return () => {
      off();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("westcode:find", onMenu);
    };
  }, [api]);

  if (!api || !open) return null;
  const close = () => {
    api.stop();
    setOpen(false);
    setResult(null);
  };
  const go = (forward: boolean, next = true) => {
    if (text) api.start(text, { forward, next });
  };

  return (
    <div
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
          if (e.target.value) api.start(e.target.value, { forward: true, next: false });
          else {
            api.stop();
            setResult(null);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            go(!e.shiftKey);
          } else if (e.key === "Escape") {
            e.preventDefault();
            close();
          }
        }}
        className="h-7 w-48 rounded-md border border-border bg-window px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
      />
      <span className="w-14 text-center text-2xs text-subtle tabular-nums" aria-live="polite">
        {text ? (result ? `${result.total ? result.active : 0}/${result.total}` : "…") : ""}
      </span>
      <button type="button" aria-label="Previous match" onClick={() => go(false)} className="rounded p-1 text-subtle hover:bg-muted hover:text-foreground">
        <ChevronUp className="size-3.5" />
      </button>
      <button type="button" aria-label="Next match" onClick={() => go(true)} className="rounded p-1 text-subtle hover:bg-muted hover:text-foreground">
        <ChevronDown className="size-3.5" />
      </button>
      <button type="button" aria-label="Close find" onClick={close} className="rounded p-1 text-subtle hover:bg-muted hover:text-foreground">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
