import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

const KEYS: [string, string][] = [
  ["⌘N", "New session"],
  ["⌘K", "Command palette: sessions, views, actions"],
  ["⌘F", "Find in the window"],
  ["Ctrl+Tab · ⌘⇧]", "Next session"],
  ["Ctrl+⇧Tab · ⌘⇧[", "Previous session"],
  ["⌘1 · ⌘2 · ⌘3", "Mosaic · Focus · Split"],
  ["⌘O", "Transcript detail: Normal → Thinking → Verbose"],
  ["⌘⇧G", "Source control"],
  ["⌘,", "Settings"],
  ["Enter · ⇧Enter", "Send · new line"],
  ["Tab", "Accept the suggested next prompt"],
  ["/", "Slash commands for the session's CLI"],
  ["@", "Mention another session or agent"],
  ["1 · 2 · 3", "Answer a permission card"],
  ["Esc", "Close dialogs and panes"],
  ["⌘/", "This sheet"],
];

/** ⌘/: every keyboard shortcut, like Claude Desktop's shortcut sheet. */
export function ShortcutsSheet() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onMenu = () => setOpen(true);
    window.addEventListener("westcode:shortcuts", onMenu);
    return () => window.removeEventListener("westcode:shortcuts", onMenu);
  }, []);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/60" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-4 top-1/2 z-50 mx-auto w-auto max-w-md -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-window focus:outline-none"
        >
          <Dialog.Title className="text-base font-medium">Keyboard shortcuts</Dialog.Title>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            {KEYS.map(([k, what]) => (
              <div key={k} className="contents">
                <dt className="font-mono text-2xs text-foreground">{k}</dt>
                <dd className="text-muted-foreground">{what}</dd>
              </div>
            ))}
          </dl>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
