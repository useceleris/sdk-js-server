import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { builtinModules } from "node:module";
import {
  mkdirSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scratch = mkdtempSync(join(tmpdir(), "celeris-server-tests-"));
const consumer = join(scratch, "consumer");
const npmCli = process.env.npm_execpath;
if (!npmCli)
  throw new Error("Run tests through npm test (npm_execpath required)");
interface Runtime {
  name: string;
  kind: "node" | "bun" | "deno";
  command: string;
}
const configured: unknown = process.env.CELERIS_RUNTIME_MATRIX
  ? JSON.parse(process.env.CELERIS_RUNTIME_MATRIX)
  : [
      { name: "node", kind: "node", command: process.execPath },
      { name: "bun", kind: "bun", command: "bun" },
      { name: "deno", kind: "deno", command: "deno" },
    ];
if (!Array.isArray(configured) || configured.length === 0)
  throw new Error("Runtime matrix must be a nonempty array");
for (const entry of configured) {
  if (
    !entry ||
    typeof entry.name !== "string" ||
    typeof entry.command !== "string" ||
    !["node", "bun", "deno"].includes(entry.kind)
  )
    throw new Error("Invalid runtime matrix entry");
}
const runtimes = configured as Runtime[];
function execute(command: string, args: string[], cwd = root): string {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 60_000,
    env: { ...process.env, NO_COLOR: "1" },
  }).trim();
}
function npm(args: string[], cwd = root): string {
  return execute(process.execPath, [npmCli!, ...args], cwd);
}
let packedFiles: string[] = [];

beforeAll(() => {
  npm(["run", "build"]);
  const packed = JSON.parse(
    npm(["pack", "--json", "--pack-destination", scratch]),
  ) as { filename: string; files: { path: string }[] }[];
  const artifact = packed[0];
  if (!artifact) throw new Error("npm pack returned no artifact");
  packedFiles = artifact.files.map((file) => file.path);
  mkdirSync(consumer, { recursive: true });
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  const fixtureCompiler = (entries: string[], format: string) =>
    npm([
      "exec",
      "--no",
      "--",
      "tsdown",
      ...entries.map((entry) => join(root, "tests/fixtures", entry)),
      "--format",
      format,
      "--platform",
      "neutral",
      "--target",
      "es2022",
      "--out-dir",
      consumer,
      "--no-clean",
      "--no-dts",
      "--no-treeshake",
      "--deps.never-bundle",
      "@useceleris/server",
      "--deps.never-bundle",
      "@useceleris/server/dist/index.cjs",
    ]);
  fixtureCompiler(["consumer.ts", "capabilities.ts"], "esm");
  fixtureCompiler(["consumer-require.ts"], "cjs");
  npm(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      join(scratch, artifact.filename),
    ],
    consumer,
  );
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesBelow(join(directory, entry.name))
      : [join(directory, entry.name)],
  );
}

