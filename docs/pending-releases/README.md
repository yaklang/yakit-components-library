# UI 待发布变更

此目录保存 `@yakit-libs/yakit-ui` 尚未发布的变更说明。图标包独立发布，不代表这些 UI 变更已经发布。带 Changeset frontmatter 的文件保留各自的升级级别，正文应描述当前最终行为；名称迁移表供使用方升级时参考。

## 当前发布范围

发布范围以 `scripts/release/release-deferral-policy.json` 为准。当前仓库策略指定图标包 `@yakit-libs/yakit-ui-icons` 的目标版本为 `0.3.3`，UI 保持 `0.2.3`。这表示仓库中的发布意图，不表示目标版本已经发布。

`.changeset/config.json` 的 `ignore` 包含 UI，避免直接变更或依赖变更触发 UI 版本升级。本目录中的待发布 Changeset 不在 `.changeset/` 中，不参与当前版本生成。

UI 继续构建和测试，其候选产物用于影响面检查；单独发布图标包时，兼容性验证使用策略记录的已发布 UI 包及其完整性信息。不能把当前 UI 候选包作为该已发布版本的替代品。

## 待发布内容

| 文档                                            | 内容                                                        | 已登记升级级别                         |
| ----------------------------------------------- | ----------------------------------------------------------- | -------------------------------------- |
| [React 19 / antd 6](./react19-antd6-deps.md)    | React 兼容性、依赖及相关类型修复                            | minor                                  |
| [独立图标包](./independent-icon-package.md)     | UI 通过公开图标包入口使用图标，保留兼容转发及开发、展示集成 | patch                                  |
| [Outline 描边规则](./uniform-icon-strokes.md)   | Outline 默认描边、其他分类原稿描边及 view-grid 图形更新     | minor                                  |
| [描边参数支持](./adjustable-outline-strokes.md) | 可调整图标的描边参数及固定填充边界                          | patch                                  |
| [英文名称迁移表](./english-icon-names.md)       | 公开导出改名，使用方需更新 import 和 JSX                    | 破坏性变更说明，发布前核对实际升级级别 |

下一次 UI 发布还应汇总所采用图标包版本中的新增图标、图形和主题颜色更新。组件私有 SVG 继续由 UI 自身维护。

## 发布前检查

开发者维护发布包、目标版本和待发布说明。运行 `pnpm release:deferral-check` 核对实际 Changesets 计划、包版本与忽略名单；UI 在计划中出现 `type: "none"` 表示不升级。Changeset 被版本流程消费后，检查仍要求包版本符合当前策略。

源码、锁文件、工具链和配置的指纹由发布验证自动计算；开发者不手动维护这些输入哈希。包范围或版本与策略不符、产物完整性不符时，发布检查会失败。

下一次 UI 发布将移除 npm 包内置的静态 Storybook 和 `yakit-ui-storybook` 命令。升级后可从对应 Release 下载离线 ZIP，解压并运行 `node serve.mjs --open`。已发布的 UI 0.2.3 仍可使用原命令。

准备 UI 发布时：

1. 审查本目录说明与当前实现，补齐累计变更和使用方升级要求。
2. 从 Changesets 的 `ignore` 中移除 UI，按新的发布意图移除或更新延期策略。
3. 将待发布 Changeset 恢复到 `.changeset/`，核对现有升级级别与实际破坏性变更是否匹配。
4. 核对 UI 使用的图标包版本，执行构建、打包和消费验证，再按 [发布流程](../releasing-yakit-ui.md) 发起 PR。

英文名称迁移表继续作为使用方升级参考保留，图标包 CHANGELOG 也链接该文档。
