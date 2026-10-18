import { expect, test } from "@playwright/test";
import { installBridge } from "./bridge";
import { deskWith } from "./helpers";

test("/btw opens a read-only side chat in a drawer, seeded with the session's context", async ({ page }) => {
  const now = Date.now();
  await installBridge(page, {
    state: deskWith([
      {
        title: "Main work",
        messages: [
          { id: "u1", role: "user", createdAt: now, blocks: [{ type: "text", text: "Refactor the parser module" }] },
          { id: "a1", role: "assistant", createdAt: now, blocks: [{ type: "text", text: "Started splitting parse.ts." }] },
        ],
      },
    ]),
  });
  await page.goto("/");
  const box = page.getByPlaceholder(/Message Claude/);
  await expect(async () => {
    await box.fill("/btw what does parse.ts export?");
    await box.press("Escape");
    await box.press("Enter");
    await expect(page.getByRole("complementary", { name: "Side chat" })).toBeVisible({ timeout: 2000 });
  }).toPass();
  const drawer = page.getByRole("complementary", { name: "Side chat" });
  await expect(drawer.getByText("what does parse.ts export?", { exact: true })).toBeVisible();
  await expect(drawer.getByText("[Side chat]")).toHaveCount(0);

  const call = await page.evaluate(() =>
    (window as unknown as { __westcode: { calls: { method: string; payload: { text: string; permissionMode: string } }[] } }).__westcode.calls.find(
      (c) => c.method === "prompt",
    )!.payload,
  );
  expect(call.permissionMode).toBe("plan");
  expect(call.text).toContain("[Side chat]");
  expect(call.text).toContain("Refactor the parser module");
  expect(call.text).toContain("do not change files");

  // The side chat is not a separate row in the sidebar.
  await expect(page.getByRole("navigation").getByText(/^Side:/)).toHaveCount(0);
  await page.screenshot({ path: "test-results/shots/side-chat.png" });
  await page.getByRole("button", { name: "Close side chat" }).click();
  await expect(drawer).toHaveCount(0);
});
