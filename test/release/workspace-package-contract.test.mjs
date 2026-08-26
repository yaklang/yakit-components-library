import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import {
  findRemovedUiRuntimeReferences,
  REMOVED_UI_RUNTIMES,
  REMOVED_UI_RUNTIME_SCAN_POLICY,
} from "../../scripts/release/removed-ui-runtime-scan.mjs";
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
  assert.deepEqual(publishable.sort(), [
    "@yakit-libs/yakit-ui",
    "@yakit-libs/yakit-ui-icons",
  ]);
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
      /^---\n"@yakit-libs\/yakit-ui": minor\n---/,
    );
  } else {
    assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
    assert.notEqual(manifest.version, "0.0.0");
  }
});

test("Changesets generates changelog entries for the Version Packages action", () => {
  const config = readJson(join(root, ".changeset/config.json"));
  assert.equal(config.changelog, "@changesets/cli/changelog");
  assert.deepEqual(config.fixed, [
    ["@yakit-libs/yakit-ui", "@yakit-libs/yakit-ui-icons"],
  ]);
});

test("public packages remain discoverable in the Yakit libraries keyword search", () => {
  for (const directory of ["yakit-ui", "yakit-ui-icons"]) {
    const manifest = readJson(join(root, `packages/${directory}/package.json`));
    assert.ok(manifest.keywords.includes("@yakit-libs"));
    assert.ok(manifest.keywords.includes(manifest.name));
  }
});

test("icon package has a narrow public, color, and React contract", () => {
  const manifest = readJson(join(root, "packages/yakit-ui-icons/package.json"));
  assert.equal(manifest.name, "@yakit-libs/yakit-ui-icons");
  assert.equal(manifest.private, false);
  assert.deepEqual(manifest.publishConfig, {
    access: "public",
    registry: "https://registry.npmjs.org/",
  });
  assert.deepEqual(Object.keys(manifest.exports).sort(), [
    ".",
    "./colorful",
    "./icon.css",
    "./outline",
    "./registry",
    "./solid",
  ]);
  assert.deepEqual(manifest.peerDependencies, { react: "^18.2.0" });
  assert.deepEqual(manifest.dependencies, {
    "@yakit-libs/color": "1.4.1",
  });
  assert.equal(manifest.peerDependenciesMeta, undefined);
  assert.deepEqual(manifest.files, ["dist", "README.md", "LICENSE"]);
});

test("package exports the ESM library, declarations, and CSS contract", () => {
  const manifest = readJson(join(root, "packages/yakit-ui/package.json"));
  assert.equal(manifest.name, "@yakit-libs/yakit-ui");
  assert.equal(manifest.private, false);
  assert.deepEqual(manifest.publishConfig, {
    access: "public",
    registry: "https://registry.npmjs.org/",
  });
  assert.equal(manifest.exports["."].import, "./dist/index.js");
  assert.equal(manifest.exports["."].types, "./dist/index.d.ts");
  assert.deepEqual(manifest.exports["./icons/colorful"], {
    types: "./dist/icons/colorful/index.d.ts",
    browser: "./dist/browser/icons/colorful/index.js",
    import: "./dist/icons/colorful/index.js",
  });
  assert.equal(manifest.exports["./icons/icon.css"], "./dist/icon.css");
  assert.equal(manifest.exports["./style.css"], "./dist/index.css");
  assert.deepEqual(manifest.sideEffects, ["**/*.css", "dist/browser/**/*.js"]);
});

test("package declares the offline Storybook launcher bin", () => {
  const manifest = readJson(join(root, "packages/yakit-ui/package.json"));
  assert.equal(
    manifest.bin["yakit-ui-storybook"],
    "./dist/bin/yakit-ui-storybook.mjs",
  );
});

