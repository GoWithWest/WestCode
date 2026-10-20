import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { childEnv, which } from "./path.mjs";
import { deskDir } from "./desk-paths.mjs";
import { TRANSCRIPT_EVENTS, contentDiffs, mapUpdate, modelsFrom } from "./acp-map.mjs";
import { cliHasWestcreate, sessionServer } from "./westcreate.mjs";
import { envFor, exportsFor } from "./session-env.mjs";
import {
  claudeRemoteEnv,
  getHost,
  listRemoteClaude,
  localStandIn,
  q,
  remoteAcpSpawn,
  sshEnv,
} from "./ssh.mjs";

const here = dirname(fileURLToPath(import.meta.url));
let deskUrl = "";

export function setDeskUrl(url) {
  deskUrl = url || "";
}

function deskMcp(sessionId, providerId) {
  const nodeBin = which("node") || process.execPath;
  const env = [
    { name: "WESTCODE_FROM_SESSION", value: sessionId },
    { name: "WESTCODE_DESK_DIR", value: deskDir() },
  ];
  if (deskUrl) env.push({ name: "WESTCODE_DESK_URL", value: deskUrl });
  if (nodeBin === process.execPath) {
    env.push({ name: "ELECTRON_RUN_AS_NODE", value: "1" });
  }
  const servers = [
    {
      type: "stdio",
      name: "westcode",
      command: nodeBin,
      args: [join(here, "desk-mcp.mjs")],
      env,
    },
  ];
  // WestCreate's bridge, so every session can drive it — unless this CLI
  // already registered it itself (one server per name).
  if (!cliHasWestcreate(providerId)) {
    const wc = sessionServer(which("node"), process.execPath);
    if (wc) servers.push(wc);
  }
  return servers;
}

/** The learning reviewer's only extra tools: read skills/memory, propose. */
function learnMcp(sessionId, opts) {
  if (opts.judge) return [];
  const nodeBin = which("node") || process.execPath;
  const env = [
    { name: "WESTCODE_LEARN_SESSION", value: String(opts.origin || sessionId) },
    { name: "WESTCODE_LEARN_MEMORY", value: opts.doMemory ? "1" : "0" },
    { name: "WESTCODE_LEARN_SKILLS", value: opts.doSkill === false ? "0" : "1" },
  ];
  for (const k of ["WESTCODE_HOME", "WESTCODE_USER_HOME"]) {
    if (process.env[k]) env.push({ name: k, value: process.env[k] });
  }
  if (nodeBin === process.execPath) env.push({ name: "ELECTRON_RUN_AS_NODE", value: "1" });
  return [{ type: "stdio", name: "westcode-learn", command: nodeBin, args: [join(here, "learn-mcp.mjs")], env }];
}

function expandHome(p) {
  if (!p) return process.cwd();
  if (p.startsWith("~/")) return `${homedir()}${p.slice(1)}`;
  return p;
}

function npmCacheEnv(env) {
  return {
    ...env,
    npm_config_cache: join(homedir(), ".westcode", "npm-cache"),
  };
}

export function mapModel(providerId, label) {
  const raw = String(label || "").trim();
  const t = raw.toLowerCase();
  // An id the CLI itself reported (or a full model name) goes through as is:
  // only friendly labels are mapped. Otherwise picking "Grok 4.7" from the
  // live list would silently run grok-4.6.
  if (providerId === "grok" && /^grok-[\w.-]+$/.test(t)) return t;
  if (providerId === "claude" && /^(default|opus|sonnet|haiku|fable|best|opusplan)(\[1m\])?$|^claude-[\w.-]+(\[1m\])?$/.test(t)) return t;
  if (providerId === "codex" && /^(gpt|o\d|codex)[\w.-]*$/.test(t)) return t;
  if (providerId === "grok") {
    if (t.includes("4.5") || t === "grok-4.5") return "grok-4.5";
    if (t.includes("4.6") || t === "grok-4.6" || t.includes("grok")) return "grok-4.6";
    return t || "grok-4.6";
  }
  if (providerId === "claude") {
    if (t.includes("haiku")) return "haiku";
    if (t.includes("sonnet")) return "sonnet";
    if (t.includes("opus") || t.includes("fable")) return "opus";
    return t || "sonnet";
  }
  if (providerId === "codex") {
    if (t.includes("mini")) return "gpt-5.4-mini";
    if (t.includes("codex") && !t.includes("mini")) return "gpt-5.4-codex";
    if (t.includes("5.3")) return "gpt-5.3-codex";
    return t || "gpt-5.4";
  }
  return t;
}

export function mapEffort(providerId, label) {
  const t = String(label || "").toLowerCase().trim();
  if (!t) return providerId === "grok" ? "high" : "medium";
  if (t === "extra" || t === "extra high" || t === "xhigh") return "xhigh";
  if (t === "supercode" || t === "ultracode" || t === "max") {
    return providerId === "claude" ? t : "xhigh";
  }
  if (t === "minimal" || t === "low" || t === "medium" || t === "high") return t;
  return t;
}

