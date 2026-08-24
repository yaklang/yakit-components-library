#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  findPackageTarball,
  PUBLIC_PACKAGES,
} from "./verify-pack-directory.mjs";
import {
  artifactsForManifest,
  validateVerificationManifest,
} from "./verification-manifest.mjs";

export function classifyPublicationState(artifacts, registryRecords) {
  const missing = [];
  const published = [];
  for (const artifact of artifacts) {
    const record = registryRecords[artifact.package];
    if (!record?.versionExists) {
      if (
        record?.distTagVersion != null &&
        compareSemver(record.distTagVersion, artifact.version) >= 0
      )
        throw new Error(
          `${artifact.package} dist-tag cannot be moved backward to the verified version`,
        );
      missing.push(artifact.package);
      continue;
    }
    if (record.shasum !== record.expectedShasum) {
      throw new Error(
        `${artifact.package}@${artifact.version} exists with a different tarball`,
      );
    }
    if (record.distTagVersion !== artifact.version)
      throw new Error(
        `${artifact.package} dist-tag does not match the verified version`,
      );
    published.push(artifact.package);
  }
  return { missing, published };
}

export function assertRecoveryPlanAllowed(schemaVersion, plan) {
  if (schemaVersion === 1 && plan.missing.length > 0)
    throw new Error(
      "legacy schema-v1 evidence supports metadata recovery only",
    );
}

export function primaryPackageNameForSchema(schemaVersion) {
  return schemaVersion === 1 ? "yakit-ui" : "@yakit-libs/yakit-ui";
}

function parseSemver(version) {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(
      version,
    );
  if (!match) throw new Error(`invalid registry SemVer: ${version}`);
  return {
    core: match.slice(1, 4).map(BigInt),
    prerelease: match[4]?.split(".") ?? [],
  };
}

