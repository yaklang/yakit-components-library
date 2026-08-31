#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { findPackageTarball } from "./verify-pack-directory.mjs";
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
if (!/^(?:sha256:)?[0-9a-f]{64}$/i.test(verificationArtifactDigest))
  throw new Error("verification artifact digest is invalid");
const normalizedVerificationArtifactDigest = /^sha256:/i.test(
  verificationArtifactDigest,
)
  ? verificationArtifactDigest.toLowerCase()
  : `sha256:${verificationArtifactDigest.toLowerCase()}`;
const packArtifactId = requiredEnvironment("PACK_ARTIFACT_ID");
const githubToken = requiredEnvironment("GITHUB_TOKEN");
const verifiedDirectory = path.join(root, ".release/verified");
const manifest = JSON.parse(
  await readFile(
    path.join(verifiedDirectory, "verification-manifest.json"),
    "utf8",
  ),
);
const tarballPaths = Object.fromEntries(
  await Promise.all(
    manifest.releaseSet.map(async (name) => [
      name,
      await findPackageTarball(verifiedDirectory, name),
    ]),
  ),
);
await validateVerificationManifest(manifest, {
  evidenceDirectory: verifiedDirectory,
  repository,
  workflowCommitSha: requiredEnvironment("GITHUB_SHA"),
  runId: requiredEnvironment("GITHUB_RUN_ID"),
  sourceRef: requiredEnvironment("GITHUB_REF"),
  packArtifactId,
  expectedPackages: manifest.releaseSet,
  requirePublicationOutbox: true,
  tarballPaths,
});

const [verificationArtifact, packArtifact] = await Promise.all([
  artifactMetadata(repository, verificationArtifactId, githubToken),
  artifactMetadata(repository, packArtifactId, githubToken),
]);
if (verificationArtifact.expired || packArtifact.expired)
  throw new Error("release artifact has expired");
if (verificationArtifact.digest !== normalizedVerificationArtifactDigest) {
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
      packages: manifest.releases.map((item) => item.identity),
      packArtifactId,
      verificationArtifactId,
    },
    null,
    2,
  ),
);
