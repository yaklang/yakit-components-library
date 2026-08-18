# Test Specification: Exact Visual Audit

## Unit tests

- Inventory parser rejects duplicate node IDs, duplicate local paths, ambiguous names, and incomplete 636-row coverage.
- SVG canonical/hash manifest is stable across reruns.
- RGBA comparator passes identical pixels and fails one-pixel, dimension, alpha, and color mutations.
- Evidence writer emits the correct artifact contract for each failure reason; missing assets never require a fabricated diff.
- Human disposition cannot mutate `comparisonStatus` from `fail` to `pass`.

## Integration tests

- Complete Figma baseline creates `baseline-complete`; one failed export, proxy failure, incomplete traversal, or changed file metadata creates `blocked-terminal` and no render/diff stage runs.
- Four inventories reconcile to 636 local rows plus explicit Figma-only/local-only rows.
- Isolated capture uses 24×24 outline and 20×20 solid settings, fixed background/color, no Storybook decorators or padding.
- Coverage test asserts 596 runtime-export rows use `/icon/<iconId>` and 40 raw-SVG-only rows use `/svg/<iconId>`; all 636 rows receive a capture and verdict.
- Schema test asserts raw-SVG-only rows have `componentExport: null`, `captureSource: raw-svg`, and `mappingStatus: raw-svg-only`; runtime rows have a non-null export and `captureSource: component`.
- Two unchanged runs produce identical decoded RGBA, verdicts, manifest hashes, and evidence paths.

## Fixture cases

1. Identical Figma SVG/local SVG → pass.
2. One-pixel mutation → fail `pixel-mismatch` with diff and bounds.
3. Dimension mutation → fail `dimension-mismatch`.
4. Missing Figma export → fail `missing-figma` with unavailable-evidence reason.
5. Local-only row → fail `unmapped-local`.
6. Duplicate/ambiguous mapping → fail before rendering.
7. Browser/render exception → fail `render-error` with logs.
8. Figma metadata/hash changes between phases → fail `baseline-changed`.

## End-to-end gates

- `baseline-complete` is required before the 636-icon run.
- Every mapped row has frozen source hashes, identical render parameters, decoded dimensions, RGBA verdict, and evidence links.
- Every failed row appears in `icon-repair-manifest.json`; no failed row is silently dropped.
- Audit leaves SVGs, indexes, Storybook, and Figma unchanged.

## Runnable commands and assertions

- `pnpm --dir packages/yakit-ui audit:icons:baseline -- --output .omx/icon-audit/<run>/baseline.json` must either emit `baseline-complete` or a blocker with `noRenderPerformed: true`.
- `pnpm --dir packages/yakit-ui test:audit-icons` runs the fixture suite without network access.
- `pnpm --dir packages/yakit-ui audit:icons -- --run-dir .omx/icon-audit/<run>` executes mapping, qualification, render, compare, and report only after the baseline state gate.
- A second no-change run must produce identical canonical mapping, verdict, and decoded-RGBA hashes; only non-canonical run metadata may differ.
- Baseline mutation, renderer executable mutation, corrupt PNG, stale evidence, write-once collision, and source/worktree mutation each have a dedicated failing fixture.
- The known unreachable LandPlot export is a blocked-baseline fixture and must prove that zero render/diff files are created after the gate fails.

## Provider, server, and object-store fixtures

- Fixture provider reads only `scripts/fixtures/icon-audit/figma`; a missing page/export, pagination gap, or checksum mismatch emits `blocked-terminal`.
- CLI smoke test starts the dedicated harness, waits for `ICON_AUDIT_READY`, captures `/icon/<iconId>`, and verifies server shutdown on success and failure.
- Manual-map fixtures cover duplicate local paths, duplicate Figma IDs, ambiguous fallback identities, and a valid explicit row.
- Object-store tests cover atomic write, byte-equal deduplication, hash collision with different bytes, stale reference, and rerun manifests referencing the same object hashes under different run IDs.
- Bundle tests validate the manifest schema, required `<nodeId>.svg` layout, no unreferenced files, and SHA-256 integrity; provider contract tests validate cursor exhaustion and deterministic sorting.
- Bundle tests prove `complete` requires expected count, ordered traversal evidence, terminal cursor, and all hash-matching SVGs.
- Phase/finalization tests prove each phase manifest is immutable, final `run.json` references phase hashes, existing run IDs are rejected, and render references resolve only through explicit `.ref.json` files.
- State-machine tests enumerate every allowed edge and reject every unspecified edge; run-level blocked state proves no downstream pass verdict exists.

## Schema/transition assertions

- Reject missing `schemaVersion`, unknown reason/state enums, duplicate stable IDs, invalid state transitions, and report rows lacking immutable comparison references.
- Verify `comparisonStatus: fail` remains unchanged when a repair disposition is appended as `waived`.
- Verify artifact content hashes use canonical sorted-key JSON and exclude volatile timestamps.
- Verify every pixel mismatch has both PNGs and a diff; mapping/render failures use the alternate evidence contract and never fabricate a diff.

## Required artifacts

`figma-inventory.json`, `icon-visual-mapping.json`, `renders/<id>/{figma.svg,figma.png,local.png,diff.png,metadata.json}`, `visual-audit-report.json`, `visual-audit-report.html`, `icon-repair-manifest.json`, and a rerun log with lockfile/browser/OS/DPR/color-profile metadata.
