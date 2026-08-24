#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export async function sha256File(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

export async function createVerificationManifest(options) {
  const tarballPath = path.resolve(options.tarballPath);
  const tarballStat = await stat(tarballPath);
  const required = [
    "repository",
    "workflowCommitSha",
    "runId",
    "runAttempt",
    "sourceRef",
    "packageName",
    "packageVersion",
    "distTag",
    "packArtifactId",
    "packArtifactDigest",
  ];
  for (const field of required) {
    if (options[field] === undefined || options[field] === "")
      throw new Error(`Missing verification field: ${field}`);
  }
  return {
    schemaVersion: 1,
    repository: options.repository,
    workflowCommitSha: options.workflowCommitSha,
    runId: String(options.runId),
    runAttempt: String(options.runAttempt),
    sourceRef: options.sourceRef,
    package: {
      name: options.packageName,
      version: options.packageVersion,
      distTag: options.distTag,
    },
    packArtifact: {
      id: String(options.packArtifactId),
      digest: options.packArtifactDigest,
    },
    tarball: {
      filename: path.basename(tarballPath),
      sha256: await sha256File(tarballPath),
      packedBytes: tarballStat.size,
      unpackedBytes: Number(options.unpackedBytes ?? 0),
      fileCount: Number(options.fileCount ?? 0),
    },
    gates: options.gates ?? {},
  };
}

export async function validateVerificationManifest(manifest, options = {}) {
  const failures = [];
  if (manifest?.schemaVersion !== 1)
    failures.push("schemaVersion must equal 1");
  for (const field of [
    "repository",
    "workflowCommitSha",
    "runId",
    "runAttempt",
    "sourceRef",
  ]) {
    if (!manifest?.[field]) failures.push(`${field} is required`);
  }
  for (const field of ["name", "version", "distTag"]) {
    if (!manifest?.package?.[field])
      failures.push(`package.${field} is required`);
  }
  if (!/^[0-9a-f]{40}$/i.test(manifest?.workflowCommitSha ?? "")) {
    failures.push("workflowCommitSha must be a 40-character Git commit SHA");
  }
  if (!manifest?.packArtifact?.id) failures.push("packArtifact.id is required");
  if (!/^sha256:[0-9a-f]{64}$/i.test(manifest?.packArtifact?.digest ?? "")) {
    failures.push("packArtifact.digest must use sha256:<64 hex>");
  }
  if (!/^[0-9a-f]{64}$/i.test(manifest?.tarball?.sha256 ?? ""))
    failures.push("tarball.sha256 must be 64 hex characters");

  for (const field of ["packedBytes", "unpackedBytes", "fileCount"]) {
    const value = manifest?.tarball?.[field];
    if (!Number.isSafeInteger(value) || value < 0)
      failures.push(`tarball.${field} must be a non-negative safe integer`);
  }

  const gates = manifest?.gates;
  if (
    !gates ||
    typeof gates !== "object" ||
    Array.isArray(gates) ||
    Object.keys(gates).length === 0
  ) {
    failures.push("gates must be a non-empty object");
  } else {
    for (const [gate, result] of Object.entries(gates)) {
      if (result !== "passed") failures.push(`gates.${gate} must equal passed`);
    }
  }

  const expectedFields = {
    repository: manifest?.repository,
    workflowCommitSha: manifest?.workflowCommitSha,
    runId: manifest?.runId,
    sourceRef: manifest?.sourceRef,
    packageName: manifest?.package?.name,
    packageVersion: manifest?.package?.version,
    distTag: manifest?.package?.distTag,
    packArtifactId: manifest?.packArtifact?.id,
  };
  for (const [name, actual] of Object.entries(expectedFields)) {
    if (
      options[name] !== undefined &&
      String(options[name]) !== String(actual)
    ) {
      failures.push(
        `${name} mismatch: expected ${options[name]}, got ${actual}`,
      );
    }
  }

  if (options.tarballPath) {
    const actualHash = await sha256File(options.tarballPath);
    const actualSize = (await stat(options.tarballPath)).size;
    if (actualHash !== manifest?.tarball?.sha256)
      failures.push("tarball SHA-256 does not match verification manifest");
    if (actualSize !== manifest?.tarball?.packedBytes)
      failures.push("tarball packedBytes does not match verification manifest");
    if (path.basename(options.tarballPath) !== manifest?.tarball?.filename)
      failures.push("tarball filename does not match verification manifest");
  }

  if (failures.length)
    throw new Error(
      `Verification manifest failed:\n- ${failures.join("\n- ")}`,
    );
  return manifest;
}

function flags(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) continue;
    result[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  return result;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)
) {
  const command = process.argv[2];
  const args = flags(process.argv.slice(3));
  if (command === "create") {
    const manifest = await createVerificationManifest({
      tarballPath: args.tarball,
      repository: args.repository,
      workflowCommitSha: args.commit,
      runId: args["run-id"],
      runAttempt: args["run-attempt"],
      sourceRef: args.ref,
      packageName: args.package,
      packageVersion: args.version,
      distTag: args["dist-tag"],
      packArtifactId: args["artifact-id"],
      packArtifactDigest: args["artifact-digest"],
      unpackedBytes: args["unpacked-bytes"],
      fileCount: args["file-count"],
      gates: {
        package: "passed",
        consumer: "passed",
        storybook: "passed",
        policy: "passed",
      },
    });
    if (!args.output) throw new Error("create requires --output");
    await writeFile(args.output, `${JSON.stringify(manifest, null, 2)}\n`, {
      flag: "wx",
    });
    console.log(JSON.stringify(manifest, null, 2));
  } else if (command === "verify") {
    if (!args.manifest || !args.tarball)
      throw new Error("verify requires --manifest and --tarball");
    const manifest = JSON.parse(await readFile(args.manifest, "utf8"));
    await validateVerificationManifest(manifest, {
      tarballPath: args.tarball,
      repository: args.repository,
      workflowCommitSha: args.commit,
      runId: args["run-id"],
      sourceRef: args.ref,
      packageName: args.package,
      packageVersion: args.version,
      distTag: args["dist-tag"],
      packArtifactId: args["artifact-id"],
    });
    console.log("Verification manifest is valid");
  } else {
    throw new Error("Usage: verification-manifest.mjs <create|verify> [flags]");
  }
}
