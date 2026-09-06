# @useceleris/server

Portable Celeris server SDK foundation. **Not a usable signer yet.** The package is private and exposes no runtime SDK functions during S0/S1. Signing validation and implementation follow in S2/S3; realtime reuse follows in S4.

## Development

Use npm and a supported development Node release (Node 24 recommended). Install dependencies using `npm install`; new dependencies use `npm install --save-dev --save-exact name@latest`. Commit npm-generated dependency metadata and lockfile.

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

`npm test` builds and packs a fresh artifact, installs it into an isolated consumer, and checks actual runtime imports. It does not test SDK signing behavior because that implementation is not present. ESM and CommonJS exports include corresponding declarations; internal paths are not public.

## Documents

- [Implementation stages](STAGES.md)
- [Server contract](docs/contracts.md)
- [Runtime support](docs/runtime-support.md)
- [Verification evidence](docs/verification.md)
- [Code readability conventions](docs/code-conventions.md)

Trusted-server signing secrets must never be sent to browsers or end-user applications. Supporting Web Crypto does not make an environment trusted. No license or publication approval is implied by this private scaffold.

Before completing a change, run automated checks and perform the readability checklist. Test responsibilities are separated into package, declaration, portability and runtime suites; shared helpers remain test-only.

Tests target package-owned behavior. Standalone runtime API probes and build-tool behavior tests are excluded; build and compiler tools are used only to prepare or consume the package.
