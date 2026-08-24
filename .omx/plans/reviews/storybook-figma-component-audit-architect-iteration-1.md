# Architect Review — Iteration 1

## Verdict

`ITERATE`

The matrix-first direction is sound, but the current draft must not proceed to Critic because it conflates four identities: live Figma source, immutable dirty-worktree baseline, added probe fixtures, and repaired output.

## Strongest steelman antithesis

Audit-and-fix one component at a time could obtain implementation feedback sooner, especially because Input, InputNumber, and SearchInput are currently untracked. A monolithic frozen matrix risks spending heavily to formalize a transient baseline. Its weakness is that the baseline moves during review and cross-component token/API decisions can repeatedly invalidate earlier conclusions.

## Tradeoff tension

- Immutable audit truth versus complete observability: adding stories/fixtures improves measurement but changes the fact that the current Storybook lacks those stories.
- Strict row-by-row proof versus evidence cost: visual evidence must remain terminal-row-specific, while interaction/API/a11y evidence should be reusable only across proven behavioral equivalence classes.

## Required synthesis

Keep matrix-first audit, but separate content-addressed `DesignBaseline`, `ImplementationBaseline`, and `HarnessRun`; the later `RepairRun` must have explicit lineage to both baselines. Probe fixtures may observe capabilities but can never make the frozen baseline's Storybook dimension pass.

## Must modify

1. Separate original Storybook baseline, independent read-only probe harness, and repaired Storybook re-audit. Probe fixtures must not change the baseline Storybook verdict.
2. Freeze Figma evidence with file version/lastModified, raw node/export hashes, traversal completeness, canonical matrix hash, and offline/source bundle; stop if this cannot be frozen.
3. Define formal schemas for every JSON artifact with `schemaVersion`, canonical serialization, content hashes, stable `requirementId` algorithm, and state transitions.
4. Define independent authority per dimension: frozen Figma for visual/taxonomy, explicit prototype or existing contract for interaction, declarations/exports/consumers for API, adopted semantic rules for a11y, frozen story index for Storybook.
5. Replace the one-row/one-evidence record with a many-to-many evidence graph: each row has five explicit dimension results referencing evidence IDs; behavior-equivalence classes may share interaction/API/a11y evidence.
6. Enumerate real terminal Figma variants only, not blind Cartesian products. Record raw and normalized tuples, applicability/exclusion reasons, expected/actual terminal counts, and traversal-complete state.
7. Expand the implementation manifest with tracked/untracked/modified status, path/mode/size/text-binary/SHA-256, HEAD, scoped diff hash, config/manifest/lockfiles, browser/OS/DPR/font identity, manifest hash, and baseline-to-repair lineage.
8. Add explicit stories/audit-script lint, typecheck, and tests. Existing `lint` only checks `src`, and Storybook build is not a strict story TypeScript check.
9. Define a versioned property-specific comparison policy for geometry, normalized color, font availability, and raster diff evidence.
10. Separate strict conformance from any release threshold. `strictConformance=true` requires every required row conforming and zero partial/nonconforming/blocked rows. Severity is independent from verdict.
11. Add a row-verdict truth table, including aggregation when some dimensions fail and others are blocked. Remove ambiguous “partial or nonconforming according to severity” language.
12. Move shared-token changes after a root cause is proven. First freeze behavior/declarations/consumers, then additive API/semantic contracts, component fixes, proven token fixes, repaired stories, and full re-audit.

## Specific architecture notes

- Current Input/Search/Button stories are incomplete and must remain visibly incomplete in the immutable baseline.
- SearchInput's static dropdown trigger must not be treated as proof of an unspecified open/change contract.
- Tag's declared-but-unrendered icon/close/onClose contract and missing barrel export are early high-confidence candidates.
- ButtonGroup must follow stabilization of the Button contract.
- Do not invent a shared Input/Search primitive merely to parallelize work; their render implementations are independent.
- Font identity must be captured because component styles hard-code `PingFang SC`.

## Optional improvements

- Reuse the repository's icon-audit canonical serialization, offline Figma bundle, and state-machine patterns.
- Add separate `findings.json` and row-to-finding links for shared root causes.
- Distinguish real interaction, forced pseudo-state, and prop-driven state evidence; forced state proves visuals only.
- Save baseline declarations and scan consumers before API repair.
- Keep dark theme as regression smoke only.

## Source anchors

- `.omx/plans/prd-storybook-figma-component-audit.md:5,54,69,73-79,91-95,106-112`
- `.omx/plans/test-spec-storybook-figma-component-audit.md:29,34,50,60,70,80,90,116-121,128,135-155`
- `.omx/specs/deep-interview-storybook-figma-component-audit.md:52,58,67,83,91,137-151,203`
- `.omx/plans/prd-all-generated-icons-visual-audit.md:68-91`
- `packages/yakit-ui/package.json:18-29`
- `packages/yakit-ui/src/components/Tag/Tag.tsx:9-55`
- `packages/yakit-ui/src/components/SearchInput/SearchInput.tsx:84-97`
- `packages/yakit-ui/src/components/index.tsx:1-13`

