// The desk learns from its own work (after Hermes Agent's loop, rebuilt for
// ACP CLIs). Every so often a finished session is reviewed by a second,
// read-only session of the same CLI. That reviewer may only PROPOSE: a new
// or improved skill, or a short fact for the desk's memory. Proposals wait in
// ~/.westcode/pending until the user approves them (or are applied straight
// away when the user chose "auto"). Nothing is ever deleted.
//
//   skills  ~/.agents/skills/<name>/SKILL.md   (Codex reads this; Grok and
//           Cursor read it too) mirrored to ~/.claude/skills/<name>/SKILL.md
//   memory  ~/.westcode/memory/USER.md (who the user is, ≤1375 chars) and
//           MEMORY.md (facts about their machines and projects, ≤2200 chars),
//           entries separated by "§"
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const MEMORY_LIMITS = { user: 1375, memory: 2200 };
const SKILL_MAX = 24_000;

export function learnHome() {
  return process.env.WESTCODE_HOME || join(homedir(), ".westcode");
}
function userHome() {
  return process.env.WESTCODE_USER_HOME || homedir();
}
export function skillRoots() {
  return {
    canonical: join(userHome(), ".agents", "skills"),
    mirrors: [join(userHome(), ".claude", "skills")],
  };
}
function pendingDir() {
  return join(learnHome(), "pending");
}
function memoryFile(target) {
  return join(learnHome(), "memory", target === "user" ? "USER.md" : "MEMORY.md");
}

function writeAtomic(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, text, "utf8");
  renameSync(tmp, path);
}

function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

// ------------------------------------------------------------------ skills

/** Class-level names only: "git-release-flow", not "fix-issue-1234". */
export function checkSkillName(name) {
  const n = String(name || "");
  if (!/^[a-z][a-z0-9-]{2,63}$/.test(n)) return "Use a short kebab-case name (letters, digits, dashes).";
  if (/\d{3,}|^(fix|debug|pr|issue|ticket|task)-/.test(n)) {
    return "Name the class of work, not one task, PR or error (no ticket numbers, no fix-/pr- prefixes).";
  }
  return null;
}

export function checkSkillBody(content) {
  const text = String(content || "");
  if (!/^---\r?\n[\s\S]*?\bname:\s*\S[\s\S]*?\bdescription:\s*\S[\s\S]*?\r?\n---/.test(text)) {
    return "A SKILL.md starts with frontmatter that has name: and description:.";
  }
  if (text.length > SKILL_MAX) return `Keep a skill under ${SKILL_MAX} characters; move detail into references/.`;
  return null;
}

export function listSkills() {
  const { canonical, mirrors } = skillRoots();
  const out = new Map();
  for (const root of [canonical, ...mirrors]) {
    let entries = [];
    try {
      entries = readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith(".") || out.has(e.name)) continue;
      const body = readText(join(root, e.name, "SKILL.md"));
      if (!body) continue;
      const desc = /description:\s*(.+)/.exec(body)?.[1]?.trim() ?? "";
      out.set(e.name, { name: e.name, description: desc.slice(0, 200), path: join(root, e.name, "SKILL.md") });
    }
  }
  return [...out.values()];
}

export function readSkill(name) {
  const { canonical, mirrors } = skillRoots();
  for (const root of [canonical, ...mirrors]) {
    const p = join(root, name, "SKILL.md");
    if (existsSync(p)) return { path: p, content: readText(p) };
  }
  return null;
}

// ------------------------------------------------------------------ memory

export function readMemory(target) {
  return readText(memoryFile(target));
}

export function memoryEntries(text) {
  return String(text || "")
    .split("§")
    .map((e) => e.trim())
    .filter(Boolean);
}

/** The memory text after an add/replace/remove — or an error if it no longer fits. */
export function applyMemoryOp(current, op, text, old) {
  const entries = memoryEntries(current);
  const t = String(text || "").replace(/§/g, "").trim();
  let next = entries;
  if (op === "add") {
    if (!t) return { error: "Nothing to add." };
    if (entries.some((e) => e.toLowerCase() === t.toLowerCase())) return { error: "Already remembered." };
    next = [...entries, t];
  } else if (op === "replace") {
    const i = entries.findIndex((e) => e.includes(String(old || "").trim()) && String(old || "").trim());
    if (i < 0) return { error: "No entry contains that text." };
    next = entries.map((e, j) => (j === i ? t : e)).filter(Boolean);
  } else if (op === "remove") {
    const i = entries.findIndex((e) => e.includes(String(old || t).trim()) && String(old || t).trim());
    if (i < 0) return { error: "No entry contains that text." };
    next = entries.filter((_, j) => j !== i);
  } else return { error: `Unknown memory op ${op}` };
  return { text: next.join("\n§\n") + (next.length ? "\n" : "") };
}

