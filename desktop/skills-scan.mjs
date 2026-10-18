// Read the skills each CLI has installed straight from disk, with the name
// and description from each SKILL.md frontmatter. The CLIs load skills from
// these same places, so this is what a session can actually use:
//
//   Claude  ~/.claude/skills/<s>/SKILL.md, and every ENABLED plugin's
//           <installPath>/skills/<s>/SKILL.md (named "<plugin>:<s>")
//   Codex   ~/.codex/skills/<s>/SKILL.md and ~/.agents/skills/<s>/SKILL.md
//   Grok    `grok inspect --json` (probe.mjs) — plus ~/.grok/skills here
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** name/description from a SKILL.md's YAML frontmatter (single-line values). */
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(String(text || ""));
  const out = {};
  if (!m) return out;
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) {
      key = kv[1];
      let v = kv[2].trim();
      if (v === ">" || v === "|" || v === ">-" || v === "|-") v = "";
      out[key] = v.replace(/^(["'])(.*)\1$/, "$2");
    } else if (key && /^\s+\S/.test(line)) {
      // folded / continued value
      out[key] = `${out[key] ? `${out[key]} ` : ""}${line.trim()}`;
    }
  }
  return out;
}

function readSkill(dir) {
  const file = join(dir, "SKILL.md");
  try {
    const fm = parseFrontmatter(readFileSync(file, "utf8").slice(0, 8000));
    return { description: String(fm.description || "").slice(0, 400), name: fm.name, path: file };
  } catch {
    return null;
  }
}

/** Every <dir>/<skill>/SKILL.md one level down. */
export function skillsIn(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = join(dir, e.name);
    let isDir = e.isDirectory();
    if (e.isSymbolicLink()) {
      try {
        isDir = statSync(full).isDirectory();
      } catch {
        isDir = false;
      }
    }
    if (!isDir) continue;
    const s = readSkill(full);
    if (s) out.push({ dirName: e.name, ...s });
  }
  return out;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** Plugins Claude Code has enabled, with their install paths. */
export function enabledClaudePlugins(home) {
  const installed = readJson(join(home, ".claude", "plugins", "installed_plugins.json"));
  const settings = readJson(join(home, ".claude", "settings.json")) || {};
  const enabled = settings.enabledPlugins || {};
  const out = [];
  const plugins = installed?.plugins || {};
  for (const [key, rows] of Object.entries(plugins)) {
    // A plugin not mentioned in enabledPlugins is on (the CLI's default);
    // an explicit false is off.
    if (enabled[key] === false) continue;
    const row = Array.isArray(rows) ? rows[rows.length - 1] : rows;
    if (!row?.installPath || !existsSync(row.installPath)) continue;
    out.push({ key, name: key.split("@")[0], installPath: row.installPath });
  }
  return out;
}

/**
 * A plugin's skills: <plugin>/skills/<s>/SKILL.md by default, or the paths its
 * .claude-plugin/plugin.json lists under "skills" (each a skill folder or a
 * folder of skill folders).
 */
export function pluginSkills(root) {
  const manifest = readJson(join(root, ".claude-plugin", "plugin.json"));
  const listed = Array.isArray(manifest?.skills)
    ? manifest.skills
    : typeof manifest?.skills === "string"
      ? [manifest.skills]
      : null;
  if (!listed) return skillsIn(join(root, "skills"));
  const out = [];
  const seen = new Set();
  for (const rel of listed) {
    const dir = join(root, String(rel));
    const own = readSkill(dir);
    const found = own ? [{ dirName: dir.split("/").filter(Boolean).pop(), ...own }] : skillsIn(dir);
    for (const s of found) {
      if (seen.has(s.path)) continue;
      seen.add(s.path);
      out.push(s);
    }
  }
  return out;
}

/** <dir>/<name>.md slash commands; Claude Code lists them with the skills. */
export function commandsIn(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md") || e.name.startsWith(".")) continue;
    const path = join(dir, e.name);
    let fm = {};
    try {
      fm = parseFrontmatter(readFileSync(path, "utf8").slice(0, 8000));
    } catch {
      continue;
    }
    out.push({ dirName: e.name.slice(0, -3), description: String(fm.description || "").slice(0, 400), path });
  }
  return out;
}

export function scanClaudeSkills(home) {
  const out = [];
  for (const s of skillsIn(join(home, ".claude", "skills"))) {
    out.push({ name: s.name || s.dirName, description: s.description, source: "~/.claude/skills", path: s.path });
  }
  for (const p of enabledClaudePlugins(home)) {
    for (const s of pluginSkills(p.installPath)) {
      out.push({
        name: `${p.name}:${s.name || s.dirName}`,
        description: s.description,
        source: `plugin ${p.key}`,
        path: s.path,
      });
    }
    for (const c of commandsIn(join(p.installPath, "commands"))) {
      out.push({
        name: `${p.name}:${c.dirName}`,
        description: c.description,
        source: `plugin ${p.key} (command)`,
        path: c.path,
      });
    }
  }
  return out;
}

export function scanCodexSkills(home) {
  const out = [];
  for (const dir of [join(home, ".codex", "skills"), join(home, ".agents", "skills")]) {
    for (const s of skillsIn(dir)) {
      out.push({ name: s.name || s.dirName, description: s.description, source: dir.replace(home, "~"), path: s.path });
    }
  }
  return out;
}

export function scanGrokSkills(home) {
  return skillsIn(join(home, ".grok", "skills")).map((s) => ({
    name: s.name || s.dirName,
    description: s.description,
    source: "~/.grok/skills",
    path: s.path,
  }));
}

export function scanSkills(providerId, home) {
  if (providerId === "claude") return scanClaudeSkills(home);
  if (providerId === "codex") return scanCodexSkills(home);
  if (providerId === "grok") return scanGrokSkills(home);
  return [];
}
