# Server SDK agent instructions

Read [STAGES.md](STAGES.md), [contracts](docs/contracts.md), [runtime support](docs/runtime-support.md), and [verification](docs/verification.md).

- Work only in the authorized stages. S0/S1 supply contracts and tooling, not a signer or client integration.
- Author code and fixtures in TypeScript `.ts` files. JavaScript extensions belong only to generated package/temporary consumer output. Use tsdown CLI directly; no custom build script.
- Keep source/runtime dependencies and public types portable. Node APIs are allowed only in build/test tooling, never `src/`.
- Add dependencies only with `npm install --save-dev --save-exact package@latest` (omit `--save-dev` for an explicitly authorized runtime dependency). Let npm write versions and the lockfile; never hand-edit dependency versions. Use `npm install` to restore existing lockfile state and verify no unexpected diff.
- Use Vitest with explicit imports and separate test files. Real Bun/Deno subprocess evidence is required for their qualification; missing runtimes must fail, not skip.
- Do not claim signing functionality from Web Crypto capability probes. Keep real credentials out of fixtures, errors and logs.
- Keep the server → client dependency direction; add the client dependency only in S4. Other repositories remain read-only unless separately authorized.
- Update stage evidence truthfully. Pending client contract acceptance and release blockers cannot be checked off from local tests.
- Run `npm run check` with the full runtime matrix before marking qualification complete. Do not publish this private foundation package.
