import { useEffect } from "react";
import { Columns2, LayoutGrid, Plus, PanelLeft } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { westcode } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HelixMark } from "./mark";
import { AgentsView } from "./agents-view";
import { LibraryView } from "./library-view";
import { Mosaic } from "./mosaic";
import { NewSessionDialog } from "./new-session";
import { Onboarding } from "./onboarding";
import { ProvidersView } from "./providers-view";
import { SessionPane } from "./session-pane";
import { Sidebar } from "./sidebar";
import { UpdateBanner } from "./update-banner";

export function HelixApp() {
  const view = useHelix((s) => s.view);
  const sessions = useHelix((s) => s.sessions);
  const activeId = useHelix((s) => s.activeId);
  const splitIds = useHelix((s) => s.splitIds);
  const onboarding = useHelix((s) => s.onboarding);
  const mobileNav = useHelix((s) => s.mobileNav);
  const setView = useHelix((s) => s.setView);
  const setNewOpen = useHelix((s) => s.setNewOpen);
  const setMobileNav = useHelix((s) => s.setMobileNav);
  const tick = useHelix((s) => s.tick);
  const restoreOnboarding = useHelix((s) => s.restoreOnboarding);

  useEffect(() => {
    restoreOnboarding();
    const id = window.setInterval(tick, 15_000);
    const offMenu = westcode()?.onMenu?.((action) => {
      const state = useHelix.getState();
      if (action === "new") state.setNewOpen(true);
      else if (action === "mosaic") state.setView("mosaic");
      else if (action === "library") state.setView("library");
      else if (action === "agents") state.setView("agents");
      else if (action === "providers") state.setView("providers");
      else if (action === "focus") {
        const id = state.activeId ?? state.sessions[0]?.id;
        if (id) state.setActive(id);
      } else if (action === "split" && state.sessions.length >= 2) {
        state.setSplit([state.sessions[0]!.id, state.sessions[1]!.id]);
      }
    });
    return () => {
      window.clearInterval(id);
      offMenu?.();
    };
  }, [tick, restoreOnboarding]);

  const active =
    sessions.find((s) => s.id === activeId) ?? sessions[0] ?? null;
  const left =
    sessions.find((s) => s.id === splitIds?.[0]) ?? sessions[0] ?? null;
  const right =
    sessions.find((s) => s.id === splitIds?.[1]) ?? sessions[1] ?? null;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-window text-foreground">
      <TitleBar
        view={view}
        onMosaic={() => setView("mosaic")}
        onSplit={() => {
          if (sessions.length >= 2) {
            useHelix.getState().setSplit([sessions[0]!.id, sessions[1]!.id]);
          }
        }}
        onNew={() => setNewOpen(true)}
        onSessions={() =>
          setMobileNav(mobileNav === "sessions" ? "desk" : "sessions")
        }
      />
      <UpdateBanner />

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "h-full w-full md:flex md:w-60 md:shrink-0",
            mobileNav === "sessions" ? "flex" : "hidden md:flex",
          )}
        >
          <Sidebar />
        </div>

        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 flex-col",
            mobileNav === "desk" ? "flex" : "hidden md:flex",
          )}
        >
          {view === "mosaic" ? <Mosaic /> : null}
          {view === "providers" ? <ProvidersView /> : null}
          {view === "library" ? <LibraryView /> : null}
          {view === "agents" ? <AgentsView /> : null}
          {view === "focus" && active ? <SessionPane session={active} /> : null}
          {view === "split" && left && right ? (
            <Group orientation="horizontal" className="h-full min-h-0 flex-1">
              <Panel defaultSize="50%" minSize="28%" className="min-h-0">
                <div className="flex h-full min-h-0 flex-col">
                  <SessionPane session={left} compact />
                </div>
              </Panel>
              <Separator className="w-px bg-border" />
              <Panel defaultSize="50%" minSize="28%" className="min-h-0">
                <div className="flex h-full min-h-0 flex-col">
                  <SessionPane session={right} compact />
                </div>
              </Panel>
            </Group>
          ) : null}
          {view === "focus" && !active ? <Mosaic /> : null}
          {view === "split" && (!left || !right) ? <Mosaic /> : null}
        </div>
      </div>

      <NewSessionDialog />
      {onboarding ? <Onboarding /> : null}
    </div>
  );
}

function TitleBar({
  view,
  onMosaic,
  onSplit,
  onNew,
  onSessions,
}: {
  view: string;
  onMosaic: () => void;
  onSplit: () => void;
  onNew: () => void;
  onSessions: () => void;
}) {
  return (
    <div className="titlebar flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-3 [-webkit-app-region:drag]">
      <div className="hidden w-[72px] shrink-0 items-center gap-1.5 sm:flex">
        <div className="traffic-lights flex items-center gap-1.5 [-webkit-app-region:no-drag]">
          <button
            type="button"
            aria-label="Close"
            className="size-3 rounded-full bg-traffic-close"
            onClick={() => westcode()?.window.close()}
          />
          <button
            type="button"
            aria-label="Minimize"
            className="size-3 rounded-full bg-traffic-min"
            onClick={() => westcode()?.window.minimize()}
          />
          <button
            type="button"
            aria-label="Zoom"
            className="size-3 rounded-full bg-traffic-max"
            onClick={() => westcode()?.window.maximize()}
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <HelixMark className="size-4" />
        <span className="text-sm font-medium tracking-tight">WestCode</span>
      </div>
      <div className="flex items-center gap-0.5 [-webkit-app-region:no-drag]">
        <Button
          size="icon"
          variant="ghost"
          className="size-11 md:hidden"
          aria-label="Sessions"
          onClick={onSessions}
        >
          <PanelLeft className="size-4" />
        </Button>
        <Button
          size="icon"
          variant={view === "mosaic" ? "subtle" : "ghost"}
          className="size-11 md:size-8"
          aria-label="Mosaic"
          onClick={onMosaic}
        >
          <LayoutGrid className="size-4" />
        </Button>
        <Button
          size="icon"
          variant={view === "split" ? "subtle" : "ghost"}
          className="size-11 md:size-8"
          aria-label="Split"
          onClick={onSplit}
        >
          <Columns2 className="size-4" />
        </Button>
        <Button size="sm" onClick={onNew} className="hidden sm:inline-flex">
          <Plus className="size-3.5" />
          New
        </Button>
      </div>
    </div>
  );
}
