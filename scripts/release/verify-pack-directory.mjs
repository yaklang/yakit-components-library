#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { findRemovedUiRuntimeReferences } from "./removed-ui-runtime-scan.mjs";
import { sha256File } from "./verification-manifest.mjs";

export const PUBLIC_PACKAGES = [
  "@yakit-libs/yakit-ui",
  "@yakit-libs/yakit-ui-icons",
];
export const ICON_PACKAGE_LIMITS = {
  packedBytes: 600_000,
  unpackedBytes: 3_000_000,
  fileCount: 33,
};
const POLICIES = {
  "@yakit-libs/yakit-ui": {
    required: [
      "package/package.json",
      "package/dist/index.js",
      "package/dist/index.d.ts",
      "package/dist/index.css",
      "package/dist/bin/yakit-ui-storybook.mjs",
      "package/storybook-static/index.html",
      "package/LICENSE",
    ],
    prefixes: ["package/dist/", "package/storybook-static/"],
  },
  "@yakit-libs/yakit-ui-icons": {
    required: [
      "package/package.json",
      "package/dist/index.js",
      "package/dist/index.d.ts",
      "package/dist/colorful/index.js",
      "package/dist/colorful/index.d.ts",
      "package/dist/outline/index.js",
      "package/dist/outline/index.d.ts",
      "package/dist/solid/index.js",
      "package/dist/solid/index.d.ts",
      "package/dist/registry.js",
      "package/dist/registry.d.ts",
      "package/LICENSE",
    ],
    prefixes: ["package/dist/"],
  },
};
const EXACT_ALLOWED_ENTRIES = new Set([
  "package/",
  "package/package.json",
  "package/README.md",
  "package/README",
  "package/LICENSE",
  "package/LICENSE.md",
  "package/LICENSE.txt",
]);
const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".d.ts",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".map",
  ".md",
  ".mjs",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(path.resolve(directory), {
    withFileTypes: true,
  })) {
    const absolute = path.join(path.resolve(directory), entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.isFile() && absolute.endsWith(".tgz")) files.push(absolute);
  }
  return files.sort();
}
export const findTarballs = (directory) => walk(directory);
const readManifest = (tarball) =>
  JSON.parse(
    execFileSync("tar", ["-xOzf", tarball, "package/package.json"], {
      encoding: "utf8",
    }),
  );

export async function findPackageTarball(directory, packageName) {
  const matches = [];
  for (const tarball of await findTarballs(directory))
    if (readManifest(tarball).name === packageName) matches.push(tarball);
  if (matches.length !== 1)
    throw new Error(
      `Expected exactly one ${packageName} tarball in ${directory}, found ${matches.length}`,
    );
  return matches[0];
}
const isAllowedEntry = (entry, policy) =>
  EXACT_ALLOWED_ENTRIES.has(entry) ||
  policy.prefixes.some((prefix) => entry.startsWith(prefix));

