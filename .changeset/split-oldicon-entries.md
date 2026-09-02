---
"@yakit-libs/yakit-ui-icons": patch
---

将 oldicon 兼容入口拆分为可摇树的独立图标 ESM，并公开带类型与浏览器样式条件的 `oldicon/<IconName>` named-export 子路径；保留原有 `oldicon` 聚合入口。
