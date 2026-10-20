// Integrated terminal (Claude Desktop's terminal pane, Ctrl+`): a real
// shell in the session's folder — on this Mac, or on the session's SSH host.
// node-pty gives it a proper pseudo-terminal (colours, vim, resize).
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { childEnv } from "./path.mjs";
import { getHost, q, sshArgs } from "./ssh.mjs";

const terms = new Map();
let ptyMod = null;

async function pty() {
  if (!ptyMod) ptyMod = await import("node-pty");
  return ptyMod.default ?? ptyMod;
}

/** What to run: a login shell here, or `ssh -t` into the folder on a host. */
export function terminalCommand({ cwd, hostId }) {
  if (hostId) {
    const h = getHost(hostId);
    if (!h) throw new Error("That SSH host is not set up any more.");
    // -tt forces a remote pty; the remote login shell then starts in the folder.
    const args = sshArgs(h).filter((a) => a !== "-T");
    const dest = args.pop();
    const remote = `cd ${cwd ? q(cwd) : '"$HOME"'} 2>/dev/null; exec "\${SHELL:-/bin/sh}" -l`;
    return { file: "ssh", args: ["-tt", ...args.slice(0, -1), "--", dest, remote], cwd: homedir() };
  }
  const shell = process.env.SHELL || (process.platform === "win32" ? "powershell.exe" : "/bin/zsh");
  return { file: shell, args: process.platform === "win32" ? [] : ["-l"], cwd: cwd && existsSync(cwd) ? cwd : homedir() };
}

export async function openTerminal({ id, cwd, hostId, cols = 100, rows = 30 }, onData, onExit) {
  closeTerminal(id);
  const { file, args, cwd: dir } = terminalCommand({ cwd, hostId });
  const { spawn } = await pty();
  const p = spawn(file, args, {
    name: "xterm-256color",
    cols: Math.max(20, cols | 0),
    rows: Math.max(5, rows | 0),
    cwd: dir,
    env: { ...childEnv(), TERM: "xterm-256color", COLORTERM: "truecolor", TERM_PROGRAM: "WestCode" },
  });
  p.onData((d) => onData(d));
  p.onExit(({ exitCode }) => {
    terms.delete(id);
    onExit(exitCode);
  });
  terms.set(id, p);
  return { ok: true };
}

export function writeTerminal(id, data) {
  terms.get(id)?.write(String(data));
}

export function resizeTerminal(id, cols, rows) {
  try {
    terms.get(id)?.resize(Math.max(20, cols | 0), Math.max(5, rows | 0));
  } catch {
    /* exited */
  }
}

export function closeTerminal(id) {
  const p = terms.get(id);
  if (!p) return;
  terms.delete(id);
  try {
    p.kill();
  } catch {
    /* already gone */
  }
}

export function closeAllTerminals() {
  for (const id of [...terms.keys()]) closeTerminal(id);
}
