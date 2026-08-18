# Yesterday Icon / Figma Audit — Execution-Ready Report

## Metadata

- Profile: standard
- Final ambiguity: 0.18 / threshold 0.20
- Context: brownfield
- Context snapshot: `.omx/context/yesterday-icon-figma-audit-20260813T033158Z.md`
- Transcript: `.omx/interviews/yesterday-icon-figma-audit-20260813T040000Z.md`
- Figma file: `QWct5XE0Bg0bNDQ93eYgEw`
- Figma node: `37148:15299` (`Basic Icons`)

## Intent

Identify visual corruption or visual divergence in icons generated on 2026-08-12 before any repair is attempted.

## Scope

- Local SVGs under `packages/yakit-ui/src/icons/outline/` and `packages/yakit-ui/src/icons/solid/` whose files were generated/modified on 2026-08-12.
- Figma `Basic Icons` set, including Outline (24×24, 2px stroke) and Solid (20×20 filled).
- Report-only review; no source or design mutations.

## Non-goals / decisions

- Do not treat `FigmaIcon...` fallback names or Chinese names as visual corruption.
- Do not modify SVGs, generated indexes, Storybook, or Figma.
- Do not label the four solid `4936-*` files as mismatches until a complete Figma export inventory confirms their scope.

## Evidence summary

| Check | Result | Confidence |
|---|---:|---|
| Yesterday local SVGs | 361 outline + 275 solid = 636 | High |
| Empty SVGs | 0 | High |
| Full-canvas `#E7E7F5` background rects | 188 (75 outline + 113 solid) | High visual-anomaly candidate |
| Figma `Icon/LandPlot` (`46174:9893`) local export | Missing | High structural gap |
| Figma screenshot | Per-icon glyphs are shown without individual lavender backgrounds | High |

## Findings

### P1 — 188 likely visual mismatches

The following static predicate matches 188 files:

```sh
rg -l '<rect width="(20|24)" height="(20|24)" fill="#E7E7F5"' \
  packages/yakit-ui/src/icons/outline packages/yakit-ui/src/icons/solid
```

Breakdown: 75 outline and 113 solid. The matching rectangle covers the entire SVG viewport, so these icons will render with a solid lavender square behind the glyph. Figma’s `Basic Icons` screenshot shows the glyphs on the shared frame background, not per-icon full-canvas rectangles. Treat these as the first review queue.

### P1 — Missing local export

Figma metadata contains `Icon/LandPlot` (`46174:9893`, 24×24); no matching local SVG, import, or registry entry was found. This is a completeness difference, not evidence of a garbled glyph.

### P2 — Inventory uncertainty

Four local numeric solid exports (`4936-115787`, `4936-115788`, `4936-115789`, `4936-115790`) did not appear in the returned metadata slice. Their SVGs contain valid paths and are not classified as visual corruption. Reconcile only after obtaining a complete Figma node/export inventory.

## Acceptance criteria for a follow-up implementation

1. Every P1 background candidate is either confirmed against an individual Figma export or explicitly waived.
2. `LandPlot` is either exported and registered or documented as intentionally excluded.
3. No empty/malformed SVG remains.
4. A repeatable script reports the same counts without modifying source files.

## Validation commands

```sh
rg -l '<rect width="(20|24)" height="(20|24)" fill="#E7E7F5"' packages/yakit-ui/src/icons/outline packages/yakit-ui/src/icons/solid | wc -l
rg -l '<svg[^>]*>\s*</svg>' --pcre2 packages/yakit-ui/src/icons/outline packages/yakit-ui/src/icons/solid | wc -l
rg -n '46174|LandPlot' packages/yakit-ui/src/icons packages/yakit-ui/.storybook
```
