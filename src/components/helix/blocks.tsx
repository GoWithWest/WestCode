import { Fragment, memo, useEffect, useState, type ComponentType } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Brain,
  Check,
  ChevronRight,
  Copy,
  FilePen,
  FileSearch,
  FileText,
  Eye,
  Globe,
  History,
  Undo2,
  Search,
  Send,
  SquareTerminal,
  Trash2,
  Users,
  Wrench,
  X,
  type LucideProps,
} from "lucide-react";
import { diffLines, statsForDiffs, withContext, type DiffRow } from "@/lib/diff";
import { activityLine, formatSeconds, liveLabel, toolKindOf, toolLabel } from "@/lib/activity";
import { splitActivity } from "@/lib/parse-agent";
import type { Attachment, Block, ChatMessage, FileDiff, ToolBlock } from "@/lib/types";
import { useHelix } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ProviderDot, useResolvedProvider } from "./provider";
import { PREVIEWABLE, SessionIdContext, usePreview } from "./preview-context";

type Detail = "normal" | "thinking" | "verbose";

export function MessageList({
  messages,
  compact,
  sessionId,
  awaiting,
  queuedIds,
}: {
  messages: ChatMessage[];
  compact?: boolean;
  sessionId?: string;
  /** The tool the agent is waiting on your approval for, if any. */
  awaiting?: string;
  /** Messages sent while the agent was busy, not read yet. */
  queuedIds?: string[];
}) {
  const detail = useHelix((s) => s.settings.transcriptDetail ?? "normal");
  return (
    <SessionIdContext.Provider value={sessionId}>
      <div className={cn("mx-auto flex w-full max-w-3xl flex-col", compact ? "gap-4" : "gap-6")}>
        {messages.map((m) => (
          <Message
            key={m.id}
            message={m}
            compact={compact}
            detail={detail}
            sessionId={sessionId}
            awaiting={m.streaming ? awaiting : undefined}
          queued={queuedIds?.includes(m.id)}
          />
        ))}
      </div>
    </SessionIdContext.Provider>
  );
}

const Message = memo(function Message({
  message,
  compact,
  detail,
  sessionId,
  awaiting,
  queued,
}: {
  message: ChatMessage;
  compact?: boolean;
  detail: Detail;
  sessionId?: string;
  awaiting?: string;
  queued?: boolean;
}) {
  if (message.role === "system") {
    const text = message.blocks.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    return (
      <div className="flex justify-center">
        <pre
          className={cn(
            "max-w-[min(42rem,100%)] whitespace-pre-wrap rounded-md bg-surface px-3 py-2 font-sans text-2xs leading-relaxed text-muted-foreground",
            compact && "px-2.5 py-1.5",
          )}
        >
          {text}
          {message.restoreUndo && sessionId ? (
            <button
              type="button"
              onClick={() =>
                void useHelix
                  .getState()
                  .restoreCheckpoint(sessionId, message.restoreUndo!, "the restore")
              }
              className="ml-2 font-medium text-foreground underline underline-offset-2"
            >
              Undo
            </button>
          ) : null}
        </pre>
      </div>
    );
  }

  if (message.role === "agent") {
    return <AgentNote message={message} compact={compact} />;
  }

  if (message.role === "user") {
    const text = message.blocks.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    return (
      <div className="flex flex-col items-end gap-1">
      <div className="group/user flex items-center justify-end gap-2">
        {sessionId && !queued ? <RewindButton sessionId={sessionId} messageId={message.id} /> : null}
        {message.checkpoint && sessionId ? (
          <button
            type="button"
            title="Put the folder's files back to how they were before this message (undoable)"
            aria-label="Restore files to before this message"
            onClick={() => {
              if (
                window.confirm(
                  "Restore the folder's files to how they were before this message? Changes made after it are undone (you can undo the restore).",
                )
              ) {
                void useHelix
                  .getState()
                  .restoreCheckpoint(
                    sessionId,
                    message.checkpoint!,
                    text.length > 50 ? `${text.slice(0, 50).replace(/\s+\S*$/, "")}…` : text,
                  );
              }
            }}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-2xs text-subtle opacity-0 group-hover/user:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
          >
            <History className="size-3" />
            Restore
          </button>
        ) : null}
        <div
          className={cn(
            "max-w-[min(36rem,88%)] whitespace-pre-wrap rounded-2xl bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground",
            compact && "px-3 py-2 text-xs",
          )}
        >
          {message.attachments?.length ? <AttachmentRow items={message.attachments} /> : null}
          {text}
        </div>
      </div>
      {queued && sessionId ? (
        <div className="flex items-center gap-2 text-2xs text-subtle">
          <span>Queued — the agent reads it after this turn</span>
          <button
            type="button"
            onClick={() => useHelix.getState().steerNow(sessionId, message.id)}
            className="font-medium text-foreground hover:underline"
          >
            Send now
          </button>
          <button
            type="button"
            onClick={() => {
              // Take it back out of the queue and into the composer.
              useHelix.getState().unqueue(sessionId, message.id);
              window.dispatchEvent(new CustomEvent("westcode:compose", { detail: { sessionId, text } }));
            }}
            className="hover:text-foreground"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => useHelix.getState().unqueue(sessionId, message.id)}
            className="hover:text-foreground"
          >
            Remove
          </button>
        </div>
      ) : null}
      </div>
    );
  }

  const { activity, reply } = splitActivity(message.blocks);
  const streaming = Boolean(message.streaming);
  return (
    <div className="flex flex-col gap-2">
      {activity.length ? (
        <Activity
          blocks={activity}
          compact={compact}
          streaming={streaming && reply.length === 0}
          detail={detail}
        />
      ) : null}
      {awaiting ? <AwaitingApproval tool={awaiting} /> : null}
      {reply.map((b, i) =>
        b.type === "text" ? (
          <Markdown key={`${message.id}-r-${i}`} text={b.text} compact={compact} />
        ) : null,
      )}
      {streaming && message.blocks.length === 0 ? <Shimmer>Thinking</Shimmer> : null}
    </div>
  );
});

