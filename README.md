# @useceleris/server

Portable trusted-server credential signing for Node.js, Bun and Deno. The package remains private; realtime client integration follows in S4.

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

## Development

Use npm and a supported development Node release (Node 24 recommended). Install dependencies using `npm install`; new development dependencies use `npm install --save-dev --save-exact name@latest`; authorized runtime dependencies use `npm install --save-exact name@latest`. Runtime dependencies are Zod for validation, @noble/hashes for HMAC-SHA512 and @scure/base for Base64/hex encoding. Commit npm-generated dependency metadata and lockfile.

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

`npm test` builds and packs a fresh artifact, installs it into an isolated consumer, and checks actual runtime imports. It verifies fixed signing vectors through installed ESM/CommonJS artifacts as well as safe imports. ESM and CommonJS exports include corresponding declarations; internal paths are not public.

## Documents

- [Implementation stages](STAGES.md)
- [Server contract](docs/contracts.md)
- [Runtime support](docs/runtime-support.md)
- [Verification evidence](docs/verification.md)
- [Code readability conventions](docs/code-conventions.md)

Trusted-server signing secrets must never be sent to browsers or end-user applications. Portable cryptographic libraries do not make an environment trusted. No license or publication approval is implied by this private scaffold.

Before completing a change, run automated checks and perform the readability checklist. Test responsibilities are separated into package, declaration, portability and runtime suites; shared helpers remain test-only.

Tests target package-owned behavior. Standalone runtime API probes and build-tool behavior tests are excluded; build and compiler tools are used only to prepare or consume the package.