function permissionFlag(providerId, mode) {
  const t = String(mode || "ask").toLowerCase();
  if (t === "plan") return "plan";
  if (t === "bypass") return "bypassPermissions";
  if (t === "auto") return providerId === "claude" ? "acceptEdits" : "auto";
  return "default";
}

/**
 * The ACP adapters, pinned to versions WestCode was tested with. Unpinned,
 * `npx -y` keeps whatever version it first cached in ~/.westcode/npm-cache
 * forever (users were stuck on claude-agent-acp 0.49 while 0.93 shipped
 * steering, prompt suggestions and many fixes). A WestCode release bumps
 * these.
 */
export const ADAPTERS = {
  claude: "@agentclientprotocol/claude-agent-acp@0.93.0",
  codex: "@agentclientprotocol/codex-acp@2.2.2",
};

function spawnSpec(providerId, model, effort, opts = {}) {
  // Settings → Environment variables for this Mac (a host's are exported there).
  const env = opts.remote ? childEnv() : { ...childEnv(), ...envFor("local") };
  const modelId = mapModel(providerId, model);
  const effortId = mapEffort(providerId, effort);
  const perm = permissionFlag(providerId, opts.permissionMode);
  if (opts.remote) return remoteSpawnSpec(providerId, modelId, effortId, perm, opts, env);

  if (providerId === "grok") {
    const bin = which("grok", env);
    if (!bin) {
      throw new Error(
        "Grok CLI not found. Run: curl -fsSL https://x.ai/cli/install.sh | bash",
      );
    }
    const args = ["--no-auto-update", "--permission-mode", perm];
    if (perm === "bypassPermissions") args.push("--always-approve");
    if (opts.unsandboxed) args.push("--sandbox", "none");
    args.push("agent");
    if (perm === "bypassPermissions") args.push("--always-approve");
    args.push("-m", modelId, "--reasoning-effort", effortId, "stdio");
    return { command: bin, args, env };
  }

  if (providerId === "claude") {
    const claude = which("claude", env);
    const npx = which("npx", env);
    if (!claude) {
      throw new Error(
        "Claude Code CLI not found. Run: curl -fsSL https://claude.ai/install.sh | bash",
      );
    }
    if (!npx) {
      throw new Error(
        "npx is required to host Claude Code over ACP. Install Node, then retry.",
      );
    }
    return {
      command: npx,
      args: ["-y", ADAPTERS.claude],
      env: {
        ...npmCacheEnv(env),
        CLAUDE_CODE_PATH: claude,
        CLAUDE_CODE_MODEL: modelId,
        CLAUDE_CODE_PERMISSION_MODE: perm,
      },
    };
  }

  if (providerId === "codex") {
    const codex = which("codex", env);
    const npx = which("npx", env);
    if (!codex && !npx) {
      throw new Error(
        "Codex CLI not found. Run: npm i -g @openai/codex   or   brew install --cask codex",
      );
    }
    if (npx) {
      return {
        command: npx,
        args: ["-y", ADAPTERS.codex],
        env: {
          ...npmCacheEnv(env),
          ...(codex ? { CODEX_PATH: codex } : {}),
        },
      };
    }
    return { command: codex, args: ["acp"], env };
  }

  throw new Error(`Unknown provider: ${providerId}`);
}

/**
 * The same agents on an SSH host. Grok and Codex run whole over ssh. Claude's
 * adapter stays local (it needs Node 22) and drives the host's Claude Code
 * through the ssh wrapper; see ssh.mjs.
 */
function remoteSpawnSpec(providerId, modelId, effortId, perm, opts, env) {
  const h = opts.remote;
  if (providerId === "grok") {
    const flags = ["--no-auto-update", "--permission-mode", perm];
    if (perm === "bypassPermissions") flags.push("--always-approve");
    if (opts.unsandboxed) flags.push("--sandbox", "none");
    flags.push("agent");
    if (perm === "bypassPermissions") flags.push("--always-approve");
    flags.push("-m", modelId, "--reasoning-effort", effortId, "stdio");
    const cmd = `${exportsFor(h.id)} grok ${flags.map(q).join(" ")}`;
    return { ...remoteAcpSpawn(h, opts.remoteCwd, cmd), env: sshEnv(h, env) };
  }
  if (providerId === "codex") {
    const cmd = `if command -v npx >/dev/null 2>&1; then exec npx -y ${ADAPTERS.codex}; else exec codex acp; fi`;
    return { ...remoteAcpSpawn(h, opts.remoteCwd, `${exportsFor(h.id)} sh -c ${q(cmd)}`), env: sshEnv(h, env) };
  }
  if (providerId === "claude") {
    const npx = which("npx", env);
    if (!npx) {
      throw new Error("npx is required on this Mac to host Claude Code over ACP. Install Node, then retry.");
    }
    return {
      command: npx,
      args: ["-y", ADAPTERS.claude],
      env: {
        ...npmCacheEnv(env),
        ...claudeRemoteEnv(h),
        WESTCODE_REMOTE_EXPORTS: exportsFor(h.id),
        CLAUDE_CODE_MODEL: modelId,
        CLAUDE_CODE_PERMISSION_MODE: perm,
      },
    };
  }
  throw new Error(`${providerId} cannot run on an SSH host.`);
}

