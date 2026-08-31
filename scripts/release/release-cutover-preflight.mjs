#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  dispositionForExactRef,
  validateCutoverPolicy,
} from "./release-cutover-policy.mjs";
import {
  readPrivateProvenanceIncidentPolicy,
  validatePrivateProvenanceResolution,
} from "./private-provenance-recovery.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SHA1 = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const DISPOSITIONS = new Set([
  "closed-terminal",
  "recoverable",
  "inconclusive",
]);

export function collectPaginated(items, label) {
  if (!Array.isArray(items) || items.length === 0)
    throw new Error(`${label} pagination is inconclusive`);
  const values = [];
  for (let index = 0; index < items.length; index += 1) {
    const page = items[index];
    if (!Array.isArray(page?.items))
      throw new Error(`${label} page ${index + 1} is inconclusive`);
    values.push(...page.items);
    if (page.hasNextPage === true && index === items.length - 1)
      throw new Error(`${label} pagination is incomplete`);
    if (page.hasNextPage !== true && index !== items.length - 1)
      throw new Error(`${label} contains pages after pagination ended`);
  }
  return values;
}

function exactLegacyMatch(policy, producer) {
  return policy.legacyExactAllowlist.some(
    (entry) =>
      String(entry.workflowRunId) === String(producer.workflowRunId) &&
      String(entry.artifactId) === String(producer.artifactId) &&
      entry.sourceRef === producer.sourceRef &&
      entry.headSha === producer.headSha &&
      entry.cutoverRevision === producer.cutoverRevision &&
      entry.schemaVersion === producer.schemaVersion &&
      entry.operation === producer.operation,
  );
}

function fail(reason) {
  return { status: "BLOCK", reason };
}

