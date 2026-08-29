import { allProviders, resolveProvider, type ProviderId } from "@/lib/providers";
import { useHelix } from "@/lib/store";
import { cn } from "@/lib/utils";

function toneBg(id: string) {
  if (id === "claude") return "bg-claude";
  if (id === "codex") return "bg-codex";
  if (id === "cursor") return "bg-cursor";
  if (id === "grok") return "bg-grok";
  return "bg-accent";
}

function toneText(id: string) {
  if (id === "claude") return "text-claude";
  if (id === "codex") return "text-codex";
  if (id === "cursor") return "text-cursor";
  if (id === "grok") return "text-grok";
  return "text-accent";
}

export function useResolvedProvider(id: string) {
  const custom = useHelix((s) => s.customProviders);
  return resolveProvider(id, custom);
}

export function useAllProviders() {
  const custom = useHelix((s) => s.customProviders);
  const cli = useHelix((s) => s.cliStatus);
  return allProviders(custom).map((p) => {
    const hit = cli.find((c) => c.id === p.id);
    if (!hit) return { ...p, connected: false, live: false };
    return {
      ...p,
      connected: hit.connected,
      live: Boolean(hit.found && hit.loggedIn),
      how: hit.found ? p.how : `${p.how} Missing binary — ${hit.install}`,
    };
  });
}

export function ProviderDot({
  id,
  className,
}: {
  id: ProviderId;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", toneBg(id), className)}
      aria-hidden
    />
  );
}

export function ProviderChip({
  id,
  live,
}: {
  id: ProviderId;
  live?: boolean;
}) {
  const p = useResolvedProvider(id);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-2xs font-medium text-foreground">
      <ProviderDot id={id} />
      {p.short}
      {live ?? p.live ? (
        <span className="text-subtle">live</span>
      ) : (
        <span className="text-subtle">ACP</span>
      )}
    </span>
  );
}

export function ProviderName({
  id,
  className,
}: {
  id: ProviderId;
  className?: string;
}) {
  const p = useResolvedProvider(id);
  return <span className={cn(toneText(id), className)}>{p.short}</span>;
}

export function StatusLabel({
  status,
}: {
  status: "running" | "waiting" | "idle" | "error";
}) {
  const map = {
    running: { label: "Running", cls: "text-claude" },
    waiting: { label: "Waiting", cls: "text-warn" },
    idle: { label: "Idle", cls: "text-muted-foreground" },
    error: { label: "Error", cls: "text-danger" },
  } as const;
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-2xs font-medium", s.cls)}>
      <span
        className={cn(
          "size-1.5 rounded-full bg-current",
          status === "running" && "animate-pulse",
        )}
      />
      {s.label}
    </span>
  );
}