const THINKING_VERBS = [
  "Thinking",
  "Pondering",
  "Weighing it up",
  "Untangling",
  "Sifting",
  "Mulling it over",
  "Piecing it together",
  "Working it out",
];
let verbIndex = 0;
let verbTimer: number | null = null;
const verbListeners = new Set<(i: number) => void>();

/** One verb shared by every live "Thinking" label, changing every 8 s. */
function useThinkingVerb(active: boolean) {
  const [i, setI] = useState(verbIndex);
  useEffect(() => {
    if (!active) return;
    verbListeners.add(setI);
    if (verbTimer == null) {
      verbTimer = window.setInterval(() => {
        verbIndex = (verbIndex + 1) % THINKING_VERBS.length;
        verbListeners.forEach((fn) => fn(verbIndex));
      }, 8000);
    }
    return () => {
      verbListeners.delete(setI);
      if (!verbListeners.size && verbTimer != null) {
        window.clearInterval(verbTimer);
        verbTimer = null;
        verbIndex = 0;
      }
    };
  }, [active]);
  return THINKING_VERBS[i] ?? "Thinking";
}

/** "Thinking…" with a light sweep, the way the desktop apps show live work. */
export function Shimmer({ children, className }: { children: string; className?: string }) {
  const thinking = children === "Thinking";
  const verb = useThinkingVerb(thinking);
  return (
    <span
      className={cn(
        "shimmer-text inline-block text-xs font-medium text-muted-foreground",
        className,
      )}
      aria-live="polite"
    >
      {thinking ? `${verb}…` : children}
    </span>
  );
}

