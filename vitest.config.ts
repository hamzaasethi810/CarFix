import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Tests exercise the server modules directly; the client-side guard in
    // `server-only` would otherwise refuse to load them.
    alias: { "server-only": new URL("./tests/server-only-stub.ts", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    fileParallelism: false,
    testTimeout: 30_000,
    setupFiles: ["tests/setup.ts"],
  },
});
