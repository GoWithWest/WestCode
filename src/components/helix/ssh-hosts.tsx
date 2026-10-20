import { useState } from "react";
import { CheckCircle2, Download, Plus, Server, Trash2, XCircle } from "lucide-react";
import { westcode, type SshHost, type SshProbe } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import { Button } from "@/components/ui/button";

/**
 * Settings → SSH hosts. A host is a machine a session can run on: the CLI,
 * its tools, the files and its stored conversations stay there.
 */
export function SshHostsSection() {
  const hosts = useHelix((s) => s.sshHosts);
  const fromConfig = useHelix((s) => s.sshConfigHosts);
  const refresh = useHelix((s) => s.refreshSshHosts);
  const refreshCli = useHelix((s) => s.refreshCliSessions);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", target: "", port: "", identityFile: "" });
  const [error, setError] = useState("");
  const [probes, setProbes] = useState<Record<string, SshProbe | "testing">>({});
  const [installing, setInstalling] = useState<string | null>(null);
  const api = westcode()?.ssh;
  if (!api) return null;

  const notAdded = fromConfig.filter((c) => !hosts.some((h) => h.host === c.host && (h.user || "") === (c.user || "")));

  async function test(h: SshHost) {
    setProbes((p) => ({ ...p, [h.id]: "testing" }));
    const r = await api!.test(h.id);
    setProbes((p) => ({ ...p, [h.id]: r }));
  }

  async function save(h: Partial<SshHost>) {
    setError("");
    const r = await api!.save(h);
    if (!r.ok || !r.host) {
      setError(r.error || "Could not save that host.");
      return;
    }
    await refresh();
    setAdding(false);
    setForm({ name: "", target: "", port: "", identityFile: "" });
    void test(r.host);
    void refreshCli();
  }

  function submit() {
    const t = form.target.trim();
    const at = t.lastIndexOf("@");
    void save({
      name: form.name.trim() || t,
      host: at > 0 ? t.slice(at + 1) : t,
      user: at > 0 ? t.slice(0, at) : undefined,
      port: form.port ? Number(form.port) : undefined,
      identityFile: form.identityFile.trim() || undefined,
    });
  }

  async function installClaude(h: SshHost) {
    setInstalling(h.id);
    try {
      const r = await api!.installClaude?.(h.id);
      if (r && !r.ok) setProbes((p) => ({ ...p, [h.id]: { ok: false, error: r.error } }));
      else await test(h);
    } finally {
      setInstalling(null);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-border bg-surface p-4" aria-labelledby="ssh-hosts-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="ssh-hosts-title" className="text-sm font-medium">
            SSH hosts
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Run sessions on another machine. The CLI, its tools, your files and the conversations it stores stay on that
            machine; WestCode only carries the chat. Uses this Mac&apos;s ssh, so ~/.ssh/config, keys and the SSH agent apply.
          </p>
        </div>
        {!adding ? (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" />
            Add host
          </Button>
        ) : null}
      </div>

      {hosts.length ? (
        <ul className="mt-3 space-y-2">
          {hosts.map((h) => {
            const p = probes[h.id];
            return (
              <li key={h.id} className="rounded-md border border-border bg-window px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Server className="size-3.5 shrink-0 text-subtle" />
                  <span className="text-sm font-medium">{h.name}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-2xs text-muted-foreground">
                    {h.user ? `${h.user}@` : ""}
                    {h.host}
                    {h.port ? `:${h.port}` : ""}
                    {h.identityFile ? ` · ${h.identityFile}` : ""}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => void test(h)} disabled={p === "testing"}>
                    {p === "testing" ? "Testing…" : "Test"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${h.name}`}
                    onClick={() => {
                      if (window.confirm(`Remove ${h.name}? Sessions on it stay on the host.`)) {
                        void api.remove(h.id).then(refresh).then(refreshCli);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                {p && p !== "testing" ? (
                  p.ok ? (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground" role="status">
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <CheckCircle2 className="size-3" /> Connected · {p.os}
                      </span>
                      {(["claude", "grok", "codex"] as const).map((id) => (
                        <span key={id} className={p.clis?.[id] ? "text-foreground" : "text-subtle"}>
                          {id === "claude" ? "Claude Code" : id === "grok" ? "Grok" : "Codex"}{" "}
                          {p.clis?.[id] ? (p.clis[id]!.version || "found") : "not installed"}
                        </span>
                      ))}
                      {!p.clis?.claude ? (
                        <Button size="sm" variant="outline" disabled={installing === h.id} onClick={() => void installClaude(h)}>
                          <Download className="size-3.5" />
                          {installing === h.id ? "Installing…" : "Install Claude Code on host"}
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 inline-flex items-center gap-1 text-2xs text-destructive" role="alert">
                      <XCircle className="size-3" /> {p.error}
                    </p>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : !adding ? (
        <p className="mt-3 text-xs text-subtle">No hosts yet.</p>
      ) : null}

      {notAdded.length ? (
        <div className="mt-3">
          <p className="text-2xs font-medium tracking-wide text-subtle uppercase">From ~/.ssh/config</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {notAdded.map((c) => (
              <button
                key={c.host}
                type="button"
                onClick={() => void save({ name: c.name, host: c.host, user: c.user, port: c.port })}
                className="rounded-full border border-border px-2.5 py-1 text-2xs text-muted-foreground hover:border-border-strong hover:text-foreground"
                title={c.hostName ? `${c.host} → ${c.hostName}` : c.host}
              >
                + {c.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {adding ? (
        <form
          className="mt-3 grid gap-2 rounded-md border border-border bg-window p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="NAS" />
          <Field
            label="SSH host"
            value={form.target}
            onChange={(v) => setForm({ ...form, target: v })}
            placeholder="user@hostname, or a Host alias from ~/.ssh/config"
            autoFocus
          />
          <div className="grid grid-cols-[6rem_1fr] gap-2">
            <Field label="Port" value={form.port} onChange={(v) => setForm({ ...form, port: v.replace(/\D/g, "") })} placeholder="22" />
            <Field
              label="SSH key (optional)"
              value={form.identityFile}
              onChange={(v) => setForm({ ...form, identityFile: v })}
              placeholder="~/.ssh/id_ed25519 — empty uses ssh config / agent"
            />
          </div>
          {error ? (
            <p className="text-2xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!form.target.trim()}>
              Add host
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-2xs font-medium tracking-wide text-subtle uppercase">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        spellCheck={false}
        className="mt-1 h-8 w-full rounded-md border border-border bg-surface px-2.5 font-mono text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}
