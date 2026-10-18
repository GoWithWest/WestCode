import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { exposeLearn, installBridge, promptCalls } from "./bridge";
import { deskWith } from "./helpers";

const SKILL = `---\nname: package-release\ndescription: Use when releasing a package.\n---\n\n# Release\n\n1. Run the tests.\n2. Update CHANGELOG.md.\n3. Tag, push, then publish.\n`;

test("/reflect proposes a skill and a memory; approving writes them and memory reaches the next session", async ({ page }) => {
  const homes = { home: mkdtempSync(join(tmpdir(), "wc-h-")), user: mkdtempSync(join(tmpdir(), "wc-u-")) };
  const reviews: unknown[] = [];
  await exposeLearn(page, homes, (p) => {
    reviews.push(p);
    return [
      { kind: "skill", name: "package-release", content: SKILL, why: "The user corrected the release order." },
      { kind: "memory", target: "user", op: "add", text: "Wants summaries as at most 3 bullets", why: "Said so." },
    ];
  });
  const now = Date.now();
  await installBridge(page, {
    state: deskWith([
      {
        title: "Release",
        messages: [
          { id: "m1", role: "user", createdAt: now, blocks: [{ type: "text", text: "Release v2.3" }] },
          { id: "m2", role: "assistant", createdAt: now, blocks: [{ type: "text", text: "Published." }] },
        ],
      },
      { title: "Fresh", providerId: "claude" },
    ]),
  });
  await page.goto("/");
  const box = page.getByPlaceholder(/Message Claude/);
  await expect(async () => {
    await box.fill("/reflect");
    await box.press("Escape");
    await box.press("Enter");
    await expect(page.getByText(/Proposed: new skill package-release; remember \(user\)/)).toBeVisible({ timeout: 2000 });
  }).toPass();
  expect(reviews).toHaveLength(1);
  expect(existsSync(join(homes.user, ".agents", "skills", "package-release"))).toBe(false);

  await page.getByRole("button", { name: /^Library/ }).click();
  await page.getByRole("button", { name: /^Learned/ }).click();
  await expect(page.getByText("New skill package-release")).toBeVisible();
  await expect(page.getByText("Wants summaries as at most 3 bullets").first()).toBeVisible();
  await page.screenshot({ path: "test-results/shots/learned.png", fullPage: true });
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Approve" }).first().click();
  await expect(page.getByText("Nothing waiting for you.")).toBeVisible();
  expect(readFileSync(join(homes.user, ".agents", "skills", "package-release", "SKILL.md"), "utf8")).toContain("Tag, push, then publish");
  expect(readFileSync(join(homes.user, ".claude", "skills", "package-release", "SKILL.md"), "utf8")).toContain("Run the tests");
  await expect(page.getByText("· Wants summaries as at most 3 bullets")).toBeVisible();

  // The next CLI session's first turn carries the approved memory.
  await page.getByRole("button", { name: /^Fresh/ }).click();
  await page.getByPlaceholder(/Message Claude/).fill("hello");
  await page.getByPlaceholder(/Message Claude/).press("Enter");
  await expect.poll(async () => (await promptCalls(page)).length).toBe(1);
  const [call] = await promptCalls(page);
  expect(call!.text).toContain("[Desk memory");
  expect(call!.text).toContain("Wants summaries as at most 3 bullets");
});

test("reject leaves no trace in skills", async ({ page }) => {
  const homes = { home: mkdtempSync(join(tmpdir(), "wc-h-")), user: mkdtempSync(join(tmpdir(), "wc-u-")) };
  await exposeLearn(page, homes, () => [{ kind: "skill", name: "package-release", content: SKILL, why: "x" }]);
  const now = Date.now();
  await installBridge(page, {
    state: deskWith([
      {
        title: "Release",
        messages: [
          { id: "m1", role: "user", createdAt: now, blocks: [{ type: "text", text: "a" }] },
          { id: "m2", role: "assistant", createdAt: now, blocks: [{ type: "text", text: "b" }] },
        ],
      },
    ]),
  });
  await page.goto("/");
  const box = page.getByPlaceholder(/Message Claude/);
  await expect(async () => {
    await box.fill("/reflect");
    await box.press("Escape");
    await box.press("Enter");
    await expect(page.getByText(/Proposed: new skill/)).toBeVisible({ timeout: 2000 });
  }).toPass();
  await page.getByRole("button", { name: /^Library/ }).click();
  await page.getByRole("button", { name: /^Learned/ }).click();
  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByText("Nothing waiting for you.")).toBeVisible();
  expect(existsSync(join(homes.user, ".agents", "skills", "package-release"))).toBe(false);
});
