import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  CURATED_DISTRIBUTION_CAPS,
  ICON_DISTRIBUTION_CAPS,
  LIGHTWEIGHT_BUDGET,
  OLDICON_COMPATIBILITY_ALLOWANCE,
  SIZE_PROBES,
  SIZE_REPORT_SCHEMA_ID,
  SIZE_SENTINEL_SET,
  classifyDistribution,
  classifyLightweightMeasurements,
  classifyReportStatus,
  classifyRuntime,
  comparePairedBuildOptions,
  createIdentityRecord,
  failureSignalsFromReport,
  normalizedBuildOptions,
  sha256Json,
  sha256Text,
  validateSizeReport,
} from "../../packages/yakit-ui-icons/scripts/size-observability-validator.mjs";

test("oldicon receives an explicit additive distribution allowance", () => {
  assert.deepEqual(ICON_DISTRIBUTION_CAPS, {
    fileCount:
      CURATED_DISTRIBUTION_CAPS.fileCount +
      OLDICON_COMPATIBILITY_ALLOWANCE.fileCount,
    packedBytes:
      CURATED_DISTRIBUTION_CAPS.packedBytes +
      OLDICON_COMPATIBILITY_ALLOWANCE.packedBytes,
    unpackedBytes:
      CURATED_DISTRIBUTION_CAPS.unpackedBytes +
      OLDICON_COMPATIBILITY_ALLOWANCE.unpackedBytes,
  });
});

