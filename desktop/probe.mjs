import { execFile } from "node:child_process";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { childEnv, which } from "./path.mjs";

const exec = promisify(execFile);

export const PROVIDERS = {
  claude: {
    id: "claude",
    name: "Claude Code",
    binary: "claude",
    install: "curl -fsSL https://claude.ai/install.sh | bash",
    loginArgs: ["auth", "login"],
    logoutArgs: ["auth", "logout"],
  },
  grok: {
    id: "grok",
    name: "Grok Build",
    binary: "grok",
    install: "curl -fsSL https://x.ai/cli/install.sh | bash",
    loginArgs: ["login"],
    logoutArgs: ["logout"],
  },
  codex: {
    id: "codex",
    name: "Codex",
    binary: "codex",
    install: "npm i -g @openai/codex",
    installAlt: "brew install --cask codex",
    loginArgs: ["login"],
    logoutArgs: ["logout"],
  },
};

async function run(bin, args, timeout = 8000) {
  try {
    const { stdout, stderr } = await exec(bin, args, {
      env: childEnv(),
      timeout,
      maxBuffer: 2_000_000,
    });
    return { ok: true, stdout: stdout ?? "", stderr: stderr ?? "" };
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? "",
      code: err.code,
    };
  }
}

function looksLoggedIn(id, text) {
  const t = text.toLowerCase();
  if (!t.trim()) return false;
  if (/(not logged|unauthenticated|please (log|sign) in|login required|no account)/.test(t)) {
    return false;
  }
  if (id === "grok") {
    return /logged in|authenticated|account|email|xai|grok\.com/.test(t) || !/login/.test(t);
  }
  if (id === "claude") {
    return /logged in|oauth|claude\.ai|anthropic|account/.test(t);
  }
  if (id === "codex") {
    return /logged in|chatgpt|plus|pro|account/.test(t);
  }
  return true;
}

async function loginState(id, bin) {
  if (id === "claude") {
    const r = await run(bin, ["auth", "status"], 6000);
    const text = `${r.stdout}\n${r.stderr}`.trim();
    try {
      const jsonStart = r.stdout.indexOf("{");
      const j = JSON.parse(r.stdout.slice(jsonStart));
      return { loggedIn: Boolean(j.loggedIn), detail: text.slice(0, 400) };
    } catch {
      return {
        loggedIn: looksLoggedIn(id, text),
        detail: text.slice(0, 400) || "Could not read Claude auth status.",
      };
    }
  }
  if (id === "grok") {
    const r = await run(bin, ["models"], 6000);
    const text = `${r.stdout}\n${r.stderr}`.trim();
    if (/logged in/i.test(text)) {
      return { loggedIn: true, detail: text.slice(0, 400) };
    }
    if (/not logged|please log|unauthenticated|sign in/i.test(text)) {
      return { loggedIn: false, detail: text.slice(0, 400) };
    }
    return { loggedIn: looksLoggedIn(id, text), detail: text.slice(0, 400) };
  }
  const attempts = {
    codex: [["login", "status"], ["status"], ["auth", "status"]],
  };
  for (const args of attempts[id] ?? []) {
    const r = await run(bin, args, 6000);
    const text = `${r.stdout}\n${r.stderr}`;
    if (/unknown|unrecognized|invalid command|no such/.test(text.toLowerCase())) continue;
    if (looksLoggedIn(id, text)) return { loggedIn: true, detail: text.trim().slice(0, 400) };
    if (r.ok || text.trim()) {
      return { loggedIn: false, detail: text.trim().slice(0, 400) };
    }
  }
  return { loggedIn: null, detail: "Installed. Sign-in is checked when a session starts." };
}

async function versionOf(bin) {
  const r = await run(bin, ["--version"], 4000);
  const line = (r.stdout || r.stderr).split("\n").map((s) => s.trim()).find(Boolean);
  return line?.slice(0, 80) ?? null;
}

