import { ArrowUpCircle } from "lucide-react";
import { useHelix } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function UpdateBanner() {
  const updates = useHelix((s) => s.cliUpdates);
  const busy = useHelix((s) => s.updateBusy);
  const apply = useHelix((s) => s.applyCliUpdate);
  const dismiss = useHelix((s) => s.dismissCliUpdate);
  const error = useHelix((s) => s.updateError);
  const next = updates[0];
  if (!next) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2">
      <ArrowUpCircle className="size-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {error
          ? `Update failed: ${error}`
          : `New ${next.name} CLI available (${next.current} → ${next.latest}).`}
      </p>
      <Button
        size="sm"
        disabled={busy === next.id}
        onClick={() => void apply(next.id)}
      >
        {busy === next.id ? "Updating…" : "Update"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={busy === next.id}
        onClick={() => dismiss(next.id)}
      >
        Later
      </Button>
    </div>
  );
}
