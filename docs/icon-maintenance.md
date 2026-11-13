# 图标怎么添加和更新

公共图标由 `packages/yakit-ui-icons` 维护。UI 通过图标包的公开入口使用，组件内部的私有 SVG 仍归 UI。

## 日常流程

1. 设计师修改 Figma，或业务反馈图标有问题。
2. 把需要更新的 Figma 节点链接或 nodeId 发给 Agent，说明要更新来源还是同步到图标库。
3. Agent 获取指定节点的信息与 SVG，把原稿保存到 `config/icon-sources/`。
4. 运行 `pnpm icons:update`，生成本地 SVG、组件导出、名称目录和 Storybook 展示数据。
5. 运行 `pnpm icons:check`，验证当前来源、生成结果、规则、功能和类型。
6. 需要检查发布产物时单独构建，再提交 PR。

Figma 后续又有变化，需要通过下一次更新 PR 进入仓库。检查不访问远端，也不声称已经与此刻的远端一致。

## 命令有什么区别

| 命令                                                 | 做什么                                       | 是否写来源或生成文件 |
| ---------------------------------------------------- | -------------------------------------------- | -------------------- |
| `pnpm icons:import --input <文件绝对路径>`           | 导入 Agent 获取的原稿和节点信息              | 是                   |
| `pnpm icons:update`                                  | 生成 SVG、导出和相关配置                     | 是                   |
| `pnpm icons:update --family outline`                 | 更新指定分类                                 | 是                   |
| `pnpm icons:update --check`                          | 检查是否漏生成、生成结果是否过期             | 否                   |
| `pnpm icons:check`                                   | 生成检查、来源与规则审计、功能测试、类型检查 | 否                   |
| `pnpm --filter @yakit-libs/yakit-ui-icons run build` | 生成可以发布的组件代码和类型                 | 只写构建产物         |

`icons:check` 已包含生成检查，不需要再单独运行 `icons:update --check`。测试会生成临时文件和测试结果，但不会重写原稿或生产 SVG。图标包内也有独立的 `icons:check`，不依赖 UI 源码；根目录入口额外检查私有资源登记和展示集成。

生成前先验证完整结果，失败不写入；写入中失败会撤回本次写入。重复执行应没有差异。删来源记录不会自动删公开导出，改名、删除要作为明确的兼容性变更处理。

## 哪些文件需要维护

- `packages/yakit-ui-icons/config/icon-sources/` 是公共来源入口，保存当前原稿、节点身份和生成规则。
- `src/` 中的 SVG 是实际使用的素材；通过导入登记生成策略的素材由脚本生成。
- 分类入口、名称目录、描边能力表和 Storybook 分组由脚本生成，不手填数量或哈希。
- `test/fixtures/icons/` 只保存转换、颜色、引用和渲染功能样本，不保存业务图标的历史外观标准。
- 旧截图、旧版 SVG 对照和审核资料通过 Git 历史查阅，不再限制当前图标变化。

本次 Figma 原稿不是历史基线。它用于确认本次转换没有丢失图形；主题颜色、Outline 线宽和内部 ID 等约定转换可以不同。

## 获取、命名和分类

Agent 使用 `.agents/skills/sync-icon-sources/SKILL.md`。先通过 fileKey + nodeId 查所有分类及 UI 私有来源，已有图标保留公开名称、分类和兼容路径。只给 nodeId 且无法确认文件时才补充询问；已经明确要求同步时不重复确认。

新增 Figma SVG 用 nodeId 文件名，例如 `47351-7055.svg`。英文组件名使用 PascalCase，并加 `Outlined`、`Solid` 或 `Colorful`。名称含义不清楚、分类不明确或重名时再询问。

- Outline 的真实描边统一为 1.5。纯填充原稿允许保留，标记为固定填充，不猜测中心线，也不承诺能通过 `strokeWidth` 改粗细。
- Solid 保留原稿描边，Colorful 保留多色。只有明确的变量绑定或指定映射才转换主题颜色。
- 蒙版、渐变和内部引用要完整；无法可靠转换时报告具体节点，不通过修改测试答案掩盖问题。
- Oldicon 保留内容哈希命名和深层路径。Loading 的动画及参数逻辑继续手写。

## CI 和平台

PR 按改动模块检查；图标模块检查当前全量图标。合并到 main 不再启动普通质量 CI，发布工作流仍独立判断版本准备和发布。pre/\*\* 推送保留现有触发。

脚本、依赖或构建配置变化时，验证 Windows、Linux、macOS；普通 SVG 更新不重复跑三个平台。脚本通过 Node.js 处理文件和启动工具，不依赖 macOS 路径或 Unix shell。浏览器使用当前可用的 Playwright 环境，不比较历史系统或浏览器哈希。

本次整理不改公开组件 API。维护和校验不会自动提交、推送或发布。
