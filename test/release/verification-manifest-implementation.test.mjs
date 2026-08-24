import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createVerificationManifest,
  sha256File,
  validateVerificationManifest,
} from "../../scripts/release/verification-manifest.mjs";

const makeFixture = async ({
  packageName = "@yakit-libs/yakit-ui",
  tarballName = "yakit-libs-yakit-ui-1.2.3.tgz",
} = {}) => {
  const directory = mkdtempSync(join(tmpdir(), "yakit-verification-"));
  const tarballPath = join(directory, tarballName);
  writeFileSync(tarballPath, "canonical artifact");
  const options = {
    tarballPath,
    repository: "yaklang/yakit-components-library",
    workflowCommitSha: "a".repeat(40),
    runId: "42",
    runAttempt: "1",
    sourceRef: "refs/heads/main",
    packageName,
    packageVersion: "1.2.3",
    distTag: "latest",
    packArtifactId: "7",
    packArtifactDigest: `sha256:${"b".repeat(64)}`,
    unpackedBytes: 100,
    fileCount: 6,
    gates: { build: "passed", consumer: "passed" },
  };
  return {
    directory,
    manifest: await createVerificationManifest(options),
    options,
    tarballPath,
  };
};

test("manifest creator binds the canonical tarball hash and size", async () => {
  const { manifest, tarballPath } = await makeFixture();
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.tarball.sha256, await sha256File(tarballPath));
  assert.equal(manifest.tarball.packedBytes, 18);
});

test("validator accepts legacy schema v1 single-package recovery evidence", async () => {
  const { manifest, tarballPath } = await makeFixture({
    packageName: "yakit-ui",
    tarballName: "yakit-ui-1.2.3.tgz",
  });
  manifest.schemaVersion = 1;
  delete manifest.artifacts;
  await assert.doesNotReject(() =>
    validateVerificationManifest(manifest, {
      expectedPackages: ["yakit-ui"],
      packageName: "yakit-ui",
      tarballPath,
      tarballPaths: { "yakit-ui": tarballPath },
    }),
  );
});

test("ordinary publication rejects legacy schema v1 evidence", async () => {
  const { manifest, tarballPath } = await makeFixture();
  manifest.schemaVersion = 1;
  delete manifest.artifacts;
  await assert.rejects(
    () =>
      validateVerificationManifest(manifest, {
        expectedPackages: [
          "@yakit-libs/yakit-ui",
          "@yakit-libs/yakit-ui-icons",
        ],
        requiredSchemaVersion: 2,
        tarballPath,
      }),
    /schemaVersion must equal 2 for this operation/,
  );
});

test("manifest validator accepts matching trusted workflow identities", async () => {
  const { manifest, options, tarballPath } = await makeFixture();
  await assert.doesNotReject(() =>
    validateVerificationManifest(manifest, {
      tarballPath,
      repository: options.repository,
      workflowCommitSha: options.workflowCommitSha,
      runId: options.runId,
      sourceRef: options.sourceRef,
      packageName: options.packageName,
      packageVersion: options.packageVersion,
      distTag: options.distTag,
      packArtifactId: options.packArtifactId,
    }),
  );
});

test("manifest validator rejects a changed tarball", async () => {
  const { manifest, tarballPath } = await makeFixture();
  writeFileSync(tarballPath, "modified artifact");
  await assert.rejects(
    () => validateVerificationManifest(manifest, { tarballPath }),
    /SHA-256/,
  );
});

test("manifest validator rejects a malformed GitHub artifact digest", async () => {
  const { manifest } = await makeFixture();
  manifest.packArtifact.digest = "not-a-digest";
  await assert.rejects(
    () => validateVerificationManifest(manifest),
    /packArtifact\.digest/,
  );
});

test("manifest validator rejects a non-SHA workflow commit identity", async () => {
  const { manifest } = await makeFixture();
  manifest.workflowCommitSha = "main";
  await assert.rejects(
    () => validateVerificationManifest(manifest),
    /workflowCommitSha/,
  );
});

test("manifest validator rejects missing gate results", async () => {
  const { manifest } = await makeFixture();
  delete manifest.gates;
  await assert.rejects(() => validateVerificationManifest(manifest), /gates/);
});

test("manifest validator rejects a non-passing gate result", async () => {
  const { manifest } = await makeFixture();
  manifest.gates.consumer = "failed";
  await assert.rejects(
    () => validateVerificationManifest(manifest),
    /gates\.consumer/,
  );
});

test("manifest validator rejects invalid size and file metrics", async () => {
  const { manifest } = await makeFixture();
  manifest.tarball.fileCount = -1;
  await assert.rejects(
    () => validateVerificationManifest(manifest),
    /fileCount/,
  );
});

test("manifest validator rejects a tarball size mismatch even when its hash is updated", async () => {
  const { manifest, tarballPath } = await makeFixture();
  writeFileSync(tarballPath, "different canonical artifact");
  manifest.tarball.sha256 = await sha256File(tarballPath);
  await assert.rejects(
    () => validateVerificationManifest(manifest, { tarballPath }),
    /packedBytes/,
  );
});

test("manifest validator binds every fixed-package tarball", async () => {
  const { manifest, directory, options, tarballPath } = await makeFixture();
  const iconsTarball = join(directory, "yakit-libs-yakit-ui-icons-1.2.3.tgz");
  writeFileSync(iconsTarball, "icons artifact");
  manifest.artifacts.push({
    package: "@yakit-libs/yakit-ui-icons",
    version: "1.2.3",
    filename: "yakit-libs-yakit-ui-icons-1.2.3.tgz",
    sha256: await sha256File(iconsTarball),
    packedBytes: 14,
    unpackedBytes: 100,
    fileCount: 10,
  });
  await assert.doesNotReject(() =>
    validateVerificationManifest(manifest, {
      expectedPackages: ["@yakit-libs/yakit-ui", "@yakit-libs/yakit-ui-icons"],
      tarballPath,
      tarballPaths: {
        "@yakit-libs/yakit-ui": tarballPath,
        "@yakit-libs/yakit-ui-icons": iconsTarball,
      },
      packageName: options.packageName,
    }),
  );
  writeFileSync(iconsTarball, "changed icons artifact");
  await assert.rejects(
    () =>
      validateVerificationManifest(manifest, {
        tarballPaths: {
          "@yakit-libs/yakit-ui": tarballPath,
          "@yakit-libs/yakit-ui-icons": iconsTarball,
        },
      }),
    /@yakit-libs\/yakit-ui-icons tarball SHA-256 mismatch/,
  );
});