function scanTextEntry(tarball, entry, failures) {
  if (entry.endsWith("/")) return;
  const isText =
    entry.endsWith(".d.ts") ||
    TEXT_EXTENSIONS.has(path.posix.extname(entry).toLowerCase()) ||
    entry.startsWith("package/README") ||
    entry.startsWith("package/LICENSE") ||
    entry === "package/package.json";
  if (!isText) return;
  const contents = execFileSync("tar", ["-xOzf", tarball, entry], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (
    [
      /npm_[A-Za-z0-9]{20,}/,
      /(?:_authToken|npmAuthToken)\s*[=:]\s*[^\s"']+/i,
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
      /(?:ghp|github_pat)_[A-Za-z0-9_]{20,}/,
    ].some((pattern) => pattern.test(contents))
  )
    failures.push(`credential-like content in ${entry}`);
  if (
    /(?:^|[\s"'=(])(?:\/Users\/[^/\s]+\/|\/home\/[^/\s]+\/|[A-Za-z]:\\Users\\[^\\\s]+\\)/m.test(
      contents,
    )
  )
    failures.push(`absolute developer path in ${entry}`);
  const removedUiRuntimes = findRemovedUiRuntimeReferences(contents);
  if (removedUiRuntimes.length > 0)
    failures.push(
      `removed UI runtime reference in ${entry}: ${removedUiRuntimes.join(", ")}`,
    );
}

export async function verifyPackageTarball(tarball) {
  const manifest = readManifest(tarball);
  const policy = POLICIES[manifest.name];
  if (!policy || manifest.private === true)
    throw new Error(
      `unexpected publishable package ${manifest.name ?? "<missing>"}`,
    );
  const entries = execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" })
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const verboseEntries = execFileSync("tar", ["-tvzf", tarball], {
    encoding: "utf8",
  })
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const failures = [];
  for (const entry of policy.required)
    if (!entries.includes(entry)) failures.push(`missing ${entry}`);
  for (const entry of entries) {
    const normalized = path.posix.normalize(`/${entry}`).slice(1);
    if (entry.startsWith("/") || normalized !== entry || entry.includes(".."))
      failures.push(`unsafe tar entry ${entry}`);
    if (
      /(^|\/)(\.npmrc|\.env(?:\.|$)|\.omx|coverage|test-results)(\/|$)/.test(
        entry,
      )
    )
      failures.push(`forbidden tar entry ${entry}`);
    if (!isAllowedEntry(entry, policy))
      failures.push(`unexpected tar entry ${entry}`);
    if (isAllowedEntry(entry, policy)) scanTextEntry(tarball, entry, failures);
  }
  for (const entry of verboseEntries)
    if (entry[0] !== "-" && entry[0] !== "d")
      failures.push("tarball must contain regular files and directories only");
  const packedBytes = (await stat(tarball)).size;
  const unpacked = execFileSync("tar", ["-xOzf", tarball], {
    encoding: "buffer",
    maxBuffer: 256 * 1024 * 1024,
  });
  const unpackedBytes = unpacked.length;
  const fileCount = entries.filter((entry) => !entry.endsWith("/")).length;
  if (manifest.name === "@yakit-libs/yakit-ui-icons") {
    if (
      JSON.stringify(manifest.peerDependencies) !==
      JSON.stringify({ react: "^18.2.0" })
    )
      failures.push(
        "@yakit-libs/yakit-ui-icons must peer only on react ^18.2.0",
      );
    if (
      JSON.stringify(manifest.dependencies) !==
      JSON.stringify({ "@yakit-libs/color": "1.4.1" })
    )
      failures.push(
        "@yakit-libs/yakit-ui-icons must depend only on @yakit-libs/color 1.4.1",
      );
    if (manifest.peerDependenciesMeta)
      failures.push(
        "@yakit-libs/yakit-ui-icons must not publish optional peers",
      );
    for (const [metric, limit] of Object.entries(ICON_PACKAGE_LIMITS))
      if ({ packedBytes, unpackedBytes, fileCount }[metric] > limit)
        failures.push(
          `@yakit-libs/yakit-ui-icons ${metric} exceeds ${limit}: ${
            { packedBytes, unpackedBytes, fileCount }[metric]
          }`,
        );
  }
  if (failures.length)
    throw new Error(
      `Pack directory failed for ${manifest.name}:\n- ${failures.join("\n- ")}`,
    );
  return {
    package: manifest.name,
    version: manifest.version,
    tarball,
    sha256: await sha256File(tarball),
    packedBytes,
    unpackedBytes,
    fileCount,
    entries,
  };
}

export async function verifyPackDirectory({
  directory,
  expectedPackages = PUBLIC_PACKAGES,
}) {
  const packages = await Promise.all(
    (await findTarballs(directory)).map(verifyPackageTarball),
  );
  const names = packages.map((item) => item.package).sort();
  const expected = [...expectedPackages].sort();
  if (JSON.stringify(names) !== JSON.stringify(expected))
    throw new Error(
      `Pack directory package set must be ${JSON.stringify(expected)}, got ${JSON.stringify(names)}`,
    );
  return { packages };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)
) {
  const directory = process.argv[2];
  if (!directory)
    throw new Error("Usage: verify-pack-directory.mjs <directory>");
  console.log(
    JSON.stringify(await verifyPackDirectory({ directory }), null, 2),
  );
}
