import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, safeStorage, shell } from "electron";
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
