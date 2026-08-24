import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import { assertCredentialFree } from "./helpers/release-contracts.mjs";

const root = resolve(import.meta.dirname, "../..");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

const manifests = ["apps", "packages"].flatMap((directory) => {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute)
    .map((name) => join(absolute, name, "package.json"))
    .filter(existsSync);
});

test("only Yakit UI runtime packages are publishable workspace manifests", () => {
  const publishable = manifests
    .filter((file) => readJson(file).private !== true)
    .map((file) => readJson(file).name);
  assert.deepEqual(publishable.sort(), ["yakit-ui", "yakit-ui-icons"]);
});

test("the root lockfile is the only workspace pnpm lockfile", () => {
  const found = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === ".omx"
      )
        continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.name === "pnpm-lock.yaml")
        found.push(relative(root, path));
    }
  };
  visit(root);
  assert.deepEqual(found.sort(), ["pnpm-lock.yaml"]);
});

test("package allowlist publishes library, Storybook, and package documentation only", () => {
  const manifest = readJson(join(root, "packages/yakit-ui/package.json"));
  assert.ok(manifest.files.includes("dist"));
  assert.ok(manifest.files.includes("storybook-static"));
  assert.ok(manifest.files.includes("LICENSE"));
  assert.ok(
    manifest.files.every((entry) =>
      /^(?:dist|storybook-static|README(?:\.md)?|LICENSE(?:\..*)?)$/.test(
        entry,
      ),
    ),
  );
});

test("repository and published packages use the same MIT license", () => {
  const rootManifest = readJson(join(root, "package.json"));
  const packageManifest = readJson(
    join(root, "packages/yakit-ui/package.json"),
  );
  const repositoryLicense = readFileSync(join(root, "LICENSE"), "utf8");
  const packageLicense = readFileSync(
    join(root, "packages/yakit-ui/LICENSE"),
    "utf8",
  );
  const iconsManifest = readJson(
    join(root, "packages/yakit-ui-icons/package.json"),
  );
  const iconsLicense = readFileSync(
    join(root, "packages/yakit-ui-icons/LICENSE"),
    "utf8",
  );

  assert.equal(rootManifest.license, "MIT");
  assert.equal(packageManifest.license, "MIT");
  assert.equal(iconsManifest.license, "MIT");
  assert.equal(packageLicense, repositoryLicense);
  assert.equal(iconsLicense, repositoryLicense);
  assert.match(repositoryLicense, /^MIT License\n/);
  assert.match(repositoryLicense, /Copyright \(c\) 2026 yaklang\.io Project/);
});

test("package release state is valid before and after the initial Version Packages PR", () => {
  const manifest = readJson(join(root, "packages/yakit-ui/package.json"));
  const initialChangeset = join(root, ".changeset/quiet-maps-release.md");

  if (existsSync(initialChangeset)) {
    assert.equal(manifest.version, "0.0.0");
    assert.match(
      readFileSync(initialChangeset, "utf8"),
      /^---\n"yakit-ui": minor\n---/,
    );
  } else {
    assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
    assert.notEqual(manifest.version, "0.0.0");
  }
});

test("Changesets generates changelog entries for the Version Packages action", () => {
  const config = readJson(join(root, ".changeset/config.json"));
  assert.equal(config.changelog, "@changesets/cli/changelog");
  assert.deepEqual(config.fixed, [["yakit-ui", "yakit-ui-icons"]]);
});

test("React-only icon package has a narrow public and peer contract", () => {
  const manifest = readJson(join(root, "packages/yakit-ui-icons/package.json"));
  assert.deepEqual(Object.keys(manifest.exports).sort(), [
    ".",
    "./outline",
    "./registry",
    "./solid",
  ]);
  assert.deepEqual(manifest.peerDependencies, { react: "^18.2.0" });
  assert.equal(manifest.dependencies, undefined);
  assert.equal(manifest.peerDependenciesMeta, undefined);
  assert.deepEqual(manifest.files, ["dist", "README.md", "LICENSE"]);
});

