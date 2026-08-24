# Releasing `yakit-ui`

The repository uses Changesets v2 actions and npm Trusted Publishing. The release path never stores an npm token in GitHub or repository files. The one-time bootstrap uses the package owner's existing local npm login and an interactive 2FA challenge; no credential or OTP is copied into this repository, GitHub, logs, or chat.

## One-time repository and npm setup

The repository and published package use the MIT License, matching the existing YakitLibs package ecosystem. The root and package copies are checked for exact equality by the release policy tests.

npm requires a package to already exist before Trusted Publishing can be configured. Because `yakit-ui` does not currently exist on the registry, GitHub OIDC cannot perform its first publication. Under the no-token policy, the bootstrap is a separate human operation. This bootstrap is not part of CI and was not run while preparing this repository.

Bootstrap sequence for the first Version Packages pull request:

1. Run `npm view yakit-ui name version --json` against `https://registry.npmjs.org`. For a new unscoped package it must return `E404`; if it resolves, stop and resolve package ownership or choose an approved name before merging anything.
2. Protect the `main` branch and require the `CI` workflow.
3. Leave the repository variable `NPM_TRUSTED_PUBLISHING_ENABLED` unset. This lets the workflow build and verify the first version while its OIDC publish job is skipped.
4. Review the Version Packages diff. For the initial release it must consume the initial Changeset and change `yakit-ui` from the unpublished `0.0.0` placeholder to `0.1.0`.
5. The bot-created PR's `pull_request` checks initially require maintainer approval because it was opened with `GITHUB_TOKEN`. A maintainer with write access must click **Approve workflows to run**, then merge only after `CI / quality` passes. This keeps untrusted PR code out of a privileged trigger without adding a PAT or GitHub App credential.
6. The resulting release run creates a `yakit-ui-verification-<run-id>` artifact containing the exact tarball and `verification-manifest.json`.
7. Download and inspect that artifact. Recompute the tarball SHA-256 and compare it with `verification-manifest.json`; do not rebuild or repack a different artifact.
8. From a local terminal, verify the intended npm identity with `npm whoami`, then publish the downloaded tarball:

   ```bash
   npm publish ./yakit-ui-0.1.0.tgz --access public --tag latest
   ```

   Do not put an OTP on the command line. Current npm clients prompt interactively after the registry requests 2FA, so the OTP is not stored in shell history or shared with an automation agent.

9. Verify `npm view yakit-ui@0.1.0 version dist.tarball dist.integrity --json`, install the registry version in a clean directory, and run the component/CSS/Storybook smoke checks before changing any release setting.
10. In the new npm package's settings, configure a GitHub Actions Trusted Publisher for:
    - organization or user: `yaklang`
    - repository: `yakit-components-library`
    - workflow: `publish.yml`
    - environment: `npm-release`
    - allowed action: `npm publish`

    The equivalent audited CLI command requires npm 11.15 or newer:

    ```bash
    npx --yes npm@11.19.0 trust github yakit-ui \
      --file publish.yml \
      --repository yaklang/yakit-components-library \
      --environment npm-release \
      --allow-publish
    ```

11. Create the GitHub Environment `npm-release` and restrict deployments to `main` and `pre/*`. Add required reviewers when the repository plan supports them. At the initial bootstrap on 2026-08-24, the private-repository plan rejected that rule with HTTP 422, so the reviewed Version Packages PR merge became the human release approval and the Environment supplied branch scoping. Only after both the npm trust binding and GitHub Environment exist, set the repository variable `NPM_TRUSTED_PUBLISHING_ENABLED=true` for later releases.
12. If GitHub metadata is wanted for the bootstrap version, use the documented metadata-only recovery with the original run ID and verification artifact ID.
13. Do not add `NPM_TOKEN`, `NODE_AUTH_TOKEN`, an `.npmrc` credential, or a classic automation token to the repository or GitHub.

Official references: [npm trust prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/), and [unscoped public package publishing](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/).

## Local repository dry-run

Use Node 24 and pnpm 10.34.5, then run:

```bash
pnpm install --frozen-lockfile
pnpm release:dry-run
```

The dry-run verifies the only-public-package boundary, release policy tests, launcher security tests, library and Storybook build, emitted package contract, clean-consumer checks, tracked size ceilings, and the npm pack manifest. The clean-consumer gate creates an isolated temporary tarball, installs it with an empty npm user configuration, and deletes it after verification; the command leaves no tarball in the repository and cannot publish.

CI uses Playwright's dependency-pinned Chromium for portable component coverage. The frozen solid-icon pixel-parity suite is intentionally separate because its provenance contract requires the exact local Google Chrome/macOS build recorded in the fixture. Run the full suite on that recorded renderer with:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  pnpm --filter yakit-ui test
```

When the package surface intentionally changes, commit the release inputs first. From that clean source commit, create the size-policy candidate:

```bash
pnpm release:policy:init --source-sha "$(git rev-parse HEAD)"
```

Review the candidate metrics and manifest diff before replacing `.release/yakit-ui-package-policy.json` in a follow-up commit. The policy's `sourceCommit` must identify the preceding commit that actually contains the measured package inputs; never copy an older SHA onto newly generated metrics.

## Stable flow

1. Add a Changeset on a feature branch with `pnpm changeset`.
2. Merge through the required CI checks.
3. A push to `main` runs `changesets/action/select-mode`.
4. When versioning is needed, the workflow opens or updates the Version Packages pull request.
5. After that pull request lands, the workflow builds once, creates the Changesets pack artifact, and independently verifies its tarball and identity.
6. After bootstrap, `NPM_TRUSTED_PUBLISHING_ENABLED=true` lets the publish-only job enter the branch-restricted `npm-release` Environment, request npm OIDC, and publish that exact pack artifact. When the GitHub plan supports Environment required reviewers, that job also pauses for approval; otherwise the reviewed Version Packages PR merge is the final human gate. The job cannot rebuild or write GitHub tags/releases.
7. Registry smoke verification and GitHub tag/release reconciliation run as independent children of publish.

## Prerelease flow

Prepare a dedicated branch such as `pre/beta`, enter Changesets prerelease mode with tag `beta`, and commit `.changeset/pre.json`. On that branch `.changeset/config.json` must use `pre/beta` as `baseBranch`. The preflight gate requires the branch, prerelease state, version suffix, and npm dist-tag to agree; `latest` is never used for a prerelease.

## Recovery and rollback

If npm publication succeeds but GitHub metadata fails, first re-run only the failed jobs in the original workflow. If that run is unavailable, invoke `Publish yakit-ui` with `recovery=true`, the original source run ID, and exact verification artifact ID. Recovery is allowed for 14 days while evidence is retained for 30 days. A read-only job validates the retained tarball, registry version, dist-tag, and commit before a separate no-OIDC job writes metadata. Recovery cannot rebuild or republish.

For a bad live version, fix forward with a patch. Deprecating a version or moving an npm dist-tag is an explicit operator action and is intentionally outside this workflow; rehearse the exact command against a non-production fixture before changing the registry.
