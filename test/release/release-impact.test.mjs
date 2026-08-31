import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertImpactOutputPublishSafe,
  computeReleaseImpact,
  impactProbesForRelease,
  releaseSetFromPublishPlan,
  releaseVersionsFromPublishPlan,
  resolveReleaseImpactBaselines,
  snapshotHash,
} from "../../scripts/release/release-impact.mjs";

const UI = "@yakit-libs/yakit-ui";
const ICONS = "@yakit-libs/yakit-ui-icons";

function write(root, file, content) {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), content);
}

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function changeset(packages) {
  return `---\n${packages.map((name) => `"${name}": patch`).join("\n")}\n---\n\nrelease\n`;
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "release-impact-"));
  git(root, "init", "-q");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "Test");
  write(
    root,
    "packages/yakit-ui/package.json",
    '{"name":"@yakit-libs/yakit-ui"}\n',
  );
  write(root, "packages/yakit-ui/README.md", "ui\n");
  write(root, "packages/yakit-ui/src/index.ts", "export {};\n");
  write(root, "packages/yakit-ui/src/icons/index.tsx", "export {};\n");
  write(root, "packages/yakit-ui/tsconfig.json", "{}\n");
  write(
    root,
    "packages/yakit-ui-icons/package.json",
    '{"name":"@yakit-libs/yakit-ui-icons"}\n',
  );
  write(root, "packages/yakit-ui-icons/README.md", "icons\n");
  write(root, "packages/yakit-ui-icons/tsconfig.json", "{}\n");
  write(root, ".changeset/config.json", "{}\n");
  write(root, "package.json", "{}\n");
  write(root, "pnpm-lock.yaml", "lockfileVersion: '9.0'\n");
  write(root, "pnpm-workspace.yaml", "packages: []\n");
  write(root, "turbo.json", "{}\n");
  git(root, "add", ".");
  git(root, "commit", "-qm", "base");
  const snapshots = path.join(root, "snapshot-fixtures");
  for (const side of ["base", "head"]) {
    write(
      snapshots,
      `${side}/yakit-ui/package.json`,
      '{"name":"@yakit-libs/yakit-ui","version":"1.0.0","exports":{".":"./dist/index.js"}}\n',
    );
    write(snapshots, `${side}/yakit-ui/README.md`, "ui\n");
    write(
      snapshots,
      `${side}/yakit-ui/CHANGELOG.md`,
      "# UI\n\n## 1.0.0\n\n- baseline\n",
    );
    write(snapshots, `${side}/yakit-ui/dist/index.js`, "export {};\n");
    write(snapshots, `${side}/yakit-ui/dist/index.d.ts`, "export {};\n");
    write(snapshots, `${side}/yakit-ui/dist/index.css`, ".ui{}\n");
    write(
      snapshots,
      `${side}/yakit-ui-icons/package.json`,
      '{"name":"@yakit-libs/yakit-ui-icons","version":"1.0.0","exports":{".":"./index.js"}}\n',
    );
    write(snapshots, `${side}/yakit-ui-icons/README.md`, "icons\n");
    write(
      snapshots,
      `${side}/yakit-ui-icons/CHANGELOG.md`,
      "# Icons\n\n## 1.0.0\n\n- baseline\n",
    );
    write(snapshots, `${side}/yakit-ui-icons/index.js`, "export {};\n");
    write(snapshots, `${side}/yakit-ui-icons/index.d.ts`, "export {};\n");
    write(snapshots, `${side}/yakit-ui-icons/icon.css`, ".icon{}\n");
  }
  return {
    root,
    base: git(root, "rev-parse", "HEAD"),
    baseSnapshotDirectory: path.join(snapshots, "base"),
    headSnapshotDirectory: path.join(snapshots, "head"),
  };
}

