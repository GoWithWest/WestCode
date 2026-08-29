/* eslint-disable @typescript-eslint/no-require-imports -- Electron preload scripts are CommonJS */
const { contextBridge, ipcRenderer, webFrame } = require("electron");

webFrame.insertCSS(`
  html { background: #111113; }
  .traffic-lights { visibility: hidden !important; pointer-events: none !important; }
`);

function markDesktop() {
  document.documentElement?.classList.add("westcode-desktop");
}
markDesktop();
window.addEventListener("DOMContentLoaded", markDesktop);

contextBridge.exposeInMainWorld("westcode", {
  desktop: true,
  probe: () => ipcRenderer.invoke("cli:probe"),
  library: (providerId) => ipcRenderer.invoke("cli:library", providerId),
  updates: () => ipcRenderer.invoke("cli:updates"),
  updateCli: (providerId) => ipcRenderer.invoke("cli:update", providerId),
  installCli: (providerId) => ipcRenderer.invoke("cli:install", providerId),
  login: (providerId) => ipcRenderer.invoke("cli:login", providerId),
  logout: (providerId) => ipcRenderer.invoke("cli:logout", providerId),
  pickFolder: () => ipcRenderer.invoke("fs:pickFolder"),
  pickFile: () => ipcRenderer.invoke("fs:pickFile"),
  saveText: (defaultName, content) => ipcRenderer.invoke("fs:saveText", { defaultName, content }),
  gitStatus: (cwd) => ipcRenderer.invoke("git:status", cwd),
  apiPrompt: (payload) => ipcRenderer.invoke("api:prompt", payload),
  setSecret: (id, value) => ipcRenderer.invoke("secret:set", { id, value }),
  stateLoad: () => ipcRenderer.invoke("state:load"),
  stateSave: (key, value) => ipcRenderer.invoke("state:save", { key, value }),
  prompt: (payload) => ipcRenderer.invoke("session:prompt", payload),
  cancel: (sessionId) => ipcRenderer.invoke("session:cancel", sessionId),
  stopSession: (sessionId) => ipcRenderer.invoke("session:stop", sessionId),
  permission: (payload) => ipcRenderer.invoke("session:permission", payload),
  onEvent: (fn) => {
    const handler = (_e, data) => fn(data);
    ipcRenderer.on("session:event", handler);
    return () => ipcRenderer.removeListener("session:event", handler);
  },
  onMenu: (fn) => {
    const handler = (_e, action) => fn(action);
    ipcRenderer.on("menu:action", handler);
    return () => ipcRenderer.removeListener("menu:action", handler);
  },
  syncDesk: (rows) => ipcRenderer.send("desk:sync", rows),
  onDeskDeliver: (fn) => {
    const handler = (_e, data) => fn(data);
    ipcRenderer.on("desk:deliver", handler);
    return () => ipcRenderer.removeListener("desk:deliver", handler);
  },
  deskDelivered: (result) => ipcRenderer.send("desk:delivered", result),
  window: {
    close: () => ipcRenderer.invoke("win:close"),
    minimize: () => ipcRenderer.invoke("win:minimize"),
    maximize: () => ipcRenderer.invoke("win:maximize"),
  },
});
