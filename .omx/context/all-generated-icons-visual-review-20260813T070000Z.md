# Context Snapshot: All Generated Icons Visual Review

- Task: 规划审查昨日生成的全部 icon 是否与 Figma 对应图标视觉一致。
- Repository: `packages/yakit-ui/src/icons/outline` (361 SVG) and `solid` (275 SVG), 636 total.
- Brownfield evidence: existing React exports map numeric Figma-derived SVG names to components; `Icon.stories.tsx` provides a gallery; prior audit found 188 full-canvas `#E7E7F5` candidates and a missing Figma `LandPlot` export.
- Figma authority: file `QWct5XE0Bg0bNDQ93eYgEw`, frame `37148:15299` (`Basic Icons`), Outline 24x24/2px stroke and Solid 20x20 filled.
- User decisions: Figma corresponding visual render is the sole correctness authority; review all 636 generated icons; produce per-icon evidence (Figma image, local image, pixel diff, reason) and an executable repair list; use identical rendering parameters and require exact pixel equality with zero tolerance; any pixel difference, Figma-missing local icon, or local-unmapped extra is a failure; automated mapping/render/diff/initial classification is authorized, while final repair method remains human-confirmed.
- Non-goals: do not modify Figma; do not auto-redraw or repair icons in this audit plan; do not classify naming/semantic issues alone as visual errors; exclude files outside the yesterday batch.
- Constraint: Figma asset download previously failed through `127.0.0.1:7890`; the plan must make baseline acquisition a hard prerequisite and preserve a blocked state rather than fabricate references.
- Prompt-safe summary status: not_needed.
