---
'@yakit-libs/yakit-ui': patch
---

Use `@yakit-libs/yakit-ui-icons` as a runtime dependency for public icons. Preserve
the existing UI icon exports, types, CSS entry and Oldicon deep paths through
forwarding entries, and keep public icons external to the UI JavaScript bundle.

Move public icon source, maintenance tools, dedicated tests and public SVG assets
to the icon package. Build icons before UI development and Storybook, and watch
icon output during development. Component-private SVG implementations remain in UI.
