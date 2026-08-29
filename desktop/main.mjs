import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell } from "electron";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
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
  const session = ensureSession(
    {
      sessionId,
      providerId,
      cwd,
      model,
      effort,
      permissionMode,
      agentSessionId,
    },
    (event) => send(sessionId, event),
  );
  try {
    await session.prompt(text, history || []);
    send(sessionId, { type: "done" });
    return { ok: true };
  } catch (err) {
    send(sessionId, { type: "error", message: err.message });
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
