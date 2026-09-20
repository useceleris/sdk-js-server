# @useceleris/server implementation stages

Created: 2026-09-06. This is an implementation tracker, not a report of implemented functionality. Repository baseline: no SDK implementation present when this tracker was created.

## Scope and source of truth

Package: **`@useceleris/server`**. Own trusted-server credential signing and conveniences that reuse @useceleris/client through its public interface. Do not implement a second realtime transport or state machine.

Use the [PRD](../../celeris-sdk-specs/SDK_PRD.md), [shared contract](../../celeris-sdk-specs/docs/shared-contract.md), [wire protocol](../../celeris-sdk-specs/docs/protocol.md), [JavaScript conventions](../../celeris-sdk-specs/docs/conventions/javascript.md), [conformance scenarios](../../celeris-sdk-specs/docs/conformance.md), [security policy](../../celeris-sdk-specs/docs/security-dependencies.md), [maintenance policy](../../celeris-sdk-specs/docs/maintenance.md), and [discrepancy register](../../celeris-sdk-specs/docs/discrepancies.md). Coordinate with the [other package tracker](../sdk-js-client/STAGES.md).

The user's approved runtime scope supersedes the existing specifications' Node-only server wording: portable JavaScript, with Node.js, Bun and Deno initially qualified. This tracker does not claim those targets already pass. Keep standard APIs and Uint8Array/AbortSignal/URL/public types runtime-neutral. Signing is synchronous and uses @noble/hashes HMAC with @scure/base encoding; realtime uses WebSocket. Require capabilities only where needed; expose explicit narrow adapters for missing capabilities rather than silently loading Node-specific fallbacks. Portable signing still belongs exclusively in trusted servers.

S0 contracts and S1 foundation are now present; pending acceptance is tracked below. No backend edits or package publication are authorized by these stages. Account/billing APIs, durable offline queues, automatic uncertain resend, global ordering and invented acknowledgements remain out of scope.

## How to track progress

- Status values: **Not started**, **In progress**, **Blocked**, **Complete**. Assign an owner when a stage starts. Keep all tasks unchecked until implemented and verified.
- Complete requires checked tasks, acceptance evidence, relevant tests, the [readability review](docs/code-conventions.md), and reviewed findings; listing tests or writing this document is not completion. If required evidence cannot pass, mark Blocked and link the specific finding.
- Each evidence entry records command/check, result, package/spec/server revision, runtime/OS, date and sanitized artifact link. Record source inspection separately from executed tests.
- Scenario ranges below refer to existing conformance IDs; include each applicable scenario. Mark inherited or inapplicable cases explicitly with justification, never silently skip them.
- Update the stage table and its detail together; retain completed-stage evidence when later changes reopen work. Check off cross-repository prerequisites only against linked revision/results.

## Stage status

