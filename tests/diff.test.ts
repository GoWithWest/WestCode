import { describe, expect, it } from "vitest";
import { diffLines, diffStats, statsForDiffs, withContext } from "@/lib/diff";

describe("diffLines", () => {
  it("marks a one-line change as del + add between unchanged lines", () => {
    const rows = diffLines("def add(a, b):\n    return a - b\n", "def add(a, b):\n    return a + b\n");
    expect(rows.map((r) => r.kind)).toEqual(["same", "del", "add"]);
    expect(diffStats(rows)).toEqual({ adds: 1, dels: 1 });
  });
  it("handles pure additions and new files", () => {
    expect(diffStats(diffLines("", "a\nb"))).toEqual({ adds: 2, dels: 0 });
    expect(diffStats(diffLines("a\nb\nc", "a\nc"))).toEqual({ adds: 0, dels: 1 });
  });
  it("numbers lines on both sides", () => {
    const rows = diffLines("x\ny", "x\nz\ny");
    expect(rows).toEqual([
      { kind: "same", text: "x", a: 1, b: 1 },
      { kind: "add", text: "z", b: 2 },
      { kind: "same", text: "y", a: 2, b: 3 },
    ]);
  });
});

describe("withContext", () => {
  it("collapses long unchanged runs into a gap", () => {
    const old = Array.from({ length: 20 }, (_, i) => `l${i}`).join("\n");
    const neu = old.replace("l10", "L10");
    const rows = withContext(diffLines(old, neu), 2);
    expect(rows[0]).toEqual({ kind: "gap", skipped: 8 });
    expect(rows.filter((r) => r.kind === "same")).toHaveLength(4);
    expect(rows[rows.length - 1]).toEqual({ kind: "gap", skipped: 7 });
  });
});

describe("statsForDiffs", () => {
  it("sums several files", () => {
    expect(statsForDiffs([{ oldText: "a", newText: "b" }, { oldText: "", newText: "x\ny" }])).toEqual({ adds: 3, dels: 1 });
  });
});

import { parsePatch } from "@/lib/diff";

describe("parsePatch", () => {
  it("splits a multi-file patch into numbered rows", () => {
    const patch = [
      "diff --git a/a.txt b/a.txt",
      "index 1..2 100644",
      "--- a/a.txt",
      "+++ b/a.txt",
      "@@ -1,2 +1,2 @@",
      " keep",
      "-one",
      "+two",
      "diff --git a/n.txt b/n.txt",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/n.txt",
      "@@ -0,0 +1 @@",
      "+hello",
      "diff --git a/img.png b/img.png",
      "Binary files a/img.png and b/img.png differ",
    ].join("\n");
    const files = parsePatch(patch);
    expect(files.map((f) => f.path)).toEqual(["a.txt", "n.txt", "img.png"]);
    expect(files[0]!.rows).toEqual([
      { kind: "same", text: "keep", a: 1, b: 1 },
      { kind: "del", text: "one", a: 2 },
      { kind: "add", text: "two", b: 2 },
    ]);
    expect(files[1]!.rows).toEqual([{ kind: "add", text: "hello", b: 1 }]);
    expect(files[2]!.binary).toBe(true);
  });
  it("handles --no-index diffs of untracked files", () => {
    const f = parsePatch("diff --git a/c.txt b/c.txt\n--- /dev/null\n+++ b/c.txt\n@@ -0,0 +1 @@\n+new\n");
    expect(f[0]!.path).toBe("c.txt");
  });
});
