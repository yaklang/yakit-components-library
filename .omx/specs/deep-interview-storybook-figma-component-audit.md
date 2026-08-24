# Execution Specification — Strict Storybook / Figma Component Audit

## Metadata

- Source workflow: Deep Interview
- Profile: Standard
- Context type: Brownfield
- Interview rounds: 3
- Final ambiguity: 6%
- Threshold: 20%
- Status: Execution-ready for consensus planning
- Context snapshot: `.omx/context/storybook-figma-component-audit-20260813T064340Z.md`
- Transcript: `.omx/interviews/storybook-figma-component-audit-20260813T065319Z.md`

## Intent

Determine whether the existing shared Input, InputNumber, SearchInput, Tag, and Button components are genuinely compliant with the Yakit Figma design system, rather than merely resembling a subset of its examples. The resulting findings must be reliable enough to drive remediation and prevent incomplete components from being treated as production-ready design-system primitives.

## Desired outcome

Produce a strict, evidence-backed conformity verdict for each component and every required Figma variant/state, followed by an actionable remediation plan and downstream implementation of confirmed gaps.

## Figma sources

### Tag

- `https://www.figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/Yakit-Design-System-V1.0?node-id=37239-19076&m=dev`
- `https://www.figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/Yakit-Design-System-V1.0?node-id=37266-21199&m=dev`
- `https://www.figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/Yakit-Design-System-V1.0?node-id=37143-15108&m=dev`
- `https://www.figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/Yakit-Design-System-V1.0?node-id=41321-28404&m=dev`

### Button

- `https://www.figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/Yakit-Design-System-V1.0?node-id=37104-16988&m=dev`
- `https://www.figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/Yakit-Design-System-V1.0?node-id=37120-9504&m=dev`
- `https://www.figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/Yakit-Design-System-V1.0?node-id=37120-16735&m=dev`

### Input

- `https://www.figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/Yakit-Design-System-V1.0?node-id=37277-17059&m=dev`

### SearchInput

- `https://www.figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/Yakit-Design-System-V1.0?node-id=37285-27849&m=dev`

### InputNumber

- `https://www.figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/Yakit-Design-System-V1.0?node-id=37322-26470&m=dev`

## In scope

- Current working-tree implementations and Storybook stories for Input, InputNumber, SearchInput, Tag, and Button.
- The complete variant and state matrix represented by the supplied Figma nodes, not only existing stories.
- Visual fidelity: dimensions, spacing, padding, typography, colors, borders, radii, shadows/focus rings, icon sizing/placement, backgrounds, alignment, and disabled/error appearances.
- Interaction behavior: hover, focus, pressed/active, disabled, loading, close, search, increment/decrement, dropdown, group behavior, keyboard behavior, and any design-implied state transitions.
- Public API coverage: whether component props can express every required design variant without consumers depending on private class names or bespoke markup.
- Accessibility: semantic element choice, accessible names, keyboard reachability/operation, visible focus, disabled semantics, state exposure, and appropriate roles/attributes.
- Storybook completeness: every required family, size, visual state, interaction state, and relevant combination must be demonstrable and reproducible.
- Remediation planning and subsequent implementation of confirmed nonconformities.
- Shared tokens or utilities may be changed only where necessary to make the five scoped components conform.

## Out of scope / non-goals

- Redesigning or editing the Figma source.
- Auditing unrelated component families.
- Refactoring unrelated code or cleaning unrelated working-tree changes.
- Treating a missing Figma requirement as optional merely because no Storybook story currently demonstrates it.
- Inventing dark-theme requirements that are not represented by the supplied Figma nodes; existing dark-theme behavior may be regression-checked but is not a Figma conformity criterion unless the design source supplies it.
- Introducing new dependencies unless separately approved.
- Making breaking public API changes without explicit escalation; prefer additive, backwards-compatible props and behavior.

## Decision boundaries

The execution workflow may independently:

- Build the canonical Figma-to-code variant matrix.
- Classify findings as critical, high, medium, or low based on missing capability, behavioral/accessibility failure, visual severity, and consumer impact.
- Mark absent variants or states as nonconforming.
- Add or update Storybook stories, tests, component styles, assets, and additive public props needed for conformance.
- Reuse existing tokens, components, icons, and utilities.
- Choose focused validation methods and remediation ordering.

