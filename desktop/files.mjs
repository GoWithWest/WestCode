// Files pane (Claude Desktop's file tree + viewer): browse the session's
// folder, read a file, edit and save it (this Mac only; an SSH host's files
// are view-only, as in Claude Desktop).
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { getHost, q, runRemote, sshError } from "./ssh.mjs";

const SKIP = new Set([".git", "node_modules", ".DS_Store", ".output", ".next", "dist", "__pycache__", ".venv", ".turbo"]);
const MAX_READ = 2 * 1024 * 1024;

/** A path inside the session folder, or an error — never outside it. */
export function inside(root, rel) {
  const base = resolve(root);
  const target = resolve(base, String(rel || "."));
  const r = relative(base, target);
  if (r === ".." || r.startsWith(`..${sep}`) || isAbsolute(r)) throw new Error("That path is outside the session folder.");
  return target;
}

export async function listDir(root, rel = "", { hostId } = {}) {
  if (hostId) return listRemote(root, rel, hostId);
  const dir = inside(root, rel);
  const entries = await readdir(dir, { withFileTypes: true });
  const out = entries
    .filter((e) => !SKIP.has(e.name))
    .map((e) => ({ name: e.name, path: join(rel || "", e.name), dir: e.isDirectory() }))
    .sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
  return { ok: true, entries: out.slice(0, 2000) };
}

async function listRemote(root, rel, hostId) {
  const h = getHost(hostId);
  if (!h) return { ok: false, error: "Unknown SSH host." };
  const dir = `${String(root).replace(/\/$/, "")}/${String(rel || "").replace(/^\/+/, "")}`;
  if (String(rel || "").split("/").includes("..")) return { ok: false, error: "That path is outside the session folder." };
  const r = await runRemote(h, `cd ${q(dir)} 2>/dev/null || exit 3; ls -1Ap 2>/dev/null | head -n 2000`, { timeout: 20_000 });
  if (r.code === 3) return { ok: false, error: "No such folder on the host." };
  if (r.code !== 0) return { ok: false, error: sshError(r) };
  const entries = r.stdout
    .split("\n")
    .filter(Boolean)
    .map((l) => ({ name: l.replace(/\/$/, ""), dir: l.endsWith("/") }))
    .filter((e) => e.name !== "." && e.name !== ".." && !SKIP.has(e.name))
    .map((e) => ({ ...e, path: rel ? `${rel}/${e.name}` : e.name }))
    .sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
  return { ok: true, entries };
}

export async function readText(root, rel, { hostId } = {}) {
  if (hostId) {
    const h = getHost(hostId);
    if (!h) return { ok: false, error: "Unknown SSH host." };
    if (String(rel).split("/").includes("..")) return { ok: false, error: "That path is outside the session folder." };
    const file = `${String(root).replace(/\/$/, "")}/${String(rel).replace(/^\/+/, "")}`;
    const r = await runRemote(h, `head -c ${MAX_READ + 1} -- ${q(file)}`, { timeout: 30_000, binary: true });
    if (r.code !== 0) return { ok: false, error: sshError(r) };
    return decode(r.stdout, true);
  }
  const file = inside(root, rel);
  const st = await stat(file);
  if (st.size > MAX_READ) return { ok: true, text: "", tooLarge: true, size: st.size };
  return decode(await readFile(file), false);
}

function decode(buf, readOnly) {
  const tooLarge = buf.length > MAX_READ;
  const head = buf.subarray(0, Math.min(buf.length, 8000));
  if (head.includes(0)) return { ok: true, binary: true, text: "", readOnly };
  return { ok: true, text: buf.subarray(0, MAX_READ).toString("utf8"), tooLarge, readOnly };
}

/** Save an edited file (this Mac only). Refuses if it changed on disk since it was read. */
export async function writeText(root, rel, content, { expected } = {}) {
  const file = inside(root, rel);
  if (expected != null) {
    let cur = "";
    try {
      cur = await readFile(file, "utf8");
    } catch {
      /* new file */
    }
    if (cur !== expected) return { ok: false, conflict: true, error: "The file changed on disk since you opened it." };
  }
  await writeFile(file, String(content));
  return { ok: true };
}

/**
 * Files for @-mentions: the repository's files (git ls-files: tracked and
 * untracked, minus ignored), or a shallow walk when it is not a repository.
 * Best matches first: name starts with the query, then name contains it,
 * then the path does.
 */
export async function searchFiles(root, query, { hostId, limit = 30 } = {}) {
  const q = String(query || "").toLowerCase();
  let all = [];
  if (hostId) {
    const h = getHost(hostId);
    if (!h) return { ok: false, error: "Unknown SSH host." };
    const r = await runRemote(
      h,
      `cd ${q_(root)} 2>/dev/null || exit 3; if git rev-parse --git-dir >/dev/null 2>&1; then git ls-files -co --exclude-standard | head -n 20000; else find . -maxdepth 4 -type f -not -path '*/.*' 2>/dev/null | sed 's|^\\./||' | head -n 20000; fi`,
      { timeout: 20_000 },
    );
    if (r.code !== 0) return { ok: false, error: sshError(r) };
    all = r.stdout.split("\n").filter(Boolean);
  } else {
    const { runGit } = await import("./git.mjs");
    const r = await runGit(inside(root, "."), ["ls-files", "-co", "--exclude-standard", "-z"]);
    if (r.code === 0) all = r.stdout.split("\0").filter(Boolean).slice(0, 20000);
    else all = await walk(inside(root, "."), "", 0);
  }
  const score = (p) => {
    const name = p.split("/").pop().toLowerCase();
    if (!q) return 3;
    if (name.startsWith(q)) return 0;
    if (name.includes(q)) return 1;
    if (p.toLowerCase().includes(q)) return 2;
    return -1;
  };
  const hits = all
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s || a.p.length - b.p.length)
    .slice(0, limit)
    .map((x) => x.p);
  return { ok: true, files: hits };
}

const q_ = (s) => q(s);

async function walk(dir, rel, depth) {
  if (depth > 4) return [];
  let entries = [];
  try {
    entries = await readdir(join(dir, rel), { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    if (SKIP.has(e.name) || e.name.startsWith(".")) continue;
    const p = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(dir, p, depth + 1)));
    else out.push(p);
    if (out.length > 5000) break;
  }
  return out;
}
