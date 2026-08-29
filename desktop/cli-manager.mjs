/**
 * Managed CLI installs. WestCode can install and update the provider CLIs
 * itself so the user never has to install them by hand:
 *
 * - claude / codex come from npm, installed into ~/.westcode/cli (a private
 *   npm prefix), so a packaged read-only app can still update them.
 * - grok has no official npm package; its vendor installer puts it in
 *   ~/.grok/bin, which is already on the merged PATH.
 *
 * The managed dir sits first on the merged PATH (path.mjs), so an update
 * installed there takes effect even when an older copy exists elsewhere.
 */
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { childEnv, which } from "./path.mjs";

export const MANAGED_PREFIX = join(homedir(), ".westcode", "cli");

export function managedBinDir() {
  return join(MANAGED_PREFIX, "node_modules", ".bin");
}

const NPM_PACKAGES = {
  claude: "@anthropic-ai/claude-code",
  codex: "@openai/codex",
};

const GROK_INSTALL = "curl -fsSL https://x.ai/cli/install.sh | bash";

function runShell(command, timeout = 300_000) {
  return new Promise((resolve) => {
    const child = spawn(process.env.SHELL || "/bin/zsh", ["-lc", command], {
      env: childEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
    });
    let out = "";
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (out += c));
    child.on("error", (err) => resolve({ ok: false, output: err.message }));
    child.on("exit", (code) =>
      resolve({ ok: code === 0, output: out.slice(-4000) }),
    );
  });
}

function npmBin() {
  return which("npm") || "npm";
}

function quote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

export async function managedVersion(id) {
  const pkg = NPM_PACKAGES[id];
  if (!pkg) return null;
  try {
    const raw = await readFile(
      join(MANAGED_PREFIX, "node_modules", pkg, "package.json"),
      "utf8",
    );
    return JSON.parse(raw).version ?? null;
  } catch {
    return null;
  }
}

export async function latestVersion(id) {
  const pkg = NPM_PACKAGES[id];
  if (!pkg) return null;
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8000);
    const res = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`,
      { signal: ac.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

function cmpVersions(a, b) {
  const pa = String(a).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

function currentVersionFromProbe(probe) {
  // Take the LAST x.y(.z) on the line: "codex-cli 0.150.1" and
  // "2.1.251 (Claude Code)" both parse, and a leading tool banner like
  // "node v22.1.0 / cli 1.2.3" does not win with the wrong number.
  const all = String(probe?.version ?? "").match(/\d+\.\d+(\.\d+)?/g);
  return all?.length ? all[all.length - 1] : null;
}

/**
 * Compare each installed CLI against the latest published version.
 * Returns [{ id, name, current, latest }] for the ones with a newer release.
 */
export async function checkUpdates(probes) {
  const updates = [];
  for (const probe of probes || []) {
    if (!probe?.found) continue;
    const latest = await latestVersion(probe.id);
    if (!latest) continue;
    const current = currentVersionFromProbe(probe);
    if (current && cmpVersions(latest, current) > 0) {
      updates.push({ id: probe.id, name: probe.name, current, latest });
    }
  }
  return updates;
}

export async function installCli(id) {
  if (id === "grok") {
    return runShell(GROK_INSTALL);
  }
  const pkg = NPM_PACKAGES[id];
  if (!pkg) return { ok: false, output: `Unknown provider: ${id}` };
  return runShell(
    `${quote(npmBin())} install --prefix ${quote(MANAGED_PREFIX)} ${pkg}@latest --no-fund --no-audit`,
  );
}

export async function updateCli(id) {
  if (id === "grok") {
    return runShell(GROK_INSTALL);
  }
  const pkg = NPM_PACKAGES[id];
  if (!pkg) return { ok: false, output: `Unknown provider: ${id}` };
  const managed = await managedVersion(id);
  if (managed) {
    return runShell(
      `${quote(npmBin())} install --prefix ${quote(MANAGED_PREFIX)} ${pkg}@latest --no-fund --no-audit`,
    );
  }
  // The CLI was installed by the user (globally or via the vendor script).
  // Update it in place the same way it was installed — never drop a managed
  // copy in front of it on PATH, which would permanently shadow a binary
  // WestCode does not own.
  const bin = which(id === "claude" ? "claude" : "codex");
  if (bin && !bin.startsWith(MANAGED_PREFIX) && /npm|node_modules/.test(bin)) {
    return runShell(`${quote(npmBin())} install -g ${pkg}@latest --no-fund --no-audit`);
  }
  if (id === "claude" && bin && !bin.startsWith(MANAGED_PREFIX)) {
    return runShell("curl -fsSL https://claude.ai/install.sh | bash");
  }
  if (bin && !bin.startsWith(MANAGED_PREFIX)) {
    return {
      ok: false,
      output: `${id} at ${bin} was installed outside WestCode (Homebrew or a vendor package). Update it with the same tool that installed it.`,
    };
  }
  return runShell(
    `${quote(npmBin())} install --prefix ${quote(MANAGED_PREFIX)} ${pkg}@latest --no-fund --no-audit`,
  );
}