function addVersionPackagesNoise(fixtureState, packageDirectory, version) {
  const packagePath = path.join(
    fixtureState.headSnapshotDirectory,
    packageDirectory,
    "package.json",
  );
  const manifest = JSON.parse(readFileSync(packagePath, "utf8"));
  manifest.version = version;
  writeFileSync(packagePath, `${JSON.stringify(manifest)}\n`);
  const changelogPath = path.join(
    fixtureState.headSnapshotDirectory,
    packageDirectory,
    "CHANGELOG.md",
  );
  const changelog = readFileSync(changelogPath, "utf8");
  writeFileSync(
    changelogPath,
    `${changelog.split("\n\n## ")[0]}\n\n## ${version}\n\n- generated Changesets release notes\n\n## ${changelog.split("\n\n## ")[1]}`,
  );
}

const cases = [
  ["none", [], []],
  [
    "ui-only runtime",
    [UI],
    [["yakit-ui/dist/index.js", "export const ui = 1;\n"]],
  ],
  ["ui README", [UI], [["yakit-ui/README.md", "ui docs changed\n"]]],
  [
    "icons-only package",
    [ICONS],
    [
      [
        "yakit-ui-icons/package.json",
        '{"name":"@yakit-libs/yakit-ui-icons","version":"2.0.0","sideEffects":false}\n',
      ],
    ],
  ],
  [
    "icons README",
    [ICONS],
    [["yakit-ui-icons/README.md", "icons docs changed\n"]],
  ],
  [
    "shared icon source output",
    [UI, ICONS],
    [
      ["yakit-ui/dist/index.js", "export const shared = 1;\n"],
      ["yakit-ui-icons/index.js", "export const shared = 1;\n"],
    ],
  ],
];

for (const [name, expected, mutations] of cases) {
  test(`impact truth table: ${name}`, async () => {
    const fixtureState = fixture();
    const { root, base, headSnapshotDirectory } = fixtureState;
    for (const [file, content] of mutations)
      write(headSnapshotDirectory, file, content);
    if (expected.length)
      write(root, ".changeset/release.md", changeset(expected));
    const result = await computeReleaseImpact({
      root,
      baseRevision: base,
      ...fixtureState,
    });
    assert.equal(result.status, "PASS", result.reason);
    assert.deepEqual(result.observedSet, expected);
    assert.deepEqual(result.declaredSet, expected);
    assert.deepEqual(
      result.impactProbeSet.map((item) => item.package),
      expected,
    );
    for (const probe of result.impactProbeSet) {
      assert.equal(probe.kind, "impact-probe");
      assert.equal(probe.nonPublishable, true);
      for (const key of [
        "sourceHash",
        "baseSourceHash",
        "headSourceHash",
        "lockHash",
        "baseLockHash",
        "headLockHash",
        "toolchainHash",
        "baseToolchainHash",
        "headToolchainHash",
        "configHash",
        "baseConfigHash",
        "headConfigHash",
        "snapshotHash",
        "toolchainIdentityHash",
      ])
        assert.match(probe[key], /^[0-9a-f]{64}$/);
      assert.match(probe.packageSnapshotHashes.base, /^[0-9a-f]{64}$/);
      assert.match(probe.packageSnapshotHashes.head, /^[0-9a-f]{64}$/);
    }
  });
}

test("under-declared impact blocks", async () => {
  const fixtureState = fixture();
  const { root, base, headSnapshotDirectory } = fixtureState;
  write(
    headSnapshotDirectory,
    "yakit-ui/dist/index.js",
    "export const shared = 1;\n",
  );
  write(
    headSnapshotDirectory,
    "yakit-ui-icons/index.js",
    "export const shared = 1;\n",
  );
  write(root, ".changeset/release.md", changeset([ICONS]));
  addVersionPackagesNoise(fixtureState, "yakit-ui", "2.0.0");
  addVersionPackagesNoise(fixtureState, "yakit-ui-icons", "2.0.0");
  const result = await computeReleaseImpact({
    root,
    baseRevision: base,
    ...fixtureState,
    expectedVersions: { [UI]: "2.0.0", [ICONS]: "2.0.0" },
  });
  assert.equal(result.status, "BLOCK");
  assert.deepEqual(result.observedSet, [UI, ICONS]);
  assert.deepEqual(result.declaredSet, [ICONS]);
});

