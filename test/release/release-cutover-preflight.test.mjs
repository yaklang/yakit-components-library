import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  classifyArtifactEvidence,
  classifyRunEvidence,
  collectGithubPages,
  collectStableCountedInventory,
  isArtifactRevisionRelevant,
  reconcileRecoveredArtifacts,
  validateStrictArtifact,
  validateStableRefSnapshots,
  verificationArchiveEntries,
} from "../../scripts/release/collect-release-cutover-evidence.mjs";
import { payloadHash } from "../../scripts/release/durable-release-state.mjs";
import { buildDeferredImpact } from "../../scripts/release/release-deferrals.mjs";
import {
  collectPaginated,
  evaluateReleaseCutover,
} from "../../scripts/release/release-cutover-preflight.mjs";
import { validateCutoverPolicy } from "../../scripts/release/release-cutover-policy.mjs";
import {
  PRIVATE_PROVENANCE_INCIDENT_POLICY_SCHEMA,
  PRIVATE_PROVENANCE_REJECTION_SCHEMA,
} from "../../scripts/release/private-provenance-recovery.mjs";

const HEAD = "1".repeat(40);
const CUTOVER = "2".repeat(40);
const BLOB = "3".repeat(40);
const HASH = "4".repeat(64);
const DIGEST = `sha256:${"5".repeat(64)}`;
const UI = "@yakit-libs/yakit-ui";
const ICONS = "@yakit-libs/yakit-ui-icons";
const collectorSource = readFileSync(
  new URL(
    "../../scripts/release/collect-release-cutover-evidence.mjs",
    import.meta.url,
  ),
  "utf8",
);

function impactDocument(releaseSet = [UI]) {
  return {
    schemaId: "yakit-ui-release-impact/v1",
    status: "PASS",
    observedSet: [...releaseSet],
    declaredSet: [...releaseSet],
    impactProbeSet: releaseSet.map((packageName) => ({
      package: packageName,
      kind: "impact-probe",
      nonPublishable: true,
      baseRevision: CUTOVER,
      headRevision: HEAD,
      sourceHash: HASH,
      baseSourceHash: HASH,
      headSourceHash: HASH,
      lockHash: HASH,
      baseLockHash: HASH,
      headLockHash: HASH,
      toolchainHash: HASH,
      baseToolchainHash: HASH,
      headToolchainHash: HASH,
      configHash: HASH,
      baseConfigHash: HASH,
      headConfigHash: HASH,
      snapshotHash: HASH,
      toolchainIdentityHash: HASH,
      packageSnapshotHashes: { base: HASH, head: HASH },
      toolchainIdentity: {
        node: "v24.12.0",
        pnpm: "10.34.5",
        os: { platform: "linux", release: "fixture", arch: "x64" },
      },
    })),
  };
}

function deferredImpactDocument() {
  const impact = impactDocument([UI, ICONS]);
  impact.declaredSet = [ICONS];
  const deferredPolicy = {
    schemaId: "yakit-ui-release-deferral/v1",
    releases: [{ name: ICONS, version: "0.2.4" }],
    deferred: [
      {
        package: UI,
        version: "0.2.3",
        distTag: "latest",
        integrity: "sha512-Zml4dHVyZQ==",
        sha256: HASH,
        baseRevision: CUTOVER,
        headSourceHash: HASH,
        headLockHash: HASH,
        headToolchainHash: HASH,
        headConfigHash: HASH,
        reason: "Release the icons package independently.",
        followUpPath: "docs/pending-releases/README.md",
      },
    ],
  };
  impact.revisions = { head: HEAD };
  impact.deferredImpact = buildDeferredImpact(deferredPolicy, [
    impact.impactProbeSet.find((probe) => probe.package === UI),
  ]);
  return impact;
}

const policy = {
  schemaId: "yakit-ui-release-cutover-policy/v2",
  inventoryWindowStartsAt: "2026-08-17T00:00:00.000Z",
  legacyRecoveryEol: "2026-12-31T23:59:59.999Z",
  refDispositions: [
    {
      ref: "refs/heads/main",
      disposition: "migrated",
      headBinding: "live-producer",
      cutoverRevision: CUTOVER,
      approval: {
        approved: true,
        approvedBy: "release-reviewer",
        approvedAt: "2026-08-31T00:00:00.000Z",
        auditArtifact: {
          path: "audit.json",
          blobSha: BLOB,
          sha256: HASH,
        },
      },
    },
  ],
  legacyExactAllowlist: [],
};

