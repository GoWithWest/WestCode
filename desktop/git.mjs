// Git for the session panel: status, diff, commit, branches, sync, history.
// The commands and their parsing follow GitHub Desktop (MIT,
// github.com/desktop/desktop, app/src/lib/git/*): porcelain v2 status with
// NUL separators, NUL-delimited for-each-ref/log formats, the commit flow
// that rebuilds the index from the selected files, and progress parsing.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

// ------------------------------------------------------------------ runner

/** Run git, resolve {code, stdout, stderr}. Never rejects. */
export function runGit(cwd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd,
      env: { ...(opts.env || process.env), TERM: "dumb", GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" },
    });
    const out = [];
    let err = "";
    child.stdout.on("data", (c) => out.push(c));
    child.stderr.on("data", (c) => {
      const s = c.toString("utf8");
      err += s;
      if (opts.onStderr) opts.onStderr(s);
    });
    child.on("error", (e) => resolve({ code: -1, stdout: "", stderr: e.message }));
    child.on("close", (code) => resolve({ code: code ?? -1, stdout: Buffer.concat(out).toString("utf8"), stderr: err }));
    if (opts.stdin != null) child.stdin.end(opts.stdin);
    else child.stdin.end();
  });
}

/** One write operation at a time per repository. */
const locks = new Map();
export function withRepoLock(cwd, fn) {
  const prev = locks.get(cwd) || Promise.resolve();
  const run = prev.then(fn, fn);
  locks.set(cwd, run.catch(() => {}));
  return run;
}

// ------------------------------------------------------------------ status

const ENTRY_1 = /^1 ([MADRCUTX?!.]{2}) (N\.\.\.|S[C.][M.][U.]) (\d+) (\d+) (\d+) ([a-f0-9]+) ([a-f0-9]+) ([\s\S]*?)$/;
const ENTRY_2 = /^2 ([MADRCUTX?!.]{2}) (N\.\.\.|S[C.][M.][U.]) (\d+) (\d+) (\d+) ([a-f0-9]+) ([a-f0-9]+) ([RC]\d+) ([\s\S]*?)$/;
const ENTRY_U = /^u ([DAU]{2}) (N\.\.\.|S[C.][M.][U.]) (\d+) (\d+) (\d+) (\d+) ([a-f0-9]+) ([a-f0-9]+) ([a-f0-9]+) ([\s\S]*?)$/;
const CONFLICT = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);

function kindFor(xy) {
  if (CONFLICT.has(xy)) return "conflicted";
  const [x, y] = xy;
  if (x === "R" || y === "R") return "renamed";
  if (x === "C" || y === "C") return "copied";
  if (x === "A" || y === "A") return "new";
  if (x === "D" || y === "D") return "deleted";
  return "modified";
}

