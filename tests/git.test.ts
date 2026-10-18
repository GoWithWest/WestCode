import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error — plain .mjs module from the Electron side
import * as git from "../desktop/git.mjs";

const sh = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "T", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "T", GIT_COMMITTER_EMAIL: "t@t" } });

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "wc-git-"));
  sh(dir, "init", "-q", "-b", "main");
  sh(dir, "config", "user.name", "T");
  sh(dir, "config", "user.email", "t@t");
  writeFileSync(join(dir, "a.txt"), "one\n");
  writeFileSync(join(dir, "b.txt"), "bee\n");
  writeFileSync(join(dir, "old.txt"), "rename me\nwith enough lines\nto be similar\n");
  sh(dir, "add", "-A");
  sh(dir, "commit", "-q", "-m", "init");
  return dir;
}

describe("parseStatus", () => {
  it("reads headers, modified, untracked, renamed and conflicted entries", () => {
    const raw = [
      "# branch.oid 1234abcd",
      "# branch.head main",
      "# branch.upstream origin/main",
      "# branch.ab +2 -1",
      "1 .M N... 100644 100644 100644 aaaa bbbb a.txt",
      "2 R. N... 100644 100644 100644 aaaa bbbb R100 new.txt",
      "old.txt",
      "u UU N... 100644 100644 100644 100644 aaaa bbbb cccc c.txt",
      "? dir/untracked.txt",
      "1 AD N... 000000 100644 000000 0000 bbbb gone.txt",
      "",
    ].join("\0");
    const s = git.parseStatus(raw);
    expect(s).toMatchObject({ oid: "1234abcd", branch: "main", upstream: "origin/main", ahead: 2, behind: 1, hasUpstream: true });
    expect(s.files).toEqual([
      { path: "a.txt", kind: "modified", staged: false, submodule: false },
      { path: "new.txt", oldPath: "old.txt", kind: "renamed", staged: true, submodule: false },
      { path: "c.txt", kind: "conflicted", staged: false, submodule: false },
      { path: "dir/untracked.txt", kind: "untracked", staged: false, submodule: false },
    ]);
  });
  it("treats a detached head as no branch", () => {
    expect(git.parseStatus("# branch.oid abc\0# branch.head (detached)\0").branch).toBeNull();
  });
});

describe("syncAction (GitHub Desktop's button order)", () => {
  const st = (p: object) => ({ repo: true, remotes: ["origin"], tip: "valid", hasUpstream: true, ahead: 0, behind: 0, ...p });
  it.each([
    [{ remotes: [] }, "publish-repo"],
    [{ tip: "unborn" }, "fetch"],
    [{ tip: "detached" }, "none"],
    [{ hasUpstream: false }, "publish-branch"],
    [{ behind: 2, ahead: 1 }, "pull"],
    [{ ahead: 3 }, "push"],
    [{}, "fetch"],
  ])("%o → %s", (p, action) => {
    expect(git.syncAction(st(p)).action).toBe(action);
  });
});

