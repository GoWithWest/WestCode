import { describe, expect, it } from "vitest";
import { dotActivity, dotStateFor, inkFor, lookFor, PRESET_LOOKS } from "@/lib/dots";
import type { Session } from "@/lib/types";

const base: Session = {
  id: "s", title: "T", providerId: "claude", projectId: "p", cwd: "/", model: "m", effort: "e",
  status: "idle", createdAt: 0, updatedAt: 0, messages: [], turns: 0,
};

describe("dotStateFor", () => {
  it("maps session activity to character states", () => {
    expect(dotStateFor(undefined)).toBe("idle");
    expect(dotStateFor(base)).toBe("idle");
    expect(dotStateFor({ ...base, permission: { rpcId: 1, tool: "Edit", options: [] } })).toBe("needs-input");
    expect(dotStateFor({ ...base, status: "error" })).toBe("error");
    const running = (blocks: Session["messages"][number]["blocks"]) => ({
      ...base,
      status: "running" as const,
      messages: [{ id: "m", role: "assistant" as const, createdAt: 0, blocks }],
    });
    expect(dotStateFor(running([]))).toBe("thinking");
    expect(dotStateFor(running([{ type: "think", text: "x" }]))).toBe("thinking");
    expect(dotStateFor(running([{ type: "tool", name: "Bash", content: "", status: "running" }]))).toBe("working");
    expect(dotStateFor(running([{ type: "text", text: "hi" }]))).toBe("speaking");
    expect(dotStateFor({ ...base, status: "waiting", updatedAt: 1000 }, 2000)).toBe("done");
    expect(dotStateFor({ ...base, status: "waiting", updatedAt: 1000 }, 9000)).toBe("idle");
  });
});

describe("looks", () => {
  it("uses the preset look, lets overrides win, and derives a stable one otherwise", () => {
    expect(lookFor({ id: "reviewer-qa" })).toEqual(PRESET_LOOKS["reviewer-qa"]);
    expect(lookFor({ id: "reviewer-qa", look: { color: "#000000" } }).color).toBe("#000000");
    expect(lookFor({ id: "custom-1" })).toEqual(lookFor({ id: "custom-1" }));
  });
  it("picks readable ink", () => {
    expect(inkFor("#FFC21A")).toBe("#111111");
    expect(inkFor("#3A3A8F")).toBe("#ffffff");
  });
  it("describes what the bot is doing", () => {
    expect(dotActivity({ ...base, status: "running", plan: [{ content: "Write tests", status: "in_progress" }] })).toBe("Write tests");
    expect(dotActivity({ ...base, permission: { rpcId: 1, tool: "Edit `a.ts`", options: [] } })).toBe("Needs your OK: Edit a.ts");
  });
});