const validReport = () => {
  const artifact = {
    filename: "yakit-icons.tgz",
    integrity: `sha512-${"A".repeat(88)}`,
    package: "@yakit-libs/yakit-ui-icons",
    sha256: "a".repeat(64),
    version: "1.2.3",
  };
  const measurements = ["vite", "esbuild"].flatMap((tool) =>
    ["browser", "general"].flatMap((condition) =>
      SIZE_PROBES.map((probe) => {
        const css =
          condition === "browser"
            ? { gzipBytes: 5, minifiedBytes: 10, unminifiedBytes: 12 }
            : { gzipBytes: 0, minifiedBytes: 0, unminifiedBytes: 0 };
        let basename = `${probe.subpath.slice(2)}/index.js`;
        if (probe.subpath === ".") basename = "index.js";
        else if (probe.kind === "registry")
          basename = `${probe.subpath.slice(2)}.js`;
        const expectedTarget = `dist/${
          condition === "browser" ? "browser/" : ""
        }${basename}`;
        return {
          buildOptions: comparePairedBuildOptions(
            normalizedBuildOptions(tool, condition, false),
            normalizedBuildOptions(tool, condition, true),
          ),
          condition,
          control: {
            css: { gzipBytes: 0, minifiedBytes: 0, unminifiedBytes: 0 },
            js: { gzipBytes: 10, minifiedBytes: 20, unminifiedBytes: 30 },
            total: { gzipBytes: 10, minifiedBytes: 20, unminifiedBytes: 30 },
          },
          delta: {
            css,
            js: { gzipBytes: 100, minifiedBytes: 200, unminifiedBytes: 300 },
            total: {
              gzipBytes: 100 + css.gzipBytes,
              minifiedBytes: 200 + css.minifiedBytes,
              unminifiedBytes: 300 + css.unminifiedBytes,
            },
          },
          kind: probe.kind,
          probe: probe.id,
          resolution: {
            actual: expectedTarget,
            expected: expectedTarget,
            matchedExpectedCondition: true,
          },
          resolvedInputs: ["dist/index.js"],
          retention: {
            expected: true,
            registryFull: true,
            unrelatedSentinels: [],
          },
          sizes: {
            css,
            js: { gzipBytes: 110, minifiedBytes: 220, unminifiedBytes: 330 },
            total: {
              gzipBytes: 110 + css.gzipBytes,
              minifiedBytes: 220 + css.minifiedBytes,
              unminifiedBytes: 330 + css.unminifiedBytes,
            },
          },
          tool,
        };
      }),
    ),
  );
  const distribution = {
    ...classifyDistribution({
      fileCount: 10,
      packedBytes: 100,
      unpackedBytes: 200,
    }),
    fileCount: 10,
    packedBytes: 100,
    unpackedBytes: 200,
  };
  const commonManifest = {
    name: "yakit-ui-icons-size-install-fixture",
    version: "1.0.0",
    private: true,
    packageManager: "pnpm@10.34.5",
    dependencies: {
      "@yakit-libs/color": "1.4.1",
      react: "18.3.1",
      "react-dom": "18.3.1",
    },
  };
  const candidateManifest = structuredClone(commonManifest);
  candidateManifest.dependencies[artifact.package] =
    `file:../artifacts/${artifact.filename}`;
  const config = {
    autoInstallPeers: false,
    ignoreScripts: true,
    offline: true,
    sharedWorkspaceLockfile: false,
    strictPeerDependencies: true,
  };
  const configContents =
    "auto-install-peers=false\nignore-scripts=true\noffline=true\nshared-workspace-lockfile=false\nstrict-peer-dependencies=true\n";
  const flags = ["install", "--frozen-lockfile=false", "--reporter=silent"];
  const sharedPackages = [
    {
      bytes: 40,
      dependencies: [],
      fileCount: 2,
      name: "@yakit-libs/color",
      path: "node_modules/.pnpm/@yakit-libs+color@1.4.1/node_modules/@yakit-libs/color",
      version: "1.4.1",
    },
    {
      bytes: 30,
      dependencies: [],
      fileCount: 2,
      name: "react",
      path: "node_modules/.pnpm/react@18.3.1/node_modules/react",
      version: "18.3.1",
    },
    {
      bytes: 30,
      dependencies: [],
      fileCount: 2,
      name: "react-dom",
      path: "node_modules/.pnpm/react-dom@18.3.1/node_modules/react-dom",
      version: "18.3.1",
    },
  ];
  const iconPackage = {
    bytes: distribution.unpackedBytes,
    dependencies: ["@yakit-libs/color"],
    fileCount: distribution.fileCount,
    name: artifact.package,
    path: "node_modules/.pnpm/@yakit-libs+yakit-ui-icons@file+..+artifacts+yakit-icons.tgz/node_modules/@yakit-libs/yakit-ui-icons",
    version: artifact.version,
  };
  const projectEvidence = (manifest, packages, lockfileSha256) => ({
    configSha256: sha256Json(config),
    flagsSha256: sha256Json(flags),
    installExitCode: 0,
    installStderr: "",
    lockfileSha256,
    packageCount: packages.length,
    packages,
    projectManifest: manifest,
    projectManifestFileSha256: sha256Text(
      `${JSON.stringify(manifest, null, 2)}\n`,
    ),
    projectManifestSha256: sha256Json(manifest),
    totalBytes: packages.reduce((sum, item) => sum + item.bytes, 0),
  });
  const candidatePackages = [...sharedPackages, iconPackage];
  const controlPackages = structuredClone(sharedPackages);
  const lightweight = classifyLightweightMeasurements(measurements);
  const report = {
    artifact,
    distribution,
    externalObservations: [
      {
        normative: false,
        observed: { gzipBytes: 321, rawBytes: 510 },
        package: "@yakit-libs/yakit-ui-icons",
        source: "Bundlephobia",
      },
    ],
    failureSignals: [],
    identityRecord: createIdentityRecord({
      artifactSha256: artifact.sha256,
      filename: artifact.filename,
      integrity: artifact.integrity,
      packedBytes: distribution.packedBytes,
      version: artifact.version,
    }),
    installedGraph: {
      candidate: {
        ...projectEvidence(
          candidateManifest,
          candidatePackages,
          "b".repeat(64),
        ),
        artifactSha256: artifact.sha256,
      },
      color: {
        instances: 1,
        paths: [sharedPackages[0].path],
        version: "1.4.1",
      },
      control: projectEvidence(commonManifest, controlPackages, "c".repeat(64)),
      delta: { packageCount: 1, totalBytes: distribution.unpackedBytes },
      installContract: {
        commonManifest,
        commonManifestSha256: sha256Json(commonManifest),
        config,
        configContents,
        configFileSha256: sha256Text(configContents),
        configSha256: sha256Json(config),
        flags,
        manifestDifference: {
          candidate: `file:../artifacts/${artifact.filename}`,
          control: null,
          dependency: artifact.package,
        },
        packageManager: { name: "pnpm", version: "10.34.5" },
        schemaId: "yakit-ui-icons-isolated-install/v1",
      },
      react: {
        instances: 1,
        paths: [sharedPackages[1].path],
        version: "18.3.1",
      },
      runtimeClosure: {
        bytes: distribution.unpackedBytes + sharedPackages[0].bytes,
        packageCount: 2,
      },
    },
    lightweight,
    measurements,
    nodeProbes: { cssFree: true, esm: true, ssr: true },
    runtime: null,
    schemaId: SIZE_REPORT_SCHEMA_ID,
    schemaVersion: 2,
    sentinelSet: {
      record: SIZE_SENTINEL_SET,
      sha256: sha256Json(SIZE_SENTINEL_SET),
    },
    status: null,
    toolOwnership: {
      esbuild: {
        directDevDependency: true,
        lockImporterExact: true,
        manifestVersion: "0.25.9",
        requiredVersion: "0.25.9",
        runtimeVersion: "0.25.9",
      },
    },
    tools: { esbuild: "0.25.9", node: "v24.0.0", vite: "6.3.5" },
    validationErrors: [],
  };
  report.failureSignals = failureSignalsFromReport(report, lightweight);
  report.runtime = classifyRuntime({ signals: report.failureSignals });
  report.status = classifyReportStatus(
    report.distribution,
    report.lightweight,
    report.runtime,
  );
  return report;
};

