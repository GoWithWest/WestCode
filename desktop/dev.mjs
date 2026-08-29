import { spawn } from "node:child_process";
import { Socket } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brandElectronApp } from "./brand.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const electronBin = join(root, "node_modules", "electron", "cli.js");

brandElectronApp();

function waitForPort(port, timeoutMs = 90_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const sock = new Socket();
      sock.setTimeout(600);
      sock.once("connect", () => {
        sock.destroy();
        resolve();
      });
      const retry = () => {
        sock.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for :${port}`));
        } else {
          setTimeout(probe, 400);
        }
      };
      sock.once("timeout", retry);
      sock.once("error", retry);
      sock.connect(port, "127.0.0.1");
    };
    probe();
  });
}

function portOpen(port) {
  return new Promise((resolve) => {
    const sock = new Socket();
    sock.setTimeout(400);
    sock.once("connect", () => {
      sock.destroy();
      resolve(true);
    });
    sock.once("timeout", () => {
      sock.destroy();
      resolve(false);
    });
    sock.once("error", () => {
      sock.destroy();
      resolve(false);
    });
    sock.connect(port, "127.0.0.1");
  });
}

const alreadyUp = await portOpen(8080);
const vite = alreadyUp
  ? null
  : spawn("npm", ["run", "dev"], {
      cwd: root,
      stdio: "inherit",
      shell: true,
      env: process.env,
    });

vite?.on("exit", (code) => {
  if (code && code !== 0 && electron.exitCode == null) process.exit(code);
});

if (!alreadyUp) await waitForPort(8080);

const electron = spawn(process.execPath, [electronBin, "."], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    WESTCODE_DEV: "1",
    WESTCODE_URL: "http://127.0.0.1:8080",
  },
});

function shutdown() {
  try {
    electron.kill();
  } catch {
    /* ignore */
  }
  try {
    vite.kill();
  } catch {
    /* ignore */
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

electron.on("exit", (code) => {
  try {
    vite.kill();
  } catch {
    /* ignore */
  }
  process.exit(code ?? 0);
});
