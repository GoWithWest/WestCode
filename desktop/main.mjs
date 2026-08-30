import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, safeStorage, shell } from "electron";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { childEnv, which } from "./path.mjs";
import { probeAll, listAddons, PROVIDERS } from "./probe.mjs";
import { checkUpdates, installCli, updateCli } from "./cli-manager.mjs";
import { ensureSession, dropSession, getSession, hasLiveSession, stopAll, setDeskUrl } from "./acp-host.mjs";
import { setRoster, setSendHandler, startDeskBus } from "./desk-bus.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DEV_URL = process.env.WESTCODE_URL || "http://127.0.0.1:8080";
const ICON_PNG = join(here, "icon.png");

// A late async failure (e.g. a child process that cannot spawn) must not
// take the whole app down with Electron's crash dialog.
process.on("uncaughtException", (err) => {
  console.error("[westcode] uncaught exception:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("[westcode] unhandled rejection:", err);
});

/** @type {BrowserWindow | null} */
let win = null;
/** @type {import("node:child_process").ChildProcess | null} */
let appServer = null;
/** @type {string | null} */
let appServerUrl = null;

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

function waitForHttp(url, timeoutMs = 30_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        await fetch(url, { method: "HEAD" });
        resolve();
        return;
      } catch {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`The WestCode app server did not start (${url}).`));
          return;
        }
        setTimeout(tick, 250);
      }
    };
    void tick();
  });
}

/**
 * Packaged (standalone) mode: run the bundled nitro server inside the app so
 * no Vite dev server — and no `npm run app` — is needed.
 */
async function startAppServer() {
  if (appServer && appServerUrl) return appServerUrl;
  const entry = join(here, "..", ".output", "server", "index.mjs");
  if (!existsSync(entry)) return null;
  // freePort → spawn is a TOCTOU window; retry with a fresh port if another
  // process grabbed it between the probe and the bind.
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const port = await freePort();
    appServer = spawn(process.execPath, [entry], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        HOST: "127.0.0.1",
        PORT: String(port),
        NITRO_HOST: "127.0.0.1",
        NITRO_PORT: String(port),
      },
      stdio: "ignore",
    });
    appServer.on("exit", () => {
      appServer = null;
      appServerUrl = null;
    });
    const url = `http://127.0.0.1:${port}`;
    try {
      await waitForHttp(url);
      appServerUrl = url;
      return url;
    } catch (err) {
      lastErr = err;
      killAppServer();
    }
  }
  throw lastErr ?? new Error("The WestCode app server did not start.");
}

function send(sessionId, event) {
  win?.webContents.send("session:event", { sessionId, ...event });
}

function sendMenu(action) {
  win?.webContents.send("menu:action", action);
}

