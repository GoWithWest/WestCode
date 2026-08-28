import Foundation

enum Seed {
    static var sessions: [Session] {
        let t0 = Date()
        func ago(_ min: Double) -> Date { t0.addingTimeInterval(-min * 60) }
        return [
            Session(
                id: "ses-claude-auth",
                title: "Refresh session cookies in auth middleware",
                providerId: "claude", projectId: "harbor", cwd: "~/src/harbor",
                model: "Opus 4.7", effort: "high", status: .waiting,
                createdAt: ago(42), updatedAt: ago(2),
                messages: [
                    ChatMessage(
                        id: "m-c-u1", role: .user, createdAt: ago(42),
                        blocks: [.text("Session cookies die after a deploy even when the user is mid-checkout. The middleware in src/auth/middleware.ts looks like it's minting a new token every request. Fix it without forcing a logout, and add a test.")],
                        streaming: false
                    ),
                    ChatMessage(
                        id: "m-c-a1", role: .assistant, createdAt: ago(40),
                        blocks: [
                            .think("If cookies vanish on deploy, the signing secret is rotating or the refresh path is writing a blank session. Read the middleware and the cookie helper first."),
                            .tool(.init(name: "Read", path: "src/auth/middleware.ts", content: """
                            import { cookies } from "next/headers";
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
                            }
                            """, status: .done)),
                            .tool(.init(name: "Read", path: "src/auth/session.ts", content: """
                            export const SESSION_TTL_SEC = 60 * 60 * 24 * 14; // 14d
                            export const REFRESH_WINDOW_SEC = 60 * 15;
                            """, status: .done)),
                            .text("The 15-minute JWT is being re-signed on every `touchSession()` call, and `AUTH_SECRET` is baked at boot from a rolling deploy secret. Two failures: the cookie's max-age never matches the 14-day TTL, and a new secret invalidates in-flight checkouts. Sliding refresh should only fire inside the window, and verification needs to accept the previous secret."),
                            .tool(.init(name: "Edit", path: "src/auth/middleware.ts", content: """
                            --- a/src/auth/middleware.ts
                            +++ b/src/auth/middleware.ts
                            @@ -6,16 +6,28 @@
                             export async function touchSession() {
                               const jar = await cookies();
                               const token = jar.get("harbor_session")?.value;
                               if (!token) return null;
                            -  const { payload } = await jwtVerify(token, secret());
                            +  const payload = await verifyWithFallback(token);
                            +  if (!payload) return null;
                            +  const remaining = Number(payload.exp ?? 0) - Math.floor(Date.now() / 1000);
                            +  if (remaining > REFRESH_WINDOW_SEC) return payload;
                            +  const next = await mint(payload.sub as string);
                            +  jar.set("harbor_session", next, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL_SEC });
                            +  return payload;
                             }
                            """, status: .done)),
                            .tool(.init(name: "Bash", command: "npx vitest run src/auth/middleware.test.ts", content: """
                             ✓ src/auth/middleware.test.ts (3)
                               ✓ keeps cookie across secret rotation
                               ✓ does not resign outside refresh window
                               ✓ mints when remaining < 15m

                             Test Files  1 passed (1)
                                  Tests  3 passed (3)
                            """, status: .done)),
                            .text("Tests pass. I did not force a logout — in-flight sessions verify against `AUTH_SECRET_PREV` for one deploy, then slide onto the new secret inside the 15-minute window.\n\nOne thing I want your call on: should checkout skip `touchSession()` entirely and only refresh after a successful payment intent, so a slow 3-D Secure redirect can't race the cookie write?"),
                        ],
                        streaming: false
                    ),
                ],
                turns: 2
            ),
            Session(
                id: "ses-codex-flake",
                title: "Stabilize checkout Playwright spec",
                providerId: "codex", projectId: "harbor", cwd: "~/src/harbor",
                model: "GPT-5.4 Codex", effort: "medium", status: .running,
                createdAt: ago(28), updatedAt: ago(1),
                messages: [
                    ChatMessage(
                        id: "m-x-u1", role: .user, createdAt: ago(28),
                        blocks: [.text("tests/checkout.spec.ts is flaky on CI only — ~1/6 runs. Locally it's fine. Don't skip it. Find the race.")],
                        streaming: false
                    ),
                    ChatMessage(
                        id: "m-x-a1", role: .assistant, createdAt: ago(26),
                        blocks: [
                            .tool(.init(name: "Read", path: "tests/checkout.spec.ts", content: """
                            test("paying with a saved card reaches receipt", async ({ page }) => {
                              await page.goto("/checkout");
                              await page.getByTestId("pay").click();
                              await expect(page.getByTestId("receipt")).toBeVisible();
                            });
                            """, status: .done)),
                            .tool(.init(name: "Read", path: "src/checkout/usePay.ts", content: """
                            export function usePay() {
                              const [pending, setPending] = useState(false);
                              async function pay() {
                                setPending(true);
                                await stripe.confirmCardPayment(clientSecret);
                                router.push("/checkout/receipt");
                              }
                              return { pay, pending };
                            }
                            """, status: .done)),
                            .text("Race is in the client, not Playwright. `confirmCardPayment` resolves when Stripe has the intent, but the receipt route still reads a webhook-written row. CI is a few hundred ms slower, so the page renders the empty state and the assertion fires too early."),
                            .tool(.init(name: "Edit", path: "src/checkout/usePay.ts", content: """
                            --- a/src/checkout/usePay.ts
                            +++ b/src/checkout/usePay.ts
                            @@ -3,8 +3,11 @@
                               async function pay() {
                                 setPending(true);
                            -    await stripe.confirmCardPayment(clientSecret);
                            -    router.push("/checkout/receipt");
                            +    const { paymentIntent } = await stripe.confirmCardPayment(clientSecret);
                            +    if (paymentIntent?.status !== "succeeded") throw new Error(paymentIntent?.status ?? "unconfirmed");
                            +    await api.waitForReceipt(paymentIntent.id);
                            +    router.push(`/checkout/receipt?pi=${paymentIntent.id}`);
                               }
                            """, status: .done)),
                            .tool(.init(name: "Bash", command: "npx playwright test tests/checkout.spec.ts --repeat-each=8", content: """
                            [1/8] passed
                            [2/8] passed
                            [3/8] passed
                            [4/8] passed
                            """, status: .running)),
                        ],
                        streaming: false
                    ),
                ],
                turns: 1
            ),
            Session(
                id: "ses-cursor-keys",
                title: "Command palette keyboard map",
                providerId: "cursor", projectId: "atlas", cwd: "~/src/atlas",
                model: "Composer 2", effort: "medium", status: .idle,
                createdAt: ago(80), updatedAt: ago(18),
                messages: [
                    ChatMessage(
                        id: "m-u-u1", role: .user, createdAt: ago(80),
                        blocks: [.text("Add a command palette to the atlas TUI. Cmd+K / Ctrl+K to open, j/k to move, enter to run, esc to close. Fuzzy filter on the existing command registry. Don't pull a crate if we can do it with the current crossterm stack.")],
                        streaming: false
                    ),
                    ChatMessage(
                        id: "m-u-a1", role: .assistant, createdAt: ago(74),
                        blocks: [
                            .tool(.init(name: "Read", path: "src/commands/registry.rs", content: """
                            pub struct Command {
                                pub id: &'static str,
                                pub title: &'static str,
                                pub keys: &'static str,
                                pub run: fn(&mut App),
                            }
                            """, status: .done)),
                            .tool(.init(name: "Write", path: "src/ui/palette.rs", content: """
                            pub struct Palette {
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
                            }
                            """, status: .done)),
                            .tool(.init(name: "Bash", command: "cargo test palette -- --nocapture", content: """
                            running 4 tests
                            test ui::palette::opens_on_ctrl_k ... ok
                            test ui::palette::fuzzy_ranks_title_before_id ... ok
                            test ui::palette::enter_runs_selected ... ok
                            test ui::palette::esc_clears_query ... ok

                            test result: ok. 4 passed; 0 failed
                            """, status: .done)),
                            .text("Palette is wired into `App` with the existing crossterm event loop — no new crate. Filter is a small subsequence fuzzy match on `REGISTRY` titles. j/k move, enter runs, esc closes and clears the query so the next Cmd+K is empty."),
                        ],
                        streaming: false
                    ),
                ],
                turns: 2
            ),
        ]
    }
}
