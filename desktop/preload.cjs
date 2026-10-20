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
  addonAction: (payload) => ipcRenderer.invoke("addon:action", payload),
  addonMcpAdd: (payload) => ipcRenderer.invoke("addon:mcp-add", payload),
  registrySearch: (q) => ipcRenderer.invoke("registry:search", { q }),
  updates: () => ipcRenderer.invoke("cli:updates"),
  updateCli: (providerId) => ipcRenderer.invoke("cli:update", providerId),
  installCli: (providerId) => ipcRenderer.invoke("cli:install", providerId),
  login: (providerId) => ipcRenderer.invoke("cli:login", providerId),
  logout: (providerId) => ipcRenderer.invoke("cli:logout", providerId),
  pickFolder: () => ipcRenderer.invoke("fs:pickFolder"),
  pickFile: () => ipcRenderer.invoke("fs:pickFile"),
  saveText: (defaultName, content) => ipcRenderer.invoke("fs:saveText", { defaultName, content }),
  installSkillFile: (path, name, providers) => ipcRenderer.invoke("skill:install-file", { path, name, providers }),
  gitStatus: (cwd) => ipcRenderer.invoke("git:status", cwd),
  westcreate: () => ipcRenderer.invoke("westcreate:snapshot"),
  artifact: {
    file: (root, file) => ipcRenderer.invoke("artifact:file", { root, file }),
    inline: (code, lang) => ipcRenderer.invoke("artifact:inline", { code, lang }),
    openExternal: (url) => ipcRenderer.invoke("artifact:open-external", url),
  },
  judgeGoal: (payload) => ipcRenderer.invoke("goal:judge", payload),
  learn: {
    review: (payload) => ipcRenderer.invoke("learn:review", payload),
    cancel: (origin) => ipcRenderer.invoke("learn:cancel", origin),
    pending: () => ipcRenderer.invoke("learn:pending"),
    decide: (id, verdict, edited, opts) => ipcRenderer.invoke("learn:decide", { id, verdict, edited, ...(opts || {}) }),
    memory: () => ipcRenderer.invoke("learn:memory"),
  },
  memoryHub: {
    state: (memoryRepo) => ipcRenderer.invoke("memory:state", { memoryRepo }),
    preview: (path) => ipcRenderer.invoke("memory:preview", { path }),
    createRepo: (dir) => ipcRenderer.invoke("memory:create-repo", { dir }),
    pickFolder: () => ipcRenderer.invoke("memory:pick-folder"),
    setRemote: (dir, url) => ipcRenderer.invoke("memory:set-remote", { dir, url }),
    sync: (enabled, memoryRepo) => ipcRenderer.invoke("memory:sync", { enabled, memoryRepo }),
  },
  openWestcreate: () => ipcRenderer.invoke("westcreate:open"),
  git: {
    changes: (cwd) => ipcRenderer.invoke("git:changes", { cwd }),
    diff: (cwd, file) => ipcRenderer.invoke("git:diff", { cwd, file }),
    commit: (cwd, payload) => ipcRenderer.invoke("git:commit", { cwd, ...payload }),
    undo: (cwd) => ipcRenderer.invoke("git:undo", { cwd }),
    discard: (cwd, files) => ipcRenderer.invoke("git:discard", { cwd, files }),
    branches: (cwd) => ipcRenderer.invoke("git:branches", { cwd }),
    checkout: (cwd, payload) => ipcRenderer.invoke("git:checkout", { cwd, ...payload }),
    sync: (cwd, action) => ipcRenderer.invoke("git:sync", { cwd, action }),
    log: (cwd, payload) => ipcRenderer.invoke("git:log", { cwd, ...(payload || {}) }),
    show: (cwd, sha) => ipcRenderer.invoke("git:show", { cwd, sha }),
    findRepos: (cwd) => ipcRenderer.invoke("git:find-repos", { cwd }),
    init: (cwd) => ipcRenderer.invoke("git:init", { cwd }),
    checkpoint: (cwd, label) => ipcRenderer.invoke("git:checkpoint", { cwd, label }),
    restore: (cwd, sha) => ipcRenderer.invoke("git:restore", { cwd, sha }),
    worktreeAdd: (cwd, payload) => ipcRenderer.invoke("git:worktree-add", { cwd, ...(payload || {}) }),
    worktreeRemove: (path, force) => ipcRenderer.invoke("git:worktree-remove", { path, force }),
    worktreeReattach: (repo, path, branch) => ipcRenderer.invoke("git:worktree-reattach", { repo, path, branch }),
    onProgress: (fn) => {
      const handler = (_e, data) => fn(data);
      ipcRenderer.on("git:progress", handler);
      return () => ipcRenderer.removeListener("git:progress", handler);
    },
  },
  apiPrompt: (payload) => ipcRenderer.invoke("api:prompt", payload),
  setSecret: (id, value) => ipcRenderer.invoke("secret:set", { id, value }),
  stateLoad: () => ipcRenderer.invoke("state:load"),
  setLoginItem: (enabled) => ipcRenderer.invoke("app:login-item", { enabled }),
  openEditor: (cwd) => ipcRenderer.invoke("editor:open", { cwd }),
  onScheduleFire: (fn) => {
    const handler = (_e, data) => fn(data);
    ipcRenderer.on("schedule:fire", handler);
    return () => ipcRenderer.removeListener("schedule:fire", handler);
  },
  stateSave: (key, value) => ipcRenderer.invoke("state:save", { key, value }),
  cliSessions: (providerIds) => ipcRenderer.invoke("sessions:cli-list", { providerIds }),
  openSession: (payload) => ipcRenderer.invoke("session:open", payload),
  forkSession: (payload) => ipcRenderer.invoke("session:fork", payload),
  ssh: {
    list: () => ipcRenderer.invoke("ssh:list"),
    save: (host) => ipcRenderer.invoke("ssh:save", host),
    remove: (id) => ipcRenderer.invoke("ssh:remove", id),
    test: (host) => ipcRenderer.invoke("ssh:test", host),
    ls: (hostId, path) => ipcRenderer.invoke("ssh:ls", { hostId, path }),
    installClaude: (hostId) => ipcRenderer.invoke("ssh:install-claude", hostId),
    forgetPassword: (hostId) => ipcRenderer.invoke("ssh:forget-password", hostId),
    onPrompt: (fn) => {
      const h = (_e, p) => fn(p);
      ipcRenderer.on("ssh:prompt", h);
      return () => ipcRenderer.removeListener("ssh:prompt", h);
    },
    reply: (id, value, remember) => ipcRenderer.send("ssh:prompt-reply", { id, value, remember }),
  },
  prompt: (payload) => ipcRenderer.invoke("session:prompt", payload),
  cancel: (sessionId) => ipcRenderer.invoke("session:cancel", sessionId),
  steer: (sessionId, text) => ipcRenderer.invoke("session:steer", { sessionId, text }),
  stopTask: (sessionId, taskId) => ipcRenderer.invoke("session:stop-task", { sessionId, taskId }),
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
  setKeepAwake: (enabled) => ipcRenderer.send("app:keep-awake", enabled),
  pr: {
    status: (cwd) => ipcRenderer.invoke("pr:status", { cwd }),
    create: (cwd, payload) => ipcRenderer.invoke("pr:create", { cwd, ...(payload || {}) }),
    mergeWhenReady: (cwd) => ipcRenderer.invoke("pr:merge-auto", { cwd }),
  },
  onDeepLink: (fn) => {
    const handler = (_e, link) => fn(link);
    ipcRenderer.on("deeplink", handler);
    return () => ipcRenderer.removeListener("deeplink", handler);
  },
  dev: {
    list: (cwd) => ipcRenderer.invoke("dev:list", { cwd }),
    start: (cwd, name) => ipcRenderer.invoke("dev:start", { cwd, name }),
    stop: (cwd, name) => ipcRenderer.invoke("dev:stop", { cwd, name }),
  },
  files: {
    list: (root, path, hostId) => ipcRenderer.invoke("files:list", { root, path, hostId }),
    read: (root, path, hostId) => ipcRenderer.invoke("files:read", { root, path, hostId }),
    write: (root, path, content, expected) => ipcRenderer.invoke("files:write", { root, path, content, expected }),
  },
  term: {
    open: (p) => ipcRenderer.invoke("term:open", p),
    write: (id, data) => ipcRenderer.send("term:write", { id, data }),
    resize: (id, cols, rows) => ipcRenderer.send("term:resize", { id, cols, rows }),
    close: (id) => ipcRenderer.send("term:close", id),
    onData: (fn) => {
      const h = (_e, m) => fn(m);
      ipcRenderer.on("term:data", h);
      return () => ipcRenderer.removeListener("term:data", h);
    },
    onExit: (fn) => {
      const h = (_e, m) => fn(m);
      ipcRenderer.on("term:exit", h);
      return () => ipcRenderer.removeListener("term:exit", h);
    },
  },

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