test("over-declared impact blocks", async () => {
  const fixtureState = fixture();
  const { root, base, headSnapshotDirectory } = fixtureState;
  write(headSnapshotDirectory, "yakit-ui/README.md", "changed\n");
  write(root, ".changeset/release.md", changeset([UI, ICONS]));
  addVersionPackagesNoise(fixtureState, "yakit-ui", "2.0.0");
  addVersionPackagesNoise(fixtureState, "yakit-ui-icons", "2.0.0");
  const result = await computeReleaseImpact({
    root,
    baseRevision: base,
    ...fixtureState,
    expectedVersions: { [UI]: "2.0.0", [ICONS]: "2.0.0" },
  });
  assert.equal(result.status, "BLOCK");
});

test("Version Packages version and generated changelog noise normalize without hiding semantic changes", async () => {
  const fixtureState = fixture();
  addVersionPackagesNoise(fixtureState, "yakit-ui", "2.0.0");
  let result = await computeReleaseImpact({
    root: fixtureState.root,
    baseRevision: fixtureState.base,
    ...fixtureState,
    expectedVersions: { [UI]: "2.0.0" },
  });
  assert.equal(result.status, "PASS", result.reason);
  assert.deepEqual(result.observedSet, []);

  write(
    fixtureState.headSnapshotDirectory,
    "yakit-ui/dist/index.js",
    "export const semanticChange = true;\n",
  );
  write(fixtureState.root, ".changeset/release.md", changeset([UI]));
  result = await computeReleaseImpact({
    root: fixtureState.root,
    baseRevision: fixtureState.base,
    ...fixtureState,
    expectedVersions: { [UI]: "2.0.0" },
  });
  assert.equal(result.status, "PASS", result.reason);
  assert.deepEqual(result.observedSet, [UI]);
});

test("missing base is inconclusive and blocks", async () => {
  const fixtureState = fixture();
  const result = await computeReleaseImpact({
    root: fixtureState.root,
    baseRevision: "missing-revision",
    ...fixtureState,
  });
  assert.equal(result.status, "BLOCK");
  assert.match(result.reason, /inconclusive/);
});

test("missing package snapshots is inconclusive and blocks", async () => {
  const fixtureState = fixture();
  const result = await computeReleaseImpact({
    root: fixtureState.root,
    baseRevision: fixtureState.base,
  });
  assert.equal(result.status, "BLOCK");
  assert.match(result.reason, /package impact evidence is inconclusive/);
});

test("lockfile-only changes do not release packages when snapshots match", async () => {
  const fixtureState = fixture();
  write(
    fixtureState.root,
    "pnpm-lock.yaml",
    "lockfileVersion: '9.0'\nchanged: true\n",
  );
  const result = await computeReleaseImpact({
    root: fixtureState.root,
    baseRevision: fixtureState.base,
    ...fixtureState,
  });
  assert.equal(result.status, "PASS", result.reason);
  assert.deepEqual(result.observedSet, []);
});

test("historical unchanged changesets do not overdeclare", async () => {
  const fixtureState = fixture();
  write(fixtureState.root, ".changeset/historical.md", changeset([UI]));
  git(fixtureState.root, "add", ".changeset/historical.md");
  git(fixtureState.root, "commit", "-qm", "historical changeset");
  const baseRevision = git(fixtureState.root, "rev-parse", "HEAD");
  const result = await computeReleaseImpact({
    root: fixtureState.root,
    baseRevision,
    ...fixtureState,
  });
  assert.equal(result.status, "PASS", result.reason);
  assert.deepEqual(result.declaredSet, []);
});

