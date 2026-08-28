import { useHelix } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { HelixMark } from "./mark";

export function Onboarding() {
  const dismiss = useHelix((s) => s.dismissOnboarding);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-desktop p-4">
      <div className="desktop-glow pointer-events-none absolute inset-0" />
      <div className="noise pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-window">
        <HelixMark className="size-8" />
        <h2 className="mt-4 text-xl font-medium tracking-tight">
          Every coding agent. One desk.
        </h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">See them all.</span>{" "}
            Claude Code, Codex, and Cursor sessions sit in one mosaic — no more
            hopping windows.
          </li>
          <li>
            <span className="font-medium text-foreground">Pick a provider.</span>{" "}
            Subscription CLI or API endpoint. Each session has its own model and
            effort.
          </li>
          <li>
            <span className="font-medium text-foreground">Desk bus.</span>{" "}
            Sessions message each other — Claude to Codex, any provider — the
            same SendMessage path Claude Code and Codex use. You don’t relay.
          </li>
        </ul>
        <Button className="mt-6 h-11 w-full" size="lg" onClick={dismiss}>
          Enter desk
        </Button>
      </div>
    </div>
  );
}