The workflow must stop and request direction before:

- Breaking or removing existing public props or supported behavior.
- Changing components outside the five families except for narrowly required shared infrastructure.
- Adding dependencies.
- Resolving an actual contradiction between separate Figma nodes where code cannot support both meanings coherently.
- Performing external publication, release, or production deployment.

## Canonical audit matrix

The audit must derive the exact matrix from Figma and record one verdict per row. At minimum, the matrix must cover:

### Input

- Sizes S, M, L.
- Unfilled and filled presentations.
- Primary, hover, focus, and disabled states.
- Error and non-error states where defined.
- Default, front icon, back icon, both icons, front dropdown/addon, back dropdown/addon, and area-text arrangements shown by Figma.

### SearchInput

- Sizes S-20, M-24, L-28, Huge-32.
- Box, main-background action, dropdown, and icon-only families.
- Filled/unfilled combinations where shown.
- Primary, hover, focus, and disabled states.
- Front/back/both/only icon positioning where defined.

### InputNumber

- Vertical controls for S, M, L, and Huge.
- Horizontal controls for S, M, and L.
- Primary, hover, focus, and disabled states.
- Minimum/maximum unavailable-control behavior and corresponding icon appearance.

### Tag

- Risk-level tag sets in the supplied nodes.
- Generic and full-color tag sets.
- All Figma sizes, including sm-18, md-20, and lg-22 where shown.
- Text, dot, avatar, icon+text, and icon-only content types.
- Closable and non-closable variants.
- Bordered/unbordered and small/full-corner variants.
- Every color family represented in the supplied nodes.

### Button

- Primary, Secondary 01/02, Outline 01/02, Text 01/02, Link, and Link 2 types.
- Error and non-error variants.
- Small, Medium, Large, and Huge sizes.
- Default, hover, pressed/active, disabled, focus-visible, and loading behavior where applicable.
- No-icon, front-icon, back-icon, icon-only, default-corner, and full-corner/circle variants.
- Button groups with 2–5 buttons, all Figma sizes, and both corner treatments.

## Audit verdict rules

Each matrix row receives exactly one verdict:

- **Conforming:** visual, behavioral, API, accessibility, and Storybook evidence all satisfy the requirement.
- **Partially conforming:** the core capability exists but at least one evidence dimension is incomplete or materially mismatched.
- **Nonconforming:** the capability is missing, cannot be expressed by the public API, behaves incorrectly, is inaccessible, or substantially differs visually.
- **Blocked:** evidence cannot be collected; the blocker and next-best evidence must be recorded. “Not currently in Storybook” is nonconforming, not blocked.

Severity guidance:

- **Critical:** unusable or unsafe public behavior, severe accessibility failure, or a shared API defect affecting broad consumption.
- **High:** missing Figma family/variant/state, incorrect interaction semantics, or major visual divergence.
- **Medium:** localized visual/token mismatch, incomplete story coverage for an otherwise supported state, or recoverable accessibility/API gap.
- **Low:** small cosmetic deviation with negligible functional impact.

## Testable acceptance criteria

1. A traceable matrix maps every supplied Figma variant/state to component source, public props, Storybook evidence, and a verdict.
2. No missing Figma variant is silently omitted; missing support is explicitly marked nonconforming.
3. Visual review uses reproducible Storybook screenshots or equivalent browser evidence at the Figma-defined dimensions/states where practical.
4. Interactive states are exercised rather than inferred only from static source.
5. Public API review proves whether consumers can express each required variant through supported props.
6. Accessibility review covers semantic HTML, accessible names, keyboard operation, focus visibility, disabled behavior, and state attributes appropriate to each component.
7. Findings cite exact repository files and Figma nodes and include expected versus actual behavior.
8. Findings are severity-ranked and grouped by component and by cross-cutting root cause.
9. A remediation plan orders fixes to minimize shared-token/API churn and protects existing behavior with targeted regression tests.
10. Subsequent fixes preserve existing user changes and avoid unrelated rewrites.
11. After remediation, targeted tests plus typecheck, lint, Storybook build, and reproducible visual/interaction verification pass, or any unavailable check is reported explicitly.

