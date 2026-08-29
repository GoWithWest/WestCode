#!/usr/bin/env node
/**
 * MCP stdio server for the WestCode desk bus.
 * Speaks NDJSON or Content-Length, whichever the client used first.
 * Reads the roster from disk (sandbox-safe) and writes send requests to an outbox.
 */
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const FROM = process.env.WESTCODE_FROM_SESSION || "";
const DESK_DIR =
  process.env.WESTCODE_DESK_DIR || join(homedir(), ".westcode", "desk");
const DESK_HTTP = process.env.WESTCODE_DESK_URL || "";

const TOOLS = [
  {
    name: "westcode_list_sessions",
    description:
      "List other WestCode desk sessions you can message (Claude Code, Grok Build, Codex). Use this instead of ListAgents — ListAgents only shows Claude subagents, not Grok or Codex on this Mac.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "westcode_send_message",
    description:
      "Send a message to another WestCode session on this desk. `to` can be a session id, title, provider name (claude, grok, codex), or an AGENT name from the desk roster (e.g. Oz, Quinn) — if no session runs that agent yet, WestCode starts one automatically and delivers the message to it.",
    inputSchema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Session id, title, provider (claude / grok / codex), or agent name (auto-starts a session for that agent when none exists)",
        },
        text: { type: "string", description: "Plain-text message to deliver" },
      },
      required: ["to", "text"],
      additionalProperties: false,
    },
  },
];

let buf = Buffer.alloc(0);
let framed = null;

function write(obj) {
  const json = JSON.stringify(obj);
  if (framed === "headers") {
    const payload = Buffer.from(json, "utf8");
    process.stdout.write(`Content-Length: ${payload.length}\r\n\r\n`);
    process.stdout.write(payload);
  } else {
    process.stdout.write(`${json}\n`);
  }
}

function reply(id, result) {
  write({ jsonrpc: "2.0", id, result });
}

function fail(id, message) {
  write({ jsonrpc: "2.0", id, error: { code: -32000, message } });
}

