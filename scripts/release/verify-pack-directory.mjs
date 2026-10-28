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
const PUBLIC_PACKAGE_SET = new Set(PUBLIC_PACKAGES);
export const sortPublicPackages = (packages) =>
  [...packages].sort(
    (left, right) =>
      PUBLIC_PACKAGES.indexOf(left) - PUBLIC_PACKAGES.indexOf(right),
  );

export function validateReleaseSet(releaseSet) {
  if (!Array.isArray(releaseSet) || releaseSet.length === 0)
    throw new Error("releaseSet must be a non-empty array");
  if (new Set(releaseSet).size !== releaseSet.length)
    throw new Error("releaseSet must not contain duplicate packages");
  for (const packageName of releaseSet)
    if (!PUBLIC_PACKAGE_SET.has(packageName))
      throw new Error(`releaseSet contains unsupported package ${packageName}`);
  const sorted = sortPublicPackages(releaseSet);
  if (JSON.stringify(sorted) !== JSON.stringify(releaseSet))
    throw new Error(
      `releaseSet must use deterministic order ${JSON.stringify(sorted)}`,
    );
  return releaseSet;
}
export const CURATED_ICON_PACKAGE_LIMITS = {
  packedBytes: 600_000,
  unpackedBytes: 3_000_000,
  fileCount: 33,
};
export const OLDICON_COMPATIBILITY_ALLOWANCE = {
  packedBytes: 1_400_000,
  unpackedBytes: 4_700_000,
  fileCount: 1_167,
};
export const ICON_PACKAGE_LIMITS = Object.fromEntries(
  Object.keys(CURATED_ICON_PACKAGE_LIMITS).map((metric) => [
    metric,
    CURATED_ICON_PACKAGE_LIMITS[metric] +
      OLDICON_COMPATIBILITY_ALLOWANCE[metric],
  ]),
);
export const OLDICON_ENTRY_LIMITS = {
  runtimeBytes: 100_000,
  typesBytes: 40_000,
};
export const OLDICON_EXPORT_COUNT = 380;
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
      "package/dist/oldicon/index.js",
      "package/dist/oldicon/index.d.ts",
      "package/dist/oldicon/icons/PopoverArrowIcon.js",
      "package/dist/oldicon/icons/PopoverArrowIcon.d.ts",
      "package/dist/browser/oldicon/icons/PopoverArrowIcon.js",
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
    const oldiconExport = manifest.exports?.["./oldicon/*"];
    if (
      JSON.stringify(oldiconExport) !==
      JSON.stringify({
        types: "./dist/oldicon/icons/*.d.ts",
        browser: "./dist/browser/oldicon/icons/*.js",
        import: "./dist/oldicon/icons/*.js",
      })
    ) {
      failures.push(
        "@yakit-libs/yakit-ui-icons must publish the typed oldicon per-icon export pattern",
      );
    }
    const oldiconFileNames = (prefix, suffix) =>
      entries
        .filter((entry) => entry.startsWith(prefix) && entry.endsWith(suffix))
        .map((entry) => entry.slice(prefix.length, -suffix.length))
        .sort();
    const oldiconRuntimeNames = oldiconFileNames(
      "package/dist/oldicon/icons/",
      ".js",
    );
    const oldiconTypeNames = oldiconFileNames(
      "package/dist/oldicon/icons/",
      ".d.ts",
    );
    const oldiconBrowserNames = oldiconFileNames(
      "package/dist/browser/oldicon/icons/",
      ".js",
    );
    if (
      oldiconRuntimeNames.length !== OLDICON_EXPORT_COUNT ||
      JSON.stringify(oldiconRuntimeNames) !==
        JSON.stringify(oldiconTypeNames) ||
      JSON.stringify(oldiconRuntimeNames) !==
        JSON.stringify(oldiconBrowserNames)
    ) {
      failures.push(
        `oldicon per-icon runtime, declaration, and browser file sets must match all ${OLDICON_EXPORT_COUNT} exports`,
      );
    }
    if (oldiconRuntimeNames.includes("TaskWaitIcon")) {
      failures.push("TaskWaitIcon must not be published as an SVG oldicon");
    }
    if (
      JSON.stringify(manifest.peerDependencies) !==
      JSON.stringify({ react: "^18.2.0 || ^19.0.0" })
    )
      failures.push(
        "@yakit-libs/yakit-ui-icons must peer only on react ^18.2.0 || ^19.0.0",
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
    for (const [entry, limit] of [
      ["package/dist/oldicon/index.js", OLDICON_ENTRY_LIMITS.runtimeBytes],
      ["package/dist/oldicon/index.d.ts", OLDICON_ENTRY_LIMITS.typesBytes],
    ]) {
      if (!entries.includes(entry)) continue;
      const bytes = execFileSync("tar", ["-xOzf", tarball, entry], {
        encoding: "buffer",
        maxBuffer: 16 * 1024 * 1024,
      }).length;
      if (bytes > limit) failures.push(`${entry} exceeds ${limit}: ${bytes}`);
    }
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

export async function verifyPackDirectory({ directory, expectedPackages }) {
  const packages = await Promise.all(
    (await findTarballs(directory)).map(verifyPackageTarball),
  );
  packages.sort(
    (left, right) =>
      PUBLIC_PACKAGES.indexOf(left.package) -
      PUBLIC_PACKAGES.indexOf(right.package),
  );
  const names = packages.map((item) => item.package);
  const expected = expectedPackages
    ? validateReleaseSet(expectedPackages)
    : validateReleaseSet(names);
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
