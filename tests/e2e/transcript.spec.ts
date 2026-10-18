import { expect, test } from "@playwright/test";
import { fixtureEvents, installBridge, promptCalls } from "./bridge";
import { deskWith } from "./helpers";

test("a Claude turn shows the permission diff, compact tool rows, the reply, usage and title", async ({ page }) => {
  const events = fixtureEvents("acp-claude.jsonl");
  // Ask before the first Edit call shows up, like the real adapter does.
  const editAt = events.findIndex((e) => e.type === "tool" && e.name === "Edit");
  await installBridge(page, {
    state: deskWith([{ title: "Scratch" }]),
    turns: [
      {
        events,
        permissionAt: editAt,
        permission: {
          tool: "Edit calc.py",
          toolKind: "edit",
          diffs: [{ path: "/work/calc.py", oldText: "    return a - b", newText: "    return a + b" }],
          options: [
            { optionId: "allow-once", name: "Yes", kind: "allow_once" },
            { optionId: "allow-always", name: "Yes, allow all edits", kind: "allow_always" },
            { optionId: "reject", name: "No", kind: "reject_once" },
          ],
        },
      },
    ],
  });
  await page.goto("/");
  const box = page.getByPlaceholder(/Message Claude/);
  await box.fill("fix the bug in calc.py");
  await box.press("Enter");

  await expect(page.getByText("wants to edit a file")).toBeVisible();
  await expect(page.getByRole("navigation").getByText("Needs approval")).toBeVisible();
  await expect(page.getByText("return a + b").first()).toBeVisible();
  await page.screenshot({ path: "test-results/shots/permission.png" });
  await page.keyboard.press("1");
  await expect(page.getByText("wants to edit a file")).toHaveCount(0);

  await expect(page.getByText(/Read 1 file, edited 1 file, ran 1 command/)).toBeVisible();
  await expect(page.getByText(/\+2\s*−2|\+1\s*−1/).first()).toBeVisible();
  // The agent's title replaces the default one (the user never renamed it).
  await expect(page.getByRole("button", { name: "Calc.py add bug fix", exact: true })).toBeVisible();
  await expect(page.getByLabel(/Context \d+ percent used/)).toBeVisible();

  // Open the group and the Bash row: the command output is there.
  await page.getByText(/Read 1 file, edited 1 file/).click();
  await expect(page.getByText("Read calc.py")).toBeVisible();
  await page.screenshot({ path: "test-results/shots/turn.png" });

  const calls = await promptCalls(page);
  expect(calls).toHaveLength(1);
  expect(calls[0]!.text).toContain("fix the bug in calc.py");
});

test("a Grok turn pins its plan above the composer", async ({ page }) => {
  await installBridge(page, {
    state: deskWith([{ title: "Grok work", providerId: "grok", model: "grok-4.6" }]),
    turns: [{ events: fixtureEvents("acp-grok.jsonl") }],
  });
  await page.goto("/");
  const box = page.getByPlaceholder(/Message Grok/);
  await box.fill("fix calc");
  await box.press("Enter");
  await expect(page.getByText(/^\d\/3$/)).toBeVisible();
  await expect(page.getByText("Fix add so it adds instead of subtracts")).toBeVisible();
  await page.screenshot({ path: "test-results/shots/grok-plan.png" });
});

test("Cmd+O cycles agent activity detail and opens the tool rows", async ({ page }) => {
  await installBridge(page, {
    state: deskWith([{ title: "Scratch" }]),
    turns: [{ events: fixtureEvents("acp-claude.jsonl") }],
    pace: 1,
  });
  await page.goto("/");
  await page.getByPlaceholder(/Message Claude/).fill("go");
  await page.getByPlaceholder(/Message Claude/).press("Enter");
  await expect(page.getByText(/Read 1 file, edited 1 file/)).toBeVisible();
  await expect(page.getByText("Read calc.py")).toHaveCount(0);
  await page.keyboard.press("Control+o");
  await expect(page.getByText("Read calc.py")).toBeVisible();
});
