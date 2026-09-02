---
"@yakit-libs/yakit-ui": patch
---

从 `yakit-ui` 的声明产物中移除仅供迁移审查使用的 oldicon 源文件，避免兼容图标声明重复进入主 UI 包；旧图标继续由 `@yakit-libs/yakit-ui-icons/oldicon` 提供。
