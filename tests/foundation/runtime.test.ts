import { signingVectors } from "../fixtures/signing-vectors";
import { beforeAll, describe, expect, test } from "vitest";
import {
  compileConsumers,
  usePackageFixture,
} from "../helpers/package-fixture";
import { readRuntimeMatrix, runConsumer } from "../helpers/runtimes";

const getFixture = usePackageFixture();

beforeAll(() => {
  compileConsumers(getFixture().consumerDirectory);
});

for (const runtime of readRuntimeMatrix()) {
  describe(runtime.name, () => {
    test("loads packed ESM without capability access and rejects private paths", () => {
      const { consumerDirectory } = getFixture();
      const result = runConsumer(runtime, "consumer.js", consumerDirectory);
      expect(result).toEqual({
        exports: ["createSigner"],
        privatePathBlocked: true,
      });
    });

    test("signs fixed vectors through the installed ESM package", () => {
      expect(
        runConsumer(
          runtime,
          "signing-consumer.js",
          getFixture().consumerDirectory,
        ),
      ).toEqual(signingVectors.map((vector) => vector.expected));
    });

    if (runtime.kind !== "deno") {
      test("signs fixed vectors through the installed CommonJS package", () => {
        expect(
          runConsumer(
            runtime,
            "signing-consumer.cjs",
            getFixture().consumerDirectory,
          ),
        ).toEqual(signingVectors.map((vector) => vector.expected));
      });
      test("loads packed CommonJS without import side effects", () => {
        const { consumerDirectory } = getFixture();
        const result = runConsumer(
          runtime,
          "consumer-require.cjs",
          consumerDirectory,
        );
        expect(result).toEqual({
          exports: ["createSigner"],
          privatePathBlocked: true,
        });
      });
    }
  });
}
