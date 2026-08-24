#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { findSingleTarball } from "./verify-pack-directory.mjs";
import { validateVerificationManifest } from "./verification-manifest.mjs";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
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

async function sha1File(file) {
  const hash = createHash("sha1");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

const evidenceDirectory = path.resolve(process.argv[2] ?? "");
if (!process.argv[2])
  throw new Error("Usage: verify-recovery-evidence.mjs <evidence-directory>");
const repository = requiredEnvironment("GITHUB_REPOSITORY");
const sourceRunId = requiredEnvironment("SOURCE_RUN_ID");
const artifactId = requiredEnvironment("VERIFICATION_ARTIFACT_ID");
const githubToken = requiredEnvironment("GITHUB_TOKEN");
const artifact = await artifactMetadata(repository, artifactId, githubToken);
if (artifact.expired) throw new Error("verification artifact has expired");
if (String(artifact.workflow_run?.id) !== String(sourceRunId)) {
  throw new Error("verification artifact belongs to a different source run");
}
const createdAt = Date.parse(artifact.created_at ?? "");
if (
  !Number.isFinite(createdAt) ||
  Date.now() - createdAt > 14 * 24 * 60 * 60 * 1000
) {
  throw new Error(
    "verification artifact is outside the 14-day automated recovery window",
  );
}

const manifest = JSON.parse(
  await readFile(
    path.join(evidenceDirectory, "verification-manifest.json"),
    "utf8",
  ),
);
const tarballPath = await findSingleTarball(evidenceDirectory);
await validateVerificationManifest(manifest, {
  tarballPath,
  repository,
  runId: sourceRunId,
  packageName: "yakit-ui",
});

execFileSync(
  "git",
  ["cat-file", "-e", `${manifest.workflowCommitSha}^{commit}`],
  {
    encoding: "utf8",
    stdio: ["ignore", "ignore", "pipe"],
  },
);
const registryResponse = await fetch(
  `https://registry.npmjs.org/${encodeURIComponent(manifest.package.name)}`,
  { headers: { accept: "application/json" } },
);
if (!registryResponse.ok)
  throw new Error(
    `npm registry lookup failed with HTTP ${registryResponse.status}`,
  );
const registry = await registryResponse.json();
const registryVersion = registry.versions?.[manifest.package.version];
if (!registryVersion)
  throw new Error("verified package version is absent from npm");
if (
  !/^[0-9a-f]{40}$/i.test(registryVersion.dist?.shasum ?? "") ||
  registryVersion.dist.shasum.toLowerCase() !== (await sha1File(tarballPath))
) {
  throw new Error("npm registry tarball does not match verified evidence");
}
if (
  registry["dist-tags"]?.[manifest.package.distTag] !== manifest.package.version
) {
  throw new Error(
    "npm dist-tag no longer matches the verified package version",
  );
}

const outputs = {
  "commit-sha": manifest.workflowCommitSha,
  "package-version": manifest.package.version,
  "tag-name": `${manifest.package.name}@${manifest.package.version}`,
};
if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    Object.entries(outputs)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n") + "\n",
  );
}
console.log(JSON.stringify({ artifactId, sourceRunId, ...outputs }, null, 2));
