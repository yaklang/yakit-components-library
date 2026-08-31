import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const INBOX_STATES = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  AMBIGUOUS: "AMBIGUOUS",
});

function stableJson(value, ancestors = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("outbox payload must contain finite JSON numbers");
    return JSON.stringify(value);
  }
  if (!value || typeof value !== "object")
    throw new Error("outbox payload must contain only JSON values");
  if (ancestors.has(value))
    throw new Error("outbox payload must not be cyclic");
  const nextAncestors = new Set(ancestors).add(value);
  if (Array.isArray(value))
    return `[${value
      .map((item) => stableJson(item, nextAncestors))
      .join(",")}]`;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    throw new Error("outbox payload must contain only plain JSON objects");
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableJson(value[key], nextAncestors)}`,
    )
    .join(",")}}`;
}

export function payloadHash(payload) {
  return createHash("sha256").update(stableJson(payload)).digest("hex");
}

export async function readRevisionedJson(file, fallback = { revision: 0 }) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return structuredClone(fallback);
    throw error;
  }
}

export async function atomicWriteJsonCas(file, expectedRevision, nextValue) {
  await mkdir(path.dirname(file), { recursive: true });
  const lockPath = `${file}.lock`;
  let lock;
  try {
    lock = await open(lockPath, "wx");
  } catch (error) {
    if (error?.code === "EEXIST")
      throw new Error(`CAS lock is already held for ${file}`);
    throw error;
  }
  let temporary;
  try {
    const current = await readRevisionedJson(file);
    if (current.revision !== expectedRevision)
      throw new Error(
        `CAS revision mismatch: expected ${expectedRevision}, got ${current.revision}`,
      );
    const value = { ...nextValue, revision: expectedRevision + 1 };
    temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      flag: "wx",
    });
    const handle = await open(temporary, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, file);
    temporary = undefined;
    return value;
  } finally {
    if (temporary) await rm(temporary, { force: true });
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

export function createOutboxRecord({
  operation,
  packageName,
  version,
  payload = {},
}) {
  const key = `${operation}:${packageName}@${version}`;
  const hash = payloadHash(payload);
  return {
    id: key,
    eventId: key,
    idempotencyKey: key,
    operation,
    packageName,
    version,
    payload,
    payloadHash: hash,
    status: "PENDING",
    revision: 0,
  };
}

export async function enqueueOutboxOperation(file, record) {
  if (record.payloadHash !== payloadHash(record.payload))
    throw new Error(`outbox payload hash mismatch for ${record.id}`);
  const current = await readRevisionedJson(file, { revision: 0, records: {} });
  const existing = current.records?.[record.id];
  if (existing) {
    if (
      existing.idempotencyKey !== record.idempotencyKey ||
      existing.payloadHash !== record.payloadHash
    )
      throw new Error(`outbox identity conflict for ${record.id}`);
    return current;
  }
  return atomicWriteJsonCas(file, current.revision, {
    records: { ...current.records, [record.id]: record },
  });
}

export async function beginInboxOperation(file, record) {
  if (record.payloadHash !== payloadHash(record.payload))
    throw new Error(`inbox payload hash mismatch for ${record.idempotencyKey}`);
  const current = await readRevisionedJson(file, { revision: 0, records: {} });
  const existing = current.records?.[record.idempotencyKey];
  if (existing && existing.payloadHash !== record.payloadHash)
    throw new Error(`inbox identity conflict for ${record.idempotencyKey}`);
  if (existing?.status === INBOX_STATES.SUCCEEDED)
    return { state: current, decision: "SKIP_SUCCEEDED" };
  if (
    [INBOX_STATES.PROCESSING, INBOX_STATES.AMBIGUOUS].includes(existing?.status)
  )
    return { state: current, decision: "RECONCILE_REQUIRED" };
  const state = await atomicWriteJsonCas(file, current.revision, {
    records: {
      ...current.records,
      [record.idempotencyKey]: {
        idempotencyKey: record.idempotencyKey,
        payloadHash: record.payloadHash,
        status: INBOX_STATES.PROCESSING,
        attempt: (existing?.attempt ?? 0) + 1,
      },
    },
  });
  return { state, decision: "EXECUTE" };
}

export async function finishInboxOperation(file, idempotencyKey, outcome) {
  if (
    ![
      INBOX_STATES.SUCCEEDED,
      INBOX_STATES.FAILED,
      INBOX_STATES.AMBIGUOUS,
    ].includes(outcome.status)
  )
    throw new Error("inbox outcome must be SUCCEEDED, FAILED, or AMBIGUOUS");
  const current = await readRevisionedJson(file, { revision: 0, records: {} });
  const existing = current.records?.[idempotencyKey];
  if (!existing) throw new Error(`missing inbox record ${idempotencyKey}`);
  return atomicWriteJsonCas(file, current.revision, {
    records: {
      ...current.records,
      [idempotencyKey]: { ...existing, ...outcome },
    },
  });
}

export function assertPublishableArtifact(artifact) {
  if (artifact?.nonPublishable === true || artifact?.kind === "impact-probe")
    throw new Error("impactProbeSet shadow artifacts are non-publishable");
  if (!artifact?.releaseIdentity)
    throw new Error("publishable artifact requires releaseIdentity");
  return artifact;
}
