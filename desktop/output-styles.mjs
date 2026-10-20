// Claude Code output styles (Claude Desktop's output style option): the
// built-in ones plus custom styles in ~/.claude/output-styles and the
// project's .claude/output-styles. A session's choice goes to the CLI as a
// settings layer (`outputStyle`).
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { getHost, q, runRemote } from "./ssh.mjs";

export const BUILTIN_STYLES = [
  { name: "default", description: "Claude Code's normal style." },
  { name: "Explanatory", description: "Explains its choices and the codebase as it works." },
  { name: "Learning", description: "Leaves small pieces for you to write, to learn by doing." },
];

/** name/description from a style file's frontmatter (falls back to the file name). */
export function parseStyle(file, text) {
  const fm = /^---\s*\n([\s\S]*?)\n---/.exec(String(text || ""));
  const get = (k) => {
    const m = fm && new RegExp(`^${k}:\\s*(.+)$`, "m").exec(fm[1]);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  };
  return { name: get("name") || String(file).replace(/\.md$/, ""), description: get("description") };
}

function merge(custom) {
  const seen = new Set(BUILTIN_STYLES.map((s) => s.name.toLowerCase()));
  const out = [...BUILTIN_STYLES];
  for (const s of custom) {
    if (seen.has(s.name.toLowerCase())) continue;
    seen.add(s.name.toLowerCase());
    out.push({ ...s, custom: true });
  }
  return out;
}

async function localDir(dir) {
  let names = [];
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith(".md"));
  } catch {
    return [];
  }
  const out = [];
  for (const n of names) {
    try {
      out.push(parseStyle(n, await readFile(join(dir, n), "utf8")));
    } catch {
      /* unreadable: skip */
    }
  }
  return out;
}

export async function listOutputStyles({ cwd, hostId } = {}) {
  if (hostId) {
    const h = getHost(hostId);
    if (!h) return { ok: false, error: "Unknown SSH host.", styles: BUILTIN_STYLES };
    const dirs = [`"$HOME"/.claude/output-styles`, ...(cwd ? [`${q(cwd)}/.claude/output-styles`] : [])];
    // One "@@file" marker line, then the file's first 40 lines (its frontmatter).
    const script = `for f in ${dirs.map((d) => `${d}/*.md`).join(" ")}; do [ -f "$f" ] || continue; echo "@@$(basename "$f")"; head -n 40 "$f"; echo; done`;
    const r = await runRemote(h, script, { timeout: 20_000 });
    if (r.code !== 0) return { ok: true, styles: BUILTIN_STYLES };
    const custom = [];
    for (const chunk of r.stdout.split(/^@@/m).slice(1)) {
      const nl = chunk.indexOf("\n");
      custom.push(parseStyle(chunk.slice(0, nl < 0 ? undefined : nl), nl < 0 ? "" : chunk.slice(nl + 1)));
    }
    return { ok: true, styles: merge(custom) };
  }
  const home = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
  const custom = [
    ...(await localDir(join(home, "output-styles"))),
    ...(cwd ? await localDir(join(cwd, ".claude", "output-styles")) : []),
  ];
  return { ok: true, styles: merge(custom) };
}