export function evaluateReleaseCutover({
  policy,
  producer,
  evidence,
  incidentPolicy,
  incidentResolution,
  now,
}) {
  try {
    validateCutoverPolicy(policy);
  } catch (error) {
    return fail(error.message);
  }
  if (evidence?.schemaId !== "yakit-ui-release-cutover-evidence/v2")
    return fail("cutover evidence schema is unsupported");
  if (
    evidence.pagination?.runsComplete !== true ||
    evidence.pagination?.artifactsComplete !== true ||
    evidence.pagination?.refsComplete !== true
  )
    return fail("repo-wide cutover pagination is incomplete");
  const { runs, artifacts, refs } = evidence.inventory ?? {};
  if (![runs, artifacts, refs].every(Array.isArray))
    return fail("cutover inventory is incomplete");
  if (
    [...runs, ...artifacts].some((item) => !DISPOSITIONS.has(item.disposition))
  )
    return fail("inventory item has no closed disposition");
  let allowedInconclusiveIds = new Set();
  if (incidentResolution) {
    try {
      validatePrivateProvenanceResolution({
        cutoverEvidence: evidence,
        now,
        policy: incidentPolicy,
        resolution: incidentResolution,
      });
      allowedInconclusiveIds = new Set(
        incidentResolution.allowedInconclusiveIds.map(String),
      );
    } catch (error) {
      return fail(error.message);
    }
  }
  const inconclusive = [...runs, ...artifacts].find(
    (item) =>
      item.disposition === "inconclusive" &&
      !allowedInconclusiveIds.has(String(item.id)),
  );
  if (inconclusive)
    return fail(`inventory evidence is inconclusive: ${inconclusive.id}`);
  const refsByName = new Map();
  for (const ref of refs) {
    const policyDisposition = dispositionForExactRef(policy, ref?.ref);
    if (!ref?.ref || !SHA1.test(ref.headSha ?? "") || refsByName.has(ref.ref))
      return fail("ref inventory is missing or ambiguous");
    refsByName.set(ref.ref, ref);
    if (!policyDisposition)
      return fail(`active release ref has no exact disposition: ${ref.ref}`);
    if (
      ref.evidenceDisposition !== "closed-terminal" ||
      ref.policyDisposition !== policyDisposition.disposition ||
      (policyDisposition.disposition === "migrated"
        ? policyDisposition.headBinding !== "live-producer"
        : ref.headSha !== policyDisposition.expectedHeadSha) ||
      ref.cutoverRevision !== policyDisposition.cutoverRevision ||
      ref.containsCutoverRevision !== true ||
      ref.approvalAudit?.blobSha !==
        policyDisposition.approval.auditArtifact.blobSha ||
      ref.approvalAudit?.sha256 !==
        policyDisposition.approval.auditArtifact.sha256
    )
      return fail(`ref cutover evidence is inconclusive: ${ref.ref}`);
  }
  const runsById = new Map();
  for (const run of runs) {
    if (
      !run?.id ||
      !run.sourceRef ||
      !SHA1.test(run.headSha ?? "") ||
      runsById.has(String(run.id)) ||
      run.workflowPath !== ".github/workflows/publish.yml"
    )
      return fail("workflow run inventory is missing or ambiguous");
    runsById.set(String(run.id), run);
  }
  const artifactIds = new Set();
  for (const artifact of artifacts) {
    const run = runsById.get(String(artifact.workflowRunId));
    if (!artifact?.id || artifactIds.has(String(artifact.id)) || !run)
      return fail(
        `orphan or duplicate artifact ${artifact?.id ?? "<unknown>"}`,
      );
    artifactIds.add(String(artifact.id));
    if (
      artifact.sourceRef !== run.sourceRef ||
      artifact.headSha !== run.headSha
    )
      return fail(
        `artifact ${artifact.id} is not bound to its workflow source`,
      );
    if (!/^sha256:[0-9a-f]{64}$/i.test(artifact.digest ?? ""))
      return fail(`artifact ${artifact.id} has no immutable GitHub digest`);
    if (
      artifact.archiveSha256 !== artifact.digest.slice("sha256:".length) ||
      !Array.isArray(artifact.entries) ||
      artifact.entries.length === 0 ||
      artifact.strictValidation?.status !== "passed"
    )
      return fail(`artifact ${artifact.id} archive evidence is incomplete`);
  }
  const disposition = dispositionForExactRef(policy, producer?.sourceRef);
  const liveRef = refsByName.get(producer?.sourceRef);
  const producerRun = runsById.get(String(producer?.workflowRunId));
  if (!disposition || !liveRef || !producerRun)
    return fail("producer source evidence is missing");
  if (
    producer.headSha !== liveRef.headSha ||
    producer.headSha !== producerRun.headSha ||
    producer.sourceRef !== producerRun.sourceRef
  )
    return fail("producer is not bound to the exact reviewed ref head");
  if (producer.workflowProducerKind !== producerRun.producerKind)
    return fail("producer kind does not match the inventoried workflow");
  if (
    producer.cutoverRevision !== disposition.cutoverRevision ||
    producer.containsCutoverRevision !== true
  )
    return fail("producer head does not contain the reviewed cutover revision");
  if (
    producer.approvalAudit?.blobSha !==
      disposition.approval.auditArtifact.blobSha ||
    producer.approvalAudit?.sha256 !== disposition.approval.auditArtifact.sha256
  )
    return fail("producer approval audit artifact mismatch");
  if (
    !SHA1.test(producer.enforcementBlobSha ?? "") ||
    !SHA256.test(producer.enforcementSha256 ?? "")
  )
    return fail("producer enforcement identity is incomplete");

  if (producer.producerKind === "release-v3") {
    if (disposition.disposition !== "migrated")
      return fail("normal producer ref is not migrated");
    return { status: "PASS", mode: "normal", headSha: producer.headSha };
  }
  if (producer.producerKind !== "legacy-recovery")
    return fail("unknown release producer");
  if (!Number.isFinite(Date.parse(now)))
    return fail("cutover clock is invalid");
  if (Date.parse(now) > Date.parse(policy.legacyRecoveryEol))
    return fail("legacy recovery EOL has passed");
  if (!exactLegacyMatch(policy, producer))
    return fail("legacy recovery is not exact-allowlisted");
  return { status: "PASS", mode: "legacy-recovery", headSha: producer.headSha };
}

async function main() {
  const evidencePath = process.env.RELEASE_CUTOVER_EVIDENCE;
  const producerPath = process.env.RELEASE_PRODUCER_IDENTITY;
  if (!evidencePath || !producerPath)
    throw new Error(
      "RELEASE_CUTOVER_EVIDENCE and RELEASE_PRODUCER_IDENTITY are required",
    );
  const incidentResolutionPath = process.env.RELEASE_INCIDENT_RESOLUTION;
  const [policy, evidence, producer, incidentPolicy, incidentResolution] =
    await Promise.all([
      readFile(
        path.join(ROOT, "scripts/release/release-cutover-policy.json"),
        "utf8",
      ).then(JSON.parse),
      readFile(path.resolve(evidencePath), "utf8").then(JSON.parse),
      readFile(path.resolve(producerPath), "utf8").then(JSON.parse),
      incidentResolutionPath
        ? readPrivateProvenanceIncidentPolicy()
        : Promise.resolve(undefined),
      incidentResolutionPath
        ? readFile(path.resolve(incidentResolutionPath), "utf8").then(
            JSON.parse,
          )
        : Promise.resolve(undefined),
    ]);
  const result = evaluateReleaseCutover({
    policy,
    evidence,
    incidentPolicy,
    incidentResolution,
    producer,
    now: process.env.RELEASE_CUTOVER_NOW ?? new Date().toISOString(),
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "PASS") process.exitCode = 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
)
  await main();
