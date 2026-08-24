import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRecoveryPlanAllowed,
  classifyPublicationState,
} from "../../scripts/release/recover-partial-publication.mjs";

const artifacts = [
  { package: "yakit-ui", version: "0.2.0" },
  { package: "yakit-ui-icons", version: "0.2.0" },
];

test("partial recovery selects only the missing exact verified package", () => {
  assert.deepEqual(
    classifyPublicationState(artifacts, {
      "yakit-ui": {
        distTagVersion: "0.2.0",
        expectedShasum: "core-hash",
        shasum: "core-hash",
        versionExists: true,
      },
      "yakit-ui-icons": {
        distTagVersion: null,
        expectedShasum: "icons-hash",
        shasum: null,
        versionExists: false,
      },
    }),
    { missing: ["yakit-ui-icons"], published: ["yakit-ui"] },
  );
});

test("partial recovery may advance a dist-tag to a missing verified version", () => {
  assert.deepEqual(
    classifyPublicationState(artifacts, {
      "yakit-ui": {
        distTagVersion: "0.2.0",
        expectedShasum: "core-hash",
        shasum: "core-hash",
        versionExists: true,
      },
      "yakit-ui-icons": {
        distTagVersion: "0.1.0",
        expectedShasum: "icons-hash",
        shasum: null,
        versionExists: false,
      },
    }),
    { missing: ["yakit-ui-icons"], published: ["yakit-ui"] },
  );
});

test("partial recovery rejects moving a dist-tag back to a missing version", () => {
  assert.throws(
    () =>
      classifyPublicationState(artifacts, {
        "yakit-ui": {
          distTagVersion: "0.2.0",
          expectedShasum: "core-hash",
          shasum: "core-hash",
          versionExists: true,
        },
        "yakit-ui-icons": {
          distTagVersion: "0.3.0",
          expectedShasum: "icons-hash",
          shasum: null,
          versionExists: false,
        },
      }),
    /dist-tag cannot be moved backward/,
  );
});

test("partial recovery compares numeric prerelease identifiers numerically", () => {
  const prereleaseArtifacts = [
    artifacts[0],
    { package: "yakit-ui-icons", version: "1.0.0-beta.10" },
  ];
  assert.deepEqual(
    classifyPublicationState(prereleaseArtifacts, {
      "yakit-ui": {
        distTagVersion: "0.2.0",
        expectedShasum: "core-hash",
        shasum: "core-hash",
        versionExists: true,
      },
      "yakit-ui-icons": {
        distTagVersion: "1.0.0-beta.2",
        expectedShasum: "icons-hash",
        shasum: null,
        versionExists: false,
      },
    }),
    { missing: ["yakit-ui-icons"], published: ["yakit-ui"] },
  );
});

test("partial recovery does not replace a stable tag with a prerelease", () => {
  const prereleaseArtifacts = [
    artifacts[0],
    { package: "yakit-ui-icons", version: "1.0.0-rc.1" },
  ];
  assert.throws(
    () =>
      classifyPublicationState(prereleaseArtifacts, {
        "yakit-ui": {
          distTagVersion: "0.2.0",
          expectedShasum: "core-hash",
          shasum: "core-hash",
          versionExists: true,
        },
        "yakit-ui-icons": {
          distTagVersion: "1.0.0",
          expectedShasum: "icons-hash",
          shasum: null,
          versionExists: false,
        },
      }),
    /dist-tag cannot be moved backward/,
  );
});

test("legacy v1 evidence allows metadata recovery for an existing package", () => {
  assert.doesNotThrow(() =>
    assertRecoveryPlanAllowed(1, {
      missing: [],
      published: ["yakit-ui"],
    }),
  );
});

test("legacy v1 evidence cannot publish a missing package", () => {
  assert.throws(
    () =>
      assertRecoveryPlanAllowed(1, {
        missing: ["yakit-ui"],
        published: [],
      }),
    /schema-v1 evidence supports metadata recovery only/,
  );
});

test("partial recovery never republishes already verified packages", () => {
  assert.deepEqual(
    classifyPublicationState(artifacts, {
      "yakit-ui": {
        distTagVersion: "0.2.0",
        expectedShasum: "core-hash",
        shasum: "core-hash",
        versionExists: true,
      },
      "yakit-ui-icons": {
        distTagVersion: "0.2.0",
        expectedShasum: "icons-hash",
        shasum: "icons-hash",
        versionExists: true,
      },
    }),
    { missing: [], published: ["yakit-ui", "yakit-ui-icons"] },
  );
});

test("partial recovery fails closed when an existing version has another tarball", () => {
  assert.throws(
    () =>
      classifyPublicationState(artifacts, {
        "yakit-ui": {
          distTagVersion: "0.2.0",
          expectedShasum: "verified-core-hash",
          shasum: "different-core-hash",
          versionExists: true,
        },
        "yakit-ui-icons": {
          distTagVersion: null,
          expectedShasum: "icons-hash",
          shasum: null,
          versionExists: false,
        },
      }),
    /exists with a different tarball/,
  );
});

test("partial recovery fails closed when the verified dist-tag has moved", () => {
  assert.throws(
    () =>
      classifyPublicationState(artifacts, {
        "yakit-ui": {
          distTagVersion: "0.1.0",
          expectedShasum: "core-hash",
          shasum: "core-hash",
          versionExists: true,
        },
        "yakit-ui-icons": {
          distTagVersion: null,
          expectedShasum: "icons-hash",
          shasum: null,
          versionExists: false,
        },
      }),
    /dist-tag does not match the verified version/,
  );
});
