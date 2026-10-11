# Server SDK agent instructions

Read [CONVENTIONS.md](CONVENTIONS.md) first — simplicity and maintainability are paramount and bind every change. Then read [runtime support](docs/runtime-support.md) and [code conventions](docs/code-conventions.md).

The protocol contract, the recorded decisions this package's API traces to, and the evidence behind them live in the private `celeris-sdk-specs` repository. Consult it before changing anything on the public surface.

- Never create a git commit without the user's explicit consent in the current conversation. Leave changes uncommitted and ask; approval of a plan or edit is not commit consent.
- Segment model (SEG-01, owner directive 2026-09-20): in the client SDK, one `Channel` is one WebSocket client carrying all of that channel's segments; connecting auto-joins the default segment `"default"`; `Segment` handlers are proxies sharing the channel connection, never sockets of their own. Server-relevant consequences: signing claims scope segments explicitly (`SegmentPermissions`), `PUB` does not join a segment, `PRES_SUB` watches presence without joining, and `SUB` needs read access — a write-only token publishes and cannot subscribe. Keep the examples and the credential provider consistent with this model; the full segment model is recorded in the specifications repository.
- Author code and fixtures in TypeScript `.ts` files. JavaScript extensions belong only to generated package/temporary consumer output. Use tsdown CLI directly; no custom build script.
- Keep source/runtime dependencies and public types portable. Node APIs are allowed only in build/test tooling, never `src/`.
- Add dependencies only with `npm install --save-dev --save-exact package@latest` (omit `--save-dev` for an explicitly authorized runtime dependency). Let npm write versions and the lockfile; never hand-edit dependency versions. Use `npm install` to restore existing lockfile state and verify no unexpected diff.
- Use Vitest with explicit imports and separate test files. Real Bun/Deno subprocess evidence is required for their qualification; missing runtimes must fail, not skip.
- Do not introduce deprecated APIs in source, tests, fixtures or tooling. Check installed type declarations and official migration guidance when choosing or replacing APIs; use supported replacements instead of suppressing deprecation warnings. Include deprecation checks in code review. For Vitest exception assertions, use `toThrow`, not the deprecated `toThrowError` alias.
- Keep real credentials out of fixtures, errors and logs.
- Keep the server → client dependency direction; add the client dependency only in S4. Other repositories remain read-only unless separately authorized.
- Run `npm run check` with the full runtime matrix before marking qualification complete. It runs the build, both typechecks, oxlint (`npm run lint`: correctness and type-aware typescript rules, plus the house layout: a blank line after every closing block and around top-level declarations, and an end marker such as `} // end method connect` on every multi-line function, method and class), Prettier (`npm run format:check`) and the local suite. Do not publish this private foundation package.

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

## Schemas and naming

Use descriptive domain names for functions, schemas and parsed values (for example, `prepareTokenPayload` and `parsedClaims`). Use Zod for actual runtime input validation and derive those input types with `z.input` or `z.infer`. Use plain TypeScript types for generated outputs and behavioral contracts; never create unused schemas solely for type inference. Prefer supported Zod validators, defaults and object composition over custom checks. Reserve refinements for domain rules such as uniqueness. Parse once at the input boundary, keep token mapping explicit, and never expose raw validation errors or input values.

## Cryptography and encoding

Prefer established cryptographic and encoding libraries over custom implementations. Use @noble/hashes for HMAC-SHA512 and @scure/base for Base64/hex; preserve independent protocol vectors when changing dependencies. Review exact installed versions, compatibility and audit scope. Do not add alternative crypto backends or custom encoding helpers without a concrete requirement.

Use extensionless relative imports in authored TypeScript source, tests and fixtures. Preserve extensions required by dependency export names and generated artifact paths. Use bundler resolution for authored code; qualify installed ESM/CommonJS declarations independently.