test("impact probes reject tarball and publish fields", () => {
  assert.throws(
    () =>
      assertImpactOutputPublishSafe({
        impactProbeSet: [
          { kind: "impact-probe", nonPublishable: true, tarball: "shadow.tgz" },
        ],
      }),
    /publishable artifact fields/,
  );
});

test("prepare consumer accepts only a passing exact release set", () => {
  const hash = "a".repeat(64);
  const result = {
    schemaId: "yakit-ui-release-impact/v1",
    status: "PASS",
    reason: "match",
    observedSet: [UI],
    declaredSet: [UI],
    impactProbeSet: [
      {
        package: UI,
        kind: "impact-probe",
        nonPublishable: true,
        baseSourceHash: hash,
        headSourceHash: hash,
        baseLockHash: hash,
        headLockHash: hash,
        baseToolchainHash: hash,
        headToolchainHash: hash,
        baseConfigHash: hash,
        headConfigHash: hash,
        snapshotHash: hash,
        toolchainIdentityHash: hash,
        packageSnapshotHashes: { base: hash, head: hash },
        toolchainIdentity: {
          node: "v24.12.0",
          pnpm: "10.34.5",
          os: { platform: "linux", release: "fixture", arch: "x64" },
        },
      },
    ],
  };
  assert.equal(impactProbesForRelease(result, [UI]).length, 1);
  assert.throws(() => impactProbesForRelease(result, [ICONS]), /observedSet/);
  assert.throws(
    () => impactProbesForRelease({ ...result, status: "BLOCK" }, [UI]),
    /blocked/,
  );
});

test("publish plan and package-specific release tags provide durable declaration baselines", async () => {
  const fixtureState = fixture();
  git(fixtureState.root, "tag", `${UI}@1.0.0`);
  git(fixtureState.root, "tag", `${ICONS}@2.0.0`);
  assert.deepEqual(
    releaseSetFromPublishPlan({
      version: 1,
      plan: [[{ kind: "publish", name: ICONS, version: "2.0.1" }]],
    }),
    [ICONS],
  );
  assert.deepEqual(
    await resolveReleaseImpactBaselines({
      root: fixtureState.root,
      sourceRef: "refs/heads/main",
    }),
    { [UI]: `${UI}@1.0.0`, [ICONS]: `${ICONS}@2.0.0` },
  );
  assert.deepEqual(
    releaseVersionsFromPublishPlan({
      version: 1,
      plan: [[{ kind: "publish", name: ICONS, version: "2.0.1" }]],
    }),
    { [ICONS]: "2.0.1" },
  );
});

test("initial icons fallback binds exact version, commit, and source snapshot", async () => {
  const fixtureState = fixture();
  const commit = fixtureState.base;
  git(fixtureState.root, "tag", `${UI}@0.0.0`, commit);
  write(
    fixtureState.root,
    "packages/yakit-ui-icons/package.json",
    '{"name":"@yakit-libs/yakit-ui-icons","version":"0.0.0"}\n',
  );
  git(fixtureState.root, "add", "packages/yakit-ui-icons/package.json");
  git(fixtureState.root, "commit", "-qm", "icons baseline identity");
  const iconsCommit = git(fixtureState.root, "rev-parse", "HEAD");
  const expectedSnapshotHash = await snapshotHash({
    root: fixtureState.root,
    revision: iconsCommit,
    paths: ["packages/yakit-ui-icons", "packages/yakit-ui/src/icons"],
  });
  assert.deepEqual(
    await resolveReleaseImpactBaselines({
      root: fixtureState.root,
      sourceRef: "refs/heads/main",
      policy: {
        schemaId: "yakit-ui-release-impact-baselines/v1",
        initialTagFallbacks: {
          [ICONS]: {
            revision: iconsCommit,
            expectedVersion: "0.0.0",
            expectedCommit: iconsCommit,
            expectedSnapshotHash,
          },
        },
        prereleaseFallback: "latest-stable-package-tag",
      },
    }),
    { [UI]: `${UI}@0.0.0`, [ICONS]: iconsCommit },
  );
});