/** Frozen memory for a session's preamble ("" when there is none). */
export function memorySnapshot() {
  const user = memoryEntries(readMemory("user"));
  const mem = memoryEntries(readMemory("memory"));
  if (!user.length && !mem.length) return "";
  const lines = ["[Desk memory — learned from earlier sessions; the user approved these]"];
  if (user.length) lines.push("About the user:", ...user.map((e) => `- ${e}`));
  if (mem.length) lines.push("About their setup and projects:", ...mem.map((e) => `- ${e}`));
  return `${lines.join("\n")}\n`;
}

// ------------------------------------------------------------------ pending

function unifiedLite(before, after) {
  const a = before.split("\n");
  const b = after.split("\n");
  const out = [];
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  let ja = a.length - 1;
  let jb = b.length - 1;
  while (ja >= i && jb >= i && a[ja] === b[jb]) {
    ja--;
    jb--;
  }
  for (const l of a.slice(Math.max(0, i - 2), i)) out.push(` ${l}`);
  for (const l of a.slice(i, ja + 1)) out.push(`-${l}`);
  for (const l of b.slice(i, jb + 1)) out.push(`+${l}`);
  for (const l of a.slice(ja + 1, ja + 3)) out.push(` ${l}`);
  return out.join("\n");
}

/**
 * Stage a proposal. kind "skill": {name, content, why}; kind "memory":
 * {target, op, text, old?, why}. Returns {ok, id} or {ok:false, error}.
 */
export function stage(proposal, origin = {}) {
  const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  let record;
  if (proposal.kind === "skill") {
    const nameErr = checkSkillName(proposal.name);
    if (nameErr) return { ok: false, error: nameErr };
    const bodyErr = checkSkillBody(proposal.content);
    if (bodyErr) return { ok: false, error: bodyErr };
    const existing = readSkill(proposal.name);
    record = {
      id,
      kind: "skill",
      name: proposal.name,
      action: existing ? "update" : "create",
      before: existing?.content ?? "",
      after: String(proposal.content),
      diff: unifiedLite(existing?.content ?? "", String(proposal.content)),
      why: String(proposal.why || "").slice(0, 500),
    };
  } else if (proposal.kind === "memory") {
    const target = proposal.target === "user" ? "user" : "memory";
    const before = readMemory(target);
    const res = applyMemoryOp(before, proposal.op, proposal.text, proposal.old);
    if (res.error) return { ok: false, error: res.error };
    if (res.text.length > MEMORY_LIMITS[target]) {
      return {
        ok: false,
        error: `${target === "user" ? "USER.md" : "MEMORY.md"} would be ${res.text.length} characters; the limit is ${MEMORY_LIMITS[target]}. Consolidate: replace or remove an older entry first.`,
      };
    }
    record = {
      id,
      kind: "memory",
      target,
      op: proposal.op,
      text: String(proposal.text || ""),
      old: proposal.old,
      before,
      after: res.text,
      diff: unifiedLite(before, res.text),
      why: String(proposal.why || "").slice(0, 500),
    };
  } else return { ok: false, error: "Unknown proposal kind." };
  record.origin = origin;
  record.createdAt = Date.now();
  writeAtomic(join(pendingDir(), `${id}.json`), JSON.stringify(record, null, 2));
  return { ok: true, id, record };
}

