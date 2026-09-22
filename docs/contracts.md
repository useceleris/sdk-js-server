# Server contract — S0

Status: server-side contract prepared; client C0 acceptance pending. Date: 2026-09-06.

## Evidence and boundaries

Specs baseline: `celeris-sdk-specs@d51738c0fe6aff5fa6d2fecc0bb8efb4169bbddf` (clean at inspection). Realtime baseline: `celeris-realtime@9b67cb6634a9c24754e75df25e2cbc2df1b26f26` (clean at inspection). Server repository initially contained only the untracked STAGES.md. Inspect source again when these revisions change.

Use the [shared contract](../../../celeris-sdk-specs/docs/shared-contract.md) and [protocol](../../../celeris-sdk-specs/docs/protocol.md). User-approved Node/Bun/Deno server support supersedes earlier Node-only signing wording. SDK contracts do not modify the server protocol.

Dependency direction is server → client. No client dependency in S0–S3. S4 uses an installable version of the public client API, never sibling source imports. No account/billing APIs or new REST token endpoint. S3 exposes createSigner and consumer types; schemas and token preparation remain internal.

## Public signing API

```ts
// Internal schemas are the source of truth in src/claims.ts.
type SigningClaims = z.input<typeof signingClaimsSchema>;
// Generated TokenPermission, TokenPayload and SignedCredentials use plain readonly types.
// Implemented in S3:
// createSigner({ clientId, signingSecret, clock? }) -> Signer
// Signer.sign(claims) -> SignedCredentials
```

`clientId` and `signingSecret` are explicit strings; never read them from environment globals. `clock` is an optional injected `() => number` returning Unix milliseconds, defaulting to Date.now. These are the only accepted signer options; the former crypto adapter is removed and rejected. @noble/hashes supplies HMAC-SHA512 and @scure/base supplies padded Base64 and lowercase hex. TextEncoder is required when signing; missing capabilities fail with a safe Configuration error. No handwritten cryptography or encoding helpers.

Restricted channel references must be nonempty, unique, and satisfy server channel syntax/UTF-8 byte bounds. Restricted segment lists may be empty to grant no permissions; duplicates and empty identifiers are rejected. All-scope requires the explicit `kind: "all"` branch. CR/LF in identifiers is invalid. Do not trim, normalize or broaden claims. `reference` omitted permits server-generated identity; present value must be nonempty and colon/CR/LF-free. Copy inputs during validation so caller mutation cannot change signed permissions.

Clock output must be a finite positive safe integer, within the SDK-supported UTC year 1970–9999 range (`1..253402300799999` milliseconds); no silent rounding/backdating. Numeric replay uses integer `0..4294967295`, encoded as JSON number. Wire i64 message fields belong to the client and use bigint; JSON signing timestamps do not use lossy bigint conversion. Replay and echo default false and are emitted explicitly. Public inputs use camelCase; wire JSON uses timestamp, reference, channel_references, token_permission, replay, allow_echo. Restricted segment entries map segmentId to segment_id. All channels maps channel_references to null, only via explicit all-scope.

Serialize one UTF-8 JSON payload, standard padded Base64 it, HMAC-SHA512 the exact Base64 string, encode lowercase digest hex, then standard padded Base64 of `clientId + ":" + digestHex`. Reject colon/CR/LF in clientId and empty credentials. Never use client_secret as signing_secret. Return opaque credentials, not a constructed URL or claimed expiry time. Preserve serialized bytes; the verifier does not require canonical JSON key order.

## Cancellation, errors and ownership

Synchronous signing throws Configuration for invalid inputs/missing capabilities and SigningFailed for encoding or cryptographic failure. Error messages and exposed causes omit claims, secrets and signed URLs. Signing accepts only claims and returns credentials directly; no signal, cancellation or promise wrapper. Operations retain no global credential state, sockets, timers or application resources. No dispose API is needed. Future asynchronous credential providers retain their own cancellation responsibilities.

The S4 provider (implemented; see below) gets fresh claims/timestamp per connection attempt and passes cancellation through. It must not widen scope from an untrusted client request: the application's `claims()` callback is the sole authority over scope, including whether the requested channel is authorized.

## S4 client integration

