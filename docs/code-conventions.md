# Readability and maintainability review

Readability and minimum necessary code are required completion gates for every code change, including fixtures, tests, helpers, configuration and tooling. Formatting is necessary but does not replace review of structure and intent.

## Rules

- Give each file one clear responsibility. Keep test assertions separate from process execution, fixture preparation and runtime configuration.
- Name functions and variables for their domain purpose. Prefer consumerDirectory, runCommand and minimumVersions over generic or abbreviated names.
- Keep setup, action and assertions visually distinct. Use named objects for configuration instead of positional tuples whose meaning depends on order.
- Use explicit control flow and braces. Avoid clever reductions, nested ternaries and long expression chains when a simple loop communicates intent.
- Extract a helper when it isolates a coherent operation or removes meaningful repetition. Do not add wrappers, classes or generic frameworks solely to shorten a file.
- Make temporary resource ownership and cleanup obvious. Avoid allocating resources at module import, and clean up after failed setup.
- Keep assertions near the behavior they verify. Helpers must not hide failures or turn required checks into skips.
- Comment non-obvious reasons and invariants; do not narrate straightforward code. Keep authored code TypeScript and build steps in standard CLI tooling.

## Review checklist

- [ ] A reader can identify each file's responsibility and follow the main path without jumping through unrelated helpers.
- [ ] Names explain purpose; configuration fields explain their values.
- [ ] Setup, actions, error handling and cleanup are easy to locate.
- [ ] Tests read as behavior specifications, with explicit failure messages.
- [ ] Shared helpers reduce duplication without obscuring ownership or assertions.
- [ ] Each test catches a package-owned defect rather than testing a tool or runtime API.
- [ ] Every changed file was reviewed, including fixtures and support code.
- [ ] Redundant checks, setup and speculative abstractions were removed without weakening protections or tests.
- [ ] The diff preserves behavior, and relevant automated checks pass.

Record this review beside test evidence before marking work complete. There is no arbitrary line-count limit: split by responsibility, not a number. Automated formatting and typechecks do not certify semantic readability.

## Current test layout

Group related suites by concern: `tests/foundation/` contains package, declaration, portability and runtime checks; `tests/validation/` contains claims and validation unit tests. Shared helpers and fixtures remain in `tests/helpers/` and `tests/fixtures/`. Test-only helpers own command execution, isolated package setup and runtime matrix selection. Fixtures remain authored `.ts` files compiled into disposable consumers by tsdown CLI. Suites run serially because clean builds share the repository's dist directory.

## Breathing room

Leave one blank line after a block closes — `if`, `for`, `while`, `switch`, `try` — before the next statement. The only exceptions are a closing brace followed directly by `else`, `catch`, `finally` or another closing brace. Also leave one blank line between a declaration and a multi-line block that uses it.

```ts
let message: ServerMessage;

try {
  message = decode(bytes);
} catch {
  return;
}

deliver(message);
```

Prettier keeps a single blank line but never adds one, so nothing enforces this automatically; it is checked in review. Code packed straight against the block before it is harder to read, and is treated as a defect.

## Constants

Every fixed value lives in `src/constants.ts` — limits, bounds, timeouts, defaults, and shared text encoder/decoder instances — named in `SCREAMING_SNAKE_CASE`:

```ts
export const MAXIMUM_COMMAND_BYTES = 2 * 1024 * 1024;

export const DEFAULT_SEGMENT_ID = "default";
```

Import them by name; do not redeclare a value locally or repeat it as a bare literal. A value that appears in two places drifts: the connect timeout was once written in two files, and the replay lookback cap in two others. Keep each constant's explanation as a comment beside it.

Zod schemas are not constants in this sense. They are validation definitions, so they stay beside the code that uses them, in camelCase — though a limit a schema enforces still comes from `src/constants.ts`.

## Imports and the public surface

Import a type or value from the module that defines it. Never re-export from an internal module to save another file an import: a pass-through hides where a type actually lives and gives it two import paths.

`src/index.ts` is the only file that re-exports. Anything public is exported there, directly from its defining module.
