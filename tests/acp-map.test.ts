import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error — plain .mjs module from the Electron side
import { contentDiffs, contentText, mapUpdate } from "../desktop/acp-map.mjs";

type Ev = Record<string, unknown> & { type: string };

function load(name: string): Ev[] {
  return readFileSync(join(__dirname, "fixtures", name), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => mapUpdate(JSON.parse(l)) as Ev);
}

/** The renderer's tool-card merge, reduced to what these tests check. */
function cards(events: Ev[]) {
  const by = new Map<string, Record<string, unknown>>();
  const statuses = new Map<string, string[]>();
  for (const ev of events) {
    if (ev.type !== "tool") continue;
    const id = ev.toolId as string;
    const prev = by.get(id) ?? {};
    const next = { ...prev };
    for (const [k, v] of Object.entries(ev)) {
      if (v !== undefined && v !== "" && k !== "type") next[k] = v;
    }
    if (!prev.status && !ev.status) next.status = "running";
    by.set(id, next);
    statuses.set(id, [...(statuses.get(id) ?? []), String(next.status)]);
  }
  return { by, statuses };
}

describe("contentText / contentDiffs", () => {
  it("unwraps ACP's nested content blocks", () => {
    expect(contentText([{ type: "content", content: { type: "text", text: "5" } }])).toBe("5");
    expect(contentText({ type: "text", text: "x" })).toBe("x");
    expect(contentText([{ type: "diff", path: "a", oldText: "1", newText: "2" }])).toBe("");
  });
  it("reads diff blocks", () => {
    expect(contentDiffs([{ type: "diff", path: "/a.py", oldText: "-", newText: "+" }])).toEqual([
      { path: "/a.py", oldText: "-", newText: "+" },
    ]);
  });
});

describe("Claude (claude-agent-acp) recording", () => {
  const events = load("acp-claude.jsonl");
  const { by, statuses } = cards(events);
  const tools = [...by.values()];

  it("names tools by their real tool name and keeps the agent's title", () => {
    const read = tools.find((t) => t.name === "Read")!;
    expect(read.title).toBe("Read calc.py");
    expect(read.toolKind).toBe("read");
    expect(read.path).toBe("/work/calc.py");
  });

  it("captures tool output (it is nested one level deeper than text)", () => {
    expect(tools.find((t) => t.name === "Read")!.content).toContain("return a - b");
    expect(tools.find((t) => t.name === "Bash")!.content).toContain("5");
  });

  it("keeps a tool running until the agent says completed", () => {
    const edit = tools.find((t) => t.name === "Edit")!;
    const seq = statuses.get(edit.toolId as string)!;
    expect(seq[0]).toBe("running");
    expect(seq.slice(0, -1).every((s) => s === "running")).toBe(true);
    expect(seq[seq.length - 1]).toBe("done");
  });

  it("carries the edit as a diff", () => {
    const edit = tools.find((t) => t.name === "Edit")!;
    const [d] = edit.diffs as { path: string; oldText: string; newText: string }[];
    expect(d!.path).toBe("/work/calc.py");
    expect(d!.oldText).toContain("return a - b");
    expect(d!.newText).toContain("return a + b");
  });

  it("emits usage and the agent's session title", () => {
    expect(events.some((e) => e.type === "usage")).toBe(true);
    expect(events.find((e) => e.type === "info")?.title).toBe("Calc.py add bug fix");
  });

  it("never emits a done status without the agent saying so", () => {
    const raw = readFileSync(join(__dirname, "fixtures", "acp-claude.jsonl"), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    raw.forEach((p, i) => {
      const ev = events[i]!;
      if (ev.type === "tool" && ev.status === "done") {
        expect(p.update.status).toBe("completed");
      }
    });
  });
});

describe("Grok (grok agent stdio) recording", () => {
  const events = load("acp-grok.jsonl");
  const { by } = cards(events);

  it("turns todo updates into a plan", () => {
    const plans = events.filter((e) => e.type === "plan");
    expect(plans.length).toBeGreaterThan(0);
    const first = plans[0]!.plan as { content: string; status: string }[];
    expect(first).toHaveLength(3);
    expect(first[0]!.status).toBe("in_progress");
    const last = plans[plans.length - 1]!.plan as { status: string }[];
    expect(last.some((e) => e.status === "completed")).toBe(true);
  });

  it("reads file output and names tools from x.ai/tool meta", () => {
    const read = [...by.values()].find((t) => t.name === "read_file")!;
    expect(read.content).toContain("return a - b");
    expect(read.status).toBe("done");
  });
});

// @ts-expect-error — plain .mjs module from the Electron side
import { modelsFrom } from "../desktop/acp-map.mjs";
// @ts-expect-error — plain .mjs module from the Electron side
import { mapModel } from "../desktop/acp-host.mjs";

describe("models", () => {
  it("reads Claude's model select from session/new configOptions", () => {
    const session = {
      configOptions: [
        { id: "mode", category: "mode", options: [{ value: "default", name: "Manual" }] },
        {
          id: "model",
          category: "model",
          options: [
            { value: "default", name: "Default (recommended)", description: "Opus 5.5" },
            { value: "opus", name: "Opus 5.5" },
            { value: "sonnet", name: "Sonnet 5.5" },
          ],
        },
      ],
    };
    expect(modelsFrom({}, session)).toEqual([
      { id: "default", label: "Default (Opus 5.5)" },
      { id: "opus", label: "Opus 5.5" },
      { id: "sonnet", label: "Sonnet 5.5" },
    ]);
  });
  it("reads Grok's availableModels, preferring session/new", () => {
    const init = { _meta: { modelState: { availableModels: [{ modelId: "grok-4.6", name: "Grok 4.6" }] } } };
    const session = { models: { availableModels: [{ modelId: "grok-4.7", name: "Grok 4.7" }] } };
    expect(modelsFrom(init, session)).toEqual([{ id: "grok-4.7", label: "Grok 4.7" }]);
    expect(modelsFrom(init, {})).toEqual([{ id: "grok-4.6", label: "Grok 4.6" }]);
  });
  it("passes ids the CLI reported straight through, maps only friendly labels", () => {
    expect(mapModel("grok", "grok-4.7")).toBe("grok-4.7");
    expect(mapModel("grok", "grok-4.7-build-fast")).toBe("grok-4.7-build-fast");
    expect(mapModel("grok", "Grok 4.5")).toBe("grok-4.5");
    expect(mapModel("claude", "default")).toBe("default");
    expect(mapModel("claude", "opus[1m]")).toBe("opus[1m]");
    expect(mapModel("claude", "claude-fable-5-1")).toBe("claude-fable-5-1");
    expect(mapModel("claude", "claude-fable-5[1m]")).toBe("claude-fable-5[1m]");
    expect(mapModel("claude", "Sonnet")).toBe("sonnet");
    expect(mapModel("codex", "gpt-6.1-sol")).toBe("gpt-6.1-sol");
  });
});
