// Dev servers (Claude Desktop's preview: .claude/launch.json). The project
// says how to start its servers; WestCode starts one when the user asks,
// finds its port, and the preview pane shows it.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { join, resolve } from "node:path";
import { childEnv } from "./path.mjs";

const running = new Map(); // key → { proc, name, cwd, url, port, log: string[] }

/** The configurations in <cwd>/.claude/launch.json (VS Code-style). */
export function readLaunch(cwd) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(join(cwd, ".claude", "launch.json"), "utf8"));
  } catch (err) {
    return { ok: true, configs: [], missing: err.code === "ENOENT", error: err.code === "ENOENT" ? undefined : `launch.json: ${err.message}` };
  }
  const list = Array.isArray(raw?.configurations) ? raw.configurations : [];
  const configs = list
    .filter((c) => c && typeof c.name === "string" && (c.runtimeExecutable || c.program))
    .map((c) => ({
      name: String(c.name),
      runtimeExecutable: String(c.runtimeExecutable || "node"),
      runtimeArgs: Array.isArray(c.runtimeArgs) ? c.runtimeArgs.map(String) : [],
      program: c.program ? String(c.program) : undefined,
      args: Array.isArray(c.args) ? c.args.map(String) : [],
      port: Number(c.port) || undefined,
      url: typeof c.url === "string" ? c.url : undefined,
      cwd: typeof c.cwd === "string" ? c.cwd : undefined,
      env: c.env && typeof c.env === "object" ? Object.fromEntries(Object.entries(c.env).map(([k, v]) => [k, String(v)])) : {},
    }));
  return { ok: true, configs };
}

/** A URL a dev server printed (Vite, Next, CRA, Rails, Django…). */
export function portFromOutput(text) {
  const m = /(https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\]):(\d{2,5}))/.exec(String(text));
  return m ? Number(m[2]) : null;
}

function portOpen(port) {
  return new Promise((done) => {
    const s = createConnection({ port, host: "127.0.0.1" });
    s.once("connect", () => {
      s.destroy();
      done(true);
    });
    s.once("error", () => done(false));
  });
}

const keyOf = (cwd, name) => `${resolve(cwd)}::${name}`;

export function listRunning(cwd) {
  const base = resolve(cwd);
  return [...running.entries()]
    .filter(([k]) => k.startsWith(`${base}::`))
    .map(([, s]) => ({ name: s.name, url: s.url, port: s.port, log: s.log.slice(-40).join("") }));
}

/** Start a configuration; resolves once its port answers (or it exits). */
export async function startServer(cwd, name, { timeout = 90_000 } = {}) {
  const { configs } = readLaunch(cwd);
  const c = configs.find((x) => x.name === name);
  if (!c) return { ok: false, error: `No configuration "${name}" in .claude/launch.json.` };
  const key = keyOf(cwd, name);
  const already = running.get(key);
  if (already?.url) return { ok: true, url: already.url, port: already.port };
  const args = [...c.runtimeArgs, ...(c.program ? [c.program] : []), ...c.args];
  const dir = c.cwd ? resolve(cwd, c.cwd) : cwd;
  const proc = spawn(c.runtimeExecutable, args, {
    cwd: dir,
    env: { ...childEnv(), ...c.env, ...(c.port ? { PORT: String(c.port) } : {}), BROWSER: "none", FORCE_COLOR: "0" },
    detached: process.platform !== "win32",
  });
  const s = { proc, name, cwd, url: "", port: c.port || 0, log: [] };
  running.set(key, s);
  const onOut = (chunk) => {
    const t = chunk.toString("utf8");
    s.log.push(t);
    if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
    if (!s.port) s.port = portFromOutput(t) || 0;
  };
  proc.stdout.on("data", onOut);
  proc.stderr.on("data", onOut);
  let exited = null;
  proc.on("exit", (code) => {
    exited = code ?? -1;
    running.delete(key);
  });
  proc.on("error", (err) => {
    exited = -1;
    s.log.push(String(err.message));
    running.delete(key);
  });
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (exited !== null) return { ok: false, error: `It exited (${exited}). ${s.log.join("").trim().split("\n").slice(-3).join(" ")}` };
    if (s.port && (await portOpen(s.port))) {
      s.url = c.url || `http://localhost:${s.port}`;
      return { ok: true, url: s.url, port: s.port };
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return { ok: false, error: "The server did not open a port in time.", log: s.log.join("").slice(-2000) };
}

export function stopServer(cwd, name) {
  const key = keyOf(cwd, name);
  const s = running.get(key);
  if (!s) return { ok: true };
  running.delete(key);
  try {
    // The whole process group: npm → vite etc.
    if (process.platform !== "win32" && s.proc.pid) process.kill(-s.proc.pid, "SIGTERM");
    else s.proc.kill();
  } catch {
    try {
      s.proc.kill();
    } catch {
      /* gone */
    }
  }
  return { ok: true };
}

export function stopAllServers() {
  for (const [key, s] of running) {
    running.delete(key);
    try {
      if (process.platform !== "win32" && s.proc.pid) process.kill(-s.proc.pid, "SIGTERM");
      else s.proc.kill();
    } catch {
      /* gone */
    }
  }
}
