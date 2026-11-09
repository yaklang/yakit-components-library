---
name: commit-msg
description: 为 yakit-components-library 生成中文提交信息或完成用户要求的本地 Git 提交。检查实际 diff、明确范围、预览信息并核验提交；只要 message 时不改仓库。
---

# 项目提交

1. 读取 `git status --short`、`git rev-parse HEAD` 和完整 `git diff --cached`。暂存区非空时只提交暂存内容。暂存区为空时读取工作区 diff 和未跟踪文件；按用户已明确授权的范围暂存具体路径，范围不明确时先展示清单并询问，不能默认 `git add -A`。
2. 读取 `git log -10 --format='%h%n%B'`，结合全部选定改动归纳提交意图。本项目采用中文 `<type>(<scope>): <subject>`，没有清晰 scope 时省略。常用 scope 为 icons、release、agents。同一事项的改动合并描述，不同事项分别一行；同一种 type 可以出现多次，不因类型相同而合并独立事项，仍为一个 commit。不要逐文件罗列，不写 WIP、misc、修改、调整或手写 PR 编号。
3. 用户仅要求 message 时，到这里仅返回文本，不暂存、不提交。没有改动则如实说明。
4. 提交前展示完整 message 和文件清单，取得覆盖当前范围与 message 的明确确认。使用环境允许的交互工具；若当前会话已确认同一范围与 message，不重复询问。用户取消则停止，保留已授权的暂存结果。
5. 再读 HEAD、暂存区文件清单和完整 diff；如果内容发生变化，重新预览确认。将 message 按真实换行写入临时文件，通过 `git commit -F <临时文件>` 提交，使用 finally/trap 清理临时文件。不要使用 `git commit -m`，避免命令替换破坏正文。
6. 核验 HEAD 已前移、暂存区为空，读取 `git show --format= --name-only HEAD` 和 `git status --short`。成功返回 `COMMITTED`、SHA、实际范围及剩余改动；取消返回 `CANCELLED`；命令或核验失败返回 `FAILED` 和实际状态。hook 失败可能已经留下改动，不假称恢复，不自动重试。

默认仅本地提交。用户明确要求推送时才推送到已核实的远端和分支。提交图标不等于发布包，不自动修改版本、changeset、延期发布哈希或合并 PR。

示例（同一个 commit）：

```text
feat(icons): 支持 Figma 来源导入
feat(icons): 支持图标一键更新
fix(icons): 修复菜单图标的主题颜色适配
```
