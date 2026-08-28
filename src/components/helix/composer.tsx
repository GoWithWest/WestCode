import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, FileText, Plus, Square, X } from "lucide-react";
import { effortLabel, filterSlash, type SlashCmd } from "@/lib/catalog";
import { prettySize, readAttachments } from "@/lib/fs";
import { useHelix } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Attachment, Session } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ProviderDot, useResolvedProvider } from "./provider";

export function Composer({ session }: { session: Session }) {
  const send = useHelix((s) => s.send);
  const stop = useHelix((s) => s.stop);
  const sessions = useHelix((s) => s.sessions);
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [hi, setHi] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [menu, setMenu] = useState(false);
  const [peersOpen, setPeersOpen] = useState(false);
  const [drop, setDrop] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const running = session.status === "running";
  const provider = useResolvedProvider(session.providerId);
  const peers = sessions.filter((s) => s.id !== session.id);

  const slashOpen =
    !running &&
    !dismissed &&
    value.startsWith("/") &&
    !value.includes("\n") &&
    !value.includes(" ");
  const matches = useMemo(
    () => (slashOpen ? filterSlash(session.providerId, value) : []),
    [slashOpen, session.providerId, value],
  );

  const atMatch = /(?:^|\s)@([^\s]*)$/.exec(value);
  const atOpen = !running && !slashOpen && Boolean(atMatch);
  const atQuery = (atMatch?.[1] ?? "").toLowerCase();
  const atMatches = atOpen
    ? peers.filter((s) => {
        if (!atQuery) return true;
        return (
          s.title.toLowerCase().includes(atQuery) ||
          s.providerId.toLowerCase().includes(atQuery) ||
          s.id.toLowerCase().includes(atQuery)
        );
      })
    : [];

  useEffect(() => {
    ref.current?.focus();
  }, [session.id]);

  useEffect(() => {
    setHi(0);
  }, [value, session.id, peersOpen]);

  useEffect(() => {
    if (!menu) return;
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenu(false);
        setPeersOpen(false);
      }
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menu]);

  function submit(text = value) {
    const t = text.trim();
    if ((!t && files.length === 0) || running) return;
    const attached = files;
    setValue("");
    setFiles([]);
    setDismissed(false);
    setMenu(false);
    void send(session.id, t, { attachments: attached });
  }

  function choose(cmd: SlashCmd) {
    if (cmd.args) {
      setValue(`/${cmd.cmd} `);
      setDismissed(true);
      ref.current?.focus();
      return;
    }
    setValue("");
    void send(session.id, `/${cmd.cmd}`);
  }

  function mention(peer: Session) {
    const label =
      peer.providerId.charAt(0).toUpperCase() + peer.providerId.slice(1);
    const next = value.replace(/(?:^|\s)@[^\s]*$/, (m) =>
      m.startsWith(" ") ? ` @${label} ` : `@${label} `,
    );
    setValue(next.endsWith(" ") ? next : `${next} `);
    setDismissed(true);
    ref.current?.focus();
  }

  async function addFiles(list: FileList | File[]) {
    const next = await readAttachments(list);
    setFiles((prev) => [...prev, ...next].slice(0, 8));
  }

  const palette = slashOpen ? matches : atOpen ? atMatches : [];

  return (
    <div className="border-t border-border bg-surface px-3 py-3 md:px-4">
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="relative">
        {slashOpen && matches.length > 0 ? (
          <div
            role="listbox"
            aria-label="Slash commands"
            className="absolute inset-x-0 bottom-full z-10 mb-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-window py-1 shadow-window"
          >
            {matches.map((c, i) => (
              <button
                key={c.cmd}
                type="button"
                role="option"
                aria-selected={i === hi}
                onMouseEnter={() => setHi(i)}
                onClick={() => choose(c)}
                className={cn(
                  "flex w-full items-baseline gap-2 px-3 py-1.5 text-left",
                  i === hi ? "bg-muted" : "hover:bg-muted/50",
                )}
              >
                <span className="font-mono text-xs text-foreground">
                  /{c.cmd}
                  {c.args ? (
                    <span className="text-subtle"> {c.args}</span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 truncate text-2xs text-muted-foreground">
                  {c.hint}
                </span>
                <span className="shrink-0 text-2xs text-subtle">
                  {c.kind === "skill" ? "skill" : provider.short}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {atOpen && atMatches.length > 0 ? (
          <div
            role="listbox"
            aria-label="Sessions on this desk"
            className="absolute inset-x-0 bottom-full z-10 mb-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-window py-1 shadow-window"
          >
            {atMatches.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={i === hi}
                onMouseEnter={() => setHi(i)}
                onClick={() => mention(p)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left",
                  i === hi ? "bg-muted" : "hover:bg-muted/50",
                )}
              >
                <ProviderDot id={p.providerId} />
                <span className="text-xs font-medium">{p.title}</span>
                <span className="ml-auto truncate text-2xs text-subtle">
                  {p.cwd}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrop(true);
          }}
          onDragLeave={() => setDrop(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrop(false);
            if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-lg border border-border-strong bg-window focus-within:ring-1 focus-within:ring-ring",
            drop && "ring-1 ring-ring",
          )}
        >
          {files.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5 px-3 pt-2.5">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1"
                >
                  <FileText className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono text-2xs">{f.name}</span>
                  <span className="text-2xs text-subtle">
                    {prettySize(f.size)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() =>
                      setFiles((prev) => prev.filter((x) => x.id !== f.id))
                    }
                    className="text-subtle hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setDismissed(false);
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.files;
              if (pasted.length) {
                e.preventDefault();
                void addFiles(pasted);
              }
            }}
            onKeyDown={(e) => {
              if (palette.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHi((n) => (n + 1) % palette.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHi((n) => (n - 1 + palette.length) % palette.length);
                  return;
                }
                if (e.key === "Tab" || (e.key === "Enter" && !e.metaKey && !e.ctrlKey)) {
                  e.preventDefault();
                  if (slashOpen) {
                    const c = matches[hi] ?? matches[0];
                    if (c) choose(c);
                  } else if (atOpen) {
                    const p = atMatches[hi] ?? atMatches[0];
                    if (p) mention(p);
                  }
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setDismissed(true);
                  return;
                }
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder={
              running
                ? `${provider.short} is working…`
                : `Steer ${provider.short}…  / commands  @ a session`
            }
            disabled={running}
            className="w-full resize-none bg-transparent px-3.5 pt-3 pb-1 text-sm leading-relaxed text-foreground outline-none placeholder:text-subtle disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <div className="flex min-w-0 items-center gap-1">
              <div ref={menuRef} className="relative">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Add to message"
                  aria-expanded={menu}
                  disabled={running}
                  className="size-11 md:size-8"
                  onClick={() => {
                    setMenu((v) => !v);
                    setPeersOpen(false);
                  }}
                >
                  <Plus className="size-4" />
                </Button>
                {menu ? (
                  <div className="absolute bottom-full left-0 z-20 mb-1 min-w-48 rounded-md border border-border bg-window py-1 shadow-window">
                    {peersOpen ? (
                      <>
                        <p className="px-3 py-1 text-2xs text-subtle">
                          Message a session
                        </p>
                        {peers.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-muted-foreground">
                            No other sessions on this desk.
                          </p>
                        ) : (
                          peers.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setValue((v) =>
                                  `${v}${v && !v.endsWith(" ") ? " " : ""}Tell @${p.providerId} `,
                                );
                                setMenu(false);
                                setPeersOpen(false);
                                ref.current?.focus();
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
                            >
                              <ProviderDot id={p.providerId} />
                              <span className="min-w-0 flex-1 truncate">
                                {p.title}
                              </span>
                            </button>
                          ))
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setMenu(false);
                            fileRef.current?.click();
                          }}
                          className="block w-full px-3 py-2 text-left text-xs hover:bg-muted"
                        >
                          Attach files
                        </button>
                        <button
                          type="button"
                          onClick={() => setPeersOpen(true)}
                          className="block w-full px-3 py-2 text-left text-xs hover:bg-muted"
                        >
                          Message a session
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
              <span className="inline-flex min-w-0 items-center gap-1.5 px-1 text-2xs text-muted-foreground">
                <ProviderDot id={session.providerId} />
                {provider.short}
                <span className="text-subtle">·</span>
                <span className="truncate">{session.model}</span>
                <span className="text-subtle">·</span>
                {effortLabel(session.providerId, session.effort)}
              </span>
            </div>
            {running ? (
              <Button
                size="icon"
                variant="subtle"
                aria-label="Stop"
                className="size-11 md:size-8"
                onClick={() => stop(session.id)}
              >
                <Square className="size-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                aria-label="Send"
                className="size-11 md:size-8"
                disabled={!value.trim() && files.length === 0}
                onClick={() => submit()}
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-1.5 px-1 text-2xs text-subtle">
        ⌘ Enter · + files · @ a session · {provider.authLabel}
      </p>
    </div>
  );
}
