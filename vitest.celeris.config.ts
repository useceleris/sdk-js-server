import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Credentials and the target URL come from a local .env (gitignored).
// Point CELERIS_WS_URL at any stack — local or deployed — to run there.
if (existsSync(".env")) process.loadEnvFile(".env");

// Celeris acceptance suites run against a real server stack and stay
// separate from the local evidence in vitest.config.ts. Stack recipe:
// ../sdk-js-client/docs/testing.md, "C8 Celeris qualification".
export default defineConfig({
  test: {
    include: ["tests/celeris/**/*.test.ts"],
    globals: false,
    testTimeout: 30_000,
    // The runtime suite's package fixture builds and packs both sibling
    // repositories in beforeAll.
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
