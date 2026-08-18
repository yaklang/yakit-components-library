# Test Specification: Strict Storybook / Figma Component Audit

## Purpose

Prove that the audit is complete, reproducible, and strict, then prove any later repairs satisfy all five conformance dimensions without regressing current public behavior. The canonical requirements and verdict rules are defined at `.omx/specs/deep-interview-storybook-figma-component-audit.md:91` and `:137`.

## Test architecture

Use the repository's existing Storybook 8/Vite, `@storybook/test`, Vitest Browser, and Playwright dependencies (`packages/yakit-ui/.storybook/main.ts:1`; `packages/yakit-ui/package.json:37`). Add scripts/configuration only as needed; do not add dependencies. Tests consume the frozen `figma-matrix.json`, `story-index-baseline.json`, and many-to-many `evidence-graph.json` so baseline truth, probe evidence, repaired stories, and report coverage cannot drift.

Every terminal `requirementId` has five row-dimension edges. Each edge references zero or more content-addressed evidence nodes and contains:

- exact Figma node URL/property tuple;
- scoped source and public API file:line references;
- frozen baseline Storybook story ID/args when present, never a probe fixture ID;
- pinned capture metadata and screenshot/computed-style result;
- interaction trace;
- accessibility assertions;
- `pass|partial|fail|blocked|not-applicable`, applicability reason, equivalence-class ID if shared, and final deterministic row verdict.

Visual and Storybook evidence are terminal-row-specific. Interaction/API/accessibility evidence may be shared only through a declared equivalence class proving invariant behavior across the covered rows and covering every distinct render/semantic branch.

## Audit-contract tests

### Figma ingress and DesignBaseline tests

1. Execute the PRD's exact `figma-ingest` command against a deterministic provider fixture and assert the adapter receives provider `figma-rest-v1`, file key `QWct5XE0Bg0bNDQ93eYgEw`, all ten colon-normalized root IDs, `--page-size 50`, and the absolute `--figma-bundle` path. Assert credentials are accepted only from `FIGMA_ACCESS_TOKEN` and never appear in request records, logs, hashes, or the sealed bundle.
2. Assert breadth-first stable-ID traversal and export acquisition produce ordered logical pages. Each page records requested IDs, `pageNumber`, provider cursor/token or explicit `null`, response hash, and next queue state. Fixtures cover multiple node pages and export pages so an implementation that silently reads only the first chunk fails.
3. Validate the sealed layout exactly: `figma-bundle-manifest.json`, ordered `requests/`, `responses/`, `nodes/`, `exports/`, `export-metadata/`, and optional non-empty `failures/`. Reject undeclared files, symlinks, path escapes, media mismatch, byte-size mismatch, and any raw SHA-256 mismatch.
4. Assert `figma-bundle-manifest.json` records provider/version, file key/name, Figma `version`/`lastModified`, requested roots, page size, page/cursor history, traversal terminal cursor, expected/actual node/export/terminal counts, ordered file hashes, canonical manifest hash, bundle hash, and `complete:true` only after every required response/export validates.
5. Inject non-2xx responses, missing node IDs, missing or failed image exports, exhausted retries, truncated pages, traversal gaps, and count mismatches. Each case leaves the bundle incomplete and transitions the entire pre-freeze run to `blocked-terminal`; it produces no ImplementationBaseline, matrix row verdict, or row-level blocker.
6. Execute the PRD's exact `design-baseline` command with provider `offline-bundle-v1`. Assert it performs zero network calls, independently recomputes all raw/manifest/bundle hashes, preserves Figma version/lastModified, and derives only real terminal variants.
7. After DesignBaseline commits, deny all network access and prove baseline audit, HarnessRun, and RepairRun re-audit consume only the content-addressed offline bundle. Any refresh or changed design input requires a distinct ingress ID and DesignBaseline hash.
8. Start a new run with a missing, corrupt, hash-invalid, or `complete:false` bundle and assert terminal new-run failure (`blocked-terminal`) before row creation. It must not emit row-level `blocked`, borrow another run's evidence, or downgrade the failure to a warning.

### Matrix/schema unit tests

