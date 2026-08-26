import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyPackDirectory } from "../../scripts/release/verify-pack-directory.mjs";

const createTarball = (extraEntries = []) => {
  const directory = mkdtempSync(join(tmpdir(), "yakit-pack-"));
  const packageRoot = join(directory, "package");
  for (const entry of [
    "package.json",
    "LICENSE",
    "dist/index.js",
    "dist/index.d.ts",
    "dist/index.css",
    "dist/bin/yakit-ui-storybook.mjs",
    "storybook-static/index.html",
    ...extraEntries,
  ]) {
    const file = join(packageRoot, entry);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(
      file,
      entry === "package.json"
        ? JSON.stringify({ name: "@yakit-libs/yakit-ui", version: "1.2.3" })
        : entry,
    );
  }
  const tarball = join(directory, "yakit-libs-yakit-ui-1.2.3.tgz");
  execFileSync("tar", ["-czf", tarball, "-C", directory, "package"]);
  return { directory, tarball };
};

const createIconsTarball = (directory, { oversized = false } = {}) => {
  const staging = join(directory, "icons-staging");
  const packageRoot = join(staging, "package");
  const entries = [
    "LICENSE",
    "dist/index.js",
    "dist/index.d.ts",
    "dist/colorful/index.js",
    "dist/colorful/index.d.ts",
    "dist/outline/index.js",
    "dist/outline/index.d.ts",
    "dist/solid/index.js",
    "dist/solid/index.d.ts",
    "dist/registry.js",
    "dist/registry.d.ts",
  ];
  for (const entry of entries) {
    const file = join(packageRoot, entry);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, entry);
  }
  if (oversized)
    writeFileSync(join(packageRoot, "dist/payload.bin"), randomBytes(610_000));
  writeFileSync(
    join(packageRoot, "package.json"),
    JSON.stringify({
      name: "@yakit-libs/yakit-ui-icons",
      version: "1.2.3",
      dependencies: { "@yakit-libs/color": "1.4.1" },
      peerDependencies: { react: "^18.2.0" },
    }),
  );
  const tarball = join(directory, "yakit-libs-yakit-ui-icons-1.2.3.tgz");
  execFileSync("tar", ["-czf", tarball, "-C", staging, "package"]);
  return tarball;
};

test("pack verifier accepts the canonical package surface", async () => {
  const { directory, tarball } = createTarball();
  const result = await verifyPackDirectory({
    directory,
    expectedPackages: ["@yakit-libs/yakit-ui"],
  });
  assert.equal(result.packages[0].tarball, tarball);
  assert.match(result.packages[0].sha256, /^[a-f0-9]{64}$/);
});

test("pack verifier accepts exactly both fixed public package tarballs", async () => {
  const { directory } = createTarball();
  createIconsTarball(directory);
  const result = await verifyPackDirectory({ directory });
  assert.deepEqual(result.packages.map((item) => item.package).sort(), [
    "@yakit-libs/yakit-ui",
    "@yakit-libs/yakit-ui-icons",
  ]);
});

test("pack verifier enforces the independent icons package size budget", async () => {
  const { directory } = createTarball();
  createIconsTarball(directory, { oversized: true });
  await assert.rejects(
    () => verifyPackDirectory({ directory }),
    /@yakit-libs\/yakit-ui-icons packedBytes exceeds 600000/,
  );
});

test("pack verifier rejects a credential-bearing path", async () => {
  const { directory } = createTarball([".npmrc"]);
  await assert.rejects(
    () =>
      verifyPackDirectory({
        directory,
        expectedPackages: ["@yakit-libs/yakit-ui"],
      }),
    /forbidden tar entry package\/\.npmrc/,
  );
});

test("pack verifier rejects unexpected top-level package files", async () => {
  const { directory } = createTarball(["internal-notes.md"]);
  await assert.rejects(
    () =>
      verifyPackDirectory({
        directory,
        expectedPackages: ["@yakit-libs/yakit-ui"],
      }),
    /unexpected tar entry package\/internal-notes\.md/,
  );
});

test("pack verifier rejects credential-like content without disclosing the value", async () => {
  const secret = `npm_${"A".repeat(32)}`;
  const { directory } = createTarball();
  const packageRoot = join(directory, "package");
  writeFileSync(
    join(packageRoot, "dist/index.js"),
    `export default ${JSON.stringify(secret)};`,
  );
  const tarball = join(directory, "yakit-libs-yakit-ui-1.2.3.tgz");
  execFileSync("tar", ["-czf", tarball, "-C", directory, "package"]);
  await assert.rejects(
    () =>
      verifyPackDirectory({
        directory,
        expectedPackages: ["@yakit-libs/yakit-ui"],
      }),
    (error) =>
      /credential-like content/.test(error.message) &&
      !error.message.includes(secret),
  );
});

test("pack verifier rejects absolute developer paths in generated files", async () => {
  const { directory } = createTarball();
  const packageRoot = join(directory, "package");
  writeFileSync(
    join(packageRoot, "dist/index.js"),
    "//# sourceMappingURL=/Users/developer/project/index.js.map",
  );
  const tarball = join(directory, "yakit-libs-yakit-ui-1.2.3.tgz");
  execFileSync("tar", ["-czf", tarball, "-C", directory, "package"]);
  await assert.rejects(
    () =>
      verifyPackDirectory({
        directory,
        expectedPackages: ["@yakit-libs/yakit-ui"],
      }),
    /absolute developer path/,
  );
});
