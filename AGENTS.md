# 项目 Agent 工作说明

项目 Skill 统一放在 `.agents/skills/`，请在适用时先读取对应 SKILL.md：

- 用户要求生成提交信息或提交代码：`.agents/skills/commit-msg/SKILL.md`。
- 用户给出 Figma 图标节点链接，要求更新图标来源或同步到图标库：`.agents/skills/sync-icon-sources/SKILL.md`。

图标维护入口及数据约定见 `docs/icon-maintenance.md`。来源记录位于
`packages/yakit-ui-icons/config/icon-sources/`。生成文件用 `pnpm icons:update` 更新，
`pnpm icons:update --check` 离线检查。UI 私有来源仍在 `packages/yakit-ui/config/icon-sources/private.json`。保留既有公开导出、Oldicon 深层路径和历史视觉基线。
