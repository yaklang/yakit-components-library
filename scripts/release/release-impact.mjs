#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export const PUBLIC_PACKAGES = [
  "@yakit-libs/yakit-ui",
  "@yakit-libs/yakit-ui-icons",
];

const ROOT = path.resolve(import.meta.dirname, "../..");
const WORKTREE = "WORKTREE";
const IMPACT_BASELINE_POLICY = JSON.parse(
  await readFile(
    path.join(ROOT, "scripts/release/release-impact-baselines.json"),
    "utf8",
  ),
);
const IGNORED_PARTS = new Set(["dist", "node_modules", ".turbo"]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  return value;
};
const stableJson = (value) => JSON.stringify(canonicalize(value));

const SNAPSHOTS = {
  ui: ["packages/yakit-ui"],
  icons: ["packages/yakit-ui-icons"],
  sharedIcons: ["packages/yakit-ui/src/icons"],
  lock: ["pnpm-lock.yaml"],
  toolchain: ["package.json", "pnpm-workspace.yaml", "turbo.json"],
  config: [
    ".changeset/config.json",
    "packages/yakit-ui/tsconfig.json",
    "packages/yakit-ui-icons/tsconfig.json",
  ],
};

function runGit(args, root = ROOT) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseVersion(version) {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(
      version,
    );
  if (!match) return null;
  return {
    core: match.slice(1, 4).map(Number),
    prerelease: match[4]?.split(".") ?? [],
  };
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) throw new Error("release impact tag contains invalid SemVer");
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) return a.core[index] - b.core[index];
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    if (a.prerelease.length === b.prerelease.length) return 0;
    return a.prerelease.length === 0 ? 1 : -1;
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = a.prerelease[index];
    const rightPart = b.prerelease[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;
    const leftNumber = /^\d+$/.test(leftPart);
    const rightNumber = /^\d+$/.test(rightPart);
    if (leftNumber && rightNumber) return Number(leftPart) - Number(rightPart);
    if (leftNumber !== rightNumber) return leftNumber ? -1 : 1;
    return leftPart.localeCompare(rightPart);
  }
  return 0;
}

function versionsFromTags(root, packageName) {
  const prefix = `${packageName}@`;
  return runGit(["tag", "--list", `${prefix}*`], root)
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((tag) => ({ tag, version: tag.slice(prefix.length) }))
    .filter(({ version }) => parseVersion(version));
}

export function releaseSetFromPublishPlan(plan) {
  if (plan?.version !== 1 || !Array.isArray(plan.plan))
    throw new Error("unsupported Changesets publish plan");
  const entries = plan.plan.flat();
  const releaseSet = PUBLIC_PACKAGES.filter((packageName) =>
    entries.some(
      (entry) => entry?.kind === "publish" && entry?.name === packageName,
    ),
  );
  if (
    releaseSet.length === 0 ||
    entries.some(
      (entry) =>
        entry?.kind === "publish" && !PUBLIC_PACKAGES.includes(entry?.name),
    )
  )
    throw new Error("publish plan has an unsupported or empty release set");
  return releaseSet;
}

export function releaseVersionsFromPublishPlan(plan) {
  if (plan?.version !== 1 || !Array.isArray(plan.plan))
    throw new Error("unsupported Changesets publish plan");
  return Object.fromEntries(
    plan.plan
      .flat()
      .filter(
        (entry) =>
          entry?.kind === "publish" && PUBLIC_PACKAGES.includes(entry.name),
      )
      .map((entry) => [entry.name, entry.version]),
  );
}

