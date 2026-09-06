# @useceleris/server implementation stages

Created: 2026-09-06. This is an implementation tracker, not a report of implemented functionality. Repository baseline: no SDK implementation present when this tracker was created.

## Scope and source of truth

Package: **`@useceleris/server`**. Own trusted-server credential signing and conveniences that reuse @useceleris/client through its public interface. Do not implement a second realtime transport or state machine.

Use the [PRD](../../celeris-sdk-specs/SDK_PRD.md), [shared contract](../../celeris-sdk-specs/docs/shared-contract.md), [wire protocol](../../celeris-sdk-specs/docs/protocol.md), [JavaScript conventions](../../celeris-sdk-specs/docs/conventions/javascript.md), [conformance scenarios](../../celeris-sdk-specs/docs/conformance.md), [security policy](../../celeris-sdk-specs/docs/security-dependencies.md), [maintenance policy](../../celeris-sdk-specs/docs/maintenance.md), and [discrepancy register](../../celeris-sdk-specs/docs/discrepancies.md). Coordinate with the [other package tracker](../sdk-js-client/STAGES.md).

The user's approved runtime scope supersedes the existing specifications' Node-only server wording: portable JavaScript, with Node.js, Bun and Deno initially qualified. This tracker does not claim those targets already pass. Keep standard APIs and Uint8Array/AbortSignal/URL/public types runtime-neutral. Signing uses asynchronous Web Crypto; realtime uses WebSocket. Require capabilities only where needed; expose explicit narrow adapters for missing capabilities rather than silently loading Node-specific fallbacks. Portable signing still belongs exclusively in trusted servers.

S0 contracts and S1 foundation are now present; pending acceptance is tracked below. No backend edits or package publication are authorized by these stages. Account/billing APIs, durable offline queues, automatic uncertain resend, global ordering and invented acknowledgements remain out of scope.

## How to track progress

- Status values: **Not started**, **In progress**, **Blocked**, **Complete**. Assign an owner when a stage starts. Keep all tasks unchecked until implemented and verified.
- Complete requires checked tasks, acceptance evidence, relevant tests and reviewed findings; listing tests or writing this document is not completion. If required evidence cannot pass, mark Blocked and link the specific finding.
- Each evidence entry records command/check, result, package/spec/server revision, runtime/OS, date and sanitized artifact link. Record source inspection separately from executed tests.
- Scenario ranges below refer to existing conformance IDs; include each applicable scenario. Mark inherited or inapplicable cases explicitly with justification, never silently skip them.
- Update the stage table and its detail together; retain completed-stage evidence when later changes reopen work. Check off cross-repository prerequisites only against linked revision/results.

## Stage status

| Stage                       | Status      | Owner                                              | Evidence                             | Completed | Blockers                              |
| --------------------------- | ----------- | -------------------------------------------------- | ------------------------------------ | --------- | ------------------------------------- |
| S0 — Contracts              | In progress | Codex (implementation); client reviewer unassigned | [Contract](docs/contracts.md)        | —         | Client C0 acceptance pending          |
| S1 — Foundation             | In progress | Codex (implementation)                             | [Verification](docs/verification.md) | —         | Linux/Windows CI execution pending    |
| S2 — Validation             | Not started | Unassigned                                         | None yet                             | —         | See dependencies and blocker register |
| S3 — Signing                | Not started | Unassigned                                         | None yet                             | —         | See dependencies and blocker register |
| S4 — Client integration     | Not started | Unassigned                                         | None yet                             | —         | See dependencies and blocker register |
| S5 — Security and lifecycle | Not started | Unassigned                                         | None yet                             | —         | See dependencies and blocker register |
| S6 — Qualification          | Not started | Unassigned                                         | None yet                             | —         | See dependencies and blocker register |
| S7 — Documentation          | Not started | Unassigned                                         | None yet                             | —         | See dependencies and blocker register |
| S8 — Release                | Not started | Unassigned                                         | None yet                             | —         | See dependencies and blocker register |

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
- [ ] Create reproducible builds, checks, unit tests and CI for Node.js/Bun/Deno; select minimum versions using official capability evidence and record exact supported targets.
- [x] Keep node: imports, Buffer, process and Node-only public types outside portable core and dependencies. Test packed @useceleris/server imports and declarations in real consumers.

