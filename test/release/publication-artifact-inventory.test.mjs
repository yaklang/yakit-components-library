import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { downloadPublicationArtifacts } from "../../scripts/release/download-publication-artifacts.mjs";
import { inventoryPublicationArtifacts } from "../../scripts/release/inventory-publication-artifacts.mjs";

const repository = "yaklang/yakit-components-library";
const digest = (character) => `sha256:${character.repeat(64)}`;

function apiArtifact(id, name, runId) {
  return {
    id,
    name,
    digest: digest("a"),
    expired: false,
    created_at: "2026-08-31T00:00:00Z",
    workflow_run: { id: runId },
  };
}

test("inventory paginates all artifacts and finds source plus recovery runs", async () => {
  const unrelated = Array.from({ length: 100 }, (_, index) =>
    apiArtifact(index + 1, `unrelated-${index}`, 7),
  );
  const relevant = [
    apiArtifact(101, "yakit-ui-publish-intent-42-1", 42),
    apiArtifact(102, "yakit-ui-recovery-receipt-42-99-1", 99),
  ];
  const endpoints = [];
  const result = await inventoryPublicationArtifacts({
    repository,
    sourceRunId: "42",
    token: "fixture",
    request: async (_repository, endpoint) => {
      endpoints.push(endpoint);
      if (/[?&]page=1(?:&|$)/.test(endpoint))
        return { total_count: 102, artifacts: unrelated };
      if (/[?&]page=2(?:&|$)/.test(endpoint))
        return { total_count: 102, artifacts: relevant };
      const runId = endpoint.split("/").at(-1);
      return {
        id: Number(runId),
        path: ".github/workflows/publish.yml",
        repository: { full_name: repository },
      };
    },
  });
  assert.equal(result.enumeratedArtifactCount, 102);
  assert.deepEqual(
    result.artifacts.map((artifact) => artifact.id),
    ["101", "102"],
  );
  assert.ok(endpoints.some((endpoint) => endpoint.includes("page=2")));
  assert.ok(endpoints.includes("/actions/runs/42"));
  assert.ok(endpoints.includes("/actions/runs/99"));
});

test("inventory enumeration failure and incomplete pagination block", async () => {
  await assert.rejects(
    () =>
      inventoryPublicationArtifacts({
        repository,
        sourceRunId: "42",
        token: "fixture",
        request: async (_repository, endpoint) => {
          if (/[?&]page=1(?:&|$)/.test(endpoint))
            return {
              total_count: 101,
              artifacts: Array.from({ length: 100 }, (_, index) =>
                apiArtifact(index + 1, `unrelated-${index}`, 7),
              ),
            };
          throw new Error("pagination unavailable");
        },
      }),
    /pagination unavailable/,
  );
  await assert.rejects(
    () =>
      inventoryPublicationArtifacts({
        repository,
        sourceRunId: "42",
        token: "fixture",
        request: async (_repository, endpoint) =>
          /[?&]page=1(?:&|$)/.test(endpoint)
            ? {
                total_count: 101,
                artifacts: Array.from({ length: 100 }, (_, index) =>
                  apiArtifact(index + 1, `unrelated-${index}`, 7),
                ),
              }
            : { total_count: 101, artifacts: [] },
      }),
    /pagination ended early/,
  );
});

test("exact artifact download failure and digest mismatch block", async () => {
  const outputRoot = await mkdtemp(
    path.join(tmpdir(), "publication-download-"),
  );
  const inventory = {
    schemaId: "yakit-ui-publication-artifact-inventory/v1",
    repository,
    artifacts: [
      {
        id: "101",
        name: "yakit-ui-publish-intent-42-1",
        digest: digest("a"),
      },
    ],
  };
  await assert.rejects(
    () =>
      downloadPublicationArtifacts({
        inventory,
        outputRoot,
        repository,
        token: "fixture",
        request: async () => ({ ok: false, status: 503 }),
        extract: async () => assert.fail("must not extract"),
      }),
    /download failed with HTTP 503/,
  );
  await assert.rejects(
    () =>
      downloadPublicationArtifacts({
        inventory,
        outputRoot,
        repository,
        token: "fixture",
        request: async () => ({
          ok: true,
          arrayBuffer: async () => Buffer.from("wrong"),
        }),
        extract: async () => assert.fail("must not extract"),
      }),
    /digest mismatch/,
  );
});
