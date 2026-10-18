import { describe, expect, it } from "vitest";
import {
  EMPTY_GROUPS,
  assignSkill,
  groupPreamble,
  groupsForSkill,
  matchGroup,
  mergeGroups,
  resolveGroup,
  skillKey,
  slugGroupId,
  unassignSkill,
  type SkillGroup,
} from "@/lib/skill-groups";
import { GROUP_CATALOG } from "@/lib/skill-group-catalog";

const CATALOG: SkillGroup[] = [
  {
    id: "web-design",
    label: "Web Design",
    description: "Sites",
    icon: "palette",
    skills: [{ name: "frontend-design" }, { name: "web-design-guidelines" }, { name: "gsap-scrolltrigger" }],
  },
  { id: "docs", label: "Docs & Office", description: "", icon: "file-text", skills: [{ name: "pdf" }] },
];

describe("skillKey", () => {
  it("treats plugin-namespaced, spaced and dashed names as one skill", () => {
    expect(skillKey("example-skills:frontend-design")).toBe(skillKey("Frontend Design"));
    expect(skillKey("frontend-design")).toBe("frontenddesign");
  });
});

describe("mergeGroups", () => {
  it("returns presets untouched with no overrides", () => {
    const g = mergeGroups(EMPTY_GROUPS, CATALOG);
    expect(g.map((x) => x.id)).toEqual(["web-design", "docs"]);
    expect(g[0]!.builtin).toBe(true);
    expect(g[0]!.skills).toHaveLength(3);
  });

  it("applies add and remove overrides and keeps a removal sticky", () => {
    let p = assignSkill(EMPTY_GROUPS, "web-design", { name: "superdesign" });
    p = unassignSkill(p, "web-design", "gsap-scrolltrigger");
    const g = mergeGroups(p, CATALOG).find((x) => x.id === "web-design")!;
    expect(g.skills.map((s) => s.name)).toEqual(["frontend-design", "web-design-guidelines", "superdesign"]);
    // Re-adding a removed preset skill clears the removal.
    p = assignSkill(p, "web-design", { name: "gsap-scrolltrigger" });
    const again = mergeGroups(p, CATALOG).find((x) => x.id === "web-design")!;
    expect(again.skills.map((s) => s.name)).toContain("gsap-scrolltrigger");
  });

  it("removing a skill the user added drops it from added", () => {
    let p = assignSkill(EMPTY_GROUPS, "docs", { name: "xlsx" });
    p = unassignSkill(p, "docs", "xlsx");
    expect(p.overrides.docs!.added).toEqual([]);
    expect(mergeGroups(p, CATALOG).find((x) => x.id === "docs")!.skills.map((s) => s.name)).toEqual(["pdf"]);
  });

  it("hides removed groups and appends custom ones, deduping skills", () => {
    const p = {
      ...EMPTY_GROUPS,
      removed: ["docs"],
      custom: [
        { id: "mine", label: "Mine", description: "", icon: "star", skills: [{ name: "pdf" }, { name: "PDF" }] },
      ],
    };
    const g = mergeGroups(p, CATALOG);
    expect(g.map((x) => x.id)).toEqual(["web-design", "mine"]);
    expect(g[1]!.builtin).toBe(false);
    expect(g[1]!.skills).toHaveLength(1);
  });

  it("assign/unassign on a custom group edits the group itself", () => {
    let p = { ...EMPTY_GROUPS, custom: [{ id: "mine", label: "Mine", description: "", icon: "star", skills: [] }] };
    p = assignSkill(p, "mine", { name: "pdf" });
    expect(p.custom[0]!.skills).toEqual([{ name: "pdf" }]);
    p = unassignSkill(p, "mine", "pdf");
    expect(p.custom[0]!.skills).toEqual([]);
    expect(p.overrides).toEqual({});
  });
});

describe("resolveGroup", () => {
  it("splits a group into what the CLI has and what it lacks, using the CLI's names", () => {
    const r = resolveGroup(CATALOG[0]!, ["example-skills:frontend-design", "pdf", "gsap-scrolltrigger"]);
    expect(r.available).toEqual(["example-skills:frontend-design", "gsap-scrolltrigger"]);
    expect(r.missing.map((s) => s.name)).toEqual(["web-design-guidelines"]);
  });
});

describe("groupPreamble", () => {
  it("is empty when nothing linked is installed", () => {
    expect(groupPreamble([resolveGroup(CATALOG[1]!, [])])).toBe("");
  });
  it("lists only installed skills per group", () => {
    const text = groupPreamble([resolveGroup(CATALOG[0]!, ["frontend-design"]), resolveGroup(CATALOG[1]!, [])]);
    expect(text).toContain("Web Design: frontend-design");
    expect(text).not.toContain("Docs");
  });
});

describe("lookup helpers", () => {
  it("groupsForSkill finds every group holding a skill", () => {
    expect(groupsForSkill(CATALOG, "PDF").map((g) => g.id)).toEqual(["docs"]);
  });
  it("matchGroup resolves ids, labels and prefixes", () => {
    expect(matchGroup("web", CATALOG)?.id).toBe("web-design");
    expect(matchGroup("Docs & Office", CATALOG)?.id).toBe("docs");
    expect(matchGroup("nope", CATALOG)).toBeUndefined();
  });
  it("slugGroupId avoids taken ids", () => {
    expect(slugGroupId("Web Design", new Set(["web-design"]))).toBe("web-design-2");
  });
});

describe("shipped catalog", () => {
  it("has unique ids, a label, an icon and at least one skill per group", () => {
    const ids = new Set<string>();
    for (const g of GROUP_CATALOG) {
      expect(ids.has(g.id)).toBe(false);
      ids.add(g.id);
      expect(g.label.trim()).not.toBe("");
      expect(g.icon.trim()).not.toBe("");
      expect(g.skills.length).toBeGreaterThan(0);
    }
  });
});