describe("real repositories", () => {
  it("status sees edits, new files and renames", async () => {
    const dir = repo();
    writeFileSync(join(dir, "a.txt"), "two\n");
    writeFileSync(join(dir, "c.txt"), "new\n");
    renameSync(join(dir, "old.txt"), join(dir, "moved.txt"));
    sh(dir, "add", "-A", "--", "old.txt", "moved.txt");
    const s = await git.status(dir);
    expect(s.repo).toBe(true);
    expect(s.branch).toBe("main");
    expect(s.tip).toBe("valid");
    const by = Object.fromEntries(s.files.map((f: { path: string; kind: string }) => [f.path, f.kind]));
    expect(by).toEqual({ "a.txt": "modified", "c.txt": "untracked", "moved.txt": "renamed" });
  });

  it("commits only the chosen files, then undo restores them to the tree", async () => {
    const dir = repo();
    writeFileSync(join(dir, "a.txt"), "two\n");
    writeFileSync(join(dir, "b.txt"), "buzz\n");
    writeFileSync(join(dir, "c.txt"), "new\n");
    const r = await git.commit(dir, { paths: ["a.txt", "c.txt"], summary: "Change a, add c", description: "Body." });
    expect(r.ok).toBe(true);
    expect(sh(dir, "log", "-1", "--format=%s%n%b").trim()).toBe("Change a, add c\nBody.");
    expect(sh(dir, "show", "--name-only", "--format=", "HEAD").trim().split("\n").sort()).toEqual(["a.txt", "c.txt"]);
    const s = await git.status(dir);
    expect(s.files.map((f: { path: string }) => f.path)).toEqual(["b.txt"]);

    const u = await git.undoCommit(dir);
    expect(u).toMatchObject({ ok: true, summary: "Change a, add c", description: "Body." });
    expect(readFileSync(join(dir, "a.txt"), "utf8")).toBe("two\n");
    const after = await git.status(dir);
    expect(after.files.map((f: { path: string }) => f.path).sort()).toEqual(["a.txt", "b.txt", "c.txt"]);
  });

  it("commits a deletion and refuses an empty summary", async () => {
    const dir = repo();
    rmSync(join(dir, "b.txt"));
    expect((await git.commit(dir, { paths: ["b.txt"], summary: "  " })).ok).toBe(false);
    expect((await git.commit(dir, { paths: ["b.txt"], summary: "Remove b" })).ok).toBe(true);
    expect(existsSync(join(dir, "b.txt"))).toBe(false);
    expect(sh(dir, "ls-files").includes("b.txt")).toBe(false);
  });

  it("discard restores tracked files and removes new ones", async () => {
    const dir = repo();
    writeFileSync(join(dir, "a.txt"), "changed\n");
    writeFileSync(join(dir, "n.txt"), "new\n");
    const trashed: string[] = [];
    const r = await git.discard(
      dir,
      [
        { path: "a.txt", kind: "modified" },
        { path: "n.txt", kind: "untracked" },
      ],
      async (p: string) => {
        trashed.push(p);
        rmSync(p);
      },
    );
    expect(r.ok).toBe(true);
    expect(readFileSync(join(dir, "a.txt"), "utf8")).toBe("one\n");
    expect(trashed).toEqual([join(dir, "n.txt")]);
    expect((await git.status(dir)).files).toEqual([]);
  });

  it("diffs modified and untracked files", async () => {
    const dir = repo();
    writeFileSync(join(dir, "a.txt"), "two\n");
    writeFileSync(join(dir, "c.txt"), "new\n");
    expect((await git.fileDiff(dir, { path: "a.txt", kind: "modified" })).patch).toMatch(/-one\n\+two/);
    expect((await git.fileDiff(dir, { path: "c.txt", kind: "untracked" })).patch).toMatch(/\+new/);
  });

  it("lists, creates and switches branches; reads history", async () => {
    const dir = repo();
    expect((await git.checkout(dir, { name: "feature", create: true })).ok).toBe(true);
    writeFileSync(join(dir, "f.txt"), "f\n");
    await git.commit(dir, { paths: ["f.txt"], summary: "Feature work" });
    const b = await git.branches(dir);
    expect(b.branches.map((x: { name: string }) => x.name).sort()).toEqual(["feature", "main"]);
    expect((await git.checkout(dir, { name: "main" })).ok).toBe(true);
    expect((await git.status(dir)).branch).toBe("main");
    await git.checkout(dir, { name: "feature" });
    const h = await git.log(dir, { limit: 10 });
    expect(h.commits.map((c: { summary: string }) => c.summary)).toEqual(["Feature work", "init"]);
    expect(h.commits[0].refs.join(" ")).toMatch(/feature/);
    const files = await git.commitFiles(dir, h.commits[0].sha);
    expect(files.patch).toMatch(/\+\+\+ b\/f\.txt/);
  });

  it("publishes, pushes and pulls through a remote, reporting progress", async () => {
    const remote = mkdtempSync(join(tmpdir(), "wc-remote-"));
    sh(remote, "init", "-q", "--bare", "-b", "main");
    const a = repo();
    sh(a, "remote", "add", "origin", remote);
    expect(git.syncAction(await git.status(a)).action).toBe("publish-branch");
    expect((await git.sync(a, "publish-branch")).ok).toBe(true);
    expect(git.syncAction(await git.status(a)).action).toBe("fetch");

    const b = mkdtempSync(join(tmpdir(), "wc-clone-"));
    execFileSync("git", ["clone", "-q", remote, b]);
    sh(b, "config", "user.name", "T");
    sh(b, "config", "user.email", "t@t");
    writeFileSync(join(b, "a.txt"), "from b\n");
    await git.commit(b, { paths: ["a.txt"], summary: "From b" });
    expect(git.syncAction(await git.status(b)).action).toBe("push");
    expect((await git.sync(b, "push")).ok).toBe(true);

    const events: unknown[] = [];
    expect((await git.sync(a, "fetch", (p: unknown) => events.push(p))).ok).toBe(true);
    const st = await git.status(a);
    expect(st.behind).toBe(1);
    expect(git.syncAction(st).action).toBe("pull");
    expect((await git.sync(a, "pull")).ok).toBe(true);
    expect(readFileSync(join(a, "a.txt"), "utf8")).toBe("from b\n");
  });
});

describe("parseProgress", () => {
  it("reads git's progress lines", () => {
    expect(git.parseProgress("Receiving objects:  42% (21/50)")).toEqual({ title: "Receiving objects", percent: 42, done: 21, total: 50 });
    expect(git.parseProgress("remote: Compressing objects: 100% (3/3), done.")).toMatchObject({ title: "Compressing objects", percent: 100 });
    expect(git.parseProgress("To /tmp/x")).toBeNull();
  });
});
