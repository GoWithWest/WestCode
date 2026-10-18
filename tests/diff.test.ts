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
