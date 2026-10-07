import { expect, test } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repositoryRoot, runCommand } from "../helpers/commands";

// Every TypeScript snippet in EXAMPLES.md must keep compiling against the
// public surface, so the document cannot drift from the implementation.
test("EXAMPLES.md snippets compile against the public surface", () => {
  const document = readFileSync(join(repositoryRoot, "EXAMPLES.md"), "utf8");
  const snippets = [...document.matchAll(/```ts\n([\s\S]*?)```/g)].map(
    (match) => match[1]!,
  );
  expect(snippets.length).toBeGreaterThanOrEqual(4);

  // Snippet-local import lines are stripped; one canonical preamble import
  // covers every public name the snippets use.
  const wrappedSnippets = snippets.map((snippet, index) => {
    const body = snippet
      .split("\n")
      .filter((line) => !/^import[ {]/.test(line))
      .join("\n");

    return `async function snippet${index}(): Promise<void> {\n${body}\n}\nvoid snippet${index};\n`;
  });

  const preamble = [
    'import { createSigner, createCredentialProvider } from "@useceleris/server";',
    'import type { Signer, SegmentPermissions } from "@useceleris/server";',
    'import { createClient } from "@useceleris/client";',
    "type AppRequest = {",
    "  json(): Promise<{ channelReference: string; replayLookbackMs?: number }>;",
    "};",
    "type AppResponse = unknown;",
    "type AppUser = {",
    "  mayAccessChannel(reference: string): boolean;",
    "  tokenReference: string;",
    "};",
    "declare function authenticate(request: AppRequest): Promise<AppUser>;",
    "declare function forbidden(): AppResponse;",
    "declare function json(value: unknown): AppResponse;",
    "declare function derivePermissionsFor(",
    "  user: AppUser,",
    "  channelReference: string,",
    "): SegmentPermissions;",
    "declare const process: { env: Record<string, string | undefined> };",
    "declare const signer: Signer;",
    "void createSigner;",
    "void createCredentialProvider;",
    "void createClient;",
  ].join("\n");

  const directory = mkdtempSync(join(tmpdir(), "celeris-server-examples-"));

  try {
    writeFileSync(
      join(directory, "snippets.ts"),
      `${preamble}\n\n${wrappedSnippets.join("\n")}`,
    );

    writeFileSync(
      join(directory, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          noEmit: true,
          types: [],
          lib: ["ES2022", "DOM"],
          skipLibCheck: false,
          paths: {
            "@useceleris/server": [
              join(repositoryRoot, "src/index.ts").replaceAll("\\", "/"),
            ],
            "@useceleris/client": [
              join(
                repositoryRoot,
                "node_modules/@useceleris/client/dist/index.d.ts",
              ).replaceAll("\\", "/"),
            ],
          },
        },
        files: ["snippets.ts"],
      }),
    );

    const compilerDirectory = join(repositoryRoot, "node_modules/typescript");
    const compilerPackage = JSON.parse(
      readFileSync(join(compilerDirectory, "package.json"), "utf8"),
    ) as { bin: { tsc: string } };
    expect(() =>
      runCommand(
        process.execPath,
        [join(compilerDirectory, compilerPackage.bin.tsc), "-p", directory],
        directory,
      ),
    ).not.toThrow();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
