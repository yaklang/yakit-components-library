---
"@yakit-libs/yakit-ui": minor
---

Add the Yakit Modal, covering Modal/01 and Modal/02 from the design system.

- The dialog layout supports small and medium spacing, an optional status banner, a footer slot, and controlled `open`.
- The alert layout supports info, success, warning, and error icons, a help action, and custom footers for business dialogs such as engine installation.
- Modal is a native dialog, consistent with the other Yakit components, and does not render Ant Design modal markup.
- Closed state always unmounts (`return null`). `destroyOnClose` / `destroyOnHidden` / Compat `forceRender` are accepted for API compatibility only; there is no keep-alive yet.
- Uncontrolled `onOk` closes immediately. For async submit, use controlled `open` + `confirmLoading` and close when the request finishes.
- `YakitModalCompat` maps legacy yakit aliases (`type`→variant, `large`→medium, default `keyboard={false}`, `hiddenHeader`, `onCloseX`, dual footer signatures).