function installMenu() {
  const template = [
    {
      label: "WestCode",
      submenu: [
        { label: "About WestCode", click: () => sendMenu("providers") },
        { type: "separator" },
        { label: "Connections", click: () => sendMenu("providers") },
        { label: "Library", click: () => sendMenu("library") },
        { label: "Agents", click: () => sendMenu("agents") },
        { label: "Settings", accelerator: "CmdOrCtrl+,", click: () => sendMenu("settings") },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Mosaic",
          accelerator: "CmdOrCtrl+1",
          click: () => sendMenu("mosaic"),
        },
        {
          label: "Focus",
          accelerator: "CmdOrCtrl+2",
          click: () => sendMenu("focus"),
        },
        {
          label: "Split",
          accelerator: "CmdOrCtrl+3",
          click: () => sendMenu("split"),
        },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "toggleDevTools" },
      ],
    },
    {
      label: "Session",
      submenu: [
        {
          label: "New Session",
          accelerator: "CmdOrCtrl+N",
          click: () => sendMenu("new"),
        },
      ],
    },
    { role: "editMenu" },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#111113",
    title: "WestCode",
    icon: existsSync(ICON_PNG) ? ICON_PNG : undefined,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
    webPreferences: {
      preload: join(here, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.WESTCODE_DEV === "1") {
    void win.loadURL(DEV_URL);
  } else {
    try {
      const url = await startAppServer();
      if (url) {
        void win.loadURL(url);
      } else if (app.isPackaged) {
        // A packaged app without its bundled server is broken — do not fall
        // back to :8080, which belongs to some other process (or nothing).
        dialog.showErrorBox(
          "WestCode",
          "The bundled app server is missing from this build. Reinstall WestCode.",
        );
        app.quit();
        return;
      } else {
        void win.loadURL(DEV_URL);
      }
    } catch (err) {
      dialog.showErrorBox("WestCode", err.message);
      if (app.isPackaged) {
        app.quit();
        return;
      }
      void win.loadURL(DEV_URL);
    }
  }

  win.once("ready-to-show", () => {
    win?.setTitle("WestCode");
    win?.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

app.setName("WestCode");
if (process.platform === "darwin" && existsSync(ICON_PNG)) {
  app.dock?.setIcon(nativeImage.createFromPath(ICON_PNG));
}

app.whenReady().then(async () => {
  if (process.platform === "darwin" && existsSync(ICON_PNG)) {
    app.dock?.setIcon(nativeImage.createFromPath(ICON_PNG));
  }
  const deskUrl = await startDeskBus();
  setDeskUrl(deskUrl);
  setSendHandler(async ({ from, to, text }) => {
    if (!from || !to || !text) {
      return { ok: false, error: "from, to, and text are required." };
    }
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const delivered = await new Promise((resolve) => {
      const onResult = (_e, result) => {
        if (result?.requestId && result.requestId !== requestId) return;
        ipcMain.removeListener("desk:delivered", onResult);
        clearTimeout(timer);
        resolve(result);
      };
      const timer = setTimeout(() => {
        ipcMain.removeListener("desk:delivered", onResult);
        resolve(null);
      }, 15_000);
      ipcMain.on("desk:delivered", onResult);
      win?.webContents.send("desk:deliver", { requestId, from, to, text });
    });
    if (!delivered?.ok) {
      return {
        ok: false,
        error: delivered?.error || "Could not deliver on the desk.",
      };
    }
    return { ok: true, deliveredTo: delivered.deliveredTo };
  });
  installMenu();
  startScheduler();
  // Quick entry: summon WestCode and open the New Session dialog from
  // anywhere (mirrors the desktop-assistant global-hotkey pattern).
  const hotkeyOk = globalShortcut.register("CommandOrControl+Shift+Space", () => {
    if (!win || win.isDestroyed()) {
      void createWindow().then(() => {
        win?.webContents.once("did-finish-load", () => sendMenu("new"));
      });
      return;
    }
    win.show();
    win.focus();
    sendMenu("new");
  });
  if (!hotkeyOk) {
    // Another app owns the accelerator (Raycast/Alfred etc.) — quick entry
    // is unavailable this run; everything else works.
    console.warn("westcode: quick-entry hotkey Cmd+Shift+Space is taken");
  }
  void createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

ipcMain.on("desk:sync", (_e, rows) => setRoster(rows));

function killAppServer() {
  try {
    appServer?.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  appServer = null;
}

app.on("window-all-closed", () => {
  stopAll();
  if (process.platform !== "darwin") {
    killAppServer();
    app.quit();
  }
});

app.on("before-quit", () => {
  globalShortcut.unregisterAll();
  stopAll();
  killAppServer();
});

// Drain queued state/vault writes AFTER the windows have unloaded —
// will-quit fires once every renderer's beforeunload flush has posted its
// state:save over IPC, so the queue tail contains the final desk write
// (before-quit would drain too early on macOS Cmd+Q).
let quitFlushed = false;
app.on("will-quit", (event) => {
  if (quitFlushed) return;
  quitFlushed = true;
  event.preventDefault();
  setTimeout(() => {
    Promise.allSettled([stateQueue, vaultQueue]).then(() => app.exit(0));
  }, 100);
});

// Run a whitelisted addon-management action through the provider's own CLI.
// The command matrix mirrors each CLI's documented procedure — never a raw
// shell string from the renderer.
const ADDON_ACTIONS = {
  grok: {
    "connector:remove": (n) => ["mcp", "remove", n],
    "connector:enable": (n) => ["mcp", "enable", n],
    "connector:disable": (n) => ["mcp", "disable", n],
    "connector:doctor": (n) => ["mcp", "doctor", n],
    "plugin:install": (n, src) => ["plugin", "install", src || n, "--trust"],
    "plugin:remove": (n) => ["plugin", "uninstall", n],
    "plugin:enable": (n) => ["plugin", "enable", n],
    "plugin:disable": (n) => ["plugin", "disable", n],
    "marketplace:add": (n, src) => ["plugin", "marketplace", "add", src || n],
  },
  claude: {
    "connector:remove": (n) => ["mcp", "remove", n],
    // OAuth for remote servers: documented `claude mcp login <name>` (v2.1.186+)
    "connector:login": (n) => ["mcp", "login", n],
    "connector:logout": (n) => ["mcp", "logout", n],
    "plugin:install": (n, src) => ["plugin", "install", src || n, "--yes"],
    "plugin:remove": (n) => ["plugin", "uninstall", n],
    "plugin:enable": (n) => ["plugin", "enable", n],
    "plugin:disable": (n) => ["plugin", "disable", n],
    "marketplace:add": (n, src) => ["plugin", "marketplace", "add", src || n],
  },
  codex: {
    "connector:remove": (n) => ["mcp", "remove", n],
    "connector:login": (n) => ["mcp", "login", n],
    "connector:logout": (n) => ["mcp", "logout", n],
  },
};

ipcMain.handle("addon:action", async (_e, payload) => {
  const { providerId, kind, action, name, source } = payload || {};
  const spec = PROVIDERS[providerId];
  const make = ADDON_ACTIONS[providerId]?.[`${kind}:${action}`];
  if (!spec || !make) {
    return { ok: false, output: `${providerId} has no ${kind} ${action} command.` };
  }
  const bin = which(spec.binary);
  if (!bin) return { ok: false, output: `${spec.name} is not installed.` };
  const args = make(String(name || ""), source ? String(source) : undefined);
  return new Promise((resolve) => {
    const child = spawn(bin, args, { env: childEnv(), cwd: homedir(), timeout: 120_000 });
    let out = "";
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (out += c));
    child.on("error", (err) => resolve({ ok: false, output: err.message }));
    child.on("exit", (code) =>
      resolve({ ok: code === 0, output: out.slice(-3000) }),
    );
  });
});

// Add an MCP connector through the provider's CLI (documented `mcp add` shape).
ipcMain.handle("addon:mcp-add", async (_e, payload) => {
  const { providerId, name, commandOrUrl, args: extraArgs, transport, env } = payload || {};
  const spec = PROVIDERS[providerId];
  if (!spec || !name || !commandOrUrl) {
    return { ok: false, output: "provider, name, and command/url are required." };
  }
  const bin = which(spec.binary);
  if (!bin) return { ok: false, output: `${spec.name} is not installed.` };
  const isUrl = /^https?:\/\//.test(String(commandOrUrl));
  const args = ["mcp", "add"];
  if (providerId === "claude") {
    // Claude defaults to LOCAL scope keyed to the spawning cwd — which here
    // is the app process, not a project. User scope is the app-level truth.
    args.push("--scope", "user");
  } else if (providerId === "grok") {
    args.push("--scope", "user");
  }
  if (isUrl && providerId !== "codex") {
    args.push("--transport", String(transport || "http"));
  }
  if (isUrl && payload?.header && providerId !== "codex") {
    // claude and grok both document --header for authenticated HTTP servers
    args.push("--header", String(payload.header));
  }
  for (const [k, v] of Object.entries(env || {})) args.push("-e", `${k}=${v}`);
  args.push(String(name));
  if (isUrl && providerId === "codex") {
    // codex takes the remote form as `mcp add <name> --url <url>`
    args.push("--url", String(commandOrUrl));
  } else if (isUrl) {
    args.push(String(commandOrUrl));
  } else if (providerId === "grok") {
    // grok (per its own CLI help): `mcp add <name> <command> -- <server args>`
    args.push(String(commandOrUrl));
    if (Array.isArray(extraArgs) && extraArgs.length) args.push("--", ...extraArgs.map(String));
  } else {
    // claude/codex stdio: `mcp add <name> -- <command> [args...]`
    args.push("--", String(commandOrUrl), ...(Array.isArray(extraArgs) ? extraArgs.map(String) : []));
  }
  return new Promise((resolve) => {
    const child = spawn(bin, args, { env: childEnv(), cwd: homedir(), timeout: 60_000 });
    let out = "";
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (out += c));
    child.on("error", (err) => resolve({ ok: false, output: err.message }));
    child.on("exit", (code) =>
      resolve({ ok: code === 0, output: out.slice(-3000) }),
    );
  });
});

// Search the official MCP registry (registry.modelcontextprotocol.io) for
// installable servers — remotes (http) and npm packages (stdio via npx).
ipcMain.handle("registry:search", async (_e, { q }) => {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15_000);
  try {
    const query = String(q || "");
    const byName = new Map();
    let cursor = "";
    // The registry substring-matches namespaces too (searching "github"
    // returns pages of io.github.* servers), so walk a few pages to reach
    // the row the user actually means.
    for (let page = 0; page < 4; page++) {
      const url =
        `https://registry.modelcontextprotocol.io/v0/servers?search=${encodeURIComponent(query)}&limit=100` +
        (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) {
        if (byName.size) break;
        return { ok: false, output: `${res.status} ${res.statusText}`, servers: [] };
      }
      const data = await res.json();
      for (const item of data.servers || []) {
        const s = item.server || {};
        if (!s.name) continue;
        const meta = item._meta?.["io.modelcontextprotocol.registry/official"];
        const isLatest = !meta || meta.isLatest !== false;
        const remote = (s.remotes || []).find((r) => r.url)?.url || "";
        const npmPkg = (s.packages || []).find((p) => p.registryType === "npm")?.identifier || "";
        if (!remote && !npmPkg) continue;
        // Keep the latest version of a server; among rows all marked
        // isLatest: false, keep the newest (later pages are newer).
        const existing = byName.get(s.name);
        if (existing && existing.isLatest) continue;
        byName.set(s.name, {
          name: s.name,
          title: s.title || s.name,
          description: String(s.description || "").slice(0, 200),
          remote,
          npmPkg,
          repo: s.repository?.url || "",
          isLatest,
        });
      }
      cursor = data.metadata?.nextCursor || "";
      if (!cursor) break;
    }
    const ql = query.toLowerCase();
    const rank = (s) => {
      const title = String(s.title).toLowerCase();
      const short = String(s.name).split("/").pop()?.toLowerCase() ?? "";
      if (ql && (title === ql || short === ql)) return 0;
      if (ql && (title.includes(ql) || short.includes(ql))) return 1;
      return 2;
    };
    const servers = [...byName.values()]
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, 25)
      .map(({ isLatest: _latest, ...rest }) => rest);
    return { ok: true, servers };
  } catch (err) {
    return { ok: false, output: err.message, servers: [] };
  } finally {
    clearTimeout(timer);
  }
});

ipcMain.handle("cli:probe", () => probeAll());
ipcMain.handle("cli:library", (_e, providerId) => listAddons(providerId));
ipcMain.handle("cli:updates", async () => checkUpdates(await probeAll()));
ipcMain.handle("cli:update", (_e, providerId) => {
  if (hasLiveSession(providerId)) {
    return {
      ok: false,
      output: `A ${providerId} session is running. Stop it before updating — replacing the CLI under a live agent can corrupt the turn.`,
    };
  }
  return updateCli(providerId);
});
ipcMain.handle("cli:install", (_e, providerId) => installCli(providerId));

ipcMain.handle("cli:login", async (_e, providerId) => {
  const spec = PROVIDERS[providerId];
  if (!spec) throw new Error("Unknown provider");
  const bin = which(spec.binary);
  if (!bin) throw new Error(`${spec.name} is not installed.\n${spec.install}`);
  await openInTerminal(`${shellQuote(bin)} ${spec.loginArgs.join(" ")}`);
  return { ok: true };
});

ipcMain.handle("cli:logout", async (_e, providerId) => {
  const spec = PROVIDERS[providerId];
  if (!spec) throw new Error("Unknown provider");
  const bin = which(spec.binary);
  if (!bin) return { ok: true };
  await openInTerminal(`${shellQuote(bin)} ${spec.logoutArgs.join(" ")}`);
  return { ok: true };
});

ipcMain.handle("fs:pickFile", async () => {
  const res = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: [
      { name: "Skills & configs", extensions: ["md", "json", "yaml", "yml", "toml", "txt"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const path = res.filePaths[0];
  const name = path.split("/").filter(Boolean).pop() || path;
  let snippet = "";
  try {
    const raw = await readFile(path, "utf8");
    snippet = raw.replace(/^---[\s\S]*?---/, "").replace(/\s+/g, " ").trim().slice(0, 160);
  } catch {
    /* binary or unreadable — import by path only */
  }
  return { name, path, snippet };
});

function git(cwd, args) {
  return new Promise((resolve) => {
    const child = spawn("git", args, { cwd, env: childEnv() });
    let out = "";
    child.stdout.on("data", (c) => (out += c));
    child.on("error", () => resolve(null));
    child.on("exit", (code) => resolve(code === 0 ? out.trim() : null));
  });
}

ipcMain.handle("git:status", async (_e, cwd) => {
  const dir = cwd?.startsWith("~/") ? join(homedir(), cwd.slice(2)) : cwd;
  const branch = await git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch == null) return { repo: false };
  const numstat = await git(dir, ["diff", "--numstat", "HEAD"]);
  let adds = 0;
  let dels = 0;
  let files = 0;
  for (const line of (numstat || "").split("\n")) {
    const m = /^(\d+|-)\s+(\d+|-)\s+/.exec(line);
    if (!m) continue;
    files += 1;
    adds += m[1] === "-" ? 0 : Number(m[1]);
    dels += m[2] === "-" ? 0 : Number(m[2]);
  }
  const untracked = await git(dir, ["ls-files", "--others", "--exclude-standard"]);
  files += (untracked || "").split("\n").filter(Boolean).length;
  const counts = await git(dir, ["rev-list", "--left-right", "--count", "@{u}...HEAD"]);
  const [behind, ahead] = (counts || "0\t0").split(/\s+/).map((n) => Number(n) || 0);
  const remote = await git(dir, ["remote", "get-url", "origin"]);
  return { repo: true, branch, adds, dels, files, ahead, behind, remote: remote || "" };
});

// App state (sessions, library, agents, providers, colors…) persists in
// ~/.westcode/state.json so it survives app replacement — the packaged
// renderer's localStorage is origin-keyed to a random port and does not.
const STATE_PATH = join(homedir(), ".westcode", "state.json");
let stateQueue = Promise.resolve();

async function readStateFile() {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf8"));
  } catch (err) {
    if (err?.code !== "ENOENT") {
      // Corrupt file: keep the bytes for recovery instead of letting the
      // next save overwrite them with an empty object.
      try {
        const { rename } = await import("node:fs/promises");
        await rename(STATE_PATH, `${STATE_PATH}.corrupt-${Date.now()}`);
      } catch {
        /* ignore */
      }
    }
    return {};
  }
}

// Load runs through the same queue as saves so it can never observe a
// mid-rename snapshot.
// ---- Scheduled tasks: main owns the clock so schedules survive renderer
// reloads; firing is delegated to the renderer (it owns sessions/desk).
let scheduleTimer = null;
const scheduleFiredAt = new Map();
function startScheduler() {
  if (scheduleTimer) return;
  scheduleTimer = setInterval(async () => {
    try {
      const state = await readStateFile();
      const tasks = Array.isArray(state["helix-schedules-v1"])
        ? state["helix-schedules-v1"]
        : [];
      const now = Date.now();
      for (const t of tasks) {
        if (!t || !t.enabled || !t.prompt) continue;
        const every = Number(t.everyMinutes) > 0 ? Number(t.everyMinutes) * 60_000 : 0;
        if (!every) continue;
        const last = Number(t.lastRun) || 0;
        const fired = scheduleFiredAt.get(t.id) || 0;
        if (now - Math.max(last, fired) >= every) {
          scheduleFiredAt.set(t.id, now);
          win?.webContents.send("schedule:fire", {
            id: t.id,
            to: t.to || "",
            prompt: t.prompt,
            name: t.name || "Scheduled task",
          });
        }
      }
    } catch {
      /* next tick */
    }
  }, 30_000);
  scheduleTimer.unref?.();
}

ipcMain.handle("app:login-item", (_e, { enabled }) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
  return { ok: true };
});

ipcMain.handle("editor:open", (_e, { cwd }) => {
  for (const ed of ["cursor", "code", "zed"]) {
    const bin = which(ed);
    if (bin) {
      const child = spawn(bin, [cwd], { env: childEnv(), detached: true, stdio: "ignore" });
      child.unref();
      return { ok: true, editor: ed };
    }
  }
  return { ok: false, output: "No editor CLI found (tried cursor, code, zed)." };
});

ipcMain.handle("state:load", () => {
  const run = stateQueue.then(readStateFile);
  stateQueue = run.catch(() => {});
  return run;
});

ipcMain.handle("state:save", (_e, { key, value }) => {
  const run = stateQueue.then(async () => {
    const { writeFile: write, mkdir, rename } = await import("node:fs/promises");
    const state = await readStateFile();
    state[key] = value;
    await mkdir(dirname(STATE_PATH), { recursive: true });
    const tmp = `${STATE_PATH}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`;
    await write(tmp, JSON.stringify(state), "utf8");
    await rename(tmp, STATE_PATH);
    return { ok: true };
  });
  stateQueue = run.catch(() => {});
  return run.catch((err) => ({ ok: false, error: err.message }));
});

// Provider API keys live encrypted (Electron safeStorage → OS keychain key)
// in ~/.westcode/secrets.json, never in renderer localStorage.
const SECRETS_PATH = join(homedir(), ".westcode", "secrets.json");

/** {ok:false} means the vault exists but is unreadable — never overwrite it. */
async function readSecrets() {
  try {
    const raw = await readFile(SECRETS_PATH, "utf8");
    return { ok: true, data: JSON.parse(raw) };
  } catch (err) {
    if (err?.code === "ENOENT") return { ok: true, data: {} };
    return { ok: false, data: {} };
  }
}

async function writeSecrets(secrets) {
  const { writeFile: write, mkdir, rename } = await import("node:fs/promises");
  await mkdir(dirname(SECRETS_PATH), { recursive: true });
  const tmp = `${SECRETS_PATH}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`;
  await write(tmp, JSON.stringify(secrets), { mode: 0o600 });
  await rename(tmp, SECRETS_PATH);
}

// All vault mutations run on one queue: two overlapping read-modify-write
// cycles would each read the same snapshot and the later rename would drop
// the other's key.
let vaultQueue = Promise.resolve();
function withVault(fn) {
  const run = vaultQueue.then(fn, fn);
  vaultQueue = run.catch(() => {});
  return run;
}

ipcMain.handle("secret:set", (_e, { id, value }) =>
  withVault(async () => {
    if (!id) return { ok: false, error: "id is required" };
    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, error: "OS encryption is unavailable." };
    }
    const vault = await readSecrets();
    if (!vault.ok) {
      return {
        ok: false,
        error: `The secret store at ${SECRETS_PATH} is unreadable. Fix or delete it, then retry.`,
      };
    }
    const secrets = vault.data;
    if (value) {
      secrets[id] = safeStorage.encryptString(String(value)).toString("base64");
    } else {
      delete secrets[id];
    }
    try {
      await writeSecrets(secrets);
    } catch (err) {
      return { ok: false, error: err.message };
    }
    return { ok: true };
  }),
);

