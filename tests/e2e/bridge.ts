/**
 * A scripted window.westcode for E2E. Turns replay recorded ACP sessions
 * (tests/fixtures/*.jsonl) through the REAL desktop mapper (acp-map.mjs), so
 * a test exercises mapper → store → UI exactly as the Electron app does,
 * minus the child process.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
// @ts-expect-error — plain .mjs module from the Electron side
import { mapUpdate } from "../../desktop/acp-map.mjs";

export type Turn = {
  /** Events (already mapped) to emit, in order. */
  events: Record<string, unknown>[];
  /** Ask for permission before emitting events[at]. */
  permissionAt?: number;
  permission?: Record<string, unknown>;
};

export function fixtureEvents(name: string): Record<string, unknown>[] {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", name), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => mapUpdate(JSON.parse(l)))
    .filter((e: { type: string }) => e.type !== "noop");
}

export type BridgeOpts = {
  /** Scripted turns, consumed one per prompt (last one repeats). */
  turns?: Turn[];
  state?: Record<string, unknown>;
  skills?: Record<string, string[]>;
  /** Milliseconds between emitted events. */
  pace?: number;
  westcreate?: Record<string, unknown> | null;
};

export async function installBridge(page: Page, opts: BridgeOpts = {}) {
  await page.addInitScript((o: BridgeOpts) => {
    const listeners = new Set<(e: unknown) => void>();
    const calls: { method: string; payload: unknown }[] = [];
    const saved: Record<string, unknown> = { ...(o.state ?? {}) };
    let turn = 0;
    let pendingPermission: ((optionId: string) => void) | null = null;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const emit = (e: unknown) => listeners.forEach((fn) => fn(e));
    const skills = o.skills ?? {};
    (window as unknown as { __westcode: unknown }).__westcode = { calls, saved };
    const ok = async () => ({ ok: true, output: "" });
    (window as unknown as { westcode: unknown }).westcode = {
      desktop: true,
      probe: async () =>
        ["claude", "grok", "codex"].map((id) => ({
          id,
          name: id,
          binary: id,
          found: true,
          path: `/usr/local/bin/${id}`,
          version: "1.0.0",
          loggedIn: true,
          connected: true,
          install: "",
          installAlt: null,
          detail: "",
        })),
      library: async (providerId: string) =>
        (skills[providerId] ?? []).map((name) => ({
          id: `${providerId}-skill-${name}`,
          kind: "skill",
          name,
          source: "test",
          summary: `${name} skill`,
          providers: [providerId],
        })),
      addonAction: ok,
      addonMcpAdd: ok,
      registrySearch: async () => ({ ok: true, servers: [] }),
      updates: async () => [],
      updateCli: ok,
      installCli: ok,
      login: ok,
      logout: ok,
      pickFolder: async () => null,
      pickFile: async () => null,
      saveText: ok,
      installSkillFile: ok,
      gitStatus: async () => ({ repo: true, branch: "main", adds: 1, dels: 1, files: 1, ahead: 0, behind: 0, remote: "" }),
      apiPrompt: async () => ({ ok: false, error: "no api in tests" }),
      setSecret: ok,
      stateLoad: async () => saved,
      stateSave: async (key: string, value: unknown) => {
        saved[key] = value;
        return { ok: true };
      },
      setLoginItem: ok,
      openEditor: ok,
      onScheduleFire: () => () => {},
      cliSessions: async () => ({ ok: true, sessions: [], errors: [] }),
      openSession: async () => ({ ok: true, history: [] }),
      westcreate: o.westcreate === undefined ? undefined : async () => o.westcreate,
      prompt: async (payload: { sessionId: string }) => {
        calls.push({ method: "prompt", payload });
        const turns = o.turns ?? [];
        const t = turns[Math.min(turn, turns.length - 1)];
        turn++;
        const sid = payload.sessionId;
        emit({ sessionId: sid, type: "ready", agentSessionId: `agent-${sid}` });
        if (!t) {
          emit({ sessionId: sid, type: "text", text: "ok" });
          emit({ sessionId: sid, type: "done" });
          return { ok: true };
        }
        for (let i = 0; i < t.events.length; i++) {
          if (t.permissionAt === i) {
            const answered = new Promise<string>((r) => (pendingPermission = r));
            emit({ sessionId: sid, type: "permission", rpcId: 7, ...(t.permission ?? {}) });
            const choice = await answered;
            calls.push({ method: "permission-answer", payload: choice });
          }
          emit({ sessionId: sid, ...t.events[i] });
          await sleep(o.pace ?? 15);
        }
        emit({ sessionId: sid, type: "done" });
        return { ok: true };
      },
      cancel: ok,
      stopSession: ok,
      permission: async (p: { optionId: string }) => {
        pendingPermission?.(p.optionId);
        pendingPermission = null;
        return { ok: true };
      },
      onEvent: (fn: (e: unknown) => void) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      onMenu: () => () => {},
      syncDesk: () => {},
      onDeskDeliver: () => () => {},
      deskDelivered: () => {},
      window: { close() {}, minimize() {}, maximize() {} },
    };
  }, opts);
}

export async function promptCalls(page: Page): Promise<{ text: string }[]> {
  return page.evaluate(() =>
    (window as unknown as { __westcode: { calls: { method: string; payload: { text: string } }[] } }).__westcode.calls
      .filter((c) => c.method === "prompt")
      .map((c) => c.payload),
  );
}
