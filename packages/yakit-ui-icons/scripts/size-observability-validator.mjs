import { createHash } from "node:crypto";

const packageName = "@yakit-libs/yakit-ui-icons";
const external = ["react", "react-dom", "@yakit-libs/color"];

export const SIZE_REPORT_SCHEMA_ID = "yakit-ui-icons-size-observability/v2";
export const SIZE_REPORT_SCHEMA_VERSION = 2;
export const SIZE_SENTINEL_SET = Object.freeze({
  schemaId: "yakit-ui-icons-size-sentinels/v1",
  version: 2,
  selected: {
    "root-outline": "MailOutlined",
    outline: "MailOutlined",
    solid: "MailSolid",
    colorful: "MitmPrimaryMenuColorful",
    oldicon: "PopoverArrowIcon",
    registry: "iconRegistry",
  },
  unrelated: {
    "root-outline": ["MailSolid", "MitmPrimaryMenuColorful", "iconRegistry"],
    outline: ["LocationOutlined", "MailSolid", "iconRegistry"],
    solid: ["BookSolid", "MailOutlined", "iconRegistry"],
    colorful: ["OfficialAvatarColorful", "MailOutlined", "iconRegistry"],
    oldicon: [
      "MailOutlined",
      "MailSolid",
      "MitmPrimaryMenuColorful",
      "iconRegistry",
    ],
    registry: [],
  },
  registryFull: ["MailOutlined", "MailSolid", "MitmPrimaryMenuColorful"],
});
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
    unrelatedSentinels: SIZE_SENTINEL_SET.unrelated["root-outline"],
  },
  {
    id: "outline",
    specifier: `${packageName}/outline`,
    exportName: "MailOutlined",
    kind: "single-icon",
    subpath: "./outline",
    unrelatedSentinels: SIZE_SENTINEL_SET.unrelated.outline,
  },
  {
    id: "solid",
    specifier: `${packageName}/solid`,
    exportName: "MailSolid",
    kind: "single-icon",
    subpath: "./solid",
    unrelatedSentinels: SIZE_SENTINEL_SET.unrelated.solid,
  },
  {
    id: "colorful",
    specifier: `${packageName}/colorful`,
    exportName: "MitmPrimaryMenuColorful",
    kind: "single-icon",
    subpath: "./colorful",
    unrelatedSentinels: SIZE_SENTINEL_SET.unrelated.colorful,
  },
  {
    id: "oldicon",
    specifier: `${packageName}/oldicon`,
    exportName: "PopoverArrowIcon",
    kind: "single-icon",
    subpath: "./oldicon",
    unrelatedSentinels: SIZE_SENTINEL_SET.unrelated.oldicon,
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

export function canonicalJson(value) {
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

export function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
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

export function failureSignalsFromReport(
  report,
  lightweight = report.lightweight,
) {
  const signals = (lightweight?.breaches ?? []).map((breach) => ({
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
  }));
  for (const row of report?.measurements ?? []) {
    const expectedCss = row.condition === "browser" ? "present" : "absent";
    const cssPresent = (row.delta?.css?.unminifiedBytes ?? 0) > 0;
    if (cssPresent !== (expectedCss === "present")) {
      signals.push({
        condition: row.condition,
        engine: row.tool,
        expected: expectedCss,
        failureKind: "CSS_CONDITION_MISMATCH",
        observed: cssPresent ? "present" : "absent",
        rowId: row.probe,
        source: "entry-contract",
      });
    }
    if (
      row.resolution?.matchedExpectedCondition !== true ||
      row.resolution?.actual !== row.resolution?.expected
    ) {
      signals.push({
        condition: row.condition,
        engine: row.tool,
        expected: row.resolution?.expected ?? null,
        failureKind: "RESOLUTION_MISMATCH",
        observed: row.resolution?.actual ?? null,
        rowId: row.probe,
        source: "entry-contract",
      });
    }
    if (
      row.retention?.expected !== true ||
      (row.kind === "registry" && row.retention?.registryFull !== true)
    ) {
      signals.push({
        condition: row.condition,
        engine: row.tool,
        expected: true,
        failureKind: "RETENTION_MISMATCH",
        observed: false,
        rowId: row.probe,
        source: "entry-contract",
      });
    }
  }
  for (const key of ["esm", "ssr", "cssFree"]) {
    if (report?.nodeProbes?.[key] === true) continue;
    signals.push({
      condition: "general",
      engine: "node",
      expected: true,
      failureKind: `NODE_${key.toUpperCase()}_FAILURE`,
      observed: report?.nodeProbes?.[key] ?? null,
      rowId: "node-probe",
      source: "entry-contract",
    });
  }
  return normalizeFailureSignals(signals);
}

export const failureSignalsFromLightweight = (lightweight) =>
  failureSignalsFromReport(
    { measurements: [], nodeProbes: { esm: true, ssr: true, cssFree: true } },
    lightweight,
  );

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
      reasons: [...new Set(evidenceErrors)].sort(),
      treeSignalIds: [],
      uncorroboratedSignalIds: failureSignals.map(({ id }) => id),
    };
  }
  const confirmed = new Set();
  const corroborated = new Set();
  const graphSignals = failureSignals.filter(
    ({ source }) => source === "paired-graph",
  );
  const groups = new Map();
  for (const signal of graphSignals) {
    const key = `${signal.rowId}:${signal.failureKind}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(signal);
  }
  for (const group of groups.values()) {
    const general = group.filter(({ condition }) => condition === "general");
    const browser = group.filter(({ condition }) => condition === "browser");
    if (new Set(general.map(({ engine }) => engine)).size >= 2) {
      confirmed.add("TREE_SHAKING_DEFECT");
      for (const signal of general) corroborated.add(signal.id);
    } else if (
      general.length === 0 &&
      new Set(browser.map(({ engine }) => engine)).size >= 2
    ) {
      confirmed.add("BROWSER_CONDITION_DEFECT");
      for (const signal of browser) corroborated.add(signal.id);
    }
  }
  const contractSignals = failureSignals.filter(
    ({ source }) => source === "entry-contract",
  );
  if (contractSignals.length > 0) {
    confirmed.add("ENTRY_CONTRACT_DEFECT");
    for (const signal of contractSignals) corroborated.add(signal.id);
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
  )
    return "INCONCLUSIVE";
  return distribution?.gateStatus === "PASS" &&
    lightweight?.classification === "PASS" &&
    runtime?.classification === "HEALTHY_ANALYZER_AMBIGUITY"
    ? "PASS"
    : "FAIL";
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

function validateGraph(graph, artifact, distribution) {
  const failures = [];
  const contract = graph?.installContract;
  const candidatePackages = graph?.candidate?.packages;
  const controlPackages = graph?.control?.packages;
  if (
    contract?.schemaId !== "yakit-ui-icons-isolated-install/v1" ||
    contract?.packageManager?.name !== "pnpm" ||
    !/^\d+\.\d+\.\d+/.test(contract?.packageManager?.version ?? "") ||
    !Array.isArray(contract?.flags) ||
    contract.flags.length === 0 ||
    contract?.configSha256 !== sha256Json(contract?.config ?? null) ||
    contract?.commonManifestSha256 !==
      sha256Json(contract?.commonManifest ?? null) ||
    graph?.candidate?.projectManifestSha256 !==
      sha256Json(graph?.candidate?.projectManifest ?? null) ||
    graph?.control?.projectManifestSha256 !==
      sha256Json(graph?.control?.projectManifest ?? null) ||
    graph?.candidate?.projectManifestFileSha256 !==
      sha256Text(
        `${JSON.stringify(graph?.candidate?.projectManifest, null, 2)}\n`,
      ) ||
    graph?.control?.projectManifestFileSha256 !==
      sha256Text(
        `${JSON.stringify(graph?.control?.projectManifest, null, 2)}\n`,
      ) ||
    contract?.configFileSha256 !== sha256Text(contract?.configContents ?? "") ||
    graph?.candidate?.configSha256 !== contract?.configSha256 ||
    graph?.control?.configSha256 !== contract?.configSha256 ||
    graph?.candidate?.flagsSha256 !== sha256Json(contract?.flags) ||
    graph?.control?.flagsSha256 !== sha256Json(contract?.flags) ||
    graph?.candidate?.installExitCode !== 0 ||
    graph?.control?.installExitCode !== 0 ||
    !/^[a-f0-9]{64}$/.test(graph?.candidate?.lockfileSha256 ?? "") ||
    !/^[a-f0-9]{64}$/.test(graph?.control?.lockfileSha256 ?? "") ||
    !Array.isArray(candidatePackages) ||
    !Array.isArray(controlPackages)
  )
    failures.push("isolated package-manager install contract is invalid");
  if (
    canonicalJson(contract?.config) !==
      canonicalJson({
        autoInstallPeers: false,
        ignoreScripts: true,
        offline: true,
        sharedWorkspaceLockfile: false,
        strictPeerDependencies: true,
      }) ||
    canonicalJson(contract?.flags) !==
      canonicalJson(["install", "--frozen-lockfile=false", "--reporter=silent"])
  )
    failures.push(
      "isolated install flags/config are not the required offline contract",
    );

  const commonManifest = contract?.commonManifest ?? {};
  const expectedControl = commonManifest;
  const expectedCandidate = {
    ...commonManifest,
    dependencies: {
      ...commonManifest.dependencies,
      [packageName]: `file:../artifacts/${artifact?.filename}`,
    },
  };
  if (
    canonicalJson(contract?.manifestDifference) !==
      canonicalJson({
        candidate: `file:../artifacts/${artifact?.filename}`,
        control: null,
        dependency: packageName,
      }) ||
    canonicalJson(graph?.control?.projectManifest) !==
      canonicalJson(expectedControl) ||
    canonicalJson(graph?.candidate?.projectManifest) !==
      canonicalJson(expectedCandidate)
  )
    failures.push(
      "candidate/control manifests do not match the isolated install contract",
    );

  const validateInventory = (side, packages) => {
    if (!Array.isArray(packages)) return;
    const paths = new Set();
    let totalBytes = 0;
    for (const item of packages) {
      if (
        typeof item?.name !== "string" ||
        typeof item?.version !== "string" ||
        !/^node_modules\//.test(item?.path ?? "") ||
        paths.has(item.path) ||
        !Number.isSafeInteger(item?.bytes) ||
        item.bytes < 0 ||
        !Number.isSafeInteger(item?.fileCount) ||
        item.fileCount < 1 ||
        !Array.isArray(item?.dependencies)
      )
        failures.push(`${side} installed dependency inventory is invalid`);
      if (
        item?.dependencies?.some(
          (dependency) => !packages.some(({ name }) => name === dependency),
        )
      )
        failures.push(`${side} installed dependency closure is incomplete`);
      paths.add(item?.path);
      totalBytes += item?.bytes ?? 0;
    }
    if (
      graph?.[side]?.packageCount !== packages.length ||
      graph?.[side]?.totalBytes !== totalBytes
    )
      failures.push(
        `${side} installed totals do not match its package inventory`,
      );
  };
  validateInventory("candidate", candidatePackages);
  validateInventory("control", controlPackages);
  const candidateIcon =
    candidatePackages?.filter(({ name }) => name === packageName) ?? [];
  const controlIcon =
    controlPackages?.filter(({ name }) => name === packageName) ?? [];
  const candidateReact =
    candidatePackages?.filter(({ name }) => name === "react") ?? [];
  const controlReact =
    controlPackages?.filter(({ name }) => name === "react") ?? [];
  const candidateColor =
    candidatePackages?.filter(({ name }) => name === "@yakit-libs/color") ?? [];
  const controlColor =
    controlPackages?.filter(({ name }) => name === "@yakit-libs/color") ?? [];
  const commonVersionsMatch = Object.entries(
    commonManifest.dependencies ?? {},
  ).every(
    ([name, version]) =>
      candidatePackages?.some(
        (item) => item.name === name && item.version === version,
      ) &&
      controlPackages?.some(
        (item) => item.name === name && item.version === version,
      ),
  );
  const comparableRecord = ({ path: _path, ...item }) => item;
  const sortRecord = (left, right) =>
    `${left.name}@${left.version}`.localeCompare(
      `${right.name}@${right.version}`,
    );
  const sharedCandidate = (candidatePackages ?? [])
    .filter(({ name }) => name !== packageName)
    .map(comparableRecord)
    .sort(sortRecord);
  const sharedControl = (controlPackages ?? [])
    .map(comparableRecord)
    .sort(sortRecord);
  if (
    candidateIcon.length !== 1 ||
    controlIcon.length !== 0 ||
    candidateReact.length !== 1 ||
    controlReact.length !== 1 ||
    candidateColor.length !== 1 ||
    controlColor.length !== 1 ||
    commonVersionsMatch !== true ||
    canonicalJson(sharedCandidate) !== canonicalJson(sharedControl) ||
    candidateIcon[0]?.version !== artifact?.version ||
    candidateIcon[0]?.bytes !== distribution?.unpackedBytes ||
    candidateIcon[0]?.fileCount !== distribution?.fileCount ||
    !candidateIcon[0]?.dependencies.includes("@yakit-libs/color") ||
    candidateReact[0]?.version !== controlReact[0]?.version ||
    candidateColor[0]?.version !== controlColor[0]?.version ||
    graph?.delta?.packageCount !==
      graph?.candidate?.packageCount - graph?.control?.packageCount ||
    graph?.delta?.totalBytes !==
      graph?.candidate?.totalBytes - graph?.control?.totalBytes ||
    graph?.runtimeClosure?.packageCount !== 2 ||
    graph?.runtimeClosure?.bytes !==
      candidateIcon[0]?.bytes + candidateColor[0]?.bytes ||
    graph?.candidate?.artifactSha256 !== artifact?.sha256
  )
    failures.push("installed graph/control comparison is invalid");
  for (const [name, expected] of [
    ["react", candidateReact],
    ["color", candidateColor],
  ]) {
    const record = graph?.[name];
    if (
      record?.instances !== expected.length ||
      record?.version !== expected[0]?.version ||
      canonicalJson(record?.paths) !==
        canonicalJson(expected.map(({ path }) => path).sort())
    )
      failures.push(`${name} installed instance evidence is invalid`);
  }
  return failures;
}

export function validateSizeReport(report, expectedArtifact) {
  const errors = [];
  if (report?.schemaId !== SIZE_REPORT_SCHEMA_ID)
    errors.push("unsupported schemaId");
  if (report?.schemaVersion !== SIZE_REPORT_SCHEMA_VERSION)
    errors.push("unsupported schemaVersion");
  if (!/^[a-f0-9]{64}$/.test(report?.artifact?.sha256 ?? ""))
    errors.push("artifact.sha256 is required");
  if (
    report?.artifact?.package !== packageName ||
    typeof report?.artifact?.filename !== "string" ||
    !report.artifact.filename.endsWith(".tgz") ||
    !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(report?.artifact?.integrity ?? "") ||
    typeof report?.artifact?.version !== "string" ||
    !Number.isSafeInteger(report?.distribution?.packedBytes)
  )
    errors.push("artifact identity is incomplete");
  if (expectedArtifact) {
    for (const field of [
      "package",
      "filename",
      "integrity",
      "sha256",
      "version",
    ])
      if (report?.artifact?.[field] !== expectedArtifact[field])
        errors.push(`artifact ${field} does not match release identity`);
    for (const field of ["packedBytes", "unpackedBytes", "fileCount"])
      if (report?.distribution?.[field] !== expectedArtifact[field])
        errors.push(`artifact ${field} does not match release identity`);
  }
  const expectedIdentity = createIdentityRecord({
    artifactSha256: report?.artifact?.sha256,
    filename: report?.artifact?.filename,
    integrity: report?.artifact?.integrity,
    packedBytes: report?.distribution?.packedBytes,
    version: report?.artifact?.version,
  });
  if (canonicalJson(report?.identityRecord) !== canonicalJson(expectedIdentity))
    errors.push("immutable identity SHA relation is invalid");
  if (
    canonicalJson(report?.sentinelSet?.record) !==
      canonicalJson(SIZE_SENTINEL_SET) ||
    report?.sentinelSet?.sha256 !== sha256Json(SIZE_SENTINEL_SET)
  )
    errors.push("sentinel version/hash relation is invalid");
  if (
    !Array.isArray(report?.externalObservations) ||
    report.externalObservations.length === 0 ||
    report.externalObservations.some(({ normative }) => normative !== false)
  )
    errors.push("external observations must exist and be non-normative");
  if (
    report?.toolOwnership?.esbuild?.directDevDependency !== true ||
    report?.toolOwnership?.esbuild?.lockImporterExact !== true ||
    report?.toolOwnership?.esbuild?.manifestVersion !== "0.25.9" ||
    report?.toolOwnership?.esbuild?.runtimeVersion !== "0.25.9" ||
    report?.tools?.esbuild !== "0.25.9" ||
    !report?.tools?.vite ||
    !report?.tools?.node
  )
    errors.push("direct exact esbuild ownership or tool versions are invalid");

  const expectedDistribution = classifyDistribution(report?.distribution);
  const actualDistribution = Object.fromEntries(
    Object.keys(expectedDistribution).map((key) => [
      key,
      report?.distribution?.[key],
    ]),
  );
  if (canonicalJson(expectedDistribution) !== canonicalJson(actualDistribution))
    errors.push("distribution classification does not match raw metrics");
  errors.push(
    ...validateGraph(
      report?.installedGraph,
      report?.artifact,
      report?.distribution,
    ),
  );

  const measurements = report?.measurements;
  if (
    !Array.isArray(measurements) ||
    measurements.length !== SIZE_PROBES.length * 4
  ) {
    errors.push(
      `exactly ${SIZE_PROBES.length * 4} paired measurements are required`,
    );
  } else {
    const expectedRows = new Map(
      ["vite", "esbuild"].flatMap((tool) =>
        ["browser", "general"].flatMap((condition) =>
          SIZE_PROBES.map((probe) => [
            `${tool}:${condition}:${probe.id}`,
            { tool, condition, probe },
          ]),
        ),
      ),
    );
    const seen = new Set();
    for (const row of measurements) {
      const key = `${row.tool}:${row.condition}:${row.probe}`;
      const expected = expectedRows.get(key);
      if (!expected || seen.has(key)) {
        errors.push(
          "measurement rows must be unique and match the exact matrix",
        );
        continue;
      }
      seen.add(key);
      if (row.kind !== expected.probe.kind)
        errors.push(`${key} kind is invalid`);
      const expectedTarget = expectedResolutionTarget(
        expected.probe,
        row.condition,
      );
      if (
        row.resolution?.actual !== expectedTarget ||
        row.resolution?.expected !== expectedTarget ||
        row.resolution?.matchedExpectedCondition !== true ||
        !Array.isArray(row.resolvedInputs) ||
        row.resolvedInputs.length === 0 ||
        row.retention?.expected !== true ||
        (row.kind === "registry" && row.retention?.registryFull !== true) ||
        !Array.isArray(row.retention?.unrelatedSentinels)
      )
        errors.push(`${key} resolution or retention evidence is invalid`);
      const expectedOptions = comparePairedBuildOptions(
        normalizedBuildOptions(row.tool, row.condition, false),
        normalizedBuildOptions(row.tool, row.condition, true),
      );
      if (canonicalJson(row.buildOptions) !== canonicalJson(expectedOptions))
        errors.push(`${key} paired build options are invalid`);
      for (const evidenceName of ["sizes", "control", "delta"]) {
        const evidence = row[evidenceName];
        for (const asset of ["js", "css", "total"])
          for (const metric of [
            "unminifiedBytes",
            "minifiedBytes",
            "gzipBytes",
          ])
            if (!Number.isSafeInteger(evidence?.[asset]?.[metric]))
              errors.push(
                `${key} ${evidenceName}.${asset}.${metric} is invalid`,
              );
        for (const metric of ["unminifiedBytes", "minifiedBytes", "gzipBytes"])
          if (
            evidence?.total?.[metric] !==
            evidence?.js?.[metric] + evidence?.css?.[metric]
          )
            errors.push(
              `${key} ${evidenceName} total ${metric} arithmetic is invalid`,
            );
      }
      for (const asset of ["js", "css", "total"])
        for (const metric of ["unminifiedBytes", "minifiedBytes", "gzipBytes"])
          if (
            row.delta?.[asset]?.[metric] !==
            row.sizes?.[asset]?.[metric] - row.control?.[asset]?.[metric]
          )
            errors.push(
              `${key} ${asset} ${metric} delta arithmetic is invalid`,
            );
    }
    if (seen.size !== expectedRows.size)
      errors.push("measurement tool/condition/probe matrix is incomplete");
  }
  if (
    !report?.nodeProbes ||
    !["esm", "ssr", "cssFree"].every(
      (key) => typeof report.nodeProbes[key] === "boolean",
    )
  )
    errors.push("Node ESM, SSR, and CSS-free evidence is required");
  const expectedLightweight = classifyLightweightMeasurements(
    measurements ?? [],
  );
  if (canonicalJson(expectedLightweight) !== canonicalJson(report?.lightweight))
    errors.push("lightweight classification does not match bundle deltas");
  const expectedSignals = failureSignalsFromReport(report, expectedLightweight);
  if (canonicalJson(expectedSignals) !== canonicalJson(report?.failureSignals))
    errors.push("normalized failure signals do not match runtime evidence");
  if (!Array.isArray(report?.validationErrors))
    errors.push("validationErrors must be an array");
  const evidenceCodes = (report?.validationErrors ?? []).map(
    ({ code }) => code,
  );
  const expectedRuntime = classifyRuntime({
    evidenceErrors: evidenceCodes,
    signals: expectedSignals,
  });
  if (canonicalJson(expectedRuntime) !== canonicalJson(report?.runtime))
    errors.push("runtime classification does not match normalized signals");
  const expectedStatus = classifyReportStatus(
    expectedDistribution,
    expectedLightweight,
    expectedRuntime,
  );
  if (report?.status !== expectedStatus)
    errors.push("status does not match recomputed classifiers");
  return errors;
}