1. Validate every JSON schema: required `schemaVersion:1`, artifact type, parent hashes, enums, canonical serialization, and recomputed `contentHash`; reject unknown schema versions/fields and mutable-path-only references.
2. Recompute `requirementId` from canonical `{figmaFileKey,rootNodeId,terminalNodeId,rawVariantTuple}` and reject collision, duplicate tuple, normalized-name-derived identity, or missing provenance.
3. Assert all ten URLs from `.omx/specs/deep-interview-storybook-figma-component-audit.md:23` are present in a frozen offline bundle whose file version/lastModified, raw node/export hashes, traversal cursor, and bundle/matrix hashes validate.
4. Assert traversal is complete and expected terminal count equals actual terminal count for every root. Enumerate only actual terminal nodes; every exclusion/non-applicability has a raw source and reason. No test generates a blind Cartesian product.
5. Assert minimum families/property values from `.omx/specs/deep-interview-storybook-figma-component-audit.md:95` occur among real terminals, including Button group counts 2–5, or the audit stops with source-backed contradiction evidence.
6. Assert normalized labels preserve raw Figma tuples and explicit mappings; name similarity alone cannot yield a pass.
7. Assert every row has exactly five row-dimension edges and one report row; every evidence reference resolves by hash. Extra/orphan evidence is reported but cannot create coverage.
8. Reject a shared visual/Storybook evidence node. Reject shared interaction/API/a11y evidence without an equivalence class, invariant proof, covered row IDs, and representative evidence for every distinct code/semantic branch.
9. Assert row verdict aggregation exactly follows: any `fail` → nonconforming even with blockers; otherwise any `blocked` → blocked; otherwise any `partial` → partially-conforming; otherwise all applicable pass → conforming. Severity cannot affect this result.
10. Assert missing baseline Storybook/API/required behavior/a11y operation is `fail`; only failed evidence collection with no known failure is `blocked` (`.omx/specs/deep-interview-storybook-figma-component-audit.md:139`).
11. Assert `strictConformance=true` only for zero partial/nonconforming/blocked rows. A release waiver/threshold field, if separately present, cannot mutate verdicts or strict conformance.
12. Assert every nonconforming/partial/blocked row links to a finding/backlog item with target files, tests, dependency order, and compatibility classification.
13. Validate `implementation-baseline.json` per-file status/mode/byte size/text-binary/SHA-256; Git HEAD/scoped diff; manifests/config/lockfiles; OS/browser/DPR/color profile/locale/theme/font identity; and manifest hash.
14. Assert current input hashes match the selected immutable baseline before finalization. Changed inputs create a new ImplementationBaseline or RepairRun; they never mutate an existing report.
15. Enumerate and reject every unspecified workflow state transition; probe child runs cannot advance or mutate baseline state.

### Deterministic capture qualification

1. Capture one representative text, icon-only, focus-ring, disabled, and grouped-control terminal fixture twice; require identical normalized computed properties and no unexplained raster difference.
2. Pin light theme and locale despite the global theme/locale controls in `packages/yakit-ui/.storybook/preview.tsx:12`; record dark theme only as a non-Figma regression smoke.
3. Require OS/arch, Node/pnpm, browser executable/version/hash, DPR, viewport, color profile, locale/theme, loaded font identity, background, animation suppression, input hashes, and fixture args in metadata.
4. Validate comparison policy v1: geometry exact to 0.01 CSS px; sRGB RGBA8 exact after opacity composition; exact typography properties plus loaded expected font; same-environment raster diff as corroborating evidence; icon source hashes diagnostic only.
5. Mutation fixtures detect a 0.02 CSS px property mismatch, 1px screenshot shift, one RGBA channel change, wrong font identity/size/weight/line-height/letter-spacing, missing icon/focus ring, and disabled-state color change.
6. Expected `PingFang SC` unavailable or `document.fonts.check` false makes affected typography visual evidence blocked; fallback rendering cannot pass.
7. After a valid DesignBaseline exists, a render timeout, missing implementation asset, or unstable implementation capture produces visual `blocked` when no known failure exists; an otherwise complete result with an unexplained reproducible raster difference is visual `partial`. Figma-source inaccessibility is not handled here: pre-freeze it is a run-wide `blocked-terminal`, and post-freeze the offline bundle is the sole source. Both row-level capture outcomes retain logs/next-best evidence and neither can pass.
8. A policy hash change forces a new full run; existing row verdicts cannot be reinterpreted.

### Baseline, probe, and repair lineage tests

1. Freeze `story-index-baseline.json` before probe creation; confirm Input/Search/Button absences remain baseline Storybook failures.
2. Register an otherwise matching probe fixture and prove it can add visual/interaction/a11y evidence while the baseline Storybook dimension remains unchanged.
3. Prove a probe story ID is rejected as baseline Storybook authority.
4. Create a fixture RepairRun and require valid DesignBaseline, ImplementationBaseline, baseline report, HarnessRun, authorization, repaired manifest, and repaired story-index parent hashes.
5. Re-audit may improve repaired Storybook results but must retain the immutable baseline verdict/report lineage.

