import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repositoryRoot } from "../helpers/commands.js";
import { usePackageFixture } from "../helpers/package-fixture.js";

const getFixture = usePackageFixture();
const expectedFiles = [
  "dist/index.js",
  "dist/index.d.ts",
  "dist/index.cjs",
  "dist/index.d.cts",
  "README.md",
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

    const manifest = JSON.parse(
      readFileSync(join(repositoryRoot, "package.json"), "utf8"),
    );
    expect(manifest.name).toBe("@useceleris/server");
    expect(manifest.private).toBe(true);
    expect(manifest.dependencies ?? {}).toEqual({});
    expect(manifest.peerDependencies ?? {}).toEqual({});
  });
});
