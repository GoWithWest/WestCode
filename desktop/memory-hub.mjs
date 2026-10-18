// Memory shared by every agent on this computer.
//
// Each CLI keeps its own memory and its own global rules file. WestCode reads
// all of them (read-only), keeps ONE shared store — preferably a git
// repository the user owns, so memory follows them across machines — and
// writes a small managed block into each installed CLI's global rules file
// that says where the shared store is and how to save to it. That block is
// the only thing WestCode ever writes into another tool's files, it sits
// between markers, and the first write keeps a backup.
import { execFile } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

const START = "<!-- westcode:memory:start -->";
const END = "<!-- westcode:memory:end -->";

function home() {
  return process.env.WESTCODE_USER_HOME || homedir();
}

function git(cwd, args, stdin) {
  return new Promise((resolve) => {
    const child = execFile("git", args, { cwd, timeout: 60_000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } }, (err, stdout, stderr) =>
      resolve({ ok: !err, stdout: String(stdout).trim(), stderr: String(stderr).trim() }),
    );
    if (stdin != null) child.stdin?.end(stdin);
  });
}

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function writeAtomic(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, text, "utf8");
  renameSync(tmp, path);
}

function mdFiles(dir, limit = 400) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .slice(0, limit)
      .map((e) => join(dir, e.name));
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ sources

/**
 * Where each CLI keeps memory and global rules. Only what exists is returned.
 * kind "rules": a global instructions file the CLI reads every session.
 * kind "memory": a store of remembered facts.
 */
export function scanSources() {
  const h = home();
  const out = [];
  const add = (provider, kind, label, path, entries) => {
    if (!existsSync(path)) return;
    out.push({ provider, kind, label, path, entries: entries ?? null });
  };
  // Claude Code
  add("claude", "rules", "Claude Code global instructions", join(h, ".claude", "CLAUDE.md"));
  try {
    for (const p of readdirSync(join(h, ".claude", "projects"))) {
      const dir = join(h, ".claude", "projects", p, "memory");
      if (existsSync(dir)) add("claude", "memory", `Claude Code auto-memory (${p.replace(/^-/, "/").replace(/-/g, "/")})`, dir, mdFiles(dir).length);
    }
  } catch {
    /* no projects */
  }
  // Codex
  add("codex", "rules", "Codex global AGENTS.md", join(h, ".codex", "AGENTS.md"));
  add("codex", "memory", "Codex memories", join(h, ".codex", "memories"), mdFiles(join(h, ".codex", "memories")).length);
  // Grok Build
  add("grok", "rules", "Grok global AGENTS.md", join(h, ".grok", "AGENTS.md"));
  add("grok", "memory", "Grok memory (global)", join(h, ".grok", "memory-v2", "global"), mdFiles(join(h, ".grok", "memory-v2", "global", "topics")).length + 1);
  // Gemini CLI, Hermes
  add("gemini", "rules", "Gemini CLI GEMINI.md", join(h, ".gemini", "GEMINI.md"));
  add("hermes", "memory", "Hermes memory", join(h, ".hermes", "memories"), mdFiles(join(h, ".hermes", "memories")).length);
  // WestCode's own desk memory
  const wc = process.env.WESTCODE_HOME || join(h, ".westcode");
  add("westcode", "memory", "WestCode desk memory", join(wc, "memory"), mdFiles(join(wc, "memory")).length);
  return out;
}

/** Git facts about a folder: inside a repo? its root and origin remote. */
export async function repoInfo(path) {
  if (!path || !existsSync(path)) return { exists: false, repo: false };
  const dir = statSync(path).isDirectory() ? path : dirname(path);
  const root = await git(dir, ["rev-parse", "--show-toplevel"]);
  if (!root.ok) return { exists: true, repo: false };
  const remote = await git(dir, ["remote", "get-url", "origin"]);
  const last = await git(dir, ["log", "-1", "--format=%cr · %s"]);
  const ahead = await git(dir, ["rev-list", "--count", "@{u}..HEAD"]);
  return {
    exists: true,
    repo: true,
    root: root.stdout,
    remote: remote.ok ? remote.stdout : "",
    lastCommit: last.ok ? last.stdout : "",
    unpushed: ahead.ok ? Number(ahead.stdout) || 0 : null,
  };
}

/**
 * A memory store the user already keeps in git with a remote — the best
 * place for shared memory. Returns its root, or null.
 */
export async function detectMemoryRepo(sources = scanSources()) {
  for (const s of sources) {
    if (s.kind !== "memory") continue;
    const info = await repoInfo(s.path);
    if (info.repo && info.remote) return { path: info.root, from: s.label, remote: info.remote };
  }
  return null;
}