## Component contract tests

### Input

Current API and rendering anchors are `packages/yakit-ui/src/components/Input/type.ts:5` and `packages/yakit-ui/src/components/Input/Input.tsx:31`; current story coverage ends at size/error/disabled examples (`packages/yakit-ui/.storybook/stories/Input.stories.tsx:35`).

- Render and measure every applicable real Input terminal row across the required S/M/L, filled/error/state/content properties; do not manufacture combinations absent from Figma.
- Exercise Tab/focus, typing, selection, disabled non-editability, and any addon/dropdown operation defined by the final API.
- Verify native input semantics, accessible label propagation, error state exposure where appropriate, focus visibility, disabled state, and decorative icon handling.
- Compile supported prop expressions for each row; custom private class or consumer wrapper dependence fails API conformance.
- Regression-test existing `prefix`, `suffix`, `error`, standard input attributes, `className`, `rootClassName`, and inline style behavior.

### SearchInput

Current API covers sizes/families/icon placement at `packages/yakit-ui/src/components/SearchInput/type.ts:5`; button/input render branches live at `packages/yakit-ui/src/components/SearchInput/SearchInput.tsx:48`, `:72`, and `:84`.

- Render every applicable real SearchInput terminal row spanning the documented sizes/families/filled/state/icon properties; do not manufacture absent combinations.
- Verify click and keyboard activation call `onSearch` once with the current input value; disabled action and icon-only controls do not call it.
- Verify icon-only and search action accessible names, input labeling, tab order, focus ring, and decorative image treatment. Test dropdown open/change state/name/keyboard behavior only when an explicit prototype or approved contract defines it; the static trigger at `packages/yakit-ui/src/components/SearchInput/SearchInput.tsx:84` proves neither behavior nor conformance.
- Verify deprecated/normalized `default → box` and `primary → main-bg` aliases remain behaviorally compatible (`packages/yakit-ui/src/components/SearchInput/SearchInput.tsx:31`).
- Verify no story row relies on controls alone; each has a stable replayable story/fixture ID.

### InputNumber

Current min/max and control rendering anchors are `packages/yakit-ui/src/components/InputNumber/InputNumber.tsx:79`, `:102`, `:122`, and `:143`; size/control API is `packages/yakit-ui/src/components/InputNumber/type.ts:5`.

- Render vertical S/M/L/Huge and horizontal S/M/L; explicitly assert horizontal Huge is absent from the Figma-required matrix and cannot silently appear as a passing row.
- Exercise increment/decrement click, keyboard focus/activation, typing, controlled/uncontrolled values, step, min/max clamping, empty/invalid text behavior, and disabled behavior.
- At min/max, verify the unavailable control is natively disabled, inaccessible to activation, has the correct accessible name/state, and matches the corresponding Figma icon/color.
- Verify vertical control disclosure on hover/focus (`packages/yakit-ui/src/components/InputNumber/style/index.ts:76`) is reachable by keyboard and matches the design state.
- Regression-test `controls={false}`, existing callbacks, native input attributes, and values across all sizes.

### Tag

Current declared-but-unrendered props are visible at `packages/yakit-ui/src/components/Tag/Tag.tsx:9` and the children-only render at `:51`; size/color styles are at `packages/yakit-ui/src/components/Tag/style/index.ts:15` and `:36`.

- Render every real terminal Tag row across the documented risk/generic/full-color, size, content, closable, bordered, corner, and color properties; do not generate non-terminal Cartesian combinations.
- Verify `icon`, `closeIcon`, and `onClose` render/operate via the public API; close activation fires exactly once and does not accidentally trigger unrelated handlers.
- Verify closable tags provide a reachable semantic control with accessible name and visible focus; decorative dot/avatar/icon semantics are appropriate.
- Verify `bordered={true|false}` matches its public meaning regardless of internal class naming (`packages/yakit-ui/src/components/Tag/Tag.tsx:45`).
- Verify Tag is reachable from the package public barrel after remediation; current exports at `packages/yakit-ui/src/components/index.tsx:1` omit it.

### Button and ButtonGroup

Current type/size/shape/loading API is `packages/yakit-ui/src/components/Button/type.ts:5`; native button and busy/disabled behavior are at `packages/yakit-ui/src/components/Button/Button.tsx:80`; pressed interaction is at `packages/yakit-ui/src/components/Button/hooks/usePressed.ts:24`.

