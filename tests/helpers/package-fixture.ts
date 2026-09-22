import { afterAll, beforeAll } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { repositoryRoot, runNpm } from "./commands";

// The unpublished @useceleris/client dependency (DEP-01) is satisfied from
// the sibling repository's packed tarball, never from a registry.
const clientRepositoryRoot = resolve(repositoryRoot, "../sdk-js-client");

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
}

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
  }

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
}

function prepareFixture(temporaryDirectory: string): PackageFixture {
  runNpm(["run", "build"]);
  runNpm(["run", "build"], clientRepositoryRoot);
  const artifact = packPackage(temporaryDirectory);
  const clientArtifact = packPackage(temporaryDirectory, clientRepositoryRoot);
  const consumerDirectory = join(temporaryDirectory, "consumer");

  mkdirSync(consumerDirectory, { recursive: true });
  writeFileSync(
    join(consumerDirectory, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  // One install with both tarballs so the client dependency resolves from
  // the provided artifact instead of a registry lookup.
  runNpm(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      join(temporaryDirectory, artifact.filename),
      join(temporaryDirectory, clientArtifact.filename),
    ],
    consumerDirectory,
  );

  return {
    consumerDirectory,
    packedFiles: artifact.files.map((file) => file.path),
  };
}

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
}