test("package exports the ESM library, declarations, and CSS contract", () => {
  const manifest = readJson(join(root, "packages/yakit-ui/package.json"));
  assert.equal(manifest.exports["."].import, "./dist/index.js");
  assert.equal(manifest.exports["."].types, "./dist/index.d.ts");
  assert.equal(manifest.exports["./style.css"], "./dist/index.css");
  assert.deepEqual(manifest.sideEffects, ["**/*.css"]);
});

test("package declares the offline Storybook launcher bin", () => {
  const manifest = readJson(join(root, "packages/yakit-ui/package.json"));
  assert.equal(
    manifest.bin["yakit-ui-storybook"],
    "./dist/bin/yakit-ui-storybook.mjs",
  );
});

test("shared UI runtimes are peers while package-owned runtimes are dependencies", () => {
  const manifest = readJson(join(root, "packages/yakit-ui/package.json"));
  for (const name of ["react", "react-dom", "antd", "@ant-design/cssinjs"]) {
    assert.ok(
      manifest.peerDependencies?.[name],
      `${name} must be a peer dependency`,
    );
    assert.ok(
      manifest.devDependencies?.[name],
      `${name} must remain available for development`,
    );
    assert.equal(
      manifest.dependencies?.[name],
      undefined,
      `${name} must not be a direct runtime dependency`,
    );
  }
  assert.equal(manifest.peerDependencies?.["@emotion/react"], undefined);
  assert.equal(manifest.devDependencies?.["@emotion/react"], undefined);
  for (const name of ["@yakit-libs/color", "classnames"]) {
    assert.ok(
      manifest.dependencies?.[name],
      `${name} must be a direct dependency`,
    );
  }
  assert.equal(manifest.devDependencies?.["@emotion/styled"], undefined);
});

test("public package prepack scripts verify outputs without rebuilding them", () => {
  for (const name of ["yakit-ui", "yakit-ui-icons"]) {
    const manifest = readJson(join(root, `packages/${name}/package.json`));
    assert.ok(
      manifest.scripts?.prepack,
      `${name} prepack script must be declared`,
    );
    assert.doesNotMatch(
      manifest.scripts.prepack,
      /(?:build|storybook|vite|tsc)/i,
      `${name} prepack must not rebuild verified artifacts`,
    );
  }
});

test("repository dry-run installs and verifies a disposable exact tarball", () => {
  const manifest = readJson(join(root, "package.json"));
  assert.equal(
    manifest.scripts?.["release:consumer:dry-run"],
    "node scripts/release/tarball-consumer-dry-run.mjs",
  );
  assert.match(
    manifest.scripts?.["release:dry-run"] ?? "",
    /release:consumer:dry-run/,
  );
});

test("component CI generates SSR fixtures before browser hydration tests", () => {
  const manifest = readJson(join(root, "packages/yakit-ui/package.json"));
  assert.match(
    manifest.scripts?.["test:ssr-fixtures"] ?? "",
    /test\/icons\/icon-ssr-fixture\.test\.ts/,
  );
  assert.match(
    manifest.scripts?.["test:ssr-fixtures"] ?? "",
    /test\/icons\/solid-icon-ssr-fixture\.test\.ts/,
  );
  assert.match(
    manifest.scripts?.["test:ci"] ?? "",
    /^pnpm run test:ssr-fixtures && vitest run /,
  );
});

test("release-owned text files contain no credential-like values", () => {
  const roots = [
    ".changeset",
    ".github/workflows",
    ".release",
    "scripts/release",
    "packages/yakit-ui/scripts/release",
    "packages/yakit-ui-icons",
  ];
  const files = [];
  const visit = (path) => {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (
        entry.isSymbolicLink() ||
        entry.name === "dist" ||
        entry.name === "node_modules"
      )
        continue;
      if (entry.isDirectory()) visit(child);
      else files.push(child);
    }
  };
  for (const directory of roots) visit(join(root, directory));
  for (const file of files) {
    assertCredentialFree(relative(root, file), readFileSync(file, "utf8"));
  }
});