| Stage                       | Status      | Owner                                              | Evidence                                                 | Completed  | Blockers                              |
| --------------------------- | ----------- | -------------------------------------------------- | -------------------------------------------------------- | ---------- | ------------------------------------- |
| S0 — Contracts              | In progress | Codex (implementation); client reviewer unassigned | [Contract](docs/contracts.md)                            | —          | Client C0 acceptance pending          |
| S1 — Foundation             | In progress | Codex (implementation)                             | [Verification](docs/verification.md)                     | —          | Linux/Windows CI execution pending    |
| S2 — Validation             | Complete    | Codex                                              | [Verification](docs/verification.md#s2-validation)       | 2026-09-06 | Release gates remain open             |
| S3 — Signing                | Complete    | Codex                                              | [Verification](docs/verification.md#s3-portable-signing) | 2026-09-06 | Release gates remain open             |
| S4 — Client integration     | Not started | Unassigned                                         | None yet                                                 | —          | See dependencies and blocker register |
| S5 — Security and lifecycle | Not started | Unassigned                                         | None yet                                                 | —          | See dependencies and blocker register |
| S6 — Qualification          | Not started | Unassigned                                         | None yet                                                 | —          | See dependencies and blocker register |
| S7 — Documentation          | Not started | Unassigned                                         | None yet                                                 | —          | See dependencies and blocker register |
| S8 — Release                | Not started | Unassigned                                         | None yet                                                 | —          | See dependencies and blocker register |

## S0 — Contracts

**Dependencies:** None; coordinate with C0.

**Coverage:** SDK-02, SDK-09–11; AUTH-01–05, REL-01.

- [ ] Record spec/server revisions and agree with C0 on signing output, credential provider, cancellation, ownership and a versioned dependency on the public @useceleris/client interface.
- [x] Define asynchronous signing exports and narrow runtime capability adapters. Record trusted-server use across Node.js/Bun/Deno as the approved extension to older Node-only spec wording.
- [x] Record D-001–D-003 applicability; do not invent account/billing APIs or a Celeris REST token mint endpoint. Define checked JSON timestamp/replay conversions separately from wire bigint types.

**Acceptance:** Signing/integration decisions are reviewed and client prerequisites are explicit; no duplicated transport is planned.

**Evidence / findings:** See [contracts](docs/contracts.md) and [verification](docs/verification.md). Server handoff is documented; client agreement and required cross-OS CI execution remain pending.

## S1 — Foundation

**Dependencies:** S0.

**Coverage:** SDK-09–11; LANG-01–02, SEC-01, REL-02.

- [x] Configure strict TypeScript, portable declarations, ESM-first/CommonJS exports and exact package name @useceleris/server; import has no networking or environment-read side effects.
- [ ] Create reproducible builds, checks, unit tests and CI for Node.js/Bun/Deno; select minimum versions from official support information and record package-consumer results for exact targets. Test this package, not standalone runtime APIs or build-tool functionality.
- [x] Keep node: imports, Buffer, process and Node-only public types outside portable core and dependencies. Test packed @useceleris/server imports and declarations in real consumers.

**Acceptance:** Portable builds and import/type checks pass on the recorded runtime matrix without requiring the client for signing tests.

**Evidence / findings:** See [contracts](docs/contracts.md) and [verification](docs/verification.md). Server handoff is documented; client agreement and required cross-OS CI execution remain pending.

## S2 — Validation

**Status:** Complete. **Owner:** Codex. **Completed:** 2026-09-06.

**Dependencies:** S1 foundation and the server-side [contract](docs/contracts.md). Local validation development can proceed while client C0 acceptance and S1 cross-OS evidence remain pending; neither is implicitly completed by S2. No client dependency is needed.

**Coverage:** SDK-02, SDK-10; AUTH-02, local input/default portions of AUTH-03, and local identifier protection from SEC-03. Server authentication, malicious-peer framing and signing integration remain S3/S6 work.

### Scope and implementation order

Implement only the typed claims model, runtime validation and construction of a copied wire-payload object for S3. Keep validation internal to the package; do not add a public validation API solely for tests. No signer placeholder, HMAC, Base64, credential provider, network code. Zod is the sole authorized runtime dependency for validation. Keep the package entrypoint empty until the signing API is implemented in S3.

- [x] **S2.1 — Confirm validation rules.** Reinspect source revisions and record any drift in the local contract/evidence. Resolve any discrepancy affecting validation before implementing that rule. Distinguish SDK restrictions from server-enforced rules; keep D-001–D-003 open.
- [x] **S2.2 — Define inputs and errors.** Implement the contract's readonly discriminated claims types and a safe Configuration error with a stable code. Validate runtime inputs from JavaScript callers as well as TypeScript callers: reject invalid kinds, missing required fields, nulls and incorrect field types without coercion. Construct output from recognized fields only; never spread caller objects into wire claims. Keep errors free of input values, credentials and nested raw causes.
- [x] **S2.3 — Validate authorization and identity.** Require explicit channel scope and segment permissions. Restricted channel lists must be nonempty and unique; each reference must match `^[a-zA-Z0-9-]+$` and the server's 255-byte maximum. Only `kind: "all"` may produce unrestricted channel scope. Restricted segment lists may be empty (deny all); reject duplicate segment IDs and require explicit boolean read/write flags in both permission branches. Reject empty or CR/LF-containing segment IDs and supplied identity references. Reject empty client IDs/signing secrets and colon/CR/LF in client IDs; do not trim, normalize, deduplicate or broaden values. Do not invent segment/reference length limits without source or a documented SDK decision.
- [x] **S2.4 — Validate time and options.** Read the injected clock once per payload preparation, with no caller-supplied timestamp override. Require integer Unix milliseconds in `1..253402300799999`; reject negative, fractional, nonfinite, unsafe, bigint and out-of-range values. Preserve replay false/true and integer lookback `0..4294967295`, including zero; default replay and echo to false. Reject invalid option types instead of converting truthy values. Never round or backdate. A skewed clock cannot be detected against itself: future/stale server rejection belongs to S6, not a fabricated local freshness check.
- [x] **S2.5 — Construct isolated payloads.** Map camelCase fields to `timestamp`, optional `reference`, `channel_references`, `token_permission`, `replay` and `allow_echo`; segment entries use `segment_id`. Encode all-channel scope as null, all-segment permissions as a read/write object and restricted permissions as an array. Preserve order and exact identifier values. Copy nested arrays/objects synchronously so later caller mutation cannot change prepared permissions. Do not add a generic schema framework or deep-clone utility for this small fixed shape.
- [x] **S2.6 — Verify and review.** Add the focused Vitest cases below, run existing package checks and record actual results. Review every changed source, test and helper for readability and removable code. Update contract/evidence only where implementation resolves or changes a documented rule; leave unrelated stages untouched.

### Package-owned tests

Use separate `.ts` tests with explicit Vitest imports, small table-driven cases and independently written expected wire objects. Internal unit imports are appropriate for validation; existing installed-consumer tests must continue exercising `@useceleris/server`. No crypto/runtime probes, build-tool tests or new fixture framework. Test package behavior through its validation functions, not Zod in isolation.

| Cases                            | Assertions and mapping                                                                                                                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Restricted/unrestricted channels | Accept valid boundaries (1 and 255 bytes); reject empty list, duplicates, empty reference, 256 bytes and invalid characters including Unicode/CR/LF. Only explicit all-scope produces null. AUTH-02      |
| Segment permissions              | Cover read-only, write-only, both and neither; preserve empty restricted list as `[]`; reject duplicates, missing/nonboolean flags, invalid discriminants and malformed entries. AUTH-02                 |
| Identity and configuration       | Omitted identity stays absent; supplied Unicode remains exact; empty/CR/LF identifiers fail. Invalid client ID/secret fail with safe Configuration errors. SEC-03 (local), SDK-10                        |
| Replay/echo                      | Cover omitted, false, true, zero and maximum lookback; reject negative, fractional, overflow, nonfinite, bigint, null and wrong-shaped values. Defaults remain explicit false. AUTH-02                   |
| Clock                            | Cover both accepted endpoints and neighboring invalid values, fractions, NaN, infinities and unsafe integers; injected clock called once and its validated value preserved exactly. AUTH-03 (local only) |
| Payload ownership                | Compare complete expected wire objects; mutate original nested claims after preparation and verify output stays unchanged. Extra caller fields never appear in output; no input mutation. SDK-02         |
| Safe failures                    | Assert stable error code and absence of synthetic secret/claim markers from public message, cause and serialization. Do not test JavaScript or crypto primitives in isolation. SDK-10                    |

### Completion gate and evidence..k

- [x] `npm run test` passes with the existing eight-runtime matrix; record validation unit results separately from installed import checks. Import success alone does not establish cross-runtime validation behavior; full signer behavior qualification follows in S3/S6.
- [x] `npm run build`, `npm run typecheck`, `npm run format:check` and `git diff --check` pass. Existing package/declaration/portability checks remain intact; no production Node globals/imports, dependencies beyond Zod or unintended public exports appear.
- [x] Record changed-file readability review, commands/results, exact package/spec/server revisions, runtime/OS, date and sanitized evidence in [verification](docs/verification.md). Mark implementation complete only after the above tasks pass; preserve S0/S1 pending evidence and release gates.

**Acceptance:** Focused boundary/negative tests establish least privilege, safe errors and exact copied payload construction ready for S3. No signing or backend acceptance is claimed.

**Planning evidence:** Inspected realtime `9b67cb6634a9c24754e75df25e2cbc2df1b26f26` and specs `d51738c0fe6aff5fa6d2fecc0bb8efb4169bbddf` on 2026-09-06. Relevant source: [payload and permissions](../../celeris-realtime/app/src/channel/channel_token_dto.rs), [channel syntax](../../celeris-realtime/app/src/globals/mod.rs), [timestamp validation](../../celeris-realtime/app/src/channel/channel_token_service.rs). Empty channel lists currently allow all; empty segment lists carry no grants. These are source observations, not executed S2 tests.

**Blockers / findings:** D-001 remains a server freshness gate; local clock validation does not fix it. D-003 local identifier rejection does not protect against peers bypassing this package. D-002 concerns later client integration. Client C0 agreement and cross-OS foundation evidence remain pending. Implementation evidence: [S2 validation](docs/verification.md#s2-validation), 111 passing tests including 94 validation unit cases and 17 foundation checks.

## S3 — Signing

**Dependencies:** S2.

**Coverage:** SDK-02, SDK-10; AUTH-01–03, SEC-01.

- [x] Implement synchronous @noble/hashes HMAC-SHA512 with exact UTF-8 JSON bytes, standard padded Base64, lowercase HMAC hex and the verified client-ID signature wrapper.
- [x] Encode with @scure/base without Buffer or handwritten crypto/encoding. Detect missing TextEncoder explicitly; no injectable crypto backend.
- [x] Verify independent synthetic golden vectors across Node.js/Bun/Deno, including Unicode, exact payload bytes, changed inputs and mutation safety. Keep client_secret distinct from signing_secret.

**Acceptance:** The same fixed inputs produce byte-identical credentials on every qualified runtime and no realtime client is needed for unit tests.

**Evidence / findings:** [S3 verification](docs/verification.md#s3-portable-signing): exact vectors on all eight runtimes, synchronous error checks and installed declarations. Completed 2026-09-06 by Codex. Client agreement, cross-OS evidence and D-001–D-003 remain open.

## S4 — Client integration

**Dependencies:** S3 and client C3/C4; full messaging validation waits for C5–C8.

**Coverage:** SDK-02–08; AUTH-03–04, LIFE-01–03, PUB-01–02, REC-01–04.

- [ ] Add a declared versioned dependency on @useceleris/client and the fresh-signing credential-provider convenience — the single new export `createCredentialProvider({ signer, claims })` returning the client's `CredentialProvider`, re-exporting `CredentialRequest`; never copy codec, transport or reconnect internals. It maps request → claims → sign with fresh timestamp and cancellation; if it needs more than that, document the pattern in [EXAMPLES.md](EXAMPLES.md) instead of growing the API (minimalism is binding; see the client [contracts](../sdk-js-client/docs/contracts.md) Public API surface).
- [ ] Preserve cancellation, safe errors, application ownership and subscription behavior. Do not expose browser-safe claims for server signing merely because the cryptographic libraries are portable.
- [ ] Test integration with packed client artifacts rather than source imports. Pre-release local artifact tests may unblock development; published dependencies must use installable versions, not file: paths.
- [ ] Record ACK-01 acknowledgement: review and accept the client's exported `Credentials`/`CredentialRequest`/`CredentialProvider` types from C4 in both trackers, closing the currently one-sided client-side review.

**Tests:** Provider invokes `claims(request)` freshly per call with a fresh timestamp; `replayLookbackMs` maps to `replay: { lookbackMs }` and its absence to `replay: false`; `request.signal` abort rejects before signing and propagates to an asynchronous `claims()`; scope never widens beyond what `claims()` returns — untrusted request fields cannot inject channels or permissions; provider output satisfies the client's `Credentials` shape; integration runs against the packed client artifact, not sibling source.

**Acceptance:** Exactly one new public export; the server bundle contains no client runtime internals (codec, transport, reconnect); ACK-01 acknowledgement recorded in both trackers; provider/client integration tests pass and full messaging qualification remains tracked in S6; dependency graph has no server-to-client-to-server cycle.

**Evidence / findings:** None yet; add results and blocker IDs here.

## S5 — Security and lifecycle

**Dependencies:** S4.

**Coverage:** SDK-02, SDK-08, SDK-10; AUTH-04–05, LIFE-03–04, RES-02–04, SEC-02–03.

- [ ] Test close/cancel during asynchronous credential acquisition and suppress stale provider completion. The signer is synchronous and has no signal argument.
- [ ] Verify secrets/signed URLs never leak via exceptions, diagnostics or serialization. Avoid global credentials and keep application authorization responsibility explicit.
- [ ] Validate missing-capability errors, side-effect-free imports and resource cleanup in each runtime; reuse client bounded behavior and no-resend guarantees.

**Acceptance:** Security and lifecycle evidence covers server-specific behavior plus reuse boundaries; browser exclusion is demonstrated by client package inspection.

**Evidence / findings:** None yet; add results and blocker IDs here.

## S6 — Qualification

**Dependencies:** S3–S5 and client C8; platform findings may block acceptance.

**Coverage:** SDK-01–10 as applicable through reuse; AUTH-01–05, LIFE-01–04, PUB-01–04, SUB-01–04, PRES-01–03, REC-01–04, RES-01–04, LANG-01–02, SEC-02–03.

- [ ] Run server-generated credentials against recorded Celeris versions for scoped access, invalid/expired/future credentials and replay/echo behavior; do not confuse SDK freshness with enforced server expiry.
- [ ] Exercise @useceleris/server plus @useceleris/client messaging, presence and recovery on Node.js/Bun/Deno using installed built artifacts.
- [ ] Attach runtime/source versions and tests; reference pinned client codec/conformance evidence rather than duplicating it. Keep known server failures explicit and do not weaken assertions.

**Acceptance:** Direct signing/integration scenarios pass and inherited client qualification is linked; unresolved required platform gates keep this stage Blocked.

**Evidence / findings:** None yet; add results and blocker IDs here.

## S7 — Documentation

**Dependencies:** S3, S4; final examples require S6.

**Coverage:** SDK-09, SDK-11; LANG-01–02, REL-01, REL-03.

- [ ] Provide @useceleris/server signing and @useceleris/client messaging examples with exact npm names and tested commands for Node.js/Bun/Deno.
- [ ] Write a framework-neutral credential endpoint example that authenticates the application user and derives authorized claims server-side rather than trusting requested permissions.
- [ ] Document capabilities/adapters, trust boundaries, short-lived credential handling, runtime support and delivery limits. Run examples from packed artifacts with synthetic secrets.

**Acceptance:** Examples execute and demonstrate authorization and safe secret ownership without depending on a particular web framework.

**Evidence / findings:** None yet; add results and blocker IDs here.

## S8 — Release

**Dependencies:** S6, S7 and client C10 for stable integrated release.

**Coverage:** SDK-10, SDK-11; SEC-01–04, REL-01–03.

- [ ] Audit exact dependencies/licenses/advisories and hidden runtime assumptions; measure signing, startup, memory, cleanup and integration overhead separately on each runtime.
- [ ] Verify @useceleris/server npm scope permissions, portable package contents/declarations, ESM/CommonJS consumers, installable @useceleris/client version and compatibility records.
- [ ] Complete budgets, provenance/SBOM, changelog, owners, private security contact and independent review; resolve applicable release blockers before seeking publication authorization.
- [ ] Run post-publish smoke checks when authorized and maintain rollback/deprecation guidance; never overwrite immutable versions.

**Acceptance:** Release evidence is complete, client compatibility is qualified, platform gates are resolved and publication is separately authorized.

**Evidence / findings:** None yet; add results and blocker IDs here.

## Cross-repository sequencing

C0/S0 agree on the credential-provider interface. S1–S3 can proceed while the client is being built. S4 needs C3/C4; S6 needs C8. Client codec, transport and integration tests use independently generated synthetic credentials rather than requiring @useceleris/server. The dependency direction is server → client only. Local packed prerelease artifacts can support development without prematurely publishing either package; stable server integration depends on a qualified installable client release.

C6 defines and tests the presence recovery request boundary; C7 implements the recovery scheduler, and C8 verifies the combined path. Documentation can be drafted earlier, but example acceptance waits for the implementation it demonstrates. A completed client package is not evidence that all six language SDKs have launched.

## Blocker register

Initial entries describe known dependencies/findings; they do not imply implementation tests have already failed. Add a named owner, resolution revision and test evidence as work proceeds.

| ID      | Finding / dependency                                                  | Development impact                                                                                                    | Stable release gate                                                                       | Owner / resolution evidence             |
| ------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------- |
| D-001   | Server accepts credentials older than the documented freshness window | Implement fresh signing and honest expiry behavior; never assume SDK freshness fixes server acceptance                | Recorded service/security resolution and boundary tests required                          | Service/security owner unassigned; open |
| D-002   | Batched error boundaries are ambiguous                                | Build bounded fail-safe parsing and negative fixtures; no guessed error splitting                                     | Protocol-owner disposition and compatible conformance evidence required                   | Protocol owner unassigned; open         |
| D-003   | Relayed identifiers can corrupt framing                               | Reject unsafe local identifiers; malicious peers remain a server concern                                              | Service/security fix or verified resolution with malicious-peer tests required            | Service/security owner unassigned; open |
| PORT-01 | Older specs describe Node-only signing; new scope includes Bun/Deno   | Record superseding scope and concrete capability/runtime matrix in stage 0/1; keep source docs unchanged in this pass | Reconcile spec support claims and attach real runtime qualification before stable release | SDK contract owner unassigned; open     |
| DEP-01  | Client package is not implemented/published yet                       | S4/S6 wait for linked client milestones; client development is independent                                            | Stable server dependency must be installable and qualified                                | Package owners unassigned; open         |
| ACK-01  | Client request-object provider types await server acknowledgement     | Client C4 exports `Credentials`/`CredentialRequest`/`CredentialProvider` as the concrete artifact; S4 reviews and accepts them | Acknowledgement recorded in both trackers before stable release                           | Server contract owner unassigned; open  |

## Completion and maintenance

- [ ] All stages have owners, checked implementation tasks and verified acceptance evidence.
- [ ] Applicable conformance IDs and supported runtime versions are covered; inherited evidence is pinned to tested package versions.
- [ ] No unresolved required security/protocol release gate or unsupported delivery promise remains.
- [ ] Exact npm names, dependency direction, declarations, exports and examples agree.
- [ ] Package support, security response and future release maintenance have accountable owners.

Recheck the source discrepancy register before marking any blocker resolved. Local foundation and signing checks are recorded in docs/verification.md; client integration and backend acceptance remain future stages.
