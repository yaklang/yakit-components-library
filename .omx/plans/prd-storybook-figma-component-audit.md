# PRD: Strict Storybook / Figma Audit for Five Shared Components

## Outcome and stop condition

Produce a reproducible, row-complete conformity audit for `Input`, `InputNumber`, `SearchInput`, `Tag`, and `Button`, using the supplied Figma nodes as the design oracle and the current dirty working tree as the implementation snapshot. Every Figma variant/state row receives one verdict across visual fidelity, interaction, public API, accessibility, and Storybook demonstrability. The audit phase stops when the matrix, evidence bundle, ranked findings, and remediation backlog are complete; component repair begins only in a separately authorized execution lane.

The requirements source explicitly makes the complete Figma matrix—not existing stories—the boundary and treats absent Storybook/API coverage as nonconforming (`.omx/specs/deep-interview-storybook-figma-component-audit.md:50`, `:91`, `:137`). Current stories demonstrate only selected examples, such as four SearchInput families without state combinations (`packages/yakit-ui/.storybook/stories/SearchInput.stories.tsx:27`), Input sizes/error/disabled (`packages/yakit-ui/.storybook/stories/Input.stories.tsx:35`), and Button types/sizes/shapes without groups (`packages/yakit-ui/.storybook/stories/Button.stories.tsx:125`, `:177`).

## Scope

### In scope

- Freeze the current worktree identity and audit the five component sources, styles, public exports, stories, and shared theme tokens. The existing tree is already modified/untracked, so audit evidence must record hashes rather than assume `HEAD` represents the implementation (`.omx/context/storybook-figma-component-audit-20260813T064340Z.md:31`, `:33`).
- Build the exact matrix from the ten supplied Figma node URLs (`.omx/specs/deep-interview-storybook-figma-component-audit.md:23`) and preserve each node ID on every derived row.
- Assess each row on five independent dimensions: visual, interaction, supported public API, accessibility, and reproducible Storybook evidence (`.omx/specs/deep-interview-storybook-figma-component-audit.md:52`).
- Produce ranked findings, cross-cutting root causes, and a remediation backlog that favors additive API changes and existing tokens/utilities (`.omx/specs/deep-interview-storybook-figma-component-audit.md:62`, `:72`).
- In the later repair lane, update only the five component families, their stories/tests/assets, and narrowly necessary shared tokens or export wiring.

### Out of scope

- Editing/redesigning Figma, auditing unrelated components, broad cleanup, dark-theme conformance not present in the supplied nodes, new dependencies, releases, or breaking API removal (`.omx/specs/deep-interview-storybook-figma-component-audit.md:62`).
- Treating a visually plausible custom consumer composition as conforming when the public component API cannot express it (`.omx/specs/deep-interview-storybook-figma-component-audit.md:203`).
- Using Chromatic package presence as proof of conformance: Storybook loads the addon (`packages/yakit-ui/.storybook/main.ts:5`), but package scripts expose no committed visual-test or test command (`packages/yakit-ui/package.json:18`).

## Current implementation evidence and likely gaps

These are audit hypotheses, not final verdicts until runtime evidence is captured.

