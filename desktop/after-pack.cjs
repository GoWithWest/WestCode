const { execFileSync } = require("node:child_process");
const { renameSync, rmSync } = require("node:fs");
const { join } = require("node:path");

/**
 * electron-builder afterPack hook (runs before signing).
 * Bundle files can carry Finder metadata, resource forks, and the SIP-pinned
 * com.apple.provenance attribute, which codesign hard-rejects for Developer
 * ID builds ("detritus not allowed"). `xattr -cr` cannot remove provenance —
 * rebuilding the bundle with ditto can.
 */
module.exports = async function afterPack(context) {
  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = join(context.appOutDir, appName);
  const clean = `${appPath}.clean`;
  console.log(`  • after-pack: stripping xattrs via ditto  app=${appPath}`);
  rmSync(clean, { recursive: true, force: true });
  execFileSync("ditto", ["--norsrc", "--noextattr", "--noqtn", appPath, clean]);
  rmSync(appPath, { recursive: true, force: true });
  renameSync(clean, appPath);
};
