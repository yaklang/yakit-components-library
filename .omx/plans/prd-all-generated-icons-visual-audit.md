# PRD: Exact Visual Audit and Repair Planning for 636 Generated Icons

## Outcome

Freeze a complete Figma baseline, compare every yesterday-batch icon against its corresponding Figma SVG through one pinned rasterizer, and produce immutable verdicts plus evidence-backed repair work. No source or Figma mutation occurs during the audit.

## Principles and decision drivers

1. Figma correspondence is the sole visual oracle; names and semantics are not verdicts.
2. Baseline completeness is a hard gate; never infer a pass from a partial export.
3. Exact decoded RGBA equality is the verdict; PNG metadata and compression are not compared.
4. Evidence and verdict are immutable; human disposition is separate and cannot turn fail into pass.
5. The capture surface must be isolated from Storybook theme, padding, scaling, and animation.

Drivers: reproducibility, exhaustive coverage, conservative failure handling.

## Oracle contract

Use frozen Figma SVG exports as the Figma representation, hash them, then rasterize both frozen Figma SVGs and local icon renders through the same pinned Chromium/Skia environment. Literal Figma PNG comparison is rejected because it uses a different rasterizer and makes zero-tolerance results uninterpretable.

## Scope and inventory

- 361 outline + 275 solid yesterday-batch SVGs (636 total).
- Reconcile four inventories: batch file manifest, SVG files, index imports/exports, and runtime registries. The 40 SVGs without runtime exports (20 per variant) remain in scope and use the raw-SVG capture path.
- Each row records path, variant, component export, local SHA-256, Figma node ID, Figma SVG SHA-256, and mapping status.
- Missing Figma, missing local, duplicate, ambiguous, or unmapped rows fail the audit.

## Phases

0. **Baseline state gate**: `preflight → baseline-complete | blocked-terminal`. Verify proxy, complete frame traversal, every node export, Figma file/version metadata, and stable hashes. Any failure writes a blocker package and stops.
1. **Freeze manifests**: capture worktree/lockfile/browser metadata and the four reconciled inventories without editing source.
2. **Qualify determinism**: render the same fixture twice and require identical decoded RGBA; run identical, one-pixel, dimension, alpha, and color mutation fixtures.
3. **Isolated capture**: render one SVG/component per page with variant-native dimensions (outline 24×24, solid 20×20), fixed background/color, no padding, theme, locale, animation, or transitions.
4. **Compare**: decode RGBA, require equal dimensions and byte-for-byte RGBA equality; preserve PNG hashes separately. Generate amplified diff and bounds only for pixel mismatches.
5. **Report**: generate one row per local icon plus Figma-only/local-only rows. Reasons include `pixel-mismatch`, `dimension-mismatch`, `missing-figma`, `missing-local`, `unmapped-local`, `duplicate-local`, `duplicate-figma`, `ambiguous-mapping`, `render-error`, and `baseline-changed`.
6. **Repair handoff**: emit failures-only repair manifest with evidence links, likely investigation target, and human fields (`disposition`, `owner`, `action`, `justification`, timestamp). Repair is a separate approved workflow.

## Evidence rules

- Pixel mismatch: Figma SVG/PNG, local PNG, diff PNG, bounds, decoded dimensions, hashes, parameters.
- Missing/mapping failure: available source/export evidence, manifest row, and explicit unavailable-artifact reason; no fabricated diff.
- Render failure: logs, tool/browser metadata, source hashes, and failure reason.
- `comparisonStatus` remains `fail` forever for any mismatch; `waived` only changes repair queue disposition.

## Non-goals and stop conditions

No Figma edits, no automatic redraw, no naming-only failures, no files outside yesterday's batch. Stop terminally on incomplete baseline, moving Figma source, renderer drift, or non-reproducible fixture output.

## Options considered