- **Input:** public props support three sizes, `prefix`, `suffix`, and `error` (`packages/yakit-ui/src/components/Input/type.ts:5`); rendering is a wrapper, optional prefix/suffix, and native input (`packages/yakit-ui/src/components/Input/Input.tsx:31`). Filled presentation and front/back addon/dropdown/area-text contracts are not explicit. Style hard-codes 400px width and size rules (`packages/yakit-ui/src/components/Input/style/index.ts:16`, `:51`), so exact Figma dimensions must be measured rather than inferred.
- **InputNumber:** the API exposes four sizes and vertical/horizontal/false controls (`packages/yakit-ui/src/components/InputNumber/type.ts:5`), but horizontal controls are deliberately suppressed for `huge` (`packages/yakit-ui/src/components/InputNumber/InputNumber.tsx:143`). Min/max disables native buttons (`packages/yakit-ui/src/components/InputNumber/InputNumber.tsx:102`, `:124`), while vertical controls appear only on hover/focus (`packages/yakit-ui/src/components/InputNumber/style/index.ts:76`, `:87`). Verify keyboard numeric behavior, invalid/free text, native semantics, unavailable icons, and all state visuals.
- **SearchInput:** API covers four sizes, four normalized families, four icon positions, suffix, dropdown label, and `onSearch` (`packages/yakit-ui/src/components/SearchInput/type.ts:5`). Icon-only and action controls have accessible names (`packages/yakit-ui/src/components/SearchInput/SearchInput.tsx:48`, `:72`), but the dropdown trigger exposes no open/change contract (`packages/yakit-ui/src/components/SearchInput/SearchInput.tsx:84`). Filled/unfilled is not an explicit prop, and stories cover only one example per family (`packages/yakit-ui/.storybook/stories/SearchInput.stories.tsx:27`).
- **Tag:** props declare `icon`, `closeIcon`, and `onClose` (`packages/yakit-ui/src/components/Tag/Tag.tsx:9`), but the component destructures/render path outputs only `children` (`packages/yakit-ui/src/components/Tag/Tag.tsx:34`, `:51`). The `bordered` class is applied when `bordered` is false (`packages/yakit-ui/src/components/Tag/Tag.tsx:45`) and the class makes borders transparent (`packages/yakit-ui/src/components/Tag/style/index.ts:117`); runtime evidence must confirm the intended inverse naming. Sizes are currently 16/20/24px (`packages/yakit-ui/src/components/Tag/style/index.ts:15`), versus the required Figma 18/20/22 matrix (`.omx/specs/deep-interview-storybook-figma-component-audit.md:118`). Tag is also absent from the package component barrel while the other four are exported (`packages/yakit-ui/src/components/index.tsx:1`).
- **Button:** API exposes nine types, four sizes, three shapes, error, loading, and icon positioning (`packages/yakit-ui/src/components/Button/type.ts:5`). It uses a native button with disabled/loading and `aria-busy` (`packages/yakit-ui/src/components/Button/Button.tsx:80`), and pressed state is synthesized from mouse/keyboard events (`packages/yakit-ui/src/components/Button/hooks/usePressed.ts:4`). Focus-visible styling exists (`packages/yakit-ui/src/components/Button/style/index.ts:140`), but no ButtonGroup source/story exists and current stories stop at disabled (`packages/yakit-ui/.storybook/stories/Button.stories.tsx:230`). Verify every type/error/state/icon/shape combination and 2–5-member groups required by Figma (`.omx/specs/deep-interview-storybook-figma-component-audit.md:128`).
- **Storybook/test surface:** stories are discovered by glob (`packages/yakit-ui/.storybook/main.ts:3`), and theme/locale globals can affect screenshots (`packages/yakit-ui/.storybook/preview.tsx:12`, `:41`). Playwright, Vitest Browser, and Storybook test dependencies already exist (`packages/yakit-ui/package.json:37`), so the first implementation should use existing tooling and add no dependency.

## RALPLAN-DR (short)

### Principles

1. Figma node + variant properties are the design oracle; Storybook is evidence, not scope.
2. No implicit omission: every derived matrix row must terminate in exactly one verdict.
3. A pass requires all five evidence dimensions; a missing dimension cannot be averaged away.
4. Audit evidence is immutable and tied to current worktree/source hashes.
5. Remediation is compatibility-first, minimally scoped, and regression-protected.

### Top decision drivers

1. **Completeness:** prevent large Figma families from appearing compliant through a small curated story subset.
2. **Reproducibility:** another reviewer must be able to reproduce state, screenshot, and interaction evidence.
3. **Safe remediation:** shared primitives are consumer-facing; additive changes and narrow token reuse reduce regression risk.

### Viable options

#### Option A — Matrix-first audit, then dependency-ordered repair (recommended)

- Pros: cleanly separates observed fact from mutation; yields an authoritative backlog; exposes shared-token/API root causes before five parallel edits; supports severity-based scheduling.
- Cons: requires two phases and more up-front evidence storage; does not deliver repaired components immediately.

#### Option B — Audit-and-fix one component at a time

- Pros: earlier visible fixes and smaller local iteration loops.
- Cons: later Figma rows can invalidate earlier API/token decisions; cross-component consistency is harder to see; evidence risks describing a moving implementation snapshot.

#### Option C — Storybook-only visual sweep

- Pros: fastest and simplest capture surface.
- Cons: invalidated by the accepted requirements because existing stories omit required variants/states, API/accessibility cannot be proved by screenshots, and “not in Storybook” is itself a failure (`.omx/specs/deep-interview-storybook-figma-component-audit.md:139`).