- Render every real terminal Button row across the documented type/error/size/state/content/shape properties; do not generate non-terminal Cartesian combinations.
- Exercise pointer and Enter/Space pressed lifecycles; assert pressed style clears on release/leave, click fires once, and disabled/loading never call `onClick`.
- Verify icon-only requires/receives an accessible name, loading exposes busy state and disables activation, focus-visible matches Figma, and native `htmlType` remains correct.
- After the standalone Button contract is stabilized, render every real terminal ButtonGroup row covering counts 2–5 and applicable sizes/corner treatments; assert internal borders, first/middle/last radii, focus order, keyboard operation, disabled members, and group semantics.
- Regression-test all existing nine normalized type values and error override; stories currently enumerate the values at `packages/yakit-ui/.storybook/stories/Button.stories.tsx:177`.

## Storybook coverage tests

1. The frozen baseline Storybook dimension passes only when `story-index-baseline.json` contains a stable original story for the `requirementId`; missing rows remain baseline failures even if the probe renders them.
2. In the repaired re-audit, every interaction-capable state includes a repaired story `play` function or equivalent reusable browser test; static source inference is insufficient.
3. Story args serialize the matrix row unambiguously and expose its `requirementId` in metadata or DOM evidence.
4. Storybook build discovers all five families through the configured story glob (`packages/yakit-ui/.storybook/main.ts:3`).
5. Existing curated stories remain renderable. Repaired matrix stories may be grouped separately; independent probe fixtures never enter the baseline index.
6. Light-theme Figma evidence is complete; dark theme gets a smoke pass only and cannot fail Figma conformance unless a supplied node specifies dark mode.

## Accessibility checks

For every applicable row, assert semantic element/role, accessible name, Tab reachability/order, Enter/Space operation, visible focus, native disabled behavior, `aria-busy`/expanded/invalid/value state where applicable, and decorative icon exclusion. A visually correct row with any required accessibility failure is nonconforming (`.omx/specs/deep-interview-storybook-figma-component-audit.md:203`). Automated results must be supplemented with explicit keyboard traces for close, search, dropdown, number controls, and grouped buttons.

## API and compatibility checks

- Freeze declarations, barrel/package exports, examples, and repository consumer results before proposing API changes; compare RepairRun declarations/exports against that snapshot.
- Type-level fixtures compile every Figma row using public imports only; private class names and deep imports are forbidden except when proving the current failure.
- Existing public prop signatures remain assignable. Any breaking/removal proposal is a stop/escalation condition (`.omx/specs/deep-interview-storybook-figma-component-audit.md:83`).
- Package `build:lib` verifies generated declarations/export reachability, including Tag and any new ButtonGroup export.
- Additive aliases are tested against canonical props until a separately approved migration can remove them.

## Visual comparison assertions

- Apply the hashed versioned comparison policy: exact normalized geometry properties, exact composed sRGB RGBA8, verified loaded font identity and typography properties, and same-environment raster evidence.
- Preserve Figma reference, actual screenshot, overlay/diff, computed-style JSON, and capture metadata for each visual failure.
- Do not invent an arbitrary global pixel or release threshold. Exact normalized properties are strict; raster differences are explanatory evidence and severity remains independent from verdict (`.omx/specs/deep-interview-storybook-figma-component-audit.md:146`).
- A minor cosmetic deviation may be low severity but is still not conforming.

## Failure and edge-case fixtures

1. Required Figma row absent from stories → `nonconforming`, Storybook dimension fail.
2. Story exists but API needs consumer CSS/private class → `nonconforming`, API dimension fail.
3. Visual match but icon-only control lacks accessible name → `nonconforming`, accessibility fail.
4. Public API and story exist but a mandatory hover/focus/pressed subcheck fails → dimension `fail`, row `nonconforming`, regardless of severity.
5. Figma node/export inaccessible before DesignBaseline freeze → whole run `blocked-terminal` with node URL, provider error, attempts, and timestamp; no row verdicts. After freeze, network access is forbidden and the verified offline object remains authoritative.
6. Worktree hash changes mid-run → invalidate run; do not combine pre/post-change evidence.
7. Conflicting supplied Figma nodes → block only affected rows and escalate with both property tuples.
8. Missing screenshot baseline cannot be converted to a pass by source inspection alone.
9. Storybook light/dark or zh/en globals changing geometry unexpectedly → regression finding; only supplied Figma theme determines conformity.
10. One dimension fails while another is blocked → row `nonconforming`; failure takes precedence.
11. No dimension fails, one is blocked, and another is partial → row `blocked`; blocker takes precedence over partial.
12. All mandatory subchecks pass but a row-specific secondary detail is incomplete → dimension/row `partial`; severity is assigned separately.

