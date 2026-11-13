import { createHash } from "node:crypto";
import path from "node:path";

import {
  assertImpactOutputPublishSafe,
  PUBLIC_PACKAGES,
} from "./impact-probes.mjs";

const SCHEMA_ID = "yakit-ui-release-deferral/v2";
const LEGACY_SCHEMA_ID = "yakit-ui-release-deferral/v1";
const INPUT_HASH_FIELDS = [
  "headSourceHash",
  "headLockHash",
  "headToolchainHash",
  "headConfigHash",
];
const HASH_PATTERN = /^[0-9a-f]{64}$/i;
const REVISION_PATTERN = /^[0-9a-f]{40}$/i;
const VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  return value;
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted))
    throw new Error(`${label} has unsupported or missing fields`);
}

function validatePackageVersion(entry, label) {
  exactKeys(entry, ["name", "version"], label);
  if (!PUBLIC_PACKAGES.includes(entry.name))
    throw new Error(`${label} contains unsupported package`);
  if (!VERSION_PATTERN.test(entry.version ?? ""))
    throw new Error(`${label} version is invalid`);
}

function validateFollowUpPath(value) {
  if (
    typeof value !== "string" ||
    value.includes("\\") ||
    path.posix.isAbsolute(value) ||
    !value.startsWith("docs/") ||
    path.posix.normalize(value) !== value ||
    path.posix.extname(value) !== ".md"
  )
    throw new Error("deferred followUpPath must be a safe docs markdown path");
}

export function validateDeferralPolicy(policy) {
  exactKeys(policy, ["schemaId", "releases", "deferred"], "deferral policy");
  if (![SCHEMA_ID, LEGACY_SCHEMA_ID].includes(policy.schemaId))
    throw new Error("unsupported release deferral policy");
  if (!Array.isArray(policy.releases) || policy.releases.length !== 1)
    throw new Error("deferral policy must contain exactly one release");
  if (!Array.isArray(policy.deferred) || policy.deferred.length !== 1)
    throw new Error(
      "deferral policy must contain exactly one deferred package",
    );

  validatePackageVersion(policy.releases[0], "deferral release");
  const deferred = policy.deferred[0];
  exactKeys(
    deferred,
    [
      "package",
      "version",
      "baseRevision",
      ...(policy.schemaId === LEGACY_SCHEMA_ID ? INPUT_HASH_FIELDS : []),
      "reason",
      "followUpPath",
      "distTag",
      "integrity",
      "sha256",
    ],
    "deferred package",
  );
  if (!PUBLIC_PACKAGES.includes(deferred.package))
    throw new Error("deferred package is unsupported");
  if (!VERSION_PATTERN.test(deferred.version ?? ""))
    throw new Error("deferred package version is invalid");
  if (!REVISION_PATTERN.test(deferred.baseRevision ?? ""))
    throw new Error("deferred package baseRevision is invalid");
  // Retained v1 release evidence keeps its original verification rules.
  if (policy.schemaId === LEGACY_SCHEMA_ID)
    for (const field of INPUT_HASH_FIELDS)
      if (!HASH_PATTERN.test(deferred[field] ?? ""))
        throw new Error(`deferred package ${field} is invalid`);
  if (typeof deferred.reason !== "string" || deferred.reason.trim() === "")
    throw new Error("deferred package reason is required");
  validateFollowUpPath(deferred.followUpPath);
  if (deferred.distTag !== "latest")
    throw new Error("deferred package distTag must be latest");
  if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(deferred.integrity ?? ""))
    throw new Error("deferred package integrity is invalid");
  if (!HASH_PATTERN.test(deferred.sha256 ?? ""))
    throw new Error("deferred package sha256 is invalid");

  const packages = [policy.releases[0].name, deferred.package];
  if (
    new Set(packages).size !== PUBLIC_PACKAGES.length ||
    !PUBLIC_PACKAGES.every((packageName) => packages.includes(packageName))
  )
    throw new Error(
      "release and deferred packages must be unique, disjoint, and cover all public packages",
    );
  return policy;
}

function validateProbe(probe, deferred, headRevision, schemaId) {
  assertImpactOutputPublishSafe({ impactProbeSet: [probe] });
  if (
    Object.keys(probe).some(
      (key) =>
        key !== "nonPublishable" &&
        /tarball|filename|tgz|publish|integrity|recovery/i.test(key),
    )
  )
    throw new Error(
      "deferred impact probe contains artifact or recovery fields",
    );
  if (probe.package !== deferred.package)
    throw new Error("deferred impact probe package mismatch");
  if (!REVISION_PATTERN.test(probe.baseRevision ?? ""))
    throw new Error("deferred impact probe baseRevision is invalid");
  if (probe.baseRevision !== deferred.baseRevision)
    throw new Error("deferred impact probe baseRevision mismatch");
  for (const field of INPUT_HASH_FIELDS) {
    if (schemaId === LEGACY_SCHEMA_ID) {
      if (probe[field] !== deferred[field])
        throw new Error(`deferred impact probe ${field} mismatch`);
    } else if (!HASH_PATTERN.test(probe[field] ?? "")) {
      throw new Error(`deferred impact probe ${field} is incomplete`);
    }
  }
  for (const field of ["sourceHash", "lockHash", "toolchainHash", "configHash"])
    if (!HASH_PATTERN.test(probe[field] ?? ""))
      throw new Error(`deferred impact probe ${field} is incomplete`);
  if (typeof probe.headRevision !== "string" || probe.headRevision === "")
    throw new Error("deferred impact probe headRevision is incomplete");
  if (headRevision !== undefined && probe.headRevision !== headRevision)
    throw new Error("deferred impact probe headRevision mismatch");
}