test("distribution classifier reports utilization, headroom, and cap bands", () => {
  const atCap = classifyDistribution({ ...ICON_DISTRIBUTION_CAPS });
  assert.equal(atCap.classification, "NEAR_CAP");
  assert.equal(atCap.gateStatus, "PASS");
  assert.deepEqual(atCap.headroom, {
    fileCount: 0,
    packedBytes: 0,
    unpackedBytes: 0,
  });
  assert.deepEqual(atCap.nearCapDimensions.sort(), [
    "fileCount",
    "packedBytes",
    "unpackedBytes",
  ]);

  const within = classifyDistribution({
    fileCount: 31,
    packedBytes: 569_999,
    unpackedBytes: 2_849_999,
  });
  assert.equal(within.classification, "WITHIN_CAP");
});

test("distribution classifier reports every exceeded or missing metric", () => {
  const exceeded = classifyDistribution({
    fileCount: ICON_DISTRIBUTION_CAPS.fileCount + 1,
    packedBytes: ICON_DISTRIBUTION_CAPS.packedBytes + 1,
    unpackedBytes: ICON_DISTRIBUTION_CAPS.unpackedBytes + 1,
  });
  assert.equal(exceeded.classification, "EXCEEDS_CAP");
  assert.equal(exceeded.gateStatus, "FAIL");
  assert.deepEqual(exceeded.breaches.map(({ metric }) => metric).sort(), [
    "fileCount",
    "packedBytes",
    "unpackedBytes",
  ]);
  assert.equal(
    classifyDistribution({ packedBytes: 1 }).classification,
    "INCONCLUSIVE",
  );
});

test("report validator fails closed for INCONCLUSIVE evidence", () => {
  const report = validReport();
  report.validationErrors = [
    {
      code: "MISSING_INSTALLED_GRAPH",
      message: "installed graph is missing",
      source: "test",
    },
  ];
  report.runtime = classifyRuntime({
    evidenceErrors: report.validationErrors.map(({ code }) => code),
  });
  report.status = "INCONCLUSIVE";
  assert.deepEqual(validateSizeReport(report), []);
  assert.equal(
    classifyReportStatus(
      report.distribution,
      report.lightweight,
      report.runtime,
    ),
    "INCONCLUSIVE",
  );
});

test("lightweight classifier gates minified raw and gzip deltas", () => {
  const pass = validReport().measurements;
  assert.equal(classifyLightweightMeasurements(pass).classification, "PASS");
  pass[0].delta.js.minifiedBytes = LIGHTWEIGHT_BUDGET.minifiedBytes + 1;
  pass[1].delta.js.gzipBytes = LIGHTWEIGHT_BUDGET.gzipBytes + 1;
  const result = classifyLightweightMeasurements(pass);
  assert.equal(result.classification, "FAIL");
  assert.deepEqual(result.breaches.map(({ metric }) => metric).sort(), [
    "gzipBytes",
    "minifiedBytes",
  ]);

  const sentinelReport = validReport().measurements;
  sentinelReport[0].retention.unrelatedSentinels.push("MailSolid");
  assert.deepEqual(
    classifyLightweightMeasurements(sentinelReport).breaches.map(
      ({ metric }) => metric,
    ),
    ["unrelatedSentinels"],
  );
});

