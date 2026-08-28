import { createFileRoute } from "@tanstack/react-router";
import { formatRoster, systemPrompt } from "@/lib/prompts";
import { resolveProvider } from "@/lib/providers";
import type { AgentRosterItem } from "@/lib/types";

type Body = {
  providerId: string;
  providerName?: string;
  vendor?: string;
  projectId: string;
  cwd?: string;
  model?: string;
  effort?: string;
  skills?: string[];
  connectors?: string[];
  selfId?: string;
  roster?: AgentRosterItem[];
  messages: { role: "user" | "assistant"; content: string }[];
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        if (!body.providerId) {
          return Response.json({ error: "Unknown provider" }, { status: 400 });
        }

        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) {
          return sseFromText(
            fallbackReply(
              body.providerId,
              lastUser(body.messages),
              body.roster,
            ),
          );
        }

        const params = effortParams(body.effort);
        const messages = [
          {
            role: "system" as const,
            content: systemPrompt({
              providerId: body.providerId,
              projectId: body.projectId || "scratch",
              cwd: body.cwd,
              model: body.model,
              effort: body.effort,
              skills: body.skills,
              connectors: body.connectors,
              providerName: body.providerName,
              vendor: body.vendor,
              roster: body.roster,
              selfId: body.selfId,
            }),
          },
          ...body.messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content.slice(0, 6000),
          })),
        ];

        const upstream = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4.5",
            stream: true,
            temperature: params.temperature,
            max_tokens: params.max_tokens,
            messages,
          }),
          signal: request.signal,
        });

        if (!upstream.ok || !upstream.body) {
          const err = await upstream.text().catch(() => "");
          return sseFromText(
            fallbackReply(
              body.providerId,
              lastUser(body.messages),
              body.roster,
              `Upstream ${upstream.status} ${err.slice(0, 160)}`,
            ),
          );
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const reader = upstream.body!.getReader();
            const dec = new TextDecoder();
            let carry = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                carry += dec.decode(value, { stream: true });
                const lines = carry.split("\n");
                carry = lines.pop() ?? "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const data = trimmed.slice(5).trim();
                  if (!data || data === "[DONE]") continue;
                  try {
                    const json = JSON.parse(data) as {
                      choices?: { delta?: { content?: string } }[];
                    };
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ content })}\n\n`,
                        ),
                      );
                    }
                  } catch {
                    /* skip malformed chunk */
                  }
                }
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (e) {
              if ((e as Error).name !== "AbortError") {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ error: String((e as Error).message) })}\n\n`,
                  ),
                );
              }
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});

function effortParams(effort?: string) {
  switch (effort) {
    case "minimal":
    case "low":
      return { temperature: 0.5, max_tokens: 700 };
    case "high":
    case "extra":
    case "xhigh":
    case "max":
    case "supercode":
      return { temperature: 0.3, max_tokens: 1400 };
    default:
      return { temperature: 0.4, max_tokens: 1100 };
  }
}

function lastUser(messages: Body["messages"]) {
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}

function sseFromText(text: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const chunk = 24;
      for (let i = 0; i < text.length; i += chunk) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ content: text.slice(i, i + chunk) })}\n\n`,
          ),
        );
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

function pickPeer(prompt: string, roster?: AgentRosterItem[]) {
  if (!roster?.length) return undefined;
  const p = prompt.toLowerCase();
  const named = roster.find(
    (r) =>
      p.includes(`@${r.provider.toLowerCase()}`) ||
      p.includes(r.provider.toLowerCase()) ||
      p.includes(r.providerId.toLowerCase()) ||
      p.includes(r.id.toLowerCase()),
  );
  return named ?? roster[0];
}

function wantsSend(prompt: string, roster?: AgentRosterItem[]) {
  if (!roster?.length) return false;
  if (/(?:^|\s)@\w+/.test(prompt)) return true;
  return (
    /\b(tell|ask|message|notify|let|ping)\b/i.test(prompt) &&
    /\b(session|claude|codex|cursor|grok|peer|agent)\b/i.test(prompt)
  );
}

function fallbackReply(
  provider: string,
  prompt: string,
  roster?: AgentRosterItem[],
  note?: string,
) {
  const p = resolveProvider(provider);
  const file =
    provider === "claude"
      ? "src/auth/middleware.ts"
      : provider === "codex"
        ? "tests/checkout.spec.ts"
        : provider === "cursor"
          ? "src/ui/palette.rs"
          : "README.md";

  const peer =
    /\[Peer agent:/i.test(prompt) || /Incoming message from/i.test(prompt);
  const other = pickPeer(prompt, roster);

  if (peer && other) {
    return `<think>Peer agent pinged this session. Do the work and send a short result back.</think>
<tool name="Read" path="${file}">
// working tree
</tool>
<tool name="SendMessage" to="${other.id}">
Done on my side. ${prompt.slice(0, 120).replace(/\s+/g, " ")}
</tool>
Sent that back to ${other.provider}.`;
  }

  if (wantsSend(prompt, roster) && other) {
    return `<think>The human wants the other session to know. SendMessage, don't just describe it.</think>
<tool name="ListAgents">
${formatRoster(roster ?? [])}
</tool>
<tool name="SendMessage" to="${other.id}">
${prompt.slice(0, 400)}
</tool>
Sent to ${other.provider} · ${other.title}. ${note ?? ""}`;
  }

  return `<think>Look at the repo, then make the smallest change that answers the request.</think>
<tool name="Read" path="${file}">
// existing file — preview runtime
</tool>
<tool name="Edit" path="${file}">
--- a/${file}
+++ b/${file}
@@ -1,3 +1,6 @@
+// handled in preview: ${prompt.slice(0, 80)}
 export function apply() {
   return true;
 }
</tool>
The change is in \`${file}\`. ${note ? `Note: ${note}` : `${p.short} session — hosted ACP stand-in in this preview.`}`;
}
