---
"@yakit-libs/yakit-ui-icons": patch
---

Add ArrowUpFromDotOutlined, ArrowsUpDownOutlined, ArrowsTransferUpOutlined and ArrowsTransferDownOutlined.

Use the Figma-bound theme color variables, with original color fallbacks, for the AI, plugin store, tool library, knowledge base, skill library and memory library menu icons. Their colors now follow the active theme without changing the artwork or dimensions.

Move public icon source, maintenance tools, dedicated tests and historical assets into the icon package. Keep its public exports, Oldicon deep paths, browser styles and SSR behavior, and build it independently of UI source.
