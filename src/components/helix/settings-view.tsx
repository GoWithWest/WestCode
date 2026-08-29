import { FolderOpen } from "lucide-react";
import { PERMISSION_MODES, defaultEffortFor, effortsFor, modelsFor } from "@/lib/catalog";
import { pickDirectory } from "@/lib/fs";
import { useHelix } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ProviderDot, useAllProviders } from "./provider";

export function SettingsView() {
  const settings = useHelix((s) => s.settings);
  const update = useHelix((s) => s.updateSettings);
  const providers = useAllProviders();
  const providerId = settings.defaultProviderId ?? "";
  const modelOpts = providerId
    ? modelsFor(providerId, providers.find((p) => p.id === providerId)?.models ?? [])
    : [];
  const effortOpts = providerId ? effortsFor(providerId) : [];

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-lg font-medium tracking-tight">Settings</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Defaults for every new session, and how delegated agents run.
        </p>

        <section className="mt-6 rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-medium">New session defaults</h3>

          <Row label="Provider">
            <select
              value={providerId}
              onChange={(e) => {
                const id = e.target.value || null;
                update({
                  defaultProviderId: id,
                  defaultModel: "",
                  defaultEffort: id ? defaultEffortFor(id) : "",
                });
              }}
              className="h-8 rounded-md border border-border bg-window px-2 text-xs outline-none"
            >
              <option value="">First connected</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.short}
                </option>
              ))}
            </select>
            {providerId ? <ProviderDot id={providerId} /> : null}
          </Row>

          <Row label="Model">
            <select
              value={settings.defaultModel}
              onChange={(e) => update({ defaultModel: e.target.value })}
              disabled={!providerId}
              className="h-8 rounded-md border border-border bg-window px-2 text-xs outline-none disabled:opacity-50"
            >
              <option value="">Provider default</option>
              {modelOpts.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Row>

          <Row label="Effort">
            <select
              value={settings.defaultEffort}
              onChange={(e) => update({ defaultEffort: e.target.value })}
              disabled={!providerId}
              className="h-8 rounded-md border border-border bg-window px-2 text-xs outline-none disabled:opacity-50"
            >
              <option value="">Provider default</option>
              {effortOpts.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </Row>

          <Row label="Permissions">
            <select
              value={settings.defaultPermissionMode}
              onChange={(e) => update({ defaultPermissionMode: e.target.value })}
              className="h-8 rounded-md border border-border bg-window px-2 text-xs outline-none"
            >
              {PERMISSION_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className="text-2xs text-subtle">
              how new sessions run tools
            </span>
          </Row>

          <Row label="Folder">
            <span className="min-w-0 flex-1 truncate font-mono text-2xs text-muted-foreground">
              {settings.defaultCwd || "Ask every time"}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const folder = await pickDirectory();
                if (folder) update({ defaultCwd: folder.path });
              }}
            >
              <FolderOpen className="size-3.5" />
              Choose
            </Button>
            {settings.defaultCwd ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => update({ defaultCwd: "" })}
              >
                Clear
              </Button>
            ) : null}
          </Row>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-medium">Delegation</h3>
          <label className="mt-3 flex items-start gap-3">
            <input
              type="checkbox"
              checked={settings.delegatedAuto}
              onChange={(e) => update({ delegatedAuto: e.target.checked })}
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                Delegated sessions run without approval prompts.
              </span>{" "}
              When an orchestrator hands work to another agent, the spawned
              session runs in Auto so it can execute tools immediately. Turn
              off to make it inherit the sender's permission mode instead.
            </span>
          </label>
        </section>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="w-24 shrink-0 text-2xs font-medium tracking-wide text-subtle uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}