**Recommendation:** Option A. Freeze and complete the audit before mutating components; then remediate by shared foundations, API/semantics, component styles/behavior, stories/tests, and final re-audit.

## Canonical artifacts and schemas

### Four immutable identities

Create content-addressed objects under `.omx/audits/storybook-figma-components/objects/<sha256>.<ext>` and run manifests under `.omx/audits/storybook-figma-components/runs/<run-id>/`. Never overwrite an existing object or finalized run.

1. **DesignBaseline:** frozen offline Figma bundle plus `design-baseline.json`. It records file key, requested root node IDs, Figma `version`/`lastModified`, traversal policy and terminal cursor/completeness, raw node/export paths and hashes, normalized terminal-row count, canonical matrix hash, and bundle hash. If version metadata, complete traversal, or every raw export cannot be frozen, transition to `blocked-terminal` before implementation capture.
2. **ImplementationBaseline:** immutable current-worktree manifest plus copies/hashes of the frozen Storybook index, declarations/exports, consumer scan, and scoped sources. This is the only authority for the original conformity verdict.
3. **HarnessRun:** a read-only probe build keyed to both baseline hashes. Independent probe fixtures may reveal visual/interaction/API/a11y capability, but are not part of the frozen story index and can never make the original Storybook dimension pass.
4. **RepairRun:** a later authorized mutation/re-audit keyed to `designBaselineHash`, `implementationBaselineHash`, `baselineReportHash`, parent `harnessRunHash`, repaired manifest hash, and explicit execution authorization. Only repaired Storybook evidence may change the re-audit Storybook dimension.

### Executable Figma ingress and DesignBaseline contract

The audit CLI has two explicit providers and never treats an interactive Figma view, cached MCP response, or Storybook screenshot as a frozen design source:

- `figma-rest-v1` is the only online ingress provider. It calls the official Figma REST file/nodes and image-export endpoints with `FIGMA_ACCESS_TOKEN`, the fixed file key, and the ten requested root node IDs. The token is read from the environment and is never written to an artifact. The adapter records provider name/version, request URL without credentials, requested ID chunk, response status, retry count, response body hash, and export result for every call.
- `offline-bundle-v1` is the only DesignBaseline provider. It performs no network access and reads the completed directory passed by `--figma-bundle`. A DesignBaseline cannot be created directly from `figma-rest-v1`; online ingress must finish and seal the bundle first.

The receipt-authorized execution lane must implement and use these exact commands from the repository root:

```sh
audit_repo_root="$(git rev-parse --show-toplevel)"
audit_bundle="$audit_repo_root/.omx/audits/storybook-figma-components/ingress/<ingress-id>"
audit_run="$audit_repo_root/.omx/audits/storybook-figma-components/runs/<run-id>"

pnpm --dir "$audit_repo_root/packages/yakit-ui" audit:components -- figma-ingest \
  --repo-root "$audit_repo_root" \
  --provider figma-rest-v1 \
  --file-key QWct5XE0Bg0bNDQ93eYgEw \
  --root-node 37239:19076 --root-node 37266:21199 \
  --root-node 37143:15108 --root-node 41321:28404 \
  --root-node 37104:16988 --root-node 37120:9504 \
  --root-node 37120:16735 --root-node 37277:17059 \
  --root-node 37285:27849 --root-node 37322:26470 \
  --page-size 50 \
  --figma-bundle "$audit_bundle"

pnpm --dir "$audit_repo_root/packages/yakit-ui" audit:components -- design-baseline \
  --repo-root "$audit_repo_root" \
  --provider offline-bundle-v1 \
  --figma-bundle "$audit_bundle" \
  --run "$audit_run"
```

`figma-ingest` traverses breadth-first in stable Figma node-ID order. `--page-size 50` chunks the pending node-ID queue and image-export ID queue; each logical page is stored with monotonically increasing `pageNumber`, requested IDs, any provider cursor/token, response hash, and next queue state. If the upstream endpoint supplies no cursor, `providerCursor` is `null` and the recorded deterministic queue state is the pagination authority. Retries are bounded and preserve every failed attempt. A non-2xx response, missing requested node, unresolved export URL, export download error, media-type mismatch, size/hash failure, traversal gap, or expected/actual count mismatch makes the entire ingress incomplete.

The sealed `--figma-bundle` directory layout is:

