import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUp, ChevronDown, FileText, Plus, Shield, Square, X } from "lucide-react";
import {
  effortLabel,
  effortsFor,
  filterSlash,
  modelLabel,
  modelsFor,
  PERMISSION_MODES,
  permissionLabel,
  type SlashCmd,
} from "@/lib/catalog";
import { prettySize, readAttachments } from "@/lib/fs";
import { useHelix } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Attachment, Session } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ProviderDot, useResolvedProvider } from "./provider";

type Panel = "mode" | "model" | "effort" | null;

const drafts = new Map<string, { text: string; files: Attachment[] }>();

export function Composer({ session }: { session: Session }) {
  const send = useHelix((s) => s.send);
  const stop = useHelix((s) => s.stop);
  const setSessionModel = useHelix((s) => s.setSessionModel);
  const setSessionEffort = useHelix((s) => s.setSessionEffort);
  const setSessionPermissionMode = useHelix((s) => s.setSessionPermissionMode);
  const sessions = useHelix((s) => s.sessions);
  const saved = drafts.get(session.id);
  const [value, setValue] = useState(saved?.text ?? "");
  const [files, setFiles] = useState<Attachment[]>(saved?.files ?? []);
  const [hi, setHi] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [menu, setMenu] = useState(false);
  const [peersOpen, setPeersOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [drop, setDrop] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const running = session.status === "running";
  const queued = session.queued?.length ?? 0;
  const provider = useResolvedProvider(session.providerId);
  const peers = sessions.filter((s) => s.id !== session.id);
  const models = session.availableModels?.length
    ? session.availableModels
    : modelsFor(session.providerId, provider.models);
  const efforts = effortsFor(session.providerId);
  const effortIdx = Math.max(
    0,
    efforts.findIndex((e) => e.id === session.effort),
  );

  const slashOpen =
    !dismissed &&
    value.startsWith("/") &&
    !value.includes("\n") &&
    !value.includes(" ");
  const matches = useMemo(
    () =>
      slashOpen
        ? filterSlash(session.providerId, value, session.slashCommands)
        : [],
    [slashOpen, session.providerId, session.slashCommands, value],
  );

  const atMatch = /(?:^|\s)@([^\s]*)$/.exec(value);
  const atOpen = !slashOpen && Boolean(atMatch);
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

  const draftRef = useRef({ value, files });
  draftRef.current = { value, files };

  useEffect(() => {
    ref.current?.focus();
    return () => {
      const { value: text, files: attached } = draftRef.current;
      if (text.trim() || attached.length) {
        drafts.set(session.id, { text, files: attached });
      } else {
        drafts.delete(session.id);
      }
    };
  }, [session.id]);

  useEffect(() => {
    setHi(0);
  }, [value, session.id, peersOpen]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (menu && !menuRef.current?.contains(t)) {
        setMenu(false);
        setPeersOpen(false);
      }
      if (panel && !metaRef.current?.contains(t)) setPanel(null);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menu, panel]);

  function submit(text = value) {
    const t = text.trim();
    if (!t && files.length === 0) return;
    const attached = files;
    setValue("");
    setFiles([]);
    setDismissed(false);
    setMenu(false);
    setPanel(null);
    drafts.delete(session.id);
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
  const canSend = Boolean(value.trim() || files.length);

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
              if (e.nativeEvent.isComposing) return;
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
                if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
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
              if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder={
              running
                ? `Queue a follow-up for ${provider.short}…`
                : `Message ${provider.short}…  / commands  @ a session`
            }
            className="w-full resize-none bg-transparent px-3.5 pt-3 pb-1 text-sm leading-relaxed text-foreground outline-none placeholder:text-subtle"
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <div className="flex min-w-0 items-center gap-0.5">
              <div ref={menuRef} className="relative">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Add to message"
                  aria-expanded={menu}
                  className="size-11 md:size-8"
                  onClick={() => {
                    setMenu((v) => !v);
                    setPeersOpen(false);
                    setPanel(null);
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

              <div ref={metaRef} className="flex min-w-0 items-center gap-0.5">
                <MetaButton
                  open={panel === "mode"}
                  onToggle={() => setPanel(panel === "mode" ? null : "mode")}
                  label={permissionLabel(session.permissionMode || "ask")}
                  icon={<Shield className="size-3" />}
                >
                  {PERMISSION_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSessionPermissionMode(session.id, m.id);
                        setPanel(null);
                      }}
                      className={cn(
                        "block w-full px-3 py-2 text-left hover:bg-muted",
                        m.id === (session.permissionMode || "ask") && "bg-muted",
                      )}
                    >
                      <span className="block text-xs font-medium">{m.label}</span>
                      <span className="block text-2xs text-muted-foreground">
                        {m.hint}
                      </span>
                    </button>
                  ))}
                </MetaButton>

                <MetaButton
                  open={panel === "model"}
                  onToggle={() => setPanel(panel === "model" ? null : "model")}
                  label={modelLabel(
                    session.providerId,
                    session.model,
                    provider.models,
                  )}
                >
                  {models.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSessionModel(session.id, m.id);
                        setPanel(null);
                      }}
                      className={cn(
                        "block w-full truncate px-3 py-2 text-left text-xs hover:bg-muted",
                        m.id === session.model && "bg-muted font-medium",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </MetaButton>

                <MetaButton
                  open={panel === "effort"}
                  onToggle={() => setPanel(panel === "effort" ? null : "effort")}
                  label={effortLabel(session.providerId, session.effort)}
                >
                  <div className="px-3 py-3">
                    <p className="text-xs font-medium">
                      {efforts[effortIdx]?.label ?? session.effort}
                    </p>
                    <p className="mt-0.5 text-2xs text-muted-foreground">
                      {efforts[effortIdx]?.hint}
                    </p>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, efforts.length - 1)}
                      step={1}
                      value={effortIdx}
                      onChange={(e) => {
                        const next = efforts[Number(e.target.value)];
                        if (next) setSessionEffort(session.id, next.id);
                      }}
                      className="mt-3 w-full"
                      style={{ accentColor: "var(--color-accent)" }}
                    />
                    <div className="mt-1 flex justify-between text-2xs text-subtle">
                      <span>{efforts[0]?.label}</span>
                      <span>{efforts[efforts.length - 1]?.label}</span>
                    </div>
                  </div>
                </MetaButton>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {queued > 0 ? (
                <span className="text-2xs text-subtle">{queued} queued</span>
              ) : null}
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
              ) : null}
              <Button
                size="icon"
                aria-label={running ? "Queue" : "Send"}
                className="size-11 md:size-8"
                disabled={!canSend}
                onClick={() => submit()}
              >
                <ArrowUp className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-1.5 px-1 text-2xs text-subtle">
        Enter to send · Shift Enter for a new line · {provider.authLabel}
      </p>
    </div>
  );
}

function MetaButton({
  open,
  onToggle,
  label,
  icon,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "inline-flex h-8 max-w-36 items-center gap-1 rounded-md px-1.5 text-2xs text-muted-foreground hover:bg-muted hover:text-foreground",
          open && "bg-muted text-foreground",
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
        <ChevronDown className="size-3 shrink-0 opacity-70" />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-20 mb-1 min-w-48 overflow-hidden rounded-md border border-border bg-window py-1 shadow-window">
          {children}
        </div>
      ) : null}
    </div>
  );
}
