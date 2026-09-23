import { beforeAll, describe, expect, test } from "vitest";
import { join } from "node:path";
import { repositoryRoot, runCommand, runNpm } from "../helpers/commands";
import { usePackageFixture } from "../helpers/package-fixture";
import { readRuntimeMatrix } from "../helpers/runtimes";
import { clientId, signingSecret, websocketUrl } from "./helpers/environment";

const getFixture = usePackageFixture();
const runtimes = readRuntimeMatrix();

beforeAll(() => {
  // Fail loudly before paying the pack+install when the stack is absent.
  websocketUrl();
  clientId();
  signingSecret();

  // Compiled here (not in compileConsumers) because this consumer must keep
  // BOTH installed packages external.
  runNpm([
    "exec",
    "--no",
    "--",
    "tsdown",
    join(repositoryRoot, "tests/fixtures/live-consumer.ts"),
    "--format",
    "esm",
    "--platform",
    "neutral",
    "--target",
    "es2022",
    "--out-dir",
    getFixture().consumerDirectory,
    "--no-clean",
    "--no-dts",
    "--no-treeshake",
    "--deps.never-bundle",
    "@useceleris/server",
    "--deps.never-bundle",
    "@useceleris/client",
  ]);
});

describe("celeris installed artifacts", () => {
  test("runs the live consumer on every configured runtime", () => {
    const { consumerDirectory } = getFixture();

    for (const runtime of runtimes) {
      const argumentsList =
        runtime.kind === "deno"
          ? [
              "run",
              "--allow-net",
              "--allow-env",
              "--no-config",
              "--node-modules-dir=manual",
              "live-consumer.js",
            ]
          : ["live-consumer.js"];
      const result = JSON.parse(
        runCommand(runtime.command, argumentsList, consumerDirectory),
      ) as Record<string, unknown>;

      expect(result, `${runtime.name} live consumer`).toMatchObject({
        ok: true,
        delivered: 1,
        idAssigned: true,
      });
      expect(
        result.presentCount,
        `${runtime.name} presence count`,
      ).toBeGreaterThanOrEqual(1);
    }
  });
});