- Figma SVG + shared pinned rasterizer: selected; makes zero-pixel equality reproducible.
- Figma PNG + local Chromium PNG: rejected; different rasterizers create uninterpretable failures.
- Structural/perceptual tolerance: rejected as a verdict; may be used only to categorize failures for human review.

## Concrete implementation surface

- Replace the heuristic-only `packages/yakit-ui/scripts/audit-icons.mjs` with a staged CLI:
  `icon-audit.mjs baseline`, `mapping`, `qualify`, `render`, `compare`, `report`.
- Add `packages/yakit-ui/scripts/icon-audit/` modules: `schemas.mjs`, `baseline.mjs`, `mapping.mjs`, `capture.mjs`, `compare.mjs`, `artifacts.mjs`.
- Add `packages/yakit-ui/scripts/icon-audit-harness.tsx`: one isolated component route selected by a stable `iconId`, with no Storybook decorators or gallery layout.
- Add `packages/yakit-ui/scripts/icon-audit.test.mjs` and `fixtures/icon-audit/` for deterministic fixture coverage.
- Package commands: `audit:icons:baseline`, `audit:icons:qualify`, `audit:icons`, and `test:audit-icons`.

## Capture contract

The run records and validates: lockfile SHA-256, OS/container image, Playwright version, Chromium executable path and SHA-256, launch flags, viewport equal to the icon dimensions, device scale factor 1, sRGB color profile, fixed `#ffffff` background, fixed `#353639` foreground, explicit `size` (`24` outline / `20` solid), CSS reset, no fonts, animations, transitions, theme, locale, GPU variance, cropping, scaling, or alpha threshold. Figma SVG and local component are rasterized by the same executable and screenshot API.

## Versioned state and schemas

Every JSON artifact has `schemaVersion: 1`, a canonical sorted-key serialization, and a content hash. Required states are `preflight`, `baseline-complete`, `blocked-terminal`, `mapped`, `qualified`, `rendered`, `compared`, and `reported`; transitions are append-only and invalid transitions fail.

- `baseline.json`: file/frame IDs, Figma version/last-modified, traversal rule, candidate node IDs, export URLs, SVG SHA-256, expected count, and `complete`.
- `mapping.json`: stable `iconId`, local path/export/variant/local SHA-256, nullable `componentExport` (null for raw-SVG-only rows), Figma node ID/SVG SHA-256, `mappingStatus`, `captureSource`, and provenance (`node-id`, `manual-map`, or `unmapped`).
- `render-metadata.json`: iconId, source hash, renderer/browser hashes, parameters, PNG hash, decoded width/height/RGBA hash.
- `report-row.json`: `auditStatus`, immutable `comparisonStatus`, reason enum, artifact links, and evidence availability.
- `blocker.json`: phase, reason enum, failed inputs, logs, hashes, and `noRenderPerformed: true` when the baseline gate fails.
- `repair-row.json`: immutable comparison reference plus append-only human `disposition`, owner, action, justification, timestamp.

Stable artifact paths are content-addressed under `.omx/icon-audit/<run-id>/<sha256>/`; existing paths cannot be overwritten. Volatile timestamps live only in run metadata, not canonical verdict hashes.

## Ingress, CLI, and capture wiring

The production baseline command accepts either `--figma-bundle <dir>` (offline frozen bundle) or `--figma-provider figma-mcp` with `FIGMA_FILE_KEY`, `FIGMA_NODE_ID`, and the configured Figma connector; no raw token is written to artifacts. The bundle layout is `<dir>/manifest.json` plus `<dir>/svg/<nodeId>.svg`; manifest schema is `{schemaVersion:1,fileKey,frameNodeId,figmaVersion,lastModified,expectedCount,complete,traversal:{includedKinds,excludedKinds,orderedNodeIds,terminalCursor},nodes:[{nodeId,name,variant,width,height,svgPath,sha256}]}`. `complete` is true only when `nodes.length === expectedCount`, `orderedNodeIds` has the same count, traversal ended with `nextCursor:null`, and every referenced SVG exists and hash-matches; no unreferenced SVG is allowed. The provider adapter interface is `listFrame(fileKey,frameNodeId,cursor) -> {nodes,nextCursor,figmaVersion,lastModified}` and `exportSvg(fileKey,nodeId) -> {bytes,sha256}`; pagination is repeated until `nextCursor:null`, with deterministic node sorting and no silent retry exhaustion. Fixtures use `--figma-provider fixture --fixture-dir scripts/fixtures/icon-audit/figma` and never access the network.