async function secretFor(id) {
  if (!id || !safeStorage.isEncryptionAvailable()) return "";
  const vault = await readSecrets();
  const raw = vault.data[id];
  if (!raw) return "";
  try {
    return safeStorage.decryptString(Buffer.from(raw, "base64"));
  } catch {
    return "";
  }
}

ipcMain.handle("api:prompt", async (_e, payload) => {
  const { endpoint, model, messages, providerId } = payload || {};
  // The encrypted store wins; a renderer-supplied key is honored only for
  // providers whose key has not migrated into the vault yet.
  const apiKey = (await secretFor(providerId)) || payload?.apiKey || "";
  if (!endpoint || !model || !Array.isArray(messages)) {
    return { ok: false, error: "endpoint, model, and messages are required." };
  }
  try {
    const base = String(endpoint).replace(/\/+$/, "");
    const url = /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 120_000);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ model, messages }),
      signal: ac.signal,
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error?.message || `${res.status} ${res.statusText}`,
      };
    }
    const text = data?.choices?.[0]?.message?.content ?? "";
    if (!text) return { ok: false, error: "The endpoint returned no content." };
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Copy a local SKILL.md (or skill folder file) into each provider's skills
// directory so the import genuinely installs, not just catalogs.
ipcMain.handle("skill:install-file", async (_e, { path, name, providers }) => {
  const { readFile: read, writeFile: write, mkdir } = await import("node:fs/promises");
  let content;
  try {
    content = await read(String(path), "utf8");
  } catch (err) {
    return { ok: false, output: `Could not read ${path}: ${err.message}` };
  }
  const slug = String(name || "skill").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const dirs = { claude: ".claude", grok: ".grok", codex: ".codex" };
  const done = [];
  for (const p of Array.isArray(providers) ? providers : []) {
    const base = dirs[p];
    if (!base) continue;
    const dest = join(homedir(), base, "skills", slug);
    try {
      await mkdir(dest, { recursive: true });
      await write(join(dest, "SKILL.md"), content, "utf8");
      done.push(`${p}: ${dest}/SKILL.md`);
    } catch (err) {
      done.push(`${p}: FAILED ${err.message}`);
    }
  }
  return { ok: done.some((d) => !d.includes("FAILED")), output: done.join("\n") };
});

