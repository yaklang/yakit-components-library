# PRD: Fix Known Yesterday Icon/Figma Differences

## Requirements Summary

Use the approved audit scope from `.omx/specs/deep-interview-yesterday-icon-figma-audit.md` to repair known, visually evidenced icon export defects without redesigning glyphs:

1. Remove the full-viewport `#E7E7F5` background rectangle from the 188 affected SVGs (75 Outline, 113 Solid), preserving each glyph path, viewport, dimensions, fills, and strokes.
2. Add the missing Figma `Icon/LandPlot` export (`46174:9893`) as a 24×24 Outline icon and register it using the repository's existing naming/import conventions.
3. Resolve the scope of Solid `4936-115787`, `4936-115788`, `4936-115789`, and `4936-115790` against the complete Figma `Basic Icons` inventory; retain them only if they belong to the set, otherwise quarantine/remove only with explicit evidence.
4. Add a repeatable SVG audit test/script that catches full-viewport backgrounds, empty SVGs, invalid dimensions, and missing required Figma IDs without depending on network access.

## RALPLAN-DR Summary

### Principles

- Preserve Figma glyph geometry; make the smallest export-only edits.
- Prefer deterministic, repository-local validation over manual-only inspection.
- Keep generated icon indexes and SVG assets synchronized.
- Treat uncertain source-scope differences as unresolved until evidence exists.

### Decision Drivers

1. Visual fidelity to the supplied Figma `Basic Icons` frame.
2. Low regression risk across 636 public icon exports.
3. Repeatability for future Figma exports.

### Viable Options

| Option | Approach | Pros | Cons |
|---|---|---|---|
| A — Targeted cleanup + audit (recommended) | Remove only proven background rects, add LandPlot, preserve uncertain files, add tests | Small diff; reversible; respects evidence boundary | Requires a one-time Figma export or manifest for the four uncertain files |
| B — Re-export entire set from Figma | Replace all local SVGs and regenerate indexes from a canonical export | Highest source consistency if export tooling is known | High churn; generator/export settings are absent; may overwrite unrelated local work |
| C — Runtime masking | Hide background rects in `createIcon`/SVGR transform | Avoids touching assets | Leaves bad source artifacts; can mask legitimate fills and does not solve LandPlot/missing inventory |

Option B is deferred because no local Figma export manifest/generator exists and the icon tree is untracked. Option C is rejected because it weakens source fidelity and validation.

## Implementation Steps

1. **Capture canonical inventory** — use `figma-basic-icons-inventory.json` for complete Figma provenance and `icon-inventory.json` for 188 cleanup rows. Paths use absolute element-only grammar `/svg[1]/g[3]/path[2]` (one-based same-name siblings); `retainedSubtreePaths` is mandatory. Canonicalization v1 omits declaration/comments, sorts attributes, preserves element order, collapses whitespace, UTF-8 encodes, and hashes `sha256(UTF8(JSON.stringify([{path,canonicalXml},...])))` in listed order. Record LandPlot artifact SHA-256 and stop before mutation if canonical inputs are absent.
2. **Clean affected SVGs structurally** — `apply-icon-cleanup.mjs` is the sole mutation entry point, invoked from `packages/yakit-ui` with `--assets-root src/icons`. It stages a complete clone of `src/icons` under `.icon-cleanup-staging/<run-id>/`, fsyncs files/directories, audits staging, renames current tree to `.icon-cleanup-backup/<run-id>`, renames staging into place, fsyncs parent, audits installed tree, then deletes backup only on success; failures restore backup and report status. All signatures/hashes/xmllint checks occur before the first rename.
3. **Add/register LandPlot** — commit the canonical normalized export at `packages/yakit-ui/scripts/landplot-46174-9893.svg` with node ID, source URL, capture timestamp, and SHA-256 recorded in the Figma inventory; copy that exact artifact to `src/icons/outline/46174-9893.svg`, import it in `outline/index.tsx`, and expose `LandPlotOutlined`; verify runtime registry and package-root exposure rather than manually editing `registry.ts`.
4. **Resolve four uncertain Solid files (status-only)** — compare their node IDs/names against the complete Figma inventory; record `confirmed-in-set`, `not-found-in-complete-inventory`, or `unresolved-incomplete-inventory`. Preserve all four in this change; deletion/quarantine requires a separate explicit decision.
5. **Add validation** — create `packages/yakit-ui/scripts/audit-icons.mjs` and an `audit:icons` package script. Use `xmllint --noout` for well-formedness (fail clearly if unavailable) plus a deterministic Node tokenizer for the constrained SVG structure. Validate dimensions/viewBox, no leaked background subtrees, no empty SVGs, import targets, required LandPlot filename/export/registry/package-root exposure, and normalized retained-glyph hashes. Check mode is read-only and fails on manifest count/path/hash drift, malformed XML, unexpected removal nodes, missing imports, invalid dimensions, or missing LandPlot exposure; baseline unresolved statuses are report-only.
6. **Run verification** — from `packages/yakit-ui`, run `pnpm audit:icons`, `pnpm test:audit-icons`, `pnpm lint`, `pnpm build:lib`, `pnpm build-storybook`, and `pnpm test:icon-visual`. The visual script serves story ID `icon-audit--default`, locates selectors `[data-icon-audit="rocket-off|rewind|landplot"]`, uses 160×96/deviceScaleFactor 1, checkerboard 8px `#fff/#eee`, corner RGBA tolerance 2, ≥12 non-checkerboard glyph pixels, and natural 24/20 dimensions.

