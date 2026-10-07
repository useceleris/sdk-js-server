import { signingVectors } from "../fixtures/signing-vectors";
import { beforeAll, describe, expect, test } from "vitest";
import {
  compileConsumers,
  usePackageFixture,
} from "../helpers/package-fixture";
import { readRuntimeMatrix, runConsumer } from "../helpers/runtimes";

const getFixture = usePackageFixture();
const expectedExports = ["createCredentialProvider", "createSigner"];
const expectedCapabilityResult = {
  signedBeforeRemoval: true,
  code: "Configuration",
  safeMessage: true,
  messageLeaksSecret: false,
};
const expectedProviderResult = {
  initialReplay: false,
  initialChannels: ["room-1"],
  reconnectReplay: 30_000,
  reconnectTimestamp: 1_700_000_000_000,
  signatureLengthsEqual: true,
  abortedRejection: "consumer-abort-reason",
};

beforeAll(() => {
  compileConsumers(getFixture().consumerDirectory);
});

for (const runtime of readRuntimeMatrix()) {
  describe(runtime.name, () => {
    test("loads packed ESM without capability access and rejects private paths", () => {
      const { consumerDirectory } = getFixture();
      const result = runConsumer(runtime, "consumer.js", consumerDirectory);
      expect(result).toEqual({
        exports: expectedExports,
        privatePathBlocked: true,
      });
    });

    test("bridges the signer to the client provider contract (ESM)", () => {
      expect(
        runConsumer(
          runtime,
          "provider-consumer.js",
          getFixture().consumerDirectory,
        ),
      ).toEqual(expectedProviderResult);
    });

    test("reports missing TextEncoder through the installed package", () => {
      expect(
        runConsumer(
          runtime,
          "capability-consumer.js",
          getFixture().consumerDirectory,
        ),
      ).toEqual(expectedCapabilityResult);
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
          exports: expectedExports,
          privatePathBlocked: true,
        });
      });

      test("bridges the signer to the client provider contract (CommonJS)", () => {
        expect(
          runConsumer(
            runtime,
            "provider-consumer.cjs",
            getFixture().consumerDirectory,
          ),
        ).toEqual(expectedProviderResult);
      });
    }
  });
}
