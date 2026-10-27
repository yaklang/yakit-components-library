import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  ICON_PACKAGE_LIMITS,
  OLDICON_ENTRY_LIMITS,
  OLDICON_EXPORT_COUNT,
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

const createIconsTarball = (
  directory,
  {
    excessFiles = false,
    legacyPeer = false,
    omitOldicon = false,
    oversized = false,
    oversizedOldicon = false,
    version = "1.2.3",
  } = {},
) => {
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
    "dist/oldicon/index.js",
    "dist/oldicon/index.d.ts",
    "dist/solid/index.js",
    "dist/solid/index.d.ts",
    "dist/registry.js",
    "dist/registry.d.ts",
  ].filter((entry) => !omitOldicon || !entry.startsWith("dist/oldicon/"));
  for (const entry of entries) {
    const file = join(packageRoot, entry);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, entry);
  }
  const oldiconNames = [
    "PopoverArrowIcon",
    ...Array.from(
      { length: OLDICON_EXPORT_COUNT - 1 },
      (_, index) => `TestOldIcon${String(index).padStart(3, "0")}`,
    ),
  ].sort();
  if (!omitOldicon) {
    for (const exportName of oldiconNames) {
      for (const entry of [
        `dist/oldicon/icons/${exportName}.js`,
        `dist/oldicon/icons/${exportName}.d.ts`,
        `dist/browser/oldicon/icons/${exportName}.js`,
      ]) {
        const file = join(packageRoot, entry);
        mkdirSync(join(file, ".."), { recursive: true });
        writeFileSync(file, `export const ${exportName} = {};\n`);
      }
    }
  }
  if (oversizedOldicon) {
    writeFileSync(
      join(packageRoot, "dist/oldicon/index.js"),
      randomBytes(OLDICON_ENTRY_LIMITS.runtimeBytes + 1),
    );
  }
  if (oversized)
    writeFileSync(
      join(packageRoot, "dist/payload.bin"),
      randomBytes(ICON_PACKAGE_LIMITS.packedBytes + 1),
    );
  if (excessFiles) {
    const currentFileCount = entries.length + oldiconNames.length * 3 + 1;
    const excessFileCount =
      ICON_PACKAGE_LIMITS.fileCount - currentFileCount + 1;
    for (let index = 0; index < excessFileCount; index += 1) {
      writeFileSync(
        join(packageRoot, `dist/extra-${index}.js`),
        "export {};\n",
      );
    }
  }
  writeFileSync(
    join(packageRoot, "package.json"),
    JSON.stringify({
      name: "@yakit-libs/yakit-ui-icons",
      version,
      dependencies: { "@yakit-libs/color": "1.4.1" },
      peerDependencies: {
        react: legacyPeer ? "^18.2.0" : "^18.2.0 || ^19.0.0",
      },
      exports: {
        "./oldicon/*": {
          types: "./dist/oldicon/icons/*.d.ts",
          browser: "./dist/browser/oldicon/icons/*.js",
          import: "./dist/oldicon/icons/*.js",
        },
      },
    }),
  );
  const tarball = join(directory, `yakit-libs-yakit-ui-icons-${version}.tgz`);
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

test("pack verifier accepts a deterministic two-package releaseSet with different versions", async () => {
  const { directory } = createTarball();
  createIconsTarball(directory, { version: "2.0.0" });
  const result = await verifyPackDirectory({ directory });
  assert.deepEqual(result.packages.map((item) => item.package).sort(), [
    "@yakit-libs/yakit-ui",
    "@yakit-libs/yakit-ui-icons",
  ]);
});

test("pack verifier accepts an icons-only releaseSet", async () => {
  const directory = mkdtempSync(join(tmpdir(), "yakit-icons-only-"));
  createIconsTarball(directory);
  const result = await verifyPackDirectory({ directory });
  assert.deepEqual(
    result.packages.map((item) => item.package),
    ["@yakit-libs/yakit-ui-icons"],
  );
});

test("pack verifier rejects icons that no longer peer on React 19", async () => {
  const directory = mkdtempSync(join(tmpdir(), "yakit-icons-legacy-peer-"));
  createIconsTarball(directory, { legacyPeer: true });
  await assert.rejects(
    () => verifyPackDirectory({ directory }),
    /must peer only on react \^18\.2\.0 \|\| \^19\.0\.0/,
  );
});

test("pack verifier rejects an empty releaseSet", async () => {
  const directory = mkdtempSync(join(tmpdir(), "yakit-empty-release-"));
  await assert.rejects(
    () => verifyPackDirectory({ directory }),
    /releaseSet must be a non-empty array/,
  );
});

test("pack verifier enforces the independent icons package size budget", async () => {
  const { directory } = createTarball();
  createIconsTarball(directory, { oversized: true });
  await assert.rejects(
    () => verifyPackDirectory({ directory }),
    new RegExp(
      `@yakit-libs/yakit-ui-icons packedBytes exceeds ${ICON_PACKAGE_LIMITS.packedBytes}`,
    ),
  );
});

test("pack verifier enforces the oldicon compatibility entry budget", async () => {
  const { directory } = createTarball();
  createIconsTarball(directory, { oversizedOldicon: true });
  await assert.rejects(
    () => verifyPackDirectory({ directory }),
    new RegExp(
      `package/dist/oldicon/index.js exceeds ${OLDICON_ENTRY_LIMITS.runtimeBytes}`,
    ),
  );
});

test("pack verifier requires the oldicon runtime and declaration entries", async () => {
  const { directory } = createTarball();
  createIconsTarball(directory, { omitOldicon: true });
  await assert.rejects(
    () => verifyPackDirectory({ directory }),
    /missing package\/dist\/oldicon\/index\.js/,
  );
});

test("pack verifier enforces the independent icons package file budget", async () => {
  const { directory } = createTarball();
  createIconsTarball(directory, { excessFiles: true });
  await assert.rejects(
    () => verifyPackDirectory({ directory }),
    new RegExp(
      `@yakit-libs/yakit-ui-icons fileCount exceeds ${ICON_PACKAGE_LIMITS.fileCount}`,
    ),
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