// ------------------------------------------------------------------ repo

const README = `# Memory

Shared memory for the coding agents on my computers (Claude Code, Codex,
Grok, …), kept in sync by WestCode.

- One Markdown file per fact, with frontmatter:
  \`name\` (kebab-case), \`description\` (one line), \`type\` (user, feedback,
  project or reference).
- \`TIMELINE.md\` lists every memory, newest first, one line each.
- Agents commit and push after adding or changing a memory.
`;

/** Start a memory repository in `dir` (git init, README, TIMELINE). */
export async function createRepo(dir) {
  mkdirSync(dir, { recursive: true });
  if (!(await repoInfo(dir)).repo) {
    const init = await git(dir, ["init", "-q"]);
    if (!init.ok) return { ok: false, error: init.stderr };
  }
  if (!existsSync(join(dir, "README.md"))) writeAtomic(join(dir, "README.md"), README);
  if (!existsSync(join(dir, "TIMELINE.md"))) writeAtomic(join(dir, "TIMELINE.md"), "# Timeline\n\n");
  await git(dir, ["add", "README.md", "TIMELINE.md"]);
  const c = await git(dir, ["-c", "user.name=WestCode", "-c", "user.email=memory@westcode.local", "commit", "-q", "-m", "Start the memory repository"]);
  return { ok: true, committed: c.ok };
}

/** Point the repo at a remote (e.g. a new private GitHub repo) and push. */
export async function setRemote(dir, url) {
  if (!/^(https:\/\/|git@|ssh:\/\/)[\w.@:/~-]+$/.test(String(url))) return { ok: false, error: "That does not look like a git remote URL." };
  const has = await git(dir, ["remote", "get-url", "origin"]);
  const r = has.ok ? await git(dir, ["remote", "set-url", "origin", url]) : await git(dir, ["remote", "add", "origin", url]);
  if (!r.ok) return { ok: false, error: r.stderr };
  const branch = (await git(dir, ["rev-parse", "--abbrev-ref", "HEAD"])).stdout || "main";
  const push = await git(dir, ["push", "-u", "origin", branch]);
  return push.ok ? { ok: true } : { ok: false, error: push.stderr || "Push failed." };
}

export function slugFor(text) {
  return (
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .split("-")
      .slice(0, 7)
      .join("-") || "memory"
  );
}

/**
 * Save one fact as a file in the memory repo (its own conventions win: a
 * TIMELINE.md gets a line), then commit and push. Push failure is reported,
 * not fatal — the commit is kept for the next push.
 */
export async function saveFact(dir, { text, type = "user", description }) {
  const t = String(text || "").trim();
  if (!t) return { ok: false, error: "Nothing to save." };
  let slug = slugFor(description || t);
  for (let i = 2; existsSync(join(dir, `${slug}.md`)); i++) slug = `${slugFor(description || t)}-${i}`;
  const desc = String(description || t).replace(/\s+/g, " ").slice(0, 140);
  const body = `---\nname: ${slug}\ndescription: ${desc}\nmetadata:\n  type: ${type}\n---\n\n${t}\n`;
  writeAtomic(join(dir, `${slug}.md`), body);
  const files = [`${slug}.md`];
  const timeline = join(dir, "TIMELINE.md");
  if (existsSync(timeline)) {
    const cur = read(timeline);
    const date = new Date().toISOString().slice(0, 10);
    const line = `- ${date} — [${slug}](${slug}.md) — ${desc}`;
    const lines = cur.split("\n");
    // Newest first: right after the heading block.
    const at = lines.findIndex((l) => l.startsWith("- "));
    if (at >= 0) lines.splice(at, 0, line);
    else lines.push(line);
    writeAtomic(timeline, lines.join("\n").replace(/\n*$/, "\n"));
    files.push("TIMELINE.md");
  }
  await git(dir, ["add", ...files]);
  const c = await git(dir, ["-c", "user.name=WestCode", "-c", "user.email=memory@westcode.local", "commit", "-q", "-m", `Remember: ${desc.slice(0, 60)}`]);
  if (!c.ok) return { ok: false, error: c.stderr || "Commit failed." };
  const remote = await git(dir, ["remote", "get-url", "origin"]);
  if (!remote.ok) return { ok: true, file: join(dir, `${slug}.md`), pushed: false, note: "No remote yet — saved locally." };
  const push = await git(dir, ["push", "-q"]);
  return { ok: true, file: join(dir, `${slug}.md`), pushed: push.ok, note: push.ok ? undefined : push.stderr.split("\n").slice(-1)[0] };
}