```text
<figma-bundle>/
  figma-bundle-manifest.json
  requests/<page-number>-request.json
  responses/<page-number>-response.json
  nodes/<node-id>.json
  exports/<node-id>/<export-key>.<ext>
  export-metadata/<node-id>-<export-key>.json
  failures/<sequence>.json
```

`figma-bundle-manifest.json` contains `schemaVersion`, provider/version, file key/name, Figma `version` and `lastModified`, requested roots, page size, ordered page/cursor records, traversal policy and terminal cursor, expected/actual node/export/terminal counts, ordered raw file entries with media type/byte size/SHA-256, `complete`, and the canonical manifest/bundle hashes. Sealing recomputes every raw hash and writes `complete:true` only when all ten roots, traversal pages, nodes, and required exports are present. `design-baseline` independently validates the sealed manifest, recomputes every file and bundle hash, rejects symlinks/path escapes/unknown files, derives the real-terminal matrix, and records the source `version`/`lastModified`; it never fetches or repairs missing data.

Unavailable-design semantics are run-wide and phase-specific:

- Before a complete bundle is sealed and DesignBaseline is committed, any inaccessible requested node/export or incomplete traversal transitions the whole run to `blocked-terminal`; no ImplementationBaseline or row verdicts are produced.
- After DesignBaseline is committed, all audit/probe/repair re-audits use only its content-addressed offline bundle. Network refresh is forbidden within that run; changed Figma data requires a new ingress and new DesignBaseline.
- A missing, corrupt, hash-invalid, or incomplete bundle discovered while starting a new run is a terminal new-run failure (`blocked-terminal`), never a row-level `blocked` result and never a reason to reuse partial evidence from another run.

### Canonical serialization and identity rules

Every JSON document has `schemaVersion: 1`, `artifactType`, and `contentHash`. Canonical serialization is UTF-8 JSON with object keys recursively sorted by Unicode code point, array order preserved, numbers in shortest lossless decimal form, and no insignificant whitespace; `contentHash` is SHA-256 over the canonical object with `contentHash` omitted. Unknown fields or schema versions fail validation.

- `requirementId = "req-" + sha256(canonical({figmaFileKey, rootNodeId, terminalNodeId, rawVariantTuple})).slice(0,24)`. `rawVariantTuple` is a sorted list of exact Figma property-name/value pairs; normalized names never affect identity.
- `evidenceId = "ev-" + sha256(canonical({kind, authority, subject, inputHashes, method, result})).slice(0,24)`.
- `findingId = "finding-" + sha256(canonical({rootCauseKey, sortedRequirementIds, failedDimensions})).slice(0,24)`.
- Every artifact references parent content hashes, not mutable paths. Timestamps and operator notes live in non-canonical run metadata and do not alter verdict identity.

### Formal artifact schemas

- `figma-bundle-manifest.json`: file key/name/version/lastModified, requested roots, traversal pages/cursors and terminal cursor, inclusion/exclusion rules, ordered raw node/export entries with media/byte size/SHA-256, expected/actual counts, `complete`, and bundle hash.
- `design-baseline.json`: identity/version fields, requested roots, traversal inclusion/exclusion rules, pages/cursors, `traversalComplete`, expected/actual raw export and terminal counts, per-export media type/size/SHA-256, offline bundle hash, matrix hash.
- `implementation-baseline.json`: Git HEAD; scoped diff SHA-256; package/config/manifest/lockfile hashes; environment identity; and per path `{status: tracked-clean|tracked-modified|untracked, mode, byteSize, media: text|binary, sha256}`. Environment identity includes OS/arch, Node/pnpm, browser executable/version/hash, viewport, DPR, color profile, locale/theme, installed and loaded fonts (including `PingFang SC`), and manifest hash.
- `figma-matrix.json`: only real terminal Figma variants. Each row contains stable ID, raw tuple, normalized tuple, applicability by dimension, explicit exclusion/non-applicability reason, expected properties, source export IDs, and design baseline hash. The file records expected and actual terminal counts per root and `traversalComplete:true`.
- `comparison-policy-v1.json`: property-specific geometry/color/typography/raster/icon rules, normalization algorithms, diagnostic-only tolerances, environment prerequisites, policy version, and policy hash.
- `story-index-baseline.json`: frozen story IDs, source hashes, args/parameters/play-function presence, and implementation baseline hash. Probe fixtures are explicitly excluded.
- `harness-run.json`: both baseline hashes, policy hash, probe source manifest/hash, environment hash, selected row IDs, evidence graph hash, logs, and immutable completion/blocker state; it contains no Storybook-authority claim.
- `evidence-graph.json`: `evidenceNodes[]` plus `rowDimensions[]`. Each row has visual/interaction/api/accessibility/storybook results and references zero or more evidence IDs. Evidence nodes may serve many rows only through a declared behavioral-equivalence class and proof fields; terminal visual evidence remains row-specific.
- `findings.json`: shared root causes, linked row IDs/dimensions, expected/actual, severity, target boundaries, and evidence IDs.
- `report.json`/`report.md`: baseline identities, one deterministic row verdict, severity independent of verdict, row-to-finding links, and strict aggregate status.
- `remediation-backlog.json`: finding IDs, dependency order, target files, compatibility class, required tests, owner lane, and escalation conditions.
- `repair-run.json`: parent hashes, authorization reference, repaired implementation/story hashes, migration notes, and re-audit report hash.
- `state-log.json`: append-only ordered transition entries `{from,to,inputHashes,outputHash,reason,sequence}` plus graph version; the final hash is referenced by each terminal run.