describe("portable package boundary", () => {
  test("contains only distributable files and both module declarations", () => {
    expect(packedFiles).toEqual(
      expect.arrayContaining([
        "dist/index.js",
        "dist/index.d.ts",
        "dist/index.cjs",
        "dist/index.d.cts",
        "README.md",
        "package.json",
      ]),
    );
    expect(
      packedFiles.every(
        (file) =>
          file.startsWith("dist/") ||
          ["README.md", "package.json"].includes(file),
      ),
    ).toBe(true);
    const manifest = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    );
    expect(manifest.name).toBe("@useceleris/server");
    expect(manifest.private).toBe(true);
    expect(manifest.dependencies ?? {}).toEqual({});
    expect(manifest.peerDependencies ?? {}).toEqual({});
  });
  test("portable source and output contain no runtime-specific dependencies or globals", () => {
    const builtins = new Set(
      builtinModules.map((name) => name.replace(/^node:/, "")),
    );
    for (const file of [
      ...filesBelow(join(root, "src")),
      ...filesBelow(join(root, "dist")),
    ].filter((file) => /\.(?:[cm]?ts|[cm]?js)$/.test(file))) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(
        /\b(?:Buffer|process|Bun|Deno|NodeJS)\b|\bnode:/,
      );
      for (const match of source.matchAll(
        /(?:from\s*|import\s*\(|require\s*\()?["']([^"']+)["']/g,
      )) {
        expect(builtins.has(match[1]!), file).toBe(false);
      }
    }
    expect(
      JSON.parse(readFileSync(join(root, "tsconfig.json"), "utf8"))
        .compilerOptions.types,
    ).toEqual([]);
  });
  test("latest TypeScript resolves installed ESM, CommonJS and bundler declarations", () => {
    const compilerPackage = JSON.parse(
      readFileSync(join(root, "node_modules/typescript/package.json"), "utf8"),
    );
    const compiler = join(
      root,
      "node_modules/typescript",
      compilerPackage.bin.tsc,
    );
    for (const [mode, extension, module, resolution] of [
      ["esm", "mts", "NodeNext", "NodeNext"],
      ["cjs", "cts", "NodeNext", "NodeNext"],
      ["bundler", "ts", "ESNext", "Bundler"],
    ]) {
      const filename = `consumer-${mode}.${extension}`;
      writeFileSync(
        join(consumer, filename),
        'import * as server from "@useceleris/server"; void server;\n',
      );
      const config = join(consumer, `tsconfig-${mode}.json`);
      writeFileSync(
        config,
        JSON.stringify({
          compilerOptions: {
            target: "ES2022",
            module,
            moduleResolution: resolution,
            strict: true,
            noEmit: true,
            types: [],
            lib: ["ES2022", "DOM"],
          },
          files: [filename],
        }),
      );
      execute(process.execPath, [compiler, "-p", config], consumer);
    }
  });
  test("clean build regenerates export targets", () => {
    writeFileSync(join(root, "dist/stale-output.txt"), "obsolete");
    npm(["run", "build"]);
    expect(existsSync(join(root, "dist/stale-output.txt"))).toBe(false);
    for (const file of packedFiles.filter((file) => file.startsWith("dist/")))
      expect(existsSync(join(root, file))).toBe(true);
  });
});

for (const runtime of runtimes) {
  describe(runtime.name, () => {
    test("runtime exists and satisfies its compatibility floor", () => {
      const version = execute(runtime.command, ["--version"]);
      const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
      expect(match, version).not.toBeNull();
      const actual = match!.slice(1, 4).map(Number);
      const minimum = { node: [22, 15, 0], bun: [1, 3, 0], deno: [2, 5, 0] }[
        runtime.kind
      ];
      const compare = actual.reduce(
        (result, number, index) => result || number - minimum[index]!,
        0,
      );
      expect(compare, version).toBeGreaterThanOrEqual(0);
      console.info(`${runtime.name}: ${version.split("\n")[0]}`);
    });
    test("loads packed ESM with no capability access and rejects private paths", () => {
      const args =
        runtime.kind === "deno"
          ? ["run", "--no-config", "--node-modules-dir=manual", "consumer.js"]
          : ["consumer.js"];
      const result = JSON.parse(execute(runtime.command, args, consumer));
      expect(result).toEqual({ imported: true, privatePathBlocked: true });
    });
    if (runtime.kind !== "deno")
      test("loads packed CommonJS without import side effects", () => {
        expect(
          JSON.parse(
            execute(runtime.command, ["consumer-require.cjs"], consumer),
          ),
        ).toEqual({ imported: true, privatePathBlocked: true });
      });
    test("executes independent Web Crypto and standard API probes", () => {
      const args =
        runtime.kind === "deno"
          ? ["run", "--no-config", "capabilities.js"]
          : ["capabilities.js"];
      const result = JSON.parse(execute(runtime.command, args, consumer));
      expect(result.utf8).toBe(true);
      expect(result.cancellation).toBe(true);
      expect(result.hmac).toHaveLength(128);
    });
  });
}