class AcpSession {
  constructor(id, providerId, cwd, model, effort, permissionMode, emit) {
    this.id = id;
    this.providerId = providerId;
    this.cwd = expandHome(cwd);
    this.model = model;
    this.effort = effort;
    this.permissionMode = permissionMode || "ask";
    this.hasDesk = true;
    this.resumeId = null;
    this.resumed = false;
    this.replayed = false;
    this.emit = emit;
    this.proc = null;
    this.buf = Buffer.alloc(0);
    this.nextRpc = 1;
    this.pending = new Map();
    this.agentSessionId = null;
    this.ready = null;
    this.stderr = "";
    this.dead = false;
    this.stopped = false;
    this.unsandboxed = false;
    /** Transcript replayed by session/load, drained once by session:open. */
    this.replay = [];
    this.capturing = false;
    /**
     * Reading stored history: no desk MCP to register (this session is not
     * on the desk), and a failed load must not become a blank new session.
     */
    this.readOnly = false;
    /** Learning reviewer: {doMemory, doSkill, origin}; reads and proposes only. */
    this.reviewer = null;
    /** SSH host this session runs on (ssh.mjs), or null for this Mac. */
    this.remote = null;
  }

  takeReplay() {
    const out = this.replay;
    this.replay = [];
    return out;
  }

  start() {
    if (this.ready) return this.ready;
    this.ready = this._start();
    return this.ready;
  }

  async _start() {
    try {
      return await this._boot();
    } catch (err) {
      if (
        this.providerId === "grok" &&
        !this.unsandboxed &&
        !this.stopped &&
        /sandbox/i.test(err.message)
      ) {
        this.unsandboxed = true;
        this.dead = false;
        try {
          this.proc?.kill();
        } catch {
          /* already gone */
        }
        this.proc = null;
        this.buf = Buffer.alloc(0);
        this.stderr = "";
        this.pending.clear();
        try {
          return await this._boot();
        } catch (retryErr) {
          this.dead = true;
          try {
            this.proc?.kill();
          } catch {
            /* already gone */
          }
          throw retryErr;
        }
      }
      // A failed boot (spawn error, missing folder, initialize timeout)
      // must not leave a half-alive session that ensureSession would
      // reuse — mark it dead and reap the child so the next prompt
      // spawns fresh.
      this.dead = true;
      try {
        this.proc?.kill();
      } catch {
        /* already gone */
      }
      throw err;
    }
  }

