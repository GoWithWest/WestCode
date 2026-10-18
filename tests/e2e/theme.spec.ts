import { expect, test } from "@playwright/test";
import { fixtureEvents, installBridge } from "./bridge";
import { deskWith } from "./helpers";

test("light theme applies and the transcript stays readable", async ({ page }) => {
  await installBridge(page, {
    state: deskWith([{ title: "Light", agentId: "planner-architect" }], { "helix-settings-v1": { theme: "light" } }),
    turns: [{ events: fixtureEvents("acp-claude.jsonl") }],
    pace: 1,
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByPlaceholder(/Message Claude/).fill("fix the bug");
  await page.getByPlaceholder(/Message Claude/).press("Enter");
  await expect(page.getByText(/Read 1 file, edited 1 file/)).toBeVisible();
  await page.getByText(/Read 1 file, edited 1 file/).click();
  await page.getByText("Edit calc.py").click();
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const [r, g, b] = bg.match(/\d+/g)!.map(Number);
  expect(Math.min(r!, g!, b!)).toBeGreaterThan(220);
  await page.screenshot({ path: "test-results/shots/light.png" });
});

test("system theme follows the OS", async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: "light" });
  const page = await ctx.newPage();
  await installBridge(page, { state: deskWith([], { "helix-settings-v1": { theme: "system" } }) });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await ctx.close();
});
