import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  checkReleaseDeferral,
  verifyDeferralPlan,
} from "../../scripts/release/check-release-deferral.mjs";

import { releaseInputHashes } from "../../scripts/release/release-impact.mjs";

const require = createRequire(import.meta.url);
const UI = "@yakit-libs/yakit-ui";
const ICONS = "@yakit-libs/yakit-ui-icons";
const TARGET_VERSION = "0.3.1";
const ui = {
  name: UI,
  version: "0.2.3",
  dependencies: { [ICONS]: "workspace:^" },
};
const icons = { name: ICONS, version: "0.3.0" };

function state() {
  return {
    policy: {
      schemaId: "yakit-ui-release-deferral/v1",
      releases: [{ name: ICONS, version: TARGET_VERSION }],
      deferred: [
        {
          package: UI,
          version: "0.2.3",
          distTag: "latest",
          integrity: "sha512-Zml4dHVyZQ==",
          sha256: "a".repeat(64),
          baseRevision: "a".repeat(40),
          headSourceHash: "b".repeat(64),
          headLockHash: "c".repeat(64),
          headToolchainHash: "d".repeat(64),
          headConfigHash: "e".repeat(64),
          reason: "UI migration is deferred.",
          followUpPath: "docs/pending-releases/README.md",
        },
      ],
    },
    config: {
      changelog: false,
      commit: false,
      access: "public",
      baseBranch: "main",
      ignore: [UI],
      privatePackages: { version: false, tag: false },
    },
    packages: { [UI]: structuredClone(ui), [ICONS]: structuredClone(icons) },
    versionPlan: {
      releases: [
        {
          name: ICONS,
          type: "patch",
          oldVersion: icons.version,
          newVersion: TARGET_VERSION,
        },
        { name: UI, type: "none", oldVersion: "0.2.3", newVersion: "0.2.3" },
      ],
    },
  };
}