Add the executable entry at `packages/yakit-ui/scripts/icon-audit.mjs`. It starts Vite with `scripts/icon-audit-harness/vite.config.ts`; `scripts/icon-audit-harness/index.html` loads `/src/main.tsx`, and the browser entry imports the frozen export manifest. Package scripts are exact: `audit:icons:baseline` → `node scripts/icon-audit.mjs baseline`, `audit:icons:qualify` → `node scripts/icon-audit.mjs qualify`, `audit:icons` → `node scripts/icon-audit.mjs run`, and `test:audit-icons` → `vitest run scripts/icon-audit.test.mjs`. The CLI resolves the repository root via `git rev-parse --show-toplevel`, resolves all default `.omx` paths from that root, waits for `ICON_AUDIT_READY`, opens `/icon/<iconId>` for runtime exports or `/svg/<iconId>` for raw-SVG-only rows, and shuts the server down in `finally`.

## Mapping/state contracts

The manual map is `packages/yakit-ui/scripts/icon-audit-manual-map.json`, schema `{schemaVersion:1, rows:[{localPath,figmaNodeId,reason}]}`; any duplicate localPath/nodeId or missing reason is invalid. The normalized fallback identity is `variant + ':' + canonicalized export name` (Unicode NFKC, trim, collapse whitespace, case-sensitive); it is usable only when unique and is recorded as `unique-export-identity` provenance. A local SVG with no runtime export is `mappingStatus: raw-svg-only`, `captureSource: raw-svg`, has `componentExport: null`, and is never silently excluded. The exhaustive mappingStatus enum is `mapped|raw-svg-only|figma-only|local-only|duplicate|ambiguous`.

Allowed graph: `preflight → baseline-complete | blocked-terminal`; `baseline-complete → mapped | blocked-terminal`; `mapped → qualified | blocked-terminal`; `qualified → rendered | blocked-terminal`; `rendered → compared | blocked-terminal`; `compared → reported`; `reported` is terminal. Per-row `mappingStatus` is `mapped|raw-svg-only|figma-only|local-only|duplicate|ambiguous`; `auditStatus` is `pending|pass|fail|blocked`; `comparisonStatus` is `not-compared|pass|fail`. A run-level blocked state prevents all downstream rows from becoming pass.

Immutable objects live at `.omx/icon-audit/objects/<sha256>.<ext>` with atomic temp-write, fsync, no-overwrite, and byte-equal deduplication. Each phase writes an immutable phase manifest under `.omx/icon-audit/phases/<run-id>/<phase>-<hash>.json`; a finalizer atomically writes one `.omx/icon-audit/runs/<run-id>/run.json` referencing phase hashes. An existing run ID or final path is never overwritten. Render references use explicit `renders/<iconId>/figma.png.ref.json` and `local.png.ref.json` files containing `{objectSha256,mediaType}` (not symlinks or duplicate bytes). Reruns may use different run IDs but must reference identical object hashes for unchanged inputs.

## Baseline and mapping algorithm

Freeze the 636-entry local snapshot from the current worktree before any render, including git HEAD, dirty-worktree fingerprint, path, variant, export, and local SHA-256. Traverse only Figma vector/component/instance descendants under `Basic Icons`; exclude section headers and non-exportable instances, record traversal order, and require a complete node/export count before continuing. Mapping precedence is exact Figma node ID in filename, then frozen explicit manual-map, then unique export identity; duplicates or unresolved rows are terminal mapping failures, never guessed.