test("React runtimes are peers, removed UI runtimes are absent, and package-owned runtimes are dependencies", () => {
  const manifest = readJson(join(root, "packages/yakit-ui/package.json"));
  for (const name of ["react", "react-dom"]) {
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
  for (const dependencyType of [
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
    "devDependencies",
  ]) {
    for (const name of REMOVED_UI_RUNTIMES) {
      assert.equal(
        manifest[dependencyType]?.[name],
        undefined,
        `${name} must not be declared in ${dependencyType}`,
      );
    }
  }
  assert.equal(manifest.peerDependencies?.["@emotion/react"], undefined);
  assert.equal(manifest.devDependencies?.["@emotion/react"], undefined);
  for (const name of ["@yakit-libs/color", "classnames"]) {
    assert.ok(
      manifest.dependencies?.[name],
      `${name} must be a direct dependency`,
    );
  }
  assert.equal(manifest.dependencies?.["@yakit-libs/color"], "1.4.1");
  assert.equal(manifest.devDependencies?.["@emotion/styled"], undefined);
});

test("yakit-ui generates its published theme CSS with color 1.4.1", () => {
  const manifest = readJson(join(root, "packages/yakit-ui/package.json"));
  const publicEntry = readFileSync(
    join(root, "packages/yakit-ui/src/index.ts"),
    "utf8",
  );
  const baseStyles = readFileSync(
    join(root, "packages/yakit-ui/src/styles/index.css"),
    "utf8",
  );

  assert.equal(
    manifest.scripts?.["generate:color-css"],
    "yakit-color-css --theme Main --out src/styles/color.css",
  );
  assert.match(
    manifest.scripts?.["build:lib"] ?? "",
    /^pnpm run generate:color-css && /,
  );
  assert.match(publicEntry, /import '\.\/styles\/index\.css';/);
  assert.match(baseStyles, /@import '\.\/color\.css';/);
  assert.doesNotMatch(baseStyles, /@yakit-libs\/color\/dist\/index\.css/);
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

test("icon consumers install color directly and verify pnpm's strict layout", () => {
  const readme = readFileSync(
    join(root, "packages/yakit-ui-icons/README.md"),
    "utf8",
  );
  const consumerVerifier = readFileSync(
    join(root, "scripts/release/verify-tarball-consumer.mjs"),
    "utf8",
  );

  assert.match(
    readme,
    /pnpm add @yakit-libs\/yakit-ui-icons @yakit-libs\/color@1\.4\.1 react/,
  );
  assert.match(readme, /@yakit-libs\/color\/preview/);
  assert.doesNotMatch(readme, /@yakit-libs\/color\/dist\/index\.css/);
  assert.match(consumerVerifier, /node-linker=isolated/);
  assert.match(consumerVerifier, /@yakit-libs\/color@1\.4\.1/);
  assert.match(consumerVerifier, /@yakit-libs\/color\/preview/);
  assert.doesNotMatch(consumerVerifier, /@yakit-libs\/color\/dist\/index\.css/);
  assert.match(consumerVerifier, /pnpmStrictLayout: "passed"/);
});

test("component consumers install only the package's current runtime contract", () => {
  const readme = readFileSync(
    join(root, "packages/yakit-ui/README.md"),
    "utf8",
  );
  const consumerVerifiers = [
    readFileSync(
      join(root, "scripts/release/verify-tarball-consumer.mjs"),
      "utf8",
    ),
    readFileSync(join(root, "scripts/release/post-publish-smoke.mjs"), "utf8"),
  ];
  const removedInstallArguments = ["ant" + "d@", "@ant-design/" + "cssinjs@"];

  assert.match(readme, /pnpm add @yakit-libs\/yakit-ui react react-dom/);
  for (const removed of removedInstallArguments) {
    assert.equal(readme.includes(removed), false);
    for (const verifier of consumerVerifiers) {
      assert.equal(
        verifier.includes(`"${removed}`),
        false,
        `${removed} must not be an npm install argument`,
      );
    }
  }
  for (const verifier of consumerVerifiers) {
    assert.match(verifier, /skipLibCheck: false/);
    assert.doesNotMatch(verifier, /skipLibCheck: true/);
  }
  assert.match(consumerVerifiers[0], /react-dom\/server/);
  assert.match(consumerVerifiers[0], /ssr: "passed"/);
});

test("published-output scanner rejects removed runtime imports and resolutions", () => {
  const firstRuntime = "ant" + "d";
  const secondRuntime = "@ant-design/" + "cssinjs";

  assert.deepEqual(
    findRemovedUiRuntimeReferences(
      `import value from "${firstRuntime}/es/input";`,
    ),
    [firstRuntime],
  );
  assert.deepEqual(
    findRemovedUiRuntimeReferences(
      `resolved /node_modules/${secondRuntime}/dist/index.js`,
    ),
    [secondRuntime],
  );
  assert.deepEqual(
    findRemovedUiRuntimeReferences("const standard = true;"),
    [],
  );
  assert.equal(REMOVED_UI_RUNTIME_SCAN_POLICY, "zero-token");
  assert.deepEqual(
    findRemovedUiRuntimeReferences(`migration note mentions ${firstRuntime}`),
    [firstRuntime],
    "the published-output policy intentionally rejects removed runtime tokens in plain text",
  );
  assert.deepEqual(
    findRemovedUiRuntimeReferences("const commandPalette = true;"),
    [],
    "runtime names embedded inside unrelated words are not tokens",
  );
  for (const punctuation of [".", ",", ")", "]", ":"]) {
    assert.deepEqual(
      findRemovedUiRuntimeReferences(`(${firstRuntime}${punctuation}`),
      [firstRuntime],
      `the zero-token policy recognizes runtime names next to ${punctuation}`,
    );
  }
});

test("package verification hard-gates every final zero-dependency surface", () => {
  const verifier = readFileSync(
    join(root, "packages/yakit-ui/scripts/release/verify-package.mjs"),
    "utf8",
  );
  for (const surface of [
    "'.storybook'",
    "'config'",
    "'dist'",
    "'src'",
    "'storybook-static'",
    "'pnpm-lock.yaml'",
    "'vite.config.ts'",
    "'vitest.config.ts'",
    "'vitest.node.config.ts'",
  ]) {
    assert.ok(
      verifier.includes(surface),
      `package verifier must scan ${surface}`,
    );
  }
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
    manifest.scripts?.["test:ssr-fixtures"] ?? "",
    /test\/ssr\/native-components-ssr\.test\.tsx/,
  );
  assert.match(
    manifest.scripts?.["test:ci"] ?? "",
    /^pnpm run test:ssr-fixtures && vitest run /,
  );
});

test("pre-build types use source fixtures while built package contracts verify public subpaths", () => {
  const manifest = readJson(join(root, "packages/yakit-ui/package.json"));
  const sourceTypes = readJson(
    join(root, "packages/yakit-ui/test/types/tsconfig.json"),
  );
  const publicTypes = readJson(
    join(root, "packages/yakit-ui/test/types/tsconfig.public.json"),
  );
  const libraryTypes = readJson(
    join(root, "packages/yakit-ui/tsconfig.lib.json"),
  );

  assert.doesNotMatch(manifest.scripts["test:types"], /build/i);
  assert.match(manifest.scripts["build:lib"], /fix-declaration-imports\.mjs/);
  assert.equal(libraryTypes.compilerOptions.declarationMap, false);
  assert.deepEqual(sourceTypes.include, [
    "../../src/vite-env.d.ts",
    "colorful-icon-public.test.tsx",
    "icon-ant-compat-public.test.tsx",
    "icon-public.test.tsx",
    "input-public.test.tsx",
    "solid-icon-public.test.tsx",
  ]);
  assert.deepEqual(publicTypes.include, [
    "../../src/vite-env.d.ts",
    "colorful-icon-public.test.tsx",
    "light-icon-public.test.tsx",
  ]);
  assert.match(
    manifest.scripts["test:icon-package-contract"],
    /tsconfig\.public\.json/,
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