test("final status requires both distribution and runtime light budgets", () => {
  assert.equal(
    classifyReportStatus(
      { gateStatus: "PASS" },
      { classification: "PASS" },
      { classification: "HEALTHY_ANALYZER_AMBIGUITY" },
    ),
    "PASS",
  );
  assert.equal(
    classifyReportStatus(
      { gateStatus: "PASS" },
      { classification: "FAIL" },
      { classification: "HEALTHY_ANALYZER_AMBIGUITY" },
    ),
    "FAIL",
  );
});

test("runtime classifier fails closed and separates confirmed defect categories", () => {
  assert.equal(
    classifyRuntime({ evidenceErrors: ["MISSING_INSTALLED_GRAPH"] })
      .classification,
    "INCONCLUSIVE",
  );
  const signal = (engine, condition, source = "paired-graph") => ({
    condition,
    engine,
    expected: 5_000,
    failureKind: "JS_GZIP_BUDGET",
    observed: 5_001,
    rowId: "outline",
    source,
  });
  assert.equal(
    classifyRuntime({
      signals: [signal("vite", "general"), signal("esbuild", "general")],
    }).classification,
    "TREE_SHAKING_DEFECT",
  );
  assert.equal(
    classifyRuntime({
      signals: [signal("vite", "browser"), signal("esbuild", "browser")],
    }).classification,
    "BROWSER_CONDITION_DEFECT",
  );
  assert.equal(
    classifyRuntime({ signals: [signal("vite", "browser")] }).classification,
    "BUNDLER_SPECIFIC_VARIANCE",
  );
  assert.equal(
    classifyRuntime({
      signals: [
        signal("vite", "browser"),
        signal("esbuild", "browser"),
        signal("vite", "general"),
      ],
    }).classification,
    "BUNDLER_SPECIFIC_VARIANCE",
    "a browser defect requires a clean paired general environment",
  );
  assert.equal(
    classifyRuntime({
      signals: [signal("node", "general", "entry-contract")],
    }).classification,
    "ENTRY_CONTRACT_DEFECT",
  );
});

test("CSS, resolution, and Node failures become entry-contract signals", () => {
  const report = validReport();
  report.measurements[0].delta.css = {
    gzipBytes: 0,
    minifiedBytes: 0,
    unminifiedBytes: 0,
  };
  report.measurements[1].resolution.actual = "dist/wrong.js";
  report.nodeProbes.ssr = false;
  const signals = failureSignalsFromReport(report, report.lightweight);
  assert.deepEqual(
    [...new Set(signals.map(({ failureKind }) => failureKind))].sort(),
    ["CSS_CONDITION_MISMATCH", "NODE_SSR_FAILURE", "RESOLUTION_MISMATCH"],
  );
  assert.equal(
    classifyRuntime({ signals }).classification,
    "ENTRY_CONTRACT_DEFECT",
  );
});

test("validator rejects broken identity, sentinel, build-pair, and installed-graph evidence", () => {
  const report = validReport();
  report.identityRecord = {
    ...report.identityRecord,
    record: { ...report.identityRecord.record, version: "9.9.9" },
  };
  report.sentinelSet.sha256 = "b".repeat(64);
  report.measurements[0].buildOptions.comparable = false;
  report.installedGraph.candidate.installExitCode = 1;
  report.externalObservations[0].normative = true;
  const errors = validateSizeReport(report).join("\n");
  assert.match(errors, /immutable identity/);
  assert.match(errors, /sentinel version\/hash/);
  assert.match(errors, /paired build options/);
  assert.match(errors, /isolated package-manager install contract/);
  assert.match(errors, /non-normative/);
});

test("validator recomputes classifications and exact esbuild ownership", () => {
  const report = validReport();
  report.distribution.classification = "NEAR_CAP";
  report.lightweight.classification = "FAIL";
  report.runtime.classification = "TREE_SHAKING_DEFECT";
  report.toolOwnership.esbuild.lockImporterExact = false;
  const errors = validateSizeReport(report).join("\n");
  assert.match(
    errors,
    /distribution classification does not match raw metrics/,
  );
  assert.match(
    errors,
    /lightweight classification does not match bundle deltas/,
  );
  assert.match(
    errors,
    /runtime classification does not match normalized signals/,
  );
  assert.match(errors, /direct exact esbuild ownership or tool versions/);
});

