import { describe, expect, it } from "vitest";
import { activityLine, liveLabel, toolKindOf, toolLabel } from "@/lib/activity";
import type { Block, ToolBlock } from "@/lib/types";

const tool = (p: Partial<ToolBlock>): ToolBlock => ({ type: "tool", name: "Tool", content: "", status: "done", ...p });

describe("activityLine", () => {
  it("summarises tools by kind in the order they first ran", () => {
    const blocks: Block[] = [
      tool({ name: "Read", toolKind: "read" }),
      tool({ name: "Read", toolKind: "read" }),
      tool({ name: "Edit", toolKind: "edit" }),
      tool({ name: "Bash", toolKind: "execute" }),
    ];
    expect(activityLine(blocks)).toBe("Read 2 files, edited 1 file, ran 1 command");
  });
  it("falls back to name heuristics and counts unknown tools", () => {
    expect(activityLine([tool({ name: "mcp__x__thing" })])).toBe("Used 1 tool");
    expect(activityLine([tool({ name: "search_replace" })])).toBe("Edited 1 file");
  });
  it("reports pure thinking with its duration", () => {
    expect(activityLine([{ type: "think", text: "hm", ms: 4200 }])).toBe("Thought for 4s");
  });
});

describe("labels", () => {
  it("prefers the agent's title, then the command, then name + file", () => {
    expect(toolLabel(tool({ name: "Read", title: "Read calc.py" }))).toBe("Read calc.py");
    expect(toolLabel(tool({ name: "Bash", command: "npm test" }))).toBe("npm test");
    expect(toolLabel(tool({ name: "Read", path: "/a/b/c.ts" }))).toBe("Read c.ts");
  });
  it("liveLabel names the running tool or open thought", () => {
    expect(liveLabel([tool({ name: "Bash", command: "ls", status: "running" })])).toBe("ls");
    expect(liveLabel([{ type: "think", text: "x", startedAt: 1 }])).toBe("Thinking");
  });
  it("toolKindOf trusts ACP kind first", () => {
    expect(toolKindOf(tool({ name: "weird", toolKind: "fetch" }))).toBe("fetch");
    expect(toolKindOf(tool({ name: "mcp__westcode__westcode_send_message" }))).toBe("send");
  });
});
