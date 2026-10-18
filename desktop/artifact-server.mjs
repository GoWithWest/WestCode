// Live previews of what agents make (Claude-style artifacts): a tiny static
// file server on 127.0.0.1 that serves ONLY folders WestCode registered (the
// session folders), so an agent's index.html loads with its CSS, JS and
// images exactly as a browser would. Inline code (an ```html block in a
// reply) is served from memory under /inline/<id>.
import { createServer } from "node:http";
import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { extname, join, normalize, relative, sep } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

let server = null;
let base = "";
const roots = new Map(); // id -> real path
const inline = new Map(); // id -> {type, body}

export async function startArtifactServer() {
  if (server) return base;
  server = createServer((req, res) => {
    try {
      const url = new URL(req.url || "/", "http://x");
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "inline" && parts[1] && inline.has(parts[1])) {
        const item = inline.get(parts[1]);
        res.writeHead(200, { "content-type": item.type, "cache-control": "no-store" });
        res.end(item.body);
        return;
      }
      if (parts[0] !== "f" || !parts[1] || !roots.has(parts[1])) {
        res.writeHead(404).end("Not found");
        return;
      }
      const root = roots.get(parts[1]);
      const rel = decodeURIComponent(parts.slice(2).join("/"));
      const full = normalize(join(root, rel));
      let real;
      try {
        real = realpathSync(full);
      } catch {
        res.writeHead(404).end("Not found");
        return;
      }
      // Never outside the registered folder (no ../, no symlink escape).
      const r = relative(root, real);
      if (r.startsWith("..") || r.split(sep).includes("..")) {
        res.writeHead(403).end("Forbidden");
        return;
      }
      let path = real;
      if (statSync(path).isDirectory()) path = join(path, "index.html");
      if (!existsSync(path)) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, {
        "content-type": TYPES[extname(path).toLowerCase()] || "application/octet-stream",
        "cache-control": "no-store",
      });
      createReadStream(path).pipe(res);
    } catch {
      res.writeHead(500).end("Error");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  return base;
}

/** URL that previews `file`, served from `root` (the session folder). */
export async function previewUrl(root, file) {
  await startArtifactServer();
  const realRoot = realpathSync(root);
  let id = [...roots.entries()].find(([, p]) => p === realRoot)?.[0];
  if (!id) {
    id = randomUUID().slice(0, 8);
    roots.set(id, realRoot);
  }
  const target = realpathSync(file);
  const rel = relative(realRoot, target);
  if (rel.startsWith("..")) throw new Error("That file is outside the session folder.");
  return `${base}/f/${id}/${rel.split(sep).map(encodeURIComponent).join("/")}`;
}

/** URL for inline code from a reply (html or svg). */
export async function inlineUrl(code, lang) {
  await startArtifactServer();
  const id = randomUUID().slice(0, 12);
  const type = lang === "svg" ? "image/svg+xml" : "text/html; charset=utf-8";
  inline.set(id, { type, body: String(code) });
  if (inline.size > 200) inline.delete(inline.keys().next().value);
  return `${base}/inline/${id}`;
}

export function stopArtifactServer() {
  server?.close();
  server = null;
  base = "";
  roots.clear();
  inline.clear();
}
