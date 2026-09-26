// @useceleris/server quickstart for trusted server runtimes (Node.js, Bun,
// Deno). It signs its own short-lived credentials and consumes realtime
// through @useceleris/client — the pattern for a backend worker, not a
// browser: the signing secret never leaves this process.
import { createCredentialProvider, createSigner } from "@useceleris/server";
import { createClient, readText, ServerError } from "@useceleris/client";

const signer = createSigner({
  clientId: process.env.CELERIS_CLIENT_ID!,
  signingSecret: process.env.CELERIS_SIGNING_SECRET!, // never client_secret
});

const channelReference = `server-quickstart-${Date.now()}`;

const client = createClient({
  baseUrl: process.env.CELERIS_WS_URL!,
  allowInsecureLoopback: true, // local ws:// stack; production uses wss://
  // Fresh claims and a fresh timestamp per connection attempt. The callback
  // is authoritative: nothing from the request widens its scope.
  credentialProvider: createCredentialProvider({
    signer,
    claims: (request) => ({
      channels: { kind: "restricted", references: [request.channelReference] },
      permissions: { kind: "all", read: true, write: true },
      reference: "server-quickstart",
      allowEcho: true, // this connection sees its own publishes
      replay:
        request.replayLookbackMs !== undefined
          ? { lookbackMs: request.replayLookbackMs } // reconnect: catch up
          : false,
    }),
  }),
});

const channel = client.channel(channelReference);
channel
  .events()
  .onError((error) =>
    console.log(
      "error:",
      error instanceof ServerError ? error.type : error.code,
    ),
  );

await channel.connect();

const chat = channel.segment("chat");
const delivered = new Promise<string>((resolve) => {
  chat.onMessage((payload) => resolve(readText(payload)));
});
chat.subscribe();
await new Promise((resolve) => setTimeout(resolve, 1_000));

await chat.publish({ payload: new TextEncoder().encode("hello from server") });
const body = await delivered;
const presence = await chat.presenceList({ page: 1, perPage: 10 });
await channel.close();

console.log(`example: ok delivered=${body} present=${presence.total}`);
