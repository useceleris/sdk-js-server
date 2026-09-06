# Server contract — S0

Status: server-side contract prepared; client C0 acceptance pending. Date: 2026-09-06.

## Evidence and boundaries

Specs baseline: `celeris-sdk-specs@d51738c0fe6aff5fa6d2fecc0bb8efb4169bbddf` (clean at inspection). Realtime baseline: `celeris-realtime@9b67cb6634a9c24754e75df25e2cbc2df1b26f26` (clean at inspection). Server repository initially contained only the untracked STAGES.md. Inspect source again when these revisions change.

Use the [shared contract](../../../celeris-sdk-specs/docs/shared-contract.md) and [protocol](../../../celeris-sdk-specs/docs/protocol.md). User-approved Node/Bun/Deno server support supersedes earlier Node-only signing wording. SDK contracts do not modify the server protocol.

Dependency direction is server → client. No client dependency in S0–S3. S4 uses an installable version of the public client API, never sibling source imports. No account/billing APIs or new REST token endpoint. All signatures below describe future APIs, not exports of the empty S1 package.

## Future public API

```ts
type ChannelScope =
  | { readonly kind: "restricted"; readonly references: readonly string[] }
  | { readonly kind: "all" };
type SegmentPermissions =
  | {
      readonly kind: "restricted";
      readonly segments: readonly {
        segmentId: string;
        read: boolean;
        write: boolean;
      }[];
    }
  | { readonly kind: "all"; readonly read: boolean; readonly write: boolean };
interface SigningClaims {
  readonly channels: ChannelScope;
  readonly permissions: SegmentPermissions;
  readonly reference?: string;
  readonly replay?: boolean | { readonly lookbackMs: number };
  readonly allowEcho?: boolean;
}
interface SignedCredentials {
  readonly payload: string;
  readonly signature: string;
}
interface CredentialContext {
  readonly channelReference: string;
  readonly signal: AbortSignal;
}
type CredentialProvider = (
  context: CredentialContext,
) => Promise<SignedCredentials>;
// Future API only:
// createSigner({ clientId, signingSecret, crypto?, clock? }) -> Signer
// Signer.sign(claims, { signal? }) -> Promise<SignedCredentials>
```

`clientId` and `signingSecret` are explicit strings; never read them from environment globals. `crypto` is an injected object exposing the standard SubtleCrypto `importKey` and `sign` methods, defaulting to `globalThis.crypto.subtle` at first signing operation; methods must retain their receiver. `clock` is an injected `() => number` returning Unix milliseconds, defaulting to Date.now. No universal runtime abstraction or fallback handwritten crypto. Missing capabilities fail the operation with a safe Configuration error, not import itself.

Restricted channel references must be nonempty, unique, and satisfy server channel syntax/UTF-8 byte bounds. Restricted segment lists may be empty to grant no permissions; duplicates and empty identifiers are rejected. All-scope requires the explicit `kind: "all"` branch. CR/LF in identifiers is invalid. Do not trim, normalize or broaden claims. `reference` omitted permits server-generated identity; present value must be nonempty and CR/LF-free. Deep-copy inputs before asynchronous work so caller mutation cannot change signed permissions.

Clock output must be a finite nonnegative safe integer, within the SDK-supported UTC year 1970–9999 range (`0..253402300799999` milliseconds); no silent rounding/backdating. Numeric replay uses integer `0..4294967295`, encoded as JSON number. Wire i64 message fields belong to the client and use bigint; JSON signing timestamps do not use lossy bigint conversion. Replay and echo default false and are emitted explicitly. Public inputs use camelCase; wire JSON uses timestamp, reference, channel_references, token_permission, replay, allow_echo. Restricted segment entries map segmentId to segment_id. All channels maps channel_references to null, only via explicit all-scope.

Serialize one UTF-8 JSON payload, standard padded Base64 it, HMAC-SHA512 the exact Base64 string, encode lowercase digest hex, then standard padded Base64 of `clientId + ":" + digestHex`. Reject colon/CR/LF in clientId and empty credentials. Never use client_secret as signing_secret. Return opaque credentials, not a constructed URL or claimed expiry time. Preserve serialized bytes; the verifier does not require canonical JSON key order.

## Cancellation, errors and ownership

Future asynchronous operations reject with stable code/category: Configuration for local invalid/missing capabilities, Cancelled for cancellation, and SigningFailed for cryptographic failure. Error text and causes exposed publicly must omit claims, secrets and signed URLs. Crypto failures are not server Authentication failures.

Check AbortSignal before work and after asynchronous crypto completion. A cancelled result is never returned; cancellation does not promise to stop underlying Web Crypto. Operations retain no global credential state, sockets, timers or application resources. No dispose API is needed for the stateless signer. Do not promise garbage-collected secret zeroization.

The future S4 provider gets fresh claims/timestamp per connection attempt, validates requested channel against its authorized scope, and passes cancellation through. It must not widen scope from an untrusted client request. Exact provider compatibility needs client C0 review; mark that acceptance pending, not complete from server tests.

## Refreshed platform findings

| Finding | Current source evidence                                                                                                                                                      | Disposition                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| D-001   | [Token service](../../../celeris-realtime/app/src/channel/channel_token_service.rs), validate_timestamp: 60-minute age check and TODO for 60 seconds remain                  | Open release security gate; fresh signer timestamp does not shorten server acceptance         |
| D-002   | [Assembler](../../../celeris-realtime/app/src/message_parser/message_assembler/mod.rs), Err branch: message has no final boundary                                            | Open protocol gate for client integration; no codec in this package                           |
| D-003   | [Peer output](../../../celeris-realtime/app/src/server_to_client_message/peer_message.rs) emits identifiers as SimpleString; payload reference validates minimum length only | Open server security gate; local rejection cannot protect against hostile peers bypassing SDK |

These are source observations, not executed exploit tests. They do not prevent S1 packaging tests. No source repository was changed. S0 remains pending client agreement; S1 may proceed against this recorded boundary.
