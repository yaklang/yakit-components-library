# Deferred Yakit UI icon changes

The icon changes prepared after `@yakit-libs/yakit-ui-icons@0.2.4` are released
independently in icons versions `0.2.5`, `0.2.6`, `0.2.7` `0.2.8` and `0.2.9`.
Version `0.2.6` updates Sparkles and LightBulb and adds six Figma Outline icons.
Version `0.2.7` adds Intention, GanttChart and SquareGanttChart, and migrates
32 Outline/Solid exports to English names; see [the breaking name migration](./english-icon-names.md).
Version `0.2.8` corrects Floating and the three existing Park icons and adds ParkAbove.
Version `0.2.9` unifies icon strokes to 1.5 and corrects legacy Outline/view-grid.
`@yakit-libs/yakit-ui` stays at `0.2.3` on npm. Its current source contains the
same icon improvements, but its rebuilt output is an impact probe and is not
a release artifact.

The deferred Changeset documents in this directory preserve the original UI Changeset bump
levels and descriptions. They remain outside `.changeset`, and UI is temporarily
listed in `.changeset/config.json` `ignore` to also prevent dependency-driven UI
version bumps. Before the next UI release, remove UI from `ignore`, retire or
replace the deferral policy, move the deferred Changeset documents back to
`.changeset`, and review the resulting version and package changes. Do not discard
them or treat the UI changes as already published.

The checked-in `scripts/release/release-deferral-policy.json` declares the selected
icons release and the UI version that remains deferred. Its v2 schema does not
freeze current source, lockfile, toolchain or configuration hashes. Developers
maintain release intent and pending Changesets; impact verification computes
input fingerprints automatically. Consumer verification still uses the recorded
published UI counterpart, and verifies its package bytes.

## 历史计划：icons 0.3.1 发布

以下为先前的发布计划。当前版本以文末的新计划和延期策略为准。

Only `@yakit-libs/yakit-ui-icons` is scheduled for version `0.3.1`: React 19
compatibility, four new Outline arrow icons, and Figma-bound theme colors for
six menu icons. This also includes independent ownership of the public icon source,
maintenance tools, tests and historical assets. `@yakit-libs/yakit-ui` remains at
its published version `0.2.3`.

版本目标已确认（2026-11-05）：npm 已存在 icons `0.3.0`，虽然 `latest`
仍指向 `0.2.9`。本次选择未占用的 `0.3.1`，将 icons `package.json` 的版本基准
对齐到已发布的 `0.3.0`，两条 icons Changeset 按 `patch` 生成 `0.3.1`，保留
完整功能说明。基准调整不代表本分支的新功能已经发布；UI 的延期 Changeset
仍保留原升级级别。

正式发布成功后，对应 Git tag 为 `@yakit-libs/yakit-ui-icons@0.3.1`，npm 发布标签
仍为 `latest`。准备分支不创建或移动远端 tag，也不修改 npm 的现有标签。

The UI portion of the React 19 / antd 6 Changeset is preserved in
[react19-antd6-deps.md](./react19-antd6-deps.md), with its original minor bump
and description. Restore it alongside the other deferred Changesets before
the next UI release. The shared-source icon additions and menu theme changes
also need to be included in that future UI release's notes.

## 公共图标源码迁移后的发布边界

本次已确认将公共图标独立迁移带来的 UI 改动一起延期，npm UI 保持 `0.2.3`。
审查范围包括：新增 icons 的 `workspace:^` 运行时依赖、Button 等组件改用包入口、
旧图标入口及类型和 CSS 的兼容转发、构建时将 icons 外置，以及对应的 Storybook、
测试和开发命令调整。InputNumber、SearchInput 等组件的私有 SVG 不在替换范围内。
这些内容保存在 [independent-icon-package.md](./independent-icon-package.md)，
与已有的 React 19 / antd 6、图标名称和描边改动一起等待 UI 发版。

`.changeset/config.json` 的 `ignore` 控制版本生成；
`scripts/release/release-deferral-policy.json` 约束本次只发布 icons `0.3.1`，
并绑定审查过的 UI 源码、锁文件、工具链和配置哈希。两者需要同时维护。
UI 继续构建和测试，其本地产物仅用于检查；发布兼容性验证使用冻结的 npm UI
`0.2.3` 与本次 icons 候选包，不能用仓库里的新 UI 代替旧版基线。