/** Parse `git status --porcelain=2 --branch -z`. */
export function parseStatus(raw) {
  const tokens = raw.split("\0");
  const out = {
    oid: null,
    branch: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    hasUpstream: false,
    files: [],
  };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t) continue;
    if (t.startsWith("# ")) {
      let m;
      if ((m = /^# branch\.oid ([a-f0-9]+)$/.exec(t))) out.oid = m[1];
      else if ((m = /^# branch\.head (.*)$/.exec(t))) out.branch = m[1] === "(detached)" ? null : m[1];
      else if ((m = /^# branch\.upstream (.*)$/.exec(t))) out.upstream = m[1];
      else if ((m = /^# branch\.ab \+(\d+) -(\d+)$/.exec(t))) {
        out.ahead = Number(m[1]);
        out.behind = Number(m[2]);
        out.hasUpstream = true;
      }
      continue;
    }
    let m;
    if ((m = ENTRY_1.exec(t))) {
      const xy = m[1];
      // Added in the index, then deleted in the tree: nothing to commit.
      if (xy === "AD") continue;
      out.files.push({ path: m[8], kind: kindFor(xy), staged: xy[0] !== ".", submodule: m[2] !== "N..." });
    } else if ((m = ENTRY_2.exec(t))) {
      const oldPath = tokens[++i];
      out.files.push({ path: m[9], oldPath, kind: kindFor(m[1]), staged: m[1][0] !== ".", submodule: m[2] !== "N..." });
    } else if ((m = ENTRY_U.exec(t))) {
      out.files.push({ path: m[10], kind: "conflicted", staged: false, submodule: m[2] !== "N..." });
    } else if (t.startsWith("? ")) {
      out.files.push({ path: t.slice(2), kind: "untracked", staged: false, submodule: false });
    }
  }
  // An untracked file that replaces a staged delete shows once, as new work.
  const seen = new Map();
  for (const f of out.files) {
    const prev = seen.get(f.path);
    if (!prev || f.kind === "untracked") seen.set(f.path, f);
  }
  out.files = [...seen.values()];
  return out;
}

function gitDir(cwd) {
  return join(cwd, ".git");
}

/** Merge/rebase/cherry-pick in progress (file checks, as Desktop does). */
export function operationInProgress(cwd) {
  const g = gitDir(cwd);
  if (existsSync(join(g, "MERGE_HEAD"))) return "merge";
  if (existsSync(join(g, "rebase-merge")) || existsSync(join(g, "rebase-apply"))) return "rebase";
  if (existsSync(join(g, "CHERRY_PICK_HEAD"))) return "cherry-pick";
  return null;
}

export async function status(cwd) {
  const r = await runGit(cwd, [
    "--no-optional-locks",
    "status",
    "--untracked-files=all",
    "--branch",
    "--porcelain=2",
    "-z",
  ]);
  if (r.code !== 0) return { repo: false, error: r.stderr.trim() };
  const s = parseStatus(r.stdout);
  const remote = await runGit(cwd, ["remote"]);
  const remotes = remote.stdout.split("\n").map((x) => x.trim()).filter(Boolean);
  return {
    repo: true,
    ...s,
    tip: s.branch && s.oid ? "valid" : !s.branch && s.oid ? "detached" : s.branch ? "unborn" : "unknown",
    remotes,
    operation: operationInProgress(cwd),
  };
}

/** The sync button, in GitHub Desktop's order. */
export function syncAction(st) {
  if (!st?.repo) return { action: "none", label: "" };
  if (!st.remotes?.length) return { action: "publish-repo", label: "Publish repository", disabled: true };
  if (st.tip === "unborn") return { action: "fetch", label: "Fetch origin" };
  if (st.tip === "detached") return { action: "none", label: "Detached HEAD", disabled: true };
  if (!st.hasUpstream) return { action: "publish-branch", label: "Publish branch" };
  if (st.behind > 0) return { action: "pull", label: "Pull origin", ahead: st.ahead, behind: st.behind };
  if (st.ahead > 0) return { action: "push", label: "Push origin", ahead: st.ahead };
  return { action: "fetch", label: "Fetch origin" };
}

// ------------------------------------------------------------------ diff

export async function fileDiff(cwd, file) {
  const base = ["diff", "--no-ext-diff", "--no-color", "-M"];
  let r;
  if (file.kind === "untracked" || (file.kind === "new" && !file.staged)) {
    r = await runGit(cwd, [...base, "--no-index", "--", "/dev/null", file.path]);
  } else {
    r = await runGit(cwd, [...base, "HEAD", "--", ...(file.oldPath ? [file.oldPath] : []), file.path]);
    if (r.code === 128) {
      // Unborn HEAD: diff the index/tree against nothing.
      r = await runGit(cwd, [...base, "--cached", "--", file.path]);
    }
  }
  const text = r.stdout;
  if (/^Binary files /m.test(text)) return { binary: true, patch: "" };
  if (text.length > 4_500_000) return { tooLarge: true, patch: "" };
  return { patch: text };
}

// ------------------------------------------------------------------ commit

export function commitMessage(summary, description) {
  return `${String(summary).trim()}\n\n${String(description || "").trim()}`.replace(/\s+$/, "") + "\n";
}

/**
 * Commit exactly the chosen files: reset the index, stage them (old paths of
 * renames first, then the paths, removals included), commit from stdin.
 */
export async function commit(cwd, { paths, oldPaths = [], summary, description }) {
  if (!String(summary || "").trim()) return { ok: false, error: "A summary is required." };
  if (!Array.isArray(paths) || !paths.length) return { ok: false, error: "Choose at least one file." };
  return withRepoLock(cwd, async () => {
    const head = await runGit(cwd, ["rev-parse", "--verify", "HEAD"]);
    if (head.code === 0) await runGit(cwd, ["reset", "-q", "--", "."]);
    else await runGit(cwd, ["rm", "-q", "--cached", "-r", "--ignore-unmatch", "--", "."]);
    if (oldPaths.length) {
      await runGit(cwd, ["update-index", "--add", "--remove", "--force-remove", "--replace", "-z", "--stdin"], {
        stdin: oldPaths.join("\0") + "\0",
      });
    }
    const add = await runGit(cwd, ["update-index", "--add", "--remove", "--replace", "-z", "--stdin"], {
      stdin: paths.join("\0") + "\0",
    });
    if (add.code !== 0) return { ok: false, error: add.stderr.trim() || "Could not stage the files." };
    const r = await runGit(cwd, ["commit", "-F", "-"], { stdin: commitMessage(summary, description) });
    if (r.code !== 0) return { ok: false, error: (r.stderr || r.stdout).trim().slice(-2000) };
    const sha = await runGit(cwd, ["rev-parse", "HEAD"]);
    return { ok: true, sha: sha.stdout.trim(), output: r.stdout.trim() };
  });
}

/** Undo the last commit, keeping its changes in the working tree. */
export async function undoCommit(cwd) {
  return withRepoLock(cwd, async () => {
    const msg = await runGit(cwd, ["log", "-1", "--format=%s%x00%b"]);
    const parent = await runGit(cwd, ["rev-parse", "--verify", "HEAD^"]);
    let r;
    if (parent.code === 0) r = await runGit(cwd, ["reset", "-q", "HEAD^"]);
    else {
      // First commit: leave the branch unborn with the files untouched.
      r = await runGit(cwd, ["update-ref", "-d", "HEAD"]);
      if (r.code === 0) r = await runGit(cwd, ["rm", "-q", "--cached", "-r", "--ignore-unmatch", "--", "."]);
    }
    const [summary = "", description = ""] = msg.stdout.split("\0");
    return r.code === 0
      ? { ok: true, summary: summary.trim(), description: description.trim() }
      : { ok: false, error: r.stderr.trim() };
  });
}

/** Throw away local changes to these files (tracked: restore; untracked: delete). */
export async function discard(cwd, files, trash) {
  return withRepoLock(cwd, async () => {
    const tracked = files.filter((f) => f.kind !== "untracked" && f.kind !== "new").map((f) => f.path);
    const created = files.filter((f) => f.kind === "untracked" || f.kind === "new").map((f) => f.path);
    for (const p of created) {
      await runGit(cwd, ["rm", "-q", "--cached", "--ignore-unmatch", "--", p]);
      if (trash) await trash(join(cwd, p));
    }
    if (tracked.length) {
      await runGit(cwd, ["reset", "-q", "HEAD", "--", ...tracked]);
      const r = await runGit(cwd, ["checkout-index", "-f", "-u", "-q", "--stdin", "-z"], {
        stdin: tracked.join("\0") + "\0",
      });
      if (r.code !== 0) return { ok: false, error: r.stderr.trim() };
    }
    return { ok: true };
  });
}

// ------------------------------------------------------------------ branches

export function parseBranches(raw) {
  // records: %00name%00short%00upstream%00sha%00symref%00 + "\n"
  return raw
    .split("\n")
    .map((line) => line.split("\0"))
    .filter((p) => p.length >= 6)
    .map((p) => ({ ref: p[1], name: p[2], upstream: p[3] || null, sha: p[4], symref: p[5] }))
    .filter((b) => !b.symref && b.ref)
    .map(({ symref: _s, ...b }) => ({ ...b, remote: b.ref.startsWith("refs/remotes/") }));
}

export async function branches(cwd) {
  const r = await runGit(cwd, [
    "for-each-ref",
    "--sort=-committerdate",
    "--format=%00%(refname)%00%(refname:short)%00%(upstream:short)%00%(objectname)%00%(symref)%00",
    "refs/heads",
    "refs/remotes",
  ]);
  if (r.code !== 0) return { ok: false, error: r.stderr.trim(), branches: [] };
  return { ok: true, branches: parseBranches(r.stdout) };
}

export async function checkout(cwd, { name, remote, create, startPoint }) {
  return withRepoLock(cwd, async () => {
    let r;
    if (create) r = await runGit(cwd, ["checkout", "-b", name, ...(startPoint ? [startPoint] : []), "--"]);
    else if (remote) {
      const local = name.replace(/^[^/]+\//, "");
      r = await runGit(cwd, ["checkout", "-b", local, "--track", name, "--"]);
      if (r.code !== 0 && /already exists/.test(r.stderr)) r = await runGit(cwd, ["checkout", local, "--"]);
    } else r = await runGit(cwd, ["checkout", name, "--"]);
    return r.code === 0 ? { ok: true } : { ok: false, error: r.stderr.trim() };
  });
}

// ------------------------------------------------------------------ sync

/** "Receiving objects:  42% (21/50)" → {title, percent}. */
export function parseProgress(line) {
  const idx = line.lastIndexOf(": ");
  if (idx < 0) return null;
  const title = line.slice(0, idx).replace(/^remote:\s*/, "").trim();
  const m = /^(\d{1,3})% \((\d+)\/(\d+)\)/.exec(line.slice(idx + 2).trim());
  if (!m) return null;
  return { title, percent: Number(m[1]), done: Number(m[2]), total: Number(m[3]) };
}

function progressFeed(onProgress) {
  let buf = "";
  return (chunk) => {
    buf += chunk;
    const parts = buf.split(/[\r\n]/);
    buf = parts.pop() ?? "";
    for (const p of parts) {
      const pr = parseProgress(p.trim());
      if (pr && onProgress) onProgress(pr);
    }
  };
}

export async function sync(cwd, action, onProgress) {
  return withRepoLock(cwd, async () => {
    const st = await status(cwd);
    const remote = st.remotes?.includes("origin") ? "origin" : st.remotes?.[0];
    if (!remote) return { ok: false, error: "This repository has no remote." };
    if (remote.startsWith("-")) return { ok: false, error: "Refusing a remote whose name starts with '-'." };
    const onStderr = progressFeed(onProgress);
    let args;
    if (action === "fetch") args = ["fetch", "--progress", "--prune", "--", remote];
    else if (action === "pull") args = ["-c", "rebase.backend=merge", "pull", "--ff", "--progress", "--", remote];
    else if (action === "push") args = ["push", "--progress", "--", remote, st.branch];
    else if (action === "publish-branch") args = ["push", "--set-upstream", "--progress", "--", remote, st.branch];
    else return { ok: false, error: `Unknown sync action ${action}` };
    if ((action === "push" || action === "publish-branch") && !st.branch) {
      return { ok: false, error: "No branch to push (detached HEAD)." };
    }
    const r = await runGit(cwd, args, { onStderr });
    return r.code === 0 ? { ok: true } : { ok: false, error: r.stderr.trim().split("\n").slice(-6).join("\n") };
  });
}

// ------------------------------------------------------------------ history

const LOG_FIELDS = ["%H", "%h", "%s", "%b", "%an", "%ae", "%at", "%P", "%D"];

export function parseLog(raw) {
  const parts = raw.split("\0");
  const n = LOG_FIELDS.length;
  const out = [];
  for (let i = 0; i + n <= parts.length; i += n) {
    const [sha, shortSha, summary, body, author, email, at, parents, refs] = parts.slice(i, i + n);
    if (!sha) continue;
    out.push({
      sha: sha.replace(/^\n/, ""),
      shortSha,
      summary,
      body: (body || "").trim(),
      author,
      email,
      at: Number(at) * 1000,
      parents: (parents || "").split(" ").filter(Boolean),
      refs: (refs || "").split(", ").filter(Boolean),
    });
  }
  return out;
}

export async function log(cwd, { limit = 50, skip = 0 } = {}) {
  const r = await runGit(cwd, [
    "log",
    `--max-count=${Math.min(500, Number(limit) || 50)}`,
    `--skip=${Math.max(0, Number(skip) || 0)}`,
    "-z",
    `--format=${LOG_FIELDS.join("%x00")}`,
    "--no-show-signature",
    "--no-color",
    "--",
  ]);
  if (r.code !== 0) return { ok: true, commits: [] };
  return { ok: true, commits: parseLog(r.stdout) };
}

export async function commitFiles(cwd, sha) {
  if (!/^[0-9a-f]{4,64}$/i.test(String(sha))) return { ok: false, error: "Bad commit id." };
  const r = await runGit(cwd, ["show", "--no-color", "--no-ext-diff", "-M", "--format=", "--patch", sha, "--"]);
  return r.code === 0 ? { ok: true, patch: r.stdout } : { ok: false, error: r.stderr.trim() };
}

// ------------------------------------------------------------------ checkpoints

/**
 * Snapshot the working tree before an agent turn (Cursor-style checkpoint):
 * a stash commit holding tracked AND untracked files, without touching the
 * tree or the stash list. Kept alive under refs/westcode/checkpoints.
 */
export async function checkpoint(cwd, label = "turn") {
  const head = await runGit(cwd, ["rev-parse", "--verify", "HEAD"]);
  if (head.code !== 0) return { ok: false, error: "No commits yet." };
  // Index copy so untracked files can be captured without staging them for real.
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(join(tmpdir(), "wc-ckpt-"));
  const env = { ...process.env, GIT_INDEX_FILE: join(dir, "index") };
  try {
    await runGit(cwd, ["read-tree", "HEAD"], { env });
    await runGit(cwd, ["add", "-A", "--", "."], { env });
    const tree = await runGit(cwd, ["write-tree"], { env });
    if (tree.code !== 0) return { ok: false, error: tree.stderr.trim() };
    const commit = await runGit(
      cwd,
      ["commit-tree", tree.stdout.trim(), "-p", head.stdout.trim(), "-m", `westcode checkpoint: ${label}`],
      { env: { ...env, GIT_AUTHOR_NAME: "WestCode", GIT_AUTHOR_EMAIL: "checkpoint@westcode", GIT_COMMITTER_NAME: "WestCode", GIT_COMMITTER_EMAIL: "checkpoint@westcode" } },
    );
    if (commit.code !== 0) return { ok: false, error: commit.stderr.trim() };
    const sha = commit.stdout.trim();
    await runGit(cwd, ["update-ref", `refs/westcode/checkpoints/${sha}`, sha]);
    return { ok: true, sha };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Put the working tree back to a checkpoint: files the agent changed get
 * their content back, files it created are removed. A checkpoint of the
 * current state is taken first, so the restore itself can be undone.
 */
export async function restoreCheckpoint(cwd, sha) {
  if (!/^[0-9a-f]{40}$/i.test(String(sha))) return { ok: false, error: "Bad checkpoint id." };
  return withRepoLock(cwd, async () => {
    const before = await checkpoint(cwd, "before restore");
    if (!before.ok) return before;
    // Files present now but not in the checkpoint were created after it.
    const now = await runGit(cwd, ["ls-tree", "-r", "-z", "--name-only", before.sha]);
    const then = await runGit(cwd, ["ls-tree", "-r", "-z", "--name-only", sha]);
    const keep = new Set(then.stdout.split("\0").filter(Boolean));
    const created = now.stdout.split("\0").filter((p) => p && !keep.has(p));
    const { rmSync } = await import("node:fs");
    for (const p of created) rmSync(join(cwd, p), { force: true });
    const r = await runGit(cwd, ["checkout", sha, "--", "."]);
    if (r.code !== 0) return { ok: false, error: r.stderr.trim() };
    // checkout writes the index too; put the index back to HEAD so nothing
    // looks staged that the user did not stage.
    await runGit(cwd, ["reset", "-q"]);
    return { ok: true, undo: before.sha, removed: created };
  });
}