export async function probeOne(id) {
  const spec = PROVIDERS[id];
  if (!spec) return null;
  const path = which(spec.binary);
  if (!path) {
    return {
      id,
      name: spec.name,
      binary: spec.binary,
      found: false,
      path: null,
      version: null,
      loggedIn: false,
      connected: false,
      install: spec.install,
      installAlt: spec.installAlt ?? null,
      detail: `Install with: ${spec.install}`,
    };
  }
  const version = await versionOf(path);
  const auth = await loginState(id, path);
  return {
    id,
    name: spec.name,
    binary: spec.binary,
    found: true,
    path,
    version,
    loggedIn: auth.loggedIn,
    connected: auth.loggedIn !== false,
    install: spec.install,
    installAlt: spec.installAlt ?? null,
    detail: auth.detail,
  };
}

export async function probeAll() {
  const ids = Object.keys(PROVIDERS);
  const list = [];
  for (const id of ids) list.push(await probeOne(id));
  return list;
}

const PER_KIND_CAP = 80;

function collectSkillDirs(dir, id, spec, push) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith(".")) continue;
    push({
      id: `${id}-skill-${e.name}`,
      kind: "skill",
      name: e.name,
      source: spec.name,
      summary: `Installed skill in ${dir}`,
      providers: [id],
    });
  }
}

export async function listAddons(id) {
  const spec = PROVIDERS[id];
  if (!spec) return [];
  const path = which(spec.binary);
  if (!path) return [];
  const addons = [];
  const seen = new Set();

  function push(addon) {
    const key = `${addon.kind}:${addon.name.toLowerCase()}`;
    if (seen.has(key)) return;
    if (addons.filter((a) => a.kind === addon.kind).length >= PER_KIND_CAP) return;
    seen.add(key);
    addons.push(addon);
  }

  async function collect(args, kind) {
    const r = await run(path, args, 8000);
    // Parse stdout even on a non-zero exit — `claude mcp list` exits 1 when
    // one server fails its health check but still prints the full table.
    const text = r.stdout.trim() ? r.stdout : r.stderr;
    if (/^usage:|unknown|unrecognized|invalid/i.test(text.trim())) return;
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || /^usage:/i.test(t) || /^no /i.test(t)) continue;
      // Preamble/header/status noise, not addons.
      if (/^(checking|fetching|loading|warning|error)\b/i.test(t)) continue;
      if (/^name\s+(status|command)/i.test(t)) continue;
      if (/^[-─═]+$/.test(t)) continue;
      const name = t.replace(/^[-*\d.\s✓✗·]+/, "").split(/\s{2,}|\t|:/)[0]?.trim();
      if (
        name &&
        name.length < 80 &&
        !/^(list|add|remove|mcp|plugin|options?|commands?|flags?|name|status|connected|disconnected|failed|ok|health)$/i.test(
          name,
        )
      ) {
        push({
          id: `${id}-${kind}-${name}`,
          kind,
          name,
          source: spec.name,
          summary: t.slice(0, 160),
          providers: [id],
        });
      }
    }
  }

  if (id === "grok") {
    const inspect = await run(path, ["inspect", "--json"], 8000);
    try {
      const j = JSON.parse(inspect.stdout);
      for (const s of j.skills || []) {
        push({
          id: `grok-skill-${s.name}`,
          kind: "skill",
          name: s.name,
          source: s.source?.type || "Grok",
          summary: s.description || "",
          providers: ["grok"],
        });
      }
      for (const p of j.plugins || []) {
        push({
          id: `grok-plugin-${p.name || p.id}`,
          kind: "plugin",
          name: p.name || p.id,
          source: "Grok",
          summary: p.description || "",
          providers: ["grok"],
        });
      }
      for (const m of j.mcpServers || j.mcp || []) {
        push({
          id: `grok-mcp-${m.name || m.id}`,
          kind: "connector",
          name: m.name || m.id,
          source: "Grok",
          summary: m.command || m.description || "",
          providers: ["grok"],
        });
      }
    } catch {
      await collect(["mcp", "list"], "connector");
      await collect(["plugin", "list"], "plugin");
    }
  } else if (id === "claude") {
    await collect(["mcp", "list"], "connector");
    await collect(["plugin", "list"], "plugin");
    collectSkillDirs(join(homedir(), ".claude", "skills"), id, spec, push);
  } else if (id === "codex") {
    await collect(["mcp", "list"], "connector");
    await collect(["features", "list"], "plugin");
  }
  return addons;
}