  async _boot() {
    const spec = spawnSpec(this.providerId, this.model, this.effort, {
      unsandboxed: this.unsandboxed,
      permissionMode: this.permissionMode,
      remote: this.remote,
      remoteCwd: this.cwd,
    });
    // On a host the folder is the host's; locally the process starts in a
    // stand-in (Claude's adapter needs an existing cwd) or in the home folder.
    const spawnCwd = this.remote
      ? this.providerId === "claude"
        ? localStandIn(this.remote, this.cwd)
        : homedir()
      : this.cwd;
    if (!this.remote && !existsSync(this.cwd)) {
      this.dead = true;
      throw new Error(
        `Folder ${this.cwd} no longer exists — pick another folder for this session.`,
      );
    }
    this.proc = spawn(spec.command, spec.args, {
      cwd: spawnCwd,
      env: spec.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    // Handlers are scoped to THIS spawn — a late event from a replaced
    // child (e.g. the pre-retry process finally exiting after kill())
    // must not poison the current one's state or pendings.
    const proc = this.proc;
    proc.on("error", (err) => {
      if (this.proc !== proc) return;
      this.dead = true;
      const wrapped = new Error(`Agent failed to start: ${err.message}`);
      for (const [, p] of this.pending) p.reject(wrapped);
      this.pending.clear();
      if (!this.stopped) this.emit({ type: "error", message: wrapped.message });
    });
    proc.stdout.on("data", (chunk) => {
      if (this.proc !== proc) return;
      this._onStdout(chunk);
    });
    proc.stderr.on("data", (chunk) => {
      if (this.proc !== proc) return;
      this.stderr = (this.stderr + chunk.toString("utf8")).slice(-12_000);
    });
    proc.on("exit", (code, signal) => {
      if (this.proc !== proc) return;
      this.dead = true;
      const err = new Error(
        `Agent exited (${code ?? signal ?? "?"}). ${this.stderr.trim()}`.trim(),
      );
      for (const [, p] of this.pending) p.reject(err);
      this.pending.clear();
      const retrying =
        this.providerId === "grok" &&
        !this.unsandboxed &&
        /sandbox/i.test(this.stderr);
      if (!this.stopped && !retrying) {
        this.emit({ type: "error", message: err.message });
      }
    });

    const init = await this.rpc("initialize", {
      protocolVersion: 1,
      clientInfo: { name: "westcode", title: "WestCode", version: "1.0.0" },
      clientCapabilities: {
        // On an SSH host the files are the host's: the agent reads and writes
        // them itself, never through this Mac.
        fs: this.remote ? { readTextFile: false, writeTextFile: false } : { readTextFile: true, writeTextFile: true },
        terminal: false,
        // Claude's adapter sends its task plan, predicted next prompt and
        // background-task updates only to clients that declare the
        // (JetBrains) AIR extension. Version 1 with asyncTasks only: no
        // other optional AIR behaviour is requested. Other agents ignore it.
        _meta: { jetbrains: { air: { version: 1, capabilities: ["asyncTasks"] } } },
      },
    });

    await this._authenticate(init);
    // Claude's adapter can take a message into the running turn.
    this.canSteer = Boolean(init?._meta?.steering?.supported);
    if (this.canSteer) this.emit({ type: "caps", steering: true });

    // A history read needs no tools and must not join the desk bus.
    // Local MCP servers are commands on this Mac; a CLI on a host cannot
    // start them, so a remote session gets none.
    const mcpServers = this.remote
      ? []
      : this.reviewer
        ? learnMcp(this.id, this.reviewer)
        : this.readOnly
          ? []
          : deskMcp(this.id, this.providerId);
    const resumeId = this.resumeId;
    if (resumeId) {
      // session/load replays the whole transcript as session/update
      // notifications; session/resume restores the agent's context silently.
      // Prefer load when the agent advertises it, so opening a session the
      // user started in the terminal actually shows its history.
      const caps = init?.agentCapabilities || init?.agent_capabilities || {};
      const order = caps.loadSession
        ? ["session/load", "session/resume"]
        : ["session/resume", "session/load"];
      let loadError = null;
      for (const method of order) {
        this.replay = [];
        this.capturing = true;
        try {
          const loaded = await this.rpc(method, {
            sessionId: resumeId,
            cwd: this.cwd,
            mcpServers,
          });
          this.agentSessionId =
            loaded?.sessionId || loaded?.session_id || resumeId;
          this.resumed = true;
          this._emitModels(init, loaded);
          this.emit({ type: "ready", agentSessionId: this.agentSessionId });
          return this.agentSessionId;
        } catch (err) {
          loadError = err;
          this.replay = [];
          /* try next / fall through */
        } finally {
          this.capturing = false;
        }
      }
      // Opening a stored session must not quietly become a blank new one —
      // the user asked for THAT conversation. Prompting may still fall
      // through to session/new, which is how a dead agent recovers.
      if (this.readOnly) {
        this.dead = true;
        throw new Error(
          `Could not reopen session ${resumeId}: ${loadError?.message || "the agent refused to load it"}`,
        );
      }
    }

    const created = await this.rpc("session/new", {
      cwd: this.cwd,
      mcpServers,
    });
    this.agentSessionId = created?.sessionId || created?.session_id || this.id;
    this.resumed = false;

    this._emitModels(init, created);
    this.emit({ type: "ready", agentSessionId: this.agentSessionId });
    return this.agentSessionId;
  }

  async _authenticate(init) {
    const methods = init?.authMethods || init?.auth_methods || [];
    if (!methods.length) return;
    const ids = new Set(methods.map((m) => m.id));
    const preferred = init?._meta?.defaultAuthMethodId;
    const methodId =
      (preferred && ids.has(preferred) && preferred) ||
      (ids.has("cached_token") && "cached_token") ||
      methods[0]?.id;
    if (!methodId) return;
    try {
      await this.rpc("authenticate", {
        methodId,
        _meta: { headless: true },
      });
    } catch (err) {
      if (/already|authenticated|logged in/i.test(err.message)) return;
      // A host's CLI signs in on the host; this Mac's login state is not it.
      if (this.remote) return;
      throw new Error(
        `Could not authenticate ${this.providerId}. Run login from Connections. ${err.message}`,
      );
    }
  }

  _emitModels(init, session) {
    const models = modelsFrom(init, session);
    if (!models.length) return;
    this.emit({ type: "models", models });
  }

  async prompt(text, history = []) {
    await this.start();
    if (this.dead) throw new Error("Agent process is not running.");
    let body = text;
    if (!this.resumed && !this.replayed && history.length) {
      this.replayed = true;
      body = `${formatRestoredHistory(history)}\n\n${text}`;
    }
    return this.rpc("session/prompt", {
      sessionId: this.agentSessionId,
      prompt: [{ type: "text", text: body }],
    });
  }

  /** Inject a message into the running turn (only when the agent supports it). */
  steer(text) {
    if (!this.canSteer || !this.agentSessionId || this.dead) return Promise.resolve({ ok: false });
    return this.rpc("_session/steering", {
      sessionId: this.agentSessionId,
      prompt: [{ type: "text", text }],
    }).then(
      () => ({ ok: true }),
      (err) => ({ ok: false, error: err.message }),
    );
  }

  stopTask(asyncTaskId) {
    if (!this.agentSessionId || this.dead) return Promise.resolve({ ok: false });
    return this.rpc("_session/async_task/stop", { sessionId: this.agentSessionId, asyncTaskId }).then(
      () => ({ ok: true }),
      (err) => ({ ok: false, error: err.message }),
    );
  }

  cancel() {
    if (!this.agentSessionId || this.dead) return;
    this.notify("session/cancel", { sessionId: this.agentSessionId });
  }

  stop() {
    this.stopped = true;
    this.cancel();
    if (this.proc && !this.dead) {
      try {
        this.proc.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    }
    this.dead = true;
  }

  /** Agent stderr is ANSI-coloured and repeats itself; keep it readable. */
  _why() {
    const lines = [
      ...new Set(
        this.stderr
          // eslint-disable-next-line no-control-regex
          .replace(/\u001b\[[0-9;]*m/g, "")
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
      ),
    ];
    const auth = lines.find((l) => /AuthRequired|invalid_token|Unauthorized/i.test(l));
    if (auth) {
      const server = /resource_metadata=\\?"?https?:\/\/([^/"\\]+)/i.exec(auth)?.[1];
      return `an MCP server${server ? ` (${server})` : ""} is not authenticated — sign it in or remove it from this CLI`;
    }
    return lines.slice(-1).join(" ").slice(0, 300);
  }

  rpc(method, params) {
    const id = this.nextRpc++;
    // Starting an adapter (npx) can take well over 20 s on a busy Mac, and a
    // long transcript takes a while to replay: reading history gets the
    // same start-up time as a session, and longer for the load itself.
    const timeout =
      method === "session/prompt"
        ? 15 * 60_000
        : method === "initialize" || method === "authenticate"
          ? 60_000
          : this.readOnly && (method === "session/load" || method === "session/resume")
            ? 90_000
            : this.readOnly
              ? 20_000
              : 25_000;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        const why = this._why();
        reject(new Error(`Timed out on ${method}${why ? `: ${why}` : ""}`));
      }, timeout);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.write({ jsonrpc: "2.0", id, method, params });
    });
  }

  notify(method, params) {
    this.write({ jsonrpc: "2.0", method, params });
  }

  write(obj) {
    if (!this.proc?.stdin || this.dead) return;
    this.proc.stdin.write(`${JSON.stringify(obj)}\n`);
  }

  reply(id, result) {
    this.write({ jsonrpc: "2.0", id, result });
  }

  _onStdout(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    while (true) {
      const msg = this._pop();
      if (!msg) break;
      this._handle(msg);
    }
  }

  _pop() {
    const header = this.buf.indexOf(Buffer.from("Content-Length:"));
    if (header >= 0) {
      const sepCrlf = this.buf.indexOf(Buffer.from("\r\n\r\n"), header);
      const sepLf = this.buf.indexOf(Buffer.from("\n\n"), header);
      const sep = sepCrlf >= 0 ? sepCrlf : sepLf;
      if (sep < 0) return null;
      const head = this.buf.slice(header, sep).toString("utf8");
      const len = Number((/Content-Length:\s*(\d+)/i.exec(head) || [])[1] || 0);
      const start = sep + (sepCrlf >= 0 ? 4 : 2);
      if (this.buf.length < start + len) return null;
      const payload = this.buf.slice(start, start + len);
      this.buf = this.buf.slice(start + len);
      try {
        return JSON.parse(payload.toString("utf8"));
      } catch {
        return null;
      }
    }
    const nl = this.buf.indexOf(0x0a);
    if (nl < 0) return null;
    const line = this.buf
      .slice(0, nl)
      .toString("utf8")
      .replace(/\r$/, "")
      .trim();
    this.buf = this.buf.slice(nl + 1);
    if (!line) return this._pop();
    try {
      return JSON.parse(line);
    } catch {
      return this._pop();
    }
  }

  _handle(msg) {
    if (msg.method == null && msg.id != null) {
      const p = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (!p) return;
      if (msg.error) {
        p.reject(new Error(msg.error.message || "ACP error"));
      } else {
        p.resolve(msg.result ?? {});
      }
      return;
    }
    if (msg.method === "session/update") {
      if (this.capturing) {
        // Replayed history: keep user turns (live ones are already on screen,
        // so mapUpdate drops them) and hold the transcript back from the live
        // stream. Session-level updates that happen to arrive mid-replay —
        // slash commands, model lists — are not transcript, so they still go
        // straight through.
        const ev = mapUpdate(msg.params || {}, { replay: true });
        if (TRANSCRIPT_EVENTS.has(ev.type)) this.replay.push(ev);
        else if (ev.type !== "noop") this.emit(ev);
        return;
      }
      this.emit(mapUpdate(msg.params || {}));
      return;
    }
    if (msg.id == null) return;
    const method = msg.method;
    const params = msg.params || {};
    if (method === "session/request_permission") {
      // A reader session has no UI behind it, so a prompt it cannot answer
      // would hang the read. Only readers: a pane resuming its own session
      // must still surface the request (or auto-approve by mode).
      if (this.readOnly) {
        this.reply(msg.id, { outcome: { outcome: "cancelled" } });
        return;
      }
      if (this.reviewer) {
        // The reviewer reads and proposes; it never edits or runs anything.
        const call = params.toolCall || {};
        const blob = `${call.title || ""} ${call.name || ""} ${JSON.stringify(call._meta || {})}`.toLowerCase();
        const k = String(call.kind || "").toLowerCase();
        const allowed =
          !this.reviewer.judge &&
          (/westcode[-_]learn|westcode_skill|westcode_memory/.test(blob) || ["read", "search", "think"].includes(k));
        const opts = params.options || [];
        const reject =
          opts.find((o) => /reject/i.test(`${o.kind || ""} ${o.optionId || ""}`))?.optionId || "reject";
        this.reply(msg.id, {
          outcome: allowed
            ? { outcome: "selected", optionId: pickAllowOption(opts) }
            : { outcome: "selected", optionId: reject },
        });
        return;
      }
      const kind = String(params.toolCall?.kind || "").toLowerCase();
      // ACP declares the tool kind — trust it first; the title regex is only
      // a fallback for adapters that omit kind.
      const editShaped = kind
        ? kind === "edit"
        : /edit|write|patch|apply|save/.test(
            String(params.toolCall?.title || "").toLowerCase(),
          );
      // bypass auto-approves everything; auto only auto-approves edit-shaped
      // tools (its UI label is "accept edits") and surfaces the rest.
      if (
        this.permissionMode === "bypass" ||
        (this.permissionMode === "auto" && editShaped)
      ) {
        this.reply(msg.id, {
          outcome: {
            outcome: "selected",
            optionId: pickAllowOption(params.options || []),
          },
        });
        return;
      }
      const call = params.toolCall || {};
      const diffs = contentDiffs(call.content);
      this.emit({
        type: "permission",
        rpcId: msg.id,
        tool: call.title || call.kind || "tool",
        toolKind: typeof call.kind === "string" ? call.kind : undefined,
        command: typeof call.rawInput?.command === "string" ? call.rawInput.command : undefined,
        diffs: diffs.length ? diffs : undefined,
        options: params.options || [],
      });
      return;
    }
    if (method === "fs/read_text_file" && this.readOnly) {
      this.write({
        jsonrpc: "2.0",
        id: msg.id,
        error: { code: -32000, message: "WestCode is only reading this session." },
      });
      return;
    }
    if (method === "fs/read_text_file") {
      const path = expandHome(params.path || "");
      readFile(path, "utf8")
        .then((content) => this.reply(msg.id, { content }))
        .catch((err) =>
          this.write({
            jsonrpc: "2.0",
            id: msg.id,
            error: { code: -32000, message: err.message },
          }),
        );
      return;
    }
    if (method === "fs/write_text_file" && (this.readOnly || this.reviewer)) {
      // Showing history must never touch the user's files.
      this.write({
        jsonrpc: "2.0",
        id: msg.id,
        error: { code: -32000, message: "WestCode is only reading this session." },
      });
      return;
    }
    if (method === "fs/write_text_file") {
      const path = expandHome(params.path || "");
      mkdir(dirname(path), { recursive: true })
        .then(() => writeFile(path, params.content ?? "", "utf8"))
        .then(() => this.reply(msg.id, {}))
        .catch((err) =>
          this.write({
            jsonrpc: "2.0",
            id: msg.id,
            error: { code: -32000, message: err.message },
          }),
        );
      return;
    }
    this.write({
      jsonrpc: "2.0",
      id: msg.id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  }

  answerPermission(rpcId, optionId) {
    this.reply(rpcId, {
      outcome: { outcome: "selected", optionId },
    });
  }
}

const sessions = new Map();

export function getSession(id) {
  return sessions.get(id);
}

/** True while any live agent process for this provider is running. */
export function hasLiveSession(providerId) {
  for (const s of sessions.values()) {
    if (s.providerId === providerId && !s.dead) return true;
  }
  return false;
}

function pickAllowOption(options) {
  const list = Array.isArray(options) ? options : [];
  const blob = (o) =>
    `${o.optionId || ""} ${o.option_id || ""} ${o.kind || ""} ${o.name || ""}`.toLowerCase();
  // Prefer allow-ONCE: an auto-answer must never persist an "always allow"
  // rule into the CLI's own permission store.
  const once = list.find(
    (o) => /allow/.test(blob(o)) && !/always|reject|deny/.test(blob(o)),
  );
  if (once) return once.optionId || once.option_id || "allow-once";
  const always = list.find((o) => /always|allow_always|allow-always/.test(blob(o)));
  if (always) return always.optionId || always.option_id || "allow-always";
  return list[0]?.optionId || list[0]?.option_id || "allow-once";
}

function formatRestoredHistory(history) {
  const lines = [];
  for (const m of history.slice(-16)) {
    const role = m.role === "assistant" ? "Assistant" : m.role === "user" ? "User" : m.role;
    const text = String(m.text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);
    if (!text) continue;
    lines.push(`${role}: ${text}`);
  }
  if (!lines.length) return "";
  return `[WestCode restored this thread from the desk UI. The live agent process was restarted; this is the prior conversation. Continue from here — do not ask the human to paste it back.]\n\n${lines.join("\n")}\n\n[End of restored context]`;
}

export function ensureSession(opts, emit) {
  const existing = sessions.get(opts.sessionId);
  const cwd = expandHome(opts.cwd);
  if (
    existing &&
    !existing.dead &&
    existing.providerId === opts.providerId &&
    existing.cwd === cwd &&
    existing.model === opts.model &&
    existing.effort === opts.effort &&
    (existing.remote?.id || null) === (opts.hostId || null) &&
    // Permission flags are spawn-time (--always-approve, env) — a mode
    // change must respawn, or Bypass→Ask would leave approvals wide open.
    (existing.permissionMode || "ask") === (opts.permissionMode || "ask")
  ) {
    return existing;
  }
  if (existing) existing.stop();
  const s = new AcpSession(
    opts.sessionId,
    opts.providerId,
    opts.cwd,
    opts.model,
    opts.effort,
    opts.permissionMode,
    emit,
  );
  s.resumeId = opts.agentSessionId || null;
  s.reviewer = opts.reviewer || null;
  if (opts.hostId) {
    s.remote = getHost(opts.hostId);
    if (!s.remote) throw new Error(`SSH host "${opts.hostId}" is not set up any more — add it again in Settings → SSH hosts.`);
  }
  s.readOnly = Boolean(opts.readOnly && s.resumeId);
  sessions.set(opts.sessionId, s);
  return s;
}

/**
 * Ask a CLI for the sessions it has stored itself — the ones the user started
 * in a terminal as well as the ones WestCode started. session/list is an ACP
 * method, so this reads no private on-disk format (Claude's and Codex's
 * transcript schemas are internal and change between releases). The agent is
 * spawned only for the query and killed straight after.
 */
/**
 * Start a throwaway agent, initialize it, run `fn(rpc, init)`, then stop it.
 * For one-off calls that are not a conversation (list, fork).
 */
async function withAgent(providerId, opts, fn) {
  const remote = opts.hostId ? getHost(opts.hostId) : null;
  if (opts.hostId && !remote) throw new Error(`Unknown SSH host ${opts.hostId}.`);
  const spec = spawnSpec(providerId, opts.model || "", opts.effort || "", {
    permissionMode: "ask",
    remote,
  });
  const cwd = remote ? homedir() : expandHome(opts.cwd || homedir());
  const proc = spawn(spec.command, spec.args, {
    cwd,
    env: spec.env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let buf = Buffer.alloc(0);
  let nextId = 1;
  const pending = new Map();
  const settleAll = (err) => {
    for (const [, p] of pending) p.reject(err);
    pending.clear();
  };
  proc.on("error", (err) => settleAll(err));
  proc.on("exit", () => settleAll(new Error("Agent exited before answering.")));
  let stderr = "";
  proc.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk.toString("utf8")).slice(-2000);
  });
  proc.stdout.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      const nl = buf.indexOf(10);
      if (nl < 0) break;
      const line = buf.subarray(0, nl).toString("utf8").trim();
      buf = buf.subarray(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if (msg.id != null && msg.method == null && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message || "ACP error"));
        else p.resolve(msg.result ?? {});
      }
    }
  });
  const rpc = (method, params) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`${method} timed out`));
        }
      }, 45_000);
    });
  try {
    const init = await rpc("initialize", {
      protocolVersion: 1,
      clientInfo: { name: "westcode", title: "WestCode", version: "1.0.0" },
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
      },
    });
    return await fn(rpc, init, remote);
  } catch (err) {
    err.message = `${err.message}${stderr.trim() ? ` — ${stderr.trim().split("\n").slice(-2).join(" ")}` : ""}`;
    throw err;
  } finally {
    try {
      proc.kill();
    } catch {
      /* already gone */
    }
  }
}