### Evidence authority by dimension

| Dimension | Authority | Non-authoritative evidence |
| --- | --- | --- |
| Visual/taxonomy | Frozen Figma raw nodes/exports and real terminal variant properties from `DesignBaseline` | Story names, inferred Cartesian products, probe markup |
| Interaction | Explicit Figma prototype transition when present; otherwise frozen existing public behavior/contracts plus an approved requirement decision | Static Figma frames or a static dropdown trigger alone; `SearchInput`'s trigger at `packages/yakit-ui/src/components/SearchInput/SearchInput.tsx:84` does not prove an open/change contract |
| Public API | Frozen declarations, package/barrel exports, supported examples, and repository consumer scan from `ImplementationBaseline` | Private classes, deep imports, proposed repair props |
| Accessibility | Versioned adopted semantic rule set in the run (native HTML semantics first, accessible name, keyboard, focus, disabled/state exposure rules) applied to runtime DOM | Visual appearance alone or ARIA added without matching behavior |
| Storybook | Frozen original story index for baseline; repaired frozen story index for re-audit | Probe harness fixtures, controls-only hypothetical permutations |

### Evidence graph and equivalence classes

Visual evidence is unique to every terminal row. Interaction/API/accessibility evidence may be reused only when an `equivalenceClass` names the invariant behavior, lists covered row IDs, cites why variant axes do not affect it, and has at least one representative runtime/API proof for every distinct code branch. Color-only variants may share keyboard evidence; different native element, disabled, loading, dropdown, closable, control orientation, or group-position branches may not share by default. Storybook evidence is row-specific because demonstrability is part of each row.

### Verdict truth table and strict aggregate

Dimension results are `pass | partial | fail | blocked | not-applicable`; `not-applicable` requires a Figma-derived exclusion reason. Aggregate in this fixed order:

| Row dimensions | Row verdict |
| --- | --- |
| Every applicable dimension `pass` | `conforming` |
| Any `fail` (even if another dimension is `blocked`) | `nonconforming` |
| No `fail`, at least one `blocked` | `blocked` |
| No `fail`/`blocked`, at least one `partial` | `partially-conforming` |
| All dimensions `not-applicable` or missing | schema error; no verdict |

`partial` means a capability exists and every mandatory subcheck is observable, but one or more row-specific secondary details are incomplete/mismatched; missing story, missing public capability, inaccessible required operation, or materially wrong behavior is `fail`. Severity never selects or changes a verdict. `strictConformance=true` only when every required row is `conforming` and counts of partial/nonconforming/blocked are all zero. Release thresholds/waivers are a separate downstream policy and cannot change strict conformance.

### Comparison policy v1

Persist `comparison-policy-v1.json` and its hash in both baselines:

