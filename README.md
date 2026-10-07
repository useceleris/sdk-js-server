# @useceleris/server

[![npm](https://img.shields.io/npm/v/@useceleris/server)](https://www.npmjs.com/package/@useceleris/server)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

Credential signing for Celeris on your trusted server, plus a bridge to [`@useceleris/client`](https://www.npmjs.com/package/@useceleris/client) for backends that connect themselves. Node.js, Bun and Deno.

## How it fits

Your server authenticates the user, decides what they may access (the claims), and signs those claims with your Celeris signing secret. The browser or app fetches the resulting `{ payload, signature }` from your endpoint and hands it to `@useceleris/client`, which connects with it. The secret never leaves your server.

```text
app ── POST /api/realtime-credentials ──▶ your server: authenticate → authorize → sign
app ◀── { payload, signature } ──────────
app ── @useceleris/client ──────────────▶ Celeris
```

## Install

```sh
npm install @useceleris/server
```

Runs on Node.js 22.15+, Bun 1.3+ and Deno 2.5+, on trusted servers only. Signing needs `TextEncoder` and nothing runtime-specific. `@useceleris/client` is a peer dependency used for types only: npm installs it, an app using both packages shares one copy, and this package's bundle contains no client code.

## Sign credentials

```ts
import { createSigner } from "@useceleris/server";

const signer = createSigner({
  clientId: process.env.CELERIS_CLIENT_ID!,
  signingSecret: process.env.CELERIS_SIGNING_SECRET!,
});

const credentials = signer.sign({
  channels: { kind: "restricted", references: ["room-42"] },
  permissions: {
    kind: "restricted",
    segments: [{ segmentId: "chat", read: true, write: true }],
  },
  reference: "user-8317",
});
// { payload, signature }: opaque strings, passed to the client unchanged
```

`createSigner` validates its options at once; they are `clientId` (no colon, CR or LF), `signingSecret` and an optional `clock` returning Unix milliseconds (default `Date.now`, useful in tests), and any other key is rejected. `sign()` is synchronous, stamps the current time and returns the credentials directly. There is nothing to dispose.

## Claims

| Field         | Values                                                                               | Default                     |
| ------------- | ------------------------------------------------------------------------------------ | --------------------------- |
| `channels`    | `{ kind: "restricted", references: string[] }` or `{ kind: "all" }`                  | Required                    |
| `permissions` | `{ kind: "restricted", segments: SegmentClaim[] }` or `{ kind: "all", read, write }` | Required                    |
| `reference`   | Identity label peers see in message metadata and presence                            | Omitted: the server assigns |
| `replay`      | `false`, `true` or `{ lookbackMs }`                                                  | `false`                     |
| `allowEcho`   | Whether the connection receives its own publishes                                    | `false`                     |

- **Channel references** are 1–255 ASCII letters, digits, `-` or `_`; list at least one and none twice. An empty list is rejected, never read as "all".
- **Segment claims** are `{ segmentId, read, write }` with both flags required; a segment id is non-empty without CR or LF, and none may repeat. An empty restricted list grants nothing. Read access is checked when the connection joins a segment, so a write-only member receives nothing.
- **The default segment** is joined automatically on connect, but membership grants no access: include `{ segmentId: "default", ... }` to use it.
- **`reference`** is non-empty without a colon, CR or LF.
- **`replay`** applies on every segment join: `true` replays what the server still retains for the segment, `{ lookbackMs }` replays only that window (an integer from 0 to 4,294,967,295), and `false` starts from now.
- Unknown claim keys are stripped. Unrestricted access is always the explicit `kind: "all"`.

```ts
signer.sign({
  channels: { kind: "restricted", references: ["room-42", "room-43"] },
  permissions: {
    kind: "restricted",
    segments: [
      { segmentId: "default", read: true, write: false },
      { segmentId: "chat", read: true, write: true },
    ],
  },
  reference: "user-8317",
  replay: { lookbackMs: 30_000 },
  allowEcho: true,
});

signer.sign({
  channels: { kind: "all" },
  permissions: { kind: "all", read: true, write: false },
});
```

## A credential endpoint

Browsers and mobile apps get credentials from an endpoint like this one. It authenticates the user, authorizes the requested channel, chooses permissions server-side and signs fresh for every request. `authenticate`, `canRead` and `canWrite` stand for your own session and permission checks.

```ts
import { createSigner } from "@useceleris/server";

const MAXIMUM_BODY_BYTES = 1_024;

const signer = createSigner({
  clientId: process.env.CELERIS_CLIENT_ID!,
  signingSecret: process.env.CELERIS_SIGNING_SECRET!,
});

// POST /api/realtime-credentials with { channelReference, replayLookbackMs? }
export async function handleCredentialRequest(
  request: Request,
): Promise<Response> {
  const user = await authenticate(request);
  if (!user) return Response.json({ error: "sign in" }, { status: 401 });

  // Bounded body: require a declared length within the limit.
  const declaredBytes = Number(request.headers.get("content-length"));
  if (!(declaredBytes > 0 && declaredBytes <= MAXIMUM_BODY_BYTES))
    return Response.json({ error: "invalid body size" }, { status: 413 });

  let channelReference: unknown;
  let replayLookbackMs: unknown;

  try {
    ({ channelReference, replayLookbackMs } = await request.json());
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (
    typeof channelReference !== "string" ||
    !(await canRead(user, channelReference))
  )
    return Response.json({ error: "forbidden" }, { status: 403 });

  const credentials = signer.sign({
    channels: { kind: "restricted", references: [channelReference] },
    permissions: {
      kind: "restricted",
      segments: [
        {
          segmentId: "chat",
          read: true,
          write: await canWrite(user, channelReference),
        },
      ],
    },
    reference: user.id,
    // The request only suggests a lookback; your policy caps it.
    replay:
      typeof replayLookbackMs === "number" &&
      Number.isInteger(replayLookbackMs) &&
      replayLookbackMs > 0
        ? { lookbackMs: Math.min(replayLookbackMs, 30_000) }
        : false,
  });

  return Response.json(credentials, {
    headers: { "cache-control": "no-store" },
  });
}
```

The handler takes a standard `Request`, so it mounts as a Next.js route handler (`export const POST = handleCredentialRequest`), a Hono route (`c.req.raw`), or with `Bun.serve` and `Deno.serve`. Where your framework has a body limit (Hono's `bodyLimit`, Express's `express.json({ limit })`), use it instead of the length check. [examples/credential-endpoint.ts](examples/credential-endpoint.ts) is the same pattern on `node:http`.

## A backend that consumes realtime

A trusted server that publishes or subscribes itself connects with `@useceleris/client`. `createCredentialProvider` turns your signer into the client's `credentialProvider`, so it signs locally instead of calling an endpoint:

```ts
import { createClient, textPayload } from "@useceleris/client";
import { createCredentialProvider, createSigner } from "@useceleris/server";

const signer = createSigner({
  clientId: process.env.CELERIS_CLIENT_ID!,
  signingSecret: process.env.CELERIS_SIGNING_SECRET!,
});

const client = createClient({
  credentialProvider: createCredentialProvider({
    signer,
    claims: (request) => ({
      channels: { kind: "restricted", references: ["room-42"] },
      permissions: {
        kind: "restricted",
        segments: [{ segmentId: "chat", read: true, write: true }],
      },
      reference: "build-notifier",
      replay:
        request.replayLookbackMs === undefined
          ? false
          : { lookbackMs: Math.min(request.replayLookbackMs, 30_000) },
    }),
  }),
});

const channel = client.channel("room-42");
await channel.connect();
await channel.segment("chat").publish({ payload: textPayload("build passed") });
await channel.close();
```

`claims` runs on every connection attempt, the first and each reconnect, and may be async. It is the only authority over scope: nothing from the request reaches the claims unless your callback puts it there. The provider rejects without signing if the attempt's `request.signal` is aborted before or after `claims` runs. Publishing and recovery then behave exactly as in the client documentation.

## Errors

Failures carry a stable `code`. The error classes are not exported, so match on `code`:

| `code`          | Raised when                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| `Configuration` | Invalid signer options, credential provider options or claims, or a `clock` that throws or returns a bad time |
| `SigningFailed` | Encoding or HMAC failed while signing                                                                         |

A `Configuration` message names each field that failed and the rule it broke — for example `Invalid claims. channels.references[0]: Must contain only ASCII letters, digits, hyphens (-) or underscores (_).` — and never includes the values, claims or secret.

```ts
try {
  signer.sign({
    channels: { kind: "restricted", references: [] },
    permissions: { kind: "all", read: true, write: false },
  });
} catch (error) {
  if (
    error instanceof Error &&
    "code" in error &&
    error.code === "Configuration"
  )
    console.error(error.message); // "Invalid claims. channels.references: Must list at least one channel reference."
}
```

## Trust boundary and keeping the secret

- The signing secret belongs to a trusted server process only — never a browser, mobile app or public environment variable. This package can be bundled for a browser, and doing so would leak the secret; `@useceleris/client` never depends on it and contains no signing code.
- Use your signing secret, never a client secret. Anyone who holds it can sign credentials for any of your users.
- Authenticate before signing, authorize every requested channel, and choose permissions server-side. Never sign permissions the client asked for, and treat `replayLookbackMs` as a request your policy caps.
- Sign fresh for every request and connection attempt; never cache or backdate. Credentials are opaque access material: pass them through unchanged, return them with `Cache-Control: no-store`, and do not log them. The signer sets no expiry and cannot revoke an open connection; the server applies its own acceptance window.
- Scope each token to the narrowest channels and segments the user needs; `kind: "all"` is an explicit opt-in.

## Further documentation

- Server-side guide: [useceleris.com/docs/sdks/javascript/server](https://useceleris.com/docs/sdks/javascript/server)
- Authentication guide: [useceleris.com/docs/getting-started/authentication](https://useceleris.com/docs/getting-started/authentication)
- API reference: [useceleris.com/docs/api-reference/server](https://useceleris.com/docs/api-reference/server)
- More examples: [EXAMPLES.md](EXAMPLES.md), and runnable programs in [examples/](examples)

## Development

`npm install`, then `npm run check` runs the build, both typechecks, oxlint, Prettier and the local suite. The suite packs this package, installs it into isolated consumers and runs them on Node, Bun and Deno, which must be on `PATH`; [runtime support](docs/runtime-support.md) describes the matrix. `npm run test:celeris` runs the acceptance suites against a real Celeris stack and needs `CELERIS_WS_URL`, `CELERIS_CLIENT_ID` and `CELERIS_SIGNING_SECRET`, read from a gitignored `.env` or the environment.

`@useceleris/client` is an ordinary registry dependency, pinned exactly in `peerDependencies` and `devDependencies`; it is published before a matching version of this package. Add dependencies with `npm install --save-exact` and commit the lockfile.

Read [CONVENTIONS.md](CONVENTIONS.md) and the [code conventions](docs/code-conventions.md) before contributing, and [SECURITY.md](SECURITY.md) before reporting a vulnerability.

## License

[Apache 2.0](LICENSE).
