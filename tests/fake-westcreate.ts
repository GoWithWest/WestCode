// A stand-in for WestCreate's local MCP endpoint (Streamable HTTP, bearer
// token), answering the few read-only calls WestCode makes.
import http from "node:http";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export async function fakeWestcreate(opts: { sse?: boolean } = {}) {
  const token = "test-token";
  const calls: string[] = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.headers.authorization !== `Bearer ${token}`) {
        res.writeHead(401).end('{"error":"bad token"}');
        return;
      }
      const msg = JSON.parse(body);
      calls.push(msg.method + (msg.params?.uri ? ` ${msg.params.uri}` : msg.params?.name ? ` ${msg.params.name}` : ""));
      let result: unknown = {};
      if (msg.method === "initialize") result = { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "westcreate" } };
      if (msg.method === "tools/list") result = { tools: [{ name: "describe_app" }, { name: "get_view" }, { name: "run" }, { name: "machine" }] };
      if (msg.method === "resources/read") {
        const data =
          msg.params.uri === "westcreate://document"
            ? { name: "Box 100x60x40", units: "mm", layers: [{ name: "Cut" }], items: [{ id: "a" }, { id: "b" }], revision: 7 }
            : msg.params.uri === "westcreate://job"
              ? { fitsBed: true, timeSeconds: 312, lengthMm: 4210 }
              : { connected: false, state: "Idle" };
        result = { contents: [{ uri: msg.params.uri, mimeType: "application/json", text: JSON.stringify(data) }] };
      }
      if (msg.method === "tools/call" && msg.params.name === "get_view") {
        result = { content: [{ type: "image", mimeType: "image/png", data: PNG_1PX }] };
      }
      const reply = JSON.stringify({ jsonrpc: "2.0", id: msg.id, result });
      if (opts.sse) {
        res.writeHead(200, { "content-type": "text/event-stream" }).end(`event: message\ndata: ${reply}\n\n`);
      } else {
        res.writeHead(200, { "content-type": "application/json" }).end(reply);
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const port = (server.address() as { port: number }).port;
  const home = mkdtempSync(join(tmpdir(), "wc-westcreate-"));
  mkdirSync(join(home, "bin"), { recursive: true });
  writeFileSync(join(home, "bin", "westcreate-mcp.mjs"), "// bridge placeholder\n");
  writeFileSync(
    join(home, "mcp.json"),
    JSON.stringify({ url: `http://127.0.0.1:${port}/mcp`, token, pid: process.pid, mode: "desktop", startedAt: "2026-10-18T09:00:00Z" }),
  );
  return { home, calls, close: () => new Promise<void>((r) => server.close(() => r())) };
}
