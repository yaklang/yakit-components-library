# Storybook / Figma Component Audit Context

## Task statement

Review the current Storybook implementations of Input, InputNumber, SearchInput, Tag, and Button against the user-provided Figma design nodes.

## Desired outcome

Produce an evidence-backed conformity assessment that identifies matching behavior and visual/design gaps for each component.

## Stated solution

Use the current Storybook stories and component source as the implementation evidence, and the supplied Figma nodes as the design source of truth.

## Probable intent hypothesis

The user likely wants to know whether these shared components are ready to be treated as design-system-compliant before further adoption or cleanup.

## Known facts / evidence

- This is a brownfield repository with existing component source and Storybook stories under `packages/yakit-ui`.
- Storybook 8.6.14 uses Vite and scans `.storybook/stories/*.stories.tsx`.
- Stories exist for all five requested component families.
- The repository has no committed Playwright visual baseline, pixel-diff suite, or configured Chromatic CI project; visual evidence must be collected from a running Storybook or through bounded manual/browser screenshots.
- Figma access succeeded for all supplied nodes.
- Figma Input defines S/M/L, unfilled/filled, primary/hover/focus/disable, error/no-error, and multiple icon/addon arrangements.
- Figma Search defines S/M/L/Huge, box/main-background/dropdown/icon-only families, filled/unfilled, and primary/hover/focus/disable states.
- Figma InputNumber defines vertical controls for S/M/L/Huge and horizontal controls for S/M/L, across primary/hover/focus/disable states.
- Figma Tag nodes cover risk-level tags plus a broad generic tag matrix: sizes, text/dot/avatar/icon forms, closable/non-closable, bordered/unbordered, small/full corner, and multiple colors.
- Figma Button nodes cover nine button types, error variants, S/M/L/Huge, default/hover/pressed/disable states, icon arrangements, icon-only/full-corner forms, and button groups.
- Current Tag public props declare `icon`, `closeIcon`, and `onClose`, but the implementation currently renders only `children`; this is a concrete candidate gap to verify visually and behaviorally.
- Current Input exposes only S/M/L and error/prefix/suffix; current SearchInput and InputNumber expose four sizes; Button exposes nine types, four sizes, round/circle, error, loading, and icon placement.
- The working tree already contains user changes and untracked component/story files; audit evidence must describe the current working tree, not a stable commit.

## Constraints

- Deep Interview is requirements-only; no component implementation changes occur during this mode.
- Preserve existing user changes.
- Use Figma nodes as external design evidence and current working tree as implementation evidence.
- Initial context is prompt-safe; no summary gate is needed.

## Unknowns / open questions

- Whether conformity means only the currently authored Storybook examples or the entire Figma variant/state matrix.
- Whether missing variants/states count as failures or are explicitly out of scope.
- Required visual tolerance and whether dark theme is part of acceptance despite the supplied Figma frames appearing light-theme oriented.
- Desired deliverable after review: findings only, remediation plan, or subsequent fixes through another workflow.

## Decision-boundary unknowns

- Whether the auditor may classify absent API/state coverage as a nonconformity without user confirmation.
- Whether minor token/spacing differences should be ranked as failures or observations.
- Whether to include interaction, accessibility, and API-semantic mismatches in addition to visual appearance.

## Likely codebase touchpoints

- `packages/yakit-ui/src/components/Input/**`
- `packages/yakit-ui/src/components/InputNumber/**`
- `packages/yakit-ui/src/components/SearchInput/**`
- `packages/yakit-ui/src/components/Tag/**`
- `packages/yakit-ui/src/components/Button/**`
- `packages/yakit-ui/.storybook/stories/{Input,InputNumber,SearchInput,Tag,Button}.stories.tsx`
- `packages/yakit-ui/.storybook/{main,preview}.tsx?`
- `packages/yakit-ui/src/styles/theme.ts`

## Relevant repo docs / rules / context inspected

- User-provided top-level `AGENTS.md` instructions in the active prompt.
- Repository `README.md`.
- `packages/yakit-ui/README.md`.
- Existing `.omx/context`, `.omx/specs`, and `.omx/plans` listings; no prior spec for this five-component audit was found.
- Storybook configuration and package scripts.

## Terminology / doc-code conflicts

- The user calls the component `inputserach`; repository terminology is `SearchInput` and Figma labels the family as `Search`.
- Figma uses S/M/L/Huge and design type labels; repository APIs use `small`/`medium`/`large`/`huge` and normalized variant names.
- `TagProps.bordered` is implemented through a class named `-bordered` when `bordered` is false, suggesting an internal naming inversion; the visual behavior must be treated as evidence rather than inferred from the class name.

## Prompt-safe initial-context summary status

`not_needed`

## Interview decisions

- Round 1 `[from-user]`: Use the complete Figma variant/state matrix as the strict acceptance baseline. Any missing Storybook case, component variant, or state is classified as nonconforming rather than ignored as out of scope.
- Round 2 `[from-user]`: Strict conformity includes visual fidelity, interaction behavior, public API coverage, accessibility, and Storybook coverage of the full state/variant matrix.
- Pressure pass: The original assumption that “conformity” might mean visual matching only was rejected; the audit is design-system conformity across appearance, behavior, API, accessibility, and demonstrability.
