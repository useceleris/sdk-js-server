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
