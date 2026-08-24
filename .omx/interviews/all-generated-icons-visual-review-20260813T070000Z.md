# Deep Interview Transcript Summary: All Generated Icons Visual Review

Profile: standard; context: brownfield; rounds: 7; final ambiguity: 0.14; threshold: 0.20.

## Decisions

1. Figma's corresponding visual render is the only correctness oracle.
2. Scope is all 636 icons generated in the yesterday batch.
3. Deliver per-icon evidence: Figma render, local render, pixel-diff image, and a reason for every failure.
4. Render with identical engine, size, DPR, background, and export parameters; zero pixel tolerance. Any differing pixel fails.
5. Missing Figma icons, missing local icons, and local icons without a Figma mapping are failures.
6. Automation may map, render, diff, and initially classify; humans decide the repair method for failures.
7. Out of scope: Figma edits, automatic redrawing/repair, naming-only or semantic-only errors, and files outside yesterday's batch.

## Pressure pass

The initial visual-correctness request was pressure-tested against renderer variability. The user explicitly rejected tolerance and selected deterministic same-parameter rendering with exact pixel equality. The completeness boundary was then tested with missing and extra mappings; the user chose to fail both classes.
