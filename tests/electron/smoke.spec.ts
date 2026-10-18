// Launches the PACKAGED macOS app (CI builds it first) and drives its real
// window: Electron main + preload + IPC + bundled server, no mocks.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";

const APP = process.env.WESTCODE_APP;

test.skip(!APP, "Set WESTCODE_APP to a packaged WestCode.app/Contents/MacOS/WestCode");

test("the packaged app opens, renders the desk and answers over IPC", async () => {
  const home = mkdtempSync(join(tmpdir(), "wc-electron-home-"));
  const app = await electron.launch({
    executablePath: APP!,
    env: { ...process.env, HOME: home, WESTCODE_HOME: join(home, ".westcode") },
    timeout: 60_000,
  });
  const win = await app.firstWindow();
  await win.waitForLoadState("domcontentloaded");
  await expect(win.getByText("WestCode").first()).toBeVisible({ timeout: 30_000 });
  await expect(win.getByText("Sessions", { exact: false }).first()).toBeVisible();
  expect(await win.evaluate(() => Boolean(window.westcode?.desktop))).toBe(true);

  // Real IPC into the main process.
  const repo = resolve(process.cwd());
  const git = await win.evaluate((cwd) => window.westcode!.git!.changes(cwd), repo);
  expect(git.repo).toBe(true);
  expect(typeof git.branch === "string" || git.branch === null).toBe(true);
  const pending = await win.evaluate(() => window.westcode!.learn!.pending());
  expect(pending).toEqual([]);
  const wc = await win.evaluate(() => window.westcode!.westcreate!());
  expect(wc.installed).toBe(false);
  const probe = await win.evaluate(() => window.westcode!.probe());
  expect(probe.map((p: { id: string }) => p.id).sort()).toEqual(["claude", "codex", "grok"]);

  await expect(async () => {
    await win.getByRole("button", { name: /^Library/ }).click();
    await expect(win.getByRole("heading", { name: "Library", exact: true })).toBeVisible({ timeout: 2000 });
  }).toPass();
  await win.getByRole("button", { name: "Agents" }).click();
  await expect(win.locator("svg.dot-bot[aria-label='Mason']").first()).toBeVisible();
  await win.screenshot({ path: "test-results/shots/electron-mac.png" });
  await app.close();
});
