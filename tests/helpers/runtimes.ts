import { runCommand } from "./commands.js";

export type RuntimeKind = "node" | "bun" | "deno";
export interface Runtime {
  name: string;
  kind: RuntimeKind;
  command: string;
}

function isRuntime(value: unknown): value is Runtime {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.name === "string" &&
    entry.name.length > 0 &&
    typeof entry.command === "string" &&
    entry.command.length > 0 &&
    (entry.kind === "node" || entry.kind === "bun" || entry.kind === "deno")
  );
}

export function readRuntimeMatrix(): Runtime[] {
  const configuration = process.env.CELERIS_RUNTIME_MATRIX;
  const entries: unknown = configuration
    ? JSON.parse(configuration)
    : [
        { name: "node", kind: "node", command: process.execPath },
        { name: "bun", kind: "bun", command: "bun" },
        { name: "deno", kind: "deno", command: "deno" },
      ];
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("Runtime matrix must be a nonempty array");
  }
  const runtimes: Runtime[] = [];
  for (const entry of entries) {
    if (!isRuntime(entry)) {
      throw new Error("Invalid runtime matrix entry");
    }
    runtimes.push(entry);
  }
  return runtimes;
}

export function runConsumer(
  runtime: Runtime,
  filename: string,
  directory: string,
): unknown {
  const argumentsList =
    runtime.kind === "deno"
      ? ["run", "--no-config", "--node-modules-dir=manual", filename]
      : [filename];
  return JSON.parse(runCommand(runtime.command, argumentsList, directory));
}