async function readJson(path) {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

function rosterCandidates() {
  return [
    join(DESK_DIR, "roster.json"),
    join(homedir(), ".westcode", "desk", "roster.json"),
    join(tmpdir(), "westcode-desk", "roster.json"),
    join(process.cwd(), ".westcode-desk-roster.json"),
  ];
}

async function loadRoster() {
  for (const p of rosterCandidates()) {
    try {
      const data = await readJson(p);
      const sessions = data.sessions || data || [];
      if (Array.isArray(sessions)) return sessions;
    } catch {
      /* try next */
    }
  }
  if (DESK_HTTP) {
    try {
      const res = await fetch(
        `${DESK_HTTP}/sessions?from=${encodeURIComponent(FROM)}`,
      );
      const data = await res.json();
      return data.sessions || [];
    } catch {
      /* fall through */
    }
  }
  return [];
}

function formatSessions(sessions) {
  const others = sessions.filter((s) => s.id !== FROM);
  if (!others.length) return "No other sessions on this WestCode desk right now.";
  return others
    .map(
      (s) =>
        `- ${s.id} · ${s.provider} · ${s.title} · ${s.cwd} · ${s.model} · ${s.status}${s.agentName ? ` · agent: ${s.agentName}` : ""}`,
    )
    .join("\n");
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function deliver(to, text) {
  const id = randomUUID();
  const request = { id, from: FROM, to, text, at: Date.now() };
  const outbox = join(DESK_DIR, "outbox");
  const results = join(DESK_DIR, "results");
  await mkdir(outbox, { recursive: true });
  await mkdir(results, { recursive: true });
  const reqPath = join(outbox, `${id}.json`);
  const resPath = join(results, `${id}.json`);
  try {
    await writeFile(reqPath, JSON.stringify(request), "utf8");
  } catch {
    if (DESK_HTTP) {
      const data = await fetch(`${DESK_HTTP}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to, text }),
      }).then((r) => r.json());
      return data;
    }
    throw new Error("Could not write the WestCode outbox.");
  }
  // The outbox write above is the single delivery path. Never re-send the
  // same message over HTTP after a timeout — a late outbox pickup plus an
  // HTTP retry would deliver the task twice.
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const data = await readJson(resPath);
      if (data && typeof data.ok === "boolean") return data;
    } catch {
      /* not yet */
    }
    await sleep(50);
  }
  // Tombstone the request so a late pickup cannot race a caller retry. If
  // the unlink fails with ENOENT the desk already claimed it — the message
  // is being delivered, so tell the agent not to resend.
  let claimed = true;
  try {
    await unlink(reqPath);
    claimed = false;
  } catch {
    /* already picked up */
  }
  throw new Error(
    claimed
      ? "WestCode desk did not confirm delivery in time, but the message was picked up and is likely being delivered. Do not resend it; check with westcode_list_sessions instead."
      : "WestCode desk did not pick the message up in time; it was withdrawn. You may retry once.",
  );
}

async function handle(msg) {
  if (!msg || msg.method == null) return;
  const id = msg.id;
  const method = msg.method;
  const params = msg.params || {};

  if (method === "initialize") {
    const version = params.protocolVersion || "2024-11-05";
    reply(id, {
      protocolVersion: version,
      capabilities: { tools: {} },
      serverInfo: { name: "westcode", version: "1.0.0" },
    });
    return;
  }
  if (method === "notifications/initialized" || method === "initialized") {
    return;
  }
  if (method === "ping") {
    if (id != null) reply(id, {});
    return;
  }
  if (method === "tools/list") {
    reply(id, { tools: TOOLS });
    return;
  }
  if (method === "tools/call") {
    const name = params.name;
    const args = params.arguments || {};
    try {
      if (name === "westcode_list_sessions") {
        const sessions = await loadRoster();
        reply(id, {
          content: [{ type: "text", text: formatSessions(sessions) }],
        });
        return;
      }
      if (name === "westcode_send_message") {
        const to = String(args.to || "").trim();
        const text = String(args.text || "").trim();
        if (!to || !text) throw new Error("Both `to` and `text` are required.");
        const data = await deliver(to, text);
        if (!data.ok) throw new Error(data.error || "Delivery failed.");
        reply(id, {
          content: [
            {
              type: "text",
              text: `Delivered to ${data.deliveredTo || to}.`,
            },
          ],
        });
        return;
      }
      throw new Error(`Unknown tool: ${name}`);
    } catch (err) {
      reply(id, {
        content: [{ type: "text", text: err.message }],
        isError: true,
      });
    }
    return;
  }
  if (id != null) fail(id, `Method not found: ${method}`);
}

function pop() {
  const header = buf.indexOf(Buffer.from("Content-Length:"));
  if (header >= 0 && (framed === "headers" || framed == null)) {
    const sepCrlf = buf.indexOf(Buffer.from("\r\n\r\n"), header);
    const sepLf = buf.indexOf(Buffer.from("\n\n"), header);
    const sep = sepCrlf >= 0 ? sepCrlf : sepLf;
    if (sep < 0) return null;
    const head = buf.slice(header, sep).toString("utf8");
    const len = Number((/Content-Length:\s*(\d+)/i.exec(head) || [])[1] || 0);
    const start = sep + (sepCrlf >= 0 ? 4 : 2);
    if (buf.length < start + len) return null;
    if (framed == null) framed = "headers";
    const payload = buf.slice(start, start + len);
    buf = buf.slice(start + len);
    try {
      return JSON.parse(payload.toString("utf8"));
    } catch {
      return null;
    }
  }
  const nl = buf.indexOf(0x0a);
  if (nl < 0) return null;
  const line = buf.slice(0, nl).toString("utf8").replace(/\r$/, "").trim();
  buf = buf.slice(nl + 1);
  if (!line) return pop();
  if (framed == null) framed = "ndjson";
  try {
    return JSON.parse(line);
  } catch {
    return pop();
  }
}

process.stdin.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  while (true) {
    const msg = pop();
    if (!msg) break;
    void handle(msg);
  }
});

process.stdin.on("end", () => process.exit(0));
process.stdin.resume();
