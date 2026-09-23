import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { createClient } from "@useceleris/client";
import { repositoryRoot, runCommand, runNpm } from "../helpers/commands";
import { usePackageFixture } from "../helpers/package-fixture";
import { readRuntimeMatrix } from "../helpers/runtimes";
import { clientId, signingSecret, websocketUrl } from "./helpers/environment";

const getFixture = usePackageFixture();
const runtimes = readRuntimeMatrix();
const endpointPort = 34_517;
// The credential endpoint authorizes exactly this channel for its demo user.
const endpointChannel = "room-42";
let endpoint: ChildProcess | undefined;

function compileExample(name: string, consumerDirectory: string): void {
  runNpm([
    "exec",
    "--no",
    "--",
    "tsdown",
    join(repositoryRoot, `examples/${name}.ts`),
    "--format",
    "esm",
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
    "@useceleris/client",
  ]);
}

beforeAll(() => {
  const { consumerDirectory } = getFixture();
  compileExample("node-quickstart", consumerDirectory);
  compileExample("credential-endpoint", consumerDirectory);
});

afterAll(() => endpoint?.kill());

describe("celeris examples", () => {
  test("runs the quickstart on every configured runtime", () => {
    const { consumerDirectory } = getFixture();

    for (const runtime of runtimes) {
      const argumentsList =
        runtime.kind === "deno"
          ? [
              "run",
              "--allow-net",
              "--allow-env",
              "--no-config",
              "--node-modules-dir=manual",
              "node-quickstart.js",
            ]
          : ["node-quickstart.js"];
      expect(
        runCommand(runtime.command, argumentsList, consumerDirectory),
        `${runtime.name} quickstart`,
      ).toMatch(/example: ok delivered=hello from server present=\d+/);
    }
  });

  test("mints credentials through the endpoint example and connects with them", async () => {
    const { consumerDirectory } = getFixture();
    endpoint = spawn(process.execPath, ["credential-endpoint.js"], {
      cwd: consumerDirectory,
      env: {
        ...process.env,
        CELERIS_EXAMPLE_PORT: String(endpointPort),
        CELERIS_CLIENT_ID: clientId(),
        CELERIS_SIGNING_SECRET: signingSecret(),
      },
    });
    await new Promise<void>((resolve, reject) => {
      endpoint!.stdout?.on("data", (chunk: Buffer) => {
        if (chunk.toString().includes("listening")) resolve();
      });
      endpoint!.once("error", reject);
      setTimeout(() => reject(new Error("endpoint did not start")), 15_000);
    });

    const request = (authorization: string, body: unknown) =>
      fetch(`http://127.0.0.1:${endpointPort}/`, {
        method: "POST",
        headers: { authorization, "content-type": "application/json" },
        body: JSON.stringify(body),
      });

    // The endpoint authenticates and authorizes server-side.
    expect(
      (await request("Bearer wrong", { channelReference: endpointChannel }))
        .status,
    ).toBe(401);
    expect(
      (await request("Bearer demo-session", { channelReference: "other-room" }))
        .status,
    ).toBe(403);

    const response = await request("Bearer demo-session", {
      channelReference: endpointChannel,
    });
    expect(response.status).toBe(200);
    const credentials = (await response.json()) as {
      payload: string;
      signature: string;
    };

    // Endpoint-derived credentials drive a real connection: the demo user
    // is read-only on "chat", so a publish is denied while reads work.
    const reader = createClient({
      baseUrl: websocketUrl(),
      allowInsecureLoopback: true,
      credentialProvider: async () => credentials,
    }).channel(endpointChannel);
    const denials: string[] = [];
    reader.events().onError((error) => denials.push(error.code));
    await reader.connect();
    reader.segment("chat").subscribe();
    await new Promise((resolve) => setTimeout(resolve, 1_500));

    await reader
      .segment("chat")
      .publish({ payload: new TextEncoder().encode("should be denied") });
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    expect(denials).toContain("Permission");
    expect(reader.state).toBe("connected");

    await reader.close();
  }, 90_000);
});
