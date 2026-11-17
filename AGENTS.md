# 项目 Agent 工作说明

项目 Skill 统一放在 `.agents/skills/`，请在适用时先读取对应 SKILL.md：

- 用户要求生成提交信息或提交代码：`.agents/skills/commit-msg/SKILL.md`。
- 用户给出 Figma 图标节点链接，要求更新图标来源或同步到图标库：`.agents/skills/sync-icon-sources/SKILL.md`。

图标维护入口及数据约定见 `docs/icon-maintenance.md`。来源记录位于
`packages/yakit-ui-icons/config/icon-sources/`。原稿独立存于其 `svg/`，项目规则位于 `config/icon-project/`，展示配置位于 `config/icon-display.json`。三个 Figma 分类全量从原稿生成；Oldicon 以 assets 为准，组件和入口手工维护，不登记来源或生成。生成文件用 `pnpm icons:update` 更新，
`pnpm icons:check` 统一离线检查；`pnpm icons:update --check` 仅检查生成结果。UI 私有来源仍在 `packages/yakit-ui/config/icon-sources/private.json`。保留既有公开导出和 Oldicon 深层路径。检查当前来源和规则，不使用历史外观基线。
图标包及根目录图标入口脚本兼容 Windows、Linux、macOS；不绑定历史系统或浏览器版本。
