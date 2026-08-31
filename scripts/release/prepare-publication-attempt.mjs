#!/usr/bin/env node

import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  createRegistryAbsenceObservation,
  preparePublicationAttempt,
  validatePublicationOutbox,
} from "./publication-consumer.mjs";
import {
  classifyPublicationState,
  registryRecord,
} from "./recover-partial-publication.mjs";
import { findPackageTarball } from "./verify-pack-directory.mjs";
import {
  artifactsForManifest,
  sha256File,
  validateVerificationManifest,
} from "./verification-manifest.mjs";
import { bindPrivateProvenanceResolutionArtifact } from "./private-provenance-recovery.mjs";

async function writeOutputs(outputs) {
  if (!process.env.GITHUB_OUTPUT) return;
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `${Object.entries(outputs)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n")}\n`,
  );
}

const evidenceDirectory = path.resolve(process.argv[2] ?? "");
const stateDirectory = path.resolve(process.argv[3] ?? "");
const inventoryPath = path.resolve(process.argv[4] ?? "");
if (!process.argv[2] || !process.argv[3] || !process.argv[4])
  throw new Error(
    "Usage: prepare-publication-attempt.mjs <evidence-directory> <intent-state-directory> <artifact-inventory> [prior-state-root]",
  );
const manifest = JSON.parse(
  await readFile(
    path.join(evidenceDirectory, "verification-manifest.json"),
    "utf8",
  ),
);
const outboxPath = path.join(evidenceDirectory, "transactional-outbox.json");
const outbox = JSON.parse(await readFile(outboxPath, "utf8"));
const inventoryBytes = await readFile(inventoryPath);
const priorArtifactInventory = JSON.parse(inventoryBytes.toString("utf8"));
const artifacts = artifactsForManifest(manifest);
const tarballPaths = Object.fromEntries(
  await Promise.all(
    artifacts.map(async (artifact) => [
      artifact.package,
      await findPackageTarball(evidenceDirectory, artifact.package),
    ]),
  ),
);
await validateVerificationManifest(manifest, {
  evidenceDirectory,
  expectedPackages: manifest.releaseSet,
  requirePublicationOutbox: true,
  tarballPaths,
});
validatePublicationOutbox(outbox, manifest);

async function observe(release) {
  const artifact = artifacts.find((item) => item.package === release.name);
  const record = await registryRecord(
    artifact,
    tarballPaths[release.name],
    release.distTag,
  );
  const plan = classifyPublicationState([artifact], {
    [release.name]: record,
  });
  return plan.published.length === 1
    ? "APPLIED"
    : createRegistryAbsenceObservation(release, Date.now());
}

function durationEnvironment(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`${name} must be a non-negative integer`);
  return value;
}

const privateProvenanceResolutionPath =
  process.env.PRIVATE_PROVENANCE_RESOLUTION_PATH;
let definitiveNoApplyEvidence;
if (privateProvenanceResolutionPath) {
  if (process.env.AUTHORIZE_PUBLICATION_RETRY !== "true")
    throw new Error(
      "private provenance recovery requires explicit retry authorization",
    );
  definitiveNoApplyEvidence = await bindPrivateProvenanceResolutionArtifact({
    artifactDigest: process.env.PRIVATE_PROVENANCE_RESOLUTION_ARTIFACT_DIGEST,
    artifactId: process.env.PRIVATE_PROVENANCE_RESOLUTION_ARTIFACT_ID,
    currentRunId: process.env.GITHUB_RUN_ID,
    repository: process.env.GITHUB_REPOSITORY,
    resolutionPath: privateProvenanceResolutionPath,
    token: process.env.GITHUB_TOKEN,
  });
}

const result = await preparePublicationAttempt({
  manifest,
  outbox,
  outboxSha256: await sha256File(outboxPath),
  stateDirectory,
  priorStateRoot: process.argv[5] ? path.resolve(process.argv[5]) : undefined,
  priorArtifactInventory,
  retryAuthorizationRequest: {
    authorized: process.env.AUTHORIZE_PUBLICATION_RETRY === "true",
    definitiveNoApplyEvidence,
    intentArtifactId: process.env.RETRY_INTENT_ARTIFACT_ID,
    receiptArtifactId: process.env.RETRY_RECEIPT_ARTIFACT_ID,
  },
  attemptId: `${process.env.GITHUB_RUN_ID ?? "local"}:${process.env.GITHUB_RUN_ATTEMPT ?? "1"}`,
  observe,
  propagationWindowMs: durationEnvironment(
    "PUBLICATION_REGISTRY_PROPAGATION_WINDOW_MS",
    30_000,
  ),
  observationMaxAgeMs: durationEnvironment(
    "PUBLICATION_REGISTRY_OBSERVATION_MAX_AGE_MS",
    300_000,
  ),
});
await writeFile(
  path.join(stateDirectory, "prior-artifact-inventory.json"),
  inventoryBytes,
  { flag: "wx" },
);
await writeOutputs({
  "has-work": String(result.pending.length > 0),
  "already-published": JSON.stringify(result.published),
});
console.log(JSON.stringify(result, null, 2));
