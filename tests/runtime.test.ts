import { beforeAll, describe, expect, test } from "vitest";
import {
  compileConsumers,
  usePackageFixture,
} from "./helpers/package-fixture.js";
import { readRuntimeMatrix, runConsumer } from "./helpers/runtimes.js";

const getFixture = usePackageFixture();

beforeAll(() => {
  compileConsumers(getFixture().consumerDirectory);
});

for (const runtime of readRuntimeMatrix()) {
  describe(runtime.name, () => {
    test("loads packed ESM without capability access and rejects private paths", () => {
      const { consumerDirectory } = getFixture();
      const result = runConsumer(runtime, "consumer.js", consumerDirectory);
      expect(result).toEqual({ exports: [], privatePathBlocked: true });
    });

    if (runtime.kind !== "deno") {
      test("loads packed CommonJS without import side effects", () => {
        const { consumerDirectory } = getFixture();
        const result = runConsumer(
          runtime,
          "consumer-require.cjs",
          consumerDirectory,
        );
        expect(result).toEqual({ exports: [], privatePathBlocked: true });
      });
    }
  });
}
