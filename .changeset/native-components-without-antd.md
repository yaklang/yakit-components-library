---
"@yakit-libs/yakit-ui": major
---

Replace the existing component implementations and styling runtime with Yakit-owned React context, native DOM controls, static CSS, and CSS custom properties. Consumers no longer need `antd` or `@ant-design/cssinjs`.

This release intentionally narrows public types that previously inherited the full Ant Design API:

- `Input`, `Input.TextArea`, `Input.Password`, `Input.OTP`, `Input.Search`, and `InputNumber` now expose only the documented Yakit behavior and native attributes represented by their owned types. Remove unsupported Ant Design-only passthrough props.
- `Input.OTP` keeps boolean password masking; Ant Design's custom string-mask extension is not part of the owned native contract.
- `Input.Search.enterButton` accepts text, `true`, or one actionable React element. Arrays, fragments, and non-action content are unsupported and fall back to the default search action.
- Replace `ConfigProvider`'s Ant Design `theme.algorithm` with `theme.mode: 'light' | 'dark'`. Ant Design `prefixCls` and other unowned provider props are removed; Yakit's `yakit-*` class names remain fixed.
- Use the exported Yakit-owned `InputRef`, `TextAreaRef`, `OTPRef`, and `InputNumberRef` contracts instead of Ant Design ref types.
- Keep `Input`'s existing six compound members: `TextArea`, `Search`, `Password`, `OTP`, `SearchTrigger`, and `Select`.

Install with `@yakit-libs/yakit-ui`, `react`, and `react-dom`; remove direct consumer dependencies that existed only to satisfy this package's former Ant Design peer contract.
