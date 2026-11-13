import assert from "node:assert/strict";
import test from "node:test";
import { classify, changedPaths } from "../../scripts/ci/scope.mjs";

test("docs skip expensive jobs; icon assets run full icons and consumer checks", () => {
  assert.ok(
    Object.values(classify(["docs/icon-maintenance.md"])).every(
      (value) => !value,
    ),
  );
  const flags = classify(["packages/yakit-ui-icons/src/outline/1-2.svg"]);
  assert.equal(flags.icons, true);
  assert.equal(flags.integration, true);
  assert.equal(flags.ui, false);
  assert.equal(flags.storybook, false);
  assert.equal(flags.platforms, false);
});
test("shared icon code runs UI and platform checks; UI does not repeat icon tests", () => {
  const icons = classify([
    "packages/yakit-ui-icons/config/svgReactTransform.ts",
  ]);
  for (const key of ["icons", "ui", "isolation", "platforms"])
    assert.equal(icons[key], true);
  const ui = classify(["packages/yakit-ui/src/components/Button/index.tsx"]);
  assert.equal(ui.ui, true);
  assert.equal(ui.icon_build, true);
  assert.equal(ui.icons, false);
});
test("release code and shared dependency changes select their consumers", () => {
  assert.equal(classify([".changeset/icon-fix.md"]).release_tools, true);
  assert.equal(
    classify(["scripts/release/check-release-state.mjs"]).release_tools,
    true,
  );
  for (const file of [
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "new-tool.config.js",
  ])
    assert.ok(Object.values(classify([file])).every(Boolean));
});
test("rename paths are treated as deletion plus addition; unavailable base runs all", () => {
  const git = (_command, args) => {
    assert.ok(args.includes("--no-renames"));
    assert.ok(args.includes("-z"));
    return "packages/yakit-ui-icons/src/outline/old.svg\0docs/new.md\0";
  };
  assert.equal(classify(changedPaths("before", "after", { git })).icons, true);
  assert.equal(changedPaths("000000"), null);
  assert.equal(
    changedPaths("missing", "HEAD", {
      git: () => {
        throw new Error();
      },
    }),
    null,
  );
});
test("PR compares from merge base", () => {
  const calls = [];
  changedPaths("target", "merge", {
    pullRequest: true,
    git: (_cmd, args) => {
      calls.push(args);
      return calls.length === 1 ? "base\n" : "";
    },
  });
  assert.deepEqual(calls[0], ["merge-base", "target", "merge"]);
  assert.deepEqual(calls[1].slice(-2), ["base", "merge"]);
});
