import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FileUp, Plus, Settings2, Trash2 } from "lucide-react";
import { LIBRARY, type Addon, type AddonKind } from "@/lib/library";
import { PROVIDER_ORDER } from "@/lib/providers";
import { westcode } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProviderDot } from "./provider";

const TABS: { id: AddonKind; label: string }[] = [
  { id: "skill", label: "Skills" },
  { id: "plugin", label: "Plugins" },
  { id: "connector", label: "Connectors" },
];

export function LibraryView() {
  const custom = useHelix((s) => s.customAddons);
  const remove = useHelix((s) => s.removeAddon);
  const live = useHelix((s) => s.liveAddons);
  const libraryStatus = useHelix((s) => s.libraryStatus);
  const refreshLibrary = useHelix((s) => s.refreshLibrary);
  const [tab, setTab] = useState<AddonKind>("skill");
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [connectorOpen, setConnectorOpen] = useState(false);
  const [configAddon, setConfigAddon] = useState<Addon | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (libraryStatus === "idle") void refreshLibrary();
  }, [libraryStatus, refreshLibrary]);

  const items = useMemo(() => {
    const fromCli: Addon[] = live.map((a) => ({
      id: a.id,
      kind: a.kind,
      name: a.name,
      source: a.source,
      repo: a.source,
      summary: a.summary,
      providers: a.providers,
      install: "",
    }));
    const canned = LIBRARY.filter((a) =>
      (a.providers ?? []).some(
        (p) =>
          p === "*" ||
          PROVIDER_ORDER.includes(p as (typeof PROVIDER_ORDER)[number]),
      ),
    );
    // Merge sources by kind+name: the first occurrence keeps identity (canned
    // first, so curated ids stay the Enable key DEFAULT_ENABLED points at),
    // later occurrences union their providers in instead of being dropped —
    // a "github" connector Codex also has must not show as Claude-only.
    const byKey = new Map<string, Addon>();
    for (const a of [...canned, ...custom, ...fromCli]) {
      const key = `${a.kind}:${a.name.toLowerCase()}`;
      const cur = byKey.get(key);
      if (!cur) {
        byKey.set(key, { ...a, providers: [...(a.providers ?? [])] });
        continue;
      }
      cur.providers = [
        ...new Set([...(cur.providers ?? []), ...(a.providers ?? [])]),
      ];
      if (!cur.summary && a.summary) cur.summary = a.summary;
    }
    const liveKeys = new Set(
      fromCli.map((a) => `${a.kind}:${a.name.toLowerCase()}`),
    );
    const merged = [...byKey.values()].map((a) => ({
      ...a,
      installed: liveKeys.has(`${a.kind}:${a.name.toLowerCase()}`),
    }));
    const all = merged.filter((a) => a.kind === tab);
    const scoped =
      filter === "all"
        ? all
        : all.filter(
            (a) =>
              (a.providers ?? []).includes(filter) ||
              (a.providers ?? []).includes("*"),
          );
    const q = query.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.repo.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q),
    );
  }, [tab, query, custom, live, filter]);

  const installedCount = items.filter((a) => a.installed).length;

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Library</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Everything your CLIs have installed (~/.claude, ~/.grok,
              ~/.codex), merged with a curated catalog you can install from.
              Install, remove, and configure run each provider's own CLI.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConnectorOpen(true)}
            >
              <Plus className="size-3.5" />
              Add connector
            </Button>
            <Button size="sm" onClick={() => setImportOpen(true)}>
              <Plus className="size-3.5" />
              Import
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          {(["all", ...PROVIDER_ORDER] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-medium",
                filter === id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {id === "all" ? "All" : id[0]!.toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-medium",
                tab === t.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter"
            className="ml-auto h-8 w-36 rounded-md border border-border bg-window px-2.5 text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
          />
        </div>
        <p className="mt-2 text-2xs text-subtle">
          {installedCount} installed · {items.length} in this list
        </p>

        <ul className="mt-4 space-y-2">
          {items.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {libraryStatus === "loading"
                ? "Reading skills from the CLIs…"
                : "Nothing matches. Import your own, or clear the filter."}
            </li>
          ) : (
            items.map((a) => (
              <AddonCard
                key={a.id}
                addon={a}
                onConfigure={() => setConfigAddon(a)}
                onRemoveCustom={a.custom ? () => remove(a.id) : undefined}
              />
            ))
          )}
        </ul>
      </div>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <AddConnectorDialog
        open={connectorOpen}
        onOpenChange={setConnectorOpen}
      />
      {configAddon ? (
        <AddonConfigDialog
          addon={configAddon}
          onClose={() => setConfigAddon(null)}
        />
      ) : null}
    </div>
  );
}

