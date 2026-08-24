# Changesets

Add a changeset for every release-worthy change to `@yakit-libs/yakit-ui` or
`@yakit-libs/yakit-ui-icons`:

```sh
pnpm changeset
```

Use an empty changeset for changes that intentionally do not publish a package:

```sh
pnpm changeset --empty
```

Stable releases are prepared from `main`. A `pre/**` branch may publish only after
committing `pnpm changeset pre enter <tag>` state and aligning `baseBranch` with
that branch. Before merging back to `main`, commit `pnpm changeset pre exit` and
restore `baseBranch` to `main`.
