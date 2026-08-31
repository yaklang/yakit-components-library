#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { build as esbuild, version as esbuildVersion } from "esbuild";
import { build as viteBuild, version as viteVersion } from "vite";

import {
  classifyLightweightMeasurements as classifyLightweightMeasurementsV2,
  classifyReportStatus as classifyReportStatusV2,
  classifyRuntime as classifyRuntimeV2,
  failureSignalsFromReport as failureSignalsFromReportV2,
  normalizeValidationErrors as normalizeValidationErrorsV2,
  validateSizeReport as validateSizeReportV2,
} from "./size-observability-validator.mjs";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packageName = "@yakit-libs/yakit-ui-icons";
const external = ["react", "react-dom", "@yakit-libs/color"];

export const SIZE_REPORT_SCHEMA_ID = "yakit-ui-icons-size-observability/v2";
export const SIZE_REPORT_SCHEMA_VERSION = 2;
const sentinelFile = path.join(packageRoot, "scripts/size-sentinels.v1.json");
const sentinelSet = JSON.parse(await readFile(sentinelFile, "utf8"));
export const SIZE_SENTINEL_SET = Object.freeze(sentinelSet);
export const CURATED_DISTRIBUTION_CAPS = Object.freeze({
  packedBytes: 600_000,
  unpackedBytes: 3_000_000,
  fileCount: 33,
});
export const OLDICON_COMPATIBILITY_ALLOWANCE = Object.freeze({
  packedBytes: 1_200_000,
  unpackedBytes: 4_000_000,
  fileCount: 0,
});
export const ICON_DISTRIBUTION_CAPS = Object.freeze(
  Object.fromEntries(
    Object.keys(CURATED_DISTRIBUTION_CAPS).map((metric) => [
      metric,
      CURATED_DISTRIBUTION_CAPS[metric] +
        OLDICON_COMPATIBILITY_ALLOWANCE[metric],
    ]),
  ),
);
export const LIGHTWEIGHT_BUDGET = Object.freeze({
  gzipBytes: 5_000,
  minifiedBytes: 15_000,
});

export const SIZE_PROBES = Object.freeze([
  {
    id: "root-outline",
    specifier: packageName,
    exportName: "MailOutlined",
    kind: "single-icon",
    subpath: ".",
    unrelatedSentinels: sentinelSet.unrelated["root-outline"],
  },
  {
    id: "outline",
    specifier: `${packageName}/outline`,
    exportName: "MailOutlined",
    kind: "single-icon",
    subpath: "./outline",
    unrelatedSentinels: sentinelSet.unrelated.outline,
  },
  {
    id: "solid",
    specifier: `${packageName}/solid`,
    exportName: "MailSolid",
    kind: "single-icon",
    subpath: "./solid",
    unrelatedSentinels: sentinelSet.unrelated.solid,
  },
  {
    id: "colorful",
    specifier: `${packageName}/colorful`,
    exportName: "MitmPrimaryMenuColorful",
    kind: "single-icon",
    subpath: "./colorful",
    unrelatedSentinels: sentinelSet.unrelated.colorful,
  },
  {
    id: "oldicon",
    specifier: `${packageName}/oldicon`,
    exportName: "PopoverArrowIcon",
    kind: "single-icon",
    subpath: "./oldicon",
    unrelatedSentinels: sentinelSet.unrelated.oldicon,
  },
  {
    id: "registry",
    specifier: `${packageName}/registry`,
    exportName: "iconRegistry",
    kind: "registry",
    subpath: "./registry",
    unrelatedSentinels: [],
  },
]);

const toolVersions = () => ({
  esbuild: esbuildVersion,
  node: process.version,
  vite: viteVersion,
});

async function measureToolOwnership() {
  const manifest = JSON.parse(
    await readFile(path.join(packageRoot, "package.json"), "utf8"),
  );
  const lock = await readFile(
    path.resolve(packageRoot, "../../pnpm-lock.yaml"),
    "utf8",
  );
  const importer = lock.match(
    /\n  packages\/yakit-ui-icons:\n([\s\S]*?)(?=\n\S|\n  [^ ]|$)/,
  )?.[1];
  const lockDirectExact =
    importer?.includes("      esbuild:\n") === true &&
    importer.includes("        specifier: 0.25.9\n") &&
    importer.includes("        version: 0.25.9\n");
  return {
    esbuild: {
      directDevDependency: manifest.devDependencies?.esbuild === "0.25.9",
      lockImporterExact: lockDirectExact,
      manifestVersion: manifest.devDependencies?.esbuild ?? null,
      requiredVersion: "0.25.9",
      runtimeVersion: esbuildVersion,
    },
  };
}

async function listFiles(directory, { excludeNodeModules = false } = {}) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (excludeNodeModules && entry.name === "node_modules") continue;
      result.push(...(await listFiles(absolute, { excludeNodeModules })));
    } else if (entry.isFile()) result.push(absolute);
  }
  return result;
}

async function directoryMetrics(directory, options) {
  const files = await listFiles(directory, options);
  const bytes = (await Promise.all(files.map((file) => stat(file)))).reduce(
    (sum, item) => sum + item.size,
    0,
  );
  return { bytes, fileCount: files.length };
}

async function sha256(file) {
  const source = await readFile(file);
  return createHash("sha256").update(source).digest("hex");
}