function evidence() {
  return {
    schemaId: "yakit-ui-release-cutover-evidence/v2",
    pagination: {
      runsComplete: true,
      artifactsComplete: true,
      refsComplete: true,
    },
    inventory: {
      refs: [
        {
          ref: "refs/heads/main",
          headSha: HEAD,
          policyDisposition: "migrated",
          cutoverRevision: CUTOVER,
          containsCutoverRevision: true,
          approvalAudit: { blobSha: BLOB, sha256: HASH },
          evidenceDisposition: "closed-terminal",
        },
      ],
      runs: [
        {
          id: "30",
          sourceRef: "refs/heads/main",
          headSha: HEAD,
          producerKind: "release-v3",
          workflowPath: ".github/workflows/publish.yml",
          disposition: "recoverable",
        },
      ],
      artifacts: [
        {
          id: "40",
          workflowRunId: "30",
          sourceRef: "refs/heads/main",
          headSha: HEAD,
          digest: DIGEST,
          archiveSha256: DIGEST.slice("sha256:".length),
          entries: ["release-impact.json"],
          strictValidation: { status: "passed" },
          disposition: "closed-terminal",
        },
      ],
    },
  };
}

function producer() {
  return {
    producerKind: "release-v3",
    workflowProducerKind: "release-v3",
    sourceRef: "refs/heads/main",
    headSha: HEAD,
    workflowRunId: "30",
    cutoverRevision: CUTOVER,
    containsCutoverRevision: true,
    enforcementBlobSha: BLOB,
    enforcementSha256: HASH,
    approvalAudit: { blobSha: BLOB, sha256: HASH },
  };
}

test("exact ref head, cutover ancestry, approval audit, and producer pass", () => {
  assert.deepEqual(
    evaluateReleaseCutover({
      policy,
      producer: producer(),
      evidence: evidence(),
      now: "2026-09-01T00:00:00.000Z",
    }),
    { status: "PASS", mode: "normal", headSha: HEAD },
  );
});

