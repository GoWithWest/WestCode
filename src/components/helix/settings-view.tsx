import { useState } from "react";
import { ExternalLink, FolderOpen, Plus, Trash2 } from "lucide-react";
import { PERMISSION_MODES, defaultEffortFor, effortsFor, modelsFor } from "@/lib/catalog";
import { pickDirectory } from "@/lib/fs";
import { useHelix } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ProviderDot, useAllProviders } from "./provider";

export function SettingsView() {
  const settings = useHelix((s) => s.settings);
  const update = useHelix((s) => s.updateSettings);
  const providers = useAllProviders();
  const agents = useHelix((s) => s.agents);
  const schedules = useHelix((s) => s.schedules);
  const addSchedule = useHelix((s) => s.addSchedule);
  const updateSchedule = useHelix((s) => s.updateSchedule);
  const removeSchedule = useHelix((s) => s.removeSchedule);
  const [schName, setSchName] = useState("");
  const [schPrompt, setSchPrompt] = useState("");
  const [schTo, setSchTo] = useState("");
  const [schEvery, setSchEvery] = useState(60);
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
                Delegated sessions skip approval prompts (Bypass).
              </span>{" "}
              When an orchestrator hands work to another agent, the spawned
              session runs in Bypass so every tool executes immediately. Turn
              off to make it inherit the sender's permission mode instead.
            </span>
          </label>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-medium">Scheduled tasks</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Run a prompt on an interval while WestCode is open. Sessions run
            unattended (Bypass). Turn on launch-at-login below so schedules
            keep running after a reboot.
          </p>
          <ul className="mt-3 space-y-2">
            {schedules.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-md border border-border bg-window px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={t.enabled}
                  onChange={(e) =>
                    updateSchedule(t.id, { enabled: e.target.checked })
                  }
                  className="size-4 accent-[var(--color-accent)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{t.name}</p>
                  <p className="truncate text-2xs text-subtle">
                    every {t.everyMinutes}m · to {t.to || "default provider"}
                    {t.lastRun
                      ? ` · last ${new Date(t.lastRun).toLocaleTimeString()}`
                      : ""}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${t.name}`}
                  onClick={() => removeSchedule(t.id)}
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              value={schName}
              onChange={(e) => setSchName(e.target.value)}
              placeholder="Name"
              className="h-8 rounded-md border border-border bg-window px-2.5 text-xs outline-none placeholder:text-subtle"
            />
            <div className="flex gap-2">
              <select
                value={schTo}
                onChange={(e) => setSchTo(e.target.value)}
                className="h-8 flex-1 rounded-md border border-border bg-window px-2 text-xs outline-none"
              >
                <option value="">Default provider</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.name}>
                    @{a.name}
                  </option>
                ))}
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short}
                  </option>
                ))}
              </select>
              <select
                value={schEvery}
                onChange={(e) => setSchEvery(Number(e.target.value))}
                className="h-8 rounded-md border border-border bg-window px-2 text-xs outline-none"
              >
                {[15, 30, 60, 180, 360, 720, 1440].map((m) => (
                  <option key={m} value={m}>
                    every {m >= 60 ? `${m / 60}h` : `${m}m`}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={schPrompt}
              onChange={(e) => setSchPrompt(e.target.value)}
              rows={2}
              placeholder="Prompt to run"
              className="resize-none rounded-md border border-border bg-window px-2.5 py-2 text-xs outline-none placeholder:text-subtle sm:col-span-2"
            />
            <Button
              size="sm"
              disabled={!schName.trim() || !schPrompt.trim()}
              onClick={() => {
                addSchedule({
                  name: schName.trim(),
                  prompt: schPrompt.trim(),
                  to: schTo,
                  everyMinutes: schEvery,
                  enabled: true,
                });
                setSchName("");
                setSchPrompt("");
              }}
            >
              <Plus className="size-3.5" />
              Add task
            </Button>
          </div>
          <label className="mt-3 flex items-start gap-3">
            <input
              type="checkbox"
              checked={settings.launchAtLogin}
              onChange={(e) => update({ launchAtLogin: e.target.checked })}
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                Launch WestCode at login.
              </span>{" "}
              Keeps scheduled tasks and the desk available after a restart.
            </span>
          </label>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-medium">Cloud</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            WestCode's desk is local. To run work while this Mac is closed,
            use each provider's own cloud — they run independently and you
            pick up results in their apps or by resuming in a session here.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="https://grok.com/tasks"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-muted/50"
            >
              <ExternalLink className="size-3" />
              Grok Automations
            </a>
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-muted/50"
            >
              <ExternalLink className="size-3" />
              Claude cloud & Routines
            </a>
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-medium">Transcript</h3>
          <label className="mt-3 flex items-start gap-3">
            <input
              type="checkbox"
              checked={settings.transcriptCompact}
              onChange={(e) => update({ transcriptCompact: e.target.checked })}
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                Compact transcripts.
              </span>{" "}
              Tighter message layout in every session view, not just split.
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
