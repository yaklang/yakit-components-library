---
"@yakit-libs/yakit-ui": minor
---

Add React 19 support and antd 6 as a runtime dependency.

- Peer ranges for `react` / `react-dom` now accept `^18.2.0 || ^19.0.0` (yakit-ui and yakit-ui-icons), so consumers may stay on React 18 or upgrade to React 19.
- yakit-ui now depends on `antd ^6.6.7`. The release gate no longer rejects antd; the zero-token scan keeps rejecting the legacy `@ant-design/cssinjs` pipeline that antd 6 replaced.
- React 19 type compatibility fixes in `Wave` (cloneElement/ref handling) and `InputNumber` (timer refs).