function AddonCard({
  addon,
  onConfigure,
  onRemoveCustom,
}: {
  addon: Addon & { installed?: boolean };
  onConfigure: () => void;
  onRemoveCustom?: () => void;
}) {
  return (
    <li
      className={cn(
        "rounded-lg border bg-surface p-4",
        addon.installed ? "border-border-strong" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">{addon.name}</h3>
            {addon.custom ? (
              <span className="text-2xs text-subtle">yours</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {addon.summary}
          </p>
          <p className="mt-2 font-mono text-2xs text-subtle">
            {addon.source}
            {addon.repo ? ` · ${addon.repo}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {addon.providers.includes("*") ? (
              <span className="text-2xs text-subtle">all providers</span>
            ) : (
              addon.providers.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 text-2xs text-muted-foreground"
                >
                  <ProviderDot id={id} />
                  {id}
                </span>
              ))
            )}
          </div>
          <p className="mt-2 font-mono text-2xs text-subtle">{addon.install}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            {addon.installed ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-2xs font-medium">
                Installed
              </span>
            ) : null}
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Configure ${addon.name}`}
              onClick={onConfigure}
            >
              <Settings2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={onConfigure}>
            {addon.installed ? "Manage" : "Install"}
          </Button>
          {onRemoveCustom ? (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Remove"
              onClick={onRemoveCustom}
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

const INSTALLABLE_PROVIDERS = ["claude", "grok", "codex"] as const;

function actionProviders(addon: Addon): string[] {
  const declared = (addon.providers ?? []).filter((p) =>
    (INSTALLABLE_PROVIDERS as readonly string[]).includes(p),
  );
  return declared.length ? declared : [...INSTALLABLE_PROVIDERS];
}

/**
 * Per-provider management sheet: install/remove/enable/disable/auth run the
 * provider CLI's documented procedure through the addon IPC; output shows
 * verbatim so failures are actionable.
 */
function AddonConfigDialog({
  addon,
  onClose,
}: {
  addon: Addon & { installed?: boolean };
  onClose: () => void;
}) {
  const refreshLibrary = useHelix((s) => s.refreshLibrary);
  const api = westcode();
  const provs = actionProviders(addon);
  const [providerId, setProviderId] = useState(provs[0] ?? "claude");
  const [busy, setBusy] = useState<string | null>(null);
  const [output, setOutput] = useState("");

  const cliStatus = useHelix((s) => s.cliStatus);
  function installTargets(): string[] {
    const found = new Set(
      cliStatus.filter((c) => c.found).map((c) => c.id),
    );
    const declared = actionProviders(addon).filter((p) => found.has(p));
    return declared.length ? declared : [providerId];
  }
  const pluginTarget = /\/?plugin install\s+(\S+)/.exec(addon.install ?? "")?.[1];
  const marketplaceOnly = /\/?plugin marketplace add\s+(\S+)/.exec(addon.install ?? "")?.[1];
  const npxCmd = /^npx\s+(.+)$/.exec((addon.install ?? "").trim())?.[1];
  const urlTarget = /^https?:\/\/\S+$/.exec((addon.install ?? "").trim())?.[0];
  const bundled = /^bundled\b/.test((addon.install ?? "").trim());

  async function run(action: string, opts?: { source?: string }) {
    if (!api?.addonAction) return;
    setBusy(action);
    setOutput("");
    try {
      if (action === "install" && addon.kind === "connector") {
        // Connectors ALWAYS install via `mcp add` — and to EVERY installed
        // CLI this connector supports in one click; one server config per
        // provider is how each CLI works, but the user acts once.
        const slug = addon.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
        const targets = installTargets();
        if (npxCmd || urlTarget) {
          const parts = npxCmd ? npxCmd.split(/\s+/) : [];
          const lines: string[] = [];
          for (const pid of targets) {
            const res = npxCmd
              ? await api.addonMcpAdd({
                  providerId: pid,
                  name: slug,
                  commandOrUrl: "npx",
                  args: parts,
                })
              : await api.addonMcpAdd({
                  providerId: pid,
                  name: slug,
                  commandOrUrl: urlTarget!,
                  transport: "http",
                });
            lines.push(`${pid}: ${res.ok ? "added" : "FAILED"}${res.output ? ` — ${res.output.split("\n").slice(-1)[0]}` : ""}`);
          }
          setOutput(
            lines.join("\n") +
              (urlTarget
                ? "\nRemote server — use Authenticate to finish OAuth where needed."
                : ""),
          );
        } else {
          setOutput(
            `This connector has no runnable install command in the catalog. Use "Add connector" with its server command or URL, or run in Terminal:\n${addon.install || "(none listed)"}`,
          );
        }
      } else if (action === "install" && bundled) {
        setOutput("Bundled with the CLI — nothing to install.");
      } else if (action === "install" && marketplaceOnly && !pluginTarget) {
        const res = await api.addonAction({
          providerId,
          kind: "marketplace",
          action: "add",
          name: addon.name,
          source: marketplaceOnly,
        });
        setOutput(
          (res.output ? res.output + "\n" : "") +
            (res.ok
              ? "Marketplace added. Pick the plugin inside the CLI (/plugin) — this entry does not name a single plugin to install."
              : "Failed."),
        );
      } else if (action === "install" && (pluginTarget || addon.repo)) {
        if (providerId === "grok") {
          // grok installs plugins from a git source, not name@marketplace.
          const res = await api.addonAction({
            providerId,
            kind: "plugin",
            action: "install",
            name: addon.name,
            source: addon.repo || pluginTarget,
          });
          setOutput(res.output || (res.ok ? "Installed." : "Failed."));
        } else {
          // claude: marketplace must exist first, then name@marketplace.
          if (addon.repo && pluginTarget?.includes("@")) {
            await api.addonAction({
              providerId,
              kind: "marketplace",
              action: "add",
              name: pluginTarget.split("@")[1]!,
              source: addon.repo,
            });
          }
          const res = await api.addonAction({
            providerId,
            kind: "plugin",
            action: "install",
            name: addon.name,
            source: pluginTarget || addon.repo,
          });
          setOutput(res.output || (res.ok ? "Installed." : "Failed."));
        }
      } else if (action === "install") {
        setOutput(
          `No automated installer for this entry. Run in Terminal:\n${addon.install || "(no install command listed)"}`,
        );
      } else {
        const res = await api.addonAction({
          providerId,
          kind: addon.kind,
          action,
          name: addon.name,
          source: opts?.source,
        });
        setOutput(res.output || (res.ok ? "Done." : "Failed."));
      }
      void refreshLibrary();
    } finally {
      setBusy(null);
    }
  }

  const canEnable =
    (providerId === "grok" && addon.kind !== "skill") ||
    (providerId === "claude" && addon.kind === "plugin");
  const canAuth =
    (providerId === "claude" || providerId === "codex") &&
    addon.kind === "connector";
  const canDoctor = providerId === "grok" && addon.kind === "connector";
  const removableKind = addon.kind !== "skill";

  return (
    <Dialog.Root open onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/70" />
        <Dialog.Content className="scrollbar-none fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[min(90dvh,40rem)] w-auto max-w-md -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-window focus:outline-none">
          <Dialog.Title className="text-lg font-medium tracking-tight">
            {addon.name}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            {addon.kind} · {addon.source}
            {addon.repo ? ` · ${addon.repo}` : ""}
          </Dialog.Description>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
              Manage on
            </span>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="h-8 rounded-md border border-border bg-window px-2 text-xs outline-none"
            >
              {provs.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {!addon.installed ? (
              <Button size="sm" disabled={!!busy} onClick={() => void run("install")}>
                {busy === "install"
                  ? "Installing…"
                  : addon.kind === "connector"
                    ? "Install for all CLIs"
                    : "Install"}
              </Button>
            ) : null}
            {addon.installed && removableKind ? (
              <Button
                size="sm"
                variant="outline"
                disabled={!!busy}
                onClick={() => void run("remove")}
              >
                {busy === "remove" ? "Removing…" : "Remove"}
              </Button>
            ) : null}
            {canEnable ? (
              <>
                <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void run("enable")}>
                  Enable
                </Button>
                <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void run("disable")}>
                  Disable
                </Button>
              </>
            ) : null}
            {canAuth ? (
              <>
                <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void run("login")}>
                  Authenticate
                </Button>
                <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void run("logout")}>
                  Log out
                </Button>
              </>
            ) : null}
            {canDoctor ? (
              <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void run("doctor")}>
                Doctor
              </Button>
            ) : null}
          </div>

          {addon.kind === "skill" && addon.installed ? (
            <p className="mt-3 text-2xs leading-relaxed text-muted-foreground">
              Skills are files — this one lives in the provider's skills
              folder (or ships inside a plugin). Remove it there.
            </p>
          ) : null}

          {addon.install ? (
            <p className="mt-3 font-mono text-2xs break-all text-subtle">
              {addon.install}
            </p>
          ) : null}

          {output ? (
            <pre className="scrollbar-thin mt-3 max-h-40 overflow-auto rounded-md bg-window p-2 font-mono text-2xs whitespace-pre-wrap">
              {output}
            </pre>
          ) : null}

          <div className="mt-4 flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type RegistryServer = {
  name: string;
  title: string;
  description: string;
  remote: string;
  npmPkg: string;
  repo: string;
};

/** `mcp add` for any provider — the one procedure both CLIs document. */
function AddConnectorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const refreshLibrary = useHelix((s) => s.refreshLibrary);
  const api = westcode();
  const [providerId, setProviderId] = useState("claude");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [envText, setEnvText] = useState("");
  const [header, setHeader] = useState("");
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState("");
  const [regQuery, setRegQuery] = useState("");
  const [regResults, setRegResults] = useState<RegistryServer[]>([]);
  const [regBusy, setRegBusy] = useState(false);
  const cliStatus = useHelix((s) => s.cliStatus);
  const foundClis = cliStatus.filter((c) => c.found).map((c) => c.id);

  async function searchRegistry() {
    if (!api?.registrySearch || !regQuery.trim()) return;
    setRegBusy(true);
    try {
      const r = await api.registrySearch(regQuery.trim());
      setRegResults(r.servers);
      if (!r.ok) setOutput(r.output || "Registry search failed.");
    } finally {
      setRegBusy(false);
    }
  }

  async function installFromRegistry(srv: RegistryServer) {
    if (!api?.addonMcpAdd) return;
    setBusy(true);
    setOutput("");
    try {
      const slug = (srv.title || srv.name)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .slice(0, 40);
      const targets = foundClis.length
        ? foundClis
        : [providerId];
      const lines: string[] = [];
      for (const pid of targets) {
        const res = srv.remote
          ? await api.addonMcpAdd({
              providerId: pid,
              name: slug,
              commandOrUrl: srv.remote,
              transport: "http",
            })
          : await api.addonMcpAdd({
              providerId: pid,
              name: slug,
              commandOrUrl: "npx",
              args: ["-y", srv.npmPkg],
            });
        lines.push(`${pid}: ${res.ok ? "added" : "FAILED"}${res.output ? ` — ${res.output.split("\n").slice(-1)[0]}` : ""}`);
      }
      setOutput(lines.join("\n"));
      void refreshLibrary();
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!api?.addonMcpAdd || !name.trim() || !target.trim()) return;
    setBusy(true);
    setOutput("");
    try {
      const isUrl = /^https?:\/\//.test(target.trim());
      const parts = target.trim().split(/\s+/);
      const env: Record<string, string> = {};
      for (const line of envText.split("\n")) {
        const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
        if (m) env[m[1]!] = m[2]!;
      }
      const res = await api.addonMcpAdd({
        providerId,
        name: name.trim(),
        commandOrUrl: isUrl ? target.trim() : parts[0]!,
        args: isUrl ? [] : parts.slice(1),
        transport: isUrl ? "http" : "stdio",
        env,
        header: header.trim() || undefined,
      });
      setOutput(res.output || (res.ok ? "Connector added." : "Failed."));
      if (res.ok) void refreshLibrary();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/70" />
        <Dialog.Content className="scrollbar-none fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[min(90dvh,38rem)] w-auto max-w-md -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-window focus:outline-none">
          <Dialog.Title className="text-lg font-medium tracking-tight">
            Add MCP connector
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            A command (stdio) or an http(s) URL. WestCode runs the provider's
            own `mcp add` — remote servers that need OAuth finish sign-in via
            Authenticate on the connector afterwards.
          </Dialog.Description>

          <div className="mt-4 flex gap-1.5">
            {INSTALLABLE_PROVIDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProviderId(p)}
                className={cn(
                  "h-8 rounded-md px-3 text-xs font-medium",
                  providerId === p
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>

          <Field label="Name" value={name} onChange={setName} placeholder="playwright" />
          <Field
            label="Command or URL"
            value={target}
            onChange={setTarget}
            placeholder="npx -y @playwright/mcp@latest   ·   https://mcp.notion.com/mcp"
          />
          <Field
            label="Auth header (optional, http)"
            value={header}
            onChange={setHeader}
            placeholder="Authorization: Bearer …"
          />
          <label className="mt-3 block">
            <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
              Env (KEY=value per line)
            </span>
            <textarea
              value={envText}
              onChange={(e) => setEnvText(e.target.value)}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-md border border-border bg-window px-3 py-2 font-mono text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
            />
          </label>

          <p className="mt-4 text-2xs font-medium tracking-wide text-subtle uppercase">
            Or search the MCP registry
          </p>
          <div className="mt-1.5 flex gap-2">
            <input
              value={regQuery}
              onChange={(e) => setRegQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void searchRegistry()}
              placeholder="github, postgres, browser…"
              className="h-8 flex-1 rounded-md border border-border bg-window px-2.5 text-xs outline-none placeholder:text-subtle"
            />
            <Button size="sm" variant="outline" disabled={regBusy} onClick={() => void searchRegistry()}>
              {regBusy ? "Searching…" : "Search"}
            </Button>
          </div>
          {regResults.length ? (
            <ul className="scrollbar-thin mt-2 max-h-72 space-y-1.5 overflow-y-auto">
              {regResults.map((srv) => (
                <li
                  key={srv.name}
                  className="flex items-center gap-2 rounded-md border border-border bg-window px-2.5 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{srv.title}</p>
                    <p className="truncate text-2xs text-subtle">
                      {srv.remote ? "remote" : `npx ${srv.npmPkg}`} · {srv.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void installFromRegistry(srv)}
                  >
                    Install
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          {output ? (
            <pre className="scrollbar-thin mt-3 max-h-32 overflow-auto rounded-md bg-window p-2 font-mono text-2xs whitespace-pre-wrap">
              {output}
            </pre>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={() => void submit()} disabled={busy || !name.trim() || !target.trim()}>
              {busy ? "Adding…" : "Add connector"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const importAddon = useHelix((s) => s.importAddon);
  const [kind, setKind] = useState<AddonKind>("skill");
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [repo, setRepo] = useState("");
  const [summary, setSummary] = useState("");
  const [install, setInstall] = useState("");
  const [providers, setProviders] = useState<string[]>([...PROVIDER_ORDER]);
  const [pickedPath, setPickedPath] = useState("");
  const [installNote, setInstallNote] = useState("");

  function toggleProv(id: string) {
    setProviders((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  async function submit() {
    const n = name.trim();
    if (!n) return;
    // A picked local file for a skill is INSTALLED into the chosen
    // providers' skills folders, not just cataloged. Await it: a failed
    // write must show its error and keep the dialog open.
    if (pickedPath && kind === "skill" && westcode()?.installSkillFile) {
      const r = await westcode()!.installSkillFile(
        pickedPath,
        n,
        providers.filter((p) => p !== "*"),
      );
      setInstallNote(r.output);
      if (!r.ok) return;
    }
    importAddon({
      kind,
      name: n,
      source: source.trim() || "Custom",
      repo: repo.trim(),
      summary: summary.trim() || "Imported by you.",
      providers: providers.length ? providers : ["*"],
      install: install.trim() || "local",
    });
    setName("");
    setSource("");
    setRepo("");
    setSummary("");
    setInstall("");
    setPickedPath("");
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/70" />
        <Dialog.Content className="scrollbar-none fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[min(90dvh,40rem)] w-auto max-w-md -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-window focus:outline-none">
          <Dialog.Title className="text-lg font-medium tracking-tight">
            Import
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            Add a skill, plugin, or MCP connector from a repo you trust — or a
            local file (SKILL.md, config, manifest).
          </Dialog.Description>

          {westcode()?.pickFile ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={async () => {
                const f = await westcode()!.pickFile();
                if (!f) return;
                setPickedPath(f.path);
                setName(
                  f.name.replace(/\.(md|json|ya?ml|toml|txt)$/i, "").replace(/[-_]/g, " "),
                );
                setSource("Local file");
                setInstall(f.path);
                if (f.snippet) setSummary(f.snippet);
              }}
            >
              <FileUp className="size-3.5" />
              Import a file…
            </Button>
          ) : null}

          <div className="mt-4 flex gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setKind(t.id)}
                className={cn(
                  "h-8 rounded-md px-3 text-xs font-medium",
                  kind === t.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label.slice(0, -1)}
              </button>
            ))}
          </div>

          <Field label="Name" value={name} onChange={setName} placeholder="PDF tools" />
          <Field
            label="Source"
            value={source}
            onChange={setSource}
            placeholder="Anthropic, you, a teammate"
          />
          <Field
            label="GitHub repo"
            value={repo}
            onChange={setRepo}
            placeholder="org/repo"
          />
          <label className="mt-3 block">
            <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
              Summary
            </span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-md border border-border bg-window px-3 py-2 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
            />
          </label>
          <Field
            label="Install"
            value={install}
            onChange={setInstall}
            placeholder="/plugin install … or npx …"
          />

          <p className="mt-3 text-2xs font-medium tracking-wide text-subtle uppercase">
            Providers
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PROVIDER_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleProv(id)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs",
                  providers.includes(id)
                    ? "border-accent bg-muted"
                    : "border-border text-muted-foreground",
                )}
              >
                <ProviderDot id={id} />
                {id}
              </button>
            ))}
          </div>

          {pickedPath && kind === "skill" ? (
            <p className="mt-3 text-2xs text-muted-foreground">
              This SKILL.md will be installed to the selected providers'
              skills folders (~/.claude/skills, ~/.grok/skills, …). Skills
              with extra files (references/, scripts/) need their whole
              folder copied manually.
            </p>
          ) : null}
          {installNote ? (
            <pre className="mt-2 font-mono text-2xs whitespace-pre-wrap text-subtle">{installNote}</pre>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={!name.trim()}>
              {pickedPath && kind === "skill" ? "Install & add" : "Add to library"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="mt-3 block">
      <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}
