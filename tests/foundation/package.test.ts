import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repositoryRoot } from "../helpers/commands";
import { usePackageFixture } from "../helpers/package-fixture";

const getFixture = usePackageFixture();
const expectedFiles = [
  "dist/index.js",
  "dist/index.d.ts",
  "dist/index.cjs",
  "dist/index.d.cts",
  "README.md",
  "LICENSE",
  "package.json",
];

describe("package contents", () => {
  test("contains only distributable files and both module declarations", () => {
    const { packedFiles } = getFixture();
    expect(packedFiles).toEqual(expect.arrayContaining(expectedFiles));
    for (const file of packedFiles) {
      const isDistributable =
        file.startsWith("dist/") || expectedFiles.includes(file);
      expect(isDistributable, file).toBe(true);
    }
  });

  // AUTH-05: a browser bundle built from the client can never reach the
  // signing surface — verified against the installed packed client artifact.
  test("installed client artifact excludes the signing surface", () => {
    const { consumerDirectory } = getFixture();
    const clientRoot = join(
      consumerDirectory,
      "node_modules/@useceleris/client",
    );
    const clientManifest = JSON.parse(
      readFileSync(join(clientRoot, "package.json"), "utf8"),
    );
    expect(Object.keys(clientManifest.dependencies ?? {})).toEqual(["zod"]);

    for (const bundle of ["dist/index.js", "dist/index.cjs"]) {
      const contents = readFileSync(join(clientRoot, bundle), "utf8");
      for (const marker of [
        "@useceleris/server",
        "createSigner",
        "signingSecret",
        "@noble/hashes",
        "@scure/base",
      ]) {
        expect(contents, `${bundle} must not contain ${marker}`).not.toContain(
          marker,
        );
      }
    }
  });

  test("runtime bundles contain no client code (type-only dependency)", () => {
    getFixture();
    for (const bundle of ["dist/index.js", "dist/index.cjs"]) {
      const contents = readFileSync(join(repositoryRoot, bundle), "utf8");
      expect(contents, bundle).not.toContain("@useceleris/client");
    }
  });
});
