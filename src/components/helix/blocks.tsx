import { useState } from "react";
import {
  Check,
  ChevronRight,
  CircleDashed,
  FileCode,
  FileText,
  Send,
  Terminal,
  Users,
} from "lucide-react";
import type { Attachment, Block, ChatMessage, ToolBlock } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProviderDot, useResolvedProvider } from "./provider";

export function MessageList({
  messages,
  compact,
}: {
  messages: ChatMessage[];
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col", compact ? "gap-3" : "gap-5")}>
      {messages.map((m) => (
        <Message key={m.id} message={m} compact={compact} />
      ))}
    </div>
  );
}

function Message({
  message,
  compact,
}: {
  message: ChatMessage;
  compact?: boolean;
}) {
  if (message.role === "system") {
    const text = message.blocks
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");
    return (
      <div className="flex justify-center">
        <pre
          className={cn(
            "max-w-[min(42rem,100%)] whitespace-pre-wrap rounded-md border border-border bg-surface px-3 py-2 font-sans text-2xs leading-relaxed text-muted-foreground",
            compact && "px-2.5 py-1.5",
          )}
        >
          {text}
        </pre>
      </div>
    );
  }

  if (message.role === "agent") {
    return <AgentNote message={message} compact={compact} />;
  }

  if (message.role === "user") {
    const text = message.blocks
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");
    return (
      <div className="flex justify-end">
        <div
          className={cn(
            "max-w-[min(42rem,92%)] rounded-lg bg-muted px-3.5 py-2.5 text-sm leading-relaxed text-foreground",
            compact && "px-3 py-2 text-xs",
          )}
        >
          {message.attachments?.length ? (
            <AttachmentRow items={message.attachments} />
          ) : null}
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {message.blocks.map((b, i) => (
        <BlockView key={`${message.id}-${i}`} block={b} compact={compact} />
      ))}
      {message.streaming && message.blocks.length === 0 ? (
        <span className="text-xs text-muted-foreground">Thinking</span>
      ) : null}
    </div>
  );
}

function AgentNote({
  message,
  compact,
}: {
  message: ChatMessage;
  compact?: boolean;
}) {
  const who = useResolvedProvider(message.fromProviderId ?? "claude");
  const text = message.blocks
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface px-3.5 py-2.5",
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
      <p
        className={cn(
          "whitespace-pre-wrap text-sm leading-relaxed",
          compact && "text-xs",
        )}
      >
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

function BlockView({ block, compact }: { block: Block; compact?: boolean }) {
  if (block.type === "think") {
    return (
      <p className="text-xs italic leading-relaxed text-subtle">{block.text}</p>
    );
  }
  if (block.type === "tool") {
    return <ToolCard tool={block} compact={compact} />;
  }
  return <Prose text={block.text} compact={compact} />;
}

function ToolCard({ tool, compact }: { tool: ToolBlock; compact?: boolean }) {
  const send = /^sendmessage$/i.test(tool.name);
  const list = /^listagents$/i.test(tool.name);
  const [open, setOpen] = useState(
    tool.status === "running" || Boolean(tool.content),
  );
  const target = tool.to ?? tool.path ?? tool.command ?? "";
  const Icon = send ? Send : list ? Users : tool.name === "Bash" ? Terminal : FileCode;
  const running = tool.status === "running";

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-subtle transition-transform duration-(--motion-quick) ease-(--ease-out)",
            open && "rotate-90",
          )}
        />
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
          {tool.name}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
          {target}
        </span>
        {running ? (
          <CircleDashed className="size-3.5 animate-spin text-claude" />
        ) : (
          <Check className="size-3.5 text-success" />
        )}
      </button>
      {open && tool.content ? (
        <pre
          className={cn(
            "overflow-x-auto border-t border-border bg-background/40 p-3 font-mono text-2xs leading-relaxed text-muted-foreground",
            compact && "max-h-32 overflow-y-auto",
            !compact && "max-h-72",
          )}
        >
          {tool.content}
        </pre>
      ) : null}
    </div>
  );
}

function Prose({ text, compact }: { text: string; compact?: boolean }) {
  const parts = splitFences(text);
  return (
    <div
      className={cn(
        "max-w-prose text-sm leading-relaxed text-foreground",
        compact && "text-xs",
      )}
    >
      {parts.map((p, i) =>
        p.kind === "code" ? (
          <pre
            key={i}
            className="my-2 overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-2xs text-muted-foreground"
          >
            {p.body}
          </pre>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {inlineCode(p.body)}
          </p>
        ),
      )}
    </div>
  );
}

function splitFences(text: string) {
  const out: { kind: "text" | "code"; body: string }[] = [];
  const re = /```[\w-]*\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) {
      out.push({ kind: "text", body: text.slice(last, m.index).trim() });
    }
    out.push({ kind: "code", body: (m[1] ?? "").trimEnd() });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push({ kind: "text", body: text.slice(last).trim() });
  }
  return out.filter((p) => p.body);
}

function inlineCode(text: string) {
  const bits = text.split(/(`[^`]+`)/g);
  return bits.map((b, i) => {
    if (b.startsWith("`") && b.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded-xs bg-muted px-1 py-0.5 font-mono text-2xs text-accent"
        >
          {b.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{b}</span>;
  });
}