/** Inline marker while the agent is blocked on your OK (card is below). */
function AwaitingApproval({ tool }: { tool: string }) {
  return (
    <button
      type="button"
      onClick={() =>
        document
          .getElementById("permission-card")
          ?.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      className="flex w-fit max-w-full items-center gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-1.5 text-left text-xs text-warn"
    >
      <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-warn" />
      <span className="min-w-0 truncate">
        Waiting for your approval:{" "}
        <span className="font-mono">{tool.replace(/`/g, "").slice(0, 80)}</span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------- activity

const KIND_ICON: Record<string, ComponentType<LucideProps>> = {
  read: FileText,
  edit: FilePen,
  delete: Trash2,
  move: FilePen,
  search: Search,
  execute: SquareTerminal,
  fetch: Globe,
  think: Brain,
  send: Send,
  other: Wrench,
};

function Activity({
  blocks,
  compact,
  streaming,
  detail,
}: {
  blocks: Block[];
  compact?: boolean;
  streaming: boolean;
  detail: Detail;
}) {
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? detail !== "normal";
  const failed = blocks.some((b) => b.type === "tool" && b.status === "error");
  const diffs = blocks.flatMap((b) => (b.type === "tool" && b.diffs ? b.diffs : []));
  const stats = diffs.length ? statsForDiffs(diffs) : null;

  return (
    <div className={cn("flex flex-col", compact ? "gap-1" : "gap-1.5")}>
      <button
        type="button"
        onClick={() => setUserOpen(!open)}
        aria-expanded={open}
        className="group flex w-fit max-w-full items-center gap-1.5 rounded-md py-0.5 text-left text-xs text-muted-foreground hover:text-foreground"
      >
        {streaming ? (
          <Shimmer className="truncate">{liveLabel(blocks)}</Shimmer>
        ) : (
          <span className="truncate">{activityLine(blocks)}</span>
        )}
        {stats && (stats.adds || stats.dels) ? (
          <span className="shrink-0 font-mono text-2xs tabular-nums">
            <span className="text-success">+{stats.adds}</span>{" "}
            <span className="text-danger">−{stats.dels}</span>
          </span>
        ) : null}
        {failed ? <X className="size-3 shrink-0 text-danger" aria-label="A tool failed" /> : null}
        <ChevronRight
          className={cn(
            "size-3 shrink-0 opacity-60 transition-transform duration-(--motion-quick)",
            open && "rotate-90",
          )}
        />
      </button>
      {open ? (
        <div className="ml-1 flex flex-col gap-0.5 border-l border-border pl-3">
          {blocks.map((b, i) =>
            b.type === "tool" ? (
              <ToolRow
                key={b.toolId ?? `t${i}`}
                tool={b}
                compact={compact}
                verbose={detail === "verbose"}
              />
            ) : b.type === "think" ? (
              <ThoughtRow key={`k${i}`} block={b} defaultOpen={detail !== "normal"} />
            ) : b.text.trim() ? (
              <Markdown key={`x${i}`} text={b.text} compact muted />
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}

function ThoughtRow({
  block,
  defaultOpen,
}: {
  block: Extract<Block, { type: "think" }>;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const live = block.ms == null;
  return (
    <div className="py-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Brain className="size-3.5 shrink-0" />
        {live ? (
          <Shimmer>Thinking</Shimmer>
        ) : (
          <span>Thought for {formatSeconds(block.ms ?? 0)}</span>
        )}
        <ChevronRight
          className={cn("size-3 opacity-60 transition-transform", open && "rotate-90")}
        />
      </button>
      {open ? (
        <p className="mt-1 ml-5 whitespace-pre-wrap text-xs leading-relaxed text-subtle italic">
          {block.text}
        </p>
      ) : null}
    </div>
  );
}

function ToolRow({
  tool,
  compact,
  verbose,
}: {
  tool: ToolBlock;
  compact?: boolean;
  verbose?: boolean;
}) {
  const kind = toolKindOf(tool);
  const Icon = /^listagents$/i.test(tool.name) ? Users : (KIND_ICON[kind] ?? Wrench);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const hasBody = Boolean(tool.content || tool.diffs?.length);
  const open = userOpen ?? Boolean(verbose && hasBody);
  const stats = tool.diffs?.length ? statsForDiffs(tool.diffs) : null;
  const running = tool.status === "running";
  const preview = usePreview();

  const canPreview = Boolean(
    preview &&
    tool.status === "done" &&
    tool.path &&
    PREVIEWABLE.test(tool.path) &&
    kind !== "read",
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!hasBody}
          onClick={() => setUserOpen(!open)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-sm py-1 text-left text-xs text-muted-foreground enabled:hover:text-foreground"
        >
          <Icon className={cn("size-3.5 shrink-0", tool.status === "error" && "text-danger")} />
          {running ? (
            <Shimmer className="min-w-0 truncate">{toolLabel(tool)}</Shimmer>
          ) : (
            <span className="min-w-0 truncate font-mono text-[11.5px]">{toolLabel(tool)}</span>
          )}
          {stats ? (
            <span className="shrink-0 font-mono text-2xs tabular-nums">
              <span className="text-success">+{stats.adds}</span>{" "}
              <span className="text-danger">−{stats.dels}</span>
            </span>
          ) : null}
          {tool.status === "error" ? (
            <span className="shrink-0 text-2xs text-danger">failed</span>
          ) : null}

          {hasBody ? (
            <ChevronRight
              className={cn(
                "ml-auto size-3 shrink-0 opacity-50 transition-transform",
                open && "rotate-90",
              )}
            />
          ) : null}
        </button>
        {canPreview ? (
          <button
            type="button"
            onClick={() => preview!({ path: tool.path })}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-2xs text-foreground hover:bg-muted"
          >
            <Eye className="size-3" /> Preview
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="mt-1 mb-2 flex flex-col gap-2">
          {tool.diffs?.map((d, i) => (
            <DiffView key={`${d.path}-${i}`} diff={d} compact={compact} />
          ))}
          {tool.content && !tool.diffs?.length ? (
            <Output text={tool.content} kind={kind} compact={compact} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Shell output keeps its head and tail when long, like a terminal pane. */
function Output({ text, kind, compact }: { text: string; kind: string; compact?: boolean }) {
  const [all, setAll] = useState(false);
  const clean = text.replace(/^```[\w-]*\n?|```$/g, "").trimEnd();
  const lines = clean.split("\n");
  const long = lines.length > 14;
  const shown =
    long && !all
      ? kind === "execute"
        ? [...lines.slice(0, 4), `… ${lines.length - 10} more lines`, ...lines.slice(-6)]
        : [...lines.slice(0, 12), `… ${lines.length - 12} more lines`]
      : lines;
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background/60">
      <pre
        className={cn(
          "scrollbar-thin overflow-x-auto p-2.5 font-mono text-2xs leading-relaxed text-muted-foreground",
          compact ? "max-h-40" : "max-h-80",
        )}
      >
        {shown.join("\n")}
      </pre>
      {long ? (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="w-full border-t border-border px-2.5 py-1 text-left text-2xs text-subtle hover:text-foreground"
        >
          {all ? "Show less" : `Show all ${lines.length} lines`}
        </button>
      ) : null}
    </div>
  );
}

export function DiffView({ diff, compact }: { diff: FileDiff; compact?: boolean }) {
  return (
    <DiffRows
      rows={withContext(diffLines(diff.oldText, diff.newText), 3)}
      path={diff.path}
      compact={compact}
    />
  );
}

export function DiffRows({
  rows,
  path,
  compact,
  fill,
  commentFor,
}: {
  rows: DiffRow[];
  path?: string;
  compact?: boolean;
  /** Fill the parent's height instead of capping it. */
  fill?: boolean;
  /** Session id: line numbers take a comment that goes into its next message. */
  commentFor?: string;
}) {
  const name = path?.split("/").slice(-2).join("/");
  const [commentAt, setCommentAt] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const addComment = (line: number) => {
    if (!commentFor || !comment.trim()) return;
    window.dispatchEvent(
      new CustomEvent("westcode:compose", { detail: { sessionId: commentFor, text: `${path ?? ""}:${line}: ${comment.trim()}` } }),
    );
    setComment("");
    setCommentAt(null);
  };
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-background/60",
        fill && "flex min-h-0 flex-col",
      )}
    >
      {name ? (
        <div className="flex items-center gap-2 border-b border-border px-2.5 py-1 font-mono text-2xs text-muted-foreground">
          <FileSearch className="size-3" />
          <span className="truncate" title={path}>
            {name}
          </span>
        </div>
      ) : null}
      <div
        className={cn(
          "scrollbar-thin overflow-auto font-mono text-2xs leading-[1.55]",
          fill ? "min-h-0 flex-1" : compact ? "max-h-48" : "max-h-96",
        )}
      >
        <table className="w-full border-collapse">
          <tbody>
            {rows.map((r, i) =>
              r.kind === "gap" ? (
                <tr key={i} className="text-subtle">
                  <td colSpan={3} className="bg-muted/30 px-2.5 py-0.5 select-none">
                    ⋯ {r.skipped} unchanged {r.skipped === 1 ? "line" : "lines"}
                  </td>
                </tr>
              ) : (
                <Fragment key={i}>
                <tr
                  className={cn(
                    r.kind === "add" && "bg-success/12",
                    r.kind === "del" && "bg-danger/12",
                  )}
                >
                  <td className="w-8 px-1.5 text-right text-subtle select-none">
                    {r.kind === "add" ? "" : r.a}
                  </td>
                  <td className="w-8 px-1.5 text-right text-subtle select-none">
                    {commentFor && r.kind !== "del" ? (
                      <button
                        type="button"
                        title="Comment on this line (goes into the session's next message)"
                        onClick={() => setCommentAt(Number(r.b))}
                        className="hover:text-foreground"
                      >
                        {r.b}
                      </button>
                    ) : r.kind === "del" ? (
                      ""
                    ) : (
                      r.b
                    )}
                  </td>
                  <td className="px-2 whitespace-pre text-foreground/90">
                    <span
                      className={cn(
                        "mr-1.5 select-none",
                        r.kind === "add"
                          ? "text-success"
                          : r.kind === "del"
                            ? "text-danger"
                            : "text-subtle",
                      )}
                    >
                      {r.kind === "add" ? "+" : r.kind === "del" ? "−" : " "}
                    </span>
                    {r.text}
                  </td>
                </tr>
                {commentFor && commentAt != null && r.kind !== "del" && Number(r.b) === commentAt ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-1">
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          addComment(commentAt);
                        }}
                      >
                        <input
                          autoFocus
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder={`Comment on line ${commentAt}…`}
                          className="h-7 flex-1 rounded-md border border-border bg-surface px-2 font-sans text-xs outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button type="submit" className="rounded-md border border-border px-2 font-sans text-xs hover:bg-muted">
                          Add
                        </button>
                      </form>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- notes

function AgentNote({ message, compact }: { message: ChatMessage; compact?: boolean }) {
  const who = useResolvedProvider(message.fromProviderId ?? "claude");
  const text = message.blocks.map((b) => (b.type === "text" ? b.text : "")).join("\n");
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface px-3.5 py-2.5",
        compact && "px-3 py-2",
      )}
    >
      <p className="mb-1.5 flex items-center gap-1.5 text-2xs font-medium text-muted-foreground">
        <Send className="size-3" />
        <ProviderDot id={message.fromProviderId ?? "claude"} />
        Message from {who.short}
        {message.fromTitle ? (
          <>
            <span className="text-subtle">·</span>
            <span className="truncate">{message.fromTitle}</span>
          </>
        ) : null}
      </p>
      <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", compact && "text-xs")}>
        {text}
      </p>
    </div>
  );
}

function AttachmentRow({ items }: { items: Attachment[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-1">
      {items.map((a) => (
        <li
          key={a.id}
          className="inline-flex items-center gap-1 rounded-sm border border-border bg-window px-1.5 py-0.5 font-mono text-2xs text-muted-foreground"
        >
          <FileText className="size-3" />
          {a.name}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- markdown

export const Markdown = memo(function Markdown({
  text,
  compact,
  muted,
}: {
  text: string;
  compact?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "prose-west max-w-none text-sm leading-relaxed",
        muted ? "text-muted-foreground" : "text-foreground",
        compact && "text-xs",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const lang = /language-([\w-]+)/.exec(className ?? "")?.[1];
            const body = String(children ?? "");
            if (!lang && !body.includes("\n")) {
              return (
                <code className="rounded-xs bg-muted px-1 py-0.5 font-mono text-[0.85em]">
                  {children}
                </code>
              );
            }
            return <CodeBlock lang={lang} body={body.replace(/\n$/, "")} />;
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});

function CodeBlock({ lang, body }: { lang?: string; body: string }) {
  const [copied, setCopied] = useState(false);
  const preview = usePreview();
  const canPreview = preview && (lang === "html" || lang === "svg") && body.length > 40;
  return (
    <div className="group/code my-2 overflow-hidden rounded-lg border border-border bg-background/70">
      <div className="flex items-center justify-between border-b border-border px-3 py-1 text-2xs text-subtle">
        <span className="font-mono">{lang ?? "text"}</span>
        <span className="flex-1" />
        {canPreview ? (
          <button
            type="button"
            onClick={() => preview!({ code: body, lang })}
            className="mr-3 inline-flex items-center gap-1 opacity-70 hover:opacity-100"
            aria-label="Preview this code"
          >
            <Eye className="size-3" /> Preview
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(body);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
          className="inline-flex items-center gap-1 opacity-70 hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="scrollbar-thin overflow-x-auto p-3 font-mono text-2xs leading-relaxed text-foreground/90">
        {body}
      </pre>
    </div>
  );
}

/** "Rewind to here": fork the conversation before this message and edit it. */
function RewindButton({ sessionId, messageId }: { sessionId: string; messageId: string }) {
  const can = useHelix((s) => {
    const ses = s.sessions.find((x) => x.id === sessionId);
    return Boolean(ses?.agentSessionId && !ses.hostId && ses.status !== "running" && ses.providerId === "claude");
  });
  if (!can) return null;
  return (
    <button
      type="button"
      title="Rewind to here: the conversation goes back to before this message (files too, if a checkpoint exists) and the message returns to the box to edit"
      aria-label="Rewind to before this message"
      onClick={() => {
        if (window.confirm("Rewind to before this message? Later messages leave this conversation (a copy of the full one stays in your CLI history).")) {
          void useHelix.getState().rewindTo(sessionId, messageId);
        }
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-2xs text-subtle opacity-0 group-hover/user:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
    >
      <Undo2 className="size-3" />
      Rewind
    </button>
  );
}