export async function resolveReleaseImpactBaselines({
  root = ROOT,
  sourceRef,
  policy = IMPACT_BASELINE_POLICY,
}) {
  if (policy?.schemaId !== "yakit-ui-release-impact-baselines/v1")
    throw new Error("unsupported release impact baseline policy");
  const prereleaseTag = sourceRef?.startsWith("refs/heads/pre/")
    ? sourceRef.slice("refs/heads/pre/".length)
    : null;
  const baseRevisions = {};
  for (const packageName of PUBLIC_PACKAGES) {
    const tags = versionsFromTags(root, packageName);
    const candidates = prereleaseTag
      ? tags.filter(
          ({ version }) =>
            parseVersion(version)?.prerelease[0] === prereleaseTag,
        )
      : tags.filter(
          ({ version }) => parseVersion(version)?.prerelease.length === 0,
        );
    const selected = candidates.sort((left, right) =>
      compareVersions(right.version, left.version),
    )[0];
    if (selected) {
      baseRevisions[packageName] = selected.tag;
      continue;
    }
    if (
      prereleaseTag &&
      policy.prereleaseFallback === "latest-stable-package-tag"
    ) {
      const stable = tags
        .filter(({ version }) => parseVersion(version)?.prerelease.length === 0)
        .sort((left, right) => compareVersions(right.version, left.version))[0];
      if (stable) {
        baseRevisions[packageName] = stable.tag;
        continue;
      }
    }
    const fallback = policy.initialTagFallbacks?.[packageName];
    if (!fallback)
      throw new Error(`no reviewed impact baseline tag for ${packageName}`);
    if (
      !fallback.revision ||
      !/^[0-9a-f]{40}$/i.test(fallback.expectedCommit ?? "") ||
      !/^[0-9a-f]{64}$/i.test(fallback.expectedSnapshotHash ?? "") ||
      !parseVersion(fallback.expectedVersion)
    )
      throw new Error(
        `initial baseline identity for ${packageName} is incomplete`,
      );
    const commit = runGit(
      ["rev-parse", "--verify", `${fallback.revision}^{commit}`],
      root,
    ).trim();
    if (commit !== fallback.expectedCommit)
      throw new Error(`initial baseline commit mismatch for ${packageName}`);
    const manifest = JSON.parse(
      runGit(["show", `${commit}:packages/yakit-ui-icons/package.json`], root),
    );
    if (manifest.version !== fallback.expectedVersion)
      throw new Error(`initial baseline version mismatch for ${packageName}`);
    const sourceHash = await snapshotHash({
      root,
      revision: commit,
      paths: ["packages/yakit-ui-icons", "packages/yakit-ui/src/icons"],
    });
    if (sourceHash !== fallback.expectedSnapshotHash)
      throw new Error(`initial baseline snapshot mismatch for ${packageName}`);
    baseRevisions[packageName] = commit;
  }
  return baseRevisions;
}

async function worktreeFiles(root, relativePath) {
  const absolute = path.join(root, relativePath);
  let metadata;
  try {
    metadata = await stat(absolute);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  if (metadata.isFile()) return [relativePath];
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (IGNORED_PARTS.has(entry.name)) continue;
    files.push(
      ...(await worktreeFiles(root, path.join(relativePath, entry.name))),
    );
  }
  return files;
}

export async function snapshotHash({ root = ROOT, revision, paths }) {
  const files =
    revision === WORKTREE
      ? (await Promise.all(paths.map((item) => worktreeFiles(root, item))))
          .flat()
          .sort()
      : runGit(["ls-tree", "-r", "--name-only", revision, "--", ...paths], root)
          .trim()
          .split("\n")
          .filter(Boolean)
          .sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(
      revision === WORKTREE
        ? await readFile(path.join(root, file))
        : runGit(["show", `${revision}:${file}`], root),
    );
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function readChangesetDocuments({ root, revision }) {
  if (revision === WORKTREE) {
    const files = await worktreeFiles(root, ".changeset");
    return Promise.all(
      files
        .filter((file) => file.endsWith(".md") && !file.endsWith("README.md"))
        .map(async (file) => [
          file,
          await readFile(path.join(root, file), "utf8"),
        ]),
    );
  }
  const files = runGit(
    ["ls-tree", "-r", "--name-only", revision, "--", ".changeset"],
    root,
  )
    .trim()
    .split("\n")
    .filter((file) => file.endsWith(".md") && !file.endsWith("README.md"));
  return files.map((file) => [
    file,
    runGit(["show", `${revision}:${file}`], root),
  ]);
}

async function changedChangesetDocuments({ root, baseRevision, headRevision }) {
  const [baseDocuments, headDocuments] = await Promise.all([
    readChangesetDocuments({ root, revision: baseRevision }),
    readChangesetDocuments({ root, revision: headRevision }),
  ]);
  const base = new Map(baseDocuments);
  return headDocuments.filter(
    ([file, text]) => !base.has(file) || base.get(file) !== text,
  );
}

export function declaredPackagesFromChangesets(documents) {
  const declared = new Set();
  for (const [file, text] of documents) {
    const frontmatter = text.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/)?.[1];
    if (!frontmatter) throw new Error(`Changeset ${file} has no frontmatter`);
    for (const match of frontmatter.matchAll(/^"([^"]+)"\s*:\s*\w+\s*$/gm)) {
      if (PUBLIC_PACKAGES.includes(match[1])) declared.add(match[1]);
    }
  }
  return PUBLIC_PACKAGES.filter((name) => declared.has(name));
}

