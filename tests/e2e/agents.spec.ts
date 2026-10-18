import { expect, test } from "@playwright/test";
import { fixtureEvents, installBridge } from "./bridge";
import { deskWith } from "./helpers";

test("agents are characters that move with their session", async ({ page }) => {
  await installBridge(page, {
    state: deskWith([{ title: "Quinn review", agentId: "reviewer-qa" }]),
    turns: [{ events: fixtureEvents("acp-claude.jsonl") }],
    pace: 200,
  });
  await page.goto("/");
  await page.getByPlaceholder(/Message Claude/).fill("review it");
  await page.getByPlaceholder(/Message Claude/).press("Enter");
  // The header badge character is busy while the turn runs.
  await expect(page.locator("svg.dot-bot[aria-label='Quinn']").first()).toHaveClass(/dot-(thinking|working|speaking)/);

  await expect(async () => {
    await page.getByRole("button", { name: "Agents" }).click();
    await expect(page.getByRole("heading", { name: "Agents", exact: true })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(page.getByText("Your teammates.", { exact: false })).toBeVisible();
  for (const name of ["Avery", "Beck", "Sable", "Quinn", "Lennox", "Oz", "Mason"]) {
    await expect(page.locator(`svg.dot-bot[aria-label='${name}']`).first()).toBeVisible();
  }
  await expect(page.getByText("In progress")).toBeVisible();
  await page.screenshot({ path: "test-results/shots/agents.png", fullPage: true });
});

test("the agent editor changes the character", async ({ page }) => {
  await installBridge(page, { state: deskWith([]) });
  await page.goto("/");
  await expect(async () => {
    await page.getByRole("button", { name: "Agents" }).click();
    await expect(page.getByRole("heading", { name: "Agents", exact: true })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await page.getByRole("button", { name: "Edit Beck" }).click({ force: true });
  await page.getByRole("button", { name: "Shape heart" }).click();
  await page.getByRole("button", { name: "Colour #8B7CFF" }).click();
  await page.getByRole("button", { name: "sunglasses" }).click();
  await page.screenshot({ path: "test-results/shots/agent-editor.png" });
  await page.getByRole("button", { name: "Save" }).click();
  const saved = await page.evaluate(
    () => (window as unknown as { __westcode: { saved: Record<string, { overrides: Record<string, { look: unknown }> }> } }).__westcode.saved["helix-agents-v2"],
  );
  expect(saved.overrides["implementer-builder"]!.look).toEqual({ shape: "heart", color: "#8B7CFF", accessory: "sunglasses" });
});
