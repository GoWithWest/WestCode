import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Trash2 } from "lucide-react";
import {
  AVAILABLE_TO_ADD,
  type AuthKind,
  type CustomProvider,
} from "@/lib/providers";
import { useHelix } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProviderDot, useAllProviders } from "./provider";

export function ProvidersView() {
  const resetDemo = useHelix((s) => s.resetDemo);
  const setView = useHelix((s) => s.setView);
  const custom = useHelix((s) => s.customProviders);
  const remove = useHelix((s) => s.removeCustomProvider);
  const providers = useAllProviders();
  const [addOpen, setAddOpen] = useState(false);
  const taken = new Set(custom.map((c) => c.id));
  const available = AVAILABLE_TO_ADD.filter((a) => !taken.has(a.id));

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Connections</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Add a provider with a subscription CLI, or with an API key against
              any OpenAI-compatible endpoint. WestCode is an ACP client — Claude
              Desktop only attaches API gateways; WestCode attaches the
              subscriptions themselves.
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" />
            Add provider
          </Button>
        </div>

        <ol className="mt-6 space-y-3">
          {providers.map((p, i) => (
            <li
              key={p.id}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xs text-subtle">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <ProviderDot id={p.id} />
                    <h3 className="text-sm font-medium">{p.name}</h3>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {p.how}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-2xs font-medium ${
                      p.live
                        ? "bg-muted text-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.live
                      ? "Live"
                      : p.auth === "api"
                        ? "API"
                        : "Hosted ACP"}
                  </span>
                  {p.builtin ? null : (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${p.name}`}
                      onClick={() => remove(p.id)}
                    >
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-2xs">
                <div>
                  <dt className="text-subtle">Auth</dt>
                  <dd>{p.authLabel}</dd>
                </div>
                <div>
                  <dt className="text-subtle">Binary</dt>
                  <dd className="font-mono">{p.binary}</dd>
                </div>
                <div>
                  <dt className="text-subtle">Protocol</dt>
                  <dd>{p.protocol}</dd>
                </div>
                <div>
                  <dt className="text-subtle">
                    {p.endpoint ? "Endpoint" : "Sessions"}
                  </dt>
                  <dd className="truncate font-mono">
                    {p.endpoint ?? p.sessionStore}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>

        {available.length ? (
          <div className="mt-6">
            <h3 className="text-sm font-medium">Available to add</h3>
            <ul className="mt-2 space-y-2">
              {available.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-2xs text-muted-foreground">
                      {a.vendor}
                      {a.subscription ? ` · ${a.subscription}` : ""}
                      {a.apiHint ? ` · ${a.apiHint}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-medium">On a Mac</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Native WestCode spawns each binary as a subprocess and speaks JSON-RPC
            over stdio:{" "}
            <code className="font-mono text-foreground">initialize</code>,{" "}
            <code className="font-mono text-foreground">session/new</code>,{" "}
            <code className="font-mono text-foreground">session/prompt</code>.
            API providers POST to the endpoint you pasted. Tokens never leave
            this machine. This preview runs the same desk in the browser — Grok
            is live; other sessions are hosted ACP stand-ins so you can still
            drive them.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setView("mosaic")}>
              Back to mosaic
            </Button>
            <Button variant="ghost" onClick={resetDemo}>
              Reset demo sessions
            </Button>
          </div>
        </div>
      </div>
      <AddProviderDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function AddProviderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const add = useHelix((s) => s.addCustomProvider);
  const custom = useHelix((s) => s.customProviders);
  const taken = new Set(custom.map((c) => c.id));
  const presets = [
    ...AVAILABLE_TO_ADD.filter((a) => !taken.has(a.id)),
    {
      id: "custom",
      name: "Custom endpoint",
      vendor: "Custom",
      subscription: "",
      apiHint: "Any OpenAI-compatible base URL",
      endpoint: "https://",
      models: ["gpt-4.1"],
    },
  ];

  const [presetId, setPresetId] = useState("gemini");
  const preset = presets.find((p) => p.id === presetId) ?? presets[0]!;
  const canSub = Boolean(preset.subscription);
  const [auth, setAuth] = useState<AuthKind>(canSub ? "subscription" : "api");
  const [name, setName] = useState(preset.name);
  const [vendor, setVendor] = useState(preset.vendor);
  const [endpoint, setEndpoint] = useState(preset.endpoint);
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState(preset.models.join(", "));

  function pickPreset(id: string) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setName(p.name);
    setVendor(p.vendor);
    setEndpoint(p.endpoint);
    setModels(p.models.join(", "));
    setAuth(p.subscription ? "subscription" : "api");
  }

  function submit() {
    const list = models
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    const payload: Omit<CustomProvider, "connected" | "id"> & { id?: string } = {
      id: presetId === "custom" ? undefined : presetId,
      name: name.trim() || preset.name,
      vendor: vendor.trim() || preset.vendor,
      auth,
      authLabel:
        auth === "subscription"
          ? preset.subscription || "CLI login"
          : preset.apiHint || "API key",
      endpoint: auth === "api" ? endpoint.trim() : "",
      apiKey: auth === "api" ? apiKey.trim() : "",
      models: list.length ? list : preset.models,
      defaultModel: list[0] ?? preset.models[0] ?? "default",
    };
    add(payload);
    setApiKey("");
    onOpenChange(false);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) {
          const first = presets[0];
          if (first) pickPreset(first.id);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/70" />
        <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[min(90dvh,42rem)] w-auto max-w-md -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-window focus:outline-none">
          <Dialog.Title className="text-lg font-medium tracking-tight">
            Add provider
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            Subscription reuses the vendor CLI login — no key in WestCode. API mode
            stores a key in this browser and talks to the endpoint you set.
          </Dialog.Description>

          <p className="mt-4 text-2xs font-medium tracking-wide text-subtle uppercase">
            Provider
          </p>
          <div className="mt-1.5 grid grid-cols-1 gap-1.5">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPreset(p.id)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm",
                  p.id === presetId
                    ? "border-accent bg-muted"
                    : "border-border hover:border-border-strong",
                )}
              >
                <span className="font-medium">{p.name}</span>
                <span className="mt-0.5 block text-2xs text-muted-foreground">
                  {p.vendor}
                  {p.subscription ? ` · ${p.subscription}` : " · API only"}
                </span>
              </button>
            ))}
          </div>

          {canSub ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuth("subscription")}
                className={cn(
                  "rounded-md border px-3 py-2 text-left",
                  auth === "subscription"
                    ? "border-accent bg-muted"
                    : "border-border",
                )}
              >
                <span className="text-sm font-medium">Subscription</span>
                <span className="mt-0.5 block text-2xs text-muted-foreground">
                  {preset.subscription}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAuth("api")}
                className={cn(
                  "rounded-md border px-3 py-2 text-left",
                  auth === "api" ? "border-accent bg-muted" : "border-border",
                )}
              >
                <span className="text-sm font-medium">API</span>
                <span className="mt-0.5 block text-2xs text-muted-foreground">
                  {preset.apiHint || "OpenAI-compatible"}
                </span>
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              This provider is API-only.
            </p>
          )}

          {presetId === "custom" ? (
            <>
              <label className="mt-3 block">
                <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
                  Name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Groq, vLLM, LM Studio…"
                  className="mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
                  Vendor
                </span>
                <input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </label>
            </>
          ) : null}

          {auth === "api" ? (
            <>
              <label className="mt-3 block">
                <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
                  Endpoint
                </span>
                <input
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className="mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 font-mono text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
                  API key
                </span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Saved only in this browser"
                  className="mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 font-mono text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
                />
              </label>
            </>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              WestCode will spawn the local CLI and reuse its existing login. No
              key is stored.
            </p>
          )}

          <label className="mt-3 block">
            <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
              Models
            </span>
            <input
              value={models}
              onChange={(e) => setModels(e.target.value)}
              placeholder="comma-separated"
              className="mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
            />
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!name.trim()}>
              Add {name.trim() || "provider"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