function exactSet(left, right) {
  return stableJson(left) === stableJson(right);
}

function normalizeGeneratedChangelog(content, expectedVersion) {
  if (!expectedVersion) return content;
  const text = content.toString("utf8");
  const escaped = expectedVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const versionSection = new RegExp(
    `(^|\\n)##\\s+${escaped}(?:\\s+[^\\n]*)?\\n[\\s\\S]*?(?=\\n##\\s+|$)`,
  );
  return Buffer.from(
    `${text
      .replace(versionSection, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd()}\n`,
  );
}

async function publicPackageSnapshot(packageDirectory, options = {}) {
  async function packageFiles(relativePath) {
    const absolute = path.join(packageDirectory, relativePath);
    const metadata = await stat(absolute);
    if (metadata.isFile()) return [relativePath];
    const entries = await readdir(absolute, { withFileTypes: true });
    const files = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name)))
      files.push(...(await packageFiles(path.join(relativePath, entry.name))));
    return files;
  }
  const files = (await packageFiles(".")).sort();
  if (!files.includes("package.json"))
    throw new Error(`snapshot ${packageDirectory} has no package.json`);
  const groups = { runtime: [], types: [], css: [], contract: [], content: [] };
  for (const file of files) {
    let content = await readFile(path.join(packageDirectory, file));
    if (file === "package.json") {
      const manifest = JSON.parse(content.toString("utf8"));
      if (options.expectedVersion) {
        if (
          options.side === "head" &&
          manifest.version !== options.expectedVersion
        )
          throw new Error(
            `head package version ${manifest.version} does not match planned ${options.expectedVersion}`,
          );
        manifest.version = "<version-packages-noise>";
      }
      content = Buffer.from(`${stableJson(manifest)}\n`);
    }
    if (file === "CHANGELOG.md")
      content = normalizeGeneratedChangelog(content, options.expectedVersion);
    const record = `${file}\0${sha256(content)}`;
    groups.content.push(record);
    if (/\.d\.(?:ts|mts|cts)$/.test(file)) groups.types.push(record);
    else if (/\.css$/.test(file)) groups.css.push(record);
    else if (/\.(?:js|mjs|cjs)$/.test(file)) groups.runtime.push(record);
    if (file === "package.json" || /README(?:\.md)?$/i.test(file))
      groups.contract.push(record);
  }
  return Object.fromEntries(
    Object.entries(groups).map(([name, records]) => [
      `${name}Hash`,
      sha256(records.join("\n")),
    ]),
  );
}

export async function comparePackageSnapshots({
  baseDirectory,
  baseDirectories,
  headDirectory,
  expectedVersions = {},
}) {
  const snapshots = {};
  for (const [name, directory] of Object.entries({
    "@yakit-libs/yakit-ui": "yakit-ui",
    "@yakit-libs/yakit-ui-icons": "yakit-ui-icons",
  })) {
    snapshots[name] = {
      base: await publicPackageSnapshot(
        path.join(baseDirectories?.[name] ?? baseDirectory, directory),
        { expectedVersion: expectedVersions[name], side: "base" },
      ),
      head: await publicPackageSnapshot(path.join(headDirectory, directory), {
        expectedVersion: expectedVersions[name],
        side: "head",
      }),
    };
  }
  return snapshots;
}