export function hashDeferralPolicy(policy) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(policy)))
    .digest("hex");
}

export function assertDeferredReleaseScope(policy, releases) {
  validateDeferralPolicy(policy);
  if (
    !Array.isArray(releases) ||
    JSON.stringify(
      releases.map((release) => ({
        name: release?.name,
        version: release?.version,
      })),
    ) !== JSON.stringify(policy.releases)
  )
    throw new Error(
      `release context does not exactly match deferral policy: expected ${JSON.stringify(policy.releases)}, actual ${JSON.stringify(releases)}. Check the Changesets, package versions and intended release list.`,
    );
}

export function validateDeferredImpact(
  evidence,
  { releases, compatibilityBaselineSet, headRevision } = {},
) {
  exactKeys(
    evidence,
    ["policy", "policySha256", "probes"],
    "deferral evidence",
  );
  const policy = validateDeferralPolicy(evidence.policy);
  if (!HASH_PATTERN.test(evidence.policySha256 ?? ""))
    throw new Error("deferral policy hash is invalid");
  if (evidence.policySha256 !== hashDeferralPolicy(policy))
    throw new Error("deferral policy hash mismatch");
  if (!Array.isArray(evidence.probes) || evidence.probes.length !== 1)
    throw new Error("deferral evidence must contain exactly one impact probe");
  validateProbe(
    evidence.probes[0],
    policy.deferred[0],
    headRevision,
    policy.schemaId,
  );

  if (releases !== undefined) assertDeferredReleaseScope(policy, releases);
  if (compatibilityBaselineSet !== undefined) {
    if (
      !Array.isArray(compatibilityBaselineSet) ||
      compatibilityBaselineSet.length !== 1
    )
      throw new Error(
        "compatibility baseline context must contain exactly one counterpart",
      );
    const baseline = compatibilityBaselineSet[0];
    const deferred = policy.deferred[0];
    if (
      baseline?.package !== deferred.package ||
      baseline?.version !== deferred.version ||
      baseline?.distTag !== deferred.distTag ||
      baseline?.integrity !== deferred.integrity ||
      baseline?.sha256 !== deferred.sha256
    )
      throw new Error(
        "compatibility baseline context does not match deferred package",
      );
  }
  return evidence;
}

export function buildDeferredImpact(policy, probes) {
  const evidence = {
    policy,
    policySha256: hashDeferralPolicy(policy),
    probes,
  };
  return validateDeferredImpact(evidence);
}

export async function verifyDeferredRegistryBaseline(
  policy,
  releasedIdentity,
  fetchImpl = fetch,
) {
  const applies = policy?.releases?.some(
    (release) =>
      release?.name === releasedIdentity?.name &&
      release?.version === releasedIdentity?.version,
  );
  if (!applies) return [];
  validateDeferralPolicy(policy);

  const verified = [];
  for (const deferred of policy.deferred) {
    const metadataUrl = `https://registry.npmjs.org/${encodeURIComponent(deferred.package)}`;
    const metadataResponse = await fetchImpl(metadataUrl);
    if (!metadataResponse?.ok)
      throw new Error(
        `registry metadata request failed for ${deferred.package}`,
      );
    const metadata = await metadataResponse.json();
    const manifest = metadata?.versions?.[deferred.version];
    if (metadata?.["dist-tags"]?.latest !== deferred.version)
      throw new Error(
        `registry latest version changed for ${deferred.package}`,
      );
    if (
      manifest?.name !== deferred.package ||
      manifest?.version !== deferred.version ||
      manifest?.dist?.integrity !== deferred.integrity
    )
      throw new Error(`registry identity mismatch for ${deferred.package}`);

    let tarballUrl;
    try {
      tarballUrl = new URL(manifest.dist.tarball);
    } catch {
      throw new Error(
        `registry tarball URL is invalid for ${deferred.package}`,
      );
    }
    if (
      tarballUrl.protocol !== "https:" ||
      tarballUrl.hostname !== "registry.npmjs.org" ||
      tarballUrl.port !== ""
    )
      throw new Error(
        `registry tarball origin is invalid for ${deferred.package}`,
      );

    const tarballResponse = await fetchImpl(tarballUrl.href);
    if (!tarballResponse?.ok)
      throw new Error(
        `registry tarball request failed for ${deferred.package}`,
      );
    const bytes = Buffer.from(await tarballResponse.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
    if (sha256 !== deferred.sha256 || integrity !== deferred.integrity)
      throw new Error(
        `registry tarball digest mismatch for ${deferred.package}`,
      );
    verified.push({
      package: deferred.package,
      version: deferred.version,
      distTag: deferred.distTag,
      integrity: deferred.integrity,
      sha256: deferred.sha256,
    });
  }
  return verified;
}
