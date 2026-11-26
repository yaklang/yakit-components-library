# 独立发包影响面与切换前置校验

本文档定义 `@yakit-libs/yakit-ui` 与 `@yakit-libs/yakit-ui-icons` 独立发包时的 fail-closed 校验。校验只读取 Changesets，不会创建或改写 Changeset。

## 影响面校验

`scripts/release/release-impact.mjs` 比较 base/head 两侧真实打包内容的规范化快照。每个快照目录必须包含 `yakit-ui/` 与 `yakit-ui-icons/` 两个已解包 npm 包。比较范围覆盖运行时代码、类型、CSS、`package.json` exports、README 和其他发布文件。只有 publish plan 中声明的目标版本，以及该版本对应的 Changesets 生成 CHANGELOG 段落会被归一化；其他 package.json、CHANGELOG、运行时、类型或 CSS 变化仍属于语义变化。

正式 publish 模式下载 `changesets/action/select-mode` 生成的不可变 publish plan，并为两个包分别解析最近的 package release tag。这样在两包版本已解耦后，UI 与 icons 不会错误共享同一个比较基线。首个 icons 独立发布前的迁移 fallback 由 `release-impact-baselines.json` 同时固定预期版本、Git commit 和 source snapshot SHA-256。报告还记录真实 Node、pnpm、操作系统与 CPU 架构身份。

CI 使用以下命令创建隔离 worktree、构建并打包：

```sh
node scripts/release/release-impact.mjs \
  --publish-plan .release/publish-plan/publish-plan.json \
  --source-ref "$GITHUB_REF" \
  --head "$GITHUB_SHA" \
  --from-release-tags --build-isolated \
  --output .release/release-impact.json
```

面向 Changeset 尚未消费的开发分支，也可显式提供一个共同 base revision；此模式的 `declaredSet` 来自相对 base 新增或修改的 Changesets：

```sh
node scripts/release/release-impact.mjs \
  --base "$RELEASE_BASE_REVISION" \
  --head "$GITHUB_SHA" \
  --build-isolated \
  --output .release/release-impact.json
```

若 CI 已分别产出并解包 base/head 包，可显式传入目录：

```sh
node scripts/release/release-impact.mjs \
  --base "$RELEASE_BASE_REVISION" \
  --head "$GITHUB_SHA" \
  --base-snapshot-dir .release/impact/base \
  --head-snapshot-dir .release/impact/head \
  --output .release/release-impact.json
```

输出 `schemaId` 为 `yakit-ui-release-impact/v1`。正式 publish 模式的 `declaredSet` 来自 publish plan；开发分支模式来自相对 base 新增或修改的 Changesets。`observedSet`、`declaredSet`、`impactProbeSet` 与最终 pack 集合必须完全相等；少报、多报、缺少快照、无法解析 revision 都返回 `BLOCK`。历史未变化 Changeset 不参与开发分支的声明集合。

在 prepare manifest 前读取该 JSON，并调用：

```js
import { impactProbesForRelease } from './release-impact.mjs'

const impactProbeSet = impactProbesForRelease(impactOutput, packedReleaseSet)
```

然后将 `impactProbeSet` 传给 `createVerificationManifest`。每项包含 base/head、source、lock、toolchain、config 和 package snapshot 哈希，并固定为 `kind: "impact-probe"`、`nonPublishable: true`。probe 不含 tarball、filename 或 publish 字段；`impactProbesForRelease` 会再次验证 probe、observed、declared 与实际 pack 集合完全一致。任何 shadow/probe `.tgz` 都不得复制进 `.release/verified`，也不得进入发布或恢复矩阵。

## Release cutover 校验

`scripts/release/release-cutover-policy.json` 是版本化切换策略。每个 release ref 必须逐项列出，不允许通配符；每项固定 `migrated | frozen | retired`、cutover commit、审批人、审批时间，以及审计文件的 Git blob SHA 和内容 SHA-256。新增 prerelease ref 前必须先提交对应的精确策略项。

工作流先运行 `collect-release-cutover-evidence.mjs`。采集器分别完整分页读取 publish workflow runs、仓库级 `/actions/artifacts` 清单和全部 `main`/`pre/**` refs。runs 与 artifacts 必须校验 `total_count`、跨页唯一 ID，并完成两次稳定全量读取；refs 同样枚举两次，ref/head 集合必须完全一致。artifact 是否相关由其 run head 是否包含 reviewed cutover revision，或是否命中 legacy exact allowlist 决定，不按 artifact 创建时间丢弃旧证据。

每个相关 artifact 必须下载 archive，验证 GitHub digest，安全枚举内容并解析严格且无多余 JSON 的证据集合。verification artifact 复用正式 manifest/outbox 校验器，验证非空 releaseSet、release entries、tarball、size report 与 immutable outbox；intent/receipt 校验 artifact 名称、source/workflow run、attempt、phase、generation、lifecycle、consumer inbox 和状态转换；impact 校验 declared/observed/probe 集合完全一致。随机 JSON、空 v3 manifest、缺失或多余文档一律 `inconclusive`。verification evidence 还会查询 npm registry 的精确版本与 integrity。每个 run、artifact 和 ref 都必须得到 `closed-terminal`、`recoverable` 或 `inconclusive` 结论。

`scripts/release/release-cutover-preflight.mjs` 需要两个 JSON 输入：

- `RELEASE_CUTOVER_EVIDENCE`：schema v2 仓库级 inventory、分页完成标记和逐项 disposition。
- `RELEASE_PRODUCER_IDENTITY`：当前 producer 的 exact source ref/head SHA、workflow run、cutover revision ancestry、workflow blob/content hash 和 approval audit hash；legacy recovery 还必须包含 artifact、schema version 与 operation。

执行：

```sh
RELEASE_CUTOVER_EVIDENCE=.release/cutover-pages.json \
RELEASE_PRODUCER_IDENTITY=.release/producer.json \
node scripts/release/release-cutover-preflight.mjs
```

以下情况一律 `BLOCK`：分页不完整、archive/digest/registry 证据不完整、任何 `inconclusive`、孤儿或重复 artifact/run/ref、未逐项审批的 ref、producer head 与实时 ref head 不一致、head 不包含 cutover commit、审批审计 hash 不一致、未知 producer、legacy 身份非精确白名单或超过 EOL。时间戳不再充当 revision 证明。
