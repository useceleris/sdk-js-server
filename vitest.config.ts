import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Celeris acceptance runs separately via vitest.celeris.config.ts.
    // Overriding exclude drops Vitest's defaults, so node_modules returns.
    exclude: ["tests/celeris/**", "**/node_modules/**"],
    globals: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
