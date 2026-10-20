// SSH hosts: run a session's CLI on another machine (Claude Desktop's
// "SSH session"). The CLI, its tools, the files and its stored transcripts
// all stay on the remote; WestCode only carries the conversation.
//
// Grok and Codex speak ACP themselves, so their whole agent runs over
// `ssh host <cli> …`. Claude's ACP adapter needs Node 22 on the machine it
// runs on, which a server rarely has, so the adapter stays here and the
// Claude Code CLI it drives runs remotely through a small wrapper
// (CLAUDE_CODE_EXECUTABLE). The adapter reads stored transcripts from its
// config folder, so the one being opened is fetched into a per-host mirror.
import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";
import { askpassEnv } from "./askpass.mjs";

const westcodeHome = () => process.env.WESTCODE_HOME || join(homedir(), ".westcode");
const hostsFile = () => join(westcodeHome(), "ssh-hosts.json");

// Where CLIs usually live when a non-interactive ssh shell has a bare PATH.
const REMOTE_PATH =
  'PATH="$HOME/.local/bin:$HOME/.claude/local:$HOME/.grok/bin:$HOME/.npm-global/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"';

/** "ssh://<hostId>/abs/path" → {hostId, path}; anything else → null. */
export function parseRemoteCwd(cwd) {
  const m = /^ssh:\/\/([a-z0-9-]+)(\/.*)$/.exec(String(cwd || ""));
  return m ? { hostId: m[1], path: m[2] } : null;
}

