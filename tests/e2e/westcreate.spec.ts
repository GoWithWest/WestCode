import { expect, test } from "@playwright/test";
import { fakeWestcreate } from "../fake-westcreate";
import { exposeWestcreate, installBridge, promptCalls } from "./bridge";
import { deskWith } from "./helpers";

test("WestCreate view shows the live drawing and hands work to Mason", async ({ page }) => {
  const fake = await fakeWestcreate();
  await exposeWestcreate(page, fake.home);
  await installBridge(page, { state: deskWith([]), westcreate: "live" });
  await page.goto("/");
  await expect(async () => {
    await page.getByRole("button", { name: /^WestCreate/ }).click();
    await expect(page.getByRole("heading", { name: /WestCreate/ })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(page.getByText("Running", { exact: true })).toBeVisible();
  await expect(page.getByText("Box 100x60x40")).toBeVisible();
  await expect(page.getByAltText("The open WestCreate drawing")).toBeVisible();
  await expect(page.getByText("5m 12s")).toBeVisible();
  await expect(page.getByText("fits the bed", { exact: true })).toBeVisible();
  await expect(page.getByText(/4 tools available to agents/)).toBeVisible();
  await page.screenshot({ path: "test-results/shots/westcreate.png" });

  await page.getByRole("button", { name: /finger-jointed box/ }).click();
  await expect.poll(async () => (await promptCalls(page)).length).toBe(1);
  const [call] = await promptCalls(page);
  expect(call!.text).toContain("You are Mason");
  expect(call!.text).toContain("finger-jointed box, 100 × 60 × 40 mm");
  // Only reads went to WestCreate.
  expect(fake.calls.filter((c) => c.startsWith("tools/call")).every((c) => c === "tools/call get_view")).toBe(true);
  await fake.close();
});
