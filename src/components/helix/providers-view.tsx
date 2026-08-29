import { useState } from "react";
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
                    {!found
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
                <div className="mt-3 flex flex-wrap gap-2">
                  {found ? (
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
                    </>
                  ) : (
                    <p className="text-2xs text-muted-foreground">
                      Install the CLI in Terminal, then Recheck.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
