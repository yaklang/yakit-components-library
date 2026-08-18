# Test Spec: Yesterday Icon / Figma Fixes

## Static SVG Audit

- Require `scripts/figma-basic-icons-inventory.json` with `schemaVersion`, file/frame provenance, `complete:true`, all exportable nodes, instances, LandPlot, four uncertain IDs, and `landPlotArtifact` metadata/hash; reject missing/false completeness or artifact hash mismatch.
- Require `scripts/icon-inventory.json` with exactly 188 cleanup rows and schema `{schemaVersion,canonicalizationVersion,path,variant,figmaNodeId,figmaName,width,height,removalNodes:[{originalSiblingPath,normalizedHash,sha256}],retainedSubtreePaths:[{originalPath,role}],retainedSubtreeSha256,status}`; reject duplicate/missing paths, unexpected rows, missing boundaries, or hash drift.
- Canonicalization v1 is deterministic: parse XML; omit declaration/comments; sort attributes lexicographically; preserve element order; collapse text whitespace to one ASCII space; encode UTF-8; hash only recorded retained glyph/`defs` subtree boundaries. Resolve and verify all removal handles/signatures before deleting any node.
- `apply-icon-cleanup.mjs` is the sole 188-asset mutation entry point with `--assets-root` and dry-run default; it checks `xmllint`, both manifests, LandPlot artifact SHA-256, all signatures, and all retained hashes before the first write, stages under `.icon-cleanup-staging/<run-id>/`, audits the staged tree, then swaps directory with backup/rollback semantics.
- Require a complete Figma inventory snapshot and canonical `46174:9893` SVG before mutation; otherwise exit non-zero without writing assets.
- Enumerate `src/icons/outline/*.svg` and `src/icons/solid/*.svg`.
- Run `xmllint --noout` on every SVG and fail if unavailable or malformed.
- Assert no empty SVG documents.
- Assert Outline roots are 24×24 and Solid roots are 20×20, including `viewBox`.
- Assert no manifest-listed leaked backdrop subtree remains: full-viewport `#E7E7F5` rectangle plus oversized `#F8F9FA` parent-frame path.
- Assert each SVG contains at least one drawable path/shape after cleanup.
- For each mutated SVG, normalize XML and assert the retained glyph/definitions subtree hash matches the pre-cleanup snapshot; only the explicit backdrop allowlist may differ.

## Registry Tests

- Assert `LandPlotOutlined` is exported from `src/icons/outline/index.tsx` and included in the outline registry.
- Assert `46174-9893.svg` exists with a 24×24 root and is transitively exported from `src/icons/index.tsx` and package `src/index.ts`.
- Assert no registry import points to a missing SVG.
- Assert the existing Solid/Outline registries remain non-empty and sorted.

## Build/Smoke

- `pnpm --filter yakit-ui lint`
- `pnpm --filter yakit-ui build:lib`
- `pnpm --filter yakit-ui build-storybook`
- `pnpm --filter yakit-ui test:audit-icons`
- Add dedicated `IconAudit.stories.tsx` and `scripts/icon-visual.test.mjs`; serve story ID `icon-audit--default`, locate each selector bounding box, use viewport 160×96/deviceScaleFactor 1, 32×32 boxes on 8px `#ffffff/#eeeeee` checkerboard, corner RGBA tolerance 2, ≥12 non-checkerboard glyph pixels, and natural 24/20 dimensions without size override.

## Audit Command

- Add `audit:icons` to `packages/yakit-ui/package.json`, implemented by `scripts/audit-icons.mjs`.
- Add `apply:icon-cleanup` to `packages/yakit-ui/package.json`, invoking `scripts/apply-icon-cleanup.mjs`; dry-run is the default and `--write` is required for mutation.
- Add exact `test:audit-icons = vitest run scripts/audit-icons.test.mjs`; fixtures live under `scripts/fixtures/audit-icons/{valid,malformed,unexpected-backdrop,hash-drift,manifest-drift,missing-import,missing-landplot,wrong-viewport}/{icons,src}`. Every test passes `--assets-root` and `--source-root` within the fixture, uses test-only `--expected-counts 1:1`, asserts codes/tokens `0 AUDIT_OK`, `2 XML_INVALID`, `2 BACKDROP_UNEXPECTED`, `2 HASH_MISMATCH`, `2 MANIFEST_DRIFT`, `2 IMPORT_MISSING`, `2 LANDPLOT_MISSING`, `2 VIEWPORT_INVALID`, and verifies all fixture bytes unchanged.
- Check mode is read-only and exits non-zero for unexpected manifest drift, malformed SVGs, leaked backdrop nodes, missing imports, invalid dimensions, missing LandPlot exposure, or unavailable `xmllint`.
- The four `4936-*` files are reported with explicit inventory status and never deleted by the audit.

## Required negative cases

- malformed SVG → non-zero exit;
- unexpected full-viewport rect/path outside the manifest allowlist → non-zero exit;
- changed retained-subtree hash → non-zero exit;
- duplicate/missing manifest row or wrong 75/113 variant totals → non-zero exit;
- missing SVG import target or missing package-root `LandPlotOutlined` export → non-zero exit;
- wrong width/viewBox → non-zero exit;
- unresolved four-file status matching baseline → report only, zero exit.

The `xmllint` availability check runs before any asset mutation and is a hard precondition.

## Evidence Output

The audit command must print candidate counts, unresolved inventory IDs, and exit non-zero on a regression. It must not modify source files in check mode.
