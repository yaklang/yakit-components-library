# Adjustable stroke review evidence

This directory contains post-capture review evidence and never replaces the immutable
`reference/stroke-runtime-prechange-v1/manifest.json` or atlas.

`historical-capture.mjs.txt` preserves the exact script bytes used to capture the baseline.
Its SHA-256 is `44f6c06e3289fdae24cb478800a443df2aad30e98cc2d3e1acaf08081ab57743`,
matching the baseline manifest. The later maintained script has been retired from the
executable scripts directory and preserved separately in
[the icon history archive](../../../../../../docs/icon-history/README.md).
The two versions have different expected icon counts and must not replace each other.

The historical source path in `bug-geometry-review.json` is intentionally unchanged.
For the current source file, node identity and raw SVG hash, see
[the source path mapping](../../../../../../docs/icon-history/README.md#已移除的来源文件怎么查).