async function createIsolatedSnapshot({ root, revision }) {
  if (revision === WORKTREE)
    throw new Error(
      "WORKTREE cannot be built hermetically; provide --head-snapshot-dir or a committed head revision",
    );
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "yakit-release-impact-"),
  );
  const checkout = path.join(temporaryRoot, "checkout");
  const snapshotDirectory = path.join(temporaryRoot, "snapshot");
  runGit(["worktree", "add", "--detach", checkout, revision], root);
  try {
    execFileSync("pnpm", ["install", "--frozen-lockfile", "--ignore-scripts"], {
      cwd: checkout,
      stdio: "inherit",
    });
    execFileSync(
      "pnpm",
      ["--filter", "@yakit-libs/yakit-ui", "run", "build:package"],
      { cwd: checkout, stdio: "inherit" },
    );
    execFileSync(
      "pnpm",
      ["--filter", "@yakit-libs/yakit-ui-icons", "run", "build"],
      { cwd: checkout, stdio: "inherit" },
    );
    await mkdir(snapshotDirectory, { recursive: true });
    for (const [name, directory] of [
      ["@yakit-libs/yakit-ui", "yakit-ui"],
      ["@yakit-libs/yakit-ui-icons", "yakit-ui-icons"],
    ]) {
      const packDirectory = path.join(temporaryRoot, `pack-${directory}`);
      await mkdir(packDirectory);
      execFileSync(
        "pnpm",
        ["--filter", name, "pack", "--pack-destination", packDirectory],
        { cwd: checkout, stdio: "inherit" },
      );
      const tarballs = (await readdir(packDirectory)).filter((file) =>
        file.endsWith(".tgz"),
      );
      if (tarballs.length !== 1)
        throw new Error(
          `${name} isolated pack produced ${tarballs.length} tarballs`,
        );
      const destination = path.join(snapshotDirectory, directory);
      await mkdir(destination);
      execFileSync(
        "tar",
        [
          "-xzf",
          path.join(packDirectory, tarballs[0]),
          "--strip-components=1",
          "-C",
          destination,
        ],
        { stdio: "inherit" },
      );
    }
    return { temporaryRoot, checkout, snapshotDirectory };
  } catch (error) {
    runGit(["worktree", "remove", "--force", checkout], root);
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}

export async function createIsolatedSnapshotPair({
  root = ROOT,
  baseRevision,
  headRevision,
}) {
  const created = [];
  try {
    const base = await createIsolatedSnapshot({ root, revision: baseRevision });
    created.push(base);
    const head = await createIsolatedSnapshot({ root, revision: headRevision });
    created.push(head);
    return {
      baseDirectory: base.snapshotDirectory,
      headDirectory: head.snapshotDirectory,
      async cleanup() {
        for (const item of created) {
          runGit(["worktree", "remove", "--force", item.checkout], root);
          await rm(item.temporaryRoot, { recursive: true, force: true });
        }
      },
    };
  } catch (error) {
    for (const item of created) {
      runGit(["worktree", "remove", "--force", item.checkout], root);
      await rm(item.temporaryRoot, { recursive: true, force: true });
    }
    throw error;
  }
}

export async function createIsolatedImpactSnapshots({
  root = ROOT,
  baseRevisions,
  headRevision,
}) {
  const created = new Map();
  const snapshotFor = async (revision) => {
    if (!created.has(revision))
      created.set(revision, await createIsolatedSnapshot({ root, revision }));
    return created.get(revision);
  };
  try {
    const head = await snapshotFor(headRevision);
    const baseDirectories = {};
    for (const packageName of PUBLIC_PACKAGES) {
      const revision = baseRevisions[packageName];
      if (!revision)
        throw new Error(`missing isolated baseline for ${packageName}`);
      baseDirectories[packageName] = (
        await snapshotFor(revision)
      ).snapshotDirectory;
    }
    return {
      baseDirectories,
      headDirectory: head.snapshotDirectory,
      async cleanup() {
        for (const item of [...created.values()].reverse()) {
          runGit(["worktree", "remove", "--force", item.checkout], root);
          await rm(item.temporaryRoot, { recursive: true, force: true });
        }
      },
    };
  } catch (error) {
    for (const item of [...created.values()].reverse()) {
      runGit(["worktree", "remove", "--force", item.checkout], root);
      await rm(item.temporaryRoot, { recursive: true, force: true });
    }
    throw error;
  }
}