test("identity binds filename, integrity, packed bytes, and artifact SHA", () => {
  for (const mutate of [
    (report) => (report.identityRecord.record.filename = "other.tgz"),
    (report) => (report.identityRecord.record.integrity = "sha512-forged"),
    (report) => (report.identityRecord.record.packedBytes += 1),
    (report) => (report.identityRecord.record.artifactSha256 = "b".repeat(64)),
  ]) {
    const report = validReport();
    report.identityRecord = {
      ...report.identityRecord,
      record: { ...report.identityRecord.record },
    };
    mutate(report);
    report.identityRecord.sha256 = sha256Json(report.identityRecord.record);
    assert.match(validateSizeReport(report).join("\n"), /immutable identity/);
  }
});

test("strict validation binds every release artifact identity field", () => {
  const report = validReport();
  const expectedArtifact = {
    ...report.artifact,
    fileCount: report.distribution.fileCount,
    packedBytes: report.distribution.packedBytes,
    unpackedBytes: report.distribution.unpackedBytes,
  };
  assert.deepEqual(validateSizeReport(report, expectedArtifact), []);
  for (const [field, value] of [
    ["filename", "different.tgz"],
    ["integrity", "sha512-ZGlmZmVyZW50"],
    ["sha256", "b".repeat(64)],
    ["version", "9.9.9"],
    ["packedBytes", report.distribution.packedBytes + 1],
    ["unpackedBytes", report.distribution.unpackedBytes + 1],
    ["fileCount", report.distribution.fileCount + 1],
  ]) {
    assert.match(
      validateSizeReport(report, {
        ...expectedArtifact,
        [field]: value,
      }).join("\n"),
      /does not match release identity/,
    );
  }
});

test("strict validation rejects duplicate matrix rows and legacy synthetic graphs", () => {
  const duplicateRows = validReport();
  duplicateRows.measurements[1] = structuredClone(
    duplicateRows.measurements[0],
  );
  assert.match(
    validateSizeReport(duplicateRows).join("\n"),
    /unique and match the exact matrix|matrix is incomplete/,
  );
  const syntheticGraph = validReport();
  syntheticGraph.installedGraph = {
    comparable: true,
    candidate: { installExitCode: 0, packageCount: 4, totalBytes: 400 },
    control: { installExitCode: 0, packageCount: 3, totalBytes: 300 },
  };
  assert.match(
    validateSizeReport(syntheticGraph).join("\n"),
    /isolated package-manager install contract/,
  );
});

test("report validator requires artifact, tool, distribution, bundle, and Node evidence", () => {
  const errors = validateSizeReport({ schemaVersion: 1, status: "PASS" });
  assert.match(errors.join("\n"), /artifact\.sha256/);
  assert.match(errors.join("\n"), /tool versions/);
  assert.match(errors.join("\n"), /distribution classification/);
  assert.match(errors.join("\n"), /paired measurements/);
  assert.match(errors.join("\n"), /Node ESM, SSR, and CSS-free/);
});

test("probe matrix covers root, curated families, oldicon, and registry retention", () => {
  assert.deepEqual(
    SIZE_PROBES.map(({ id }) => id),
    ["root-outline", "outline", "solid", "colorful", "oldicon", "registry"],
  );
  assert.equal(
    SIZE_PROBES.filter(({ kind }) => kind === "single-icon").length,
    5,
  );
  assert.equal(SIZE_PROBES.filter(({ kind }) => kind === "registry").length, 1);
});

test("strict validator is importable without Vite or esbuild runtime imports", () => {
  const source = readFileSync(
    new URL(
      "../../packages/yakit-ui-icons/scripts/size-observability-validator.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(source, /from ["'](?:vite|esbuild)["']/);
});

test("valid complete report passes schema validation", () => {
  assert.deepEqual(validateSizeReport(validReport()), []);
});

test("CLI persists INCONCLUSIVE evidence and exits non-zero when the exact tarball is unreadable", () => {
  const directory = mkdtempSync(join(tmpdir(), "yakit-size-report-test-"));
  const output = join(directory, "report.json");
  const result = spawnSync(
    process.execPath,
    [
      "packages/yakit-ui-icons/scripts/size-observability.mjs",
      join(directory, "missing.tgz"),
      "--output",
      output,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  const report = JSON.parse(readFileSync(output, "utf8"));
  assert.equal(report.status, "INCONCLUSIVE");
  assert.match(report.error, /missing\.tgz/);
  assert.match(
    report.error,
    /(?:ENOENT|Failed to open|Cannot open|No such file or directory)/,
  );
});
