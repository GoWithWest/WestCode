import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
// @ts-expect-error — plain .mjs module from the Electron side
import * as learn from "../desktop/learn.mjs";

const SKILL = (name: string, body = "1. Do the thing.") =>
  `---\nname: ${name}\ndescription: Use when releasing.\n---\n\n# ${name}\n\n${body}\n`;

let home: string;
let user: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "wc-learn-"));
  user = mkdtempSync(join(tmpdir(), "wc-user-"));
  process.env.WESTCODE_HOME = home;
  process.env.WESTCODE_USER_HOME = user;
});

describe("guards", () => {
  it("wants class-level skill names", () => {
    expect(learn.checkSkillName("release-checklist")).toBeNull();
    expect(learn.checkSkillName("fix-login-bug")).toMatch(/class of work/);
    expect(learn.checkSkillName("issue-4312-notes")).toMatch(/class of work/);
    expect(learn.checkSkillName("Bad Name")).toMatch(/kebab/);
  });
  it("wants frontmatter with name and description", () => {
    expect(learn.checkSkillBody(SKILL("x-y-z"))).toBeNull();
    expect(learn.checkSkillBody("# no frontmatter")).toMatch(/frontmatter/);
  });
});

describe("memory ops", () => {
  it("adds, replaces and removes §-separated entries", () => {
    let t = learn.applyMemoryOp("", "add", "Prefers short answers").text;
    t = learn.applyMemoryOp(t, "add", "Uses pnpm").text;
    expect(learn.memoryEntries(t)).toEqual(["Prefers short answers", "Uses pnpm"]);
    expect(learn.applyMemoryOp(t, "add", "uses PNPM").error).toMatch(/Already/);
    t = learn.applyMemoryOp(t, "replace", "Uses npm", "pnpm").text;
    expect(learn.memoryEntries(t)).toEqual(["Prefers short answers", "Uses npm"]);
    t = learn.applyMemoryOp(t, "remove", "", "short").text;
    expect(learn.memoryEntries(t)).toEqual(["Uses npm"]);
  });
});

describe("staging and approval", () => {
  it("stages a new skill without writing it, then approval writes it to both skill roots", () => {
    const r = learn.stage({ kind: "skill", name: "release-checklist", content: SKILL("release-checklist"), why: "User walked through it." }, { sessionId: "s1" });
    expect(r.ok).toBe(true);
    expect(existsSync(join(user, ".agents", "skills", "release-checklist"))).toBe(false);
    const [p] = learn.listPending();
    expect(p).toMatchObject({ kind: "skill", name: "release-checklist", action: "create", origin: { sessionId: "s1" } });
    expect(learn.decide(p.id, "approve").ok).toBe(true);
    expect(readFileSync(join(user, ".agents", "skills", "release-checklist", "SKILL.md"), "utf8")).toContain("Do the thing");
    expect(readFileSync(join(user, ".claude", "skills", "release-checklist", "SKILL.md"), "utf8")).toContain("Do the thing");
    expect(learn.listPending()).toEqual([]);
  });

  it("an update backs up the old skill; reject leaves everything as it was", () => {
    mkdirSync(join(user, ".claude", "skills", "release-checklist"), { recursive: true });
    writeFileSync(join(user, ".claude", "skills", "release-checklist", "SKILL.md"), SKILL("release-checklist", "Old step."));
    const a = learn.stage({ kind: "skill", name: "release-checklist", content: SKILL("release-checklist", "New step."), why: "x" });
    expect(a.record.action).toBe("update");
    expect(a.record.diff).toContain("-Old step.");
    expect(a.record.diff).toContain("+New step.");
    const b = learn.stage({ kind: "memory", target: "user", op: "add", text: "Likes bullets", why: "said so" });
    expect(learn.decide(b.id, "reject").ok).toBe(true);
    expect(learn.readMemory("user")).toBe("");
    expect(learn.decide(a.id, "approve").ok).toBe(true);
    expect(readFileSync(join(user, ".claude", "skills", "release-checklist", "SKILL.md"), "utf8")).toContain("New step.");
    expect(existsSync(join(home, "skill-backups", "release-checklist"))).toBe(true);
  });

  it("refuses memory that would exceed its limit", () => {
    const long = "x".repeat(learn.MEMORY_LIMITS.user + 1);
    expect(learn.stage({ kind: "memory", target: "user", op: "add", text: long, why: "" }).error).toMatch(/limit/);
  });

  it("memory approvals compose and show up in the session snapshot", () => {
    const a = learn.stage({ kind: "memory", target: "user", op: "add", text: "Wants short output", why: "" });
    const b = learn.stage({ kind: "memory", target: "memory", op: "add", text: "NAS runs k3s", why: "" });
    learn.decide(a.id, "approve");
    learn.decide(b.id, "approve");
    const snap = learn.memorySnapshot();
    expect(snap).toContain("- Wants short output");
    expect(snap).toContain("- NAS runs k3s");
  });
});

