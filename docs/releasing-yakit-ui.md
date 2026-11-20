# Releasing Yakit UI packages

The repository publishes `@yakit-libs/yakit-ui` and
`@yakit-libs/yakit-ui-icons` as independently versioned packages with Changesets actions and npm Trusted
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
each scoped package from the verification artifact produced for its release;
never rebuild or repack a tarball locally.

Bootstrap sequence for the first Version Packages pull request:

1. Run `npm view <package-name> name version --json` against `https://registry.npmjs.org` for every package that has not been bootstrapped. For a new scoped package it must return `E404`; if it resolves, stop and resolve package ownership or choose an approved name before merging anything. Verify `npm whoami` is an accepted `@yakit-libs` organization member before publication.
2. Protect the `main` branch and require the `CI` workflow.
3. Leave the repository variable `NPM_TRUSTED_PUBLISHING_ENABLED` unset. This lets the workflow build and verify the first version while its OIDC publish job is skipped.
4. Review the Version Packages diff. Each package advances only when named by a Changeset. A shared-source change may name both packages with different bump types; neither package is bumped solely to match the other's version.
5. The bot-created PR's `pull_request` checks initially require maintainer approval because it was opened with `GITHUB_TOKEN`. A maintainer with write access must click **Approve workflows to run**, then merge only after `CI / quality` passes. This keeps untrusted PR code out of a privileged trigger without adding a PAT or GitHub App credential.
6. The resulting release run creates a `yakit-ui-verification-<run-id>` artifact containing exactly the non-empty `releaseSet` and a schema-v3 `verification-manifest.json`. Every entry has its own name, version, dist-tag, tarball hash/integrity, gates, publish state, metadata state, and recovery state.
7. Download and inspect that artifact. Recompute every included tarball SHA-256 and compare it with `verification-manifest.json`; do not rebuild or repack any artifact.
8. From a local terminal, verify the intended npm identity with `npm whoami`, then publish the downloaded tarballs (scoped package tarball filenames are emitted by the verified artifact and must not be guessed or rebuilt):

   ```bash
   npm publish ./yakit-libs-yakit-ui-<version>.tgz --access public --tag latest --ignore-scripts
   npm publish ./yakit-libs-yakit-ui-icons-<version>.tgz --access public --tag latest --ignore-scripts
   ```

   Do not put an OTP on the command line. Current npm clients prompt interactively after the registry requests 2FA, so the OTP is not stored in shell history or shared with an automation agent.

9. Verify each released registry identity with `npm view <package>@<version> version dist.tarball dist.integrity --json`. A single-package release is tested with an exact, frozen registry counterpart baseline; the other package is not published.
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

The dry-run verifies the two-public-package boundary, independent release policy tests, launcher security tests, package builds, the core Storybook build, emitted package contracts, clean-consumer checks, and npm pack manifests. CI may build both surfaces as impact probes, but only Changesets' non-empty `releaseSet` becomes a formal pack/publish artifact. The clean-consumer gate creates isolated temporary tarballs, installs them with an empty npm user configuration, and deletes them after verification; the command leaves no tarball in the repository and cannot publish.

图标检查使用 Playwright Chromium，不再要求历史 macOS、Chrome 版本或截图基线。安装测试浏览器后，运行统一检查；需要验证发布产物时再单独构建：

```bash
pnpm --filter @yakit-libs/yakit-ui-icons exec playwright install chromium
pnpm icons:check
pnpm --filter @yakit-libs/yakit-ui-icons run build
```

`icons:check` 默认离线检查当前全量图标，不访问 Figma、不写回来源或生成文件。它覆盖生成结果、当前来源与规则、功能测试和类型检查；完整发布检查仍使用上面的 `release:dry-run`。

The private root Storybook workspace builds the offline ZIP from both exact tarballs recorded in verification evidence. A single-package release uses the frozen registry counterpart and its tagged stories. The ZIP and its SHA-256 travel with the verification artifact. After registry smoke and GitHub metadata reconciliation, the workflow uploads the ZIP to the released package (UI for a joint release), and links it from the second release. A failed attachment job can be rerun on its own. Recovery uses the original verified ZIP and checks existing asset digests before adding missing links. For manual bootstrap, run the existing recovery workflow after publishing the verified tarballs to reconcile metadata and deliver the ZIP.

Open the extracted directory and run `node serve.mjs --open` with Node.js. For local authoring, run `pnpm storybook` or `pnpm storybook:build` from the repository root.

## Stable flow

