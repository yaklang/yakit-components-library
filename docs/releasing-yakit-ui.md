# Releasing Yakit UI packages

The repository publishes the fixed-version pair `@yakit-libs/yakit-ui` and
`@yakit-libs/yakit-ui-icons` with Changesets v2 actions and npm Trusted
Publishing. The release path never stores an npm token in GitHub or repository
files. A package's one-time bootstrap uses an authorized organization member's
existing local npm login and an interactive 2FA challenge; no credential or OTP
is copied into this repository, GitHub, logs, or chat.

## One-time repository and npm setup

The repository and published packages use the MIT License, matching the existing YakitLibs package ecosystem. The root and package copies are checked for exact equality by the release policy tests.

npm package names cannot be renamed in place. The former unscoped
`yakit-ui@0.1.0` therefore remains a separate registry identity; current releases
use new packages under the `@yakit-libs` organization scope. npm requires each
scoped package to exist before Trusted Publishing can be configured. Bootstrap
both scoped packages from the dual-package verification artifact produced for
their first fixed release; never rebuild or repack either tarball locally.

Bootstrap sequence for the first Version Packages pull request:

1. Run `npm view <package-name> name version --json` against `https://registry.npmjs.org` for every package that has not been bootstrapped. For a new scoped package it must return `E404`; if it resolves, stop and resolve package ownership or choose an approved name before merging anything. Verify `npm whoami` is an accepted `@yakit-libs` organization member before publication.
2. Protect the `main` branch and require the `CI` workflow.
3. Leave the repository variable `NPM_TRUSTED_PUBLISHING_ENABLED` unset. This lets the workflow build and verify the first version while its OIDC publish job is skipped.
4. Review the Version Packages diff. `@yakit-libs/yakit-ui` and `@yakit-libs/yakit-ui-icons` are a Changesets fixed group, so the release PR must advance both to the same version and consume the relevant Changeset.
5. The bot-created PR's `pull_request` checks initially require maintainer approval because it was opened with `GITHUB_TOKEN`. A maintainer with write access must click **Approve workflows to run**, then merge only after `CI / quality` passes. This keeps untrusted PR code out of a privileged trigger without adding a PAT or GitHub App credential.
6. The resulting release run creates a `yakit-ui-verification-<run-id>` artifact containing both exact tarballs and a schema-v2 `verification-manifest.json` that binds their names, versions, hashes, sizes, and file counts.
7. Download and inspect that artifact. Recompute both tarball SHA-256 values and compare them with `verification-manifest.json`; do not rebuild or repack either artifact.
8. From a local terminal, verify the intended npm identity with `npm whoami`, then publish the downloaded tarballs (scoped package tarball filenames are emitted by the verified artifact and must not be guessed or rebuilt):

   ```bash
   npm publish ./yakit-libs-yakit-ui-icons-<version>.tgz --access public --tag latest --ignore-scripts
   npm publish ./yakit-libs-yakit-ui-<version>.tgz --access public --tag latest --ignore-scripts
   ```

   Do not put an OTP on the command line. Current npm clients prompt interactively after the registry requests 2FA, so the OTP is not stored in shell history or shared with an automation agent.

9. Verify both registry versions with `npm view <package>@<version> version dist.tarball dist.integrity --json`. Install each from the public registry in a clean directory, run the React-only icon SSR smoke, and run the component/CSS/Storybook smoke before changing any release setting.
10. In each npm package's settings, configure a GitHub Actions Trusted Publisher for:
    - organization or user: `yaklang`
    - repository: `yakit-components-library`
    - workflow: `publish.yml`
    - environment: `npm-release`
    - allowed action: `npm publish`

    The equivalent audited CLI command requires npm 11.15 or newer:

    ```bash
    for package in @yakit-libs/yakit-ui @yakit-libs/yakit-ui-icons; do
      npx --yes npm@11.19.0 trust github "$package" \
        --file publish.yml \
        --repository yaklang/yakit-components-library \
        --environment npm-release \
        --allow-publish
    done
    ```

