import { CommandPalette } from "./command-palette";
import { FindBar } from "./find-bar";
import { ShortcutsSheet } from "./shortcuts-sheet";
import { SshPromptDialog } from "./ssh-prompt";
import { useEffect } from "react";
import { Columns2, LayoutGrid, Plus, PanelLeft } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { westcode } from "@/lib/desktop";
import { useHelix } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HelixMark } from "./mark";
import { AgentsView } from "./agents-view";
import { WestCreateView } from "./westcreate-view";
import { MemoryView } from "./memory-view";
import { SettingsView } from "./settings-view";
import { LibraryView } from "./library-view";
import { Mosaic } from "./mosaic";
import { NewSessionDialog } from "./new-session";
import { ProvidersView } from "./providers-view";
import { SessionPane } from "./session-pane";
import { Sidebar } from "./sidebar";
import { UpdateBanner } from "./update-banner";

export function HelixApp() {
  const view = useHelix((s) => s.view);
  const sessions = useHelix((s) => s.sessions);
  const activeId = useHelix((s) => s.activeId);
  const splitIds = useHelix((s) => s.splitIds);
  const mobileNav = useHelix((s) => s.mobileNav);
  const setView = useHelix((s) => s.setView);
  const setNewOpen = useHelix((s) => s.setNewOpen);
  const setMobileNav = useHelix((s) => s.setMobileNav);
  const tick = useHelix((s) => s.tick);
  const restoreState = useHelix((s) => s.restoreState);
  const theme = useHelix((s) => s.settings.theme ?? "dark");

  // Appearance: data-theme on <html>; "system" follows the OS live.
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    const apply = () => {
      const light = theme === "light" || (theme === "system" && Boolean(mq?.matches));
      root.dataset.theme = light ? "light" : "dark";
    };
    apply();
    if (theme !== "system" || !mq) return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    void restoreState();
    const id = window.setInterval(tick, 15_000);
    const offMenu = westcode()?.onMenu?.((action) => {
      const state = useHelix.getState();
      if (action === "new") state.setNewOpen(true);
      else if (action === "mosaic") state.setView("mosaic");
      else if (action === "library") state.setView("library");
      else if (action === "agents") state.setView("agents");
      else if (action === "settings") state.setView("settings");
      else if (action === "providers") state.setView("providers");
      else if (action === "focus") {
        const id = state.activeId ?? state.sessions[0]?.id;
        if (id) state.setActive(id);
      } else if (action === "next" || action === "prev") {
        // Ctrl+Tab / ⌘⇧] and ⌘⇧[: step through the open sessions.
        const live = state.sessions.filter((s) => !s.archivedAt && !s.sideOf);
        if (!live.length) return;
        const i = live.findIndex((s) => s.id === state.activeId);
        const step = action === "next" ? 1 : -1;
        state.setActive(live[(i + step + live.length) % live.length]!.id);
      } else if (action.startsWith("panel-")) {
        window.dispatchEvent(new CustomEvent("westcode:panel", { detail: { panel: action.slice(6) } }));
      } else if (action === "palette" || action === "find" || action === "shortcuts") {
        window.dispatchEvent(new CustomEvent(`westcode:${action}`));
      } else if (action === "split") {
        const live = state.sessions.filter((s) => !s.archivedAt);
        if (live.length >= 2) state.setSplit([live[0]!.id, live[1]!.id]);
      }
    });
    const offLink = westcode()?.onDeepLink?.((link) => {
      useHelix.getState().openNewWith({
        cwd: link.folder || undefined,
        hostId: link.host || undefined,
        prompt: link.prompt || undefined,
        providerId: link.provider || undefined,
      });
    });
    // ⌘O / Ctrl+O cycles how much agent activity shows (Normal → Thinking →
    // Verbose), the same key Claude Code uses for its transcript views.
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        const st = useHelix.getState();
        const order = ["normal", "thinking", "verbose"] as const;
        const cur = order.indexOf(st.settings.transcriptDetail ?? "normal");
        st.updateSettings({ transcriptDetail: order[(cur + 1) % order.length]! });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("keydown", onKey);
      offMenu?.();
      offLink?.();
    };
  }, [tick, restoreState]);

  const liveSessions = sessions.filter((s) => !s.archivedAt);
  const active =
    sessions.find((s) => s.id === activeId) ?? liveSessions[0] ?? null;
  const left =
    sessions.find((s) => s.id === splitIds?.[0]) ?? liveSessions[0] ?? null;
  const right =
    sessions.find((s) => s.id === splitIds?.[1]) ?? liveSessions[1] ?? null;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-window text-foreground">
      <TitleBar
        view={view}
        onMosaic={() => setView("mosaic")}
        onSplit={() => {
          if (liveSessions.length >= 2) {
            useHelix
              .getState()
              .setSplit([liveSessions[0]!.id, liveSessions[1]!.id]);
          }
        }}
        onNew={() => setNewOpen(true)}
        onSessions={() =>
          setMobileNav(mobileNav === "sessions" ? "desk" : "sessions")
        }
      />
      <UpdateBanner />
      <FindBar />
      <CommandPalette />
      <ShortcutsSheet />
      <SshPromptDialog />

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
          {view === "westcreate" ? <WestCreateView /> : null}
          {view === "memory" ? <MemoryView /> : null}
          {view === "settings" ? <SettingsView /> : null}
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