1. Add a Changeset on a feature branch with `pnpm changeset`.
2. Merge through the required CI checks. The early `release:deferral-check` gate checks the intended package names, versions, Changesets ignore list and actual release plan. Developers do not maintain source, lockfile, toolchain or configuration hashes. Publish impact verification generates those fingerprints automatically for the release evidence.
3. A push to `main` starts the publish workflow and runs `changesets/action/select-mode`. Ordinary quality CI runs on pull requests and `pre/**` pushes, so merging to `main` does not repeat that workflow. Publish verification remains a separate gate.
4. When versioning is needed, the workflow opens or updates the Version Packages pull request.
5. After that pull request lands, the workflow creates a Changesets pack artifact for `{ui}`, `{icons}`, or `{ui, icons}`. Schema v3 rejects an empty set, unknown/duplicate packages, unordered entries, missing hashes, or a release entry that does not exactly match `releaseSet`. When both packages release, their versions may differ.
6. Before pack verification, the workflow downloads the immutable Changesets publish plan and compares isolated base/head package snapshots. Expected Version Packages version and generated CHANGELOG noise is normalized without ignoring other semantic changes. Each package uses its own latest reviewed release tag as the baseline; the initial icons migration fallback binds its exact version, commit, and source snapshot in `release-impact-baselines.json`. The observed package set, publish-plan set, impact probes, and packed `releaseSet` must match exactly.
7. After branch protection, required `CI / quality`, and an `npm-release` required reviewer are enforced, set `NPM_TRUSTED_PUBLISHING_ENABLED=true`. The publish-only job can then enter the branch-restricted Environment, request npm OIDC, and publish the exact verified pack artifact after approval. The job cannot rebuild or write GitHub tags/releases. If any platform gate is unavailable, keep the variable `false` and use the local interactive-2FA procedure from the bootstrap sequence.
8. Registry smoke verification and GitHub tag/release reconciliation run as independent children of publish.

正常流程仍是先合并功能 PR，再合并 Version Packages PR，之后校验并发布待发布版本。工作流实际依据 Changesets 的模式和发布计划判断，不依赖 PR 标题；普通 PR 合并也会触发发布工作流的模式判断，是否进入发布阶段取决于当时的计划。

## Prerelease flow

Prepare a dedicated branch such as `pre/beta`, enter Changesets prerelease mode with tag `beta`, and commit `.changeset/pre.json`. On that branch `.changeset/config.json` must use `pre/beta` as `baseBranch`. The preflight gate requires the branch, prerelease state, version suffix, and npm dist-tag to agree; `latest` is never used for a prerelease.

## Recovery and rollback

If publication or GitHub metadata only partially succeeds, first re-run only the failed jobs in the original workflow. If that run is unavailable, invoke `Publish Yakit UI packages` with `recovery=true`, the original source run ID, and exact verification artifact ID. Recovery is allowed for 14 days while evidence is retained for 30 days. A read-only job validates retained evidence, each `name@version`, dist-tag, and commit. Missing v3 entries are published in deterministic order (`yakit-ui`, then `yakit-ui-icons` when both exist); an existing matching version converges to `published`, while a hash/tag conflict or unknown registry response fails closed. Schema v1 is metadata-only. Schema v2 remains readable only for its original recovery evidence and cannot start a new publication.

## Independent release and durable recovery contract

- `.changeset/config.json` keeps both `fixed` and `linked` empty. A UI-only Changeset must not generate an icons version, tarball, publish attempt, tag, or recovery entry; the inverse is also true.
- `impactProbeSet` contains isolated base/head shadow builds used to check shared-source impact. Every such artifact is marked `nonPublishable`; publish/runtime assertion/recovery must reject it. `compatibilityBaselineSet` freezes the exact registry counterpart (version, resolved URL, integrity, downloaded SHA-256, cache key) and never creates a release entry.
- A UI-only `releaseSet` skips the icons size gate. An icons-only or combined release measures the exact verified icons `.tgz`, stores the report beside the tarball, and binds its SHA-256, schema, `PASS` status, and artifact SHA to only the icons release entry before the consumer gate is sealed. Publish and recovery revalidate that report binding.
- Release state uses per-package `name@version` identities. File-backed coordination uses revision-aware atomic replacement and compare-and-swap. Transactional outbox records carry a stable idempotency key; the durable consumer inbox transitions through `PROCESSING` and records `SUCCEEDED`, `FAILED`, or `AMBIGUOUS`.
- The immutable verification artifact contains `transactional-outbox.json`; the manifest binds its SHA-256 before any job receives npm OIDC authority. A read-only phase reconciles registry state, writes per-package `publishing`/`PROCESSING` lifecycle state, and uploads a uniquely named intent artifact. Only the protected OIDC job may download and validate that intent artifact ID and digest before invoking `npm publish` on the exact verified `.tgz`.
- Publication and recovery upload append-only receipt artifacts with `if: always()`. Their lifecycle snapshot advances each package through reconciliation, publishing, published, or ambiguous recovery state; the verification manifest remains immutable evidence rather than pretending its initial placeholders are live state.
- A request that was sent before a connection failure remains `AMBIGUOUS` forever and can never authorize replay. Only a producer-authenticated receipt that definitively records `NOT_ATTEMPTED` or `NOT_APPLIED` can be considered. Even then, an explicit retry decision must bind the exact prior intent/receipt IDs and hashes, the same verification artifact and tarball identity, prior/new attempt IDs, and a fresh registry-absence observation created after the configured propagation window. That observation binds its timestamp, registry URL, exact `name@version` and dist-tag, expected SHA-256/SRI, result, and its own evidence hash. Missing, stale, tampered, unknown, or mismatched evidence fails closed.
- Stable, prerelease, and recovery runs share the global `yakit-ui-npm-release` concurrency group. The lock prevents overlapping workflow producers; retained v3 evidence plus registry/GitHub observations remain the recovery authority, and uncertainty stops the workflow for reconciliation.

