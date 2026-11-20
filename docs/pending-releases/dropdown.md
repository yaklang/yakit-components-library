---
'@yakit-libs/yakit-ui': minor
---

Add the Yakit Dropdown, covering List/Menu Item layouts from the design system.

- Native dropdown with portal positioning (hover / click / contextMenu), controlled `open`, and arrow placements aligned with antd.
- Menu supports selectable items, success/info/text/danger/error item types, dividers, groups, one-level submenu with edge flip, and `popupRender` / legacy `dropdownRender`.
- `YakitDropdownMenu` maps the main-app dropdown + menu split; `Dropdown.Button` provides a split trigger button.
- Dual class prefixes (`yakit-dropdown` / `ant-dropdown`) keep host theme selectors working.
- Accessible menu-button semantics and keyboard navigation: roving tabindex, Arrow/Home/End keys, keyboard submenu expansion, and focus restoration on Escape.