## Acceptance Criteria

- `rg`/audit reports zero full-viewport `#E7E7F5` rects in the in-scope icon directories.
- All 188 affected files retain identical normalized glyph/definition content after the allowlisted background-subtree deletion; only the allowlisted nodes may be removed.
- `LandPlotOutlined` exists, is imported from its SVG, appears in `outlineIconRegistry`, and renders at 24×24.
- Empty/malformed SVG count remains zero; Outline/Solid viewport checks pass.
- The four `4936-*` files have an explicit `confirmed-in-set`, `not-found-in-complete-inventory`, or `unresolved-incomplete-inventory` status backed by a Figma ID/name mapping; no deletion occurs in this change.
- `icon-inventory.json` contains exactly 188 cleanup rows with valid paths, Figma metadata, removal-node signatures, and pre-cleanup retained-subtree SHA-256 hashes.
- Missing canonical Figma inventory or LandPlot SVG causes a pre-mutation stop with a clear blocker.
- `figma-basic-icons-inventory.json` asserts `complete:true`, records provenance, enumerates exportable nodes/instances, includes LandPlot, and lists the four uncertain IDs.
- `apply-icon-cleanup.mjs` is the only mutation entry point and performs all preflight checks before the first write; partial writes are not allowed.
- The staging/backup swap leaves either the original tree or the fully validated 188-file tree; no mixed state is accepted.
- `pnpm --filter yakit-ui lint`, `pnpm --filter yakit-ui build:lib`, and the focused icon audit all pass.

## Risks and Mitigations

- **Exported parent frame may contain both a lavender rect and oversized light frame path** — use the manifest plus structural allowlist and fail closed on exceptions.
- **Figma export includes parent frame artifacts** — validate path bounds and render representative icons before bulk cleanup.
- **Generated index drift** — update the index in the same change and assert the registry contains LandPlot.
- **Untracked worktree loss** — do not re-export/replace the full directory; edit only the explicit candidate set.
- **Incomplete Figma inventory** — keep the four uncertain files and record explicit status rather than deleting.
- **Missing canonical input** — stop before mutation; do not synthesize LandPlot or infer scope.

## Verification Plan

- Unit/static: focused `audit:icons` script, manifest checks, and normalized pre/post retained-subtree hashes.
- Integration: library build and TypeScript declaration generation.
- Visual: mandatory Storybook build plus Playwright screenshots for one cleaned Outline, one cleaned Solid, and LandPlot; transparent background and expected viewport are pass conditions.
- Regression: rerun counts, inspect git diff for only intended assets/index/test files, and confirm no unrelated worktree changes were reverted.

## ADR

- **Decision:** targeted source cleanup plus deterministic audit, with LandPlot added from the canonical Figma export and uncertain files preserved pending evidence.
- **Drivers:** visual fidelity, low diff risk, repeatable validation.
- **Alternatives considered:** full re-export; runtime masking.
- **Why chosen:** the repository lacks a reliable generator/manifest, while the background defect is statically and visually evidenced.
- **Consequences:** 188 assets need a controlled mechanical edit; a future canonical export manifest remains desirable.
- **Follow-ups:** recover/export the complete Figma inventory; optionally add CI enforcement for the audit script.

## Scope transition

The preceding deep-interview was report-only. This newer user request explicitly overrides that boundary and asks for a repair plan; implementation remains outside ralplan until a future execution lane is authorized.

## Changelog

- Architect iteration applied: structural cleanup includes both leaked backdrop layers; preservation is hash/allowlist based; uncertain files are status-only; concrete manifest/script paths and LandPlot exposure checks were added; scope transition was documented.