For a bad live version, fix forward with a patch. Deprecating a version or moving an npm dist-tag is an explicit operator action and is intentionally outside this workflow; rehearse the exact command against a non-production fixture before changing the registry.

## Explicitly deferred shared-source impact

A package may remain at its published version while another package releases
shared-source changes only through a checked-in
`scripts/release/release-deferral-policy.json`. The default impact rule remains
an exact match between observed and declared releases. A deferral policy records
the exact released and deferred versions, the deferred baseline commit, rationale
and pending-release document. The current v2 policy contains no head input hashes;
UI source, tests, Storybook and tooling may evolve while UI remains deferred.
A changed deferred version, an unobserved release or a different release identity
blocks the exception. Input hashes are computed automatically during impact
verification and stored in the evidence, rather than copied into the policy.
Retained v1 evidence still uses its original source bindings for recovery.
The existing registry baseline integrity and SHA-256 identify the already
published compatibility package; they are not fingerprints of current source.
Verification of tested versus uploaded tarball bytes remains automatic.

Impact output retains every observed probe. The v3 verification manifest keeps
`impactProbeSet` equal to `releaseSet` and additionally seals `deferredImpact`
(policy, canonical SHA-256 and non-publishable deferred probes). Manifest
validation binds that evidence to the workflow commit, released versions and
exact registry compatibility baseline. Deferred probes never become tarballs,
outbox entries, publication attempts or recovery releases. Existing v3 manifests
without deferral evidence retain their original validation rules.

Keep deferred Changesets in `docs/pending-releases` with their declared bump
levels. Review their descriptions against the final implementation and restore
them before that package's later release. This releases
only the selected package through the existing verified-tarball and protected
Trusted Publishing flow; it does not authorize publishing local candidate packs.

### 已发布成功但旧回执不确定时的只读核对

若 npm 已包含原验证产物，但旧发布回执为 ambiguous，普通发布与恢复仍由 cutover 阻止。将修复合入 `main` 后，可在 `Publish Yakit UI packages` 的 `main` 分支手动运行：`reconciliation_only=true`、`recovery=false`，并填写原 `source_run_id` 与精确 `verification_artifact_id`。保留 `authorize_retry=false`，不填写重试或 incident 参数。

此独立任务仅持有 Actions/Contents 读取权限，不使用 npm 环境、npm 凭据或 OIDC。它验证原 push 工作流、仓库、分支、提交、14 天保留窗口、下载 ZIP 的 SHA-256、完整 manifest/outbox 和历史回执；每个发布包的版本、dist-tag、SHA-1、SRI 及实际 tarball 字节必须与验证产物一致。任一包缺失、身份冲突或状态未知均终止，不会重试发布。核对成功才上传新的不可变恢复 intent，并在再次核对后追加成功 receipt；不会修改旧证据。后续 cutover 仅关闭相同 source run、outbox 与完整发布集合的旧状态，其他不确定发布仍阻塞。

此入口不发布新版本，也不更新 GitHub release/tag。若需要补齐原发布的 GitHub 元数据，在核对成功后再次手动运行同一工作流，选择 `recovery=true`、`reconciliation_only=false`，继续使用原 `source_run_id` 和 `verification_artifact_id`，保留 `authorize_retry=false`，其余参数留空。当所有原产物均已发布且匹配时，`recovery-publish` 跳过，`recovery-metadata` 补齐 tag/release；此路径不会补跑 `post-publish` smoke。后续新版本仍由正常 push 流程发布。

### 发布后的 npm 可见性等待

`npm publish` 成功返回后，npm 仍可能需要几分钟才能让 registry 查询到新版本。发布脚本使用独立的 `PUBLICATION_REGISTRY_CONFIRMATION_TIMEOUT_MS`（默认及工作流配置均为 `300000`，即每包 5 分钟）确认版本、dist-tag 和产物哈希；先立即查询，再以 1、2、4、8 秒递增等待，后续间隔最多 15 秒。查询耗时计入等待预算，每轮输出状态和已用时间。普通发布和恢复发布共用此机制。

`PUBLICATION_REGISTRY_PROPAGATION_WINDOW_MS` 仍仅用于重试授权前的缺失证据校验，与发布后确认窗口分开。确认期间只查询，不重复调用 `npm publish`；超时仍未确认时保留 ambiguous 回执，需按上面的只读核对流程处理。哈希、dist-tag 冲突或查询错误仍直接失败。
