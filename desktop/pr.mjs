// Pull requests for a session's branch through the GitHub CLI (`gh`), like
// Claude Desktop's Changes card: CI checks, review state, Create PR, and
// Merge when ready (GitHub auto-merge).
import { spawn } from "node:child_process";
import { childEnv, which } from "./path.mjs";

function run(cmd, args, cwd, timeout = 60_000) {
  return new Promise((resolve) => {
    const env = childEnv();
    const bin = which(cmd, env) || cmd;
    const child = spawn(bin, args, { cwd, env: { ...env, GH_PROMPT_DISABLED: "1", NO_COLOR: "1" } });
    let out = "";
    let err = "";
    const t = setTimeout(() => child.kill(), timeout);
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (err += c));
    child.on("error", (e) => {
      clearTimeout(t);
      resolve({ code: -1, stdout: "", stderr: e.message });
    });
    child.on("close", (code) => {
      clearTimeout(t);
      resolve({ code: code ?? -1, stdout: out, stderr: err.trim() });
    });
  });
}

export function hasGh() {
  return Boolean(which("gh", childEnv()));
}

const FIELDS = "number,title,url,state,isDraft,mergeable,reviewDecision,statusCheckRollup,headRefName,baseRefName,autoMergeRequest";

/** Fold gh's statusCheckRollup into counts and the failing names. */
export function summarizeChecks(rollup) {
  const out = { total: 0, passed: 0, failed: 0, pending: 0, failing: [] };
  for (const c of Array.isArray(rollup) ? rollup : []) {
    out.total += 1;
    // CheckRun: status + conclusion; StatusContext: state.
    const verdict = String(c.conclusion || c.state || "").toUpperCase();
    const status = String(c.status || "").toUpperCase();
    if (status && status !== "COMPLETED" && !c.conclusion) out.pending += 1;
    else if (["SUCCESS", "NEUTRAL", "SKIPPED"].includes(verdict)) out.passed += 1;
    else if (["PENDING", "EXPECTED", "QUEUED", "IN_PROGRESS", ""].includes(verdict)) out.pending += 1;
    else {
      out.failed += 1;
      out.failing.push({ name: c.name || c.context || "check", url: c.detailsUrl || c.targetUrl || "" });
    }
  }
  return out;
}

export async function prStatus(cwd) {
  if (!hasGh()) return { ok: false, missing: "gh", error: "Install the GitHub CLI (gh) to see pull requests." };
  const r = await run("gh", ["pr", "view", "--json", FIELDS], cwd);
  if (r.code !== 0) {
    if (/no pull requests found|could not find any pull requests/i.test(r.stderr)) return { ok: true, pr: null };
    if (/not a git repository|no git remotes|none of the git remotes/i.test(r.stderr)) return { ok: true, pr: null, noRemote: true };
    if (/auth login|not logged/i.test(r.stderr)) return { ok: false, error: "gh is not signed in. Run: gh auth login" };
    return { ok: false, error: r.stderr.split("\n").pop() || "gh pr view failed." };
  }
  let d;
  try {
    d = JSON.parse(r.stdout);
  } catch {
    return { ok: false, error: "Unexpected output from gh." };
  }
  return {
    ok: true,
    pr: {
      number: d.number,
      title: d.title,
      url: d.url,
      state: d.state,
      draft: Boolean(d.isDraft),
      mergeable: d.mergeable,
      review: d.reviewDecision || "",
      head: d.headRefName,
      base: d.baseRefName,
      autoMerge: Boolean(d.autoMergeRequest),
      checks: summarizeChecks(d.statusCheckRollup),
    },
  };
}

/** Push the branch, then open a PR filled from its commits. */
export async function createPr(cwd, { title, body, draft } = {}) {
  if (!hasGh()) return { ok: false, error: "Install the GitHub CLI (gh) first." };
  const push = await run("git", ["push", "-u", "origin", "HEAD"], cwd, 120_000);
  if (push.code !== 0) return { ok: false, error: `Push failed: ${push.stderr.split("\n").pop()}` };
  const args = ["pr", "create"];
  if (title) args.push("--title", String(title).slice(0, 200), "--body", String(body || ""));
  else args.push("--fill");
  if (draft) args.push("--draft");
  const r = await run("gh", args, cwd, 120_000);
  if (r.code !== 0) return { ok: false, error: r.stderr.split("\n").pop() || "gh pr create failed." };
  return { ok: true, url: r.stdout.trim().split("\n").pop() };
}

/** GitHub auto-merge: merges once checks and reviews pass (squash). */
export async function mergeWhenReady(cwd, { method = "squash" } = {}) {
  if (!hasGh()) return { ok: false, error: "Install the GitHub CLI (gh) first." };
  const flag = method === "merge" ? "--merge" : method === "rebase" ? "--rebase" : "--squash";
  const r = await run("gh", ["pr", "merge", "--auto", flag], cwd, 60_000);
  if (r.code !== 0) return { ok: false, error: r.stderr.split("\n").pop() || "gh pr merge failed." };
  return { ok: true };
}