export async function computeReleaseImpact({
  root = ROOT,
  baseRevision,
  baseRevisions,
  headRevision = WORKTREE,
  baseSnapshotDirectory,
  baseSnapshotDirectories,
  headSnapshotDirectory,
  declaredSetOverride,
  expectedVersions = {},
}) {
  const resolvedBaseRevisions = Object.fromEntries(
    PUBLIC_PACKAGES.map((packageName) => [
      packageName,
      baseRevisions?.[packageName] ?? baseRevision,
    ]),
  );
  if (Object.values(resolvedBaseRevisions).some((revision) => !revision))
    throw new Error("a base revision is required for every public package");
  const revisions = {
    baseByPackage: resolvedBaseRevisions,
    head: headRevision,
  };
  const snapshots = {};
  try {
    for (const [name, paths] of Object.entries(SNAPSHOTS)) {
      snapshots[name] = {
        base: await snapshotHash({
          root,
          revision: resolvedBaseRevisions[PUBLIC_PACKAGES[0]],
          paths,
        }),
        head: await snapshotHash({ root, revision: headRevision, paths }),
      };
    }
    snapshots.changesets = {
      base: await snapshotHash({
        root,
        revision: resolvedBaseRevisions[PUBLIC_PACKAGES[0]],
        paths: [".changeset"],
      }),
      head: await snapshotHash({
        root,
        revision: headRevision,
        paths: [".changeset"],
      }),
    };
  } catch (error) {
    return {
      schemaId: "yakit-ui-release-impact/v1",
      status: "BLOCK",
      reason: `impact evidence is inconclusive: ${error.message}`,
      revisions,
      observedSet: [],
      declaredSet: [],
      impactProbeSet: [],
    };
  }

  let packageSnapshots;
  try {
    if (
      (!baseSnapshotDirectory && !baseSnapshotDirectories) ||
      !headSnapshotDirectory
    )
      throw new Error(
        "base/head package snapshots are required; use --build-isolated or provide both snapshot directories",
      );
    packageSnapshots = await comparePackageSnapshots({
      baseDirectory: baseSnapshotDirectory,
      baseDirectories: baseSnapshotDirectories,
      headDirectory: headSnapshotDirectory,
      expectedVersions,
    });
  } catch (error) {
    return {
      schemaId: "yakit-ui-release-impact/v1",
      status: "BLOCK",
      reason: `package impact evidence is inconclusive: ${error.message}`,
      revisions,
      observedSet: [],
      declaredSet: [],
      impactProbeSet: [],
      snapshots,
    };
  }
  const observedSet = PUBLIC_PACKAGES.filter(
    (name) =>
      stableJson(packageSnapshots[name].base) !==
      stableJson(packageSnapshots[name].head),
  );
  let declaredSet;
  try {
    declaredSet = declaredSetOverride
      ? PUBLIC_PACKAGES.filter((name) => declaredSetOverride.includes(name))
      : declaredPackagesFromChangesets(
          await changedChangesetDocuments({
            root,
            baseRevision: resolvedBaseRevisions[PUBLIC_PACKAGES[0]],
            headRevision,
          }),
        );
  } catch (error) {
    return {
      schemaId: "yakit-ui-release-impact/v1",
      status: "BLOCK",
      reason: `declared release evidence is inconclusive: ${error.message}`,
      revisions,
      observedSet,
      declaredSet: [],
      impactProbeSet: [],
      snapshots,
    };
  }
  const status = exactSet(observedSet, declaredSet) ? "PASS" : "BLOCK";
  const toolchainIdentity = {
    node: process.version,
    pnpm: execFileSync("pnpm", ["--version"], { encoding: "utf8" }).trim(),
    os: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
    },
  };
  const impactProbeSet = [];
  for (const packageName of observedSet) {
    const packageBaseRevision = resolvedBaseRevisions[packageName];
    const sourcePaths =
      packageName === "@yakit-libs/yakit-ui"
        ? ["packages/yakit-ui"]
        : ["packages/yakit-ui-icons", "packages/yakit-ui/src/icons"];
    const [
      baseSourceHash,
      headSourceHash,
      baseLockHash,
      headLockHash,
      baseToolchainHash,
      headToolchainHash,
      baseConfigHash,
      headConfigHash,
    ] = await Promise.all([
      snapshotHash({ root, revision: packageBaseRevision, paths: sourcePaths }),
      snapshotHash({ root, revision: headRevision, paths: sourcePaths }),
      snapshotHash({
        root,
        revision: packageBaseRevision,
        paths: SNAPSHOTS.lock,
      }),
      snapshotHash({ root, revision: headRevision, paths: SNAPSHOTS.lock }),
      snapshotHash({
        root,
        revision: packageBaseRevision,
        paths: SNAPSHOTS.toolchain,
      }),
      snapshotHash({
        root,
        revision: headRevision,
        paths: SNAPSHOTS.toolchain,
      }),
      snapshotHash({
        root,
        revision: packageBaseRevision,
        paths: SNAPSHOTS.config,
      }),
      snapshotHash({ root, revision: headRevision, paths: SNAPSHOTS.config }),
    ]);
    const sourcePair = { base: baseSourceHash, head: headSourceHash };
    impactProbeSet.push({
      package: packageName,
      kind: "impact-probe",
      nonPublishable: true,
      baseRevision: packageBaseRevision,
      headRevision,
      sourceHash: sha256(stableJson(sourcePair)),
      baseSourceHash,
      headSourceHash,
      lockHash: sha256(stableJson({ base: baseLockHash, head: headLockHash })),
      baseLockHash,
      headLockHash,
      toolchainHash: sha256(
        stableJson({ base: baseToolchainHash, head: headToolchainHash }),
      ),
      baseToolchainHash,
      headToolchainHash,
      configHash: sha256(
        stableJson({ base: baseConfigHash, head: headConfigHash }),
      ),
      baseConfigHash,
      headConfigHash,
      packageSnapshotHashes: {
        base: packageSnapshots[packageName].base.contentHash,
        head: packageSnapshots[packageName].head.contentHash,
      },
      toolchainIdentity,
      toolchainIdentityHash: sha256(stableJson(toolchainIdentity)),
      snapshotHash: sha256(
        stableJson({
          packageName,
          baseRevision: packageBaseRevision,
          headRevision,
          packageSnapshots: packageSnapshots[packageName],
          sourcePair,
        }),
      ),
    });
  }
  return {
    schemaId: "yakit-ui-release-impact/v1",
    status,
    reason:
      status === "PASS"
        ? "observed and declared release sets match"
        : `observed ${JSON.stringify(observedSet)} does not exactly match declared ${JSON.stringify(declaredSet)}`,
    revisions,
    observedSet,
    declaredSet,
    impactProbeSet,
    snapshots,
    packageSnapshots,
    toolchainIdentity,
  };
}