## Required commands and closure assertions

The execution lane should add explicit scripts using existing packages because current `lint` covers only `src/**/*.{ts,tsx}` (`packages/yakit-ui/package.json:23`) and Storybook build alone is not a strict story/audit TypeScript check. Planned scripts:

- `lint:stories-audit`: ESLint `.storybook/**/*.{ts,tsx}` and audit `scripts/**/*.{ts,tsx,mjs}`.
- `check-types:stories-audit`: `tsc --noEmit -p tsconfig.audit.json`, including stories, play tests, harness, schemas, and audit scripts.
- `test:audit-components`: Vitest unit/integration tests for schemas, IDs, state transitions, comparison policy, evidence graph, and component contracts.
- `audit:components`: deterministic baseline/probe/report or RepairRun/re-audit CLI.

Final closure then requires:

```sh
audit_repo_root="$(git rev-parse --show-toplevel)"
audit_run="$audit_repo_root/.omx/audits/storybook-figma-components/runs/<run-id>"

pnpm --dir "$audit_repo_root/packages/yakit-ui" test:audit-components
pnpm --dir "$audit_repo_root/packages/yakit-ui" lint
pnpm --dir "$audit_repo_root/packages/yakit-ui" lint:stories-audit
pnpm --dir "$audit_repo_root/packages/yakit-ui" check-types:stories-audit
pnpm --dir "$audit_repo_root/packages/yakit-ui" build:lib
pnpm --dir "$audit_repo_root/packages/yakit-ui" build-storybook
pnpm --dir "$audit_repo_root/packages/yakit-ui" audit:components -- \
  --repo-root "$audit_repo_root" \
  --run "$audit_run"
```

The audit CLI must resolve all `.omx/audits` artifacts from the required absolute `--repo-root`; `process.cwd()`, the package directory selected by `pnpm --dir`, and caller-relative `.omx` paths are never artifact authorities. A path-resolution integration test invokes the same CLI (a) from the repository root with `pnpm --dir packages/yakit-ui` and (b) from an unrelated temporary working directory with an absolute `--dir` and `--repo-root`. Both must resolve the identical canonical repository root and run directory. Missing/non-absolute `--repo-root`, a root not containing `packages/yakit-ui/package.json`, or a `--run` path outside `<repo-root>/.omx/audits/storybook-figma-components/runs/` fails before writes.

Assertions:

- all commands exit zero;
- matrix terminal-row count equals five row-dimension edges per row and one report row per requirement; evidence-node count is independently many-to-many;
- all ten Figma nodes and all minimum property values are covered;
- every final `conforming` row passes all five dimensions;
- `strictConformance=true` only when every row conforms and zero partial/nonconforming/blocked rows remain;
- severity/release thresholds and waivers never change verdicts or strict conformance;
- all audit artifacts reference the same worktree hash set;
- RepairRun contains immutable lineage to both baselines, baseline report, probe run, repaired manifest/story index, and re-audit report;
- no unrelated source files or Figma nodes were changed.

## Stop and escalation conditions

Stop before repair if the Figma matrix cannot be extracted completely or the baseline changes. During repair, stop before a breaking/removal API change, new dependency, unrelated component change, contradictory Figma resolution, publication, or deployment. Record unavailable checks and blockers explicitly; do not weaken acceptance criteria to force completion.

## Iteration 1 changelog

- Added schema/hash/ID/state-machine, offline Figma freeze, expanded worktree/environment manifest, real-terminal traversal, comparison-policy, and lineage validation tests.
- Replaced one-row/one-evidence assumptions with five row-dimension edges over a many-to-many evidence graph and equivalence-class validation.
- Added deterministic verdict precedence, strict-conformance independence from severity/release policy, immutable baseline-versus-probe Storybook tests, and explicit story/audit lint, typecheck, unit/integration, build, and re-audit commands.

## Iteration 2 changelog

- Added an executable two-provider Figma ingress/freeze contract, exact commands and arguments, deterministic pagination, failure handling, offline bundle layout, and version/lastModified/raw-hash verification.
- Unified design-source failure semantics: inaccessible pre-freeze evidence and corrupt/incomplete new-run bundles are run-wide terminal failures; committed runs remain offline-only.
- Made repository-root artifact resolution explicit under `pnpm --dir` and added cross-working-directory path-resolution tests.
