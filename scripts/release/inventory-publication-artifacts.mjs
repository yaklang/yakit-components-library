#!/usr/bin/env node

import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function normalizedDigest(value) {
  if (/^sha256:[0-9a-f]{64}$/i.test(value ?? "")) return value.toLowerCase();
  if (/^[0-9a-f]{64}$/i.test(value ?? ""))
    return `sha256:${value.toLowerCase()}`;
  throw new Error("publication state artifact has no valid SHA-256 digest");
}

async function githubJson(repository, endpoint, token) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}${endpoint}`,
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
      `GitHub publication inventory failed for ${endpoint}: HTTP ${response.status}`,
    );
  return response.json();
}

export async function inventoryPublicationArtifacts({
  repository,
  sourceRunId,
  token,
  request = githubJson,
}) {
  const artifacts = [];
  let totalCount;
  for (let page = 1; page <= 1000; page += 1) {
    const response = await request(
      repository,
      `/actions/artifacts?per_page=100&page=${page}`,
      token,
    );
    if (
      !Number.isSafeInteger(response?.total_count) ||
      !Array.isArray(response?.artifacts)
    )
      throw new Error(
        "GitHub publication artifact inventory response is incomplete",
      );
    totalCount ??= response.total_count;
    if (response.total_count !== totalCount)
      throw new Error(
        "GitHub publication artifact inventory changed during pagination",
      );
    artifacts.push(...response.artifacts);
    if (artifacts.length >= totalCount) break;
    if (response.artifacts.length === 0)
      throw new Error(
        "GitHub publication artifact inventory pagination ended early",
      );
  }
  const unique = new Map(
    artifacts.map((artifact) => [String(artifact.id), artifact]),
  );
  if (unique.size !== totalCount)
    throw new Error(
      `GitHub publication artifact inventory is incomplete: expected ${totalCount}, got ${unique.size}`,
    );

  const escaped = String(sourceRunId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const namePattern = new RegExp(
    `^yakit-ui-(?:publish|recovery)-(?:intent|receipt)-${escaped}-(?:[0-9]+-)?[0-9]+$`,
  );
  const relevant = [...unique.values()].filter((artifact) =>
    namePattern.test(artifact.name ?? ""),
  );
  const runIds = [
    ...new Set(
      relevant.map((artifact) => String(artifact.workflow_run?.id ?? "")),
    ),
  ];
  if (runIds.includes(""))
    throw new Error(
      "publication state artifact is missing its producer workflow run",
    );
  const runs = new Map(
    await Promise.all(
      runIds.map(async (runId) => [
        runId,
        await request(
          repository,
          `/actions/runs/${encodeURIComponent(runId)}`,
          token,
        ),
      ]),
    ),
  );
  const records = relevant
    .map((artifact) => {
      const run = runs.get(String(artifact.workflow_run.id));
      if (
        run?.path !== ".github/workflows/publish.yml" ||
        run?.repository?.full_name !== repository
      )
        throw new Error(
          `publication state artifact ${artifact.id} has an untrusted producer`,
        );
      if (artifact.expired)
        throw new Error(
          `publication state artifact ${artifact.id} has expired`,
        );
      return {
        id: String(artifact.id),
        name: artifact.name,
        digest: normalizedDigest(artifact.digest),
        workflowRunId: String(artifact.workflow_run.id),
        producerPath: run.path,
        createdAt: artifact.created_at,
      };
    })
    .sort((left, right) => Number(left.id) - Number(right.id));
  return {
    schemaId: "yakit-ui-publication-artifact-inventory/v1",
    schemaVersion: 1,
    repository,
    sourceRunId: String(sourceRunId),
    enumeratedArtifactCount: totalCount,
    relevantArtifactCount: records.length,
    artifacts: records,
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
  const outputPath = path.resolve(process.argv[3] ?? "");
  if (!process.argv[2] || !process.argv[3])
    throw new Error(
      "Usage: inventory-publication-artifacts.mjs <evidence-directory> <inventory-output>",
    );
  const manifest = JSON.parse(
    await readFile(
      path.join(evidenceDirectory, "verification-manifest.json"),
      "utf8",
    ),
  );
  const inventory = await inventoryPublicationArtifacts({
    repository: requiredEnvironment("GITHUB_REPOSITORY"),
    sourceRunId: manifest.runId,
    token: requiredEnvironment("GITHUB_TOKEN"),
  });
  await writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`, {
    flag: "wx",
  });
  await writeOutputs({
    "artifact-ids": inventory.artifacts
      .map((artifact) => artifact.id)
      .join(","),
    "has-artifacts": String(inventory.artifacts.length > 0),
  });
  console.log(JSON.stringify(inventory, null, 2));
}