Implemented 2026-09-21. Accepted client artifact (ACK-01): `Credentials`, `CredentialRequest` and `CredentialProvider` as exported by `@useceleris/client` at revision `d26d80f` — `Credentials` is structurally identical to `SignedCredentials`; `CredentialRequest` carries `channelReference`, `reason: "initial" | "reconnect"`, both `disconnectedAt` and `replayLookbackMs` on reconnect (absent on initial) and an `AbortSignal`; `CredentialProvider` is `(request) => Promise<Credentials>`. This records the server-side acknowledgement that the client-side review in the client contracts awaited.

`createCredentialProvider({ signer, claims })` is the single S4 export (plus the type-only re-export of `CredentialRequest` and the `CredentialProviderOptions` input type). It is a pure request → claims → sign pipe:

- `claims: (request: CredentialRequest) => SigningClaims | Promise<SigningClaims>` is invoked freshly per call; the returned claims go to `signer.sign`, whose injected clock stamps a fresh timestamp per call. The claims result is not re-validated by the provider — the signer's validation is the single boundary.
- Cancellation: `request.signal.throwIfAborted()` runs before `claims()` and again before signing, so a pre-aborted or mid-flight-aborted request rejects before any signature exists. The abort reason propagates as-is; the client maps every provider rejection to its fixed safe errors, and no new error class is introduced here. An asynchronous `claims()` receives the full request including the signal and owns its own abort behavior.
- Scope: nothing from the untrusted request is copied into claims by the provider. The `replayLookbackMs → replay: { lookbackMs }` mapping is the claims callback's decision, demonstrated canonically in EXAMPLES.md.
- Invalid `{ signer, claims }` options throw the fixed safe Configuration error synchronously.

Dependency: `@useceleris/client@0.0.0` is a declared exact dependency consumed **type-only** — the built `dist/index.js`/`dist/index.cjs` contain no reference to the client (asserted by the package suite), so no client transport/codec/reconnect code ships in this bundle and no server → client → server cycle exists. While the client is unpublished (DEP-01), local development resolves it with `npm link ../sdk-js-client`, and the packed-artifact suites install both freshly packed tarballs into one isolated consumer in a single `npm install`. Release gate (S8): replace this arrangement with the published, installable client version; `npm link` and sibling checkouts never satisfy the release requirement.

## S5 security and lifecycle boundaries

Recorded 2026-09-21. No production source change was needed for S5: the S4 provider and the client already implement the required behavior, and the stage closes the evidence gaps with tests only.

- **AUTH-04 (cancellation and late completion) is split across the packages.** The server side rejects before signing: `request.signal.throwIfAborted()` runs before `claims()` and again before `signer.sign`, so an abort that lands while claims are pending means no signature ever exists. The client side suppresses late completion: its attempt-settlement gate returns before URL construction and before `new WebSocket` when a provider settles after close/cancel/timeout. Both halves are exercised together in [tests/provider/client-lifecycle.test.ts](../tests/provider/client-lifecycle.test.ts), which drives the real installed-linked client against the real provider (a gated claims callback and a counting `WebSocket` stub; no network).
- **AUTH-05 (browser exclusion, no secret leakage).** The packed client artifact is inspected from this package's test suite: its dependencies are exactly `zod`, and its dist bundles contain none of `@useceleris/server`, `createSigner`, `signingSecret`, `@noble/hashes`, `@scure/base` — a browser bundle built from the client cannot reach the signing surface. Leak surfaces on the server side use fixed messages, no `cause`, and marker-free serialization (signer, validation and provider tests); a claims failure whose message embeds the signing secret reaches the application only as the client's fixed `Transport` error, because the client deliberately discards the rejection reason.
- **No global credential state.** Secrets live only inside signer closures; the two-signer isolation test shows deterministic, independent credentials with no cross-talk, and the claims callback remains the sole authorization authority (S4 section above).
- **SEC-02/SEC-03 are structurally client-owned.** This package builds no URL and parses no frames: TLS/URL validation and malicious-peer/frame handling live in `@useceleris/client` (client contracts, transport/channel suites, and the C8 live evidence recorded in the client tracker). Cited here as the reuse boundary, not re-tested.
- **RES-02–04.** Cancellation at the credential phase leaks nothing — the provider registers no timers or listeners, and the lifecycle tests observe no state changes or socket constructions after suppression. Bounded writer behavior and the no-resend guarantee are client contract text, reused unchanged. Neither package exposes a diagnostics facility (the client dropped `onDiagnostic` from v1); shipped server code has no output channel, enforced by the portability grep forbidding `console`.

