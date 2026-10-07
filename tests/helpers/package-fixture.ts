import { afterAll, beforeAll } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repositoryRoot, runNpm } from "./commands";

interface PackedArtifact {
  filename: string;
  files: { path: string }[];
}

export interface PackageFixture {
  consumerDirectory: string;
  packedFiles: string[];
}

function packPackage(
  destination: string,
  workingDirectory = repositoryRoot,
): PackedArtifact {
  const output = runNpm(
    ["pack", "--json", "--pack-destination", destination],
    workingDirectory,
  );
  const artifacts = JSON.parse(output) as PackedArtifact[];
  const artifact = artifacts[0];

  if (!artifact) {
    throw new Error("npm pack returned no artifact");
  }

  return artifact;
} // end function packPackage

export function compileConsumers(consumerDirectory: string): void {
  function compile(entries: string[], format: "esm" | "cjs"): void {
    const entryPaths = entries.map((entry) =>
      join(repositoryRoot, "tests/fixtures", entry),
    );
    runNpm([
      "exec",
      "--no",
      "--",
      "tsdown",
      ...entryPaths,
      "--format",
      format,
      "--platform",
      "neutral",
      "--target",
      "es2022",
      "--out-dir",
      consumerDirectory,
      "--no-clean",
      "--no-dts",
      "--no-treeshake",
      "--deps.never-bundle",
      "@useceleris/server",
      "--deps.never-bundle",
      "@useceleris/server/dist/index.cjs",
    ]);
  } // end function compile

  // Keep imports external so consumers exercise the installed tarball.
  compile(
    [
      "consumer.ts",
      "signing-consumer.ts",
      "provider-consumer.ts",
      "capability-consumer.ts",
    ],
    "esm",
  );

  compile(
    ["consumer-require.ts", "signing-consumer.ts", "provider-consumer.ts"],
    "cjs",
  );
} // end function compileConsumers

function prepareFixture(temporaryDirectory: string): PackageFixture {
  runNpm(["run", "build"]);
  const artifact = packPackage(temporaryDirectory);
  const consumerDirectory = join(temporaryDirectory, "consumer");

  mkdirSync(consumerDirectory, { recursive: true });
  writeFileSync(
    join(consumerDirectory, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );

  // Install this package's tarball exactly as a consumer would; npm installs
  // its @useceleris/client peer dependency from the registry.
  runNpm(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      join(temporaryDirectory, artifact.filename),
    ],
    consumerDirectory,
  );

  return {
    consumerDirectory,
    packedFiles: artifact.files.map((file) => file.path),
  };
} // end function prepareFixture

// Each suite owns its temporary install, including cleanup after setup failures.
export function usePackageFixture(): () => PackageFixture {
  let temporaryDirectory: string | undefined;
  let fixture: PackageFixture | undefined;

  beforeAll(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), "celeris-server-tests-"));
    fixture = prepareFixture(temporaryDirectory);
  });

  afterAll(() => {
    if (temporaryDirectory) {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  return () => {
    if (!fixture) {
      throw new Error("Package fixture requested before setup completed");
    }

    return fixture;
  };
} // end function usePackageFixture
