// WestCreate on the desk. WestCreate (laser cutting, CNC, 3D printing) runs
// an MCP server on 127.0.0.1 and writes where to find it to
// ~/.westcreate/mcp.json ({url, token, pid, mode}); its stdio bridge lives at
// ~/.westcreate/bin/westcreate-mcp.mjs. WestCode only READS from it here:
//   - every agent session gets the bridge as an MCP server, so Mason (and any
//     agent) can drive WestCreate even when a CLI never registered it;
//   - the WestCreate view shows the open drawing, the planned job and the
//     machine, through the same read-only resources and get_view tool the
//     agents use.
// Nothing here edits WestCreate's files, settings or drawings.
import { execFile, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function westcreateHome() {
  return process.env.WESTCREATE_HOME || join(homedir(), ".westcreate");
}

export function bridgePath() {
  return join(westcreateHome(), "bin", "westcreate-mcp.mjs");
}

/** The running app's endpoint, or null when it is not running. */
export function readEndpoint() {
  const file = process.env.WESTCREATE_ENDPOINT_FILE || join(westcreateHome(), "mcp.json");
  try {
    const ep = JSON.parse(readFileSync(file, "utf8"));
    if (!ep?.url || !ep?.token) return null;
    if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(String(ep.url))) return null;
    if (ep.pid) {
      try {
        process.kill(ep.pid, 0);
      } catch {
        return null;
      }
    }
    return ep;
  } catch {
    return null;
  }
}

/** The MCP server entry ACP sessions get, or null when WestCreate is absent. */
export function sessionServer(nodeBin, electronExec) {
  const bridge = bridgePath();
  if (!existsSync(bridge)) return null;
  const env = [];
  if (!nodeBin && electronExec) env.push({ name: "ELECTRON_RUN_AS_NODE", value: "1" });
  if (process.env.WESTCREATE_ENDPOINT_FILE) {
    env.push({ name: "WESTCREATE_ENDPOINT_FILE", value: process.env.WESTCREATE_ENDPOINT_FILE });
  }
  return { type: "stdio", name: "westcreate", command: nodeBin || electronExec, args: [bridge], env };
}

// ---- Which CLIs already have it registered (then WestCode does not add a
// second copy under the same name).
const registered = new Map();

function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

export function cliHasWestcreate(providerId, home = homedir()) {
  if (providerId === "claude") {
    try {
      const cfg = JSON.parse(readText(join(home, ".claude.json")) || "{}");
      return Boolean(cfg.mcpServers?.westcreate);
    } catch {
      return false;
    }
  }
  if (providerId === "codex") return /^\[mcp_servers\.westcreate\]/m.test(readText(join(home, ".codex", "config.toml")));
  if (providerId === "grok") return registered.get("grok") === true;
  return false;
}

/** Grok keeps its MCP list behind its CLI; ask it once in the background. */
export function refreshGrokRegistration(grokBin) {
  if (!grokBin) return;
  execFile(grokBin, ["mcp", "list"], { timeout: 15_000 }, (_err, stdout = "") => {
    registered.set("grok", /\bwestcreate\b/.test(stdout));
  });
}

// ---- Read-only MCP client over the app's HTTP endpoint.

async function post(ep, msg) {
  const res = await fetch(ep.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${ep.token}`,
      "mcp-protocol-version": "2025-06-18",
    },
    body: JSON.stringify(msg),
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 202 || res.status === 204) return null;
  const body = await res.text();
  if (!res.ok && !body.includes('"jsonrpc"')) throw new Error(`WestCreate answered HTTP ${res.status}`);
  let msgs = [];
  if ((res.headers.get("content-type") || "").includes("text/event-stream")) {
    for (const block of body.split(/\r?\n\r?\n/)) {
      const data = block
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (data) msgs.push(JSON.parse(data));
    }
  } else if (body.trim()) msgs = [JSON.parse(body)];
  const reply = msgs.find((m) => m.id === msg.id);
  if (reply?.error) throw new Error(reply.error.message || "MCP error");
  return reply?.result ?? null;
}

let rpcId = 1;
function rpc(ep, method, params) {
  return post(ep, { jsonrpc: "2.0", id: rpcId++, method, params });
}

function resourceJson(result) {
  const text = result?.contents?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Everything the WestCreate view shows, in one read. */
export async function snapshot() {
  const installed = existsSync(westcreateHome());
  const bridge = existsSync(bridgePath());
  const ep = readEndpoint();
  const base = {
    installed,
    bridge,
    running: Boolean(ep),
    mode: ep?.mode ?? null,
    startedAt: ep?.startedAt ?? null,
    registeredWith: ["claude", "grok", "codex"].filter((p) => cliHasWestcreate(p)),
  };
  if (!ep) return { ok: true, ...base };
  try {
    await rpc(ep, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "westcode", version: "1" },
    });
    const [tools, doc, job, machine, view] = await Promise.all([
      rpc(ep, "tools/list", {}).catch(() => null),
      rpc(ep, "resources/read", { uri: "westcreate://document" }).catch(() => null),
      rpc(ep, "resources/read", { uri: "westcreate://job" }).catch(() => null),
      rpc(ep, "resources/read", { uri: "westcreate://machine" }).catch(() => null),
      rpc(ep, "tools/call", { name: "get_view", arguments: {} }).catch(() => null),
    ]);
    const image = view?.content?.find?.((c) => c.type === "image" && c.data);
    return {
      ok: true,
      ...base,
      tools: (tools?.tools ?? []).map((t) => t.name),
      document: resourceJson(doc),
      job: resourceJson(job),
      machine: resourceJson(machine),
      view: image ? `data:${image.mimeType || "image/png"};base64,${image.data}` : null,
    };
  } catch (err) {
    return { ok: false, ...base, error: err.message };
  }
}

/** Open the app (macOS); WestCreate writes its endpoint when it is up. */
export function openApp() {
  return new Promise((resolve) => {
    if (process.platform !== "darwin") {
      resolve({ ok: false, error: "Open WestCreate by hand on this machine." });
      return;
    }
    const child = spawn("open", ["-a", "WestCreate"], { stdio: "ignore" });
    child.on("error", (e) => resolve({ ok: false, error: e.message }));
    child.on("exit", (code) => resolve(code === 0 ? { ok: true } : { ok: false, error: "WestCreate is not installed in Applications." }));
  });
}