/** Single-quote for a POSIX shell. */
export function q(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/** A host as stored, validated so nothing in it can become an ssh option. */
export function normalizeHost(h) {
  const host = String(h?.host || "").trim();
  if (!NAME_RE.test(host)) throw new Error("Host must be a name or address (letters, digits, . - _ :).");
  const user = String(h?.user || "").trim();
  if (user && !/^[A-Za-z0-9._-]+$/.test(user)) throw new Error("User may only contain letters, digits, . - _.");
  const port = h?.port ? Number(h.port) : undefined;
  if (port !== undefined && !(Number.isInteger(port) && port > 0 && port < 65536)) throw new Error("Port must be 1–65535.");
  const identityFile = String(h?.identityFile || "").trim() || undefined;
  if (identityFile && identityFile.startsWith("-")) throw new Error("Identity file must be a path.");
  const name = String(h?.name || "").trim() || (user ? `${user}@${host}` : host);
  const id = String(h?.id || "").trim() || slug(name);
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("Bad host id.");
  return { id, name, host, ...(user ? { user } : {}), ...(port ? { port } : {}), ...(identityFile ? { identityFile } : {}) };
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "host";
}

export function loadHosts() {
  try {
    const raw = JSON.parse(readFileSync(hostsFile(), "utf8"));
    return (Array.isArray(raw) ? raw : []).flatMap((h) => {
      try {
        return [normalizeHost(h)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

function writeHosts(list) {
  mkdirSync(westcodeHome(), { recursive: true });
  writeFileSync(hostsFile(), `${JSON.stringify(list, null, 2)}\n`);
}

export function saveHost(h) {
  const host = normalizeHost(h);
  const list = loadHosts().filter((x) => x.id !== host.id);
  writeHosts([...list, host]);
  return host;
}

export function removeHost(id) {
  writeHosts(loadHosts().filter((x) => x.id !== id));
}

export function getHost(id) {
  return loadHosts().find((h) => h.id === id) || null;
}

/** Hosts named in ~/.ssh/config (no wildcards), for one-click import. */
export function parseSshConfig(text) {
  const out = [];
  let cur = null;
  for (const raw of String(text || "").split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const m = line.match(/^(\S+)\s*=?\s*(.+)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim().replace(/^"(.*)"$/, "$1");
    if (key === "host") {
      cur = null;
      for (const alias of val.split(/\s+/)) {
        if (/[*?!]/.test(alias)) continue;
        cur = { alias, host: alias };
        out.push(cur);
        break;
      }
    } else if (key === "match") {
      cur = null;
    } else if (cur) {
      if (key === "hostname") cur.hostName = val;
      if (key === "user") cur.user = val;
      if (key === "port") cur.port = Number(val) || undefined;
      if (key === "identityfile") cur.identityFile = val;
    }
  }
  // The alias is what ssh resolves (it applies the config), so keep it as
  // the host; HostName is shown for reference only.
  return out.map((c) => ({ name: c.alias, host: c.alias, hostName: c.hostName, user: c.user, port: c.port, identityFile: c.identityFile }));
}

export function sshConfigHosts() {
  try {
    return parseSshConfig(readFileSync(join(homedir(), ".ssh", "config"), "utf8"));
  } catch {
    return [];
  }
}

/**
 * One shared connection per host (ssh ControlMaster): listing, probing and
 * every turn reuse it instead of logging in again each time.
 */
export function controlDir() {
  const d = join(westcodeHome(), "ssh");
  mkdirSync(d, { recursive: true, mode: 0o700 });
  return d;
}
const muxArgs = () => ["-o", "ControlMaster=auto", "-o", `ControlPath=${join(controlDir(), "%C")}`, "-o", "ControlPersist=600"];

/**
 * ssh arguments up to (and including) the destination. Passwords, one-time
 * codes and host-key questions go to the app through SSH_ASKPASS (sshEnv).
 */
export function sshArgs(h) {
  const args = ["-T", "-o", "ConnectTimeout=30", "-o", "ServerAliveInterval=30", "-o", "ServerAliveCountMax=4", "-o", "NumberOfPasswordPrompts=2", ...muxArgs()];
  if (h.port) args.push("-p", String(h.port));
  if (h.identityFile) args.push("-i", h.identityFile.replace(/^~(?=\/)/, homedir()));
  args.push("--", h.user ? `${h.user}@${h.host}` : h.host);
  return args;
}

/** The remote command line: one POSIX `sh -c` so the login shell (zsh, fish) does not matter. */
export function remoteShell(cmd) {
  return `sh -c ${q(`${REMOTE_PATH}; ${cmd}`)}`;
}

/** Env for an ssh process: prompts are answered by the app. */
export function sshEnv(h, base = process.env) {
  return { ...base, ...askpassEnv(h.id) };
}

/** Run one command on the host. */
export function runRemote(h, cmd, { timeout = 30_000, binary = false } = {}) {
  return new Promise((resolve) => {
    const proc = spawn("ssh", [...sshArgs(h), remoteShell(cmd)], { stdio: ["ignore", "pipe", "pipe"], env: sshEnv(h) });
    const out = [];
    let err = "";
    const timer = setTimeout(() => {
      proc.kill();
      err += `\nTimed out after ${Math.round(timeout / 1000)}s.`;
    }, timeout);
    proc.stdout.on("data", (c) => out.push(c));
    proc.stderr.on("data", (c) => (err = (err + c.toString("utf8")).slice(-4000)));
    proc.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout: binary ? Buffer.alloc(0) : "", stderr: e.message });
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      const buf = Buffer.concat(out);
      resolve({ code: code ?? -1, stdout: binary ? buf : buf.toString("utf8"), stderr: err.trim() });
    });
  });
}

/** Can we reach the host, and which CLIs does it have? */
export async function probeHost(h) {
  const script = [
    'printf "home=%s\\n" "$HOME"',
    'printf "os=%s\\n" "$(uname -sm)"',
    'for b in claude grok codex git node; do p=$(command -v $b 2>/dev/null); printf "%s=%s\\n" "$b" "$p"; done',
    'printf "claude_version=%s\\n" "$(claude --version 2>/dev/null | head -n1)"',
    'printf "grok_version=%s\\n" "$(grok --version 2>/dev/null | head -n1)"',
  ].join("; ");
  const r = await runRemote(h, script, { timeout: 25_000 });
  if (r.code !== 0) return { ok: false, error: sshError(r) };
  const kv = Object.fromEntries(
    r.stdout
      .split("\n")
      .map((l) => l.match(/^([a-z_]+)=(.*)$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].trim()]),
  );
  return {
    ok: true,
    home: kv.home || "",
    os: kv.os || "",
    clis: {
      claude: kv.claude ? { path: kv.claude, version: kv.claude_version || "" } : null,
      grok: kv.grok ? { path: kv.grok, version: kv.grok_version || "" } : null,
      codex: kv.codex ? { path: kv.codex } : null,
    },
    git: Boolean(kv.git),
  };
}

export function sshError(r) {
  const s = (r.stderr || "").trim();
  if (/Permission denied/i.test(s)) return "SSH refused the login (Permission denied). Add your key to the host, or set the identity file.";
  if (/Could not resolve hostname/i.test(s)) return "That host name does not resolve.";
  if (/Connection refused/i.test(s)) return "The host refused the connection — is SSH running on that port?";
  if (/timed out|Operation timed out/i.test(s)) return "The host did not answer in time.";
  if (/Host key verification failed/i.test(s)) return "Host key verification failed. Connect once with ssh in a terminal to accept the host key.";
  return s.split("\n").slice(-2).join(" ") || `ssh exited ${r.code}`;
}

// ------------------------------------------------------------------ Claude on a host

/** Per-host local folders: the adapter's config mirror and the path mirror. */
export function hostDirs(h) {
  const root = join(westcodeHome(), "remote", h.id);
  return { root, claudeConfig: join(root, "claude"), fsRoot: join(root, "fs") };
}

/**
 * The adapter spawns Claude Code with cwd = a local stand-in for the remote
 * folder (it must exist here); the wrapper turns it back into the remote path.
 */
export function localStandIn(h, remoteCwd) {
  const { fsRoot } = hostDirs(h);
  const p = join(fsRoot, String(remoteCwd || "/").replace(/^\/*/, ""));
  mkdirSync(p, { recursive: true });
  return p;
}

const WRAPPER = `#!/bin/sh
# WestCode: run Claude Code on an SSH host. The Claude ACP adapter starts
# this in place of the claude binary; everything after it runs remotely.
root="$WESTCODE_FS_ROOT"
dir="$PWD"
case "$dir" in "$root"*) dir="\${dir#"$root"}" ;; esac
[ -n "$dir" ] || dir=/
q() { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\\\\\''/g")"; }
cmd="${REMOTE_PATH.replace(/["$]/g, (c) => `\\${c}`)}; $WESTCODE_REMOTE_EXPORTS cd $(q "$dir") || exit 1; exec claude"
for a in "$@"; do cmd="$cmd $(q "$a")"; done
set -- -T -o ConnectTimeout=30 -o ServerAliveInterval=30 -o ServerAliveCountMax=4 -o NumberOfPasswordPrompts=2
[ -n "$WESTCODE_SSH_CONTROL" ] && set -- "$@" -o ControlMaster=auto -o "ControlPath=$WESTCODE_SSH_CONTROL/%C" -o ControlPersist=600
[ -n "$WESTCODE_SSH_PORT" ] && set -- "$@" -p "$WESTCODE_SSH_PORT"
[ -n "$WESTCODE_SSH_KEY" ] && set -- "$@" -i "$WESTCODE_SSH_KEY"
exec ssh "$@" -- "$WESTCODE_SSH_TARGET" "sh -c $(q "$cmd")"
`;

export function claudeWrapperPath() {
  const p = join(westcodeHome(), "bin", "claude-over-ssh");
  let cur = "";
  try {
    cur = readFileSync(p, "utf8");
  } catch {
    /* first use */
  }
  if (cur !== WRAPPER) {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, WRAPPER);
  }
  chmodSync(p, 0o755);
  return p;
}

/** Env for the local Claude adapter so its Claude Code runs on the host. */
export function claudeRemoteEnv(h) {
  const { claudeConfig, fsRoot } = hostDirs(h);
  mkdirSync(join(claudeConfig, "projects"), { recursive: true });
  return {
    CLAUDE_CODE_EXECUTABLE: claudeWrapperPath(),
    CLAUDE_CONFIG_DIR: claudeConfig,
    WESTCODE_FS_ROOT: fsRoot,
    WESTCODE_SSH_CONTROL: controlDir(),
    ...askpassEnv(h.id),
    WESTCODE_SSH_TARGET: h.user ? `${h.user}@${h.host}` : h.host,
    ...(h.port ? { WESTCODE_SSH_PORT: String(h.port) } : {}),
    ...(h.identityFile ? { WESTCODE_SSH_KEY: h.identityFile.replace(/^~(?=\/)/, homedir()) } : {}),
  };
}

// Newest transcripts first; per file: path, mtime, the first cwd and the
// latest title. Only ls/head/tail/grep — nothing to install on the host.
// Project folders start with "-", hence the "--".
export function claudeListScript(limit = 60) {
  return [
    'cd "$HOME/.claude/projects" 2>/dev/null || exit 0',
    `ls -t -- */*.jsonl 2>/dev/null | head -n ${Number(limit) || 60} | while IFS= read -r f; do`,
    '  m=$(stat -c %Y -- "$f" 2>/dev/null || stat -f %m -- "$f" 2>/dev/null)',
    `  c=$(head -n 60 -- "$f" | grep -m1 -E -o '"cwd":"([^"\\\\]|\\\\.)*"')`,
    `  t=$(tail -n 600 -- "$f" | grep -E -o '"(customTitle|aiTitle|summary)":"([^"\\\\]|\\\\.)*"' | tail -n 1)`,
    `  printf '%s\\t%s\\t%s\\t%s\\n' "$f" "$m" "$c" "$t"`,
    "done",
  ].join("\n");
}

function jsonString(fragment) {
  // fragment is `"key":"value"`; value keeps JSON escapes.
  const m = String(fragment || "").match(/^"[^"]+":(".*")$/);
  if (!m) return "";
  try {
    return JSON.parse(m[1]);
  } catch {
    return m[1].slice(1, -1);
  }
}

export function parseClaudeList(stdout, hostId) {
  return String(stdout || "")
    .split("\n")
    .map((line) => line.split("\t"))
    .filter((p) => p.length >= 2 && p[0].endsWith(".jsonl"))
    .map(([path, mtime, cwd, title]) => ({
      providerId: "claude",
      hostId,
      agentSessionId: path.split("/").pop().replace(/\.jsonl$/, ""),
      transcript: path,
      cwd: jsonString(cwd),
      title: jsonString(title).trim(),
      updatedAt: (Number(mtime) || 0) * 1000,
    }))
    .filter((s) => /^[0-9a-f-]{8,}$/i.test(s.agentSessionId) && s.cwd);
}

export async function listRemoteClaude(h, limit) {
  const r = await runRemote(h, claudeListScript(limit), { timeout: 40_000 });
  if (r.code !== 0) return { ok: false, output: sshError(r), sessions: [] };
  return { ok: true, sessions: parseClaudeList(r.stdout, h.id) };
}

/**
 * Copy one stored Claude transcript from the host into the adapter's mirror,
 * so session/load can replay it. Found by id, in whichever project folder.
 */
export async function fetchClaudeTranscript(h, sessionId) {
  if (!/^[0-9a-f-]{8,}$/i.test(sessionId)) throw new Error("Bad session id.");
  const r = await runRemote(
    h,
    `cd "$HOME/.claude/projects" 2>/dev/null || exit 3; f=$(ls -- */${sessionId}.jsonl 2>/dev/null | head -n 1); [ -n "$f" ] || exit 4; printf '%s\\n' "$f" >&2; gzip -c -- "$f"`,
    { timeout: 180_000, binary: true },
  );
  if (r.code === 4 || r.code === 3) throw new Error("That conversation is not stored on the host any more.");
  if (r.code !== 0) throw new Error(sshError(r));
  const rel = r.stderr.split("\n").map((l) => l.trim()).filter((l) => l.endsWith(".jsonl")).pop();
  if (!rel || rel.includes("..")) throw new Error("Unexpected transcript path from the host.");
  const dest = join(hostDirs(h).claudeConfig, "projects", rel);
  const body = gunzipSync(r.stdout);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, body);
  // The adapter knows the session by the local stand-in folder, so the
  // transcript is also kept under that folder's project name.
  const cwd = /"cwd":"((?:[^"\\]|\\.)*)"/.exec(body.subarray(0, 200_000).toString("utf8"))?.[1];
  if (cwd) {
    const standIn = localStandIn(h, JSON.parse(`"${cwd}"`));
    const alt = join(hostDirs(h).claudeConfig, "projects", claudeProjectName(standIn), `${sessionId}.jsonl`);
    if (alt !== dest) {
      mkdirSync(dirname(alt), { recursive: true });
      writeFileSync(alt, body);
    }
  }
  return dest;
}

