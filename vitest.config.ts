import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests run the pure lib/ and desktop/ modules in Node — no TanStack
// plugins, no Electron.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.{ts,mjs}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    environment: "node",
  },
});