export async function listAcpSessions(providerId, opts = {}) {
  const remote = opts.hostId ? getHost(opts.hostId) : null;
  if (opts.hostId && !remote) return { ok: false, output: `Unknown SSH host ${opts.hostId}.`, sessions: [] };
  // Claude's sessions on a host are files there; read them with sh, no agent.
  if (remote && providerId === "claude") return listRemoteClaude(remote, opts.limit);
  try {
    return await withAgent(providerId, opts, async (rpc) => {
      // No cwd filter: both adapters then return every stored session, across
      // every folder, which is what the sidebar wants.
      const res = await rpc("session/list", {});
      const rows = (res?.sessions || [])
        .map((s) => ({
          providerId,
          agentSessionId: s.sessionId || s.session_id || "",
          cwd: s.cwd || "",
          title: String(s.title || "").trim(),
          updatedAt: Date.parse(s.updatedAt || s.updated_at || "") || 0,
          ...(remote ? { hostId: remote.id } : {}),
        }))
        .filter((s) => s.agentSessionId);
      return { ok: true, sessions: rows };
    });
  } catch (err) {
    return { ok: false, output: err.message, sessions: [] };
  }
}

/**
 * Fork a stored conversation (Claude Desktop's "Fork session"): the agent
 * copies the transcript to a new session id, which then opens like any
 * stored session. Only agents that advertise session fork support it.
 */