## Refreshed platform findings

| Finding | Current source evidence                                                                                                                                                      | Disposition                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| D-001   | [Token service](../../../celeris-realtime/app/src/channel/channel_token_service.rs), validate_timestamp: 60-minute age check and TODO for 60 seconds remain                  | Open release security gate; fresh signer timestamp does not shorten server acceptance         |
| D-002   | [Assembler](../../../celeris-realtime/app/src/message_parser/message_assembler/mod.rs), Err branch: message has no final boundary                                            | Open protocol gate for client integration; no codec in this package                           |
| D-003   | [Peer output](../../../celeris-realtime/app/src/server_to_client_message/peer_message.rs) emits identifiers as SimpleString; payload reference validates minimum length only | Open server security gate; local rejection cannot protect against hostile peers bypassing SDK |

These are source observations, not executed exploit tests. They do not prevent S1 packaging tests. No source repository was changed. S0 remains pending client agreement; S1 may proceed against this recorded boundary.

## S2 implementation history

At S2, claims types and copied payload preparation existed internally with an empty entrypoint; S3 now exports createSigner. Configuration errors use `code: "Configuration"`, fixed field-specific messages and no raw causes. Optional undefined values follow omitted defaults; null is rejected. Extra fields are excluded from output. Clock exceptions become safe Configuration errors. Client provider integration remains future work.

Validation uses internal Zod schemas with synchronous parsing, unknown-field stripping and explicit token payload mapping. Raw Zod issues never cross the error boundary; public types remain independent of Zod.

Validated input types derive from Zod; generated token and credential outputs use plain readonly TypeScript types without output-only schemas. `prepareTokenPayload` validates claims once, validates the clock and maps token fields explicitly. Readonly schemas freeze parsed copies, including nested arrays and permission objects, without freezing caller inputs. The constructed token payload has a readonly type but is not promised to be deeply frozen. Signed credentials are a readonly payload/signature pair; the credential provider still receives channelReference and AbortSignal.

## S3 implementation and reference audit

createSigner validates and copies configuration synchronously. Each sign operation prepares claims and uses Noble HMAC-SHA512 with Scure encoding to return exact protocol credentials. No crypto adapter, key-import lifecycle, cache or background resources. Encoding/hash failures throw SigningFailed without raw causes. Prior Web Crypto implementation evidence remains in verification.md as history.

Source audit at realtime revision 9b67cb6634a9c24754e75df25e2cbc2df1b26f26:

| Field                | Server behavior                                                                                                               | SDK policy                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Channel reference    | Token DTO enforces nonempty, 255 UTF-8 bytes and ASCII letters/digits/hyphens                                                 | Same constraints; reject duplicates and empty allowlists to prevent accidental unrestricted access |
| User/token reference | Token DTO checks nonempty only; Redis presence formats node:reference:connection and splits into three colon-separated fields | Reject colon as well as CR/LF; preserve other Unicode and whitespace                               |
| Segment ID           | Token DTO checks nonempty; peer messages emit unescaped SimpleString                                                          | Reject CR/LF; no evidence for a blanket colon prohibition or additional maximum                    |
| Client ID            | Signature header splits at the first colon                                                                                    | Reject empty, colon and CR/LF                                                                      |

See [token DTO](../../../celeris-realtime/app/src/channel/channel_token_dto.rs), [presence encoding/parsing](../../../celeris-realtime/app/src/redis_service.rs), [signature verifier](../../../celeris-realtime/app/src/channel/channel_token_service.rs) and [peer output](../../../celeris-realtime/app/src/server_to_client_message/peer_message.rs). A user reference user:123 becomes token reference user and a shifted connection ID in presence parsing. This is a source-derived server validation gap, not evidence that the server already rejects colons. Track it with D-003; SDK rejection cannot protect against callers bypassing the SDK. No realtime files changed or backend tests executed in this pass.
