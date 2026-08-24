import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  findSingleTarball,
  verifyPackDirectory,
} from "../../scripts/release/verify-pack-directory.mjs";

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
    writeFileSync(file, entry);
  }
  const tarball = join(directory, "yakit-ui-1.2.3.tgz");
  execFileSync("tar", ["-czf", tarball, "-C", directory, "package"]);
  return { directory, tarball };
};

test("single tarball finder rejects an empty pack directory", async () => {
  const directory = mkdtempSync(join(tmpdir(), "yakit-pack-"));
  await assert.rejects(() => findSingleTarball(directory), /found 0/);
});

test("single tarball finder rejects an ambiguous pack directory", async () => {
  const directory = mkdtempSync(join(tmpdir(), "yakit-pack-"));
  writeFileSync(join(directory, "one.tgz"), "one");
  writeFileSync(join(directory, "two.tgz"), "two");
  await assert.rejects(() => findSingleTarball(directory), /found 2/);
});

test("pack verifier accepts the canonical package surface", async () => {
  const { directory, tarball } = createTarball();
  const result = await verifyPackDirectory({ directory });
  assert.equal(result.tarball, tarball);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
});

test("pack verifier rejects a credential-bearing path", async () => {
  const { directory } = createTarball([".npmrc"]);
  await assert.rejects(
    () => verifyPackDirectory({ directory }),
    /forbidden tar entry package\/\.npmrc/,
  );
});

test("pack verifier rejects unexpected top-level package files", async () => {
  const { directory } = createTarball(["internal-notes.md"]);
  await assert.rejects(
    () => verifyPackDirectory({ directory }),
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
  const tarball = join(directory, "yakit-ui-1.2.3.tgz");
  execFileSync("tar", ["-czf", tarball, "-C", directory, "package"]);
  await assert.rejects(
    () => verifyPackDirectory({ directory }),
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
  const tarball = join(directory, "yakit-ui-1.2.3.tgz");
  execFileSync("tar", ["-czf", tarball, "-C", directory, "package"]);
  await assert.rejects(
    () => verifyPackDirectory({ directory }),
    /absolute developer path/,
  );
});