运行 `pnpm release:deferral-check` 可检查实际 Changesets 版本计划。
UI 在 JSON 中可能以 `type: "none"` 出现，这表示不升级版本。
Version Packages 消耗 Changeset 后，检查仍要求 icons 为 `0.3.1`、UI 为 `0.2.3`。
PR CI 和发布模式选择都会运行此检查；打包前还会核对 Changesets 的实际发布计划。
即使实际改动和发布名单都包含 UI，发布影响检查也不能跳过有效的延期策略。

后续 UI 源码、测试或工具配置变化无需更新源码哈希；如果改变发布包名单或目标版本，需要明确更新发布意图。
恢复 UI 发布时，移除 `ignore` 中的 UI 和本次延期策略，恢复这里的 UI Changeset，
再检查实际升级级别、icons 的安装版本及所有累计更新说明。

## 历史记录：2026-11-09 UI 延期源码哈希复核

以下描述旧版 v1 的处理过程。当前 v2 已取消这些手动源码哈希绑定，不再按下述方式维护。

发布工作流 `42591951442` 在影响面校验阶段被阻断：策略仍绑定 `1358235`
时的 UI 源码，而后续 Storybook 和测试改动没有纳入该绑定。此次以
`20eec08d2a1f9d7d172ee7381e57b6a3cf725f17`（Version Packages 合并提交）复核，
相对 `1358235` 的 UI 目录变化仅涉及以下六个文件：

- `.storybook/brand-themes.ts`：配置 Yakit、irify、memfit 品牌主色。
- `.storybook/preview.tsx`：加入品牌切换、浅深主题派生和主题色注入。
- `.storybook/stories/Icon.stories.tsx`：使用生成的分组和顺序，加入 Colorful 图标分组。
- `.storybook/stories/icon-colorful.generated.ts`：保存来自图标来源清单的分组及节点顺序。
- `test/icons/icon-storybook-contract.test.ts`：按来源清单检查完整分组覆盖。
- `test/icons/icon-stroke-width-dist.test.ts`：非 Outline 图标按各自原始 SVG 检查描边。

这些改动继续随 UI 延期；没有新增 UI 运行时代码、依赖或公开 API 变化。
将 `headSourceHash` 从
`e83d3e7b5a7f7497a9035a7a71f44cb8086914d4c112da13291e33a4458ddeb9`
更新为
`3c7c9dd738fa75e90a06c9f692f11a1f309c510c51cb7687940f860744d9f630`。
锁文件、工具链、配置及 npm UI 0.2.3 基线绑定保持不变。

`pnpm release:deferral-check` 现在同时校验发布范围和四项输入哈希。
它读取当前工作区的策略、版本计划，并对 Git `HEAD` 的已提交文件计算哈希；
PR CI 中对应 GitHub 检出的合并提交。它与发布影响检查共享哈希算法和路径集合，
UI 的 Storybook、测试也在源码绑定范围内。未跟踪的构建输出不参与校验；
本地尚未提交的源码改动需在提交后再次检查。哈希失配时应先复核差异，再更新策略。

本次修复不添加 Changeset、不再次升级版本。icons 已由 #48 升至 0.3.1，
修复 PR 合入 main 后由 push 自动重新进入发布流程；完整发布校验通过后才发布。

## 2026-11-13 发布范围检查简化

开发者只维护这次发布哪个包、哪个版本，以及延期包的变更说明。
`pnpm release:deferral-check` 核对 Changeset 版本计划、包版本和忽略名单；
UI 继续开发、测试或展示页面调整，不要求手动刷新哈希。
发布阶段自动计算本次输入和产物的哈希，保证验证结果对应本次提交，上传的包对应已验证产物。
实际发布名单意外包含 UI、版本不一致、产物被替换等情况仍会失败。

当前已有 icons patch Changeset，目标版本为 `0.3.2`；延期策略已同步为只发布 icons `0.3.2`，UI 保持 `0.2.3`。包版本仍交由 Changesets 的版本流程更新。
