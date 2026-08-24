#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  findPackageTarball,
  PUBLIC_PACKAGES,
} from "./verify-pack-directory.mjs";
import { validateVerificationManifest } from "./verification-manifest.mjs";

const root = path.resolve(import.meta.dirname, "../..");

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

if (process.env.GITHUB_ACTIONS !== "true")
  throw new Error("publish is restricted to GitHub Actions");
if (
  !requiredEnvironment("GITHUB_WORKFLOW_REF").includes(
    "/.github/workflows/publish.yml@",
  )
) {
  throw new Error("publish is restricted to the reviewed publish workflow");
}
requiredEnvironment("ACTIONS_ID_TOKEN_REQUEST_URL");
requiredEnvironment("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
if (!atLeast(process.version, "22.14.0"))
  throw new Error("npm Trusted Publishing requires Node.js 22.14.0 or newer");
const npmVersion = execFileSync("npm", ["--version"], {
  encoding: "utf8",
}).trim();
if (!atLeast(npmVersion, "11.5.1"))
  throw new Error("npm Trusted Publishing requires npm 11.5.1 or newer");

const repository = requiredEnvironment("GITHUB_REPOSITORY");
const verificationArtifactId = requiredEnvironment("VERIFICATION_ARTIFACT_ID");
const verificationArtifactDigest = requiredEnvironment(
  "VERIFICATION_ARTIFACT_DIGEST",
);
const packArtifactId = requiredEnvironment("PACK_ARTIFACT_ID");
const githubToken = requiredEnvironment("GITHUB_TOKEN");
const verifiedDirectory = path.join(root, ".release/verified");
const tarballPaths = Object.fromEntries(
  await Promise.all(
    PUBLIC_PACKAGES.map(async (name) => [
      name,
      await findPackageTarball(verifiedDirectory, name),
    ]),
  ),
);
const tarballPath = tarballPaths["yakit-ui"];
const manifest = JSON.parse(
  await readFile(
    path.join(verifiedDirectory, "verification-manifest.json"),
    "utf8",
  ),
);
await validateVerificationManifest(manifest, {
  tarballPath,
  repository,
  workflowCommitSha: requiredEnvironment("GITHUB_SHA"),
  runId: requiredEnvironment("GITHUB_RUN_ID"),
  sourceRef: requiredEnvironment("GITHUB_REF"),
  packageName: "yakit-ui",
  packArtifactId,
  requiredSchemaVersion: 2,
  expectedPackages: PUBLIC_PACKAGES,
  tarballPaths,
});

const [verificationArtifact, packArtifact] = await Promise.all([
  artifactMetadata(repository, verificationArtifactId, githubToken),
  artifactMetadata(repository, packArtifactId, githubToken),
]);
if (verificationArtifact.expired || packArtifact.expired)
  throw new Error("release artifact has expired");
if (verificationArtifact.digest !== verificationArtifactDigest) {
  throw new Error("verification artifact digest mismatch");
}
if (packArtifact.digest !== manifest.packArtifact.digest)
  throw new Error("pack artifact digest mismatch");
if (
  String(packArtifact.workflow_run?.id) !== String(process.env.GITHUB_RUN_ID)
) {
  throw new Error("pack artifact belongs to a different workflow run");
}

console.log(
  JSON.stringify(
    {
      npmVersion,
      nodeVersion: process.version,
      packages: manifest.artifacts.map(
        (item) => `${item.package}@${item.version}`,
      ),
      packArtifactId,
      verificationArtifactId,
    },
    null,
    2,
  ),
);