export function assertImpactOutputPublishSafe(result) {
  for (const probe of result?.impactProbeSet ?? []) {
    if (probe.kind !== "impact-probe" || probe.nonPublishable !== true)
      throw new Error("invalid impact probe identity");
    if (
      Object.keys(probe).some(
        (key) =>
          key !== "nonPublishable" && /tarball|filename|tgz|publish/i.test(key),
      )
    )
      throw new Error("impact probe contains publishable artifact fields");
    for (const field of [
      "baseSourceHash",
      "headSourceHash",
      "baseLockHash",
      "headLockHash",
      "baseToolchainHash",
      "headToolchainHash",
      "baseConfigHash",
      "headConfigHash",
      "snapshotHash",
      "toolchainIdentityHash",
    ])
      if (!/^[0-9a-f]{64}$/i.test(probe[field] ?? ""))
        throw new Error(`impact probe ${field} is incomplete`);
    if (
      !/^[0-9a-f]{64}$/i.test(probe.packageSnapshotHashes?.base ?? "") ||
      !/^[0-9a-f]{64}$/i.test(probe.packageSnapshotHashes?.head ?? "") ||
      !probe.toolchainIdentity?.node ||
      !probe.toolchainIdentity?.pnpm ||
      !probe.toolchainIdentity?.os?.platform ||
      !probe.toolchainIdentity?.os?.release ||
      !probe.toolchainIdentity?.os?.arch
    )
      throw new Error("impact probe runtime identity is incomplete");
  }
  return result;
}