export async function forkAcpSession(providerId, { cwd, agentSessionId, model, effort, at }) {
  try {
    return await withAgent(providerId, { cwd, model, effort }, async (rpc, init) => {
      const caps = init?.agentCapabilities || init?.agent_capabilities || {};
      const can = caps.sessionCapabilities?.fork ?? caps.session_capabilities?.fork;
      if (!can) return { ok: false, error: `${providerId} cannot fork a conversation.` };
      // At a given reply (Rewind): Claude's adapter takes the fork point as
      // the AIR extension's fork meta — the API message id, and the
      // fingerprint of its text as a fallback when the id is not on record.
      const meta = at?.messageId
        ? {
            jetbrains: {
              air: {
                fork: {
                  version: 1,
                  messageId: String(at.messageId),
                  ...(at.text ? { messageFingerprint: `sha256:${createHash("sha256").update(String(at.text)).digest("hex")}`, messageOccurrence: 1 } : {}),
                },
              },
            },
          }
        : undefined;
      const res = await rpc("session/fork", {
        sessionId: agentSessionId,
        cwd: expandHome(cwd),
        mcpServers: [],
        ...(meta ? { _meta: meta } : {}),
      });
      const id = res?.sessionId || res?.session_id;
      return id ? { ok: true, agentSessionId: id } : { ok: false, error: "The agent returned no session id." };
    });
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function dropSession(id) {
  const s = sessions.get(id);
  if (s) s.stop();
  sessions.delete(id);
}

export function stopAll() {
  for (const s of sessions.values()) s.stop();
  sessions.clear();
}

/**
 * Review a finished session: a fresh, restricted session of the same CLI
 * gets the transcript and the learning tools, and stages proposals. Returns
 * {ok, reply} — the proposals themselves are on disk (learn.mjs).
 */
export async function runReview({ providerId, cwd, model, prompt, doMemory, doSkill, origin }) {
  const id = `review:${origin || "session"}:${Date.now()}`;
  let reply = "";
  const s = ensureSession(
    {
      sessionId: id,
      providerId,
      cwd,
      model,
      effort: "low",
      permissionMode: "ask",
      reviewer: { doMemory, doSkill, origin },
    },
    (ev) => {
      if (ev.type === "text") reply += ev.text || "";
    },
  );
  try {
    await s.prompt(prompt, []);
    return { ok: true, reply: reply.trim() };
  } catch (err) {
    return { ok: false, error: err.message, reply: reply.trim() };
  } finally {
    dropSession(id);
  }
}

export function cancelReviews(origin) {
  for (const [id, s] of sessions) {
    if (id.startsWith(`review:${origin}:`)) s.cancel();
  }
}

/** One answer from the session's CLI with no tools at all (the goal judge). */
export async function runOneShot({ providerId, cwd, model, prompt, origin }) {
  const id = `judge:${origin || "session"}:${Date.now()}`;
  let reply = "";
  const s = ensureSession(
    { sessionId: id, providerId, cwd, model, effort: "low", permissionMode: "ask", reviewer: { judge: true, origin } },
    (ev) => {
      if (ev.type === "text") reply += ev.text || "";
    },
  );
  try {
    await s.prompt(prompt, []);
    return { ok: true, reply: reply.trim() };
  } catch (err) {
    return { ok: false, error: err.message, reply: reply.trim() };
  } finally {
    dropSession(id);
  }
}
