#!/usr/bin/env node

import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  isManifestFinalized,
  validateVerificationManifest,
} from "./verification-manifest.mjs";

const manifestPath = path.resolve(process.argv[2] ?? "");
const gate = process.argv[3];
if (!process.argv[2] || !/^[a-z][A-Za-z0-9]*$/.test(gate ?? ""))
  throw new Error("Usage: record-verification-gate.mjs <manifest> <gate>");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
await validateVerificationManifest(manifest, {
  allowDraft: true,
  evidenceDirectory: path.dirname(manifestPath),
});
for (const release of manifest.releases) release.gates[gate] = "passed";
manifest.finalized = isManifestFinalized(manifest);
await validateVerificationManifest(manifest, {
  evidenceDirectory: path.dirname(manifestPath),
});
const temporary = `${manifestPath}.${process.pid}.tmp`;
await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, {
  flag: "wx",
});
await rename(temporary, manifestPath);
console.log(JSON.stringify({ gate, releaseSet: manifest.releaseSet }, null, 2));