**Acceptance:** Portable builds and import/type checks pass on the recorded runtime matrix without requiring the client for signing tests.

**Evidence / findings:** See [contracts](docs/contracts.md) and [verification](docs/verification.md). Server handoff is documented; client agreement and required cross-OS CI execution remain pending.

## S2 — Validation

**Dependencies:** S1.

**Coverage:** SDK-02, SDK-10; AUTH-02–03, SEC-03.

- [ ] Implement explicit channel/segment claims, nonempty allowlists, unrestricted opt-in, duplicate rejection and CR/LF/nonempty identifier validation against verified constraints.
- [ ] Implement identity, replay/echo defaults and timestamp policy with injectable clock; check timestamp JSON numeric precision, replay u32 range and invalid/future inputs. Never silently backdate.
- [ ] Use immutable/copy-safe inputs and typed safe errors; test malformed fields, numeric limits, Unicode and absent versus empty semantics.

**Acceptance:** Boundary/negative tests prove least privilege and exact validated payload construction; no secret appears in errors.

**Evidence / findings:** None yet; add results and blocker IDs here.

## S3 — Signing

**Dependencies:** S2.

**Coverage:** SDK-02, SDK-10; AUTH-01–03, SEC-01.

- [ ] Implement asynchronous Web Crypto HMAC-SHA512 with exact UTF-8 JSON bytes, standard padded Base64, lowercase HMAC hex and the verified client-ID signature wrapper.
- [ ] Encode without Buffer or handwritten crypto. Detect missing crypto capabilities explicitly; adapters cannot disable verification or substitute insecure primitives.
- [ ] Verify independent synthetic golden vectors across Node.js/Bun/Deno, including Unicode, exact payload bytes, changed inputs and mutation safety. Keep client_secret distinct from signing_secret.

**Acceptance:** The same fixed inputs produce byte-identical credentials on every qualified runtime and no realtime client is needed for unit tests.

**Evidence / findings:** None yet; add results and blocker IDs here.

## S4 — Client integration

**Dependencies:** S3 and client C3/C4; full messaging validation waits for C5–C8.

**Coverage:** SDK-02–08; AUTH-03–04, LIFE-01–03, PUB-01–02, REC-01–04.

- [ ] Add a declared versioned dependency on @useceleris/client and a fresh-signing credential-provider convenience through its public API; never copy codec, transport or reconnect internals.
- [ ] Preserve cancellation, safe errors, application ownership and subscription behavior. Do not expose browser-safe claims for server signing merely because Web Crypto is portable.
- [ ] Test integration with packed client artifacts rather than source imports. Pre-release local artifact tests may unblock development; published dependencies must use installable versions, not file: paths.

**Acceptance:** Provider/client integration tests pass and full messaging qualification remains tracked in S6; dependency graph has no server-to-client-to-server cycle.

**Evidence / findings:** None yet; add results and blocker IDs here.

## S5 — Security and lifecycle

**Dependencies:** S4.

**Coverage:** SDK-02, SDK-08, SDK-10; AUTH-04–05, LIFE-03–04, RES-02–04, SEC-02–03.

- [ ] Test close/cancel during signing and credential acquisition; Web Crypto work may be non-abortable, so suppress stale completion without claiming computation was stopped.
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

## Completion and maintenance

- [ ] All stages have owners, checked implementation tasks and verified acceptance evidence.
- [ ] Applicable conformance IDs and supported runtime versions are covered; inherited evidence is pinned to tested package versions.
- [ ] No unresolved required security/protocol release gate or unsupported delivery promise remains.
- [ ] Exact npm names, dependency direction, declarations, exports and examples agree.
- [ ] Package support, security response and future release maintenance have accountable owners.

Recheck the source discrepancy register before marking any blocker resolved. Completed local foundation checks are recorded in docs/verification.md; signing and integration remain future stages.