export function listPending() {
  let names = [];
  try {
    names = readdirSync(pendingDir()).filter((n) => n.endsWith(".json"));
  } catch {
    return [];
  }
  return names
    .map((n) => {
      try {
        return JSON.parse(readFileSync(join(pendingDir(), n), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.createdAt - b.createdAt);
}

function archive(record, verdict) {
  const dir = join(learnHome(), "learned", verdict);
  mkdirSync(dir, { recursive: true });
  writeAtomic(join(dir, `${record.id}.json`), JSON.stringify({ ...record, decidedAt: Date.now() }, null, 2));
  try {
    renameSync(join(pendingDir(), `${record.id}.json`), join(dir, `${record.id}.pending.json`));
  } catch {
    /* already moved */
  }
}

/** Apply (approve) or drop (reject) a staged proposal. */
export function decide(id, verdict, edited) {
  const rec = listPending().find((r) => r.id === id);
  if (!rec) return { ok: false, error: "That proposal is gone." };
  if (verdict === "reject") {
    archive(rec, "rejected");
    return { ok: true };
  }
  if (rec.kind === "skill") {
    const content = typeof edited === "string" && edited.trim() ? edited : rec.after;
    const err = checkSkillBody(content);
    if (err) return { ok: false, error: err };
    const { canonical, mirrors } = skillRoots();
    // Back up what is replaced; never delete.
    const cur = readSkill(rec.name);
    if (cur) writeAtomic(join(learnHome(), "skill-backups", rec.name, `${Date.now()}.md`), cur.content);
    for (const root of [canonical, ...mirrors]) writeAtomic(join(root, rec.name, "SKILL.md"), content);
    archive({ ...rec, after: content }, "approved");
    return { ok: true, path: join(canonical, rec.name, "SKILL.md") };
  }
  // Memory: re-apply against the CURRENT file, so two approvals compose.
  const now = readMemory(rec.target);
  const res = applyMemoryOp(now, rec.op, typeof edited === "string" && edited.trim() ? edited : rec.text, rec.old);
  if (res.error) return { ok: false, error: res.error };
  if (res.text.length > MEMORY_LIMITS[rec.target]) return { ok: false, error: "Memory is full; remove an entry first." };
  writeAtomic(memoryFile(rec.target), res.text);
  archive(rec, "approved");
  return { ok: true };
}

// ------------------------------------------------------------------ review

/**
 * Transcript for the reviewer: the recent turns verbatim (trimmed), older
 * ones as one-liners — enough to learn from without a huge prompt.
 */
export function digest(messages, keep = 24) {
  const rows = (messages || []).filter((m) => m && m.text && String(m.text).trim());
  const older = rows.slice(0, Math.max(0, rows.length - keep));
  const recent = rows.slice(-keep);
  const one = (t) => String(t).replace(/\s+/g, " ").trim();
  const lines = [];
  if (older.length) {
    lines.push("Earlier in the session (one line each):");
    for (const m of older) lines.push(`- ${m.role}: ${one(m.text).slice(0, 160)}`);
    lines.push("");
  }
  lines.push("Recent turns:");
  for (const m of recent) lines.push(`[${m.role}]\n${String(m.text).trim().slice(0, 2500)}\n`);
  return lines.join("\n");
}

export function reviewPrompt({ transcript, doSkill, doMemory, skills }) {
  const jobs = [];
  if (doSkill) {
    jobs.push(`SKILLS — did this session show a way of working worth keeping? Signals: the user corrected how the work was done (style, verbosity, order of steps, tools), a non-obvious technique or fix that worked, or an existing skill that turned out wrong or incomplete.
Prefer, in this order: improve a skill that was used or is closely related (call westcode_skill_view first, then propose the whole improved SKILL.md); add to a broader existing skill; only then propose a new one. Name skills for a CLASS of work ("release-checklist", "laser-job-prep"), never for one task, ticket, PR or error. A SKILL.md has frontmatter (name, description saying when to use it), then the procedure first, then pitfalls as short imperative rules, each with a one-clause reason. No dates, ids, quotes or session narrative.`);
  }
  if (doMemory) {
    jobs.push(`MEMORY — did the user reveal something durable? About THEM (preferences, how they want answers, their role) goes to target "user"; about their machines, projects, paths and services goes to target "memory". One fact per entry, one line, no duplicates of what a skill already covers. Memory is small: replace or remove stale entries rather than piling up.`);
  }
  return `You are reviewing a finished session from the WestCode desk so the desk gets better at this user's work. You can read files and use the westcode_* learning tools; you cannot edit files or run commands, and nothing you propose takes effect until the user approves it.

${jobs.join("\n\n")}

Never record: one-off failures of the environment, temporary errors, claims that a tool cannot do something, unresolved dead ends, or anything secret (keys, tokens, passwords).

Installed skills you may improve: ${skills.length ? skills.map((s) => s.name).join(", ") : "(none yet)"}.

Use at most 12 tool calls. If nothing is worth keeping, reply exactly "Nothing to save." — that is a fine outcome, but do not default to it when the user clearly corrected or taught something.

----- SESSION -----
${transcript}
----- END -----`;
}
