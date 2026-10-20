// Menu bar icon (Claude Desktop's menu bar item): what is running, jump to a
// session, start a new one — without bringing the window up first.

const STATUS = { running: "Working", waiting: "Your turn", error: "Error", idle: "Idle" };

/** Sessions worth showing: working first, then waiting for you; at most 8. */
export function traySessions(rows) {
  const live = (Array.isArray(rows) ? rows : []).filter((r) => r && r.id);
  const rank = (r) => (r.status === "running" ? 0 : r.status === "waiting" || r.status === "error" ? 1 : 2);
  return live
    .filter((r) => rank(r) < 2)
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 8);
}

/** Electron menu template; `on` = {open(id), newSession(), show(), quit()}. */
export function trayTemplate(rows, on) {
  const list = traySessions(rows);
  const running = list.filter((r) => r.status === "running").length;
  const header = running ? `${running} working` : list.length ? "Waiting for you" : "Nothing running";
  return [
    { label: header, enabled: false },
    ...list.map((r) => ({
      label: `${(r.title || "Session").slice(0, 48)} — ${STATUS[r.status] || r.status}`,
      sublabel: `${r.provider || r.providerId || ""}${r.cwd ? ` · ${String(r.cwd).split("/").filter(Boolean).pop()}` : ""}`,
      click: () => on.open(r.id),
    })),
    { type: "separator" },
    { label: "New session", accelerator: "CommandOrControl+Shift+Space", click: () => on.newSession() },
    { label: "Show WestCode", click: () => on.show() },
    { type: "separator" },
    { label: "Quit WestCode", click: () => on.quit() },
  ];
}

/** Text beside the icon: the number of agents working, or nothing. */
export function trayTitle(rows) {
  const n = traySessions(rows).filter((r) => r.status === "running").length;
  return n ? String(n) : "";
}
