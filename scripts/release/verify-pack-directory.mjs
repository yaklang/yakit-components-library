#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { sha256File } from "./verification-manifest.mjs";

const REQUIRED_ENTRIES = [
  "package/package.json",
  "package/dist/index.js",
  "package/dist/index.d.ts",
  "package/dist/index.css",
  "package/dist/bin/yakit-ui-storybook.mjs",
  "package/storybook-static/index.html",
  "package/LICENSE",
];

const EXACT_ALLOWED_ENTRIES = new Set([
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

function isAllowedEntry(entry) {
  if (entry.endsWith("/")) {
    return (
      entry === "package/" ||
      entry === "package/dist/" ||
      entry.startsWith("package/dist/") ||
      entry === "package/storybook-static/" ||
      entry.startsWith("package/storybook-static/")
    );
  }
  return (
    EXACT_ALLOWED_ENTRIES.has(entry) ||
    entry.startsWith("package/dist/") ||
    entry.startsWith("package/storybook-static/")
  );
}

function isTextEntry(entry) {
  if (entry.endsWith("/")) return false;
  if (
    entry === "package/package.json" ||
    entry.startsWith("package/README") ||
    entry.startsWith("package/LICENSE")
  )
    return true;
  if (entry.endsWith(".d.ts")) return true;
  return TEXT_EXTENSIONS.has(path.posix.extname(entry).toLowerCase());
}

function scanTextEntry(tarball, entry, failures) {
  if (!isTextEntry(entry)) return;
  const contents = execFileSync("tar", ["-xOzf", tarball, entry], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const credentialPatterns = [
    /npm_[A-Za-z0-9]{20,}/,
    /(?:_authToken|npmAuthToken)\s*[=:]\s*[^\s"']+/i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /(?:ghp|github_pat)_[A-Za-z0-9_]{20,}/,
  ];
  if (credentialPatterns.some((pattern) => pattern.test(contents))) {
    failures.push(`credential-like content in ${entry}`);
  }
  const absoluteDeveloperPath =
    /(?:^|[\s"'=(])(?:\/Users\/[^/\s]+\/|\/home\/[^/\s]+\/|[A-Za-z]:\\Users\\[^\\\s]+\\)/m;
  if (absoluteDeveloperPath.test(contents))
    failures.push(`absolute developer path in ${entry}`);
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

export async function findSingleTarball(directory) {
  const tarballs = (await walk(path.resolve(directory))).filter((file) =>
    file.endsWith(".tgz"),
  );
  if (tarballs.length !== 1)
    throw new Error(
      `Expected exactly one tarball in ${directory}, found ${tarballs.length}`,
    );
  return tarballs[0];
}

export async function verifyPackDirectory(options) {
  const tarball = await findSingleTarball(options.directory);
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
  for (const entry of REQUIRED_ENTRIES)
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
    if (!isAllowedEntry(entry)) failures.push(`unexpected tar entry ${entry}`);
    if (isAllowedEntry(entry)) scanTextEntry(tarball, entry, failures);
  }
  for (const entry of verboseEntries) {
    const type = entry[0];
    if (type !== "-" && type !== "d")
      failures.push("tarball must contain regular files and directories only");
  }
  if (failures.length)
    throw new Error(`Pack directory failed:\n- ${failures.join("\n- ")}`);
  const unpacked = execFileSync("tar", ["-xOzf", tarball], {
    encoding: "buffer",
    maxBuffer: 256 * 1024 * 1024,
  });
  return {
    tarball,
    sha256: await sha256File(tarball),
    packedBytes: (await stat(tarball)).size,
    unpackedBytes: unpacked.length,
    fileCount: entries.filter((entry) => !entry.endsWith("/")).length,
    entries,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)
) {
  const directory = process.argv[2];
  if (!directory)
    throw new Error("Usage: verify-pack-directory.mjs <directory>");
  const result = await verifyPackDirectory({ directory });
  console.log(JSON.stringify(result, null, 2));
}
