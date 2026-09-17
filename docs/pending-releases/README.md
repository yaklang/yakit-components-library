# Deferred Yakit UI icon changes

The icon changes prepared after `@yakit-libs/yakit-ui-icons@0.2.4` are released
independently in `@yakit-libs/yakit-ui-icons@0.2.5` and `0.2.6`. The latter updates
Sparkles and LightBulb and adds six Figma Outline icons. `@yakit-libs/yakit-ui`
stays at `0.2.3` on npm. Its current source contains the same icon improvements,
but its rebuilt output is an impact probe and is not a release artifact.

The two documents in this directory preserve the original UI Changeset bump
levels and descriptions. They are outside `.changeset` so the icons-only release
does not create a UI Version Packages change. Before the next UI release, move
both documents back to `.changeset` and review the resulting version and package
changes. Do not discard them or treat the UI changes as already published.

The checked-in `scripts/release/release-deferral-policy.json` permits only the
recorded icons release identity and exact UI source, lock, toolchain and config
hashes against the recorded UI release baseline. Further changes require a new
reviewed policy or a normal release of all observed packages. Consumer verification
uses the frozen registry UI counterpart rather than the deferred UI build.
