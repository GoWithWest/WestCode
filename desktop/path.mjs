import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const EXTRA_DIRS = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  join(homedir(), ".grok", "bin"),
  join(homedir(), ".local", "bin"),
  join(homedir(), ".claude", "bin"),
  join(homedir(), ".codex", "bin"),
  join(homedir(), ".npm-global", "bin"),
  "/opt/homebrew/opt/node/bin",
];

function loginShellPath() {
  if (process.platform !== "darwin" && process.platform !== "linux") {
    return process.env.PATH ?? "";
  }
  const shell = process.env.SHELL || "/bin/zsh";
  try {
    const out = execFileSync(shell, ["-ilc", "echo -n $PATH"], {
      encoding: "utf8",
      timeout: 4000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim();
  } catch {
    return process.env.PATH ?? "";
  }
}

export function mergedPath() {
  const parts = [
    ...EXTRA_DIRS.filter((d) => existsSync(d)),
    ...(loginShellPath() || "").split(":"),
    ...(process.env.PATH || "").split(":"),
    "/usr/bin",
    "/bin",
  ];
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    if (!p || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out.join(":");
}

export function childEnv() {
  return {
    ...process.env,
    PATH: mergedPath(),
    NO_COLOR: "1",
    TERM: "dumb",
    CI: process.env.CI ?? "",
  };
}

export function which(binary, env = childEnv()) {
  if (!binary || binary.includes("/")) {
    const expanded = binary.startsWith("~")
      ? join(homedir(), binary.slice(1))
      : binary;
    return existsSync(expanded) ? expanded : null;
  }
  for (const dir of (env.PATH || "").split(":")) {
    const candidate = join(dir, binary);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}
