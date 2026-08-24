#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");
const workspaceRoots = ["apps", "packages"];
const expectedPublicPackage = "yakit-ui";
const failures = [];
const packages = [];

for (const workspaceRoot of workspaceRoots) {
  const absoluteRoot = path.join(root, workspaceRoot);
  for (const entry of await readdir(absoluteRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(absoluteRoot, entry.name, "package.json");
    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }

    const relativePath = path.relative(root, manifestPath);
    const publishable = manifest.private !== true;
    packages.push({
      name: manifest.name,
      path: relativePath,
      private: manifest.private === true,
    });

    if (publishable && manifest.name !== expectedPublicPackage) {
      failures.push(
        `${relativePath}: only ${expectedPublicPackage} may be non-private`,
      );
    }
    if (manifest.name === expectedPublicPackage && manifest.private === true) {
      failures.push(
        `${relativePath}: ${expectedPublicPackage} must remain publishable`,
      );
    }

    const nestedLockfile = path.join(
      path.dirname(manifestPath),
      "pnpm-lock.yaml",
    );
    try {
      await readFile(nestedLockfile, "utf8");
      failures.push(
        `${path.relative(root, nestedLockfile)}: nested workspace lockfiles are forbidden`,
      );
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

const publishableNames = packages
  .filter((item) => !item.private)
  .map((item) => item.name);
if (
  publishableNames.length !== 1 ||
  publishableNames[0] !== expectedPublicPackage
) {
  failures.push(
    `publishable workspace set must be exactly [${expectedPublicPackage}], got ${JSON.stringify(publishableNames)}`,
  );
}

if (failures.length > 0) {
  console.error("Workspace publication boundary failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    { publishablePackages: publishableNames, workspacePackages: packages },
    null,
    2,
  ),
);
