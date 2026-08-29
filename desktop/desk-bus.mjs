import http from "node:http";
import { watch } from "node:fs";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { outboxDir, outboxPath, resultPath, rosterPath, tmpRosterPath } from "./desk-paths.mjs";

/** @type {{ id: string, title: string, providerId: string, provider: string, cwd: string, model: string, status: string }[]} */
let roster = [];

/** @type {(msg: { from: string, to: string, text: string }) => Promise<{ ok: boolean, error?: string, deliveredTo?: string }>} */
let onSend = async () => ({ ok: false, error: "Desk is not ready." });

const watching = new Set();

export function setSendHandler(fn) {
  onSend = fn;
}

async function writeRosterFiles(rows) {
  const payload = `${JSON.stringify({ sessions: rows }, null, 2)}\n`;
  try {
    await writeFile(rosterPath(), payload, "utf8");
  } catch {
    /* ignore */
  }
  try {
    await writeFile(tmpRosterPath(), payload, "utf8");
  } catch {
    /* ignore */
  }
}

export function setRoster(rows) {
  roster = Array.isArray(rows) ? rows : [];
  void writeRosterFiles(roster);
}

async function handleOutboxFile(id) {
  const file = outboxPath(id);
  let request;
  try {
    request = JSON.parse(await readFile(file, "utf8"));
  } catch {
    return;
  }
  const result = await onSend({
    from: String(request.from || ""),
    to: String(request.to || ""),
    text: String(request.text || ""),
  });
  try {
    await writeFile(resultPath(id), JSON.stringify(result), "utf8");
  } catch {
    /* ignore */
  }
  try {
    await unlink(file);
  } catch {
    /* ignore */
  }
}

function watchOutbox() {
  const dir = outboxDir();
  if (watching.has(dir)) return;
  watching.add(dir);
  try {
    watch(dir, (_event, filename) => {
      if (!filename || !filename.endsWith(".json")) return;
      const id = filename.replace(/\.json$/, "");
      void handleOutboxFile(id);
    });
  } catch {
    /* ignore */
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on("data", (c) => {
      n += c.length;
      if (n > 1_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export function startDeskBus() {
  watchOutbox();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    res.setHeader("Content-Type", "application/json");

    const fail = (code, error) => {
      res.statusCode = code;
      res.end(JSON.stringify({ ok: false, error }));
    };

    if (req.method === "GET" && url.pathname === "/sessions") {
      const from = url.searchParams.get("from") || "";
      const sessions = roster.filter((s) => s.id !== from);
      res.end(JSON.stringify({ ok: true, sessions }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/send") {
      void readBody(req)
        .then((body) =>
          onSend({
            from: String(body.from || ""),
            to: String(body.to || ""),
            text: String(body.text || ""),
          }),
        )
        .then((result) => res.end(JSON.stringify(result)))
        .catch((err) => fail(400, err.message));
      return;
    }

    fail(404, "Not found");
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}
