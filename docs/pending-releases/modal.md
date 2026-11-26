---
'@yakit-libs/yakit-ui': minor
---

Add the Yakit Modal, covering Modal/01 and Modal/02 from the design system.

- The dialog layout supports small and medium spacing, an optional status banner, a footer slot, and controlled `open`.
- The alert layout supports info, success, warning, and error icons, a help action, and custom footers for business dialogs such as engine installation.
- Modal is a native dialog, consistent with the other Yakit components, and does not render Ant Design modal markup.
- Closed state always unmounts (`return null`). `destroyOnClose` / `destroyOnHidden` / Compat `forceRender` are accepted for API compatibility only; there is no keep-alive yet.
- Uncontrolled `onOk` closes immediately. For async submit, use controlled `open` + `confirmLoading` and close when the request finishes.
- `YakitModalCompat` maps legacy yakit aliases (`type`→variant, `large`→medium, default `keyboard={false}`, `hiddenHeader`, `onCloseX`). Legacy footer render functions receive the default footer nodes as the first argument and `{ OkBtn, CancelBtn }` as the second; single-argument new-style footers still work because the first argument also carries the button context.
- Escape is handled at the document level and only the topmost dialog reacts, so dismissal keeps working when focus falls back to `<body>` (for example after the Ok button turns into `confirmLoading`); focus is then returned to the dialog.
- Known compat gaps before aliasing `YakitModal`: `headerStyle` / `footerStyle` / `closeIcon` / `okType` / `styles` / `forceRender` / `centered` are accepted but not rendered, and `onCancel` / `onOk` / `onCloseX` are invoked without a mouse event. Check each call site when migrating.
