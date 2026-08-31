import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  createPrivateProvenanceAuthorizedPublish,
  PRIVATE_PROVENANCE_REJECTION_SCHEMA,
  readPrivateProvenanceIncidentPolicy,
  resolvePrivateProvenanceIncident,
  validatePrivateProvenanceIncidentPolicy,
  validatePrivateProvenanceResolution,
} from "../../scripts/release/private-provenance-recovery.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function policyFixture() {
  const policy = structuredClone(await readPrivateProvenanceIncidentPolicy());
  const sourceBytes = Buffer.from("reviewed sequential publication source");
  policy.sourceConsumer = {
    ...policy.sourceConsumer,
    blobSha: "a".repeat(40),
    sha256: sha256(sourceBytes),
  };
  return { policy, sourceBytes };
}

function cutoverEvidence(policy) {
  const releases = policy.releaseSet.map((release) => ({
    name: release.name,
    version: release.version,
    identity: release.identity,
    tarball: {
      filename: release.tarballFilename,
      sha256: release.tarballSha256,
      integrity: release.integrity,
    },
  }));
  return {
    schemaId: "yakit-ui-release-cutover-evidence/v2",
    inventory: {
      refs: [],
      runs: [
        {
          id: policy.source.runId,
          sourceRef: policy.source.sourceRef,
          headSha: policy.source.headSha,
          conclusion: "failure",
          workflowPath: ".github/workflows/publish.yml",
          disposition: "inconclusive",
        },
        { id: "current", disposition: "recoverable" },
      ],
      artifacts: [
        {
          id: policy.artifacts.verification.id,
          kind: "verification",
          digest: policy.artifacts.verification.digest,
          headSha: policy.source.headSha,
          workflowRunId: policy.source.runId,
          disposition: "recoverable",
          strictValidation: { status: "passed" },
          jsonDocuments: {
            "verification-manifest.json": {
              value: {
                workflowCommitSha: policy.source.headSha,
                runId: policy.source.runId,
                releaseSet: policy.releaseSet.map((release) => release.name),
                releases,
                publicationOutbox: { sha256: policy.outboxSha256 },
              },
            },
            "transactional-outbox.json": {
              value: { sourceRunId: policy.source.runId },
            },
          },
        },
        {
          id: policy.artifacts.intent.id,
          kind: "publish-intent",
          digest: policy.artifacts.intent.digest,
          headSha: policy.source.headSha,
          workflowRunId: policy.source.runId,
          disposition: "recoverable",
          strictValidation: { status: "passed" },
          jsonDocuments: {
            "lifecycle-snapshot.json": {
              value: { outboxSha256: policy.outboxSha256 },
            },
          },
        },
        {
          id: policy.artifacts.receipt.id,
          kind: "publish-receipt",
          digest: policy.artifacts.receipt.digest,
          headSha: policy.source.headSha,
          workflowRunId: policy.source.runId,
          disposition: "inconclusive",
          strictValidation: { status: "passed" },
          jsonDocuments: {
            "lifecycle-snapshot.json": {
              value: {
                outboxSha256: policy.outboxSha256,
                durableIntentArtifact: policy.artifacts.intent,
                releases: [
                  {
                    name: policy.releaseSet[0].name,
                    recoveryStatus: "ambiguous",
                  },
                  {
                    name: policy.releaseSet[1].name,
                    recoveryStatus: "processing",
                  },
                ],
              },
            },
            "consumer-inbox.json": {
              value: {
                records: {
                  [`publish:${policy.releaseSet[0].identity}`]: {
                    status: "AMBIGUOUS",
                    observation: "NOT_APPLIED",
                    error: "npm publish exact.tgz --provenance",
                  },
                  [`publish:${policy.releaseSet[1].identity}`]: {
                    status: "PROCESSING",
                  },
                },
              },
            },
          },
        },
      ],
    },
  };
}

function response(value, status = 200) {
  return new Response(
    typeof value === "string" ? value : JSON.stringify(value),
    { status },
  );
}

