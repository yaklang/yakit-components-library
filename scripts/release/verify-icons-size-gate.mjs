#!/usr/bin/env node

import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { validateSizeReport } from "../../packages/yakit-ui-icons/scripts/size-observability-validator.mjs";
import { measureTarball } from "../../packages/yakit-ui-icons/scripts/size-observability.mjs";
import { findPackageTarball } from "./verify-pack-directory.mjs";
import {
  isManifestFinalized,
  sha256File,
  validateVerificationManifest,
} from "./verification-manifest.mjs";

const verifiedDirectory = path.resolve(process.argv[2] ?? "");
if (!process.argv[2])
  throw new Error("Usage: verify-icons-size-gate.mjs <verified-directory>");
const manifestPath = path.join(verifiedDirectory, "verification-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
await validateVerificationManifest(manifest, {
  allowDraft: true,
  evidenceDirectory: verifiedDirectory,
});
const icons = manifest.releases.find(
  (entry) => entry.name === "@yakit-libs/yakit-ui-icons",
);
if (!icons) {
  console.log(
    JSON.stringify(
      { releaseSet: manifest.releaseSet, sizeGate: "skipped" },
      null,
      2,
    ),
  );
  process.exit(0);
}

const tarball = await findPackageTarball(
  verifiedDirectory,
  "@yakit-libs/yakit-ui-icons",
);
const report = await measureTarball(tarball);
const errors = validateSizeReport(report);
if (errors.length > 0 || report.status !== "PASS")
  throw new Error(
    `icons size gate failed: ${errors.join("; ") || report.status}`,
  );
if (report.artifact.sha256 !== icons.tarball.sha256)
  throw new Error("icons size report refers to a different exact tarball");

const reportFilename = `yakit-ui-icons-size-report-${icons.version}.json`;
const reportPath = path.join(verifiedDirectory, reportFilename);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
  flag: "wx",
});
icons.gates.size = "passed";
icons.evidence = {
  ...icons.evidence,
  size: {
    artifactSha256: report.artifact.sha256,
    filename: reportFilename,
    reportSha256: await sha256File(reportPath),
    schemaVersion: report.schemaVersion,
    status: report.status,
  },
};
manifest.finalized = isManifestFinalized(manifest);
await validateVerificationManifest(manifest, {
  allowDraft: true,
  evidenceDirectory: verifiedDirectory,
});
const temporary = `${manifestPath}.${process.pid}.tmp`;
await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, {
  flag: "wx",
});
await rename(temporary, manifestPath);
console.log(
  JSON.stringify(
    {
      artifactSha256: report.artifact.sha256,
      reportSha256: icons.evidence.size.reportSha256,
      sizeGate: "passed",
    },
    null,
    2,
  ),
);
