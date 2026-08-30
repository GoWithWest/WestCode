import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useHelix } from "@/lib/store";
import { westcode } from "@/lib/desktop";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProviderDot, useAllProviders } from "./provider";

export function ProvidersView() {
  const setView = useHelix((s) => s.setView);
  const setNewOpen = useHelix((s) => s.setNewOpen);
  const refreshCli = useHelix((s) => s.refreshCli);
  const cli = useHelix((s) => s.cliStatus);
  const providers = useAllProviders();
  const [busy, setBusy] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const api = westcode();

  async function login(id: string) {
    if (!api) return;
    setBusy(id);
    try {
      await api.login(id);
      await refreshCli();
    } finally {
      setBusy(null);
    }
  }

  async function logout(id: string) {
    if (!api) return;
    setBusy(id);
    try {
      await api.logout(id);
      await refreshCli();
    } finally {
      setBusy(null);
    }
  }

  async function install(id: string) {
    if (!api?.installCli) return;
    setBusy(id);
    setInstallError(null);
    try {
      const res = await api.installCli(id);
      if (!res.ok) {
        setInstallError(
          (res.output || "Install failed.").split("\n").filter(Boolean).slice(-3).join(" ").slice(0, 300),
        );
      }
      await refreshCli();
    } catch (err) {
      setInstallError((err as Error).message.slice(0, 300));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Connections</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              WestCode embeds the CLIs already on this Mac. Sign in with Claude
              Code, Grok Build, or Codex — auth stays in those tools.
            </p>
          </div>
          <Button size="sm" variant="subtle" onClick={() => void refreshCli()}>
            Recheck
          </Button>
        </div>

        <ol className="mt-6 space-y-3">
          {providers.map((p, i) => {
            const probe = cli.find((c) => c.id === p.id);
            const found = probe?.found ?? false;
            const loggedIn = probe?.loggedIn;
            return (
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
                    {probe?.install && !found ? (
                      <pre className="mt-3 overflow-x-auto rounded-md bg-window px-3 py-2 font-mono text-2xs text-foreground">
                        {probe.install}
                        {probe.installAlt ? `\n# or ${probe.installAlt}` : ""}
                      </pre>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-2xs font-medium",
                      loggedIn
                        ? "bg-muted text-foreground"
                        : found
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {!p.builtin
                      ? "API"
                      : !found
                        ? "Not installed"
                        : loggedIn
                          ? "Connected"
                          : loggedIn === false
                            ? "Sign in"
                            : "Installed"}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-2xs">
                  <div>
                    <dt className="text-subtle">Auth</dt>
                    <dd>{p.authLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-subtle">Binary</dt>
                    <dd className="font-mono">{probe?.path ?? p.binary}</dd>
                  </div>
                  <div>
                    <dt className="text-subtle">Protocol</dt>
                    <dd>{p.protocol}</dd>
                  </div>
                  <div>
                    <dt className="text-subtle">Sessions</dt>
                    <dd className="truncate font-mono">{p.sessionStore}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ColorPicker id={p.id} />
                  {!p.builtin ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${p.name}`}
                      onClick={() =>
                        useHelix.getState().removeCustomProvider(p.id)
                      }
                    >
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  ) : null}
                  {!p.builtin ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setView("mosaic");
                        setNewOpen(true);
                      }}
                    >
                      New session
                    </Button>
                  ) : found ? (
                    <>
                      <Button
                        size="sm"
                        disabled={busy === p.id}
                        onClick={() => void login(p.id)}
                      >
                        {loggedIn ? "Re-login" : "Login"}
                      </Button>
                      {loggedIn ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === p.id}
                          onClick={() => void logout(p.id)}
                        >
                          Logout
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setView("mosaic");
                          setNewOpen(true);
                        }}
                      >
                        New session
                      </Button>
                      {p.id === "grok" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === p.id}
                          onClick={async () => {
                            setBusy(p.id);
                            try {
                              await api?.updateCli?.(p.id);
                              await refreshCli();
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          {busy === p.id ? "Updating…" : "Update"}
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        disabled={busy === p.id}
                        onClick={() => void install(p.id)}
                      >
                        {busy === p.id ? "Installing…" : "Install"}
                      </Button>
                      <p className="text-2xs text-muted-foreground">
                        WestCode installs and manages this CLI for you — or
                        install it yourself in Terminal, then Recheck.
                      </p>
                      {installError && busy === null ? (
                        <p className="w-full text-2xs text-destructive">
                          {installError}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <AddProviderCard />
      </div>
    </div>
  );
}

function ColorPicker({ id }: { id: string }) {
  const color = useHelix((s) => s.providerColors[id]);
  const setColor = useHelix((s) => s.setProviderColor);
  return (
    <label
      className="inline-flex cursor-pointer items-center gap-1.5 text-2xs text-muted-foreground"
      title="Connection colour"
    >
      <ProviderDot id={id} />
      <span>Colour</span>
      <input
        type="color"
        value={color ?? "#8b8b96"}
        onChange={(e) => setColor(id, e.target.value)}
        className="h-5 w-7 cursor-pointer rounded border border-border bg-transparent p-0"
      />
      {color ? (
        <button
          type="button"
          onClick={() => setColor(id, "")}
          className="text-subtle hover:text-foreground"
        >
          reset
        </button>
      ) : null}
    </label>
  );
}

function AddProviderCard() {
  const addCustomProvider = useHelix((s) => s.addCustomProvider);
  const setColor = useHelix((s) => s.setProviderColor);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [vendor, setVendor] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [models, setModels] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [color, setPickedColor] = useState("#7d8db3");

  function submit() {
    const n = name.trim();
    const e = endpoint.trim();
    if (!n || !e) return;
    const modelList = models
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    addCustomProvider({
      name: n,
      vendor: vendor.trim() || n,
      auth: "api",
      authLabel: "API key",
      endpoint: e,
      apiKey: apiKey.trim(),
      models: modelList,
      defaultModel: modelList[0] ?? "default",
    });
    const created = useHelix
      .getState()
      .customProviders.find((c) => c.name === n);
    if (created && color) setColor(created.id, color);
    setName("");
    setVendor("");
    setEndpoint("");
    setModels("");
    setApiKey("");
    setOpen(false);
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="mt-4" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        Add provider (API)
      </Button>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-medium">Add an API provider</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Any OpenAI-compatible endpoint works — OpenRouter, Groq, a Gemini
        proxy, or self-hosted vLLM. The key is stored on this Mac only.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <MiniField label="Name" value={name} onChange={setName} placeholder="OpenRouter" />
        <MiniField label="Vendor" value={vendor} onChange={setVendor} placeholder="OpenRouter" />
        <MiniField
          label="Endpoint"
          value={endpoint}
          onChange={setEndpoint}
          placeholder="https://openrouter.ai/api/v1"
        />
        <MiniField
          label="Models (comma-separated)"
          value={models}
          onChange={setModels}
          placeholder="openai/gpt-5.4, x-ai/grok-4"
        />
        <MiniField
          label="API key"
          value={apiKey}
          onChange={setApiKey}
          placeholder="sk-…"
          password
        />
        <label className="block">
          <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
            Colour
          </span>
          <input
            type="color"
            value={color}
            onChange={(e) => setPickedColor(e.target.value)}
            className="mt-1.5 h-9 w-16 cursor-pointer rounded-md border border-border bg-window p-1"
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={!name.trim() || !endpoint.trim()}>
          Add provider
        </Button>
      </div>
    </div>
  );
}

function MiniField({
  label,
  value,
  onChange,
  placeholder,
  password,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  password?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
        {label}
      </span>
      <input
        type={password ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}
