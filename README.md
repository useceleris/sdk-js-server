# @useceleris/server

Portable trusted-server credential signing for Node.js, Bun and Deno, plus the bridge from the signer to `@useceleris/client`'s credential provider. The package remains private.

```ts
import { createSigner } from "@useceleris/server";

const signer = createSigner({
  clientId: "synthetic-client",
  signingSecret: "synthetic-secret",
});

const credentials = signer.sign({
  channels: { kind: "restricted", references: ["room-1"] },
  permissions: {
    kind: "restricted",
    segments: [{ segmentId: "messages", read: true, write: false }],
  },
});
```

Supply real credentials only from trusted application configuration. Authenticate and authorize users before choosing their claims; never sign arbitrary requested permissions. Channel references allow ASCII letters, digits and hyphens (1–255 bytes). User/token references must be nonempty and contain no colon or CR/LF. Segment IDs must be nonempty and CR/LF-free. Replay and echo default to false; unrestricted scope requires an explicit `kind: "all"`.

`createSigner` validates configuration synchronously. `sign(claims)` returns SignedCredentials directly and throws safe Configuration or SigningFailed errors. Signing has no options argument, signal or cancellation behavior. The optional `clock` returns positive Unix milliseconds. Signer configuration accepts only clientId, signingSecret and clock. No disposal or background resources are needed.

Credentials contain opaque payload/signature strings, not a URL or expiry guarantee. Known server freshness/security findings remain open; see the contract and verification documents.

`createCredentialProvider({ signer, claims })` returns the client SDK's asynchronous `CredentialProvider` for trusted servers that consume realtime themselves: each connection attempt calls `claims(request)` freshly and signs with a fresh timestamp, an aborted `request.signal` rejects before signing, and nothing from the untrusted request widens scope beyond what `claims()` returns. The claims callback decides the `replayLookbackMs → replay` mapping (see [EXAMPLES.md](EXAMPLES.md)). The dependency on `@useceleris/client` is type-only at runtime — the server bundle contains no client transport code — and browsers still never see this package or its secrets. Failures reuse the same fixed safe errors as the signer; errors are identified by their stable `code` string (`"Configuration"`, `"SigningFailed"`), not by exported classes.

## Examples

Two runnable examples live in [examples/](examples), both executed against a live stack by the celeris test suite:

- [node-quickstart.ts](examples/node-quickstart.ts) — a trusted server signing its own credentials and consuming realtime through `@useceleris/client` (Node.js, Bun and Deno).
- [credential-endpoint.ts](examples/credential-endpoint.ts) — the framework-neutral pattern every browser or mobile application needs: authenticate your user, derive the authorized claims server-side, sign fresh, return `{ payload, signature }`. A permission requested by the client is never trusted. The handler body ports unchanged to Express, Fastify, Hono, Nitro or a serverless function.

More usage, including the full claims surface, is in [EXAMPLES.md](EXAMPLES.md).

## Trust boundary and credential handling

The signing secret belongs only to a trusted server process: never a browser, mobile app, or any bundle shipped to a user. Portable cryptography does not make an environment trusted — this package is importable in a browser bundler, and doing so would leak the secret. The client package never depends on this one, and its published artifact contains no signing API (asserted by the package suite).

Credentials are short-lived and opaque: sign per request or per connection attempt, never cache, never backdate, and pass `payload`/`signature` through unchanged. Scope every token to the narrowest channel and segment permissions the user actually needs; `kind: "all"` is an explicit opt-in, never a default. The server enforces its own acceptance window, which is not shortened by signing freshly — see D-001 in [STAGES.md](STAGES.md).

## Delivery limits

The realtime client owns delivery: a publish resolves on local acceptance, not on server receipt, and there is no offline queue, automatic resend, or acknowledgement API. Commands are bounded at 128 KiB each with a 64-command writer window, and incoming transport messages at 1 MiB. Replay is a bounded lookback window, not a durable cursor, so gaps and duplicates remain possible after recovery and are declared through the client's recovery event. Payloads are opaque bytes — JSON, MessagePack, protobuf or anything else round-trips unchanged.

## Development

Use npm and a supported development Node release (Node 24 recommended). Install dependencies using `npm install`; new development dependencies use `npm install --save-dev --save-exact name@latest`; authorized runtime dependencies use `npm install --save-exact name@latest`. Runtime dependencies are Zod for validation, @noble/hashes for HMAC-SHA512, @scure/base for Base64/hex encoding, and @useceleris/client for the credential-provider types (type-only at runtime). Commit npm-generated dependency metadata and lockfile.

Until `@useceleris/client` publishes (DEP-01), its `0.0.0` dependency cannot be fetched from a registry: after cloning, run `npm link ../sdk-js-client` (sibling checkout, built) before `npm install`-dependent workflows, and give CI a sibling checkout plus the same link step. The packed-artifact test suites do not rely on the link — they build and pack both repositories and install both tarballs into their isolated consumers. S8 replaces this arrangement with the published, installable client version.

```sh
npm install
npm run build
npm run typecheck
npm run format:check
npm test
npm run test:watch
npm run check
```

All authored code and test fixtures use `.ts`; tsdown generates package JavaScript and temporary ESM/CJS test consumers.

Tests require Node, Bun and Deno. Missing executables fail qualification. See [runtime support](docs/runtime-support.md) for matrix configuration. Build/test orchestration uses Node; published code does not.

`npm test` builds and packs fresh artifacts of this package and the sibling client, installs both into an isolated consumer, and checks actual runtime imports. It verifies fixed signing vectors through installed ESM/CommonJS artifacts as well as safe imports. ESM and CommonJS exports include corresponding declarations; internal paths are not public.

## Documents

- [Implementation stages](STAGES.md)
- [Server contract](docs/contracts.md)
- [Runtime support](docs/runtime-support.md)
- [Verification evidence](docs/verification.md)
- [Code readability conventions](docs/code-conventions.md)

Trusted-server signing secrets must never be sent to browsers or end-user applications. Portable cryptographic libraries do not make an environment trusted. No license or publication approval is implied by this private scaffold.

Before completing a change, run automated checks and perform the readability checklist. Test responsibilities are separated into package, declaration, portability and runtime suites; shared helpers remain test-only.

Tests target package-owned behavior. Standalone runtime API probes and build-tool behavior tests are excluded; build and compiler tools are used only to prepare or consume the package.
