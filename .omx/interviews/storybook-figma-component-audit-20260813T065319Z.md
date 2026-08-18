# Deep Interview Transcript — Storybook / Figma Component Audit

## Metadata

- Profile: Standard
- Context: Brownfield
- Rounds: 3
- Final ambiguity: 6%
- Threshold: 20%
- Context snapshot: `.omx/context/storybook-figma-component-audit-20260813T064340Z.md`
- Outcome: Ready for planning, audit execution, and subsequent remediation

## Initial request

Strictly review the current Storybook implementations of Input, InputNumber, SearchInput, Tag, and Button against the supplied Figma design nodes.

## Round 1 — Scope and missing variants

**Question:** Should the audit cover the complete Figma matrix, treating missing variants as failures, or only compare currently authored Storybook examples?

**Answer `[from-user]`:** Strictly audit the complete Figma matrix; missing variants are nonconforming.

## Round 2 — Assumption pressure pass

**Question:** Does strict conformity include interaction behavior, public API, accessibility, and Storybook state coverage, or only visual fidelity?

**Answer `[from-user]`:** Include interaction behavior, public API, accessibility, and Storybook state coverage.

**Pressure finding:** The initial narrow interpretation of “matches Figma” as visual similarity was rejected. Conformity means the component can represent and demonstrate the complete design-system contract.

## Round 3 — Non-goals and decision boundary

**Question:** Choose report-only, report plus remediation plan, or audit followed by downstream implementation.

**Answer `[from-user]`:** C — audit, then hand off to a downstream workflow to implement fixes.

## Crystallized decisions

- The Figma nodes are the source of truth for required component variants and visual states.
- Missing public API support, missing Storybook demonstrations, inaccessible or incorrect interactions, and visual mismatches all count as nonconforming.
- The audit must classify findings with evidence and severity.
- The audit itself must not silently redesign the Figma system.
- After the findings and remediation plan are validated, implementation may repair the five component families and their stories.
- Unrelated components and unrelated existing working-tree changes remain out of scope.

## Handoff

Recommended next workflow: `$ralplan`, because the work requires a cross-component audit matrix, a test/visual-evidence strategy, and a safe remediation sequence before implementation.

