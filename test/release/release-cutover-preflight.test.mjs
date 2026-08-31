import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  classifyArtifactEvidence,
  classifyRunEvidence,
  collectGithubPages,
  collectStableCountedInventory,
  isArtifactRevisionRelevant,
  validateStrictArtifact,
  validateStableRefSnapshots,
  verificationArchiveEntries,
} from "../../scripts/release/collect-release-cutover-evidence.mjs";
import { payloadHash } from "../../scripts/release/durable-release-state.mjs";
import {
  collectPaginated,
  evaluateReleaseCutover,
} from "../../scripts/release/release-cutover-preflight.mjs";
import { validateCutoverPolicy } from "../../scripts/release/release-cutover-policy.mjs";

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
      baseSourceHash: HASH,
      headSourceHash: HASH,
      baseLockHash: HASH,
      headLockHash: HASH,
      baseToolchainHash: HASH,
      headToolchainHash: HASH,
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