- **Geometry:** compare explicit Figma numeric values to computed CSS/layout values in CSS pixels, exact to 0.01 CSS px after deterministic decimal normalization. Screenshot edge displacement up to one device pixel may diagnose raster rounding but cannot override a computed geometry mismatch.
- **Color:** resolve Figma paint and CSS computed color into non-premultiplied sRGB RGBA8; require exact channel equality after explicit opacity composition against the pinned background. Gradients retain ordered stops/positions.
- **Typography/font:** primary family, loaded font identity/hash where distributable, size, weight, line height, and letter spacing must match normalized design values. `document.fonts.check` must pass; unavailable expected `PingFang SC` makes affected visual typography `blocked`, not a fallback-font pass.
- **Raster:** same browser/hash, DPR, color profile, viewport, background, fonts, and animation state. Store reference/actual/diff and changed-pixel bounds. Raster diff is corroborating evidence, not a tolerance-based verdict; any unexplained diff prevents visual `pass` until mapped to a property or accepted as a documented renderer artifact under this versioned policy.
- **Icons/assets:** compare rendered bounds, placement, color, and visual diff. Source hash inequality alone is not a failure when rendering is identical.

A comparison-policy change requires a new version and full re-audit; it cannot reinterpret an existing report in place.

### State transitions

Allowed graph: `initialized → design-frozen | blocked-terminal`; `design-frozen → implementation-frozen | blocked-terminal`; `implementation-frozen → matrix-complete | blocked-terminal`; `matrix-complete → baseline-audited | blocked-terminal`; `baseline-audited → waiting-for-repair-authorization | closed-audit`; `waiting-for-repair-authorization → repair-authorized`; `repair-authorized → repaired | blocked-terminal`; `repaired → reaudited | blocked-terminal`; `reaudited → closed`. Any unspecified transition fails. Probe runs are child records of `implementation-frozen` and cannot transition or mutate baseline state.

## Execution plan

### 1. Freeze DesignBaseline and enumerate real terminal variants

- Run the specified `figma-ingest` command, require its sealed `complete:true` bundle, then run the specified offline-only `design-baseline` command. Freeze file version/lastModified, complete traversal, raw nodes/exports, hashes, offline bundle, and policy hash before inspecting conformance. Stop the whole run terminally if any requested node/export is inaccessible or any source cannot be frozen.
- Enumerate only actual terminal Figma component/variant nodes; never synthesize a blind Cartesian product. Preserve raw tuples, add normalized tuples, record expected/actual counts, and give every excluded/non-applicable combination a source-backed reason.

### 2. Freeze ImplementationBaseline and original Storybook truth

- Record the expanded file/environment manifest, scoped diff, declarations, package/barrel exports, repository consumer scan, configuration/lockfiles, and frozen story index before adding probes or repairs. Include the package export surface because Tag is not exported from `packages/yakit-ui/src/components/index.tsx:1`.
- Preserve the current incompleteness: existing Input/Search/Button stories remain failing baseline evidence where rows are absent. Copy or hash declarations and scan consumers before any API design.

### 3. Run an independent read-only HarnessRun

- Build an isolated probe renderer keyed by `requirementId` without registering probe fixtures in the frozen Storybook index. It may expose runtime capabilities and generate visual/interaction/a11y evidence but cannot repair the baseline Storybook dimension.
- Pin light theme and one locale for Figma conformance captures while running dark-theme smoke regression separately; Storybook currently exposes both theme and locale globally (`packages/yakit-ui/.storybook/preview.tsx:12`).
- Pin viewport, DPR, browser/OS/color profile, actual loaded font identity, animation/transition suppression, background, and interaction timing. Apply comparison policy v1 and record computed styles/bounds/screenshots.

### 4. Run five-dimensional baseline audit and classify findings

- Visual: compare dimensions, layout, typography, colors, border/radius/focus, icons, and state appearance.
- Interaction: exercise hover, focus-visible, pressed, disabled/loading, close/search/dropdown, min/max, increment/decrement, groups, Enter/Space/Tab, and design-implied transitions.
- API: prove a supported prop expression for every row; consumer CSS/private classes/bespoke markup fail this dimension.
- Accessibility: verify native semantics, accessible names, tab order, keyboard operation, focus visibility, disabled/busy/state exposure, and icon decoration.
- Storybook: use only `story-index-baseline.json`; probe fixtures never satisfy this dimension.
- Apply the severity rubric verbatim from `.omx/specs/deep-interview-storybook-figma-component-audit.md:146` and group findings by both component and shared root cause.

### 5. Produce and review the remediation backlog

