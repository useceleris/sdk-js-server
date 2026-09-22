# S0/S1 verification

Date: 2026-09-06. Host: macOS arm64; orchestration Node 24.13.0 / npm 11.6.2. Evidence captures the S0/S1 foundation working tree; its local commit is recorded in repository history. Contract source revisions and refreshed observations appear in [contracts](contracts.md).

## Installed dependency evidence

All direct dependencies were installed via npm install with @latest and --save-exact; npm generated package.json dependency values and package-lock.json.

| Development dependency | Resolved version |
| ---------------------- | ---------------- |
| TypeScript             | 7.0.2            |
| Vitest                 | 5.0.0            |
| Prettier               | 3.9.6            |
| @types/node            | 26.4.1           |
| tsdown                 | 0.23.0           |

No runtime or client dependency. npm reported zero vulnerabilities after both installs. This is an advisory scan result, not a complete security guarantee. See [tooling limitations](runtime-support.md#tooling-compatibility-findings).

## Historical executed tests (before test-scope cleanup)

`npm test` with the explicit eight-runtime CELERIS_RUNTIME_MATRIX passed **34 tests**. Each runtime ran real packed ESM consumer and RFC 4231 HMAC capability probes; Node/Bun additionally ran CJS consumers. Vitest was hosted by Node; Bun/Deno were actual subprocesses, not mocked environments.

| Consumer runtime | Executed version | Result |
| ---------------- | ---------------- | ------ |
| Node floor       | 22.15.0          | Pass   |
| Node 22          | 22.23.2          | Pass   |
| Node 24          | 24.20.0          | Pass   |
| Node current     | 26.8.1           | Pass   |
| Bun floor        | 1.3.0            | Pass   |
| Bun current      | 1.4.2            | Pass   |
| Deno floor       | 2.5.0            | Pass   |
| Deno current     | 2.9.6            | Pass   |

Runtime packages were installed under /tmp/celeris-s01/runtimes via npm install, outside the repository. Global installations were not changed. These locations are disposable; CI installs equivalent targets independently.

Additional passing checks: tsdown clean ESM/CJS build, latest-TypeScript production/tooling typechecks, installed ESM/CJS/bundler declaration consumers, package allowlist, no runtime dependencies, production portability scan, private-path rejection, clean rebuild and capability-free imports. Capability probes do not implement or qualify SDK signing.

## Pending evidence

GitHub Actions workflow exists with Linux full runtime matrix plus Windows/macOS Node smoke jobs. It has not been pushed or executed in GitHub. Local macOS results do not establish Linux/Windows support. S1 remains In progress until those required CI jobs pass. S0 remains In progress until client C0 accepts the documented handoff. D-001–D-003 remain open release gates. S2–S8 are not implemented.

Final authoring check: all authored code and fixtures use `.ts`; only generated artifacts use JavaScript extensions. No custom build script remains. After this conversion, all 34 runtime tests, typechecks, formatting, and 31 relative documentation links passed. Re-running npm install preserved package.json and package-lock.json byte-for-byte.

## Readability review — 2026-09-06

The mixed foundation test file was replaced by four focused suites: package contents, declarations, portability and runtime behavior. Shared TypeScript helpers isolate command execution, package fixture lifecycle and runtime configuration/version handling. No custom build script or new dependency was added.

Readability checklist reviewed: file responsibilities are explicit; configuration uses named fields; control flow uses descriptive names and braces; resource allocation occurs in setup with failure-safe cleanup; assertions remain in suites. Formatting alone was not used as evidence of maintainability.

After refactoring, all 34 tests passed across four suites and the same eight runtime targets. Typechecks also passed. Linux/Windows CI and client contract agreement remain pending, unchanged by this refactor.

## Fixture and minimum-code review — 2026-09-06

Reviewed all fixture files: capabilities.ts, consumer.ts, consumer-require.ts and the shared import-guard.ts. Also reviewed their runtime assertions and package setup helper. Removed duplicated capability guards, unnecessary ESM global-restoration bookkeeping, and repeated inline result assertions. Fixtures now return observations for Vitest to verify; forbidden import side effects still throw at their source. CommonJS environment restoration remains because subsequent reporting needs it.

Runtime consumer compilation now runs only for the runtime suite, not for package/declaration tests that do not use those consumers. No dependency was added. The minimum-necessary-code rule applies to fixtures and support files as well as production code, without removing required validation or cleanup.

After these changes: 34 tests passed across four suites and eight runtime versions; typechecks and diff whitespace checks passed. Full fixture readability was inspected directly, not inferred from formatting or test results.

## Test scope revision

Earlier 34-test counts include standalone capability probes, runtime-version assertions and a tsdown cleanup test. Those results are retained above as historical evidence, not current requirements. These out-of-scope tests and their unused fixture/helper code have been removed. The current suite checks package contents, installed imports and side effects, private exports, declaration resolution, dependency constraints and production portability.

Current validation after scope cleanup: `npm run test` with the existing eight-runtime matrix passed **17 tests across four suites** on macOS arm64. This replaces the earlier 34-test suite for ongoing validation. Typechecks passed; no production code or dependency metadata changed. Reviewed the remaining consumers/import guard, runtime selector, package fixture setup, and package/runtime assertions for readability and orphaned code. Cross-OS CI remains pending.

## S2 validation

2026-09-06: internal claims validation and payload preparation completed against server `9b67cb6634a9c24754e75df25e2cbc2df1b26f26`, specs `d51738c0fe6aff5fa6d2fecc0bb8efb4169bbddf`, and package base `4618c665afdfa72ae243b86af89876ded08bf6e7` plus this working-tree change. Source revisions match the inspected S2 tracker evidence. No server/spec files changed.

`npm run test` passed **111 tests in six suites** (6.91 seconds), with **94 Node-hosted validation unit cases** and the existing **17 foundation checks**. Foundation consumers exercised Node 22.15.0, 22.23.2, 24.20.0, 26.8.1; Bun 1.3.0, 1.4.2; Deno 2.5.0, 2.9.6. Host: macOS arm64, Node 24.13.0. Matrix supplied through CELERIS_RUNTIME_MATRIX using the existing isolated runtime installations. Import results do not qualify internal validation across runtimes; full signer qualification remains S3/S6.

Build, production/tooling typechecks, formatting and diff checks passed. Existing TypeScript 7 experimental API warning remains. No dependencies, public exports or signing implementation added. Initial typecheck exposed array-valued Vitest table argument handling; corrected the tables and reran all checks.

Readability review covered all three new source modules, both validation suites, the four relocated foundation suites and changed documentation. Foundation suites moved to `tests/foundation/`; validation suites live in `tests/validation/`. Foundation changes only adjust helper import paths. Shared fixtures/helpers remain unchanged. Reviewed explicit control flow, descriptive names, independent expected payloads, safe errors and ownership copying; no generic schema framework, cloning utility or new fixture infrastructure was necessary. S0 client agreement, S1 cross-OS evidence and D-001–D-003 remain open; S3–S8 remain unchecked.

## CI simplification

2026-09-06: replaced the version/OS jobs and inline runtime-selection script with one Linux job: checkout, Node 24/Bun/Deno setup, npm install and npm run test. Actions use major tags, including checkout@v7 and setup-node@v7. Removed audit, metadata-diff and aggregate-check steps from CI as requested. Full version/OS qualification remains separate; prior evidence is historical. Reviewed the complete workflow and runtime-support wording for readability and obsolete requirements. GitHub execution remains pending.

## Zod validation migration

2026-09-06: installed Zod 4.5.4 through `npm install --save-exact zod@latest`; npm generated the manifest and lockfile changes. Installed metadata reports MIT licensing, ESM/CommonJS entrypoints, no runtime dependencies and no declared engine constraint. npm audited 67 packages with zero reported vulnerabilities. No existing dependency version changed.

Replaced manual validators with internal discriminated schemas and duplicate refinements. Synchronous parsing strips extra fields and isolates nested claims; explicit mapping preserves TokenPayload and TokenPermission. Fixed Configuration messages omit raw Zod errors and causes. Removed superseded helpers and redundant character checks. No public exports, signer or CI changes.

Final `npm run test` passed 111 tests in six suites (8.04 seconds): 94 validation cases on Node 24.13.0/macOS arm64 and 17 foundation checks using the same eight runtime versions recorded in S2. Build, typecheck, formatting and diff checks passed. TypeScript 7 experimental build warning remains. The empty entrypoint does not execute Zod in runtime consumers; these imports are not full cross-runtime validation/signing qualification.

Reviewed complete validation source, package dependency assertion, npm-generated metadata, README, contract, runtime guidance and S2 tracker edits for readability and unnecessary code. Existing behavior tests and grouped fixtures remain intact; no Zod-only tests, generic schema wrappers or error-formatting framework added. Earlier zero-dependency evidence describes the historical foundation only.

## Schema-derived types and naming

2026-09-06: moved schemas into claims.ts and replaced all handwritten claims/token interfaces and unions with Zod-derived types. Shared permission fields, integer bounds and identifier schemas remove duplicated validation definitions. Built-in patterns replace character refinements; only uniqueness uses custom refinements. Renamed payload preparation and all callers to prepareTokenPayload. No dependencies, public exports or CI changes in this refactor.

Final verification: 112 tests across seven suites passed (5.66 seconds), including 95 validation/schema cases on the development host and the unchanged 17 foundation checks with the eight-runtime matrix recorded above. Build, typecheck, formatting and diff checks passed. An initial typecheck caught a caller fixture annotated readonly; changed it to satisfies SigningClaims so the test can demonstrate mutation of the original caller array. Parsed defaults, readonly types, frozen parsed copies and unchanged caller ownership are verified. Full signer runtime qualification remains pending.

Reviewed claims.ts, validation.ts, all three validation suites, AGENTS.md and contract/evidence changes for descriptive names, unnecessary code, safe error handling and schema duplication. Removed handwritten data shapes and duplicate schema declarations; no generic validation wrapper or redundant payload parse added. Existing source/spec revisions and open release findings remain as recorded above.

## S3 portable signing

2026-09-06: implemented createSigner with asynchronous Web Crypto HMAC-SHA512, UTF-8/padded Base64/lowercase digest encoding, cancellation and fixed safe error codes. Configuration and claims types derive from schemas; standard crypto method types retain receivers. Each operation imports a nonextractable signing-only key; no cache or background resources. Removed superseded validateSignerIdentity and moved credential validation tests to the signer.

Source baseline: realtime 9b67cb6634a9c24754e75df25e2cbc2df1b26f26, specs d51738c0fe6aff5fa6d2fecc0bb8efb4169bbddf, package base 1a0667e1227b3fbc87e61abeaa409277447b37e2 plus working-tree changes. Inspected channel_token_service.rs and its tests for Base64 payload HMAC and signature wrapper. Inspected token DTO, globals, peer output and Redis presence for identifier constraints; documented the token-reference colon gap in contracts.md and added SDK rejection/regression cases. Realtime remains unchanged; source observations are not backend integration tests.

Five fixed synthetic vectors in tests/fixtures/signing-vectors.ts were generated independently with Python standard-library json.dumps(ensure_ascii=False, separators=(",", ":")), UTF-8, base64.b64encode, hmac.new(..., hashlib.sha512).hexdigest(). Expected token fields were assembled independently of SDK code. Fixtures retain exact JSON, digest and final credentials for review; no generator runs during tests. Cases cover restricted/all/deny-all permissions, Unicode client/secret/identity/segment, replay zero/u32 maximum, and echo. These deliberately old timestamps are deterministic unit fixtures, not currently valid backend credentials.

Final targeted run: npm run test passed 146 tests in eight suites (7.15 seconds). Of these, 29 signer unit cases and 86 validation/schema cases run on Node 24.13.0/macOS arm64; 31 foundation/runtime checks include 14 installed signing executions (five vectors each) across Node 22.15.0, 22.23.2, 24.20.0, 26.8.1; Bun 1.3.0, 1.4.2; Deno 2.5.0, 2.9.6. ESM signs in all eight; CommonJS signs in four Node and two Bun versions. Side-effect guards remain separate from signing consumers. NodeNext ESM/CJS and bundler declaration consumers exercise the public API. No new dependencies or CI changes.

Readability review covered signer.ts, index.ts, claims.ts, validation.ts, signer and validation tests, signing-consumer.ts, all vector cases, declaration/runtime suites, package-fixture.ts and current docs. Existing import guards/consumers were inspected and preserved. Removed duplicate identity validation, kept asynchronous ownership explicit and formatted generated declaration-consumer source for readability. Typecheck caught initial fixture overload/literal typing; corrected those. Error assertions now distinguish absent causes from undefined own properties. All failures were fixed before completion. TypeScript 7 build API warning remains; client agreement, cross-OS evidence, backend acceptance and D-001–D-003 are still pending.

## Noble and Scure migration

2026-09-06: installed @noble/hashes 2.4.0 and @scure/base 2.4.0 through `npm install --save-exact @noble/hashes@latest @scure/base@latest`. npm wrote the manifest and lockfile. Both packages are MIT-licensed ESM packages with no runtime dependencies. Noble declares Node >=20.19.0, compatible with our Node 22.15.0 floor; Scure declares no engine floor. npm audited 69 packages and reported zero vulnerabilities. No existing versions were downgraded.

Audit scope was checked in the installed READMEs: both reference the independent Cure53 assessment of version 1.0.0 in January 2022; Scure additionally records a 2.2.0 self-audit in April 2026, and Noble describes ongoing AI-assisted self-audits. These are historical assessments, not a claim that installed 2.4.0 releases received independent audits. Release provenance and full release security review remain S8 work.

Removed custom Base64/hex conversion, Web Crypto imports and the crypto option. Strict signer configuration rejects the removed option rather than ignoring it. Signing still returns a promise, with synchronous HMAC and cancellation checks before preparation and return. Removed obsolete receiver/import-key/deferred-completion tests; kept package-owned failure, mutation, pre-cancellation and fixed-vector checks. Prior Web Crypto records above are historical.

`npm run check` with the existing eight-runtime matrix passed build, typecheck, formatting and all **143 tests in eight suites** (7.69 seconds for tests), including 26 signer cases, 86 validation/schema cases and 31 foundation/runtime checks. All five unchanged vectors match through 14 installed signing executions: ESM on Node 22.15.0, 22.23.2, 24.20.0, 26.8.1, Bun 1.3.0/1.4.2 and Deno 2.5.0/2.9.6; CommonJS on those Node/Bun versions. Host remains Node 24.13.0/macOS arm64. No runtime floor changed. TypeScript 7 experimental build warning remains.

Initial CommonJS import failures came from the fixture's process.env proxy intercepting Node's internal ESM loader reading WATCH_REPORT_DEPENDENCIES, not package configuration access. Removed that runtime-wide trap and its restoration code. Package source/artifact portability checks still reject process and Node imports; crypto/network/timer import guards remain, and all installed imports pass. This avoids testing Node internals or adding a runtime-specific whitelist.

Readability review covered signer.ts, signer tests, declaration/package assertions, consumer-require.ts, npm metadata, AGENTS.md, README, contracts, runtime support and tracker edits. Deleted superseded code instead of introducing another backend abstraction. Golden vectors, other fixtures, CI and realtime were unchanged by this migration. Server acceptance, cross-OS qualification and D-001–D-003 remain pending. Diff whitespace checks passed.

## Synchronous signer and extensionless imports

2026-09-06: sign now returns SignedCredentials directly. Removed SignOptions, signal parsing, cancellation helpers/errors/tests and promise wrappers. Removed output-only credential/token/permission/segment schemas; generated outputs are plain readonly types, while actual input validation remains in Zod. Both authored TypeScript configs use ESNext/Bundler. Local source/test/fixture imports are extensionless; dependency export suffixes, generated artifact paths and installed NodeNext consumers remain intact.

Build, typecheck and npm run test passed: **141 tests in eight suites** (7.81 seconds), including unchanged signing vectors across the eight-runtime matrix documented above. Installed declarations now verify direct SignedCredentials returns. Prior asynchronous/cancellation evidence remains historical; future provider cancellation remains separate.

Reviewed complete signer/claims modules, changed imports in all authored test/helper/fixture files, synchronous signer tests, declaration/signing consumers, both TypeScript configs and current documentation. Removed unused schemas and async wrappers without adding replacements. Public Signer remains explicit. No dependency, CI, server or credential-format changes in this pass. TypeScript 7 experimental build API warning remains.

## S4 client integration

2026-09-21, macOS 26.7 (aarch64), host Node v24.13.0, Bun 1.1.29, Deno 2.9.6. Server base commit `23fec73` with this pass uncommitted; client baseline `d26d80f` plus its uncommitted simplification pass (recorded in the client's verification log). Default three-runtime matrix (node/bun/deno on PATH); the recorded eight-runtime rerun remains a qualification concern for S6, matching the client's MATRIX-01.

Implemented `createCredentialProvider({ signer, claims })` in [src/credential-provider.ts](../src/credential-provider.ts): a pure request → claims → sign pipe returning the client's `CredentialProvider`. `request.signal.throwIfAborted()` runs before `claims(request)` and again before `signer.sign`, so pre-aborted and mid-flight-aborted requests reject before any signature exists, with the abort reason propagating untouched for the client to sanitize. Options are validated by a strict Zod object with the fixed safe Configuration error; the claims result is not re-validated (the signer's validation is the single boundary). The entrypoint gained `createCredentialProvider`, the `CredentialProviderOptions` input type and the type-only re-export of `CredentialRequest`.

Dependency: `@useceleris/client@0.0.0` added to dependencies via `npm pkg set` (exact, npm-written); local resolution through `npm link ../sdk-js-client` (owner decision 2026-09-21: regular dependency plus npm link while DEP-01 keeps the client unpublished — a fresh registry `npm install` fails with E404 until publication, documented in the README with the CI implication). The import is type-only: `dist/index.js` and `dist/index.cjs` contain no `@useceleris/client` occurrence (asserted in the package suite), so the server bundle ships no client transport/codec/reconnect code and no server → client → server cycle exists. The package fixture now builds and packs both repositories and installs both tarballs into one isolated consumer in a single `npm install`, so the packed dependency resolves from the sibling artifact rather than a registry; package.json carries no file: path.

Tests: `npm run check` passed — build, both typechecks, format check and **144 tests in ten suites** (25.7 s): 14 new provider unit cases ([tests/provider/credential-provider.test.ts](../tests/provider/credential-provider.test.ts): fresh claims and timestamps per call, replay mapping through the canonical claims callback (reconnect → numeric lookback, initial → false), pre-abort and mid-flight abort before signing, claims rejection propagation, hostile-request scope isolation against the decoded wire payload, six invalid-option shapes, signer-error passthrough, `CredentialProvider` contract satisfaction); the new `provider-consumer` packed fixture run as ESM and CommonJS across the runtime matrix (initial/reconnect/aborted requests against the installed tarballs); consumer export lists extended to both value exports; declaration consumers extended in all three module modes to type the provider against the installed client declarations; manifest assertion updated for the client dependency; and a new [EXAMPLES.md drift test](../tests/foundation/examples-drift.test.ts) compiling every documented snippet against the public surface. ACK-01 recorded in both trackers and both contracts documents against client `d26d80f`.

Reviewed the provider module, entrypoint, all four touched foundation suites, the provider unit suite, both fixtures, the package fixture helper, README, EXAMPLES, contracts and tracker for readability and removable code; the only new abstraction is the exported options type mirroring `SignerOptions`. Blockers: DEP-01 open (S8 requires the published installable client); D-001–D-003 and PORT-01 unchanged; live messaging through server-signed credentials remains S6. No server/backend change, no publication.

## S5 security and lifecycle

2026-09-21, macOS 26.7 (aarch64), host Node v24.13.0, Bun 1.1.29, Deno 2.9.6. Server base commit `23fec73` with the S4 and S5 passes uncommitted; client baseline `d26d80f` plus its uncommitted simplification pass. Default three-runtime matrix; cross-OS and extended-matrix evidence remains with S6.

**No production source change.** Exploration confirmed the S4 provider already rejects before signing on abort and the client already suppresses late provider completion and sanitizes provider rejections; S5 closed the evidence gaps with tests only, and `src/` is untouched by this stage.

New evidence, all passing under `npm run check` (**153 tests in eleven suites**, 34.5 s):

- [tests/provider/credential-provider.test.ts](../tests/provider/credential-provider.test.ts) gained the external-abort case (claims genuinely pending, abort lands, late resolution → rejection with the abort reason and zero calls into a real signer, so no signature ever existed) and the two-signer isolation case (same clock/claims, different secrets → identical payloads, different signatures, deterministic reproduction — no module-level credential state). The invalid-options assertions now also pin `cause === undefined` and secret-free full-own-property serialization.
- New [tests/provider/client-lifecycle.test.ts](../tests/provider/client-lifecycle.test.ts) (3 tests) drives the real client (via the S4 npm-link resolution) against the real provider with a gated claims callback and a counting `globalThis.WebSocket` stub — no network, no timers fired: `close()` mid-acquisition → `Cancelled`, states connecting→closing→closed, late claims completion constructs zero sockets and signs nothing, state unchanged; caller-signal abort → `Cancelled` + `failed` with identical suppression; a claims failure embedding the signing secret surfaces exactly `ConnectionError("Transport", "Credential acquisition failed.")` with no cause and marker-free serialization (AUTH-04, AUTH-05, LIFE-03 via citation, RES-02).
- New [tests/fixtures/capability-consumer.ts](../tests/fixtures/capability-consumer.ts), run through the installed tarball on node/bun/deno by the runtime suite (ESM; the capability branch is module-format-independent): signs once, removes `TextEncoder` via `Object.defineProperty` (probed configurable in all three runtimes), and observes the fixed safe `Configuration` error with no secret in the message.
- [tests/foundation/package.test.ts](../tests/foundation/package.test.ts) now inspects the installed packed client artifact (AUTH-05): dependencies exactly `["zod"]`; `dist/index.js`/`dist/index.cjs` contain none of `@useceleris/server`, `createSigner`, `signingSecret`, `@noble/hashes`, `@scure/base`.
- [tests/foundation/portability.test.ts](../tests/foundation/portability.test.ts) now also forbids `console` in `src/` and `dist/` (RES-04: no diagnostic output channel ships).

Reuse boundaries recorded in [contracts — S5 security and lifecycle boundaries](contracts.md): SEC-02/SEC-03 and the bounded-writer/no-resend guarantees are client-owned and cited (client contracts, transport/channel suites, C8 live evidence), not re-tested.

Reviewed both provider suites, the new fixture, the three touched foundation suites, the fixture helper, contracts, tracker and this evidence for readability and removable code; nothing beyond the planned tests was added. Blockers unchanged: DEP-01 (unpublished client; npm-link arrangement documented in S4), D-001–D-003, PORT-01 analogues deferred to S6. No dependency change, no server/backend change, no publication.