function evidenceFetch(policy, sourceBytes, options = {}) {
  return async (url) => {
    if (url === `https://api.github.com/repos/${policy.repository.name}`)
      return response({
        id: Number(policy.repository.id),
        full_name: policy.repository.name,
        visibility: options.visibility ?? policy.repository.visibility,
      });
    if (url.endsWith(`/actions/jobs/${policy.source.publishJobId}`))
      return response({
        id: Number(policy.source.publishJobId),
        run_id: Number(policy.source.runId),
        run_attempt: policy.source.runAttempt,
        name: "publish",
        conclusion: "failure",
        head_sha: options.headSha ?? policy.source.headSha,
        completed_at: "2026-08-31T11:39:19.000Z",
        steps: policy.requiredJobSteps,
      });
    if (url.endsWith(`/actions/jobs/${policy.source.publishJobId}/logs`))
      return response(
        options.invalidLogs
          ? "npm error code E500"
          : policy.requiredLogTokens.join("\n"),
      );
    if (url.includes(`/contents/${policy.sourceConsumer.path}?ref=`))
      return response({
        encoding: "base64",
        sha: policy.sourceConsumer.blobSha,
        content: sourceBytes.toString("base64"),
      });
    if (url.startsWith("https://registry.npmjs.org/")) {
      const release = policy.releaseSet.find((item) =>
        url.endsWith(encodeURIComponent(item.name)),
      );
      return response(
        options.registryApplied
          ? {
              "dist-tags": { latest: release.version },
              versions: { [release.version]: {} },
            }
          : {
              "dist-tags": { latest: release.expectedLatest },
              versions: { [release.expectedLatest]: {} },
            },
      );
    }
    throw new Error(`unexpected URL ${url}`);
  };
}

async function resolve(options = {}) {
  const { policy, sourceBytes } = await policyFixture();
  const evidence = cutoverEvidence(policy);
  const times = [
    Date.parse("2026-08-31T12:00:00.000Z"),
    Date.parse("2026-08-31T12:00:30.000Z"),
  ];
  const resolution = await resolvePrivateProvenanceIncident({
    cutoverEvidence: evidence,
    fetchImpl: evidenceFetch(policy, sourceBytes, options),
    incidentId: policy.incidentId,
    now: () => times.shift(),
    policy,
    propagationWindowMs: 30_000,
    repository: policy.repository.name,
    sleep: async () => {},
    token: "token",
  });
  return { evidence, policy, resolution };
}

test("checked-in private provenance incident policy is exact and bounded", async () => {
  const checkedIn = await readPrivateProvenanceIncidentPolicy();
  assert.equal(validatePrivateProvenanceIncidentPolicy(checkedIn), checkedIn);
  assert.equal(checkedIn.releaseSet.length, 2);
  assert.equal(checkedIn.releaseSet[0].resolvedOutcome, "NOT_APPLIED");
  assert.equal(checkedIn.releaseSet[1].resolvedOutcome, "NOT_ATTEMPTED");
});

test("incident resolution binds exact logs, source, artifacts, and two registry observations", async () => {
  const { evidence, policy, resolution } = await resolve();
  assert.equal(resolution.schemaId, PRIVATE_PROVENANCE_REJECTION_SCHEMA);
  assert.equal(resolution.npmErrorCode, "E422");
  assert.equal(resolution.registryObservations.length, 2);
  assert.equal(
    validatePrivateProvenanceResolution({
      cutoverEvidence: evidence,
      now: "2026-08-31T12:00:30.000Z",
      policy,
      resolution,
    }),
    resolution,
  );
});

test("publish authorization expires fail-closed after environment approval delay", async () => {
  const { policy, resolution } = await resolve();
  let publishCalls = 0;
  const publish = createPrivateProvenanceAuthorizedPublish({
    now: () => new Date(Date.parse(policy.notAfter) + 1).toISOString(),
    policy,
    publish: async () => {
      publishCalls += 1;
    },
    resolution,
  });

  await assert.rejects(() => publish({}), /authorization has expired/);
  assert.equal(publishCalls, 0);
});

test("incident resolution rejects wrong job evidence and a registry-applied version", async () => {
  await assert.rejects(
    () => resolve({ headSha: "f".repeat(40) }),
    /job mismatch/,
  );
  await assert.rejects(() => resolve({ invalidLogs: true }), /log mismatch/);
  await assert.rejects(
    () => resolve({ registryApplied: true }),
    /not definitively missing/,
  );
});

test("incident resolution cannot mask another inconclusive item or be consumed twice", async () => {
  const { evidence, policy, resolution } = await resolve();
  const additional = structuredClone(evidence);
  additional.inventory.artifacts.push({
    id: "unexpected",
    disposition: "inconclusive",
  });
  await assert.rejects(
    async () =>
      validatePrivateProvenanceResolution({
        cutoverEvidence: additional,
        now: "2026-08-31T12:00:30.000Z",
        policy,
        resolution,
      }),
    /inconclusive inventory mismatch/,
  );
  const consumed = structuredClone(evidence);
  consumed.inventory.artifacts.push({
    id: "resolution",
    kind: "incident-resolution",
    jsonDocuments: {
      "incident-resolution.json": { value: { incidentId: policy.incidentId } },
    },
  });
  await assert.rejects(
    async () =>
      validatePrivateProvenanceResolution({
        cutoverEvidence: consumed,
        now: "2026-08-31T12:00:30.000Z",
        policy,
        resolution,
      }),
    /already consumed/,
  );
});