describe("review prompt", () => {
  it("digests long sessions and asks only for the parts that fired", () => {
    const msgs = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `turn ${i}` }));
    const d = learn.digest(msgs, 4);
    expect(d).toContain("Earlier in the session");
    expect(d).toContain("[user]\nturn 26");
    const p = learn.reviewPrompt({ transcript: d, doSkill: true, doMemory: false, skills: [{ name: "a" }] });
    expect(p).toContain("SKILLS —");
    expect(p).not.toContain("MEMORY —");
    expect(p).toContain("Nothing to save.");
  });
});

function mcp(env: Record<string, string>) {
  const child = spawn(process.execPath, [join(__dirname, "..", "desktop", "learn-mcp.mjs")], {
    env: { ...process.env, ...env },
  });
  let buf = "";
  const waiting = new Map<number, (v: unknown) => void>();
  child.stdout.on("data", (c) => {
    buf += c;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      const m = JSON.parse(line);
      waiting.get(m.id)?.(m);
    }
  });
  let id = 1;
  return {
    call: (method: string, params: unknown) =>
      new Promise<{ result: { tools?: { name: string }[]; content?: { text: string }[]; isError?: boolean } }>((r) => {
        const n = id++;
        waiting.set(n, r as (v: unknown) => void);
        child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: n, method, params }) + "\n");
      }),
    close: () => child.kill(),
  };
}

describe("learn-mcp (the reviewer's tools)", () => {
  it("lists only the allowed tools and stages proposals, enforcing read-before-write", async () => {
    mkdirSync(join(user, ".claude", "skills", "deploy-flow"), { recursive: true });
    writeFileSync(join(user, ".claude", "skills", "deploy-flow", "SKILL.md"), SKILL("deploy-flow"));
    const s = mcp({ WESTCODE_HOME: home, WESTCODE_USER_HOME: user, WESTCODE_LEARN_MEMORY: "0", WESTCODE_LEARN_SESSION: "ses-9" });
    await s.call("initialize", { protocolVersion: "2025-06-18" });
    const tools = (await s.call("tools/list", {})).result.tools!.map((t) => t.name);
    expect(tools).toEqual(["westcode_skills_list", "westcode_skill_view", "westcode_skill_propose"]);
    const blind = await s.call("tools/call", { name: "westcode_skill_propose", arguments: { name: "deploy-flow", content: SKILL("deploy-flow", "v2"), why: "x" } });
    expect(blind.result.isError).toBe(true);
    await s.call("tools/call", { name: "westcode_skill_view", arguments: { name: "deploy-flow" } });
    const ok = await s.call("tools/call", { name: "westcode_skill_propose", arguments: { name: "deploy-flow", content: SKILL("deploy-flow", "v2"), why: "x" } });
    expect(ok.result.content![0]!.text).toMatch(/Staged/);
    s.close();
    const pending = learn.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ name: "deploy-flow", action: "update", origin: { sessionId: "ses-9" } });
  });
});
