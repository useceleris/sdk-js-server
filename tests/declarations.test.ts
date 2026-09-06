import { expect, test } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repositoryRoot, runCommand } from "./helpers/commands.js";
import { usePackageFixture } from "./helpers/package-fixture.js";

const getFixture = usePackageFixture();
const consumerModes = [
  { name: "esm", extension: "mts", module: "NodeNext", resolution: "NodeNext" },
  { name: "cjs", extension: "cts", module: "NodeNext", resolution: "NodeNext" },
  { name: "bundler", extension: "ts", module: "ESNext", resolution: "Bundler" },
];

test("latest TypeScript resolves installed ESM, CommonJS and bundler declarations", () => {
  const { consumerDirectory } = getFixture();
  const compilerDirectory = join(repositoryRoot, "node_modules/typescript");
  const compilerPackage = JSON.parse(
    readFileSync(join(compilerDirectory, "package.json"), "utf8"),
  );
  const compiler = join(compilerDirectory, compilerPackage.bin.tsc);

  for (const mode of consumerModes) {
    const filename = `consumer-${mode.name}.${mode.extension}`;
    const configuration = join(consumerDirectory, `tsconfig-${mode.name}.json`);
    writeFileSync(
      join(consumerDirectory, filename),
      'import * as server from "@useceleris/server"; void server;\n',
    );
    writeFileSync(
      configuration,
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: mode.module,
          moduleResolution: mode.resolution,
          strict: true,
          noEmit: true,
          types: [],
          lib: ["ES2022", "DOM"],
        },
        files: [filename],
      }),
    );

    expect(
      () =>
        runCommand(
          process.execPath,
          [compiler, "-p", configuration],
          consumerDirectory,
        ),
      mode.name,
    ).not.toThrow();
  }
});
