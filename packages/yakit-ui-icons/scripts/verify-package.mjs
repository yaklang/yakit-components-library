import { constants } from "node:fs";
import { access, lstat, readFile, realpath, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { verifyIconCssGate } from "./verify-css-gate.mjs";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const expectedExports = {
  ".": {
    types: "./dist/index.d.ts",
    browser: "./dist/browser/index.js",
    import: "./dist/index.js",
  },
  "./colorful": {
    types: "./dist/colorful/index.d.ts",
    browser: "./dist/browser/colorful/index.js",
    import: "./dist/colorful/index.js",
  },
  "./outline": {
    types: "./dist/outline/index.d.ts",
    browser: "./dist/browser/outline/index.js",
    import: "./dist/outline/index.js",
  },
  "./oldicon": {
    types: "./dist/oldicon/index.d.ts",
    browser: "./dist/browser/oldicon/index.js",
    import: "./dist/oldicon/index.js",
  },
  "./oldicon/*": {
    types: "./dist/oldicon/icons/*.d.ts",
    browser: "./dist/browser/oldicon/icons/*.js",
    import: "./dist/oldicon/icons/*.js",
  },
  "./solid": {
    types: "./dist/solid/index.d.ts",
    browser: "./dist/browser/solid/index.js",
    import: "./dist/solid/index.js",
  },
  "./registry": {
    types: "./dist/registry.d.ts",
    browser: "./dist/browser/registry.js",
    import: "./dist/registry.js",
  },
  "./icon.css": {
    default: "./dist/icon.css",
  },
};
const requiredFiles = [
  ...Object.entries(expectedExports)
    .filter(([subpath]) => !subpath.includes("*"))
    .flatMap(([, contract]) => Object.values(contract)),
  "./README.md",
  "./LICENSE",
];
const failures = [];
const require = createRequire(import.meta.url);

let oldiconRuntime;
try {
  oldiconRuntime = await import(
    pathToFileURL(path.join(packageRoot, "dist/oldicon/index.js"))
  );
  const [registryRuntime, rootRuntime] = await Promise.all([
    import(pathToFileURL(path.join(packageRoot, "dist/registry.js"))),
    import(pathToFileURL(path.join(packageRoot, "dist/index.js"))),
  ]);
  if (
    Object.keys(oldiconRuntime).length !== 380 ||
    typeof oldiconRuntime.PopoverArrowIcon !== "object"
  ) {
    failures.push("oldicon runtime must expose all 380 compatibility exports");
  }
  if (
    "PopoverArrowIcon" in rootRuntime ||
    registryRuntime.iconRegistry?.some(
      ({ exportName }) => exportName === "PopoverArrowIcon",
    )
  ) {
    failures.push(
      "oldicon exports must stay isolated from the root and registry",
    );
  }
} catch {
  failures.push("oldicon runtime isolation contract is unreadable");
}

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
if (
  JSON.stringify(manifest.sideEffects) !==
  JSON.stringify(["**/*.css", "dist/browser/**/*.js"])
) {
  failures.push(
    "sideEffects must contain only CSS and browser facade patterns",
  );
}
if (JSON.stringify(manifest.exports) !== JSON.stringify(expectedExports)) {
  failures.push("exports must match the supported icon entry contract");
}

const oldiconNames = Object.keys(oldiconRuntime ?? {}).sort();
const oldiconContract = expectedExports["./oldicon/*"];
const oldiconOutputs = [
  ["runtime", oldiconContract.import],
  ["browser", oldiconContract.browser],
  ["declaration", oldiconContract.types],
];
for (const [label, pattern] of oldiconOutputs) {
  const directory = path.join(packageRoot, path.dirname(pattern));
  try {
    const extension = pattern.endsWith(".d.ts") ? ".d.ts" : ".js";
    const actualNames = (await readdir(directory))
      .filter((fileName) => fileName.endsWith(extension))
      .map((fileName) => fileName.slice(0, -extension.length))
      .sort();
    if (JSON.stringify(actualNames) !== JSON.stringify(oldiconNames)) {
      failures.push(
        `oldicon ${label} file set must match all ${oldiconNames.length} exports`,
      );
    }
  } catch {
    failures.push(`oldicon ${label} output directory is missing or unreadable`);
  }
}
if (oldiconNames.includes("TaskWaitIcon")) {
  failures.push("TaskWaitIcon must remain a product-side non-SVG animation");
}
await Promise.all(
  oldiconNames.map(async (exportName) => {
    const runtimePath = path.join(
      packageRoot,
      oldiconContract.import.replace("*", exportName),
    );
    try {
      const runtimeSource = await readFile(runtimePath, "utf8");
      const directRuntime = await import(pathToFileURL(runtimePath));
      if (
        Object.keys(directRuntime).length !== 1 ||
        directRuntime[exportName] !== oldiconRuntime?.[exportName]
      ) {
        failures.push(
          `oldicon/${exportName} must expose only the matching aggregate component`,
        );
      }
      if (
        runtimeSource.includes("oldicon/index") ||
        runtimeSource.includes("oldicon/icons/") ||
        /\.css["']/.test(runtimeSource)
      ) {
        failures.push(
          `oldicon/${exportName} runtime must not retain the aggregate barrel, sibling icons, or CSS`,
        );
      }
    } catch {
      failures.push(`oldicon/${exportName} runtime is missing or unreadable`);
    }
  }),
);
if (
  manifest.main !== expectedExports["."].import ||
  manifest.module !== expectedExports["."].import ||
  manifest.types !== expectedExports["."].types
) {
  failures.push("main, module, and types must resolve to the root export");
}
if (
  JSON.stringify(manifest.peerDependencies) !==
  JSON.stringify({ react: "^18.2.0 || ^19.0.0" })
) {
  failures.push("react ^18.2.0 || ^19.0.0 must be the only peer dependency");
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
    await readFile(
      path.resolve(path.dirname(colorEntry), "../package.json"),
      "utf8",
    ),
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

failures.push(
  ...(await verifyIconCssGate({
    entries: [
      {
        exportName: "MailOutlined",
        specifier: "@yakit-libs/yakit-ui-icons",
        subpath: ".",
      },
      {
        exportName: "MailOutlined",
        specifier: "@yakit-libs/yakit-ui-icons/outline",
        subpath: "./outline",
      },
      {
        exportName: "PopoverArrowIcon",
        specifier: "@yakit-libs/yakit-ui-icons/oldicon",
        subpath: "./oldicon",
      },
      {
        exportName: "TaskSuccessIcon",
        specifier: "@yakit-libs/yakit-ui-icons/oldicon",
        subpath: "./oldicon",
      },
      {
        exportName: "PopoverArrowIcon",
        specifier: "@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon",
        subpath: "./oldicon/PopoverArrowIcon",
      },
      {
        exportName: "TaskSuccessIcon",
        specifier: "@yakit-libs/yakit-ui-icons/oldicon/TaskSuccessIcon",
        subpath: "./oldicon/TaskSuccessIcon",
      },
      {
        exportName: "MailSolid",
        specifier: "@yakit-libs/yakit-ui-icons/solid",
        subpath: "./solid",
      },
      {
        exportName: "MitmPrimaryMenuColorful",
        specifier: "@yakit-libs/yakit-ui-icons/colorful",
        subpath: "./colorful",
      },
    ],
    packageName: "@yakit-libs/yakit-ui-icons",
    packageRoot,
  })),
);
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
const pureCreateIconCallPattern =
  /=\s*\/\* @__PURE__ \*\/\s*[A-Za-z_$][A-Za-z0-9_$]*\(/g;
let pureCreateIconCalls = 0;
try {
  for (const file of await distFiles(path.join(packageRoot, "dist"))) {
    const source = await readFile(file, "utf8");
    if (file.endsWith(".js")) {
      pureCreateIconCalls +=
        source.match(pureCreateIconCallPattern)?.length ?? 0;
    }
    for (const match of source.matchAll(specifierPattern)) {
      const specifier = match[1];
      if (!specifier.startsWith(".") && !allowedExternal.has(specifier)) {
        failures.push(
          `${path.relative(packageRoot, file)} imports forbidden runtime ${specifier}`,
        );
      }
    }
  }
  if (pureCreateIconCalls < 100) {
    failures.push(
      `dist must preserve createIcon pure annotations, found ${pureCreateIconCalls}`,
    );
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