/** Claude Code's project folder name for a working directory. */
export function claudeProjectName(cwd) {
  return String(cwd).replace(/[^a-zA-Z0-9]/g, "-");
}

/** Fetch the transcript only if the mirror does not have it yet. */
export async function ensureClaudeTranscript(h, sessionId) {
  const projects = join(hostDirs(h).claudeConfig, "projects");
  try {
    const { readdirSync } = await import("node:fs");
    for (const d of readdirSync(projects)) {
      if (existsSync(join(projects, d, `${sessionId}.jsonl`))) return;
    }
  } catch {
    /* no mirror yet */
  }
  try {
    await fetchClaudeTranscript(h, sessionId);
  } catch {
    /* a session started from this app has no transcript before its first turn */
  }
}

// ------------------------------------------------------------------ ACP CLIs on a host

/** spawn() spec for a CLI that speaks ACP itself, run entirely on the host. */
export function remoteAcpSpawn(h, remoteCwd, cliCommand) {
  const cmd = `cd ${remoteCwd ? q(remoteCwd) : '"$HOME"'} || exit 1; exec ${cliCommand}`;
  return { command: "ssh", args: [...sshArgs(h), remoteShell(cmd)] };
}

export function hasSsh() {
  return ["/usr/bin/ssh", "/bin/ssh", "/usr/local/bin/ssh", "/opt/homebrew/bin/ssh"].some((p) => existsSync(p));
}
