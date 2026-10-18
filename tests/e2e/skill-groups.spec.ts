import { expect, test } from "@playwright/test";
import { installBridge, promptCalls } from "./bridge";
import { deskWith } from "./helpers";

test("linking Web Design sends its installed skills with the turn", async ({ page }) => {
  await installBridge(page, {
    state: deskWith([{ title: "Site" }]),
    skills: {
      claude: ["frontend-design:frontend-design", "web-design-guidelines", "design-taste-frontend", "pdf"],
    },
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Skill groups" }).click();
  await page.getByPlaceholder("Find a skill group").fill("web");
  await page.getByRole("menuitemcheckbox", { name: /Web Design/ }).click();
  await expect(page.getByRole("menuitemcheckbox", { name: /Web Design/ })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Skill groups" })).toContainText("Web Design");

  await page.getByPlaceholder(/Message Claude/).fill("build a landing page");
  await page.getByPlaceholder(/Message Claude/).press("Enter");
  await expect.poll(async () => (await promptCalls(page)).length).toBe(1);
  const [call] = await promptCalls(page);
  expect(call!.text).toContain("[Skill groups linked to this session]");
  expect(call!.text).toMatch(/Web Design: .*frontend-design:frontend-design/);
  expect(call!.text).toContain("web-design-guidelines");
  expect(call!.text).not.toMatch(/Web Design: .*\bpdf\b/);
});

test("/group links and /ungroup unlinks a group", async ({ page }) => {
  await installBridge(page, { state: deskWith([{ title: "Site" }]), skills: { claude: ["pdf"] } });
  await page.goto("/");
  const box = page.getByPlaceholder(/Message Claude/);
  await box.fill("/group docs");
  await box.press("Escape");
  await box.press("Enter");
  await expect(page.getByText(/Linked Docs & Office: 1 of \d+ skills installed/)).toBeVisible();
  await box.fill("/ungroup docs");
  await box.press("Escape");
  await box.press("Enter");
  await expect(page.getByText("Unlinked Docs & Office.")).toBeVisible();
});

test("Library → Groups: add a skill to a group and take it out again", async ({ page }) => {
  await installBridge(page, { state: deskWith([]), skills: { claude: ["my-new-skill"] } });
  await page.goto("/");
  // Wait for the client to hydrate (the probe result is client-only).
  await expect(page.getByText("live").first()).toBeVisible();
  // The first click can land before React has hydrated the sidebar.
  await expect(async () => {
    await page.getByRole("button", { name: /^Library/ }).first().click();
    await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await page.getByRole("button", { name: /Web Design/ }).first().click();
  await page.getByRole("button", { name: "Add skill" }).click();
  await page.getByPlaceholder("Search installed skills, or type a name").fill("my-new");
  await page.getByRole("button", { name: /my-new-skill/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByText("my-new-skill", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove my-new-skill from Web Design" }).click();
  await expect(page.getByText("my-new-skill", { exact: true })).toHaveCount(0);
});
