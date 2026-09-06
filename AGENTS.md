# Server SDK agent instructions

Read [STAGES.md](STAGES.md), [contracts](docs/contracts.md), [runtime support](docs/runtime-support.md), and [verification](docs/verification.md).

- Work only in the authorized stages. S0/S1 supply contracts and tooling, not a signer or client integration.
- Author code and fixtures in TypeScript `.ts` files. JavaScript extensions belong only to generated package/temporary consumer output. Use tsdown CLI directly; no custom build script.
- Keep source/runtime dependencies and public types portable. Node APIs are allowed only in build/test tooling, never `src/`.
- Add dependencies only with `npm install --save-dev --save-exact package@latest` (omit `--save-dev` for an explicitly authorized runtime dependency). Let npm write versions and the lockfile; never hand-edit dependency versions. Use `npm install` to restore existing lockfile state and verify no unexpected diff.
- Use Vitest with explicit imports and separate test files. Real Bun/Deno subprocess evidence is required for their qualification; missing runtimes must fail, not skip.
- Keep real credentials out of fixtures, errors and logs.
- Keep the server → client dependency direction; add the client dependency only in S4. Other repositories remain read-only unless separately authorized.
- Update stage evidence truthfully. Pending client contract acceptance and release blockers cannot be checked off from local tests.
- Run `npm run check` with the full runtime matrix before marking qualification complete. Do not publish this private foundation package.

## Required readability gate

Read [code conventions](docs/code-conventions.md) before editing code. Review readability and maintainability alongside correctness, security and performance on every change. Separate unrelated responsibilities, use descriptive names and explicit control flow, keep tests focused, and make setup/cleanup ownership obvious. Formatting alone is not a readability review. Record the checklist result with validation evidence; do not mark work complete while code remains difficult to follow.

## Minimum necessary code

Review every changed file, including fixtures, helpers, configuration and CI. Do not exclude support code from readability review.

- Implement only behavior needed by the current task. Remove redundant checks, repeated setup, unused code and speculative abstractions; prefer established tools over custom infrastructure.
- Keep fixtures minimal: perform the real operation and return observations. Keep expected results and assertions in Vitest unless a guard must fail at the point of a forbidden side effect.
- Share code only when it removes meaningful duplication. Do not create generic frameworks or extra wrappers for one-off work.
- Minimize maintenance burden, not character count: retain clear names, whitespace, braces, necessary validation, cancellation and cleanup.
- Before completion, inspect the full diff for code that can be deleted without weakening behavior or tests. Record which files were reviewed and what was removed; never claim an unreviewed folder passed.

## Test scope

Every test must identify package-owned behavior or a defect in this package it can catch. Keep installed imports, side effects, export/type boundaries, dependencies and portability checks. Do not test build-tool cleanup, runtime version comparison or standalone Web Crypto/UTF-8/AbortController behavior. Tools may build or execute our package as setup, but are not the subjects under test. Future signing tests must call our signer rather than only exercising crypto primitives. Remove unused fixtures and helpers when removing a test.
