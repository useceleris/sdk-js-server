# @useceleris/server — consumer examples

> Every `ts` snippet below is type-checked against the public surface on each `npm run check` (`tests/foundation/examples-drift.test.ts`); `createSigner` shipped with S3 and `createCredentialProvider` with S4. This file mirrors the surface fixed in the client [contracts](../sdk-js-client/docs/contracts.md) and changes in the same commit as any surface change. The signing secret lives only on trusted servers (Node.js, Bun, Deno) — never in a browser or mobile bundle.

## Sign credentials (shipped)

```ts
import { createSigner } from "@useceleris/server";

const signer = createSigner({
  clientId: process.env.CELERIS_CLIENT_ID!,
  signingSecret: process.env.CELERIS_SIGNING_SECRET!, // never client_secret
});

// Least privilege: one channel, explicit segment permissions.
const credentials = signer.sign({
  channels: { kind: "restricted", references: ["room-42"] },
  permissions: {
    kind: "restricted",
    segments: [{ segmentId: "chat", read: true, write: true }],
  },
  reference: "user-8317", // your app's identity reference (no colons)
  replay: { lookbackMs: 30_000 }, // or false (default)
  allowEcho: false, // default
});
// credentials = { payload: string, signature: string } — opaque; pass through unchanged.
```

Unrestricted access requires the explicit named opt-in — never an empty list:

```ts
const broad = signer.sign({
  channels: { kind: "all" },
  permissions: { kind: "all", read: true, write: false },
});
```

Signing is synchronous and deterministic for fixed inputs; a `clock` option exists for tests.

## Credential endpoint (shipped API, framework-neutral pattern)

The application authenticates its own user, derives authorized claims server-side, and signs. Never trust permissions requested by the browser.

```ts
// POST /api/realtime-credentials  — body: { channelReference, reason, replayLookbackMs? }
async function handleCredentialRequest(
  request: AppRequest,
): Promise<AppResponse> {
  const user = await authenticate(request); // your auth
  const { channelReference, replayLookbackMs } = await request.json();

  if (!user.mayAccessChannel(channelReference)) return forbidden();

  const credentials = signer.sign({
    channels: { kind: "restricted", references: [channelReference] },
    permissions: derivePermissionsFor(user, channelReference), // server decides
    reference: user.tokenReference,
    replay:
      typeof replayLookbackMs === "number"
        ? { lookbackMs: replayLookbackMs }
        : false,
  });

  return json(credentials); // { payload, signature }
}
```

Credentials are short-lived: sign fresh per request, never cache or backdate.

## Server-side realtime client

When a trusted server itself consumes realtime, `createCredentialProvider` bridges the signer to the client SDK's `CredentialProvider` — fresh claims and timestamp per connection attempt, cancellation passed through:

```ts
import { createClient } from "@useceleris/client";
import { createSigner, createCredentialProvider } from "@useceleris/server";

const signer = createSigner({
  clientId: process.env.CELERIS_CLIENT_ID!,
  signingSecret: process.env.CELERIS_SIGNING_SECRET!,
});

const client = createClient({
  credentialProvider: createCredentialProvider({
    signer,
    claims: (request) => ({
      // request.reason: "initial" | "reconnect"
      // request.replayLookbackMs flows into replay on reconnect:
      channels: { kind: "restricted", references: [request.channelReference] },
      permissions: { kind: "all", read: true, write: true },
      reference: "service-worker-1",
      replay:
        request.replayLookbackMs !== undefined
          ? { lookbackMs: request.replayLookbackMs }
          : false,
    }),
  }),
});

const channel = client.channel("room-42");
await channel.connect();
```

`claims()` is authoritative: nothing from the untrusted request can widen scope beyond what it returns.

## What never appears here

Signing in a browser, secrets in client code, a second transport or reconnect implementation, credential caching, or any dependency cycle — the dependency direction is server → client only.
