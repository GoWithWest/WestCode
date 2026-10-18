import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fakeWestcreate, PNG_1PX } from "./fake-westcreate";
// @ts-expect-error — plain .mjs module from the Electron side
import * as wc from "../desktop/westcreate.mjs";

afterEach(() => {
  delete process.env.WESTCREATE_HOME;
});

describe("WestCreate snapshot (read-only)", () => {
  it.each([false, true])("reads drawing, job, machine and the picture (sse=%s)", async (sse) => {
    const fake = await fakeWestcreate({ sse });
    process.env.WESTCREATE_HOME = fake.home;
    const s = await wc.snapshot();
    await fake.close();
    expect(s).toMatchObject({ ok: true, installed: true, bridge: true, running: true, mode: "desktop" });
    expect(s.tools).toEqual(["describe_app", "get_view", "run", "machine"]);
    expect(s.document.name).toBe("Box 100x60x40");
    expect(s.job.timeSeconds).toBe(312);
    expect(s.machine.state).toBe("Idle");
    expect(s.view).toBe(`data:image/png;base64,${PNG_1PX}`);
    // Only reads: no command was run, nothing was changed.
    expect(fake.calls.filter((c) => c.startsWith("tools/call"))).toEqual(["tools/call get_view"]);
  });

  it("reports a closed app (dead pid) without calling it", async () => {
    const home = mkdtempSync(join(tmpdir(), "wc-closed-"));
    writeFileSync(join(home, "mcp.json"), JSON.stringify({ url: "http://127.0.0.1:1/mcp", token: "x", pid: 2 ** 22 + 12345 }));
    process.env.WESTCREATE_HOME = home;
    expect(await wc.snapshot()).toMatchObject({ ok: true, installed: true, bridge: false, running: false });
  });

  it("refuses endpoints that are not on loopback", () => {
    const home = mkdtempSync(join(tmpdir(), "wc-remote-"));
    writeFileSync(join(home, "mcp.json"), JSON.stringify({ url: "http://evil.example/mcp", token: "x" }));
    process.env.WESTCREATE_HOME = home;
    expect(wc.readEndpoint()).toBeNull();
  });
});

describe("session MCP server", () => {
  it("is offered when the bridge exists, with Electron-as-node when there is no node", () => {
    const home = mkdtempSync(join(tmpdir(), "wc-home-"));
    process.env.WESTCREATE_HOME = home;
    expect(wc.sessionServer("/usr/bin/node", "/App/WestCode")).toBeNull();
    mkdirSync(join(home, "bin"), { recursive: true });
    writeFileSync(join(home, "bin", "westcreate-mcp.mjs"), "");
    expect(wc.sessionServer("/usr/bin/node", "/App/WestCode")).toEqual({
      type: "stdio",
      name: "westcreate",
      command: "/usr/bin/node",
      args: [join(home, "bin", "westcreate-mcp.mjs")],
      env: [],
    });
    expect(wc.sessionServer(null, "/App/WestCode").env).toEqual([{ name: "ELECTRON_RUN_AS_NODE", value: "1" }]);
  });

  it("detects a CLI that already registered it", () => {
    const home = mkdtempSync(join(tmpdir(), "wc-cli-"));
    writeFileSync(join(home, ".claude.json"), JSON.stringify({ mcpServers: { westcreate: { command: "node" } } }));
    mkdirSync(join(home, ".codex"));
    writeFileSync(join(home, ".codex", "config.toml"), 'model = "x"\n\n[mcp_servers.westcreate]\ncommand = "node"\n');
    expect(wc.cliHasWestcreate("claude", home)).toBe(true);
    expect(wc.cliHasWestcreate("codex", home)).toBe(true);
    expect(wc.cliHasWestcreate("claude", mkdtempSync(join(tmpdir(), "wc-empty-")))).toBe(false);
  });
});
