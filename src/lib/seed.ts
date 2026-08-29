import type { Session } from "./types";

const t0 = Date.now();
const ago = (min: number) => t0 - min * 60_000;

export const SEED_SESSIONS: Session[] = [
  {
    id: "ses-claude-auth",
    title: "Refresh session cookies in auth middleware",
    providerId: "claude",
    projectId: "harbor",
    cwd: "~/src/harbor",
    model: "Opus 4.7",
    effort: "high",
    status: "waiting",
    createdAt: ago(42),
    updatedAt: ago(2),
    turns: 2,
    messages: [
      {
        id: "m-c-u1",
        role: "user",
        createdAt: ago(42),
        blocks: [
          {
            type: "text",
            text: "Session cookies die after a deploy even when the user is mid-checkout. The middleware in src/auth/middleware.ts looks like it's minting a new token every request. Fix it without forcing a logout, and add a test.",
          },
        ],
      },
      {
        id: "m-c-a1",
        role: "assistant",
        createdAt: ago(40),
        blocks: [
          {
            type: "think",
            text: "If cookies vanish on deploy, the signing secret is rotating or the refresh path is writing a blank session. Read the middleware and the cookie helper first.",
          },
          {
            type: "tool",
            name: "Read",
            path: "src/auth/middleware.ts",
            status: "done",
            content: `import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET);

export async function touchSession() {
  const jar = await cookies();
  const token = jar.get("harbor_session")?.value;
  if (!token) return null;

  const { payload } = await jwtVerify(token, secret());
  const next = await new SignJWT({ sub: payload.sub })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(secret());

  jar.set("harbor_session", next, { httpOnly: true, sameSite: "lax", path: "/" });
  return payload;
}`,
          },
          {
            type: "tool",
            name: "Read",
            path: "src/auth/session.ts",
            status: "done",
            content: `export const SESSION_TTL_SEC = 60 * 60 * 24 * 14; // 14d
export const REFRESH_WINDOW_SEC = 60 * 15;`,
          },
          {
            type: "text",
            text: "The 15-minute JWT is being re-signed on every `touchSession()` call, and `AUTH_SECRET` is baked at boot from a rolling deploy secret. Two failures: the cookie's max-age never matches the 14-day TTL, and a new secret invalidates in-flight checkouts. Sliding refresh should only fire inside the window, and verification needs to accept the previous secret.",
          },
          {
            type: "tool",
            name: "Edit",
            path: "src/auth/middleware.ts",
            status: "done",
            content: `--- a/src/auth/middleware.ts
+++ b/src/auth/middleware.ts
@@ -6,16 +6,28 @@
 export async function touchSession() {
   const jar = await cookies();
   const token = jar.get("harbor_session")?.value;
   if (!token) return null;
 
-  const { payload } = await jwtVerify(token, secret());
-  const next = await new SignJWT({ sub: payload.sub })
-    .setProtectedHeader({ alg: "HS256" })
-    .setExpirationTime("15m")
-    .sign(secret());
-
-  jar.set("harbor_session", next, { httpOnly: true, sameSite: "lax", path: "/" });
-  return payload;
+  const payload = await verifyWithFallback(token);
+  if (!payload) return null;
+
+  const exp = Number(payload.exp ?? 0);
+  const remaining = exp - Math.floor(Date.now() / 1000);
+  if (remaining > REFRESH_WINDOW_SEC) return payload;
+
+  const next = await mint(payload.sub as string);
+  jar.set("harbor_session", next, {
+    httpOnly: true,
+    sameSite: "lax",
+    path: "/",
+    maxAge: SESSION_TTL_SEC,
+  });
+  return payload;
 }`,
          },
          {
            type: "tool",
            name: "Write",
            path: "src/auth/verify.ts",
            status: "done",
            content: `export async function verifyWithFallback(token: string) {
  for (const key of [process.env.AUTH_SECRET, process.env.AUTH_SECRET_PREV]) {
    if (!key) continue;
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(key));
      return payload;
    } catch {
      /* try previous secret — rolling deploys */
    }
  }
  return null;
}`,
          },
          {
            type: "tool",
            name: "Bash",
            command: "npx vitest run src/auth/middleware.test.ts",
            status: "done",
            content: ` ✓ src/auth/middleware.test.ts (3)
   ✓ keeps cookie across secret rotation
   ✓ does not resign outside refresh window
   ✓ mints when remaining < 15m

 Test Files  1 passed (1)
      Tests  3 passed (3)`,
          },
          {
            type: "text",
            text: "Tests pass. I did not force a logout — in-flight sessions verify against `AUTH_SECRET_PREV` for one deploy, then slide onto the new secret inside the 15-minute window.\n\nOne thing I want your call on: should checkout skip `touchSession()` entirely and only refresh after a successful payment intent, so a slow 3-D Secure redirect can't race the cookie write?",
          },
        ],
      },
    ],
  },
  {
    id: "ses-codex-flake",
    title: "Stabilize checkout Playwright spec",
    providerId: "codex",
    projectId: "harbor",
    cwd: "~/src/harbor",
    model: "GPT-5.4 Codex",
    effort: "medium",
    status: "running",
    createdAt: ago(28),
    updatedAt: ago(1),
    turns: 1,
    messages: [
      {
        id: "m-x-u1",
        role: "user",
        createdAt: ago(28),
        blocks: [
          {
            type: "text",
            text: "tests/checkout.spec.ts is flaky on CI only — ~1/6 runs. Locally it's fine. Don't skip it. Find the race.",
          },
        ],
      },
      {
        id: "m-x-a1",
        role: "assistant",
        createdAt: ago(26),
        blocks: [
          {
            type: "tool",
            name: "Read",
            path: "tests/checkout.spec.ts",
            status: "done",
            content: `test("paying with a saved card reaches receipt", async ({ page }) => {
  await page.goto("/checkout");
  await page.getByTestId("pay").click();
  await expect(page.getByTestId("receipt")).toBeVisible();
});`,
          },
          {
            type: "tool",
            name: "Read",
            path: "src/checkout/usePay.ts",
            status: "done",
            content: `export function usePay() {
  const [pending, setPending] = useState(false);
  async function pay() {
    setPending(true);
    await stripe.confirmCardPayment(clientSecret);
    router.push("/checkout/receipt");
  }
  return { pay, pending };
}`,
          },
          {
            type: "text",
            text: "Race is in the client, not Playwright. `confirmCardPayment` resolves when Stripe has the intent, but the receipt route still reads a webhook-written row. CI is a few hundred ms slower, so the page renders the empty state and the assertion fires too early. Two fixes: wait on the receipt's ready flag, and don't navigate until the intent is `succeeded` on our side.",
          },
          {
            type: "tool",
            name: "Edit",
            path: "src/checkout/usePay.ts",
            status: "done",
            content: `--- a/src/checkout/usePay.ts
+++ b/src/checkout/usePay.ts
@@ -3,8 +3,11 @@
   async function pay() {
     setPending(true);
-    await stripe.confirmCardPayment(clientSecret);
-    router.push("/checkout/receipt");
+    const { paymentIntent } = await stripe.confirmCardPayment(clientSecret);
+    if (paymentIntent?.status !== "succeeded") {
+      throw new Error(paymentIntent?.status ?? "unconfirmed");
+    }
+    await api.waitForReceipt(paymentIntent.id);
+    router.push(\`/checkout/receipt?pi=\${paymentIntent.id}\`);
   }`,
          },
          {
            type: "tool",
            name: "Edit",
            path: "tests/checkout.spec.ts",
            status: "done",
            content: `--- a/tests/checkout.spec.ts
+++ b/tests/checkout.spec.ts
@@ -1,5 +1,8 @@
 test("paying with a saved card reaches receipt", async ({ page }) => {
   await page.goto("/checkout");
   await page.getByTestId("pay").click();
-  await expect(page.getByTestId("receipt")).toBeVisible();
+  await expect(page.getByTestId("receipt")).toBeVisible({ timeout: 15_000 });
+  await expect(page.getByTestId("receipt")).toHaveAttribute(
+    "data-ready",
+    "true",
+  );
 });`,
          },
          {
            type: "tool",
            name: "Bash",
            command: "npx playwright test tests/checkout.spec.ts --repeat-each=8",
            status: "running",
            content: `[1/8] passed
[2/8] passed
[3/8] passed
[4/8] passed`,
          },
        ],
      },
    ],
  },
  {
    id: "ses-cursor-keys",
    title: "Command palette keyboard map",
    providerId: "cursor",
    projectId: "atlas",
    cwd: "~/src/atlas",
    model: "Composer 2",
    effort: "medium",
    status: "idle",
    createdAt: ago(80),
    updatedAt: ago(18),
    turns: 2,
    messages: [
      {
        id: "m-u-u1",
        role: "user",
        createdAt: ago(80),
        blocks: [
          {
            type: "text",
            text: "Add a command palette to the atlas TUI. Cmd+K / Ctrl+K to open, j/k to move, enter to run, esc to close. Fuzzy filter on the existing command registry. Don't pull a crate if we can do it with the current crossterm stack.",
          },
        ],
      },
      {
        id: "m-u-a1",
        role: "assistant",
        createdAt: ago(74),
        blocks: [
          {
            type: "tool",
            name: "Read",
            path: "src/commands/registry.rs",
            status: "done",
            content: `pub struct Command {
    pub id: &'static str,
    pub title: &'static str,
    pub keys: &'static str,
    pub run: fn(&mut App),
}

pub static REGISTRY: &[Command] = &[
    Command { id: "file.save", title: "Save", keys: "ctrl+s", run: App::save },
    Command { id: "git.push", title: "Push", keys: "ctrl+shift+p", run: App::push },
];`,
          },
          {
            type: "tool",
            name: "Write",
            path: "src/ui/palette.rs",
            status: "done",
            content: `pub struct Palette {
    open: bool,
    query: String,
    cursor: usize,
}

impl Palette {
    pub fn on_key(&mut self, key: KeyEvent, app: &mut App) {
        match key.code {
            KeyCode::Char('k') if key.modifiers.contains(CTRL_OR_CMD) => self.open = true,
            KeyCode::Esc => self.close(),
            KeyCode::Char('j') => self.cursor += 1,
            KeyCode::Char('k') => self.cursor = self.cursor.saturating_sub(1),
            KeyCode::Enter => self.run_selected(app),
            KeyCode::Char(c) => self.query.push(c),
            KeyCode::Backspace => { self.query.pop(); }
            _ => {}
        }
    }

    fn filtered(&self) -> Vec<&Command> {
        REGISTRY.iter().filter(|c| fuzzy(&self.query, c.title)).collect()
    }
}`,
          },
          {
            type: "tool",
            name: "Edit",
            path: "src/app.rs",
            status: "done",
            content: `--- a/src/app.rs
+++ b/src/app.rs
@@ -18,6 +18,7 @@
 pub struct App {
     pub mode: Mode,
     pub git: Git,
+    pub palette: Palette,
 }`,
          },
          {
            type: "tool",
            name: "Bash",
            command: "cargo test palette -- --nocapture",
            status: "done",
            content: `running 4 tests
test ui::palette::opens_on_ctrl_k ... ok
test ui::palette::fuzzy_ranks_title_before_id ... ok
test ui::palette::enter_runs_selected ... ok
test ui::palette::esc_clears_query ... ok

test result: ok. 4 passed; 0 failed`,
          },
          {
            type: "text",
            text: "Palette is wired into `App` with the existing crossterm event loop — no new crate. Filter is a small subsequence fuzzy match on `REGISTRY` titles. j/k move, enter runs, esc closes and clears the query so the next Cmd+K is empty.\n\nCtrl/Cmd is the same modifier bit we already use for save. I left `ctrl+shift+p` on Push so it doesn't collide.",
          },
        ],
      },
    ],
  },
];
