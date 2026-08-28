import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Trash2 } from "lucide-react";
import { LIBRARY, type Addon, type AddonKind } from "@/lib/library";
import { PROVIDER_ORDER } from "@/lib/providers";
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
  const enabled = useHelix((s) => s.enabledAddons);
  const custom = useHelix((s) => s.customAddons);
  const toggle = useHelix((s) => s.toggleAddon);
  const remove = useHelix((s) => s.removeAddon);
  const [tab, setTab] = useState<AddonKind>("skill");
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const items = useMemo(() => {
    const all = [...LIBRARY, ...custom].filter((a) => a.kind === tab);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.repo.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q),
    );
  }, [tab, query, custom]);

  const enabledCount = items.filter((a) => enabled.includes(a.id)).length;

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Library</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Skills, plugins, and MCP connectors from GitHub — anthropics/skills,
              knowledge-work-plugins, community packs, and official MCP servers.
              Enable them for sessions, or import your own.
            </p>
          </div>
          <Button size="sm" onClick={() => setImportOpen(true)}>
            <Plus className="size-3.5" />
            Import
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-1.5">
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
          {enabledCount} enabled · {items.length} in this list
        </p>

        <ul className="mt-4 space-y-2">
          {items.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing matches. Import your own, or clear the filter.
            </li>
          ) : (
            items.map((a) => (
              <AddonCard
                key={a.id}
                addon={a}
                on={enabled.includes(a.id)}
                onToggle={() => toggle(a.id)}
                onRemove={a.custom ? () => remove(a.id) : undefined}
              />
            ))
          )}
        </ul>
      </div>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

function AddonCard({
  addon,
  on,
  onToggle,
  onRemove,
}: {
  addon: Addon;
  on: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  return (
    <li
      className={cn(
        "rounded-lg border bg-surface p-4",
        on ? "border-border-strong" : "border-border",
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
          <Button
            size="sm"
            variant={on ? "subtle" : "outline"}
            onClick={onToggle}
          >
            {on ? "Enabled" : "Enable"}
          </Button>
          {onRemove ? (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Remove"
              onClick={onRemove}
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          ) : null}
        </div>
      </div>
    </li>
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

  function toggleProv(id: string) {
    setProviders((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  function submit() {
    const n = name.trim();
    if (!n) return;
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
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/70" />
        <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[min(90dvh,40rem)] w-auto max-w-md -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-window focus:outline-none">
          <Dialog.Title className="text-lg font-medium tracking-tight">
            Import
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            Add a skill, plugin, or MCP connector from a repo you trust — or a
            local SKILL.md.
          </Dialog.Description>

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

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!name.trim()}>
              Add to library
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