ipcMain.handle("fs:saveText", async (_e, { defaultName, content }) => {
  const res = await dialog.showSaveDialog(win, {
    defaultPath: defaultName || "session.md",
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (res.canceled || !res.filePath) return { ok: false };
  const { writeFile: write } = await import("node:fs/promises");
  await write(res.filePath, String(content ?? ""), "utf8");
  return { ok: true, path: res.filePath };
});

ipcMain.handle("fs:pickFolder", async () => {
  const res = await dialog.showOpenDialog(win, {
    properties: ["openDirectory", "createDirectory"],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const path = res.filePaths[0];
  const name = path.split("/").filter(Boolean).pop() || path;
  return { name, path, language: "Mixed", hint: "Opened from this Mac" };
});

ipcMain.handle("session:prompt", async (_e, payload) => {
  const {
    sessionId,
    providerId,
    cwd,
    model,
    effort,
    permissionMode,
    agentSessionId,
    text,
    history,
  } = payload;
  // Suppress events from a session that was stopped or replaced — a late
  // done/error from a cancelled turn must not land on the next turn's stream.
  let session = null;
  const emit = (event) => {
    if (session && (session.stopped || getSession(sessionId) !== session)) return;
    send(sessionId, event);
  };
  session = ensureSession(
    {
      sessionId,
      providerId,
      cwd,
      model,
      effort,
      permissionMode,
      agentSessionId,
    },
    emit,
  );
  try {
    await session.prompt(text, history || []);
    emit({ type: "done" });
    return { ok: true };
  } catch (err) {
    emit({ type: "error", message: err.message });
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("session:cancel", (_e, sessionId) => {
  getSession(sessionId)?.cancel();
  return { ok: true };
});

ipcMain.handle("session:stop", (_e, sessionId) => {
  dropSession(sessionId);
  return { ok: true };
});

ipcMain.handle("session:permission", (_e, { sessionId, rpcId, optionId }) => {
  getSession(sessionId)?.answerPermission(rpcId, optionId);
  return { ok: true };
});

ipcMain.handle("win:close", () => win?.close());
ipcMain.handle("win:minimize", () => win?.minimize());
ipcMain.handle("win:maximize", () => {
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

function openInTerminal(command) {
  return new Promise((resolve, reject) => {
    if (process.platform !== "darwin") {
      const child = spawn(process.env.SHELL || "/bin/zsh", ["-lc", command], {
        env: childEnv(),
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      resolve();
      return;
    }
    const script = `tell application "Terminal"
      activate
      do script ${JSON.stringify(`cd ${shellQuote(homedir())} && ${command}`)}
    end tell`;
    const child = spawn("osascript", ["-e", script], { stdio: "ignore" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error("Could not open Terminal for login."));
    });
  });
}
