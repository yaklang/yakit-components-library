#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import { verifyDeferredRegistryBaseline } from "./release-deferrals.mjs";

const execute = promisify(execFile);

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function publicRegistryEnvironment() {
  const environment = { ...process.env };
  for (const name of Object.keys(environment)) {
    if (/token|auth|userconfig|globalconfig/i.test(name))
      delete environment[name];
  }
  environment.npm_config_audit = "false";
  environment.npm_config_fund = "false";
  environment.npm_config_registry = "https://registry.npmjs.org/";
  return environment;
}

async function run(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: options.stdio ?? "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `${command} failed${signal ? ` with ${signal}` : ` with exit code ${code}`}`,
          ),
        );
    });
  });
}

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForRegistry(packageName, version, distTag) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
  let lastStatus = "not requested";
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
    });
    lastStatus = `HTTP ${response.status}`;
    if (response.ok) {
      const metadata = await response.json();
      if (
        metadata.versions?.[version] &&
        metadata["dist-tags"]?.[distTag] === version
      ) {
        return metadata.versions[version];
      }
      lastStatus = "exact version or dist-tag is not visible yet";
    }
    if (attempt < 24) await delay(5_000);
  }
  throw new Error(`registry propagation timed out: ${lastStatus}`);
}

const packageName = requiredEnvironment("PACKAGE_NAME");
const packageVersion = requiredEnvironment("PACKAGE_VERSION");
const distTag = requiredEnvironment("DIST_TAG");
if (
  !["@yakit-libs/yakit-ui", "@yakit-libs/yakit-ui-icons"].includes(packageName)
)
  throw new Error(
    "post-publish verification is restricted to Yakit UI packages",
  );
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageVersion)) {
  throw new Error("invalid package version");
}