// ------------------------------------------------------------------ sync

/** Global rules files of the CLIs that are installed (their folder exists). */
export function rulesTargets() {
  const h = home();
  return [
    { provider: "claude", path: join(h, ".claude", "CLAUDE.md"), dir: join(h, ".claude") },
    { provider: "codex", path: join(h, ".codex", "AGENTS.md"), dir: join(h, ".codex") },
    { provider: "grok", path: join(h, ".grok", "AGENTS.md"), dir: join(h, ".grok") },
    { provider: "gemini", path: join(h, ".gemini", "GEMINI.md"), dir: join(h, ".gemini") },
  ].filter((t) => existsSync(t.dir));
}

export function memoryBlock({ repo, remote, local, facts = [] }) {
  const where = repo
    ? `- The shared memory store is the git repository \`${repo}\`${remote ? ` (pushed to ${remote})` : ""}.`
    : `- The shared memory store is \`${local}\` (on this computer only — ${"suggest creating a git repository for it so memory follows the user"}).`;
  const how = repo
    ? "- To remember something durable (who the user is, how they want work done, facts about their machines and projects): add one Markdown file per fact there with frontmatter `name`, `description` and `type`; if the folder has an index or TIMELINE.md, add a line to it; then commit and push. Update or remove a memory that turns out wrong."
    : "- To remember something durable: tell the user, or write a one-line fact into that folder's USER.md (about the user) or MEMORY.md (about their setup), separated by § lines.";
  const list = facts.length ? `\nWhat is already known:\n${facts.slice(0, 20).map((f) => `- ${f}`).join("\n")}\n` : "";
  return `${START}
## Shared memory (kept in sync by WestCode)

Memory is shared between every coding agent on this computer (Claude Code, Codex, Grok, …).
${where}
- Check it before starting work that might depend on earlier decisions.
${how}
${list}${END}`;
}

/** Replace (or append) the managed block; returns the new file text. */
export function withBlock(text, block) {
  const cur = String(text || "");
  const s = cur.indexOf(START);
  const e = cur.indexOf(END);
  if (s >= 0 && e > s) return `${cur.slice(0, s)}${block}${cur.slice(e + END.length)}`;
  return `${cur.replace(/\s*$/, "")}${cur.trim() ? "\n\n" : ""}${block}\n`;
}

export function withoutBlock(text) {
  const cur = String(text || "");
  const s = cur.indexOf(START);
  const e = cur.indexOf(END);
  if (s < 0 || e < s) return cur;
  return `${cur.slice(0, s).replace(/\s*$/, "")}\n${cur.slice(e + END.length).replace(/^\s*/, "")}`.replace(/^\n+/, "");
}

/** Write the block into every installed CLI's rules file (backup on first write). */
export function syncRules(opts) {
  const block = memoryBlock(opts);
  const results = [];
  for (const t of rulesTargets()) {
    try {
      const before = read(t.path);
      const after = withBlock(before, block);
      if (after === before) {
        results.push({ ...t, status: "in-sync" });
        continue;
      }
      if (before && !before.includes(START) && !existsSync(`${t.path}.before-westcode`)) {
        copyFileSync(t.path, `${t.path}.before-westcode`);
      }
      writeAtomic(t.path, after);
      results.push({ ...t, status: "written" });
    } catch (err) {
      results.push({ ...t, status: "failed", error: err.message });
    }
  }
  return results;
}

export function unsyncRules() {
  return rulesTargets().map((t) => {
    const before = read(t.path);
    if (!before.includes(START)) return { ...t, status: "absent" };
    writeAtomic(t.path, withoutBlock(before));
    return { ...t, status: "removed" };
  });
}

/** Which rules files carry the block now. */
export function syncState() {
  return rulesTargets().map((t) => ({ ...t, synced: read(t.path).includes(START) }));
}

/** First lines of a source, for the Memory view. */
export function preview(path, max = 40) {
  try {
    if (statSync(path).isDirectory()) {
      const files = mdFiles(path).map((p) => basename(p));
      const grokTopics = existsSync(join(path, "topics")) ? mdFiles(join(path, "topics")).map((p) => `topics/${basename(p)}`) : [];
      const mem = existsSync(join(path, "MEMORY.md")) ? read(join(path, "MEMORY.md")).split("\n").slice(0, max) : [];
      return { files: [...files, ...grokTopics].slice(0, 200), text: mem.join("\n") };
    }
    return { files: [], text: read(path).split("\n").slice(0, max).join("\n") };
  } catch {
    return { files: [], text: "" };
  }
}
