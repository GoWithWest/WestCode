import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { KeyRound } from "lucide-react";
import { westcode } from "@/lib/desktop";
import { Button } from "@/components/ui/button";

type Prompt = { id: string; hostId: string; hostName: string; prompt: string; secret: boolean; canRemember: boolean };

/**
 * What ssh asks while connecting to an SSH host — a password, a one-time
 * code, or whether to trust a new host key — asked here instead of in a
 * terminal. A password can be remembered (encrypted with the keychain).
 */
export function SshPromptDialog() {
  const api = westcode()?.ssh;
  const [queue, setQueue] = useState<Prompt[]>([]);
  const [value, setValue] = useState("");
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (!api?.onPrompt) return;
    return api.onPrompt((p) => setQueue((q) => [...q, p]));
  }, [api]);

  const cur = queue[0];
  if (!api?.reply || !cur) return null;
  const yesNo = /yes\/no/i.test(cur.prompt);
  const isPassword = /password/i.test(cur.prompt) && !yesNo;

  const answer = (v: string | null) => {
    api.reply!(cur.id, v, isPassword && remember);
    setValue("");
    setQueue((q) => q.slice(1));
  };

  return (
    <Dialog.Root open onOpenChange={(o) => !o && answer(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/70" />
        <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto w-auto max-w-md -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-window focus:outline-none">
          <Dialog.Title className="flex items-center gap-2 text-base font-medium">
            <KeyRound className="size-4" /> {cur.hostName} asks
          </Dialog.Title>
          <Dialog.Description className="mt-2 whitespace-pre-wrap font-mono text-xs text-muted-foreground">
            {cur.prompt.trim()}
          </Dialog.Description>
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              answer(value);
            }}
          >
            {yesNo ? (
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => answer("no")}>
                  Don&apos;t connect
                </Button>
                <Button type="button" onClick={() => answer("yes")}>
                  Trust this host
                </Button>
              </div>
            ) : (
              <>
                <input
                  autoFocus
                  type={cur.secret ? "password" : "text"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  aria-label={cur.prompt.trim()}
                  className="h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                {isPassword && cur.canRemember ? (
                  <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                    Remember this password (encrypted with your keychain)
                  </label>
                ) : null}
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => answer(null)}>
                    Cancel
                  </Button>
                  <Button type="submit">Continue</Button>
                </div>
              </>
            )}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