function compareSemver(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  for (let index = 0; index < a.core.length; index += 1) {
    if (a.core[index] > b.core[index]) return 1;
    if (a.core[index] < b.core[index]) return -1;
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    if (a.prerelease.length === b.prerelease.length) return 0;
    return a.prerelease.length === 0 ? 1 : -1;
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = a.prerelease[index];
    const rightIdentifier = b.prerelease[index];
    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;
    if (leftIdentifier === rightIdentifier) continue;
    const leftNumeric = /^\d+$/.test(leftIdentifier);
    const rightNumeric = /^\d+$/.test(rightIdentifier);
    if (leftNumeric && rightNumeric)
      return BigInt(leftIdentifier) > BigInt(rightIdentifier) ? 1 : -1;
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftIdentifier > rightIdentifier ? 1 : -1;
  }
  return 0;
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function atLeast(actual, minimum) {
  const parts = actual.replace(/^v/, "").split(".").map(Number);
  const expected = minimum.split(".").map(Number);
  for (let index = 0; index < expected.length; index += 1) {
    if ((parts[index] ?? 0) > expected[index]) return true;
    if ((parts[index] ?? 0) < expected[index]) return false;
  }
  return true;
}

async function sha1File(file) {
  const hash = createHash("sha1");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function artifactMetadata(repository, artifactId, token) {
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
  return response.json();
}

async function registryRecord(artifact, tarballPath, distTag) {
  const response = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(artifact.package)}`,
    { headers: { accept: "application/json" } },
  );
  if (response.status === 404)
    return {
      expectedShasum: await sha1File(tarballPath),
      distTagVersion: null,
      shasum: null,
      versionExists: false,
    };
  if (!response.ok)
    throw new Error(
      `${artifact.package} registry lookup failed with HTTP ${response.status}`,
    );
  const metadata = await response.json();
  const version = metadata.versions?.[artifact.version];
  return {
    expectedShasum: await sha1File(tarballPath),
    distTagVersion: metadata["dist-tags"]?.[distTag] ?? null,
    shasum: version?.dist?.shasum?.toLowerCase() ?? null,
    versionExists: Boolean(version),
  };
}

async function writeOutputs(outputs) {
  if (!process.env.GITHUB_OUTPUT) return;
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `${Object.entries(outputs)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n")}\n`,
  );
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname);

if (invokedDirectly) {
  const evidenceDirectory = path.resolve(process.argv[2] ?? "");
  if (!process.argv[2])
    throw new Error(
      "Usage: recover-partial-publication.mjs <evidence-directory> [--publish]",
    );
  const publish = process.argv.includes("--publish");
  const repository = requiredEnvironment("GITHUB_REPOSITORY");
  const sourceRunId = requiredEnvironment("SOURCE_RUN_ID");
  const artifactId = requiredEnvironment("VERIFICATION_ARTIFACT_ID");
  const githubToken = requiredEnvironment("GITHUB_TOKEN");
  const githubArtifact = await artifactMetadata(
    repository,
    artifactId,
    githubToken,
  );
  if (githubArtifact.expired)
    throw new Error("verification artifact has expired");
  const artifactCreatedAt = Date.parse(githubArtifact.created_at ?? "");
  if (
    !Number.isFinite(artifactCreatedAt) ||
    Date.now() - artifactCreatedAt > 14 * 24 * 60 * 60 * 1000
  )
    throw new Error(
      "verification artifact is outside the 14-day recovery window",
    );
  if (String(githubArtifact.workflow_run?.id) !== String(sourceRunId))
    throw new Error("verification artifact belongs to a different source run");

  const manifest = JSON.parse(
    await readFile(
      path.join(evidenceDirectory, "verification-manifest.json"),
      "utf8",
    ),
  );
  if (
    githubArtifact.workflow_run?.head_sha?.toLowerCase() !==
    manifest.workflowCommitSha?.toLowerCase()
  )
    throw new Error(
      "verification evidence commit differs from its source workflow run",
    );
  const primaryPackageName = primaryPackageNameForSchema(
    manifest.schemaVersion,
  );
  const expectedPackages =
    manifest.schemaVersion === 1 ? [primaryPackageName] : PUBLIC_PACKAGES;
  const tarballPaths = Object.fromEntries(
    await Promise.all(
      expectedPackages.map(async (name) => [
        name,
        await findPackageTarball(evidenceDirectory, name),
      ]),
    ),
  );
  await validateVerificationManifest(manifest, {
    expectedPackages,
    packageName: primaryPackageName,
    repository,
    runId: sourceRunId,
    tarballPath: tarballPaths[primaryPackageName],
    tarballPaths,
  });
  const artifacts = artifactsForManifest(manifest);
  const registryRecords = Object.fromEntries(
    await Promise.all(
      artifacts.map(async (artifact) => [
        artifact.package,
        await registryRecord(
          artifact,
          tarballPaths[artifact.package],
          manifest.package.distTag,
        ),
      ]),
    ),
  );
  let plan = classifyPublicationState(artifacts, registryRecords);
  assertRecoveryPlanAllowed(manifest.schemaVersion, plan);

  if (publish && plan.missing.length > 0) {
    if (process.env.GITHUB_ACTIONS !== "true")
      throw new Error(
        "partial publication recovery is restricted to GitHub Actions",
      );
    if (
      !requiredEnvironment("GITHUB_WORKFLOW_REF").includes(
        "/.github/workflows/publish.yml@",
      )
    )
      throw new Error(
        "partial publication recovery is restricted to the publish workflow",
      );
    requiredEnvironment("ACTIONS_ID_TOKEN_REQUEST_URL");
    requiredEnvironment("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
    if (!atLeast(process.version, "22.14.0"))
      throw new Error(
        "npm Trusted Publishing requires Node.js 22.14.0 or newer",
      );
    const npmVersion = execFileSync("npm", ["--version"], {
      encoding: "utf8",
    }).trim();
    if (!atLeast(npmVersion, "11.5.1"))
      throw new Error("npm Trusted Publishing requires npm 11.5.1 or newer");
    for (const packageName of plan.missing) {
      execFileSync(
        "npm",
        [
          "publish",
          tarballPaths[packageName],
          "--access",
          "public",
          "--provenance",
          "--ignore-scripts",
          "--tag",
          manifest.package.distTag,
        ],
        { stdio: "inherit" },
      );
    }
    const refreshedRecords = Object.fromEntries(
      await Promise.all(
        artifacts.map(async (artifact) => [
          artifact.package,
          await registryRecord(
            artifact,
            tarballPaths[artifact.package],
            manifest.package.distTag,
          ),
        ]),
      ),
    );
    plan = classifyPublicationState(artifacts, refreshedRecords);
    if (plan.missing.length > 0)
      throw new Error(
        `packages remain unpublished: ${plan.missing.join(", ")}`,
      );
  }

  const outputs = {
    "commit-sha": manifest.workflowCommitSha,
    "has-missing": String(plan.missing.length > 0),
    "package-name": primaryPackageName,
    "package-version": manifest.package.version,
    "tag-name": `${primaryPackageName}@${manifest.package.version}`,
  };
  await writeOutputs(outputs);
  console.log(JSON.stringify({ ...outputs, ...plan }, null, 2));
}
