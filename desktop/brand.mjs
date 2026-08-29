import { copyFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function brandElectronApp() {
  if (process.platform !== "darwin") return;
  const appDir = join(root, "node_modules", "electron", "dist", "Electron.app");
  const plist = join(appDir, "Contents", "Info.plist");
  const icnsSrc = join(root, "desktop", "icon.icns");
  const icnsDst = join(appDir, "Contents", "Resources", "electron.icns");
  if (!existsSync(plist)) return;
  try {
    execFileSync("plutil", ["-replace", "CFBundleName", "-string", "WestCode", plist]);
    execFileSync("plutil", [
      "-replace",
      "CFBundleDisplayName",
      "-string",
      "WestCode",
      plist,
    ]);
    execFileSync("plutil", [
      "-replace",
      "CFBundleIdentifier",
      "-string",
      "app.westcode.desktop",
      plist,
    ]);
    if (existsSync(icnsSrc)) copyFileSync(icnsSrc, icnsDst);
  } catch {
    /* read-only install */
  }
}
