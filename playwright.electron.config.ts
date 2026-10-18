import { defineConfig } from "@playwright/test";

// Packaged-app smoke test (macOS CI): no web server, Electron only.
export default defineConfig({
  testDir: "tests/electron",
  timeout: 120_000,
  reporter: [["list"]],
});
