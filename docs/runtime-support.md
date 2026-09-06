# Runtime support and tooling

This records compatibility targets, not universal JavaScript compatibility. S1 checks package loading, exports, declarations and import side effects; later stages qualify signing and realtime behavior.

| Role                      | Targets                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| SDK consumer floors       | Node 22.15.0, Bun 1.3.0, Deno 2.5.0                                                                     |
| Additional consumer tests | Current Node 22/24/26 lines, current stable Bun/Deno                                                    |
| Development host          | Node supported by installed Vitest; Node 24.11+ recommended; tsdown requires ^22.18.0 / ^24.11.0 / >=26 |
| CI operating systems      | Linux test job; full version matrix and Windows/macOS qualification remain separate                     |

Production compilation uses ES2022 and DOM standard API types, with `types: []`. Node types are limited to test/tooling configuration. Required future signing capabilities: SubtleCrypto importKey/sign with HMAC-SHA512, TextEncoder, Uint8Array, AbortSignal. Realtime capabilities belong to the client; signing alone does not require WebSocket. No ambient Bun/Deno/Node-specific APIs enter public types.

## Test matrix selection

Vitest runs on the development Node host. Set CELERIS_RUNTIME_MATRIX to a JSON array of records with `name`, `kind` (node/bun/deno), and `command` (executable path). It launches each runtime as a child process and asserts actual package-consumer results. Default matrix uses current Node plus `bun` and `deno` on PATH. Missing executables fail package execution and are never skipped. CI installs Node 24 and current Bun/Deno; the test suite does not implement or test version comparison.

```sh
CELERIS_RUNTIME_MATRIX='[{"name":"node","kind":"node","command":"node"},{"name":"bun","kind":"bun","command":"bun"},{"name":"deno","kind":"deno","command":"deno"}]' npm test
```

CI runs one Linux job with the default three-runtime selection. Minimum-version and cross-OS qualification remain separate; this job does not establish the full support matrix. ESM is executed in every runtime; CJS additionally in Node/Bun. NodeNext ESM/CJS and bundler-resolution declaration consumers run with the installed latest TypeScript. Use isolated runtime downloads/install locations; do not modify global installations for tests.

## Dependency policy

Build uses the tsdown CLI directly, with no custom build script. tsdown was added using `npm install --save-dev --save-exact tsdown@latest`.

Initial install: `npm install --save-dev --save-exact typescript@latest vitest@latest prettier@latest @types/node@latest`. npm resolves versions and writes package metadata; committed lockfile preserves that selection. Restore with npm install and check metadata has not changed. Do not manually edit dependency versions. Additional packages require actual need and the same latest-stable installation/review policy. S1 originally had no runtime dependencies. S2 validation now uses Zod, installed through `npm install --save-exact zod@latest`.

## Official references

Checked 2026-09-06: [Node Web Crypto](https://nodejs.org/download/release/v22.15.0/docs/api/webcrypto.html), [Bun Web APIs](https://bun.sh/docs/runtime/web-apis), [Deno Web APIs](https://docs.deno.com/runtime/reference/web_platform_apis/), [Vitest](https://vitest.dev/guide/), [TypeScript modules](https://www.typescriptlang.org/docs/handbook/modules/reference.html). Package registry metadata and executed tests establish concrete tool compatibility; doc availability alone is not qualification.

## Tooling compatibility findings

Latest TypeScript 7.0.2 and tsdown 0.23.0 build the foundation successfully, but tsdown reports that TypeScript 7 API integration is experimental. No downgrade was made; later nonempty public declarations need continued consumer qualification.

Vitest 5.0.0/Vite 8.2.2 declarations fail full third-party declaration checking with latest TypeScript (missing @vitest/expect and MarkOptions, and incompatible benchmark-provider optionality). `skipLibCheck: true` is scoped to tsconfig.tooling.json only; authored tests still typecheck. Production compilation and installed consumer checks keep full declaration checking. This is an explicit tooling limitation, not a claim of clean upstream types.
