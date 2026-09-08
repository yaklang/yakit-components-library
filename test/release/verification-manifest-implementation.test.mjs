import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createVerificationManifest,
  isManifestFinalized,
  sha256File,
  transitionPublishState,
  validateVerificationManifest,
} from "../../scripts/release/verification-manifest.mjs";
import { createPublicationOutbox } from "../../scripts/release/publication-consumer.mjs";

test("verification artifact preparation uses per-release pack metrics", () => {
  const source = readFileSync(
    new URL(
      "../../scripts/release/prepare-verification-artifact.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(source, /\bpack\.(?:unpackedBytes|fileCount)\b/);
  assert.match(source, /item\.unpackedBytes/);
  assert.match(source, /item\.fileCount/);
});

async function fixture(packages = ["@yakit-libs/yakit-ui"]) {
  const directory = mkdtempSync(join(tmpdir(), "yakit-release-v3-"));
  const artifacts = packages.map((packageName, index) => {
    const version = index === 0 ? "1.2.3" : "2.0.0";
    const tarballPath = join(
      directory,
      `${packageName.replace("@", "").replace("/", "-")}-${version}.tgz`,
    );
    writeFileSync(tarballPath, `${packageName} artifact`);
    return {
      package: packageName,
      version,
      tarballPath,
      distTag: "latest",
      unpackedBytes: 100,
      fileCount: 6,
    };
  });
  const manifest = await createVerificationManifest({
    repository: "yaklang/yakit-components-library",
    workflowCommitSha: "a".repeat(40),
    runId: "42",
    runAttempt: "1",
    sourceRef: "refs/heads/main",
    packArtifactId: "7",
    packArtifactDigest: `sha256:${"b".repeat(64)}`,
    artifacts,
    impactProbeSet: packages.map((packageName) => ({
      package: packageName,
      kind: "impact-probe",
      nonPublishable: true,
      baseRevision: "base",
      headRevision: "head",
      sourceHash: "e".repeat(64),
    })),
    gates: { build: "passed", consumer: "passed" },
    compatibilityBaselineSet:
      packages.length === 1
        ? [
            {
              package:
                packages[0] === "@yakit-libs/yakit-ui"
                  ? "@yakit-libs/yakit-ui-icons"
                  : "@yakit-libs/yakit-ui",
              version: "0.9.0",
              distTag: "latest",
              resolved:
                "https://registry.npmjs.org/example/-/example-0.9.0.tgz",
              integrity: "sha512-fixture",
              sha256: "c".repeat(64),
              filename: "baseline-example-0.9.0.tgz",
              packedBytes: 123,
              cacheKey: "fixture-cache-key",
            },
          ]
        : [],
  });
  for (const release of manifest.releases) {
    if (release.name !== "@yakit-libs/yakit-ui-icons") continue;
    release.gates.size = "passed";
    release.evidence = {
      size: {
        artifactSha256: release.tarball.sha256,
        filename: `yakit-ui-icons-size-report-${release.version}.json`,
        reportSha256: "d".repeat(64),
        schemaVersion: 2,
        status: "PASS",
      },
    };
  }
  manifest.finalized = isManifestFinalized(manifest);
  return { artifacts, directory, manifest };
}

test("v3 accepts UI-only and records per-package lifecycle identity", async () => {
  const { artifacts, manifest } = await fixture();
  assert.equal(manifest.schemaId, "yakit-ui-release-manifest/v3");
  assert.deepEqual(manifest.releaseSet, ["@yakit-libs/yakit-ui"]);
  assert.equal(manifest.releases[0].identity, "@yakit-libs/yakit-ui@1.2.3");
  await assert.doesNotReject(() =>
    validateVerificationManifest(manifest, {
      expectedPackages: manifest.releaseSet,
      tarballPaths: { "@yakit-libs/yakit-ui": artifacts[0].tarballPath },
    }),
  );
});

test("v3 accepts icons-only and both packages at different versions", async () => {
  const icons = await fixture(["@yakit-libs/yakit-ui-icons"]);
  await assert.doesNotReject(() =>
    validateVerificationManifest(icons.manifest),
  );
  const both = await fixture([
    "@yakit-libs/yakit-ui",
    "@yakit-libs/yakit-ui-icons",
  ]);
  assert.deepEqual(
    both.manifest.releases.map((item) => item.version),
    ["1.2.3", "2.0.0"],
  );
  await assert.doesNotReject(() => validateVerificationManifest(both.manifest));
});

test("v3 rejects empty, reordered, duplicate, or shadow release entries", async () => {
  await assert.rejects(
    () => fixture([]),
    /releaseSet must be a non-empty array/,
  );
  const { manifest } = await fixture([
    "@yakit-libs/yakit-ui",
    "@yakit-libs/yakit-ui-icons",
  ]);
  manifest.releaseSet.reverse();
  await assert.rejects(
    () => validateVerificationManifest(manifest),
    /deterministic order|must equal releases/,
  );
  manifest.releaseSet.reverse();
  manifest.releases.push(structuredClone(manifest.releases[0]));
  await assert.rejects(
    () => validateVerificationManifest(manifest),
    /unique package names/,
  );
  await assert.rejects(
    () =>
      validateVerificationManifest(
        {
          schemaVersion: 2,
          package: { name: "@yakit-libs/yakit-ui" },
          artifacts: [
            { package: "@yakit-libs/yakit-ui", version: "1.0.0" },
            { package: "@yakit-libs/yakit-ui-icons", version: "2.0.0" },
          ],
        },
        { allowLegacy: true, legacyOperation: "recovery" },
      ),
    /original same-version identity/,
  );
});

test("legacy v1 is metadata-only and v2 cannot initiate publish", async () => {
  const v1 = {
    schemaVersion: 1,
    package: { name: "yakit-ui", version: "1.0.0", distTag: "latest" },
    tarball: {},
  };
  await assert.doesNotReject(() =>
    validateVerificationManifest(v1, {
      allowLegacy: true,
      legacyOperation: "metadata",
    }),
  );
  await assert.rejects(
    () =>
      validateVerificationManifest(v1, {
        allowLegacy: true,
        legacyOperation: "publish",
      }),
    /metadata recovery only/,
  );
  await assert.rejects(
    () =>
      validateVerificationManifest(
        { schemaVersion: 2, artifacts: [] },
        { allowLegacy: true, legacyOperation: "publish" },
      ),
    /cannot initiate publication/,
  );
});

test("v3 rejects changed tarballs and incomplete lifecycle state", async () => {
  const { artifacts, manifest } = await fixture();
  writeFileSync(artifacts[0].tarballPath, "changed");
  await assert.rejects(
    () =>
      validateVerificationManifest(manifest, {
        tarballPaths: { "@yakit-libs/yakit-ui": artifacts[0].tarballPath },
      }),
    /SHA-256/,
  );
  delete manifest.releases[0].recovery;
  await assert.rejects(
    () => validateVerificationManifest(manifest),
    /lifecycle state/,
  );
});

test("v3 recomputes candidate SRI instead of trusting a valid-looking string", async () => {
  const { artifacts, manifest } = await fixture();
  manifest.releases[0].tarball.integrity = `sha512-${Buffer.from("wrong").toString("base64")}`;
  await assert.rejects(
    () =>
      validateVerificationManifest(manifest, {
        tarballPaths: { "@yakit-libs/yakit-ui": artifacts[0].tarballPath },
      }),
    /tarball integrity mismatch/,
  );
});

test("single-package v3 requires an exact frozen counterpart baseline", async () => {
  const { manifest } = await fixture();
  manifest.compatibilityBaselineSet = [];
  await assert.rejects(
    () => validateVerificationManifest(manifest),
    /exact counterpart identities/,
  );
  const missingArtifact = await fixture();
  delete missingArtifact.manifest.compatibilityBaselineSet[0].filename;
  await assert.rejects(
    () => validateVerificationManifest(missingArtifact.manifest),
    /identity is incomplete/,
  );
});

test("impact probes require explicit non-publishable hermetic identity", async () => {
  const { manifest } = await fixture();
  manifest.impactProbeSet = [
    {
      package: "@yakit-libs/yakit-ui-icons",
      kind: "impact-probe",
      nonPublishable: false,
    },
  ];
  await assert.rejects(
    () => validateVerificationManifest(manifest),
    /non-publishable shadow artifacts/,
  );
});

test("per-package publish state machine retries failure and converges registry truth", async () => {
  const { manifest } = await fixture();
  let entry = manifest.releases[0];
  entry = transitionPublishState(entry, "publishing");
  entry = transitionPublishState(entry, "failed");
  entry = transitionPublishState(entry, "publishing");
  assert.equal(entry.publish.attempt, 2);
  entry = transitionPublishState(entry, "published", { registryMatch: true });
  assert.equal(entry.publish.status, "published");
  assert.equal(transitionPublishState(entry, "published"), entry);
  assert.throws(
    () => transitionPublishState(entry, "publishing"),
    /not allowed/,
  );
});

test("publish validation rejects an unsealed exact consumer gate", async () => {
  const { manifest } = await fixture();
  delete manifest.releases[0].gates.consumer;
  manifest.finalized = false;
  await assert.rejects(
    () => validateVerificationManifest(manifest),
    /must be finalized/,
  );
  await assert.doesNotReject(() =>
    validateVerificationManifest(manifest, { allowDraft: true }),
  );
});

test("icons publication requires size evidence without applying the gate to UI", async () => {
  const icons = await fixture(["@yakit-libs/yakit-ui-icons"]);
  delete icons.manifest.releases[0].gates.size;
  delete icons.manifest.releases[0].evidence;
  icons.manifest.finalized = false;
  await assert.rejects(
    () => validateVerificationManifest(icons.manifest),
    /must be finalized/,
  );
  const ui = await fixture(["@yakit-libs/yakit-ui"]);
  assert.equal(ui.manifest.releases[0].gates.size, undefined);
  await assert.doesNotReject(() => validateVerificationManifest(ui.manifest));
});

test("v3 rejects a hash-matching but schema-incomplete icons size report", async () => {
  const { directory, manifest } = await fixture(["@yakit-libs/yakit-ui-icons"]);
  const release = manifest.releases[0];
  const reportPath = join(directory, release.evidence.size.filename);
  writeFileSync(
    reportPath,
    JSON.stringify({
      schemaVersion: 2,
      status: "PASS",
      artifact: {
        package: release.name,
        sha256: release.tarball.sha256,
      },
    }),
  );
  release.evidence.size.reportSha256 = await sha256File(reportPath);
  await assert.rejects(
    () =>
      validateVerificationManifest(manifest, {
        evidenceDirectory: directory,
      }),
    /size report strict validation failed/,
  );

  writeFileSync(reportPath, "{}\n");
  await assert.rejects(
    () =>
      validateVerificationManifest(manifest, { evidenceDirectory: directory }),
    /size report SHA-256 mismatch|size report identity mismatch/,
  );
});

test("v3 publication requires and revalidates the immutable outbox file", async () => {
  const { directory, manifest } = await fixture();
  const outboxPath = join(directory, "transactional-outbox.json");
  writeFileSync(
    outboxPath,
    `${JSON.stringify(createPublicationOutbox(manifest), null, 2)}\n`,
  );
  manifest.publicationOutbox = {
    filename: "transactional-outbox.json",
    sha256: await sha256File(outboxPath),
  };
  await assert.doesNotReject(() =>
    validateVerificationManifest(manifest, {
      evidenceDirectory: directory,
      requirePublicationOutbox: true,
    }),
  );
  writeFileSync(outboxPath, "{}\n");
  await assert.rejects(
    () =>
      validateVerificationManifest(manifest, {
        evidenceDirectory: directory,
        requirePublicationOutbox: true,
      }),
    /publication outbox SHA-256 mismatch/,
  );
});

test("deferred UI evidence is sealed without adding a UI release or outbox entry", async () => {
  const { buildDeferredImpact } = await import(
    "../../scripts/release/release-deferrals.mjs"
  );
  const { manifest } = await fixture(["@yakit-libs/yakit-ui-icons"]);
  const ui = "@yakit-libs/yakit-ui";
  const hashes = Object.fromEntries(
    [
      "sourceHash",
      "baseSourceHash",
      "headSourceHash",
      "lockHash",
      "baseLockHash",
      "headLockHash",
      "toolchainHash",
      "baseToolchainHash",
      "headToolchainHash",
      "configHash",
      "baseConfigHash",
      "headConfigHash",
      "snapshotHash",
      "toolchainIdentityHash",
    ].map((key) => [key, "b".repeat(64)]),
  );
  const probe = {
    package: ui,
    kind: "impact-probe",
    nonPublishable: true,
    baseRevision: "b".repeat(40),
    headRevision: manifest.workflowCommitSha,
    ...hashes,
    packageSnapshotHashes: { base: "c".repeat(64), head: "d".repeat(64) },
    toolchainIdentity: {
      node: "v24.12.0",
      pnpm: "10.34.5",
      os: { platform: "linux", release: "6", arch: "x64" },
    },
  };
  const policy = {
    schemaId: "yakit-ui-release-deferral/v1",
    releases: [{ name: "@yakit-libs/yakit-ui-icons", version: "1.2.3" }],
    deferred: [
      {
        package: ui,
        version: "0.9.0",
        distTag: "latest",
        integrity: manifest.compatibilityBaselineSet[0].integrity,
        sha256: manifest.compatibilityBaselineSet[0].sha256,
        baseRevision: probe.baseRevision,
        ...Object.fromEntries(
          [
            "headSourceHash",
            "headLockHash",
            "headToolchainHash",
            "headConfigHash",
          ].map((key) => [key, probe[key]]),
        ),
        reason: "UI release intentionally pending",
        followUpPath: "docs/pending-releases/README.md",
      },
    ],
  };
  manifest.compatibilityBaselineSet[0].integrity =
    "sha512-" + Buffer.alloc(64).toString("base64");
  policy.deferred[0].integrity = manifest.compatibilityBaselineSet[0].integrity;
  manifest.deferredImpact = buildDeferredImpact(policy, [probe]);
  await validateVerificationManifest(manifest);
  const outbox = createPublicationOutbox(manifest);
  assert.equal(manifest.releases.length, 1);
  assert.equal(manifest.releases[0].name, "@yakit-libs/yakit-ui-icons");
  assert.deepEqual(Object.keys(outbox.records), [
    "publish:@yakit-libs/yakit-ui-icons@1.2.3",
  ]);
  assert.deepEqual(
    Object.values(outbox.records).map((record) => record.packageName),
    ["@yakit-libs/yakit-ui-icons"],
  );
  for (const mutate of [
    (value) => {
      value.compatibilityBaselineSet[0].version = "0.9.1";
    },
    (value) => {
      value.releases[0].version = "1.2.4";
    },
    (value) => {
      value.deferredImpact.probes[0].headRevision = "c".repeat(40);
    },
    (value) => {
      value.deferredImpact.probes[0].tarball = "ui.tgz";
    },
    (value) => {
      value.deferredImpact.policy.deferred[0].headSourceHash = "e".repeat(64);
    },
  ]) {
    const forged = structuredClone(manifest);
    mutate(forged);
    await assert.rejects(validateVerificationManifest(forged));
  }
});
