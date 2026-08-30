import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { childEnv, which } from "./path.mjs";
import { deskDir } from "./desk-paths.mjs";

const here = dirname(fileURLToPath(import.meta.url));
let deskUrl = "";

export function setDeskUrl(url) {
  deskUrl = url || "";
}

function deskMcp(sessionId) {
  const nodeBin = which("node") || process.execPath;
  const env = [
    { name: "WESTCODE_FROM_SESSION", value: sessionId },
    { name: "WESTCODE_DESK_DIR", value: deskDir() },
  ];
  if (deskUrl) env.push({ name: "WESTCODE_DESK_URL", value: deskUrl });
  if (nodeBin === process.execPath) {
    env.push({ name: "ELECTRON_RUN_AS_NODE", value: "1" });
  }
  return [
    {
      type: "stdio",
      name: "westcode",
      command: nodeBin,
      args: [join(here, "desk-mcp.mjs")],
      env,
    },
  ];
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
  const t = String(label || "").toLowerCase().trim();
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

function spawnSpec(providerId, model, effort, opts = {}) {
  const env = childEnv();
  const modelId = mapModel(providerId, model);
  const effortId = mapEffort(providerId, effort);
  const perm = permissionFlag(providerId, opts.permissionMode);

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
      args: ["-y", "@agentclientprotocol/claude-agent-acp"],
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
        args: ["-y", "@agentclientprotocol/codex-acp"],
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
    });
    if (!existsSync(this.cwd)) {
      this.dead = true;
      throw new Error(
        `Folder ${this.cwd} no longer exists — pick another folder for this session.`,
      );
    }
    this.proc = spawn(spec.command, spec.args, {
      cwd: this.cwd,
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
        fs: { readTextFile: true, writeTextFile: true },
        terminal: false,
      },
    });

    await this._authenticate(init);

    const mcpServers = deskMcp(this.id);
    const resumeId = this.resumeId;
    if (resumeId) {
      for (const method of ["session/resume", "session/load"]) {
        try {
          const loaded = await this.rpc(method, {
            sessionId: resumeId,
            cwd: this.cwd,
            mcpServers,
          });
          this.agentSessionId =
            loaded?.sessionId || loaded?.session_id || resumeId;
          this.resumed = true;
          this._emitModels(init);
          this.emit({ type: "ready", agentSessionId: this.agentSessionId });
          return this.agentSessionId;
        } catch {
          /* try next / fall through */
        }
      }
    }

    const created = await this.rpc("session/new", {
      cwd: this.cwd,
      mcpServers,
    });
    this.agentSessionId = created?.sessionId || created?.session_id || this.id;
    this.resumed = false;

    this._emitModels(init);
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
      throw new Error(
        `Could not authenticate ${this.providerId}. Run login from Connections. ${err.message}`,
      );
    }
  }

  _emitModels(init) {
    const models =
      init?._meta?.modelState?.availableModels ||
      init?._meta?.availableModels ||
      [];
    if (!models.length) return;
    this.emit({
      type: "models",
      models: models.map((m) => ({
        id: m.modelId || m.id,
        label: m.name || m.modelId || m.id,
      })),
    });
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

  rpc(method, params) {
    const id = this.nextRpc++;
    const timeout =
      method === "session/prompt"
        ? 15 * 60_000
        : method === "initialize" || method === "authenticate"
          ? 60_000
          : 25_000;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(`Timed out on ${method}. ${this.stderr.trim()}`.trim()),
        );
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
      this.emit(mapUpdate(msg.params || {}));
      return;
    }
    if (msg.id == null) return;
    const method = msg.method;
    const params = msg.params || {};
    if (method === "session/request_permission") {
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
      this.emit({
        type: "permission",
        rpcId: msg.id,
        tool: params.toolCall?.title || params.toolCall?.kind || "tool",
        options: params.options || [],
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

function mapUpdate(params) {
  const u = params.update || params;
  const kind = u.sessionUpdate || u.session_update || "";
  if (kind === "available_commands_update" || u.availableCommands) {
    const list = u.availableCommands || u.available_commands || [];
    return {
      type: "commands",
      commands: list
        .map((c) => ({
          cmd: String(c.name || c.command || "").replace(/^\//, ""),
          hint: c.description || c.hint || "",
          kind: c.kind === "skill" ? "skill" : "builtin",
        }))
        .filter((c) => c.cmd),
    };
  }
  if (
    kind === "user_message_chunk" ||
    kind === "user_message" ||
    kind === "session_info_update" ||
    kind === "current_mode_update"
  ) {
    return { type: "noop" };
  }
  if (kind === "agent_thought_chunk") {
    return { type: "thought", text: extractText(u) };
  }
  if (kind === "agent_message_chunk") {
    return { type: "text", text: extractText(u) };
  }
  if (kind === "tool_call" || kind === "tool_call_update") {
    const raw = u.rawInput || {};
    let content = "";
    if (Array.isArray(u.content)) {
      content = u.content
        .map((b) => b.text || "")
        .filter(Boolean)
        .join("\n");
    } else if (typeof u.content === "string") {
      content = u.content;
    }
    const status =
      u.status === "failed" || u.status === "error"
        ? "error"
        : u.status === "completed" || u.status === "done" || kind === "tool_call_update"
          ? "done"
          : "running";
    return {
      type: "tool",
      toolId: u.toolCallId || u.tool_call_id || u.id,
      // toolName first: dedupe logic (extractSendMessages) must recognize the
      // raw tool id; a prettified title is only a display fallback. An update
      // patch with no name fields sends "" so the renderer keeps the recorded
      // name instead of overwriting it with a generic one.
      name:
        u.toolName ||
        u.title ||
        (kind === "tool_call" ? u.kind || "Tool" : ""),
      path: u.locations?.[0]?.path || raw.path,
      command: raw.command,
      content,
      status: kind === "tool_call" && !u.status ? "running" : status,
    };
  }
  const text = extractText(u);
  if (text) return { type: "text", text };
  return { type: "noop" };
}

function extractText(u) {
  if (u.content && typeof u.content === "object" && typeof u.content.text === "string") {
    return u.content.text;
  }
  if (typeof u.text === "string") return u.text;
  return "";
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
  sessions.set(opts.sessionId, s);
  return s;
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