11. Create the GitHub Environment `npm-release` and restrict deployments to `main` and `pre/*`. Before enabling automatic publishing, enforce pull requests and the `CI / quality` check for those branches, and add an Environment required reviewer. At the initial bootstrap on 2026-08-24, the private-repository plan rejected branch protection, rulesets, and required reviewers. Branch scoping alone does not enforce review, so `NPM_TRUSTED_PUBLISHING_ENABLED` must remain `false` until those platform gates are available. Until then, publish the exact verified artifact locally with interactive 2FA.
12. If a verified package or GitHub metadata is still missing after bootstrap, use the documented recovery with the original run ID and verification artifact ID. It selects only absent package versions and publishes their retained tarballs without rebuilding; already-published matching versions are never republished.
13. Do not add `NPM_TOKEN`, `NODE_AUTH_TOKEN`, an `.npmrc` credential, or a classic automation token to the repository or GitHub.

Official references: [npm trust prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/), and [scoped public package publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

## Local repository dry-run

Use Node 24 and pnpm 10.34.5, then run:

```bash
pnpm install --frozen-lockfile
pnpm release:dry-run
```

The dry-run verifies the two-public-package boundary, release policy tests, launcher security tests, both package builds, the core Storybook build, emitted package contracts, clean-consumer checks, tracked size ceilings, and both npm pack manifests. The clean-consumer gate creates isolated temporary tarballs, installs them with an empty npm user configuration, and deletes them after verification; the command leaves no tarball in the repository and cannot publish.

CI uses Playwright's dependency-pinned Chromium for portable component coverage. The frozen solid-icon pixel-parity suite is intentionally separate because its provenance contract requires the exact local Google Chrome/macOS build recorded in the fixture. Run the full suite on that recorded renderer with:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  pnpm --filter @yakit-libs/yakit-ui test
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
5. After that pull request lands, the workflow builds each package once, creates the Changesets pack artifact, and independently verifies both tarballs and their fixed-version identity.
6. After branch protection, required `CI / quality`, and an `npm-release` required reviewer are enforced, set `NPM_TRUSTED_PUBLISHING_ENABLED=true`. The publish-only job can then enter the branch-restricted Environment, request npm OIDC, and publish the exact verified pack artifact after approval. The job cannot rebuild or write GitHub tags/releases. If any platform gate is unavailable, keep the variable `false` and use the local interactive-2FA procedure from the bootstrap sequence.
7. Registry smoke verification and GitHub tag/release reconciliation run as independent children of publish.

## Prerelease flow

Prepare a dedicated branch such as `pre/beta`, enter Changesets prerelease mode with tag `beta`, and commit `.changeset/pre.json`. On that branch `.changeset/config.json` must use `pre/beta` as `baseBranch`. The preflight gate requires the branch, prerelease state, version suffix, and npm dist-tag to agree; `latest` is never used for a prerelease.

## Recovery and rollback

If publication or GitHub metadata only partially succeeds, first re-run only the failed jobs in the original workflow. If that run is unavailable, invoke `Publish Yakit UI packages` with `recovery=true`, the original source run ID, and exact verification artifact ID. Recovery is allowed for 14 days while evidence is retained for 30 days. A read-only job validates the retained evidence, registry versions, dist-tag, and commit. If schema-v2 evidence identifies an absent package version, a separately protected OIDC job publishes only that exact retained tarball with lifecycle scripts disabled, then revalidates the registry. The metadata job runs only after no verified package is missing. Existing legacy schema-v1 evidence remains valid for metadata recovery of its single `yakit-ui` tarball.

For a bad live version, fix forward with a patch. Deprecating a version or moving an npm dist-tag is an explicit operator action and is intentionally outside this workflow; rehearse the exact command against a non-production fixture before changing the registry.