## Technical context findings

- Storybook stories exist for all five families under `packages/yakit-ui/.storybook/stories`.
- Storybook uses Vite and supports light/dark plus zh/en global controls.
- No committed Playwright screenshot suite, pixel-diff baseline, or configured Chromatic CI project currently proves Figma conformity.
- The current Tag public API declares `icon`, `closeIcon`, and `onClose`, while the inspected implementation renders only `children`; this is a high-confidence audit candidate, not yet a final verdict until runtime evidence is collected.
- Input currently exposes S/M/L, prefix/suffix, and error; Figma contains additional filled and addon arrangements that require strict mapping.
- SearchInput and InputNumber expose four sizes and multiple families, but Storybook coverage is smaller than their Figma matrices.
- Button exposes nine types, four sizes, shapes, error, loading, and icon placement; Figma also requires exhaustive state and button-group coverage.
- The working tree contains existing modified and untracked files. All audit and remediation work must preserve and distinguish those changes.

## Evidence versus inference

- `[from-code][auto-confirmed]`: file locations, props, story names, package scripts, and absence of a committed visual-baseline suite.
- `[from-figma][auto-confirmed]`: component family labels, variant names, sizes, and state matrices returned for the supplied nodes.
- `[from-code]`: likely missing or mismatched behavior identified from static inspection; these become findings only after runtime/Storybook verification where applicable.
- `[from-user]`: complete-matrix strictness, inclusion of interaction/API/accessibility/Storybook coverage, and authorization to hand off confirmed gaps for remediation.

## Assumptions exposed and resolved

- **Assumption:** “Matches Figma” might mean visual similarity only. **Resolution:** Rejected; it includes behavior, public API, accessibility, and Storybook coverage.
- **Assumption:** Existing Storybook stories define the audit boundary. **Resolution:** Rejected; the full supplied Figma matrix defines the boundary.
- **Assumption:** Missing variants could be listed as future work without failing conformance. **Resolution:** Rejected; missing variants are nonconforming.

## Pressure-pass finding

Round 2 revisited the Round 1 strictness decision. The user expanded it from complete visual coverage to complete design-system contract coverage, materially changing the audit method and acceptance criteria.

## Docs / terminology ledger

- Inspected repository `README.md` and `packages/yakit-ui/README.md`; neither defines a stronger visual acceptance contract.
- Inspected Storybook configuration, component stories, component sources, and existing OMX context/spec listings.
- Canonical repository component name is `SearchInput`; user wording `inputserach` is normalized to `SearchInput`.
- Figma S/M/L/Huge map to repository `small`/`medium`/`large`/`huge`, subject to exact dimension verification.
- Figma labels such as Secondary 01 and Link 2 map to repository normalized API values only after behavior/style verification.

## Scenario pressure findings

- A Figma variant absent from Storybook but expressible through props is still nonconforming because demonstrability is part of acceptance.
- A visually correct component with inaccessible icon-only controls is nonconforming.
- A visually correct custom composition that cannot be produced through the public component API is nonconforming.
- A complete story whose runtime styling differs from Figma is nonconforming even if prop names align.

## Optional durable documentation recommendation

After remediation, consider adding a public-safe component-to-Figma mapping and a visual regression workflow. This is a recommendation only and is not automatically part of the current documentation scope.

## Handoff contract

- Recommended next workflow: `$ralplan`
- Input artifact: `.omx/specs/deep-interview-storybook-figma-component-audit.md`
- Invocation: `$plan --consensus --direct .omx/specs/deep-interview-storybook-figma-component-audit.md`
- Skipped stages: requirement discovery, ambiguity clarification, and scope-boundary elicitation.
- Required planner output: audit execution plan, canonical comparison matrix format, evidence collection approach, severity rubric application, remediation sequencing, and test/visual verification specification.
- After plan approval: use `$ultragoal` as the durable implementation tracker; use `$team` only if parallel component lanes materially improve throughput.