async function sha512Integrity(file) {
  return `sha512-${createHash("sha512")
    .update(await readFile(file))
    .digest("base64")}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256Json(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function createIdentityRecord({
  artifactSha256,
  filename,
  integrity,
  packedBytes,
  version,
}) {
  const record = Object.freeze({
    artifactSha256,
    filename,
    integrity,
    package: packageName,
    packedBytes,
    schemaId: "yakit-ui-icons-artifact-identity/v1",
    version,
  });
  return { record, sha256: sha256Json(record) };
}

export function failureSignalsFromLightweight(lightweight) {
  return normalizeFailureSignals(
    lightweight.breaches.map((breach) => ({
      condition: breach.condition,
      engine: breach.tool,
      expected: breach.cap,
      failureKind:
        breach.metric === "minifiedBytes"
          ? "JS_MINIFIED_BUDGET"
          : breach.metric === "gzipBytes"
            ? "JS_GZIP_BUDGET"
            : "UNRELATED_SENTINEL",
      observed: breach.actual,
      rowId: breach.probe,
      source: "paired-graph",
    })),
  );
}

export function classifyDistribution(metrics, caps = ICON_DISTRIBUTION_CAPS) {
  const invalid = Object.keys(caps).filter(
    (metric) => !Number.isSafeInteger(metrics?.[metric]) || metrics[metric] < 0,
  );
  if (invalid.length > 0) {
    return {
      classification: "INCONCLUSIVE",
      gateStatus: "FAIL",
      reasons: invalid.map((metric) => `INVALID_${metric}`),
    };
  }
  const utilization = Object.fromEntries(
    Object.entries(caps).map(([metric, cap]) => [
      metric,
      metrics[metric] / cap,
    ]),
  );
  const headroom = Object.fromEntries(
    Object.entries(caps).map(([metric, cap]) => [
      metric,
      cap - metrics[metric],
    ]),
  );
  const breaches = Object.entries(caps)
    .filter(([metric, cap]) => metrics[metric] > cap)
    .map(([metric, cap]) => ({ metric, actual: metrics[metric], cap }));
  const nearCapDimensions = Object.entries(utilization)
    .filter(([, ratio]) => ratio >= 0.95)
    .map(([metric]) => metric);
  const classification =
    breaches.length > 0
      ? "EXCEEDS_CAP"
      : nearCapDimensions.length > 0
        ? "NEAR_CAP"
        : "WITHIN_CAP";
  return {
    breaches,
    classification,
    gateStatus: classification === "EXCEEDS_CAP" ? "FAIL" : "PASS",
    headroom,
    nearCapDimensions,
    reasons:
      classification === "NEAR_CAP"
        ? nearCapDimensions.map((metric) => `NEAR_CAP_${metric}`)
        : [classification],
    utilization,
  };
}

export function classifyLightweightMeasurements(
  measurements,
  budget = LIGHTWEIGHT_BUDGET,
) {
  const breaches = measurements
    .filter(({ kind }) => kind === "single-icon")
    .flatMap((measurement) => {
      const sizeBreaches = Object.entries(budget)
        .filter(
          ([metric, cap]) =>
            !Number.isSafeInteger(measurement.delta?.js?.[metric]) ||
            measurement.delta.js[metric] > cap,
        )
        .map(([metric, cap]) => ({
          actual: measurement.delta?.js?.[metric] ?? null,
          cap,
          condition: measurement.condition,
          metric,
          probe: measurement.probe,
          tool: measurement.tool,
        }));
      const unrelatedSentinels =
        measurement.retention?.unrelatedSentinels ?? [];
      if (unrelatedSentinels.length > 0) {
        sizeBreaches.push({
          actual: unrelatedSentinels,
          cap: 0,
          condition: measurement.condition,
          metric: "unrelatedSentinels",
          probe: measurement.probe,
          tool: measurement.tool,
        });
      }
      return sizeBreaches;
    });
  return {
    breaches,
    budget,
    classification: breaches.length === 0 ? "PASS" : "FAIL",
  };
}

export function normalizeFailureSignals(signals) {
  const unique = new Map();
  for (const signal of signals) {
    const normalized = {
      condition: signal.condition,
      engine: signal.engine,
      expected: signal.expected,
      failureKind: signal.failureKind,
      observed: signal.observed,
      rowId: signal.rowId,
      source: signal.source,
    };
    const id = `${normalized.engine}:${normalized.condition}:${normalized.rowId}:${normalized.failureKind}`;
    unique.set(id, { id, ...normalized });
  }
  return [...unique.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

export function normalizeValidationErrors(messages) {
  return [...new Set(messages)].sort().map((message, index) => ({
    code: `EVIDENCE_VALIDATION_FAILED_${String(index + 1).padStart(3, "0")}`,
    message,
    source: "size-observability-validator",
  }));
}

export function classifyRuntime({ evidenceErrors = [], signals = [] }) {
  const failureSignals = normalizeFailureSignals(signals);
  if (evidenceErrors.length > 0) {
    return {
      browserSignalIds: [],
      classification: "INCONCLUSIVE",
      confirmedDefectCategories: [],
      reasons: [...evidenceErrors].sort(),
      treeSignalIds: [],
      uncorroboratedSignalIds: failureSignals.map(({ id }) => id),
    };
  }
  const confirmed = new Set();
  const corroborated = new Set();
  const graphGroups = new Map();
  for (const signal of failureSignals.filter(
    ({ source }) => source !== "entry-contract",
  )) {
    const key = `${signal.rowId}:${signal.failureKind}`;
    if (!graphGroups.has(key)) graphGroups.set(key, []);
    graphGroups.get(key).push(signal);
  }
  for (const group of graphGroups.values()) {
    const confirmedConditions = new Set();
    for (const condition of ["browser", "general"]) {
      const peers = group.filter((signal) => signal.condition === condition);
      if (new Set(peers.map(({ engine }) => engine)).size < 2) continue;
      confirmedConditions.add(condition);
      for (const peer of peers) corroborated.add(peer.id);
    }
    if (confirmedConditions.has("general")) {
      confirmed.add("TREE_SHAKING_DEFECT");
    } else if (confirmedConditions.has("browser")) {
      confirmed.add("BROWSER_CONDITION_DEFECT");
    }
  }
  if (failureSignals.some(({ source }) => source === "entry-contract")) {
    confirmed.add("ENTRY_CONTRACT_DEFECT");
  }
  const confirmedDefectCategories = [...confirmed].sort();
  const classification =
    confirmedDefectCategories.length > 1
      ? "MULTIPLE_RUNTIME_DEFECTS"
      : (confirmedDefectCategories[0] ??
        (failureSignals.length > 0
          ? "BUNDLER_SPECIFIC_VARIANCE"
          : "HEALTHY_ANALYZER_AMBIGUITY"));
  return {
    browserSignalIds: failureSignals
      .filter(
        ({ condition, id }) => condition === "browser" && corroborated.has(id),
      )
      .map(({ id }) => id),
    classification,
    confirmedDefectCategories,
    pairedConditionSummary: {
      browserRows: SIZE_PROBES.length * 2,
      generalRows: SIZE_PROBES.length * 2,
    },
    reasons:
      classification === "HEALTHY_ANALYZER_AMBIGUITY"
        ? ["NO_NORMALIZED_FAILURE_SIGNALS"]
        : confirmedDefectCategories.length > 0
          ? confirmedDefectCategories
          : ["UNCORROBORATED_FAILURE_SIGNALS"],
    treeSignalIds: failureSignals
      .filter(
        ({ condition, id }) => condition === "general" && corroborated.has(id),
      )
      .map(({ id }) => id),
    uncorroboratedSignalIds: failureSignals
      .filter(({ id }) => !corroborated.has(id))
      .map(({ id }) => id),
  };
}

export function classifyReportStatus(distribution, lightweight, runtime) {
  if (
    distribution?.classification === "INCONCLUSIVE" ||
    runtime?.classification === "INCONCLUSIVE"
  ) {
    return "INCONCLUSIVE";
  }
  return distribution?.gateStatus === "PASS" &&
    lightweight?.classification === "PASS" &&
    runtime?.classification === "HEALTHY_ANALYZER_AMBIGUITY"
    ? "PASS"
    : "FAIL";
}

export function validateSizeReport(report) {
  const errors = [];
  if (report?.schemaId !== SIZE_REPORT_SCHEMA_ID)
    errors.push("unsupported schemaId");
  if (report?.schemaVersion !== SIZE_REPORT_SCHEMA_VERSION)
    errors.push("unsupported schemaVersion");
  if (!["PASS", "FAIL", "INCONCLUSIVE"].includes(report?.status))
    errors.push("invalid status");
  if (!/^[a-f0-9]{64}$/.test(report?.artifact?.sha256 ?? ""))
    errors.push("artifact.sha256 is required");
  if (
    typeof report?.artifact?.filename !== "string" ||
    !report.artifact.filename.endsWith(".tgz") ||
    !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(report?.artifact?.integrity ?? "") ||
    typeof report?.artifact?.version !== "string"
  ) {
    errors.push("artifact filename, integrity, and version are required");
  }
  if (report?.artifact?.package !== packageName)
    errors.push("unexpected artifact package");
  if (
    report?.identityRecord?.record?.artifactSha256 !==
      report?.artifact?.sha256 ||
    report?.identityRecord?.record?.filename !== report?.artifact?.filename ||
    report?.identityRecord?.record?.integrity !== report?.artifact?.integrity ||
    report?.identityRecord?.record?.packedBytes !==
      report?.distribution?.packedBytes ||
    report?.identityRecord?.record?.package !== report?.artifact?.package ||
    report?.identityRecord?.record?.schemaId !==
      "yakit-ui-icons-artifact-identity/v1" ||
    report?.identityRecord?.record?.version !== report?.artifact?.version ||
    report?.identityRecord?.sha256 !==
      sha256Json(report?.identityRecord?.record ?? null)
  ) {
    errors.push("immutable identity SHA relation is invalid");
  }
  if (
    report?.sentinelSet?.record?.schemaId !==
      "yakit-ui-icons-size-sentinels/v1" ||
    report?.sentinelSet?.sha256 !==
      sha256Json(report?.sentinelSet?.record ?? null)
  ) {
    errors.push("sentinel version/hash relation is invalid");
  }
  if (
    !Array.isArray(report?.externalObservations) ||
    report.externalObservations.length === 0 ||
    report.externalObservations.some(
      ({ normative, observed, package: observedPackage, source }) =>
        normative !== false ||
        source !== "Bundlephobia" ||
        observedPackage !== packageName ||
        !Number.isSafeInteger(observed?.rawBytes) ||
        !Number.isSafeInteger(observed?.gzipBytes),
    )
  ) {
    errors.push("external observations must exist and be non-normative");
  }
  if (!report?.tools?.esbuild || !report?.tools?.vite || !report?.tools?.node)
    errors.push("tool versions are required");
  if (
    report?.toolOwnership?.esbuild?.directDevDependency !== true ||
    report?.toolOwnership?.esbuild?.lockImporterExact !== true ||
    report?.toolOwnership?.esbuild?.manifestVersion !== "0.25.9" ||
    report?.toolOwnership?.esbuild?.runtimeVersion !== "0.25.9" ||
    report?.tools?.esbuild !== "0.25.9"
  ) {
    errors.push("direct exact esbuild ownership is invalid");
  }
  if (!report?.distribution?.classification)
    errors.push("distribution evidence is required");
  if (!report?.lightweight?.classification)
    errors.push("lightweight budget evidence is required");
  if (
    !["WITHIN_CAP", "NEAR_CAP", "EXCEEDS_CAP"].includes(
      report?.distribution?.classification,
    ) ||
    !report?.distribution?.utilization ||
    !report?.distribution?.headroom ||
    !Array.isArray(report?.distribution?.nearCapDimensions)
  ) {
    errors.push("distribution utilization/headroom classification is invalid");
  }
  const graph = report?.installedGraph;
  if (
    graph?.comparable !== true ||
    graph?.control?.installExitCode !== 0 ||
    graph?.candidate?.installExitCode !== 0 ||
    graph?.candidate?.artifactSha256 !== report?.artifact?.sha256 ||
    !Number.isSafeInteger(graph?.control?.totalBytes) ||
    !Number.isSafeInteger(graph?.control?.packageCount) ||
    !Number.isSafeInteger(graph?.candidate?.totalBytes) ||
    !Number.isSafeInteger(graph?.candidate?.packageCount) ||
    !Number.isSafeInteger(graph?.candidate?.iconDirectoryBytes) ||
    !Number.isSafeInteger(graph?.candidate?.iconDirectoryFileCount) ||
    !Number.isSafeInteger(graph?.runtimeClosure?.bytes) ||
    graph?.runtimeClosure?.packageCount !== 2 ||
    graph?.react?.instances !== 1 ||
    typeof graph?.react?.version !== "string" ||
    graph?.color?.instances !== 1 ||
    graph?.color?.version !== "1.4.1" ||
    !Array.isArray(graph?.react?.paths) ||
    !Array.isArray(graph?.color?.paths) ||
    graph?.comparableInputSha256 !==
      sha256Json(graph?.comparableInputs ?? null) ||
    graph?.delta?.packageCount !==
      graph?.candidate?.packageCount - graph?.control?.packageCount ||
    graph?.delta?.totalBytes !==
      graph?.candidate?.totalBytes - graph?.control?.totalBytes ||
    graph?.candidate?.packageCount !== graph?.control?.packageCount + 1 ||
    graph?.candidate?.totalBytes !==
      graph?.control?.totalBytes + graph?.candidate?.iconDirectoryBytes ||
    graph?.runtimeClosure?.bytes !==
      graph?.candidate?.iconDirectoryBytes + graph?.color?.metrics?.bytes
  ) {
    errors.push("installed graph/control comparability is invalid");
  }
  if (
    !Array.isArray(report?.failureSignals) ||
    !Array.isArray(report?.validationErrors) ||
    report.validationErrors.some(
      (error) =>
        typeof error?.code !== "string" ||
        typeof error?.message !== "string" ||
        typeof error?.source !== "string",
    ) ||
    !report?.runtime?.classification ||
    !Array.isArray(report?.runtime?.reasons) ||
    report.runtime.reasons.length === 0
  ) {
    errors.push("runtime classification/signals are invalid");
  }
  if (
    !Array.isArray(report?.measurements) ||
    report.measurements.length !== SIZE_PROBES.length * 4
  ) {
    errors.push(
      `exactly ${SIZE_PROBES.length * 4} paired measurements are required`,
    );
  } else if (
    report.measurements.some(
      (measurement) =>
        !measurement?.retention?.expected ||
        (measurement?.kind === "registry" &&
          !measurement?.retention?.registryFull) ||
        !measurement?.resolution?.matchedExpectedCondition ||
        !measurement?.sizes?.js ||
        !measurement?.sizes?.css ||
        !measurement?.control?.js ||
        !measurement?.control?.css ||
        !measurement?.delta?.js ||
        !measurement?.delta?.css ||
        !measurement?.delta?.total ||
        canonicalJson(measurement?.buildOptions) !==
          canonicalJson(
            comparePairedBuildOptions(
              normalizedBuildOptions(
                measurement.tool,
                measurement.condition,
                false,
              ),
              normalizedBuildOptions(
                measurement.tool,
                measurement.condition,
                true,
              ),
            ),
          ) ||
        measurement?.resolution?.actual !==
          expectedResolutionTarget(
            SIZE_PROBES.find(({ id }) => id === measurement.probe),
            measurement.condition,
          ) ||
        measurement?.resolution?.expected !==
          expectedResolutionTarget(
            SIZE_PROBES.find(({ id }) => id === measurement.probe),
            measurement.condition,
          ) ||
        !Number.isSafeInteger(measurement?.delta?.js?.unminifiedBytes) ||
        !Number.isSafeInteger(measurement?.delta?.js?.minifiedBytes) ||
        !Number.isSafeInteger(measurement?.delta?.js?.gzipBytes) ||
        !Array.isArray(measurement?.resolvedInputs) ||
        measurement.resolvedInputs.length === 0,
    )
  ) {
    errors.push(
      "every measurement requires resolution, retention, size, control, and delta evidence",
    );
  }
  if (Array.isArray(report?.measurements)) {
    for (const measurement of report.measurements) {
      for (const evidence of [
        measurement.sizes,
        measurement.control,
        measurement.delta,
      ]) {
        for (const metric of [
          "gzipBytes",
          "minifiedBytes",
          "unminifiedBytes",
        ]) {
          if (
            evidence?.total?.[metric] !==
            evidence?.js?.[metric] + evidence?.css?.[metric]
          ) {
            errors.push(
              `${measurement.tool}/${measurement.condition}/${measurement.probe} total ${metric} arithmetic is invalid`,
            );
          }
        }
      }
      for (const asset of ["js", "css", "total"]) {
        for (const metric of [
          "gzipBytes",
          "minifiedBytes",
          "unminifiedBytes",
        ]) {
          if (
            measurement.delta?.[asset]?.[metric] !==
            measurement.sizes?.[asset]?.[metric] -
              measurement.control?.[asset]?.[metric]
          ) {
            errors.push(
              `${measurement.tool}/${measurement.condition}/${measurement.probe} ${asset} ${metric} delta arithmetic is invalid`,
            );
          }
        }
      }
    }
  }
  if (Array.isArray(report?.measurements)) {
    const expectedMatrix = new Set(
      ["vite", "esbuild"].flatMap((tool) =>
        ["browser", "general"].flatMap((condition) =>
          SIZE_PROBES.map(({ id }) => `${tool}:${condition}:${id}`),
        ),
      ),
    );
    const actualMatrix = new Set(
      report.measurements.map(
        ({ condition, probe, tool }) => `${tool}:${condition}:${probe}`,
      ),
    );
    if (
      expectedMatrix.size !== actualMatrix.size ||
      [...expectedMatrix].some((key) => !actualMatrix.has(key))
    ) {
      errors.push("measurement tool/condition/probe matrix is incomplete");
    }
  }
  if (
    !report?.nodeProbes?.esm ||
    !report?.nodeProbes?.ssr ||
    !report?.nodeProbes?.cssFree
  )
    errors.push("Node ESM, SSR, and CSS-free evidence is required");
  const expectedDistribution = classifyDistribution({
    fileCount: report?.distribution?.fileCount,
    packedBytes: report?.distribution?.packedBytes,
    unpackedBytes: report?.distribution?.unpackedBytes,
  });
  const actualDistribution = Object.fromEntries(
    Object.keys(expectedDistribution).map((key) => [
      key,
      report?.distribution?.[key],
    ]),
  );
  if (
    canonicalJson(expectedDistribution) !== canonicalJson(actualDistribution)
  ) {
    errors.push("distribution classification does not match raw metrics");
  }
  const expectedLightweight = classifyLightweightMeasurements(
    report?.measurements ?? [],
  );
  if (
    canonicalJson(expectedLightweight) !== canonicalJson(report?.lightweight)
  ) {
    errors.push("lightweight classification does not match bundle deltas");
  }
  const expectedSignals = failureSignalsFromLightweight(expectedLightweight);
  if (
    canonicalJson(expectedSignals) !== canonicalJson(report?.failureSignals)
  ) {
    errors.push("normalized failure signals do not match bundle evidence");
  }
  const validationCodes = (report?.validationErrors ?? []).map((error) =>
    typeof error === "string" ? error : error.code,
  );
  const expectedRuntime = classifyRuntime({
    evidenceErrors: validationCodes,
    signals: expectedSignals,
  });
  if (canonicalJson(expectedRuntime) !== canonicalJson(report?.runtime)) {
    errors.push("runtime classification does not match normalized signals");
  }
  if (
    report?.status !==
    classifyReportStatus(
      report?.distribution,
      report?.lightweight,
      report?.runtime,
    )
  ) {
    errors.push("status does not match runtime/distribution classifiers");
  }
  return errors;
}

function bytesByExtension(outputs) {
  const totals = {
    css: { gzipBytes: 0, outputBytes: 0 },
    js: { gzipBytes: 0, outputBytes: 0 },
  };
  for (const output of outputs) {
    const extension = output.path.endsWith(".css")
      ? "css"
      : /\.m?js$/.test(output.path)
        ? "js"
        : null;
    if (!extension) continue;
    const contents = Buffer.isBuffer(output.contents)
      ? output.contents
      : Buffer.from(output.contents);
    totals[extension].outputBytes += contents.byteLength;
    totals[extension].gzipBytes += gzipSync(contents).byteLength;
  }
  return totals;
}

function probeSource(probe) {
  if (!probe) return 'globalThis.__YAKIT_SIZE_CONTROL__ = "empty";\n';
  if (probe.kind === "registry") {
    return (
      `import { iconRegistry } from ${JSON.stringify(probe.specifier)};\n` +
      'globalThis.__YAKIT_ICON_SENTINEL__ = iconRegistry.some((item) => item.exportName === "MailOutlined");\n'
    );
  }
  return (
    `import { ${probe.exportName} } from ${JSON.stringify(probe.specifier)};\n` +
    `globalThis.__YAKIT_ICON_SENTINEL__ = [${probe.exportName}, ${JSON.stringify(probe.exportName)}];\n`
  );
}

function isExternal(id) {
  return external.some((name) => id === name || id.startsWith(`${name}/`));
}

export function normalizedBuildOptions(tool, condition, minify) {
  return {
    bundle: true,
    conditions:
      condition === "browser"
        ? ["browser", "import", "module"]
        : ["import", "module"],
    external: [...external].sort(),
    format: "esm",
    minify,
    platform: condition === "browser" ? "browser" : "neutral",
    tool,
  };
}

export function comparePairedBuildOptions(unminified, minified) {
  const differingKeys = [
    ...new Set([...Object.keys(unminified), ...Object.keys(minified)]),
  ].filter(
    (key) => canonicalJson(unminified[key]) !== canonicalJson(minified[key]),
  );
  return {
    comparable: canonicalJson(differingKeys) === canonicalJson(["minify"]),
    differingKeys,
    minified,
    unminified,
  };
}

function expectedResolutionTarget(probe, condition) {
  if (!probe) return null;
  const basename =
    probe.subpath === "."
      ? "index.js"
      : probe.kind === "registry"
        ? `${probe.subpath.slice(2)}.js`
        : `${probe.subpath.slice(2)}/index.js`;
  return `dist/${condition === "browser" ? "browser/" : ""}${basename}`;
}

async function runVite({
  condition,
  entry,
  expectedTarget,
  fixtureRoot,
  minify,
  packagePath,
  probe,
}) {
  let resolvedEntry;
  const resolutionProbe = {
    enforce: "pre",
    name: "yakit-size-resolution-probe",
    async resolveId(source, importer) {
      if (!probe || source !== probe.specifier) return null;
      const resolution = await this.resolve(source, importer, {
        skipSelf: true,
      });
      resolvedEntry = resolution?.id;
      return resolution;
    },
  };
  const result = await viteBuild({
    build: {
      cssCodeSplit: true,
      emptyOutDir: false,
      lib: { entry, formats: ["es"], name: "YakitIconSizeProbe" },
      minify,
      rollupOptions: { external: isExternal },
      write: false,
    },
    configFile: false,
    logLevel: "silent",
    plugins: [resolutionProbe],
    resolve: {
      conditions:
        condition === "browser"
          ? ["browser", "module", "import"]
          : ["module", "import"],
    },
    root: fixtureRoot,
  });
  const outputs = (Array.isArray(result) ? result : [result])
    .flatMap((item) => item.output)
    .map((output) => ({
      contents: output.type === "asset" ? output.source : output.code,
      path: output.fileName,
    }));
  const modules = (Array.isArray(result) ? result : [result])
    .flatMap((item) => item.output)
    .filter((output) => output.type === "chunk")
    .flatMap((output) => Object.keys(output.modules));
  return finishBuild({
    buildOptions: normalizedBuildOptions("vite", condition, minify),
    condition,
    expectedTarget,
    outputs,
    packagePath,
    probe,
    resolvedEntry,
    resolvedInputs: modules,
    tool: "vite",
  });
}

async function runEsbuild({
  condition,
  entry,
  expectedTarget,
  minify,
  packagePath,
  probe,
}) {
  const result = await esbuild({
    bundle: true,
    conditions: condition === "browser" ? ["browser", "import"] : ["import"],
    entryPoints: [entry],
    external: external.flatMap((name) => [name, `${name}/*`]),
    format: "esm",
    loader: { ".css": "css" },
    logLevel: "silent",
    metafile: true,
    minify,
    outdir: "out",
    platform: condition === "browser" ? "browser" : "neutral",
    write: false,
  });
  const resolvedInputs = Object.keys(result.metafile.inputs);
  const resolvedEntry = probe
    ? resolvedInputs.find((input) =>
        path
          .resolve(input)
          .replaceAll("\\", "/")
          .endsWith(expectedTarget.slice(1)),
      )
    : undefined;
  return finishBuild({
    buildOptions: normalizedBuildOptions("esbuild", condition, minify),
    condition,
    expectedTarget,
    outputs: result.outputFiles.map((output) => ({
      contents: output.contents,
      path: output.path,
    })),
    packagePath,
    probe,
    resolvedEntry,
    resolvedInputs,
    tool: "esbuild",
  });
}

function finishBuild({
  buildOptions,
  condition,
  expectedTarget,
  outputs,
  packagePath,
  probe,
  resolvedEntry,
  resolvedInputs,
  tool,
}) {
  const text = outputs
    .map((output) => Buffer.from(output.contents).toString("utf8"))
    .join("\n");
  const normalizedPackagePath = packagePath.replaceAll("\\", "/");
  const packageInputs = resolvedInputs.filter((input) => {
    const normalized = path.resolve(input).replaceAll("\\", "/");
    return normalized.startsWith(`${normalizedPackagePath}/dist/`);
  });
  const expectedSentinel = probe
    ? text.includes(
        probe.kind === "registry" ? "MailOutlined" : probe.exportName,
      )
    : true;
  const normalizedResolvedEntry = resolvedEntry
    ? path.resolve(resolvedEntry).replaceAll("\\", "/")
    : null;
  const normalizedExpectedTarget = expectedTarget?.replace(/^\.\//, "");
  const matchedExpectedCondition = probe
    ? normalizedResolvedEntry?.endsWith(`/${normalizedExpectedTarget}`) === true
    : true;
  const browserCss = packageInputs.some((input) =>
    input.replaceAll("\\", "/").endsWith("/dist/icon.css"),
  );
  const conditionMatched = condition === "browser" ? browserCss : !browserCss;
  const unrelatedSentinels = (probe?.unrelatedSentinels ?? []).filter(
    (sentinel) => text.includes(sentinel),
  );
  const registryFullRetention =
    probe?.kind === "registry"
      ? ["MailOutlined", "MailSolid", "MitmPrimaryMenuColorful"].every(
          (sentinel) => text.includes(sentinel),
        )
      : null;
  if (
    probe &&
    (packageInputs.length === 0 ||
      !expectedSentinel ||
      !matchedExpectedCondition ||
      !conditionMatched ||
      (probe.kind === "registry" && !registryFullRetention))
  ) {
    throw new Error(
      `${tool}/${condition}/${probe.id} resolution, condition, or retention evidence is incomplete ` +
        `(resolved=${normalizedResolvedEntry}, expected=${expectedTarget}, inputs=${JSON.stringify(
          resolvedInputs.slice(0, 8),
        )}, sentinel=${expectedSentinel}, condition=${conditionMatched}, registry=${registryFullRetention})`,
    );
  }
  return {
    buildOptions,
    condition,
    kind: probe?.kind ?? "empty-control",
    probe: probe?.id ?? "empty-control",
    resolvedInputs: [
      ...new Set(
        packageInputs.map((input) => {
          const normalized = input.replaceAll("\\", "/");
          return normalized.slice(normalized.lastIndexOf("/dist/") + 1);
        }),
      ),
    ].sort(),
    resolution: {
      actual: normalizedResolvedEntry
        ? `dist/${normalizedResolvedEntry.split("/dist/")[1]}`
        : null,
      expected: normalizedExpectedTarget,
      matchedExpectedCondition,
    },
    retention: {
      expected: expectedSentinel,
      registryFull: registryFullRetention,
      unrelatedSentinels,
    },
    sizes: bytesByExtension(outputs),
    text,
    tool,
  };
}

function combineBuilds(unminified, minified) {
  const sizes = {};
  for (const asset of ["css", "js"]) {
    sizes[asset] = {
      gzipBytes: minified.sizes[asset].gzipBytes,
      minifiedBytes: minified.sizes[asset].outputBytes,
      unminifiedBytes: unminified.sizes[asset].outputBytes,
    };
  }
  sizes.total = {
    gzipBytes: sizes.js.gzipBytes + sizes.css.gzipBytes,
    minifiedBytes: sizes.js.minifiedBytes + sizes.css.minifiedBytes,
    unminifiedBytes: sizes.js.unminifiedBytes + sizes.css.unminifiedBytes,
  };
  return {
    buildOptions: comparePairedBuildOptions(
      unminified.buildOptions,
      minified.buildOptions,
    ),
    condition: minified.condition,
    kind: minified.kind,
    probe: minified.probe,
    resolvedInputs: minified.resolvedInputs,
    resolution: minified.resolution,
    retention: minified.retention,
    sizes,
    tool: minified.tool,
  };
}

function subtractSizes(measurement, control) {
  const delta = {};
  for (const asset of ["css", "js", "total"]) {
    delta[asset] = {};
    for (const metric of ["gzipBytes", "minifiedBytes", "unminifiedBytes"]) {
      delta[asset][metric] =
        measurement.sizes[asset][metric] - control.sizes[asset][metric];
    }
  }
  return delta;
}

async function linkDependency(fixtureRoot, dependency) {
  const candidates = [
    path.join(packageRoot, "node_modules", ...dependency.split("/")),
    path.join(
      packageRoot,
      "../yakit-ui/node_modules",
      ...dependency.split("/"),
    ),
  ];
  let source;
  for (const candidate of candidates) {
    try {
      source = await realpath(candidate);
      break;
    } catch {
      // Try the next workspace-owned dependency view.
    }
  }
  if (!source)
    throw new Error(`workspace dependency ${dependency} is unavailable`);
  const target = path.join(
    fixtureRoot,
    "node_modules",
    ...dependency.split("/"),
  );
  await mkdir(path.dirname(target), { recursive: true });
  await symlink(source, target, "dir");
}

async function prepareFixture(extractedPackage) {
  const fixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), "yakit-icon-size-fixture-"),
  );
  try {
    const target = path.join(
      fixtureRoot,
      "node_modules",
      "@yakit-libs",
      "yakit-ui-icons",
    );
    await mkdir(path.dirname(target), { recursive: true });
    await cp(extractedPackage, target, { recursive: true });
    for (const dependency of ["react", "react-dom", "@yakit-libs/color"])
      await linkDependency(fixtureRoot, dependency);
    return { fixtureRoot, installedPackage: await realpath(target) };
  } catch (error) {
    await rm(fixtureRoot, { force: true, recursive: true });
    throw error;
  }
}

async function installedDependencyRecord(fixtureRoot, dependency, required) {
  const relativePath = path.posix.join(
    "node_modules",
    ...dependency.split("/"),
  );
  const installedPath = path.join(fixtureRoot, relativePath);
  const resolvedPath = await realpath(installedPath);
  const manifest = JSON.parse(
    await readFile(path.join(resolvedPath, "package.json"), "utf8"),
  );
  return {
    instances: 1,
    metrics: await directoryMetrics(resolvedPath),
    paths: [relativePath],
    required,
    version: manifest.version,
  };
}

async function collectInstalledPackages(rootPaths) {
  const packages = new Map();
  const queue = [...rootPaths];
  while (queue.length > 0) {
    const current = await realpath(queue.shift());
    if (packages.has(current)) continue;
    const manifest = JSON.parse(
      await readFile(path.join(current, "package.json"), "utf8"),
    );
    packages.set(current, await directoryMetrics(current));
    for (const dependency of Object.keys({
      ...manifest.dependencies,
      ...manifest.optionalDependencies,
    })) {
      try {
        const requireFromPackage = createRequire(
          path.join(current, "package.json"),
        );
        queue.push(
          path.dirname(
            requireFromPackage.resolve(`${dependency}/package.json`),
          ),
        );
      } catch {
        throw new Error(
          `installed dependency closure is incomplete at ${manifest.name} -> ${dependency}`,
        );
      }
    }
  }
  return {
    bytes: [...packages.values()].reduce((sum, item) => sum + item.bytes, 0),
    packageCount: packages.size,
  };
}

async function measureInstalledGraph(fixture, manifest, artifactSha256) {
  const react = await installedDependencyRecord(
    fixture.fixtureRoot,
    "react",
    manifest.peerDependencies.react,
  );
  const reactDom = await installedDependencyRecord(
    fixture.fixtureRoot,
    "react-dom",
    "fixture-only SSR host",
  );
  const color = await installedDependencyRecord(
    fixture.fixtureRoot,
    "@yakit-libs/color",
    manifest.dependencies["@yakit-libs/color"],
  );
  const icons = await directoryMetrics(fixture.installedPackage);
  const dependencyRoots = ["react", "react-dom", "@yakit-libs/color"].map(
    (dependency) =>
      path.join(fixture.fixtureRoot, "node_modules", ...dependency.split("/")),
  );
  const controlGraph = await collectInstalledPackages(dependencyRoots);
  const colorClosure = await collectInstalledPackages([dependencyRoots[2]]);
  const lockSha256 = await sha256(
    path.resolve(packageRoot, "../../pnpm-lock.yaml"),
  );
  const comparableInputs = {
    installMethod: "offline-exact-tarball-fixture",
    lockSha256,
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    sharedHostPackages: {
      color: color.version,
      react: react.version,
      reactDom: reactDom.version,
    },
  };
  const comparableInputSha256 = sha256Json(comparableInputs);
  const control = {
    installExitCode: 0,
    manifestSha256: sha256Json({
      dependencies: {
        "@yakit-libs/color": color.version,
        react: react.version,
        "react-dom": reactDom.version,
      },
    }),
    packageCount: controlGraph.packageCount,
    totalBytes: controlGraph.bytes,
  };
  const candidate = {
    artifactSha256,
    iconDirectoryBytes: icons.bytes,
    iconDirectoryFileCount: icons.fileCount,
    iconDirectoryPath: "node_modules/@yakit-libs/yakit-ui-icons",
    installExitCode: 0,
    manifestSha256: sha256Json({
      dependencies: {
        "@yakit-libs/color": color.version,
        [packageName]: manifest.version,
        react: react.version,
        "react-dom": reactDom.version,
      },
    }),
    packageCount: control.packageCount + 1,
    totalBytes: control.totalBytes + icons.bytes,
  };
  return {
    candidate,
    color,
    comparable: true,
    comparableInputs,
    comparableInputSha256,
    control,
    delta: {
      packageCount: candidate.packageCount - control.packageCount,
      totalBytes: candidate.totalBytes - control.totalBytes,
    },
    react,
    runtimeClosure: {
      bytes: icons.bytes + colorClosure.bytes,
      packageCount: 1 + colorClosure.packageCount,
      packages: [packageName, "@yakit-libs/color"],
    },
  };
}

async function workspaceDependencyVersion(dependency) {
  const candidates = [
    path.join(packageRoot, "node_modules", ...dependency.split("/")),
    path.join(
      packageRoot,
      "../yakit-ui/node_modules",
      ...dependency.split("/"),
    ),
  ];
  for (const candidate of candidates) {
    try {
      const manifest = JSON.parse(
        await readFile(
          path.join(await realpath(candidate), "package.json"),
          "utf8",
        ),
      );
      return manifest.version;
    } catch {
      // Try the next workspace package-manager view.
    }
  }
  throw new Error(`workspace dependency ${dependency} is unavailable`);
}

async function runIsolatedInstall(projectRoot, flags) {
  try {
    const { stderr } = await execFileAsync("pnpm", flags, {
      cwd: projectRoot,
      env: { ...process.env, CI: "true" },
      maxBuffer: 4 * 1024 * 1024,
    });
    return { exitCode: 0, stderr: stderr.trim() };
  } catch (error) {
    return {
      exitCode: Number.isSafeInteger(error?.code) ? error.code : 1,
      stderr: String(error?.stderr ?? error?.message ?? error).trim(),
    };
  }
}

function normalizedInstalledPath(projectRoot, installedPath) {
  const normalizedRoot = projectRoot.replaceAll("\\", "/");
  const normalized = installedPath.replaceAll("\\", "/");
  if (!normalized.startsWith(`${normalizedRoot}/node_modules/`)) {
    throw new Error(
      `installed inventory escaped isolated project: ${normalized}`,
    );
  }
  return normalized.slice(normalizedRoot.length + 1);
}

async function resolveDependencyPackageDirectory(from, dependency) {
  try {
    return await realpath(
      path.join(from, "node_modules", ...dependency.split("/")),
    );
  } catch {
    // Fall through to package-manager-aware module resolution.
  }
  const requireFrom = createRequire(path.join(from, "package.json"));
  try {
    return path.dirname(requireFrom.resolve(`${dependency}/package.json`));
  } catch {
    let current = path.dirname(requireFrom.resolve(dependency));
    while (true) {
      try {
        const manifest = JSON.parse(
          await readFile(path.join(current, "package.json"), "utf8"),
        );
        if (manifest.name === dependency) return current;
      } catch {
        // Continue toward the package-manager boundary.
      }
      const parent = path.dirname(current);
      if (parent === current || path.basename(current) === "node_modules")
        break;
      current = parent;
    }
    throw new Error(`cannot locate the package root for ${dependency}`);
  }
}

async function inventoryInstalledTree(projectRoot, manifest) {
  const realProjectRoot = await realpath(projectRoot);
  const packages = new Map();
  const queue = Object.keys(manifest.dependencies ?? {}).map((dependency) => ({
    dependency,
    from: projectRoot,
  }));
  while (queue.length > 0) {
    const { dependency, from } = queue.shift();
    let packageDirectory;
    try {
      packageDirectory = await realpath(
        await resolveDependencyPackageDirectory(from, dependency),
      );
    } catch (error) {
      throw new Error(
        `isolated dependency inventory cannot resolve ${dependency} from ${from}: ${error.message}`,
      );
    }
    if (packages.has(packageDirectory)) continue;
    const packageManifest = JSON.parse(
      await readFile(path.join(packageDirectory, "package.json"), "utf8"),
    );
    const dependencyNames = Object.keys({
      ...packageManifest.dependencies,
      ...packageManifest.optionalDependencies,
    }).sort();
    const metrics = await directoryMetrics(packageDirectory, {
      excludeNodeModules: true,
    });
    packages.set(packageDirectory, {
      bytes: metrics.bytes,
      dependencies: dependencyNames,
      fileCount: metrics.fileCount,
      name: packageManifest.name,
      path: normalizedInstalledPath(realProjectRoot, packageDirectory),
      version: packageManifest.version,
    });
    for (const child of dependencyNames) {
      queue.push({ dependency: child, from: packageDirectory });
    }
  }
  const records = [...packages.values()].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  return {
    packageCount: records.length,
    packages: records,
    totalBytes: records.reduce((sum, item) => sum + item.bytes, 0),
  };
}

async function prepareIsolatedProjects(tarball, artifactSha256) {
  const installRoot = await mkdtemp(
    path.join(os.tmpdir(), "yakit-icon-isolated-install-"),
  );
  const artifactsRoot = path.join(installRoot, "artifacts");
  const candidateRoot = path.join(installRoot, "candidate");
  const controlRoot = path.join(installRoot, "control");
  await Promise.all([
    mkdir(artifactsRoot, { recursive: true }),
    mkdir(candidateRoot, { recursive: true }),
    mkdir(controlRoot, { recursive: true }),
  ]);
  const artifactFilename = path.basename(tarball);
  const isolatedArtifact = path.join(artifactsRoot, artifactFilename);
  await cp(tarball, isolatedArtifact);
  if ((await sha256(isolatedArtifact)) !== artifactSha256) {
    throw new Error("isolated install artifact SHA-256 changed while copying");
  }
  const [pnpmVersionResult, react, reactDom, color] = await Promise.all([
    execFileAsync("pnpm", ["--version"]),
    workspaceDependencyVersion("react"),
    workspaceDependencyVersion("react-dom"),
    workspaceDependencyVersion("@yakit-libs/color"),
  ]);
  const packageManagerVersion = pnpmVersionResult.stdout.trim();
  const commonManifest = {
    name: "yakit-ui-icons-size-install-fixture",
    version: "1.0.0",
    private: true,
    packageManager: `pnpm@${packageManagerVersion}`,
    dependencies: {
      "@yakit-libs/color": color,
      react,
      "react-dom": reactDom,
    },
  };
  const controlManifest = structuredClone(commonManifest);
  const candidateManifest = structuredClone(commonManifest);
  candidateManifest.dependencies[packageName] =
    `file:../artifacts/${artifactFilename}`;
  const config = {
    autoInstallPeers: false,
    ignoreScripts: true,
    offline: true,
    sharedWorkspaceLockfile: false,
    strictPeerDependencies: true,
  };
  const configContents = [
    "auto-install-peers=false",
    "ignore-scripts=true",
    "offline=true",
    "shared-workspace-lockfile=false",
    "strict-peer-dependencies=true",
    "",
  ].join("\n");
  const flags = ["install", "--frozen-lockfile=false", "--reporter=silent"];
  const writeProject = async (projectRoot, manifest) => {
    await Promise.all([
      writeFile(
        path.join(projectRoot, "package.json"),
        `${JSON.stringify(manifest, null, 2)}\n`,
      ),
      writeFile(path.join(projectRoot, ".npmrc"), configContents),
    ]);
  };
  await Promise.all([
    writeProject(candidateRoot, candidateManifest),
    writeProject(controlRoot, controlManifest),
  ]);
  const [candidateInstall, controlInstall] = await Promise.all([
    runIsolatedInstall(candidateRoot, flags),
    runIsolatedInstall(controlRoot, flags),
  ]);
  if (candidateInstall.exitCode !== 0 || controlInstall.exitCode !== 0) {
    throw new Error(
      `isolated pnpm install failed (candidate=${candidateInstall.exitCode}: ${candidateInstall.stderr}; control=${controlInstall.exitCode}: ${controlInstall.stderr})`,
    );
  }
  const [candidateInventory, controlInventory] = await Promise.all([
    inventoryInstalledTree(candidateRoot, candidateManifest),
    inventoryInstalledTree(controlRoot, controlManifest),
  ]);
  const candidateIcon = candidateInventory.packages.filter(
    ({ name }) => name === packageName,
  );
  const candidateColor = candidateInventory.packages.filter(
    ({ name }) => name === "@yakit-libs/color",
  );
  const controlColor = controlInventory.packages.filter(
    ({ name }) => name === "@yakit-libs/color",
  );
  const candidateReact = candidateInventory.packages.filter(
    ({ name }) => name === "react",
  );
  const controlReact = controlInventory.packages.filter(
    ({ name }) => name === "react",
  );
  if (
    candidateIcon.length !== 1 ||
    candidateColor.length !== 1 ||
    controlColor.length !== 1 ||
    candidateReact.length !== 1 ||
    controlReact.length !== 1
  ) {
    throw new Error(
      "isolated package inventory has missing or duplicate runtime packages",
    );
  }
  const configSha256 = sha256Json(config);
  const flagsSha256 = sha256Json(flags);
  const installContract = {
    commonManifest,
    commonManifestSha256: sha256Json(commonManifest),
    config,
    configContents,
    configFileSha256: createHash("sha256").update(configContents).digest("hex"),
    configSha256,
    flags,
    manifestDifference: {
      candidate: `file:../artifacts/${artifactFilename}`,
      control: null,
      dependency: packageName,
    },
    packageManager: { name: "pnpm", version: packageManagerVersion },
    schemaId: "yakit-ui-icons-isolated-install/v1",
  };
  const projectEvidence = async (root, manifest, install, inventory) => ({
    ...inventory,
    configSha256,
    flagsSha256,
    installExitCode: install.exitCode,
    installStderr: install.stderr,
    lockfileSha256: await sha256(path.join(root, "pnpm-lock.yaml")),
    projectManifest: manifest,
    projectManifestFileSha256: await sha256(path.join(root, "package.json")),
    projectManifestSha256: sha256Json(manifest),
  });
  const [candidate, control] = await Promise.all([
    projectEvidence(
      candidateRoot,
      candidateManifest,
      candidateInstall,
      candidateInventory,
    ),
    projectEvidence(
      controlRoot,
      controlManifest,
      controlInstall,
      controlInventory,
    ),
  ]);
  candidate.artifactSha256 = artifactSha256;
  const installedGraph = {
    candidate,
    color: {
      instances: candidateColor.length,
      paths: candidateColor.map(({ path: itemPath }) => itemPath).sort(),
      version: candidateColor[0].version,
    },
    control,
    delta: {
      packageCount: candidate.packageCount - control.packageCount,
      totalBytes: candidate.totalBytes - control.totalBytes,
    },
    installContract,
    react: {
      instances: candidateReact.length,
      paths: candidateReact.map(({ path: itemPath }) => itemPath).sort(),
      version: candidateReact[0].version,
    },
    runtimeClosure: {
      bytes: candidateIcon[0].bytes + candidateColor[0].bytes,
      packageCount: 2,
      packages: [packageName, "@yakit-libs/color"],
    },
  };
  return {
    fixtureRoot: candidateRoot,
    installRoot,
    installedGraph,
    installedPackage: await realpath(
      path.join(candidateRoot, "node_modules", "@yakit-libs", "yakit-ui-icons"),
    ),
  };
}

async function nodeProbe(fixtureRoot) {
  const source = [
    'import React from "react";',
    'import { renderToString } from "react-dom/server";',
    `import { MailOutlined } from ${JSON.stringify(packageName)};`,
    `import { iconRegistry } from ${JSON.stringify(`${packageName}/registry`)};`,
    'if (!iconRegistry.some((item) => item.exportName === "MailOutlined")) throw new Error("registry sentinel missing");',
    "const html = renderToString(React.createElement(MailOutlined));",
    'if (!html.includes("<svg")) throw new Error("SSR output does not contain SVG");',
    "process.stdout.write(JSON.stringify({ esm: true, ssr: true, cssFree: true }));",
  ].join("\n");
  await writeFile(path.join(fixtureRoot, "node-probe.mjs"), source);
  const { stdout } = await execFileAsync(process.execPath, ["node-probe.mjs"], {
    cwd: fixtureRoot,
  });
  return JSON.parse(stdout);
}

async function inspectArtifact(tarball, extractionRoot) {
  const { stdout } = await execFileAsync("tar", ["-tzf", tarball]);
  const entries = stdout.split("\n").filter(Boolean);
  if (
    entries.some(
      (entry) => !entry.startsWith("package/") || entry.includes("../"),
    )
  ) {
    throw new Error("tarball contains an unsafe or unexpected entry");
  }
  await execFileAsync("tar", ["-xzf", tarball, "-C", extractionRoot]);
  const extractedPackage = await realpath(path.join(extractionRoot, "package"));
  const manifest = JSON.parse(
    await readFile(path.join(extractedPackage, "package.json"), "utf8"),
  );
  if (manifest.name !== packageName)
    throw new Error(`expected ${packageName}, received ${manifest.name}`);
  const files = await listFiles(extractedPackage);
  const unpackedBytes = (
    await Promise.all(files.map((file) => stat(file)))
  ).reduce((sum, item) => sum + item.size, 0);
  const metrics = {
    fileCount: files.length,
    packedBytes: (await stat(tarball)).size,
    unpackedBytes,
  };
  return { extractedPackage, manifest, metrics };
}

export async function measureTarball(tarballInput) {
  const tarball = path.resolve(tarballInput);
  const workRoot = await mkdtemp(path.join(os.tmpdir(), "yakit-icon-size-"));
  let fixtureRoot;
  let installRoot;
  try {
    const { extractedPackage, manifest, metrics } = await inspectArtifact(
      tarball,
      workRoot,
    );
    const artifactSha256 = await sha256(tarball);
    const integrity = await sha512Integrity(tarball);
    const identityRecord = createIdentityRecord({
      artifactSha256,
      filename: path.basename(tarball),
      integrity,
      packedBytes: metrics.packedBytes,
      version: manifest.version,
    });
    const fixture = await prepareIsolatedProjects(tarball, artifactSha256);
    fixtureRoot = fixture.fixtureRoot;
    installRoot = fixture.installRoot;
    const installedGraph = fixture.installedGraph;
    const measurements = [];
    const runProfile = async ({
      condition,
      entry,
      expectedTarget,
      probe,
      runner,
    }) => {
      const shared = {
        condition,
        entry,
        expectedTarget,
        fixtureRoot,
        packagePath: fixture.installedPackage,
        probe,
      };
      const [unminified, minified] = await Promise.all([
        runner({ ...shared, minify: false }),
        runner({ ...shared, minify: true }),
      ]);
      return combineBuilds(unminified, minified);
    };
    for (const tool of ["vite", "esbuild"]) {
      for (const condition of ["browser", "general"]) {
        const controlEntry = path.join(
          fixtureRoot,
          `${tool}-${condition}-control.mjs`,
        );
        await writeFile(controlEntry, probeSource());
        const runner = tool === "vite" ? runVite : runEsbuild;
        const control = await runProfile({
          condition,
          entry: controlEntry,
          runner,
        });
        for (const probe of SIZE_PROBES) {
          const entry = path.join(
            fixtureRoot,
            `${tool}-${condition}-${probe.id}.mjs`,
          );
          await writeFile(entry, probeSource(probe));
          const exportContract = manifest.exports?.[probe.subpath];
          const expectedTarget =
            condition === "browser"
              ? exportContract?.browser
              : exportContract?.import;
          if (!expectedTarget) {
            throw new Error(
              `${probe.subpath} is missing its ${condition} export condition`,
            );
          }
          const measurement = await runProfile({
            condition,
            entry,
            expectedTarget,
            probe,
            runner,
          });
          measurement.control = control.sizes;
          measurement.delta = subtractSizes(measurement, control);
          measurements.push(measurement);
        }
      }
    }
    const node = await nodeProbe(fixtureRoot);
    const distribution = { ...metrics, ...classifyDistribution(metrics) };
    const lightweight = classifyLightweightMeasurementsV2(measurements);
    const reportEvidence = {
      lightweight,
      measurements,
      nodeProbes: { cssFree: node.cssFree, esm: node.esm, ssr: node.ssr },
    };
    const failureSignals = failureSignalsFromReportV2(
      reportEvidence,
      lightweight,
    );
    const validationErrors = [];
    const runtime = classifyRuntimeV2({
      evidenceErrors: validationErrors,
      signals: failureSignals,
    });
    const status = classifyReportStatusV2(distribution, lightweight, runtime);
    return {
      artifact: {
        package: manifest.name,
        filename: path.basename(tarball),
        integrity,
        sha256: artifactSha256,
        tarball,
        version: manifest.version,
      },
      distribution,
      externalObservations: [
        {
          capturedFrom: "user-supplied Bundlephobia screenshot",
          normative: false,
          observed: { gzipBytes: 321, rawBytes: 510 },
          package: packageName,
          packageVersion: "0.2.1",
          source: "Bundlephobia",
        },
      ],
      failureSignals,
      generatedAt: new Date().toISOString(),
      identityRecord,
      installedGraph,
      lightweight,
      measurements,
      nodeProbes: { cssFree: node.cssFree, esm: node.esm, ssr: node.ssr },
      runtime,
      schemaId: SIZE_REPORT_SCHEMA_ID,
      schemaVersion: SIZE_REPORT_SCHEMA_VERSION,
      sentinelSet: {
        record: sentinelSet,
        sha256: sha256Json(sentinelSet),
      },
      status,
      toolOwnership: await measureToolOwnership(),
      tools: toolVersions(),
      validationErrors,
    };
  } finally {
    if (installRoot) await rm(installRoot, { force: true, recursive: true });
    else if (fixtureRoot)
      await rm(fixtureRoot, { force: true, recursive: true });
    await rm(workRoot, { force: true, recursive: true });
  }
}

async function main() {
  const [tarball, outputFlag, outputValue] = process.argv.slice(2);
  const output =
    outputFlag === "--output"
      ? path.resolve(outputValue)
      : path.resolve("yakit-ui-icons-size-report.json");
  let report;
  try {
    if (!tarball)
      throw new Error(
        "usage: pnpm measure:size <exact-tarball.tgz> [--output report.json]",
      );
    report = await measureTarball(tarball);
    const validationErrors = validateSizeReportV2(report);
    if (validationErrors.length > 0) {
      report.validationErrors = normalizeValidationErrorsV2(validationErrors);
      report.runtime = classifyRuntimeV2({
        evidenceErrors: report.validationErrors.map(({ code }) => code),
        signals: report.failureSignals,
      });
      report.status = "INCONCLUSIVE";
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const validationErrors = [
      {
        code: "EVIDENCE_COLLECTION_FAILED",
        message,
        source: "size-observability",
      },
    ];
    report = {
      artifact: {
        package: packageName,
        sha256: tarball
          ? await sha256(path.resolve(tarball)).catch(() => "")
          : "",
        tarball: tarball ? path.resolve(tarball) : null,
      },
      distribution: null,
      error: message,
      externalObservations: [
        {
          capturedFrom: "user-supplied Bundlephobia screenshot",
          normative: false,
          observed: { gzipBytes: 321, rawBytes: 510 },
          package: packageName,
          packageVersion: "0.2.1",
          source: "Bundlephobia",
        },
      ],
      failureSignals: [],
      generatedAt: new Date().toISOString(),
      identityRecord: null,
      installedGraph: null,
      measurements: [],
      lightweight: null,
      nodeProbes: null,
      runtime: classifyRuntimeV2({
        evidenceErrors: validationErrors.map(({ code }) => code),
      }),
      schemaId: SIZE_REPORT_SCHEMA_ID,
      schemaVersion: SIZE_REPORT_SCHEMA_VERSION,
      sentinelSet: {
        record: sentinelSet,
        sha256: sha256Json(sentinelSet),
      },
      status: "INCONCLUSIVE",
      toolOwnership: await measureToolOwnership().catch(() => null),
      tools: toolVersions(),
      validationErrors,
    };
    process.exitCode = 1;
  }
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== "PASS") process.exitCode = 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
