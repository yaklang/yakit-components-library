#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { constants } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  createVerificationManifest,
  validateVerificationManifest,
} from "./verification-manifest.mjs";
import {
  PUBLIC_PACKAGES,
  verifyPackDirectory,
} from "./verify-pack-directory.mjs";

const root = path.resolve(import.meta.dirname, "../..");

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function readArtifactMetadata(repository, artifactId, token) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/actions/artifacts/${encodeURIComponent(artifactId)}`,
    {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
      },
    },
  );
  if (!response.ok)
    throw new Error(
      `GitHub artifact lookup failed with HTTP ${response.status}`,
    );
  const artifact = await response.json();
  if (String(artifact.id) !== String(artifactId))
    throw new Error("GitHub artifact ID mismatch");
  if (artifact.expired) throw new Error("Changesets pack artifact has expired");
  if (!/^sha256:[0-9a-f]{64}$/i.test(artifact.digest ?? "")) {
    throw new Error("Changesets pack artifact has no valid GitHub digest");
  }
  return artifact;
}

async function resolveDistTag(version, sourceRef) {
  if (sourceRef === "refs/heads/main") {
    if (version.includes("-"))
      throw new Error("main may only release a stable package version");
    return "latest";
  }
  const prefix = "refs/heads/pre/";
  if (!sourceRef.startsWith(prefix))
    throw new Error(`unsupported release ref: ${sourceRef}`);
  const branchTag = sourceRef.slice(prefix.length);
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(branchTag))
    throw new Error("invalid prerelease branch tag");
  const preState = JSON.parse(
    await readFile(path.join(root, ".changeset/pre.json"), "utf8"),
  );
  if (preState.mode !== "pre" || preState.tag !== branchTag) {
    throw new Error(
      "Changesets prerelease state does not match the release branch",
    );
  }
  if (
    !new RegExp(
      `-${branchTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.\\d+$`,
    ).test(version)
  ) {
    throw new Error(
      `package version ${version} does not match prerelease tag ${branchTag}`,
    );
  }
  return branchTag;
}

const packDirectory = path.resolve(requiredEnvironment("PACK_DIRECTORY"));
const packArtifactId = requiredEnvironment("PACK_ARTIFACT_ID");
const repository = requiredEnvironment("GITHUB_REPOSITORY");
const workflowCommitSha = requiredEnvironment("GITHUB_SHA");
const runId = requiredEnvironment("GITHUB_RUN_ID");
const runAttempt = requiredEnvironment("GITHUB_RUN_ATTEMPT");
const sourceRef = requiredEnvironment("GITHUB_REF");
const githubToken = requiredEnvironment("GITHUB_TOKEN");

const packDirectoryResult = await verifyPackDirectory({
  directory: packDirectory,
});
const packByName = new Map(
  packDirectoryResult.packages.map((item) => [item.package, item]),
);
const pack = packByName.get("@yakit-libs/yakit-ui");
const iconsPack = packByName.get("@yakit-libs/yakit-ui-icons");
const packageManifest = JSON.parse(
  execFileSync("tar", ["-xOzf", pack.tarball, "package/package.json"], {
    encoding: "utf8",
  }),
);
const iconsManifest = JSON.parse(
  execFileSync("tar", ["-xOzf", iconsPack.tarball, "package/package.json"], {
    encoding: "utf8",
  }),
);
if (
  packageManifest.name !== "@yakit-libs/yakit-ui" ||
  packageManifest.private === true
) {
  throw new Error(
    "Changesets artifact must contain the public @yakit-libs/yakit-ui package",
  );
}
if (
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageManifest.version ?? "")
) {
  throw new Error("Changesets artifact contains an invalid package version");
}
if (
  iconsManifest.name !== "@yakit-libs/yakit-ui-icons" ||
  iconsManifest.private === true
)
  throw new Error(
    "Changesets artifact must contain the public @yakit-libs/yakit-ui-icons package",
  );
if (iconsManifest.version !== packageManifest.version)
  throw new Error("fixed release packages must have the same version");

const artifact = await readArtifactMetadata(
  repository,
  packArtifactId,
  githubToken,
);
if (artifact.workflow_run?.id && String(artifact.workflow_run.id) !== runId) {
  throw new Error(
    "Changesets pack artifact belongs to a different workflow run",
  );
}
const distTag = await resolveDistTag(packageManifest.version, sourceRef);
const manifest = await createVerificationManifest({
  tarballPath: pack.tarball,
  repository,
  workflowCommitSha,
  runId,
  runAttempt,
  sourceRef,
  packageName: packageManifest.name,
  packageVersion: packageManifest.version,
  distTag,
  packArtifactId,
  packArtifactDigest: artifact.digest,
  unpackedBytes: pack.unpackedBytes,
  fileCount: pack.fileCount,
  artifacts: packDirectoryResult.packages.map((item) => ({
    package: item.package,
    version: item.version,
    filename: path.basename(item.tarball),
    sha256: item.sha256,
    packedBytes: item.packedBytes,
    unpackedBytes: item.unpackedBytes,
    fileCount: item.fileCount,
  })),
  gates: {
    build: "passed",
    consumer: "passed",
    packagePolicy: "passed",
    storybook: "passed",
  },
});
await validateVerificationManifest(manifest, {
  tarballPath: pack.tarball,
  repository,
  workflowCommitSha,
  runId,
  sourceRef,
  packageName: "@yakit-libs/yakit-ui",
  packageVersion: packageManifest.version,
  distTag,
  packArtifactId,
  requiredSchemaVersion: 2,
  expectedPackages: PUBLIC_PACKAGES,
  tarballPaths: Object.fromEntries(
    packDirectoryResult.packages.map((item) => [item.package, item.tarball]),
  ),
});

const outputDirectory = path.join(root, ".release/verified");
await mkdir(outputDirectory, { recursive: true });
for (const item of packDirectoryResult.packages) {
  await copyFile(
    item.tarball,
    path.join(outputDirectory, path.basename(item.tarball)),
    constants.COPYFILE_EXCL,
  );
}
await writeFile(
  path.join(outputDirectory, "verification-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { flag: "wx" },
);

console.log(
  JSON.stringify(
    {
      artifactId: packArtifactId,
      distTag,
      package: `${packageManifest.name}@${packageManifest.version}`,
      tarballSha256: manifest.tarball.sha256,
      packages: manifest.artifacts.map(
        (item) => `${item.package}@${item.version}`,
      ),
    },
    null,
    2,
  ),
);