function commitFixture(directory) {
  const git = (...args) =>
    execFileSync("git", args, { cwd: directory, stdio: "pipe" });
  git("add", ".");
  git(
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "fixture",
  );
}

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "yakit-deferral-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const input = state();
  const files = {
    "package.json": { name: "release-fixture", private: true },
    "packages/yakit-ui/package.json": input.packages[UI],
    "packages/yakit-ui-icons/package.json": input.packages[ICONS],
    ".changeset/config.json": input.config,
    "scripts/release/release-deferral-policy.json": input.policy,
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "turbo.json": { tasks: {} },
    "packages/yakit-ui/.storybook/preview.tsx": "export default {};\n",
    "packages/yakit-ui/test/icon.test.ts": "// reviewed test\n",
    "packages/yakit-ui/tsconfig.json": { compilerOptions: {} },
    "packages/yakit-ui-icons/tsconfig.json": { compilerOptions: {} },
    "pnpm-workspace.yaml": "packages:\n  - packages/*\n",
    ".changeset/new-icons.md": `---\n"${ICONS}": patch\n---\n\nNew icons.\n`,
    "docs/pending-releases/README.md": "UI remains pending.\n",
  };
  for (const [file, value] of Object.entries(files)) {
    const target = path.join(directory, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(
      target,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  }
  const git = (...args) =>
    execFileSync("git", args, { cwd: directory, stdio: "pipe" });
  git("init", "-q", "--initial-branch=main");
  commitFixture(directory);
  const hashes = await releaseInputHashes({
    root: directory,
    revision: "HEAD",
    packageName: UI,
  });
  for (const [field, value] of Object.entries(hashes))
    input.policy.deferred[0][`head${field[0].toUpperCase()}${field.slice(1)}`] =
      value;
  await writeFile(
    path.join(directory, "scripts/release/release-deferral-policy.json"),
    JSON.stringify(input.policy),
  );
  commitFixture(directory);
  return directory;
}

test("actual Changesets preserves workspace UI through versioning and the subsequent publish plan", async (t) => {
  const directory = await fixture(t);
  // Model Actions' detached PR checkout: origin/main exists, local main does not.
  const git = (...args) =>
    execFileSync("git", args, { cwd: directory, stdio: "pipe" });
  git("checkout", "--detach", "-q");
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  git("branch", "-D", "main");
  const workflow = await readFile(
    path.resolve(import.meta.dirname, "../../.github/workflows/ci.yml"),
    "utf8",
  );
  const prepareBase = workflow
    .split("\n")
    .find((line) =>
      line.trim().startsWith("git show-ref --verify --quiet refs/heads/main"),
    );
  assert.ok(
    prepareBase,
    "CI must make the Changesets base reference available",
  );
  execFileSync("sh", ["-eu", "-c", prepareBase.trim()], {
    cwd: directory,
    stdio: "pipe",
  });
  assert.equal((await checkReleaseDeferral({ directory })).phase, "version");
  const uiPath = path.join(directory, "packages/yakit-ui/package.json");
  const before = await readFile(uiPath, "utf8");
  execFileSync(
    process.execPath,
    [require.resolve("@changesets/cli/bin.js"), "version"],
    { cwd: directory, stdio: "pipe" },
  );
  assert.equal(await readFile(uiPath, "utf8"), before);
  commitFixture(directory);
  assert.equal((await checkReleaseDeferral({ directory })).phase, "versioned");
  const publishPlan = {
    version: 1,
    plan: [[{ kind: "publish", name: ICONS, version: TARGET_VERSION }]],
  };
  assert.equal(
    (await checkReleaseDeferral({ directory, publishPlan })).phase,
    "publish",
  );
  publishPlan.plan[0].push({ kind: "publish", name: UI, version: "0.2.3" });
  await assert.rejects(
    checkReleaseDeferral({ directory, publishPlan }),
    /release context/,
  );
});

test("removing ignore cannot silently restore the dependency-driven UI release", async (t) => {
  const directory = await fixture(t);
  await writeFile(
    path.join(directory, ".changeset/config.json"),
    JSON.stringify({ ...state().config, ignore: [] }),
  );
  await assert.rejects(
    checkReleaseDeferral({ directory }),
    /must remain in Changesets ignore/,
  );
});

test("the old package baseline cannot silently generate a different patch release", async (t) => {
  const directory = await fixture(t);
  await writeFile(
    path.join(directory, "packages/yakit-ui-icons/package.json"),
    JSON.stringify({ ...icons, version: "0.2.9" }),
  );
  await assert.rejects(checkReleaseDeferral({ directory }), /release context/);
});

test("a remaining minor Changeset cannot advance the selected target to 0.4.0", async (t) => {
  const directory = await fixture(t);
  await writeFile(
    path.join(directory, ".changeset/react-support.md"),
    `---\n"${ICONS}": minor\n---\n\nReact support.\n`,
  );
  await assert.rejects(checkReleaseDeferral({ directory }), /release context/);
});

for (const [name, mutate, expected] of [
  [
    "UI version bump",
    (input) => {
      input.packages[UI].version = "0.2.4";
    },
    /must remain at/,
  ],
  [
    "ignored icon package",
    (input) => {
      input.config.ignore.push(ICONS);
    },
    /must not be ignored/,
  ],
  [
    "UI in version plan",
    (input) => {
      input.versionPlan.releases[1].type = "patch";
    },
    /release context/,
  ],
  [
    "unexpected icon version",
    (input) => {
      input.versionPlan.releases[0].newVersion = "0.4.0";
    },
    /release context/,
  ],
  [
    "missing Changeset before versioning",
    (input) => {
      input.versionPlan.releases = [];
    },
    /release context/,
  ],
]) {
  test(`deferral plan rejects ${name}`, () => {
    const input = state();
    mutate(input);
    assert.throws(() => verifyDeferralPlan(input), expected);
  });
}

test("publish plan must match the actual manifest version and contain only one release", () => {
  const input = state();
  input.publishPlan = {
    version: 1,
    plan: [[{ kind: "publish", name: ICONS, version: TARGET_VERSION }]],
  };
  assert.throws(() => verifyDeferralPlan(input), /manifest differs/);
  input.packages[ICONS].version = TARGET_VERSION;
  assert.equal(verifyDeferralPlan(input).phase, "publish");
  input.publishPlan.plan[0].push(input.publishPlan.plan[0][0]);
  assert.throws(() => verifyDeferralPlan(input), /release context/);
});

test("removing the completed deferral policy restores the normal release workflow", async (t) => {
  const directory = await fixture(t);
  await rm(
    path.join(directory, "scripts/release/release-deferral-policy.json"),
  );
  assert.deepEqual(await checkReleaseDeferral({ directory }), {
    phase: "no-deferral",
  });
});

for (const [file, content, field] of [
  [
    "packages/yakit-ui/.storybook/preview.tsx",
    "export default { theme: 'dark' };\n",
    "headSourceHash",
  ],
  [
    "packages/yakit-ui/test/icon.test.ts",
    "// changed test\n",
    "headSourceHash",
  ],
  [
    "packages/yakit-ui/src/new.ts",
    "export const changed = true;\n",
    "headSourceHash",
  ],
  ["pnpm-lock.yaml", "lockfileVersion: '9.0'\n# changed\n", "headLockHash"],
  [
    "package.json",
    JSON.stringify({
      name: "release-fixture",
      private: true,
      engines: { node: ">=24" },
    }),
    "headToolchainHash",
  ],
  [
    "packages/yakit-ui-icons/tsconfig.json",
    JSON.stringify({ compilerOptions: { strict: true } }),
    "headConfigHash",
  ],
]) {
  test(`early deferral check rejects committed drift in ${file}`, async (t) => {
    const directory = await fixture(t);
    const target = path.join(directory, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
    commitFixture(directory);
    await assert.rejects(
      checkReleaseDeferral({ directory }),
      new RegExp(`${field} mismatch.*expected.*actual`),
    );
  });
}

test("early deferral check ignores untracked build outputs and detects committed deletion", async (t) => {
  const directory = await fixture(t);
  for (const file of ["dist/index.js", "storybook-static/index.html"]) {
    const target = path.join(directory, "packages/yakit-ui", file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "generated output");
  }
  assert.equal((await checkReleaseDeferral({ directory })).phase, "version");
  await rm(path.join(directory, "packages/yakit-ui/test/icon.test.ts"));
  execFileSync("git", ["add", "-u"], { cwd: directory, stdio: "pipe" });
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-qm",
      "delete test",
    ],
    { cwd: directory, stdio: "pipe" },
  );
  await assert.rejects(
    checkReleaseDeferral({ directory }),
    /headSourceHash mismatch/,
  );
});
