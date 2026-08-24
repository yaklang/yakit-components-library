#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");
const packageDir = path.join(root, "packages/yakit-ui");
const policyPath = path.join(root, ".release/yakit-ui-package-policy.json");
const candidatePath = path.join(
  root,
  ".release/yakit-ui-package-policy.candidate.json",
);
const command = process.argv[2];

function parsePackReport() {
  const stdout = execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts=false"],
    {
      cwd: packageDir,
      encoding: "utf8",
      env: { ...process.env, npm_config_loglevel: "error" },
    },
  );
  const jsonStart = stdout.lastIndexOf("\n[");
  const report = JSON.parse(jsonStart === -1 ? stdout : stdout.slice(jsonStart + 1));
  if (!Array.isArray(report) || report.length !== 1)
    throw new Error("Expected exactly one npm pack report");
  const item = report[0];
  return {
    package: item.name,
    version: item.version,
    packedBytes: item.size,
    unpackedBytes: item.unpackedSize,
    fileCount: item.entryCount ?? item.files?.length,
  };
}

function ceiling(baseline, fixedCap) {
  return baseline + Math.min(Math.floor((baseline * 10) / 100), fixedCap);
}

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

if (command === "init") {
  const sourceSha = readFlag("--source-sha");
  if (!sourceSha)
    throw new Error("policy:init requires --source-sha <full-commit-sha>");
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (sourceSha !== head || !/^[0-9a-f]{40}$/.test(sourceSha)) {
    throw new Error(`--source-sha must exactly equal committed HEAD ${head}`);
  }
  const dirty = execFileSync(
    "git",
    [
      "status",
      "--porcelain",
      "--",
      "package.json",
      "pnpm-lock.yaml",
      "packages/yakit-ui",
    ],
    {
      cwd: root,
      encoding: "utf8",
    },
  ).trim();
  if (dirty)
    throw new Error(
      "policy:init requires committed release inputs; package/root dependency paths are dirty",
    );

  const baseline = parsePackReport();
  const policy = {
    schemaVersion: 1,
    package: "yakit-ui",
    sourceCommit: sourceSha,
    baseline: {
      packedBytes: baseline.packedBytes,
      unpackedBytes: baseline.unpackedBytes,
      fileCount: baseline.fileCount,
    },
    limits: {
      packedBytes: ceiling(baseline.packedBytes, 1024 * 1024),
      unpackedBytes: ceiling(baseline.unpackedBytes, 5 * 1024 * 1024),
      fileCount: ceiling(baseline.fileCount, 100),
    },
  };
  await mkdir(path.dirname(candidatePath), { recursive: true });
  await writeFile(candidatePath, `${JSON.stringify(policy, null, 2)}\n`, {
    flag: "wx",
  });
  console.log(`Wrote candidate policy: ${path.relative(root, candidatePath)}`);
  console.log(JSON.stringify(policy, null, 2));
} else if (command === "check") {
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  if (policy.schemaVersion !== 1 || policy.package !== "yakit-ui")
    throw new Error("Unsupported package policy schema");
  if (!/^[0-9a-f]{40}$/.test(policy.sourceCommit ?? ""))
    throw new Error(
      "Package policy sourceCommit must be a full Git commit SHA",
    );
  const actual = parsePackReport();
  const failures = [];
  for (const metric of ["packedBytes", "unpackedBytes", "fileCount"]) {
    if (
      !Number.isSafeInteger(policy.baseline?.[metric]) ||
      policy.baseline[metric] < 0
    ) {
      failures.push(`policy baseline ${metric} must be a non-negative integer`);
    }
    if (!Number.isSafeInteger(policy.limits?.[metric]))
      failures.push(`policy limit ${metric} must be an integer`);
    if (policy.limits?.[metric] < policy.baseline?.[metric])
      failures.push(`policy limit ${metric} must not be below its baseline`);
    if (actual[metric] > policy.limits?.[metric])
      failures.push(
        `${metric} ${actual[metric]} exceeds ${policy.limits?.[metric]}`,
      );
  }
  if (failures.length) {
    console.error("Package policy failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        package: actual.package,
        version: actual.version,
        actual,
        limits: policy.limits,
      },
      null,
      2,
    ),
  );
} else {
  throw new Error("Usage: package-policy.mjs <init --source-sha SHA|check>");
}
