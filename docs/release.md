# Releasing @useceleris/server

This package uses **manual semantic versioning**. A release version is chosen,
reviewed and committed before it reaches the protected `release` branch. A
maintainer then starts the release workflow from that branch to validate the
exact commit and upload a reviewable npm stage. A maintainer approves the stage
separately before npm makes the package public.

## Required setup

The `release` branch is protected and accepts changes through reviewed pull
requests. It must contain [the release workflow](../.github/workflows/release.yml).
Merging into this branch never publishes automatically. A maintainer explicitly
starts the workflow from `release` in the GitHub Actions interface. The workflow
file must also be present on the default branch for GitHub to offer the **Run
workflow** button.

Before the first run, configure npm trusted publishing for
`@useceleris/server` in npmjs.com under **Package settings → Trusted Publisher**:

```text
Provider:          GitHub Actions
Organization:      useceleris
Repository:        sdk-js-server
Workflow filename: release.yml
```

Allow `npm stage publish` for that trusted publisher. The configuration must
match the repository and workflow filename exactly. It must complete a first
successful publish within two days of being created.

The workflow uses a short-lived GitHub OIDC identity, not an `NPM_TOKEN` or any
other npm publishing secret. It requires `id-token: write` and runs on the
GitHub-hosted `ubuntu-24.04` runner, which npm supports for trusted publishing.

## Choosing the version

Follow semantic versioning:

| Change                                                                | Bump  | Example           |
| --------------------------------------------------------------------- | ----- | ----------------- |
| Backward-compatible bug fix, documentation fix or internal correction | Patch | `1.1.1` → `1.1.2` |
| New backward-compatible public capability                             | Minor | `1.1.1` → `1.2.0` |
| Removed, renamed or incompatible public behavior                      | Major | `1.1.1` → `2.0.0` |

Never reuse a version. npm packages and git tags are immutable release records.

## Preparing a release

Create a release-preparation branch from `release`. For a chosen version, use
npm to update the manifest and lockfile without creating a local git tag:

```sh
npm version 1.1.2 --no-git-tag-version
```

On Windows PowerShell installations where `npm.ps1` is disabled, run:

```powershell
npm.cmd version 1.1.2 --no-git-tag-version
```

Both values must be identical before merging:

```text
package.json                 1.1.2
package-lock.json            1.1.2
```

The server's package-consumer tests install the exact client version declared in
its development dependencies. If a server release changes that dependency to a
new client version, approve the client npm stage first so that version is public
on npm. Unrelated server releases can keep using the existing public client
version and stage independently.

Open a pull request into `release`. The normal CI workflow validates the build,
typechecks, linting, formatting and tests. Review the selected semantic-version
bump and package dependency changes with the product change. Merge only after
CI passes. Then open **Actions**, select **Release**, choose the `release`
branch and select **Run workflow**. The workflow rejects dispatches from any
other branch. Do not run the workflow until npm trusted publishing is
configured.

## What the release workflow does

The manual workflow dispatch from `release` starts the release workflow. It:

1. Installs the committed dependency lockfile with `npm ci`.
2. Installs Bun and Deno, which the package-consumer matrix requires.
3. Runs `npm run check`, which builds, typechecks, lints, format-checks and
   tests the package.
4. Uses GitHub OIDC to run `npm stage publish --access public` for the exact
   package version.

The stage is not a public npm release. The workflow intentionally creates no
git tag or GitHub Release until a maintainer approves the staged package.

## Reviewing and approving a stage

After the workflow succeeds, a maintainer with npm access reviews the pending
stage. Use the stage id reported by the workflow:

```sh
npm stage list @useceleris/server
npm stage view <stage-id>
npm stage approve <stage-id> --otp=<one-time-password>
```

Approving makes the staged version public. Create the matching git tag and
GitHub Release only after approval, and point them at the release commit.

## Failed releases

If validation fails before staging, fix the release branch through another pull
request and let the workflow run again. Do not change the version merely to
retry a failed build.

If a stage has already been uploaded, review, approve or reject that stage
instead of blindly running the workflow again. Never create a second version
solely to repair staging or release metadata.
