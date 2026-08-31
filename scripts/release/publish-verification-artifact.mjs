#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  dispatchPreparedPublication,
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

function normalizedArtifactDigest(value) {
  if (/^sha256:[0-9a-f]{64}$/i.test(value)) return value.toLowerCase();
  if (/^[0-9a-f]{64}$/i.test(value)) return `sha256:${value.toLowerCase()}`;
  throw new Error("publication intent artifact digest is invalid");
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

const evidenceDirectory = path.resolve(process.argv[2] ?? "");
const intentDirectory = path.resolve(process.argv[3] ?? "");
const receiptDirectory = path.resolve(process.argv[4] ?? "");
if (!process.argv[2] || !process.argv[3] || !process.argv[4])
  throw new Error(
    "Usage: publish-verification-artifact.mjs <evidence-directory> <durable-intent-directory> <receipt-state-directory>",
  );
if (process.env.GITHUB_ACTIONS !== "true")
  throw new Error("publication is restricted to GitHub Actions");
if (
  !requiredEnvironment("GITHUB_WORKFLOW_REF").includes(
    "/.github/workflows/publish.yml@",
  )
)
  throw new Error("publication is restricted to the reviewed publish workflow");
requiredEnvironment("ACTIONS_ID_TOKEN_REQUEST_URL");
requiredEnvironment("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
if (!atLeast(process.version, "22.14.0"))
  throw new Error("npm Trusted Publishing requires Node.js 22.14.0 or newer");
const npmVersion = execFileSync("npm", ["--version"], {
  encoding: "utf8",
}).trim();
if (!atLeast(npmVersion, "11.5.1"))
  throw new Error("npm Trusted Publishing requires npm 11.5.1 or newer");

const manifest = JSON.parse(
  await readFile(
    path.join(evidenceDirectory, "verification-manifest.json"),
    "utf8",
  ),
);
const outboxPath = path.join(evidenceDirectory, "transactional-outbox.json");
const outbox = JSON.parse(await readFile(outboxPath, "utf8"));
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
      `publication intent artifact lookup failed with HTTP ${response.status}`,
    );
  return response.json();
}

const intentArtifactId = requiredEnvironment("PUBLICATION_INTENT_ARTIFACT_ID");
const intentArtifactDigest = normalizedArtifactDigest(
  requiredEnvironment("PUBLICATION_INTENT_ARTIFACT_DIGEST"),
);
const intentArtifact = await artifactMetadata(
  requiredEnvironment("GITHUB_REPOSITORY"),
  intentArtifactId,
  requiredEnvironment("GITHUB_TOKEN"),
);
const normalizedIntentArtifactDigest = intentArtifactDigest.startsWith(
  "sha256:",
)
  ? intentArtifactDigest
  : `sha256:${intentArtifactDigest}`;
if (
  String(intentArtifact.id) !== String(intentArtifactId) ||
  intentArtifact.expired ||
  intentArtifact.digest !== normalizedIntentArtifactDigest
)
  throw new Error("durable publication intent artifact identity mismatch");
if (
  String(intentArtifact.workflow_run?.id) !== String(process.env.GITHUB_RUN_ID)
)
  throw new Error(
    "durable publication intent belongs to a different workflow run",
  );

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
  return plan.published.length === 1 ? "APPLIED" : "NOT_APPLIED";
}

async function observeAfterPublish(release) {
  const delays = [0, 1_000, 2_000, 4_000, 8_000, 8_000];
  for (const delay of delays) {
    if (delay > 0)
      await new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
    const observed = await observe(release);
    if (observed === "APPLIED") return observed;
  }
  return "NOT_APPLIED";
}

async function publish(release) {
  try {
    execFileSync(
      "npm",
      [
        "publish",
        tarballPaths[release.name],
        "--access",
        "public",
        "--ignore-scripts",
        "--tag",
        release.distTag,
      ],
      { stdio: "inherit" },
    );
  } catch (error) {
    if (error?.status == null && ["ENOENT", "EACCES"].includes(error?.code))
      error.publicationOutcome = "NOT_ATTEMPTED";
    throw error;
  }
}

const result = await dispatchPreparedPublication({
  manifest,
  outbox,
  outboxSha256: await sha256File(outboxPath),
  intentDirectory,
  receiptDirectory,
  intentArtifactIdentity: {
    id: String(intentArtifactId),
    digest: intentArtifactDigest,
  },
  observe,
  observeAfterPublish,
  publish,
});
await writeOutputs({
  published: "true",
  "published-packages": JSON.stringify(result.published),
});
console.log(JSON.stringify(result, null, 2));
