import { constants } from "node:fs";
import { access, lstat, readFile, realpath, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const expectedExports = {
  ".": {
    types: "./dist/index.d.ts",
    import: "./dist/index.js",
  },
  "./outline": {
    types: "./dist/outline/index.d.ts",
    import: "./dist/outline/index.js",
  },
  "./solid": {
    types: "./dist/solid/index.d.ts",
    import: "./dist/solid/index.js",
  },
  "./registry": {
    types: "./dist/registry.d.ts",
    import: "./dist/registry.js",
  },
};
const requiredFiles = [
  ...Object.values(expectedExports).flatMap(({ import: js, types }) => [
    js,
    types,
  ]),
  "./README.md",
  "./LICENSE",
];
const failures = [];
const require = createRequire(import.meta.url);

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(packageRoot, relativePath);
  try {
    await access(absolutePath, constants.R_OK);
    const stat = await lstat(absolutePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      failures.push(`${relativePath} must be a regular file`);
    } else if (stat.size === 0) {
      failures.push(`${relativePath} must not be empty`);
    }
    const resolved = await realpath(absolutePath);
    if (!resolved.startsWith(`${packageRoot}${path.sep}`)) {
      failures.push(`${relativePath} resolves outside the package`);
    }
  } catch {
    failures.push(`${relativePath} is missing or unreadable`);
  }
}

const manifest = JSON.parse(
  await readFile(path.join(packageRoot, "package.json"), "utf8"),
);
if (
  manifest.name !== "@yakit-libs/yakit-ui-icons" ||
  manifest.private === true
) {
  failures.push(
    "package must be the public @yakit-libs/yakit-ui-icons package",
  );
}
if (manifest.license !== "MIT") failures.push("license must be MIT");
if (manifest.publishConfig?.access !== "public") {
  failures.push("publishConfig.access must be public");
}
if (manifest.publishConfig?.registry !== "https://registry.npmjs.org/") {
  failures.push("publishConfig.registry must be https://registry.npmjs.org/");
}
if (manifest.sideEffects !== false) failures.push("sideEffects must be false");
if (JSON.stringify(manifest.exports) !== JSON.stringify(expectedExports)) {
  failures.push("exports must match the supported icon entry contract");
}
if (
  manifest.main !== expectedExports["."].import ||
  manifest.module !== expectedExports["."].import ||
  manifest.types !== expectedExports["."].types
) {
  failures.push("main, module, and types must resolve to the root export");
}
if (
  JSON.stringify(manifest.peerDependencies) !==
  JSON.stringify({ react: "^18.2.0" })
) {
  failures.push("react ^18.2.0 must be the only peer dependency");
}
if (
  JSON.stringify(manifest.dependencies) !==
  JSON.stringify({ "@yakit-libs/color": "1.4.1" })
) {
  failures.push("@yakit-libs/color 1.4.1 must be the only runtime dependency");
}
if (manifest.peerDependenciesMeta) {
  failures.push("optional peers are forbidden");
}
try {
  const colorEntry = require.resolve("@yakit-libs/color");
  const colorManifest = JSON.parse(
    await readFile(path.resolve(path.dirname(colorEntry), "../package.json"), "utf8"),
  );
  const color = require("@yakit-libs/color");
  const light = color.generateColors("light");
  const dark = color.generateColors("dark");
  if (
    colorManifest.version !== "1.4.1" ||
    !colorManifest.exports?.["./preview"] ||
    !colorManifest.exports?.["./css"] ||
    light["--Colors-Use-Neutral-Text-1-Title"] !==
      "var(--yakit-colors-Neutral-100)" ||
    light["--yakit-colors-Neutral-100"] !== "#353639" ||
    dark["--Colors-Use-Neutral-Text-1-Title"] !==
      "var(--yakit-colors-Neutral-80)" ||
    dark["--yakit-colors-Neutral-80"] !== "#c8d0dd"
  ) {
    failures.push("@yakit-libs/color 1.4.1 token contract is invalid");
  }
} catch {
  failures.push("@yakit-libs/color 1.4.1 runtime is missing or unreadable");
}
for (const includedPath of ["dist", "README.md", "LICENSE"]) {
  if (!manifest.files?.includes(includedPath)) {
    failures.push(`files must include ${includedPath}`);
  }
}

async function distFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await distFiles(absolutePath)));
    else if (entry.isFile() && /\.(?:d\.ts|js)$/.test(entry.name))
      files.push(absolutePath);
  }
  return files;
}

const allowedExternal = new Set(["react", "react/jsx-runtime"]);
const specifierPattern =
  /(?:\bfrom\s*|\bimport\s*\(|\bimport\s*)['"]([^'"]+)['"]/g;
try {
  for (const file of await distFiles(path.join(packageRoot, "dist"))) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(specifierPattern)) {
      const specifier = match[1];
      if (!specifier.startsWith(".") && !allowedExternal.has(specifier)) {
        failures.push(
          `${path.relative(packageRoot, file)} imports forbidden runtime ${specifier}`,
        );
      }
    }
  }
} catch {
  failures.push("dist is missing or unreadable");
}

if (failures.length > 0) {
  console.error("yakit-ui-icons package outputs are not ready:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    'Run "pnpm --filter @yakit-libs/yakit-ui-icons build" before packing.',
  );
  process.exitCode = 1;
} else {
  console.log("yakit-ui-icons package outputs verified.");
}
