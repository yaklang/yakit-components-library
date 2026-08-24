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

export function artifactsForManifest(manifest) {
  if (manifest?.schemaVersion === 2) return manifest.artifacts ?? [];
  if (manifest?.schemaVersion === 1 && manifest?.package && manifest?.tarball) {
    return [
      {
        package: manifest.package.name,
        version: manifest.package.version,
        filename: manifest.tarball.filename,
        sha256: manifest.tarball.sha256,
        packedBytes: manifest.tarball.packedBytes,
        unpackedBytes: manifest.tarball.unpackedBytes,
        fileCount: manifest.tarball.fileCount,
      },
    ];
  }
  return [];
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
  const primaryArtifact = {
    package: options.packageName,
    version: options.packageVersion,
    filename: path.basename(tarballPath),
    sha256: await sha256File(tarballPath),
    packedBytes: tarballStat.size,
    unpackedBytes: Number(options.unpackedBytes ?? 0),
    fileCount: Number(options.fileCount ?? 0),
  };
  const artifacts = options.artifacts ?? [primaryArtifact];
  return {
    schemaVersion: 2,
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
      filename: primaryArtifact.filename,
      sha256: primaryArtifact.sha256,
      packedBytes: primaryArtifact.packedBytes,
      unpackedBytes: primaryArtifact.unpackedBytes,
      fileCount: primaryArtifact.fileCount,
    },
    artifacts,
    gates: options.gates ?? {},
  };
}

export async function validateVerificationManifest(manifest, options = {}) {
  const failures = [];
  if (![1, 2].includes(manifest?.schemaVersion))
    failures.push("schemaVersion must equal 1 or 2");
  if (
    options.requiredSchemaVersion !== undefined &&
    manifest?.schemaVersion !== options.requiredSchemaVersion
  )
    failures.push(
      `schemaVersion must equal ${options.requiredSchemaVersion} for this operation`,
    );
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

  if (manifest?.schemaVersion === 1) {
    if (manifest.artifacts !== undefined)
      failures.push("schemaVersion 1 must use the legacy single tarball shape");
    if (
      options.expectedPackages &&
      JSON.stringify([...options.expectedPackages].sort()) !==
        JSON.stringify([manifest?.package?.name].sort())
    )
      failures.push(
        "schemaVersion 1 evidence can describe only its primary package",
      );
  } else if (
    !Array.isArray(manifest?.artifacts) ||
    manifest.artifacts.length === 0
  ) {
    failures.push("schemaVersion 2 artifacts must be a non-empty array");
  } else {
    const names = new Set();
    for (const artifact of manifest.artifacts) {
      if (!artifact?.package || names.has(artifact.package))
        failures.push("artifacts must contain unique package names");
      names.add(artifact?.package);
      if (!artifact?.version || !artifact?.filename)
        failures.push(
          `artifact ${artifact?.package ?? "<unknown>"} identity is incomplete`,
        );
      if (!/^[0-9a-f]{64}$/i.test(artifact?.sha256 ?? ""))
        failures.push(
          `artifact ${artifact?.package ?? "<unknown>"} SHA-256 is invalid`,
        );
      for (const field of ["packedBytes", "unpackedBytes", "fileCount"])
        if (!Number.isSafeInteger(artifact?.[field]) || artifact[field] < 0)
          failures.push(
            `artifact ${artifact?.package ?? "<unknown>"} ${field} is invalid`,
          );
    }
    const primary = manifest.artifacts.find(
      (artifact) => artifact.package === manifest?.package?.name,
    );
    if (
      !primary ||
      primary.version !== manifest?.package?.version ||
      primary.filename !== manifest?.tarball?.filename ||
      primary.sha256 !== manifest?.tarball?.sha256
    )
      failures.push("primary tarball must match its artifacts entry");
    if (options.expectedPackages) {
      const actual = [...names].sort();
      const expected = [...options.expectedPackages].sort();
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        failures.push(
          `artifact package set mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
        );
    }
  }

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

  if (options.tarballPaths) {
    for (const artifact of artifactsForManifest(manifest)) {
      const artifactPath = options.tarballPaths[artifact.package];
      if (!artifactPath) {
        failures.push(`missing tarball path for ${artifact.package}`);
        continue;
      }
      if ((await sha256File(artifactPath)) !== artifact.sha256)
        failures.push(`${artifact.package} tarball SHA-256 mismatch`);
      if ((await stat(artifactPath)).size !== artifact.packedBytes)
        failures.push(`${artifact.package} packedBytes mismatch`);
      if (path.basename(artifactPath) !== artifact.filename)
        failures.push(`${artifact.package} filename mismatch`);
    }
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
