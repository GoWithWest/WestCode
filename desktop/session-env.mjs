// Environment variables for agents (Claude Desktop's environment
// variables: KEY=value per line on an environment). One set for this Mac
// and one per SSH host, stored encrypted with the OS keychain.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const file = () => join(process.env.WESTCODE_HOME || join(homedir(), ".westcode"), "env.json");
let crypto = null;
const cache = new Map(); // scope → { text, vars }

export function initSessionEnv({ encrypt, decrypt }) {
  crypto = { encrypt, decrypt };
  cache.clear();
}

/** "KEY=value" lines → {KEY: value}; # comments and blank lines skipped. */
export function parseEnv(text) {
  const out = {};
  for (const raw of String(text || "").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

function readAll() {
  try {
    return JSON.parse(readFileSync(file(), "utf8")) || {};
  } catch {
    return {};
  }
}

export function getEnvText(scope) {
  const hit = cache.get(scope);
  if (hit) return hit.text;
  const enc = readAll()[scope];
  let text = "";
  if (enc && crypto) {
    try {
      text = crypto.decrypt(enc);
    } catch {
      text = "";
    }
  }
  cache.set(scope, { text, vars: parseEnv(text) });
  return text;
}

export function setEnvText(scope, text) {
  if (!crypto) throw new Error("Encryption is not available.");
  const all = readAll();
  if (String(text).trim()) all[scope] = crypto.encrypt(String(text));
  else delete all[scope];
  mkdirSync(join(file(), ".."), { recursive: true });
  writeFileSync(file(), JSON.stringify(all), { mode: 0o600 });
  cache.set(scope, { text: String(text), vars: parseEnv(text) });
}

/** Variables for agents in this scope ("local" or an SSH host id). */
export function envFor(scope) {
  getEnvText(scope);
  return cache.get(scope)?.vars ?? {};
}

/** `export K='v'; …` for a remote shell (values single-quoted). */
export function exportsFor(scope) {
  const vars = envFor(scope);
  return Object.entries(vars)
    .map(([k, v]) => `export ${k}='${String(v).replace(/'/g, `'\\''`)}';`)
    .join(" ");
}