- Order work as: freeze regression behavior/declarations/consumers; additive API and semantic contracts; component-local behavior/style; ButtonGroup only after Button stabilization; shared-token changes only after evidence proves a shared root cause; repaired Storybook coverage; full re-audit. Do not invent a shared Input/Search primitive merely for parallel work.
- Flag any proposal that removes/changes existing props, adds dependencies, touches unrelated components, or resolves conflicting Figma meanings; these cross the user decision boundary (`.omx/specs/deep-interview-storybook-figma-component-audit.md:83`).
- Assign each finding a test-first repair contract from the companion test spec and preserve the baseline audit as immutable evidence.

### 6. Future RepairRun and closure re-audit

- Lock current supported behavior with targeted tests before each fix. Make additive changes inside the five component families and narrowly required shared theme/export surfaces.
- Expand repaired Storybook to the full matrix with interaction tests and deterministic capture state; retain the original frozen Storybook report for lineage.
- Re-run the original frozen matrix against the repaired build; close a finding only when all five dimensions pass. Run type/build, lint, Storybook build, interaction/accessibility checks, and visual recapture.

## Acceptance criteria

1. All ten supplied Figma nodes appear in `figma-matrix.json`, and every extracted terminal variant/state has a stable `requirementId` and provenance.
2. The matrix includes every real terminal variant and at least every minimum row family listed in `.omx/specs/deep-interview-storybook-figma-component-audit.md:95`; raw/normalized tuples, source-backed exclusions, expected/actual terminal counts, and traversal completeness are machine-validated.
3. Every matrix row has exactly one verdict and five explicit dimension results; zero rows are silently omitted.
4. Every baseline `conforming` row has a supported frozen public-prop expression, frozen original Storybook story ID, row-specific visual evidence, executed interaction result, and accessibility result; probe-only stories cannot satisfy it.
5. Any missing story, API capability, behavior, or accessible operation is `nonconforming`; it is not `blocked` or omitted.
6. Every finding cites a Figma node URL, exact repository file:line evidence, expected/actual values, severity, and reproducible steps.
7. Visual captures apply hashed comparison policy v1 with pinned light theme, locale, browser/OS, DPR, viewport, color profile, background, loaded font identities, and disabled animations; rerunning unchanged rows produces identical normalized properties and no unexplained raster diff.
8. Input covers S/M/L, filled/unfilled, normal/error, four states, icons/addons/area-text combinations.
9. SearchInput covers four sizes, four families, filled states, four interactions, and all icon placements.
10. InputNumber covers vertical S/M/L/Huge, horizontal S/M/L, four states, min/max unavailable controls, click and keyboard paths.
11. Tag covers risk/generic/full-color families, 18/20/22 sizes, content forms, close behavior, border and corner treatments, and all Figma colors.
12. Button covers nine types, error/non-error, four sizes, default/hover/pressed/disabled/focus/loading, icon placements/icon-only/shapes, and 2–5-member groups at every required size/corner treatment.
13. The remediation backlog includes every nonconforming/partial/blocked row, follows the required behavior→API/semantics→component→proven-token→repaired-story→re-audit order, identifies target files/tests, and contains no unrelated cleanup.
14. No new dependency or breaking/removal API change is made without explicit escalation; additive aliases/props preserve existing behavior.
15. Closure requires targeted component/audit tests, source lint, explicit story/script lint, explicit audit/story typecheck, `build:lib`, Storybook build, interaction/accessibility execution, and full visual re-audit. `strictConformance=true` requires zero partial/nonconforming/blocked rows regardless of severity or release waiver.

## Risks and mitigations

- **Figma matrix explosion:** normalize variant axes and generate deterministic fixtures; validate terminal-row counts before capture.
- **Pseudo-state capture drift:** use browser actions and explicit focus/keyboard paths; only use forced pseudo-state where real interaction cannot persist, and label it.
- **Dirty-worktree ambiguity:** hash all scoped inputs and never reset/revert existing changes.
- **False visual failures from environment:** pin render parameters, wait for fonts, suppress animations, capture computed geometry/styles, and retain raw screenshots.
- **API overfitting to design labels:** map design properties to semantic additive props; retain legacy aliases when coherent.
- **Shared token churn:** prove a cross-component root cause before changing `packages/yakit-ui/src/styles/theme.ts:3` or component token interfaces.
- **Accessibility masked by visual correctness:** keep accessibility as an independent required dimension; screenshots can never satisfy it.
- **Contradictory Figma nodes:** mark affected rows blocked with both sources and escalate rather than selecting one silently.

## ADR draft

