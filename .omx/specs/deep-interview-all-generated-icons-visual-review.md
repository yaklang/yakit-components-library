# Execution Specification: Exact Visual Audit of All Generated Icons

## Metadata

- Profile: standard
- Context: brownfield
- Final ambiguity: 0.14 (threshold 0.20)
- Source snapshot: `.omx/context/all-generated-icons-visual-review-20260813T070000Z.md`

## Intent and outcome

Before further icon fixes, establish whether every icon generated yesterday is visually identical to its corresponding Figma icon. Produce reproducible evidence and a repair-ready failure list without changing product assets during the audit.

## In scope

- All 636 yesterday-batch SVGs: 361 outline and 275 solid.
- Figma `Basic Icons` frame `37148:15299` in file `QWct5XE0Bg0bNDQ93eYgEw`.
- One-to-one mapping, deterministic renders, exact pixel comparison, missing/extra detection, evidence packaging, and repair-list generation.

## Non-goals

- No Figma mutation.
- No automatic SVG redraw or source repair.
- Naming, semantic labels, and fallback names are not visual verdicts.
- No files outside the yesterday batch.

## Binding decision boundaries

- Figma's corresponding visual render is the sole oracle.
- Use one pinned renderer, viewport, dimensions, DPR, background, and export settings for both sides.
- Zero tolerance: any pixel mismatch is a failure and is sent to human review.
- Missing Figma, missing local, and unmapped local icons are failures.
- Automation may classify; humans choose the repair action.
- If the Figma baseline cannot be downloaded or mapped completely, stop with `blocked`, preserve the evidence, and do not infer correctness.

## Proposed audit stages

1. Acquire and freeze the complete Figma inventory and per-node exports; record file/frame IDs, node IDs, variant, dimensions, and SHA-256 hashes.
2. Build a mapping manifest covering all 636 local components, Figma nodes, and explicit missing/extra rows. Reject duplicate or ambiguous mappings before rendering.
3. Render both Figma exports and local Storybook/component renders with the same pinned browser, viewport, DPR, background, and dimensions. Store raw PNGs and metadata.
4. Compare PNG bytes/pixels exactly. Emit a diff mask and amplified diff image for every failure; calculate bounding boxes and a stable failure reason (`pixel-mismatch`, `missing-figma`, `missing-local`, `unmapped-local`, or `render-error`).
5. Generate a report with one row per icon and links to Figma render, local render, diff image, mapping metadata, hashes, and reason. Generate a repair manifest containing only failures, recommended investigation target, and human disposition fields.
6. Run human review on every failure, recording `confirmed`, `waived`, or `needs-baseline` plus the chosen repair action. This is a separate follow-up from the audit itself.

## Acceptance criteria

- Exactly 636 local icons are accounted for, plus explicit Figma-only/local-only mapping rows.
- No mapping ambiguity remains in the frozen manifest.
- Every mapped icon has both renders, identical render parameters, source hashes, and a pixel comparison result.
- Zero-tolerance comparisons are reproducible; any differing pixel is not silently waived.
- Every failure has a diff image, reason, and repair-list row.
- Baseline acquisition or renderer failure produces a terminal blocked report, never a guessed pass.
- Audit leaves source SVGs, indexes, Storybook, and Figma unchanged.

## Verification and artifacts

- `figma-inventory.json`: frozen Figma provenance and export hashes.
- `icon-visual-mapping.json`: all 636 local rows plus missing/extra rows.
- `renders/<icon>/figma.png`, `local.png`, `diff.png`, and `metadata.json`.
- `visual-audit-report.html` and machine-readable `visual-audit-report.json`.
- `icon-repair-manifest.json` with human disposition fields.
- A pinned audit command and a rerun log containing tool versions and environment parameters.

## Known blocker to resolve before execution

The previous Figma asset endpoint was unreachable through `http://127.0.0.1:7890`; complete baseline acquisition is a hard gate for this exact-visual audit.
