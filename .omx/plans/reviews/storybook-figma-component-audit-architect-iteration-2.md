# Architect Review — Iteration 2

## Verdict

`APPROVE`

All twelve iteration-1 must-modify items are substantively addressed. This is Architect approval only; it does not replace Critic review or authorize execution.

## Verified outcomes

- Four immutable identities—DesignBaseline, ImplementationBaseline, HarnessRun, RepairRun—are separated, with lineage and permission boundaries.
- Figma evidence is frozen with version/lastModified, raw exports, traversal completeness, hashes, and terminal counts.
- Artifacts use versioned schemas, canonical serialization, content hashes, stable IDs, parent hashes, and append-only state transitions.
- Each audit dimension has an independent authority source.
- The evidence model is a many-to-many graph, permitting only proven behavioral-equivalence reuse.
- The matrix contains real Figma terminal variants, exclusions/applicability, and expected versus actual counts rather than a blind Cartesian product.
- The dirty-worktree/environment manifest covers Git status, hashes, diffs, config/lockfiles, browser, DPR, OS, and font identity.
- Stories and audit scripts have explicit lint, typecheck, test, build, and audit commands.
- Comparison policy is versioned and property-specific.
- Strict conformance is independent from severity or release thresholds and requires zero partial/nonconforming/blocked rows.
- The verdict truth table is deterministic.
- Shared-token changes occur only after root-cause proof; ButtonGroup follows Button contract stabilization.

## Strongest steelman antithesis

Auditing and fixing one component at a time could surface API feasibility and visible repairs earlier, especially while Input/InputNumber/SearchInput are still dirty or untracked. Its fatal weakness for this strict task is the moving baseline: later shared-token, group, or API decisions can invalidate earlier conclusions and hide global omissions.

## Tradeoff tension

- Reproducibility versus storage/runtime cost of four immutable identities and offline Figma evidence.
- Strict typography proof versus blocked rows when PingFang SC is unavailable.
- Evidence reuse versus the risk of falsely grouping semantically distinct branches.

## Synthesis

Retain the global matrix-first frozen baseline, but collect evidence in component batches without mutating the baseline. During repair, use dependency-aware lanes for Input/SearchInput, InputNumber, Tag, and Button/ButtonGroup, with leader-owned shared token/export decisions.

## Remaining architecture blockers

None. Expected runtime stop conditions are correctly modeled: incomplete Figma freeze, unavailable required font, and unavailable official host consensus receipt.

## Optional suggestions

1. Replace “design-implied transitions” with transitions defined only by an explicit prototype or approved contract.
2. Make accessibility authority an independent hashed `semantic-policy-v1.json`.
3. Add `stateAcquisition: real-interaction | forced-pseudo | prop-driven`; forced pseudo-state may satisfy visual evidence only.
4. Define retention/garbage collection for content-addressed objects without deleting finalized-run dependencies.
5. Use a file lock or before/after double hash during baseline finalization.

## Key evidence anchors

- `.omx/plans/prd-storybook-figma-component-audit.md:73-149,153-188,192-215,252-264`
- `.omx/plans/test-spec-storybook-figma-component-audit.md:11-60,62-188`
- `.omx/specs/deep-interview-storybook-figma-component-audit.md:52-58,137-151,203-208`

