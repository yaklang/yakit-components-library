---
'@yakit-libs/yakit-ui': minor
---

Remove icon components, types and registries from the UI root and remove the UI
icon subpaths. Add `@yakit-libs/yakit-ui-icons` as a direct dependency when importing
icons. Replace `@yakit-libs/yakit-ui/icons` with the icon package name, keeping
family, registry and CSS suffixes. UI components still use icons internally.

Move public icon source, maintenance tools, dedicated tests and public SVG assets
to the icon package. Build icons before UI development and Storybook, and watch
icon output during development. Component-private SVG implementations remain in UI.