const registryManifest = await waitForRegistry(
  packageName,
  packageVersion,
  distTag,
);
if (
  registryManifest.name !== packageName ||
  registryManifest.version !== packageVersion
) {
  throw new Error("registry package identity mismatch");
}
let deferralPolicy;
try {
  deferralPolicy = JSON.parse(
    await readFile(
      new URL("./release-deferral-policy.json", import.meta.url),
      "utf8",
    ),
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (deferralPolicy) {
  await verifyDeferredRegistryBaseline(deferralPolicy, {
    name: packageName,
    version: packageVersion,
  });
}
if (packageName === "@yakit-libs/yakit-ui-icons") {
  const iconsFixture = await mkdtemp(
    path.join(tmpdir(), "yakit-ui-icons-registry-smoke-"),
  );
  try {
    const emptyNpmConfig = path.join(iconsFixture, "empty.npmrc");
    await writeFile(emptyNpmConfig, "");
    await writeFile(
      path.join(iconsFixture, "package.json"),
      `${JSON.stringify({ name: "yakit-ui-icons-registry-smoke", private: true, type: "module" }, null, 2)}\n`,
    );
    await run(
      "npm",
      [
        "install",
        "--userconfig",
        emptyNpmConfig,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--save-exact",
        `${packageName}@${packageVersion}`,
        "@yakit-libs/color@1.4.1",
        "react@18.3.1",
        "vite@6.3.5",
      ],
      { cwd: iconsFixture, env: publicRegistryEnvironment() },
    );
    await writeFile(
      path.join(iconsFixture, "index.html"),
      '<!doctype html><html><body><script type="module" src="/consumer.mjs"></script></body></html>\n',
    );
    await writeFile(
      path.join(iconsFixture, "consumer.mjs"),
      'import { applyThemeColors, getColors } from "@yakit-libs/color/preview";\nimport { HomeOutlined } from "@yakit-libs/yakit-ui-icons";\nimport * as ColorfulIcons from "@yakit-libs/yakit-ui-icons/colorful";\nimport { HomeSolid } from "@yakit-libs/yakit-ui-icons/solid";\napplyThemeColors("light", getColors("light"));\nwindow.iconCount = Number(Boolean(HomeOutlined)) + Number(Boolean(HomeSolid)) + Object.keys(ColorfulIcons).length;\n',
    );
    await run(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
      cwd: iconsFixture,
      env: publicRegistryEnvironment(),
    });
    await access(path.join(iconsFixture, "dist/index.html"));
    const installedManifest = JSON.parse(
      await readFile(
        path.join(
          iconsFixture,
          "node_modules/@yakit-libs/yakit-ui-icons/package.json",
        ),
        "utf8",
      ),
    );
    if (
      JSON.stringify(installedManifest.peerDependencies) !==
        JSON.stringify({ react: "^18.2.0 || ^19.0.0" }) ||
      JSON.stringify(installedManifest.dependencies) !==
        JSON.stringify({ "@yakit-libs/color": "1.4.1" }) ||
      installedManifest.peerDependenciesMeta
    )
      throw new Error(
        "published icons package violates the color dependency or React peer contract",
      );
    const installedColorManifest = JSON.parse(
      await readFile(
        path.join(iconsFixture, "node_modules/@yakit-libs/color/package.json"),
        "utf8",
      ),
    );
    if (
      installedColorManifest.version !== "1.4.1" ||
      !installedColorManifest.exports?.["./preview"] ||
      !installedColorManifest.exports?.["./css"]
    )
      throw new Error("published @yakit-libs/color 1.4.1 exports are invalid");
    console.log(
      JSON.stringify(
        {
          bundler: "passed",
          distTag,
          package: `${packageName}@${packageVersion}`,
          colorDependency: "passed",
          reactPeer: "passed",
        },
        null,
        2,
      ),
    );
  } finally {
    await rm(iconsFixture, { force: true, recursive: true });
  }
  process.exit(0);
}
const fixture = await mkdtemp(path.join(tmpdir(), "yakit-ui-registry-smoke-"));
const emptyNpmConfig = path.join(fixture, "empty.npmrc");
await writeFile(emptyNpmConfig, "");
await writeFile(
  path.join(fixture, "package.json"),
  `${JSON.stringify({ name: "yakit-ui-registry-smoke", private: true, type: "module" }, null, 2)}\n`,
);
await run(
  "npm",
  [
    "install",
    "--userconfig",
    emptyNpmConfig,
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--save-exact",
    `${packageName}@${packageVersion}`,
    "react@18.3.1",
    "react-dom@18.3.1",
    "@types/react@18.3.24",
    "@types/react-dom@18.3.7",
    "typescript@5.9.2",
    "vite@6.3.5",
  ],
  { cwd: fixture, env: publicRegistryEnvironment() },
);
await writeFile(
  path.join(fixture, "index.html"),
  '<!doctype html><html><body><div id="app"></div><script type="module" src="/consumer.mjs"></script></body></html>\n',
);
await writeFile(
  path.join(fixture, "consumer.mjs"),
  `import * as YakitUi from ${JSON.stringify(packageName)};\nimport ${JSON.stringify(`${packageName}/style.css`)};\nwindow.yakitUiExportCount = Object.keys(YakitUi).length;\n`,
);
await run(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
  cwd: fixture,
  env: publicRegistryEnvironment(),
});
await access(path.join(fixture, "dist/index.html"));
await writeFile(
  path.join(fixture, "consumer.ts"),
  `import * as YakitUi from ${JSON.stringify(packageName)};\nvoid YakitUi;\n`,
);
await writeFile(
  path.join(fixture, "tsconfig.json"),
  `${JSON.stringify(
    {
      compilerOptions: {
        jsx: "react-jsx",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        noEmit: true,
        skipLibCheck: false,
        strict: true,
        target: "ES2022",
      },
      files: ["consumer.ts"],
    },
    null,
    2,
  )}\n`,
);
await run(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"],
  {
    cwd: fixture,
    env: publicRegistryEnvironment(),
  },
);

const installedPackage = path.join(fixture, "node_modules", packageName);
const installedManifest = JSON.parse(
  await readFile(path.join(installedPackage, "package.json"), "utf8"),
);
if (installedManifest.version !== packageVersion)
  throw new Error("installed package version mismatch");
if (packageName === "@yakit-libs/yakit-ui") {
  if (
    installedManifest.dependencies?.antd !== registryManifest.dependencies?.antd
  )
    throw new Error(
      "installed package antd dependency does not match the registry manifest",
    );
  const antdManifest = JSON.parse(
    await readFile(
      path.join(fixture, "node_modules/antd/package.json"),
      "utf8",
    ),
  );
  if (!/^6\./.test(antdManifest.version))
    throw new Error("installed package did not resolve antd 6");
}
const cssPath = path.join(installedPackage, "dist/index.css");
await access(cssPath);
if (!(await readFile(cssPath, "utf8")).trim())
  throw new Error("installed CSS export is empty");

console.log(
  JSON.stringify(
    {
      css: "passed",
      distTag,
      bundler: "passed",
      package: `${packageName}@${packageVersion}`,
      runtimeDependencies: "passed",
      typescript: "passed",
    },
    null,
    2,
  ),
);
