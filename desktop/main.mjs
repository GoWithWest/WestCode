import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell } from "electron";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { childEnv, which } from "./path.mjs";
import { probeAll, listAddons, PROVIDERS } from "./probe.mjs";
import { ensureSession, dropSession, getSession, stopAll, setDeskUrl } from "./acp-host.mjs";
import { setRoster, setSendHandler, startDeskBus } from "./desk-bus.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DEV_URL = process.env.WESTCODE_URL || "http://127.0.0.1:8080";
const ICON_PNG = join(here, "icon.png");

/** @type {BrowserWindow | null} */
let win = null;

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

function createWindow() {
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

  const dist = join(here, "..", "dist", "client", "index.html");
  if (process.env.WESTCODE_DEV === "1" || !existsSync(dist)) {
    void win.loadURL(DEV_URL);
  } else {
    void win.loadFile(dist);
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
      const timer = setTimeout(() => resolve(null), 12_000);
      const onResult = (_e, result) => {
        if (result?.requestId && result.requestId !== requestId) return;
        ipcMain.removeListener("desk:delivered", onResult);
        clearTimeout(timer);
        resolve(result);
      };
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
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.on("desk:sync", (_e, rows) => setRoster(rows));

app.on("window-all-closed", () => {
  stopAll();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => stopAll());

ipcMain.handle("cli:probe", () => probeAll());
ipcMain.handle("cli:library", (_e, providerId) => listAddons(providerId));

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