### Decision

Adopt a frozen, matrix-first, five-dimensional audit followed by a separately tracked dependency-ordered remediation phase.

### Drivers

- Complete Figma coverage is binding.
- Evidence must be reproducible against a dirty working tree.
- Shared components require backwards-compatible repair sequencing.

### Alternatives considered

- Component-by-component audit-and-fix: rejected for the initial pass because it moves the comparison target and hides cross-component decisions.
- Storybook screenshot sweep only: rejected because it cannot establish full matrix, API, behavior, or accessibility conformance.

### Consequences

- More up-front matrix/evidence work, but every verdict is traceable and remediation can be safely parallelized after shared decisions settle.
- Existing tooling is sufficient; no dependency is required.
- Final conformance is stricter than visual similarity and may initially classify many rows as nonconforming.

### Follow-ups

- After remediation, optionally promote the deterministic matrix capture and audit schema into a public-safe visual regression contract; this remains opt-in documentation scope.

## Iteration 1 changelog

- Separated immutable DesignBaseline, ImplementationBaseline, read-only HarnessRun, and lineage-bound RepairRun; probe stories can no longer improve the baseline Storybook verdict.
- Added offline/versioned Figma freeze, real-terminal traversal/count rules, formal content-addressed schemas/IDs/state machine, expanded worktree/environment manifest, evidence graph/equivalence classes, independent dimension authorities, comparison policy v1, deterministic verdict truth table, and strict-conformance aggregate.
- Reordered repairs to freeze contracts first, delay shared-token changes until proven, stabilize Button before ButtonGroup, and added explicit story/script lint and typecheck gates in the companion test specification.

## Iteration 2 changelog

- Added the executable `figma-rest-v1` ingress and offline-only `offline-bundle-v1` DesignBaseline contract, including exact commands, root IDs, deterministic page/chunk traversal, sealed bundle layout, exports, version/lastModified, and raw hash validation.
- Unified unavailable-design behavior: any pre-freeze source failure blocks the whole run terminally; committed audits remain offline-only; corrupt or incomplete input blocks a new run before row verdicts.
- Required explicit absolute repository-root/run paths so `pnpm --dir packages/yakit-ui` cannot redirect `.omx/audits` artifacts into the package directory; the companion test specification verifies this from multiple working directories.

## Future execution staffing and handoff

Available agent types relevant to a receipt-authorized execution path: `explore` (repo mapping), `designer`/`vision` (Figma and screenshot comparison), `executor` (component fixes), `test-engineer` (interaction/a11y/visual harness), `code-reviewer` (API/regression review), and `verifier` (closure evidence). Suggested reasoning: low for inventory/capture bookkeeping, medium for bounded component implementation and test construction, high for design/API/accessibility review and final verification.

- **Default durable lane:** `$ultragoal create-goals --brief-file .omx/plans/prd-storybook-figma-component-audit.md`, with this PRD and `test-spec-storybook-figma-component-audit.md` as binding artifacts.
- **Parallel delivery when authorized:** use Ultragoal as the leader-owned ledger and launch `$team` only after the baseline matrix and shared API/token decisions are frozen. Recommended lanes: (1) Input + SearchInput, (2) InputNumber, (3) Tag, (4) Button/ButtonGroup, with a leader-owned shared-token/export lane. Because this surface is outside tmux, the concrete `omx team` launch belongs in an attached OMX CLI session.
- **Verification path:** test-engineer owns reusable harness and interaction/a11y checks; each component lane returns row IDs plus evidence; code-reviewer checks compatibility/shared-token consistency; verifier reruns the full frozen matrix and build/lint/Storybook gates before Ultragoal closes.
- **Ralph fallback:** use `$ralph` only if the user explicitly wants a single persistent owner to execute the already-approved backlog sequentially. It is not the default because Ultragoal provides the durable goal ledger and Team supports safe parallel component lanes.
- `$autoresearch-goal` and `$performance-goal` are not appropriate: this is a bounded product conformity audit/remediation, not an open research or performance optimization mission.

## Consensus handoff state

This document is the Planner draft for the local Architect → Critic review lifecycle. Planning artifacts alone do not authorize source edits. Until the required official host consensus receipt is verifiable, preserve `ralplan_consensus_gate.complete:false` with `blocked_reason:"documented_host_consensus_receipt_unavailable"` and treat any requested future lane as non-executing guidance.
