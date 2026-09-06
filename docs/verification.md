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

## Executed tests

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
