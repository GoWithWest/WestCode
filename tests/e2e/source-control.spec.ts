import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { exposeGit, installBridge } from "./bridge";
import { deskWith } from "./helpers";

const sh = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" });

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "wc-e2e-git-"));
  sh(dir, "init", "-q", "-b", "main");
  sh(dir, "config", "user.name", "Tester");
  sh(dir, "config", "user.email", "t@t");
  writeFileSync(join(dir, "calc.py"), "def add(a, b):\n    return a - b\n");
  writeFileSync(join(dir, "README.md"), "# demo\n");
  sh(dir, "add", "-A");
  sh(dir, "commit", "-q", "-m", "Initial commit");
  return dir;
}

test("source control: review a diff, commit chosen files, undo, branch, history", async ({ page }) => {
  const dir = repo();
  writeFileSync(join(dir, "calc.py"), "def add(a, b):\n    return a + b\n");
  writeFileSync(join(dir, "notes.txt"), "scratch\n");
  await exposeGit(page);
  await installBridge(page, { state: deskWith([{ title: "Calc", cwd: dir }]) });
  await page.goto("/");

  await expect(async () => {
    await page.keyboard.press("Control+Shift+G");
    await expect(page.getByRole("complementary", { name: "Source control" })).toBeVisible({ timeout: 1000 });
  }).toPass();
  const panel = page.getByRole("complementary", { name: "Source control" });
  await expect(panel.getByRole("tab", { name: "Changes 2" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Current branch" })).toContainText("main");

  await panel.getByText("calc.py").click();
  await expect(panel.getByText("return a + b")).toBeVisible();
  await expect(panel.getByText("return a - b")).toBeVisible();

  // Leave notes.txt out of the commit.
  await panel.getByLabel("Include notes.txt").uncheck();
  await expect(panel.getByText("1 of 2 files selected")).toBeVisible();
  await panel.getByLabel("Commit summary").fill("Fix add");
  await panel.getByLabel("Commit description").fill("It subtracted.");
  await page.screenshot({ path: "test-results/shots/source-control.png" });
  await panel.getByRole("button", { name: /Commit 1 file to main/ }).click();
  await expect(panel.getByText(/Committed [0-9a-f]{7}/)).toBeVisible();
  expect(sh(dir, "log", "-1", "--format=%s|%b").trim()).toBe("Fix add|It subtracted.");
  expect(sh(dir, "status", "--porcelain").trim()).toBe("?? notes.txt");

  // Undo puts the change back and refills the message.
  await panel.getByRole("button", { name: "Undo" }).click();
  await expect(panel.getByLabel("Commit summary")).toHaveValue("Fix add");
  expect(sh(dir, "log", "--format=%s").trim()).toBe("Initial commit");
  expect(readFileSync(join(dir, "calc.py"), "utf8")).toContain("a + b");

  // New branch from the picker.
  await panel.getByRole("button", { name: "Current branch" }).click();
  await page.getByPlaceholder("Filter or name a new branch").fill("fix/add");
  await page.getByRole("button", { name: /Create branch fix\/add/ }).click();
  await expect(panel.getByRole("button", { name: "Current branch" })).toContainText("fix/add");
  expect(sh(dir, "branch", "--show-current").trim()).toBe("fix/add");

  // History lists the commit and shows its patch.
  await panel.getByRole("tab", { name: "History" }).click();
  await panel.getByRole("button", { name: /Initial commit/ }).click();
  await expect(panel.getByText("# demo")).toBeVisible();
  await page.screenshot({ path: "test-results/shots/history.png" });
});

test("source control: discard throws a change away", async ({ page }) => {
  const dir = repo();
  writeFileSync(join(dir, "README.md"), "# changed\n");
  await exposeGit(page);
  await installBridge(page, { state: deskWith([{ title: "Calc", cwd: dir }]) });
  await page.goto("/");
  await expect(async () => {
    await page.getByRole("button", { name: "Source control" }).first().click();
    await expect(page.getByRole("complementary", { name: "Source control" })).toBeVisible({ timeout: 1000 });
  }).toPass();
  const panel = page.getByRole("complementary", { name: "Source control" });
  page.once("dialog", (d) => void d.accept());
  await panel.getByRole("button", { name: "Discard changes to README.md" }).click({ force: true });
  await expect(panel.getByText("No local changes")).toBeVisible();
  expect(readFileSync(join(dir, "README.md"), "utf8")).toBe("# demo\n");
});

test("checkpoints: restore a turn's file changes from the message, then undo", async ({ page }) => {
  const dir = repo();
  await exposeGit(page);
  await installBridge(page, { state: deskWith([{ title: "Calc", cwd: dir }]) });
  await page.goto("/");
  const box = page.getByPlaceholder(/Message Claude/);
  await box.fill("make add correct");
  await box.press("Enter");
  // The turn finished; now the "agent's" edits land on disk.
  await expect(page.getByText("ok", { exact: true })).toBeVisible();
  writeFileSync(join(dir, "calc.py"), "def add(a, b):\n    return a + b\n");
  writeFileSync(join(dir, "test_calc.py"), "assert True\n");

  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Restore files to before this message" }).click({ force: true });
  await expect(page.getByText(/Files restored to before “make add correct”\. Removed 1 file/)).toBeVisible();
  expect(readFileSync(join(dir, "calc.py"), "utf8")).toContain("a - b");
  expect(existsSync(join(dir, "test_calc.py"))).toBe(false);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText(/Files restored to before “the restore”/)).toBeVisible();
  expect(readFileSync(join(dir, "calc.py"), "utf8")).toContain("a + b");
  expect(existsSync(join(dir, "test_calc.py"))).toBe(true);
});