test("checked-in policy is exact and contains no wildcard ref", () => {
  const checkedIn = JSON.parse(
    readFileSync(
      new URL(
        "../../scripts/release/release-cutover-policy.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(validateCutoverPolicy(checkedIn), checkedIn);
  assert.ok(checkedIn.refDispositions.every((item) => !item.ref.includes("*")));
});

for (const [name, mutate, pattern] of [
  [
    "head mismatch",
    (value) => (value.headSha = "6".repeat(40)),
    /exact reviewed ref head/,
  ],
  [
    "missing ancestry",
    (value) => (value.containsCutoverRevision = false),
    /reviewed cutover revision/,
  ],
  [
    "approval mismatch",
    (value) => (value.approvalAudit.sha256 = "7".repeat(64)),
    /approval audit/,
  ],
]) {
  test(`${name} blocks`, () => {
    const candidate = producer();
    mutate(candidate);
    const result = evaluateReleaseCutover({
      policy,
      producer: candidate,
      evidence: evidence(),
      now: "2026-09-01T00:00:00.000Z",
    });
    assert.equal(result.status, "BLOCK");
    assert.match(result.reason, pattern);
  });
}

test("repo-wide incomplete or inconclusive inventory blocks", () => {
  const incomplete = evidence();
  incomplete.pagination.artifactsComplete = false;
  assert.match(
    evaluateReleaseCutover({
      policy,
      producer: producer(),
      evidence: incomplete,
      now: "2026-09-01T00:00:00.000Z",
    }).reason,
    /pagination/,
  );
  const ambiguous = evidence();
  ambiguous.inventory.artifacts[0].disposition = "inconclusive";
  assert.match(
    evaluateReleaseCutover({
      policy,
      producer: producer(),
      evidence: ambiguous,
      now: "2026-09-01T00:00:00.000Z",
    }).reason,
    /inconclusive/,
  );
});

test("an exact incident resolution permits only its two reviewed inconclusive identities", () => {
  const candidate = evidence();
  candidate.inventory.runs.push({
    id: "source-run",
    sourceRef: "refs/heads/main",
    headSha: HEAD,
    workflowPath: ".github/workflows/publish.yml",
    disposition: "inconclusive",
  });
  candidate.inventory.artifacts.push({
    id: "source-receipt",
    workflowRunId: "source-run",
    sourceRef: "refs/heads/main",
    headSha: HEAD,
    digest: DIGEST,
    archiveSha256: DIGEST.slice("sha256:".length),
    entries: ["consumer-inbox.json", "lifecycle-snapshot.json"],
    strictValidation: { status: "passed" },
    disposition: "inconclusive",
  });
  const incidentPolicy = {
    schemaId: PRIVATE_PROVENANCE_INCIDENT_POLICY_SCHEMA,
    schemaVersion: 1,
    incidentId: "incident",
    notAfter: "2026-09-14T00:00:00.000Z",
    repository: { id: "1", name: "owner/repo", visibility: "private" },
    source: {
      runId: "source-run",
      runAttempt: 1,
      publishJobId: "job",
      headSha: HEAD,
      sourceRef: "refs/heads/main",
    },
    artifacts: {
      verification: { id: "verification", digest: DIGEST },
      intent: { id: "intent", digest: DIGEST },
      receipt: { id: "source-receipt", digest: DIGEST },
    },
    outboxSha256: HASH,
    releaseSet: [UI, ICONS].map((name, index) => ({
      name,
      version: "0.2.2",
      expectedLatest: "0.2.1",
      identity: `${name}@0.2.2`,
      tarballFilename: `package-${index}.tgz`,
      tarballSha256: HASH,
      integrity: `sha512-${Buffer.from(String(index)).toString("base64")}`,
      priorStatus: index === 0 ? "AMBIGUOUS" : "PROCESSING",
      resolvedOutcome: index === 0 ? "NOT_APPLIED" : "NOT_ATTEMPTED",
    })),
    sourceConsumer: {
      path: "scripts/release/publication-consumer.mjs",
      blobSha: BLOB,
      sha256: HASH,
    },
    requiredJobSteps: [],
    requiredLogTokens: [],
    forbiddenLogTokens: [],
    allowedInconclusiveIds: ["source-run", "source-receipt"],
  };
  const observedAt = "2026-09-01T00:00:30.000Z";
  const registryPass = incidentPolicy.releaseSet.map((release) => ({
    identity: release.identity,
    observedAt,
    registryUrl: `https://registry.npmjs.org/${encodeURIComponent(release.name)}`,
    httpStatus: 200,
    versionExists: false,
    latest: release.expectedLatest,
    result: "NOT_APPLIED",
  }));
  const resolutionPayload = {
    schemaId: PRIVATE_PROVENANCE_REJECTION_SCHEMA,
    schemaVersion: 1,
    incidentId: incidentPolicy.incidentId,
    policySha256: payloadHash(incidentPolicy),
    repository: incidentPolicy.repository,
    sourceRunId: incidentPolicy.source.runId,
    publishJobId: incidentPolicy.source.publishJobId,
    workflowCommitSha: incidentPolicy.source.headSha,
    npmErrorCode: "E422",
    failureReason: "PRIVATE_SOURCE_REPOSITORY_PROVENANCE_UNSUPPORTED",
    failureReleaseIdentity: incidentPolicy.releaseSet[0].identity,
    releaseIdentities: incidentPolicy.releaseSet.map(
      (release) => release.identity,
    ),
    allowedInconclusiveIds: incidentPolicy.allowedInconclusiveIds,
    resolvedOutcomes: Object.fromEntries(
      incidentPolicy.releaseSet.map((release) => [
        release.identity,
        release.resolvedOutcome,
      ]),
    ),
    sourceArtifactEvidence: {
      intent: incidentPolicy.artifacts.intent,
      receipt: incidentPolicy.artifacts.receipt,
      verification: incidentPolicy.artifacts.verification,
    },
    sourceConsumerSha256: incidentPolicy.sourceConsumer.sha256,
    logSha256: HASH,
    propagationWindowMs: 30_000,
    observationMaxAgeMs: 300_000,
    registryObservations: [
      registryPass.map((item) => ({
        ...item,
        observedAt: "2026-09-01T00:00:00.000Z",
      })),
      registryPass,
    ],
    cutoverInventoryHash: payloadHash(candidate.inventory),
  };
  const incidentResolution = {
    ...resolutionPayload,
    evidenceHash: payloadHash(resolutionPayload),
  };
  assert.equal(
    evaluateReleaseCutover({
      policy,
      producer: producer(),
      evidence: candidate,
      incidentPolicy,
      incidentResolution,
      now: observedAt,
    }).status,
    "PASS",
  );
  candidate.inventory.artifacts.push({
    id: "unexpected",
    disposition: "inconclusive",
  });
  assert.match(
    evaluateReleaseCutover({
      policy,
      producer: producer(),
      evidence: candidate,
      incidentPolicy,
      incidentResolution,
      now: observedAt,
    }).reason,
    /inconclusive inventory mismatch|inconclusive/,
  );
});

test("orphan artifact and unknown active ref block", () => {
  const orphan = evidence();
  orphan.inventory.artifacts[0].workflowRunId = "missing";
  assert.match(
    evaluateReleaseCutover({
      policy,
      producer: producer(),
      evidence: orphan,
      now: "2026-09-01T00:00:00.000Z",
    }).reason,
    /orphan/,
  );
  const unknown = evidence();
  unknown.inventory.refs.push({
    ref: "refs/heads/pre/unreviewed",
    headSha: HEAD,
  });
  assert.match(
    evaluateReleaseCutover({
      policy,
      producer: producer(),
      evidence: unknown,
      now: "2026-09-01T00:00:00.000Z",
    }).reason,
    /no exact disposition/,
  );
});

test("legacy recovery needs exact head-bound allowlist and EOL", () => {
  const legacy = {
    ...producer(),
    producerKind: "legacy-recovery",
    artifactId: "40",
    schemaVersion: 2,
    operation: "metadata",
  };
  const allowed = {
    ...policy,
    legacyExactAllowlist: [
      {
        workflowRunId: "30",
        artifactId: "40",
        sourceRef: "refs/heads/main",
        headSha: HEAD,
        cutoverRevision: CUTOVER,
        schemaVersion: 2,
        operation: "metadata",
      },
    ],
  };
  assert.equal(
    evaluateReleaseCutover({
      policy: allowed,
      producer: legacy,
      evidence: evidence(),
      now: "2026-09-01T00:00:00.000Z",
    }).status,
    "PASS",
  );
  assert.match(
    evaluateReleaseCutover({
      policy: allowed,
      producer: legacy,
      evidence: evidence(),
      now: "2027-01-01T00:00:00.000Z",
    }).reason,
    /EOL/,
  );
});

test("artifact and run classifiers close every known state", () => {
  const impact = classifyArtifactEvidence({
    id: "1",
    kind: "release-impact",
    jsonDocuments: {
      "release-impact.json": {
        value: { schemaId: "yakit-ui-release-impact/v1", status: "PASS" },
      },
    },
    strictValidation: {
      status: "passed",
      semanticOutcome: "closed-terminal",
    },
  });
  assert.equal(impact.disposition, "closed-terminal");
  const verification = classifyArtifactEvidence({
    id: "2",
    workflowRunId: "30",
    kind: "verification",
    registry: [{ status: "missing" }],
    strictValidation: { status: "passed" },
    jsonDocuments: {
      "verification-manifest.json": {
        value: { schemaId: "yakit-ui-release-manifest/v3" },
      },
    },
  });
  assert.equal(verification.disposition, "recoverable");
  assert.equal(
    classifyRunEvidence({ id: "30", status: "completed" }, [verification], "99")
      .disposition,
    "recoverable",
  );
});

function receiptDocuments(outcome) {
  const key = "publish:@yakit-libs/yakit-ui@1.0.0";
  const states = {
    success: {
      release: { publishStatus: "published", recoveryStatus: "complete" },
      record: {
        status: "SUCCEEDED",
        reconciled: true,
        observation: "APPLIED",
      },
    },
    failed: {
      release: { publishStatus: "failed", recoveryStatus: "not-applied" },
      record: {
        status: "FAILED",
        reconciled: true,
        observation: "NOT_APPLIED",
        sideEffectOutcome: "NOT_APPLIED",
      },
    },
    ambiguous: {
      release: { publishStatus: "failed", recoveryStatus: "ambiguous" },
      record: {
        status: "AMBIGUOUS",
        reconciled: false,
        observation: "UNKNOWN",
      },
    },
  };
  const selected = states[outcome];
  return {
    "lifecycle-snapshot.json": {
      value: {
        schemaId: "yakit-ui-publication-state/v1",
        schemaVersion: 1,
        revision: 1,
        sourceRunId: "30",
        outboxSha256: "a".repeat(64),
        generation: 1,
        phase: "RECEIPT",
        attemptId: "30:1",
        durableIntentArtifact: { id: "10", digest: DIGEST },
        releases: [
          {
            name: "@yakit-libs/yakit-ui",
            version: "1.0.0",
            publishAttempt: 1,
            recoveryRevision: 1,
            ...selected.release,
          },
        ],
        history: [
          { sequence: 1, event: "ATTEMPT_STARTED" },
          { sequence: 2, event: "DURABLE_INTENT_ARTIFACT_VALIDATED" },
        ],
      },
    },
    "consumer-inbox.json": {
      value: {
        revision: 1,
        records: {
          [key]: {
            idempotencyKey: key,
            payloadHash: "b".repeat(64),
            attempt: 1,
            ...selected.record,
          },
        },
      },
    },
  };
}

test("receipt semantics distinguish success, definitive no-apply, and ambiguous", async () => {
  const artifact = {
    id: "receipt",
    kind: "publish-receipt",
    name: "yakit-ui-publish-receipt-30-1",
    workflowRunId: "30",
    entries: ["consumer-inbox.json", "lifecycle-snapshot.json"],
  };
  const classified = {};
  for (const outcome of ["success", "failed", "ambiguous"]) {
    const validation = await validateStrictArtifact({
      artifact,
      jsonDocuments: receiptDocuments(outcome),
    });
    classified[outcome] = classifyArtifactEvidence({
      ...artifact,
      strictValidation: { status: "passed", ...validation },
    });
  }
  assert.equal(classified.success.disposition, "closed-terminal");
  assert.equal(classified.failed.disposition, "recoverable");
  assert.equal(classified.ambiguous.disposition, "inconclusive");
  assert.equal(
    classifyRunEvidence(
      { id: "30", status: "completed" },
      [classified.ambiguous],
      "99",
    ).disposition,
    "inconclusive",
  );

  const noInbox = receiptDocuments("success");
  noInbox["consumer-inbox.json"].value.records = {};
  assert.equal(
    (
      await validateStrictArtifact({
        artifact,
        jsonDocuments: noInbox,
      })
    ).semanticOutcome,
    "closed-terminal",
  );
});

test("a closed recovery receipt closes its matching source run", async () => {
  const sourceArtifact = {
    id: "source-receipt",
    kind: "publish-receipt",
    name: "yakit-ui-publish-receipt-30-1",
    workflowRunId: "30",
    entries: ["consumer-inbox.json", "lifecycle-snapshot.json"],
  };
  const sourceDocuments = receiptDocuments("ambiguous");
  const sourceValidation = await validateStrictArtifact({
    artifact: sourceArtifact,
    jsonDocuments: sourceDocuments,
  });
  const sourceReceipt = classifyArtifactEvidence({
    ...sourceArtifact,
    jsonDocuments: sourceDocuments,
    strictValidation: { status: "passed", ...sourceValidation },
  });

  const recoveryArtifact = {
    id: "recovery-receipt",
    kind: "recovery-receipt",
    name: "yakit-ui-recovery-receipt-30-99-1",
    digest: DIGEST,
    workflowRunId: "99",
    entries: ["consumer-inbox.json", "lifecycle-snapshot.json"],
  };
  const recoveryDocuments = receiptDocuments("success");
  recoveryDocuments["lifecycle-snapshot.json"].value.attemptId = "99:1";
  const recoveryValidation = await validateStrictArtifact({
    artifact: recoveryArtifact,
    jsonDocuments: recoveryDocuments,
  });
  const recoveryReceipt = classifyArtifactEvidence({
    ...recoveryArtifact,
    jsonDocuments: recoveryDocuments,
    strictValidation: { status: "passed", ...recoveryValidation },
  });
  const sourceVerification = classifyArtifactEvidence({
    id: "source-verification",
    kind: "verification",
    workflowRunId: "30",
    registry: [{ identity: `${UI}@1.0.0`, status: "exact" }],
    strictValidation: { status: "passed" },
    jsonDocuments: {
      "verification-manifest.json": {
        value: {
          schemaId: "yakit-ui-release-manifest/v3",
          runId: "30",
          releases: [{ identity: `${UI}@1.0.0` }],
          publicationOutbox: { sha256: "a".repeat(64) },
        },
      },
    },
  });
  const recoveredArtifacts = reconcileRecoveredArtifacts([
    sourceReceipt,
    sourceVerification,
    recoveryReceipt,
  ]);

  assert.equal(
    classifyRunEvidence(
      { id: "30", status: "completed" },
      recoveredArtifacts,
      "100",
    ).disposition,
    "closed-terminal",
  );
  assert.equal(recoveredArtifacts[0].disposition, "closed-terminal");
  assert.equal(recoveredArtifacts[0].historicalDisposition, "inconclusive");
  assert.equal(recoveredArtifacts[1].disposition, "closed-terminal");

  const candidate = evidence();
  candidate.inventory.runs[0] = classifyRunEvidence(
    { ...candidate.inventory.runs[0], status: "completed" },
    recoveredArtifacts,
    "100",
  );
  candidate.inventory.runs.push({
    ...candidate.inventory.runs[0],
    id: "99",
    disposition: "closed-terminal",
  });
  candidate.inventory.artifacts.push(
    ...recoveredArtifacts.map((artifact) => ({
      ...artifact,
      sourceRef: "refs/heads/main",
      headSha: HEAD,
      digest: DIGEST,
      archiveSha256: DIGEST.slice("sha256:".length),
      entries: artifact.entries ?? [
        "transactional-outbox.json",
        "verification-manifest.json",
      ],
    })),
  );
  const recoveredCutover = evaluateReleaseCutover({
    policy,
    producer: producer(),
    evidence: candidate,
    now: "2026-09-01T00:00:00.000Z",
  });
  assert.equal(recoveredCutover.status, "PASS", recoveredCutover.reason);

  const mismatchCases = [
    [
      "source run",
      (receipt) => {
        receipt.jsonDocuments["lifecycle-snapshot.json"].value.sourceRunId =
          "31";
      },
    ],
    [
      "outbox",
      (receipt) => {
        receipt.jsonDocuments["lifecycle-snapshot.json"].value.outboxSha256 =
          "c".repeat(64);
      },
    ],
    [
      "release identities",
      (receipt) => {
        receipt.jsonDocuments[
          "lifecycle-snapshot.json"
        ].value.releases[0].version = "2.0.0";
      },
    ],
    [
      "receipt disposition",
      (receipt) => {
        receipt.disposition = "recoverable";
      },
    ],
    [
      "receipt digest",
      (receipt) => {
        receipt.digest = "invalid";
      },
    ],
  ];
  let mismatchedArtifacts;
  for (const [label, mutate] of mismatchCases) {
    const mismatchedReceipt = structuredClone(recoveryReceipt);
    mutate(mismatchedReceipt);
    const artifacts = reconcileRecoveredArtifacts([
      sourceReceipt,
      sourceVerification,
      mismatchedReceipt,
    ]);
    assert.equal(artifacts[0].disposition, "inconclusive", label);
    assert.equal(artifacts[1].disposition, "closed-terminal", label);
    if (label === "outbox") mismatchedArtifacts = artifacts;
  }

  assert.equal(
    classifyRunEvidence(
      { id: "30", status: "completed" },
      mismatchedArtifacts,
      "100",
    ).disposition,
    "inconclusive",
  );

  const registryConflict = reconcileRecoveredArtifacts([
    sourceReceipt,
    classifyArtifactEvidence({
      ...sourceVerification,
      registry: [{ identity: `${UI}@1.0.0`, status: "conflict" }],
      strictValidation: { status: "passed" },
    }),
    recoveryReceipt,
  ]);
  assert.equal(registryConflict[1].disposition, "inconclusive");

  const strictFailure = reconcileRecoveredArtifacts([
    {
      ...sourceReceipt,
      strictValidation: { status: "failed", reason: "invalid archive" },
    },
    sourceVerification,
    recoveryReceipt,
  ]);
  assert.equal(strictFailure[0].disposition, "inconclusive");

  const blocked = evidence();
  blocked.inventory.runs[0] = classifyRunEvidence(
    { ...blocked.inventory.runs[0], status: "completed" },
    mismatchedArtifacts,
    "100",
  );
  blocked.inventory.runs.push({
    ...blocked.inventory.runs[0],
    id: "99",
    disposition: "closed-terminal",
  });
  blocked.inventory.artifacts.push(
    ...mismatchedArtifacts.map((artifact) => ({
      ...artifact,
      sourceRef: "refs/heads/main",
      headSha: HEAD,
      digest: DIGEST,
      archiveSha256: DIGEST.slice("sha256:".length),
      entries: artifact.entries ?? [
        "transactional-outbox.json",
        "verification-manifest.json",
      ],
    })),
  );
  assert.equal(
    evaluateReleaseCutover({
      policy,
      producer: producer(),
      evidence: blocked,
      now: "2026-09-01T00:00:00.000Z",
    }).status,
    "BLOCK",
  );
});

test("impact artifacts reject empty, unsupported, duplicate, reordered, and extra entries", async () => {
  const artifact = {
    kind: "release-impact",
    name: "yakit-ui-release-impact-30",
    workflowRunId: "30",
    entries: ["release-impact.json"],
  };
  const validate = (value, candidate = artifact) =>
    validateStrictArtifact({
      artifact: candidate,
      jsonDocuments: { "release-impact.json": { value } },
    });
  assert.equal(
    (await validate(impactDocument([UI, ICONS]))).semanticOutcome,
    "closed-terminal",
  );
  for (const releaseSet of [[], ["@scope/unsupported"], [UI, UI], [ICONS, UI]])
    await assert.rejects(() => validate(impactDocument(releaseSet)));
  await assert.rejects(() =>
    validate(impactDocument(), { ...artifact, name: "arbitrary-impact" }),
  );
  await assert.rejects(
    () =>
      validate(impactDocument(), {
        ...artifact,
        entries: ["release-impact.json", "extra.txt"],
      }),
    /archive entry set mismatch/,
  );
});

test("impact artifacts accept only strictly validated package deferrals", async () => {
  const artifact = {
    kind: "release-impact",
    name: "yakit-ui-release-impact-30",
    workflowRunId: "30",
    entries: ["release-impact.json"],
  };
  const validate = (value) =>
    validateStrictArtifact({
      artifact,
      jsonDocuments: { "release-impact.json": { value } },
    });

  const deferred = deferredImpactDocument();
  assert.deepEqual(await validate(deferred), {
    semanticOutcome: "closed-terminal",
  });

  const missingPolicy = structuredClone(deferred);
  delete missingPolicy.deferredImpact;
  await assert.rejects(() => validate(missingPolicy), /observedSet/);

  const tamperedProbe = structuredClone(deferred);
  tamperedProbe.deferredImpact.probes[0].headSourceHash = "6".repeat(64);
  await assert.rejects(
    () => validate(tamperedProbe),
    /headSourceHash mismatch/,
  );
});

test("lifecycle artifacts reject extra archive files", async () => {
  await assert.rejects(
    () =>
      validateStrictArtifact({
        artifact: {
          kind: "publish-receipt",
          name: "yakit-ui-publish-receipt-30-1",
          workflowRunId: "30",
          entries: [
            "consumer-inbox.json",
            "lifecycle-snapshot.json",
            "extra.tgz",
          ],
        },
        jsonDocuments: receiptDocuments("success"),
      }),
    /archive entry set mismatch/,
  );
});

test("normal processing intent is recoverable and binds its inventory", async () => {
  const key = `publish:${UI}@1.0.0`;
  const inventory = {
    schemaId: "yakit-ui-publication-artifact-inventory/v1",
    schemaVersion: 1,
    repository: "fixture/repository",
    sourceRunId: "30",
    enumeratedArtifactCount: 0,
    relevantArtifactCount: 0,
    artifacts: [],
  };
  const documents = {
    "prior-artifact-inventory.json": { value: inventory },
    "lifecycle-snapshot.json": {
      value: {
        schemaId: "yakit-ui-publication-state/v1",
        schemaVersion: 1,
        revision: 1,
        sourceRunId: "30",
        outboxSha256: "a".repeat(64),
        generation: 1,
        phase: "INTENT",
        attemptId: "30:1",
        priorArtifactInventoryHash: payloadHash(inventory),
        releases: [
          {
            name: UI,
            version: "1.0.0",
            publishAttempt: 1,
            recoveryRevision: 1,
            publishStatus: "publishing",
            recoveryStatus: "processing",
          },
        ],
        history: [{ sequence: 1, event: "ATTEMPT_STARTED" }],
      },
    },
    "consumer-inbox.json": {
      value: {
        revision: 1,
        records: {
          [key]: {
            idempotencyKey: key,
            payloadHash: "b".repeat(64),
            status: "PROCESSING",
          },
        },
      },
    },
  };
  const artifact = {
    kind: "publish-intent",
    name: "yakit-ui-publish-intent-30-1",
    workflowRunId: "30",
    entries: Object.keys(documents),
  };
  assert.equal(
    (await validateStrictArtifact({ artifact, jsonDocuments: documents }))
      .semanticOutcome,
    "recoverable",
  );
  const changedHash = structuredClone(documents);
  changedHash["lifecycle-snapshot.json"].value.priorArtifactInventoryHash =
    HASH;
  await assert.rejects(
    () =>
      validateStrictArtifact({
        artifact,
        jsonDocuments: changedHash,
      }),
    /inventory is invalid/,
  );
  await assert.rejects(() =>
    validateStrictArtifact({
      artifact: { ...artifact, name: "yakit-ui-publish-intent-31-1" },
      jsonDocuments: documents,
    }),
  );
});

test("verification archive sets include single-package baselines and omit them for dual release", () => {
  const release = (name, filename, sizeFilename) => ({
    name,
    tarball: { filename },
    ...(sizeFilename ? { evidence: { size: { filename: sizeFilename } } } : {}),
  });
  assert.deepEqual(
    verificationArchiveEntries({
      releases: [release(UI, "ui.tgz")],
      compatibilityBaselineSet: [
        { filename: "baseline-yakit-ui-icons-1.0.0.tgz" },
      ],
    }),
    [
      "transactional-outbox.json",
      "verification-manifest.json",
      "ui.tgz",
      "baseline-yakit-ui-icons-1.0.0.tgz",
    ],
  );
  assert.deepEqual(
    verificationArchiveEntries({
      releases: [
        release(UI, "ui.tgz"),
        release(ICONS, "icons.tgz", "icons-size.json"),
      ],
      compatibilityBaselineSet: [],
    }),
    [
      "transactional-outbox.json",
      "verification-manifest.json",
      "icons-size.json",
      "ui.tgz",
      "icons.tgz",
    ],
  );
});

test("random JSON receipt and empty v3 verification manifest are inconclusive", async () => {
  await assert.rejects(
    () =>
      validateStrictArtifact({
        artifact: {
          kind: "publish-receipt",
          name: "yakit-ui-publish-receipt-30-1",
          workflowRunId: "30",
          entries: ["random.json"],
        },
        jsonDocuments: {
          "random.json": { value: { hello: "world" } },
        },
      }),
    /document set mismatch/,
  );
  assert.equal(
    classifyArtifactEvidence({
      id: "random-receipt",
      workflowRunId: "30",
      kind: "publish-receipt",
      strictValidation: { status: "failed", reason: "random JSON" },
    }).disposition,
    "inconclusive",
  );
  const invalidReceipt = classifyArtifactEvidence({
    id: "random-receipt",
    workflowRunId: "30",
    kind: "publish-receipt",
    strictValidation: { status: "failed", reason: "random JSON" },
  });
  assert.equal(
    classifyRunEvidence(
      { id: "30", status: "completed" },
      [invalidReceipt],
      "99",
    ).disposition,
    "inconclusive",
  );
  await assert.rejects(
    () =>
      validateStrictArtifact({
        artifact: {
          kind: "verification",
          name: "yakit-ui-verification-30",
          workflowRunId: "30",
          entries: ["transactional-outbox.json", "verification-manifest.json"],
        },
        directory: "/tmp/unused-empty-verification",
        jsonDocuments: {
          "verification-manifest.json": {
            value: {
              schemaId: "yakit-ui-release-manifest/v3",
              schemaVersion: 3,
              releaseSet: [],
              releases: [],
            },
          },
          "transactional-outbox.json": { value: {} },
        },
      }),
    /Verification manifest failed/,
  );
});

async function withFetchQueue(queue, operation) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    const next = queue.shift();
    if (!next) throw new Error("unexpected fetch");
    return new Response(JSON.stringify(next.body), {
      headers: next.next ? { link: `<https://api.test/next>; rel="next"` } : {},
    });
  };
  try {
    return await operation();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const stableOptions = {
  token: "fixture",
  url: "https://api.test/items",
  itemsFromResponse: (value) => value.items,
  idFromItem: (item) => item.id,
  stableFields: ["id", "head_sha"],
};

test("stable counted inventory rejects duplicate IDs and total_count mismatch", async () => {
  await assert.rejects(
    () =>
      withFetchQueue(
        [
          { body: { total_count: 2, items: [{ id: 1 }] }, next: true },
          { body: { total_count: 2, items: [{ id: 1 }] } },
        ],
        () => collectStableCountedInventory(stableOptions),
      ),
    /unique identity mismatch/,
  );
  await assert.rejects(
    () =>
      withFetchQueue([{ body: { total_count: 2, items: [{ id: 1 }] } }], () =>
        collectStableCountedInventory(stableOptions),
      ),
    /count or unique identity mismatch/,
  );
});

test("stable counted inventory and refs reject first/second read drift", async () => {
  await assert.rejects(
    () =>
      withFetchQueue(
        [
          { body: { total_count: 1, items: [{ id: 1, head_sha: HEAD }] } },
          { body: { total_count: 1, items: [{ id: 2, head_sha: HEAD }] } },
        ],
        () => collectStableCountedInventory(stableOptions),
      ),
    /changed during stable reread/,
  );
  assert.throws(
    () =>
      validateStableRefSnapshots(
        [{ ref: "refs/heads/main", headSha: HEAD }],
        [{ ref: "refs/heads/main", headSha: "9".repeat(40) }],
      ),
    /changed during stable reread/,
  );
});

test("old artifacts remain relevant by cutover ancestry or exact legacy allowlist", () => {
  const oldArtifact = {
    id: "40",
    created_at: "2020-01-01T00:00:00.000Z",
    workflow_run: { id: "30" },
  };
  assert.equal(
    isArtifactRevisionRelevant({
      artifact: oldArtifact,
      containedCutoverRevisions: [CUTOVER],
      policy,
    }),
    true,
  );
  assert.equal(
    isArtifactRevisionRelevant({
      artifact: oldArtifact,
      containedCutoverRevisions: [],
      policy: {
        ...policy,
        legacyExactAllowlist: [{ artifactId: "40", workflowRunId: "30" }],
      },
    }),
    true,
  );
});

test("collector follows Link pagination and uses repo-wide artifact inventory", async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(String(url));
    if (String(url).endsWith("page-1"))
      return new Response(JSON.stringify({ values: [1] }), {
        headers: { link: '<https://api.test/page-2>; rel="next"' },
      });
    return new Response(JSON.stringify({ values: [2] }));
  };
  try {
    assert.deepEqual(
      await collectGithubPages({
        token: "fixture",
        url: "https://api.test/page-1",
        itemsFromResponse: (value) => value.values,
      }),
      [
        { items: [1], hasNextPage: true },
        { items: [2], hasNextPage: false },
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.match(collectorSource, /\/actions\/artifacts\?per_page=100/);
  assert.doesNotMatch(
    collectorSource,
    /actions\/runs\/\$\{encodeURIComponent\(run\.id\)\}\/artifacts/,
  );
});

test("collector uses the canonical GitHub media type for artifact downloads", () => {
  assert.match(collectorSource, /accept:\s*"application\/vnd\.github\+json"/);
  assert.doesNotMatch(collectorSource, /application\/octet-stream/);
});

test("legacy page collector remains fail-closed for adapter callers", () => {
  assert.deepEqual(
    collectPaginated(
      [
        { items: [1], hasNextPage: true },
        { items: [2], hasNextPage: false },
      ],
      "fixture",
    ),
    [1, 2],
  );
  assert.throws(
    () => collectPaginated([{ items: [1], hasNextPage: true }], "fixture"),
    /incomplete/,
  );
});
