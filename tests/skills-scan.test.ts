import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error — plain .mjs module from the Electron side
import { parseFrontmatter, pluginSkills, scanClaudeSkills, scanCodexSkills } from "../desktop/skills-scan.mjs";

function skill(dir: string, name: string, description: string) {
  mkdirSync(join(dir, name), { recursive: true });
  writeFileSync(join(dir, name, "SKILL.md"), `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`);
}

describe("parseFrontmatter", () => {
  it("reads single-line, quoted and folded values", () => {
    const fm = parseFrontmatter(`---\nname: "pdf"\ndescription: >\n  Read and\n  write PDFs\nlicense: MIT\n---\nbody`);
    expect(fm).toEqual({ name: "pdf", description: "Read and write PDFs", license: "MIT" });
  });
  it("returns {} without frontmatter", () => {
    expect(parseFrontmatter("# just a heading")).toEqual({});
  });
});

describe("scanClaudeSkills", () => {
  it("lists personal skills and enabled plugin skills, plugin ones namespaced", () => {
    const home = mkdtempSync(join(tmpdir(), "wc-home-"));
    skill(join(home, ".claude", "skills"), "animate", "Make an animation");
    const on = join(home, "plugins", "frontend");
    const off = join(home, "plugins", "off");
    skill(join(on, "skills"), "frontend-design", "Distinctive UI");
    mkdirSync(join(on, "commands"), { recursive: true });
    writeFileSync(join(on, "commands", "audit.md"), "---\ndescription: Audit a page\n---\nDo it");
    skill(join(off, "skills"), "hidden", "Disabled plugin skill");
    mkdirSync(join(home, ".claude", "plugins"), { recursive: true });
    writeFileSync(
      join(home, ".claude", "plugins", "installed_plugins.json"),
      JSON.stringify({
        version: 2,
        plugins: {
          "frontend-design@official": [{ installPath: on }],
          "off@official": [{ installPath: off }],
          "gone@official": [{ installPath: join(home, "missing") }],
        },
      }),
    );
    writeFileSync(join(home, ".claude", "settings.json"), JSON.stringify({ enabledPlugins: { "off@official": false } }));
    const names = scanClaudeSkills(home).map((s: { name: string }) => s.name);
    expect(names).toEqual(["animate", "frontend-design:frontend-design", "frontend-design:audit"]);
  });
});

describe("pluginSkills", () => {
  it("follows the skill paths a plugin manifest lists", () => {
    const root = mkdtempSync(join(tmpdir(), "wc-plugin-"));
    skill(join(root, "skills", "engineering"), "tdd", "Test first");
    skill(join(root, "skills", "misc"), "grill", "Ask hard questions");
    mkdirSync(join(root, ".claude-plugin"), { recursive: true });
    writeFileSync(
      join(root, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "p", skills: ["./skills/engineering/tdd", "./skills/misc"] }),
    );
    expect(pluginSkills(root).map((s: { name: string }) => s.name)).toEqual(["tdd", "grill"]);
  });
});

describe("scanCodexSkills", () => {
  it("reads ~/.codex/skills and ~/.agents/skills", () => {
    const home = mkdtempSync(join(tmpdir(), "wc-home-"));
    skill(join(home, ".codex", "skills"), "a", "A");
    skill(join(home, ".agents", "skills"), "b", "B");
    expect(scanCodexSkills(home).map((s: { name: string }) => s.name)).toEqual(["a", "b"]);
  });
});
