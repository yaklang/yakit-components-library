#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  createVerificationManifest,
  sha256File,
  validateVerificationManifest,
} from "./verification-manifest.mjs";
import { createPublicationOutbox } from "./publication-consumer.mjs";
import { impactProbesForRelease } from "./release-impact.mjs";
import { verifyPackDirectory } from "./verify-pack-directory.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const PUBLIC_PACKAGES = ["@yakit-libs/yakit-ui", "@yakit-libs/yakit-ui-icons"];

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

async function resolveCompatibilityBaseline(packageName, distTag) {
  const response = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
    { headers: { accept: "application/json" } },
  );
  if (!response.ok)
    throw new Error(
      `counterpart baseline lookup for ${packageName} failed with HTTP ${response.status}`,
    );
  const metadata = await response.json();
  const version = metadata["dist-tags"]?.[distTag];
  if (!version)
    throw new Error(
      `counterpart baseline ${packageName} has no ${distTag} dist-tag; no implicit fallback is allowed`,
    );
  const published = metadata.versions?.[version];
  const resolved = published?.dist?.tarball;
  const integrity = published?.dist?.integrity;
  if (!resolved || !integrity)
    throw new Error(
      `counterpart baseline ${packageName}@${version} has incomplete registry identity`,
    );
  const tarball = await fetch(resolved);
  if (!tarball.ok)
    throw new Error(
      `counterpart baseline download failed with HTTP ${tarball.status}`,
    );
  const bytes = Buffer.from(await tarball.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const filename = `baseline-${packageName.split("/").at(-1)}-${version}.tgz`;
  return {
    bytes,
    identity: {
      package: packageName,
      version,
      distTag,
      resolved,
      integrity,
      sha256,
      filename,
      packedBytes: bytes.length,
      cacheKey: `${packageName}@${version}:${sha256}`,
    },
  };
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
const packageManifests = new Map(
  packDirectoryResult.packages.map((item) => [
    item.package,
    JSON.parse(
      execFileSync("tar", ["-xOzf", item.tarball, "package/package.json"], {
        encoding: "utf8",
      }),
    ),
  ]),
);
for (const item of packDirectoryResult.packages) {
  const packageManifest = packageManifests.get(item.package);
  if (packageManifest.name !== item.package || packageManifest.private === true)
    throw new Error(
      `Changesets artifact contains an invalid public package ${item.package}`,
    );
  if (
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageManifest.version ?? "")
  )
    throw new Error(
      `Changesets artifact contains an invalid version for ${item.package}`,
    );
}

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
const distTags = Object.fromEntries(
  await Promise.all(
    packDirectoryResult.packages.map(async (item) => [
      item.package,
      await resolveDistTag(
        packageManifests.get(item.package).version,
        sourceRef,
      ),
    ]),
  ),
);
const releaseSet = packDirectoryResult.packages.map((item) => item.package);
const impactOutputPath = path.resolve(
  requiredEnvironment("RELEASE_IMPACT_OUTPUT"),
);
const impactProbeSet = impactProbesForRelease(
  JSON.parse(await readFile(impactOutputPath, "utf8")),
  releaseSet,
);
const compatibilityBaselineDownloads =
  releaseSet.length === 1
    ? [
        await resolveCompatibilityBaseline(
          PUBLIC_PACKAGES.find((name) => !releaseSet.includes(name)),
          distTags[releaseSet[0]],
        ),
      ]
    : [];
const compatibilityBaselineSet = compatibilityBaselineDownloads.map(
  (item) => item.identity,
);
const manifest = await createVerificationManifest({
  repository,
  workflowCommitSha,
  runId,
  runAttempt,
  sourceRef,
  packArtifactId,
  packArtifactDigest: artifact.digest,
  releaseSet,
  impactProbeSet,
  compatibilityBaselineSet,
  artifacts: packDirectoryResult.packages.map((item) => ({
    package: item.package,
    version: item.version,
    tarballPath: item.tarball,
    distTag: distTags[item.package],
    unpackedBytes: item.unpackedBytes,
    fileCount: item.fileCount,
  })),
  gates: {
    build: "passed",
    packagePolicy: "passed",
    storybook: "passed",
  },
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
for (const baseline of compatibilityBaselineDownloads) {
  await writeFile(
    path.join(outputDirectory, baseline.identity.filename),
    baseline.bytes,
    { flag: "wx" },
  );
}
const outboxPath = path.join(outputDirectory, "transactional-outbox.json");
await writeFile(
  outboxPath,
  `${JSON.stringify(createPublicationOutbox(manifest), null, 2)}\n`,
  { flag: "wx" },
);
manifest.publicationOutbox = {
  filename: path.basename(outboxPath),
  sha256: await sha256File(outboxPath),
};
await validateVerificationManifest(manifest, {
  allowDraft: true,
  evidenceDirectory: outputDirectory,
  repository,
  workflowCommitSha,
  runId,
  sourceRef,
  packArtifactId,
  expectedPackages: manifest.releaseSet,
  tarballPaths: Object.fromEntries(
    packDirectoryResult.packages.map((item) => [
      item.package,
      path.join(outputDirectory, path.basename(item.tarball)),
    ]),
  ),
});
await writeFile(
  path.join(outputDirectory, "verification-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { flag: "wx" },
);

console.log(
  JSON.stringify(
    {
      artifactId: packArtifactId,
      releaseSet: manifest.releaseSet,
      packages: manifest.releases.map((item) => item.identity),
    },
    null,
    2,
  ),
);