export function impactProbesForRelease(result, releaseSet) {
  assertImpactOutputPublishSafe(result);
  if (result?.schemaId !== "yakit-ui-release-impact/v1")
    throw new Error("unsupported release impact schema");
  if (result.status !== "PASS")
    throw new Error(
      `release impact gate blocked: ${result.reason ?? "unknown"}`,
    );
  for (const name of ["observedSet", "declaredSet"])
    if (!exactSet(result[name], releaseSet))
      throw new Error(`${name} does not exactly match the packed release set`);
  if (
    !exactSet(
      result.impactProbeSet.map((item) => item.package),
      releaseSet,
    )
  )
    throw new Error("impactProbeSet does not exactly match the release set");
  return result.impactProbeSet;
}

async function main() {
  const args = process.argv.slice(2);
  const value = (name, fallback) => {
    const index = args.indexOf(name);
    return index === -1 ? fallback : args[index + 1];
  };
  const output = value("--output", process.env.RELEASE_IMPACT_OUTPUT);
  let baseRevision = value("--base", process.env.RELEASE_BASE_REVISION);
  const headRevision = value(
    "--head",
    process.env.RELEASE_HEAD_REVISION ?? WORKTREE,
  );
  const publishPlanPath = value(
    "--publish-plan",
    process.env.RELEASE_PUBLISH_PLAN,
  );
  const sourceRef = value("--source-ref", process.env.GITHUB_REF);
  const publishPlan = publishPlanPath
    ? JSON.parse(await readFile(path.resolve(publishPlanPath), "utf8"))
    : undefined;
  const declaredSetOverride = publishPlan
    ? releaseSetFromPublishPlan(publishPlan)
    : undefined;
  const expectedVersions = publishPlan
    ? releaseVersionsFromPublishPlan(publishPlan)
    : {};
  const baseRevisions = args.includes("--from-release-tags")
    ? await resolveReleaseImpactBaselines({ sourceRef })
    : undefined;
  if (!baseRevision && baseRevisions)
    baseRevision = baseRevisions[PUBLIC_PACKAGES[0]];
  let isolated;
  try {
    if (args.includes("--build-isolated")) {
      isolated = baseRevisions
        ? await createIsolatedImpactSnapshots({
            baseRevisions,
            headRevision,
          })
        : await createIsolatedSnapshotPair({
            baseRevision,
            headRevision,
          });
    }
    const result = assertImpactOutputPublishSafe(
      await computeReleaseImpact({
        baseRevision,
        baseRevisions,
        headRevision,
        baseSnapshotDirectory:
          isolated?.baseDirectory ??
          value("--base-snapshot-dir", process.env.RELEASE_BASE_SNAPSHOT_DIR),
        baseSnapshotDirectories: isolated?.baseDirectories,
        headSnapshotDirectory:
          isolated?.headDirectory ??
          value("--head-snapshot-dir", process.env.RELEASE_HEAD_SNAPSHOT_DIR),
        declaredSetOverride,
        expectedVersions,
      }),
    );
    if (!output)
      throw new Error("--output or RELEASE_IMPACT_OUTPUT is required");
    await mkdir(path.dirname(path.resolve(output)), { recursive: true });
    await writeFile(
      path.resolve(output),
      `${JSON.stringify(result, null, 2)}\n`,
      { flag: "wx" },
    );
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "PASS") process.exitCode = 1;
  } finally {
    await isolated?.cleanup();
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  await main();
}
