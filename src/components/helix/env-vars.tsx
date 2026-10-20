import { useEffect, useState } from "react";
import { westcode } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import { Button } from "@/components/ui/button";

/**
 * Settings → Environment variables (Claude Desktop's per-environment
 * KEY=value lines): one set for this Mac, one per SSH host, given to the
 * agents started there. Stored encrypted with the keychain.
 */
export function EnvVarsSection() {
  const api = westcode()?.env;
  const hosts = useHelix((s) => s.sshHosts);
  const [scope, setScope] = useState("local");
  const [text, setText] = useState("");
  const [saved, setSaved] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!api) return;
    let dead = false;
    void api.get(scope).then((r) => {
      if (dead) return;
      setText(r.text ?? "");
      setSaved(r.text ?? "");
      setNote("");
    });
    return () => {
      dead = true;
    };
  }, [api, scope]);

  if (!api) return null;
  return (
    <section className="mt-6 rounded-lg border border-border bg-surface p-4" aria-labelledby="env-title">
      <h3 id="env-title" className="text-sm font-medium">
        Environment variables
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        One <span className="font-mono">KEY=value</span> per line, given to the agents that run there (for example{" "}
        <span className="font-mono">MAX_THINKING_TOKENS=0</span>). Stored encrypted with your keychain. New sessions pick
        them up.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Where">
        {[{ id: "local", name: "This Mac" }, ...hosts].map((h) => (
          <button
            key={h.id}
            type="button"
            role="radio"
            aria-checked={scope === h.id}
            onClick={() => setScope(h.id)}
            className={`rounded-full border px-2.5 py-1 text-xs ${scope === h.id ? "border-accent bg-muted text-foreground" : "border-border text-muted-foreground hover:border-border-strong"}`}
          >
            {h.name}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        spellCheck={false}
        aria-label="Environment variables"
        placeholder={"API_TIMEOUT_MS=900000\n# comments are fine"}
        className="mt-2 w-full rounded-md border border-border bg-window px-3 py-2 font-mono text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {note ? <span className="text-2xs text-muted-foreground">{note}</span> : null}
        <Button
          size="sm"
          disabled={text === saved}
          onClick={async () => {
            const r = await api.set(scope, text);
            if (r.ok) {
              setSaved(text);
              setNote("Saved.");
            } else setNote(r.error ?? "Could not save.");
          }}
        >
          Save
        </Button>
      </div>
    </section>
  );
}
