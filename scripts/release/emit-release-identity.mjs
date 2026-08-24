#!/usr/bin/env node

import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { findSingleTarball } from "./verify-pack-directory.mjs";
import { validateVerificationManifest } from "./verification-manifest.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const verifiedDirectory = path.join(root, ".release/verified");
const manifest = JSON.parse(
  await readFile(
    path.join(verifiedDirectory, "verification-manifest.json"),
    "utf8",
  ),
);
const tarballPath = await findSingleTarball(verifiedDirectory);
await validateVerificationManifest(manifest, {
  tarballPath,
  repository: process.env.GITHUB_REPOSITORY,
  workflowCommitSha: process.env.GITHUB_SHA,
  runId: process.env.GITHUB_RUN_ID,
  sourceRef: process.env.GITHUB_REF,
  packageName: "yakit-ui",
  packArtifactId: process.env.PACK_ARTIFACT_ID,
});

const version = manifest.package.version;
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error("verification manifest contains an invalid package version");
}
const tagName = `${manifest.package.name}@${version}`;
const outputs = {
  "commit-sha": manifest.workflowCommitSha,
  "dist-tag": manifest.package.distTag,
  "package-version": version,
  "tag-name": tagName,
};
if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    Object.entries(outputs)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n") + "\n",
  );
}
console.log(JSON.stringify(outputs, null, 2));
