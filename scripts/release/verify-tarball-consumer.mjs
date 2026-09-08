#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import { findPackageTarball } from "./verify-pack-directory.mjs";
import { REMOVED_UI_RUNTIMES } from "./removed-ui-runtime-scan.mjs";

const execute = promisify(execFile);

function findDependencies(tree, names, found = new Set()) {
  for (const [name, dependency] of Object.entries(tree.dependencies ?? {})) {
    if (names.includes(name)) found.add(name);
    if (dependency && typeof dependency === "object") {
      findDependencies(dependency, names, found);
    }
  }
  return found;
}

async function assertRemovedUiRuntimesAreAbsent(directory) {
  const { stdout } = await execute("npm", ["ls", "--all", "--json"], {
    cwd: directory,
    env: publicRegistryEnvironment(),
    maxBuffer: 16 * 1024 * 1024,
  });
  const found = [...findDependencies(JSON.parse(stdout), REMOVED_UI_RUNTIMES)];
  if (found.length > 0) {
    throw new Error(
      `consumer installation resolved removed UI runtimes: ${found.join(", ")}`,
    );
  }
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

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port =
        typeof address === "object" && address ? address.port : undefined;
      if (!port) {
        server.close();
        reject(new Error("could not reserve a local Storybook port"));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function observeLauncher(launcher) {
  let output = "";
  let spawnError;
  const append = (chunk) => {
    output = `${output}${chunk}`.slice(-8_192);
  };
  launcher.stdout.on("data", append);
  launcher.stderr.on("data", append);
  launcher.once("error", (error) => {
    spawnError = error;
  });
  return {
    assertRunning() {
      if (spawnError)
        throw new Error(
          `packed Storybook launcher failed to start: ${spawnError.message}`,
        );
      if (launcher.exitCode !== null || launcher.signalCode !== null) {
        const result =
          launcher.exitCode !== null
            ? `exit code ${launcher.exitCode}`
            : `signal ${launcher.signalCode}`;
        throw new Error(
          `packed Storybook launcher stopped with ${result}${output.trim() ? `: ${output.trim()}` : ""}`,
        );
      }
    },
    output: () => output.trim(),
  };
}

async function waitForStorybook(url, launcher, observation) {
  let lastError = "connection was not accepted";
  for (let attempt = 1; attempt <= 80; attempt += 1) {
    observation.assertRunning();
    try {
      const response = await fetch(url);
      if (response.ok) return response.text();
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      // The launcher may still be binding the port.
      lastError = error.cause?.code ?? error.message;
    }
    await delay(250);
  }
  throw new Error(
    `packed Storybook launcher did not become ready at ${url}: ${lastError}${observation.output() ? `; ${observation.output()}` : ""}`,
  );
}

async function stopLauncher(launcher) {
  if (launcher.exitCode !== null || launcher.signalCode !== null) return;
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      launcher.kill("SIGKILL");
      resolve();
    }, 2_000);
    launcher.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    launcher.kill("SIGTERM");
  });
}

const packDirectoryArgument = process.argv[2];
if (!packDirectoryArgument)
  throw new Error("Usage: verify-tarball-consumer.mjs <pack-directory>");
const packDirectory = path.resolve(packDirectoryArgument);
let releaseManifest;
try {
  releaseManifest = JSON.parse(
    await readFile(
      path.join(packDirectory, "verification-manifest.json"),
      "utf8",
    ),
  );
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
async function candidateOrBaseline(packageName) {
  if (!releaseManifest) return findPackageTarball(packDirectory, packageName);
  if (releaseManifest?.releaseSet?.includes(packageName))
    return findPackageTarball(packDirectory, packageName);
  const baseline = releaseManifest?.compatibilityBaselineSet?.find(
    (item) => item.package === packageName,
  );
  if (
    !baseline?.filename ||
    !baseline?.integrity ||
    !baseline?.sha256 ||
    !baseline?.packedBytes
  )
    throw new Error(
      `exact compatibility baseline is missing for ${packageName}`,
    );
  const baselinePath = path.join(packDirectory, baseline.filename);
  const bytes = await readFile(baselinePath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const separator = baseline.integrity.indexOf("-");
  const algorithm = baseline.integrity.slice(0, separator);
  const expectedIntegrity = baseline.integrity.slice(separator + 1);
  const actualIntegrity = createHash(algorithm).update(bytes).digest("base64");
  if (
    sha256 !== baseline.sha256 ||
    actualIntegrity !== expectedIntegrity ||
    bytes.length !== baseline.packedBytes
  )
    throw new Error(`exact compatibility baseline mismatch for ${packageName}`);
  return baselinePath;
}
const tarball = await candidateOrBaseline("@yakit-libs/yakit-ui");
const iconsTarball = await candidateOrBaseline("@yakit-libs/yakit-ui-icons");
const fixture = await mkdtemp(
  path.join(tmpdir(), "yakit-ui-tarball-consumer-"),
);
try {
  const emptyNpmConfig = path.join(fixture, "empty.npmrc");
  await writeFile(emptyNpmConfig, "");
  await writeFile(
    path.join(fixture, "package.json"),
    `${JSON.stringify({ name: "yakit-ui-tarball-consumer", private: true, type: "module" }, null, 2)}\n`,
  );
  await execute(
    "npm",
    [
      "install",
      "--userconfig",
      emptyNpmConfig,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      "--save-exact",
      tarball,
      iconsTarball,
      "@yakit-libs/color@1.4.1",
      "react@18.3.1",
      "react-dom@18.3.1",
      "@types/react@18.3.24",
      "@types/react-dom@18.3.7",
      "typescript@5.9.2",
      "vite@6.3.5",
    ],
    {
      cwd: fixture,
      env: publicRegistryEnvironment(),
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  await assertRemovedUiRuntimesAreAbsent(fixture);
  await writeFile(
    path.join(fixture, "index.html"),
    '<!doctype html><html><body><div id="app"></div><script type="module" src="/consumer.mjs"></script></body></html>\n',
  );
  await writeFile(
    path.join(fixture, "consumer.mjs"),
    'import { applyThemeColors, getColors } from "@yakit-libs/color/preview";\nimport * as YakitUi from "@yakit-libs/yakit-ui";\nimport { HomeOutlined } from "@yakit-libs/yakit-ui-icons";\nimport * as ColorfulIcons from "@yakit-libs/yakit-ui-icons/colorful";\nimport "@yakit-libs/yakit-ui/style.css";\napplyThemeColors("light", getColors("light"));\nwindow.yakitUiExportCount = Object.keys(YakitUi).length + Object.keys(ColorfulIcons).length + Number(Boolean(HomeOutlined));\n',
  );
  await execute(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
    cwd: fixture,
    env: publicRegistryEnvironment(),
    maxBuffer: 16 * 1024 * 1024,
  });
  await access(path.join(fixture, "dist/index.html"));
  await writeFile(
    path.join(fixture, "consumer.ts"),
    'import * as YakitUi from "@yakit-libs/yakit-ui";\nimport { HomeOutlined } from "@yakit-libs/yakit-ui-icons";\nimport * as ColorfulIcons from "@yakit-libs/yakit-ui-icons/colorful";\nimport { HomeSolid } from "@yakit-libs/yakit-ui-icons/solid";\nvoid [YakitUi, HomeOutlined, HomeSolid, ColorfulIcons];\n',
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
  await execute(
    process.execPath,
    ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"],
    {
      cwd: fixture,
      env: publicRegistryEnvironment(),
    },
  );
  await writeFile(
    path.join(fixture, "ssr-consumer.mjs"),
    [
      'import { createElement } from "react";',
      'import { renderToString } from "react-dom/server";',
      'import { Button, ConfigProvider, Input, InputNumber } from "@yakit-libs/yakit-ui";',
      'const tree = createElement(ConfigProvider, { componentSize: "large", theme: { mode: "dark" } }, createElement("main", null, createElement(Button, null, "Submit"), createElement(Input, { defaultValue: "value" }), createElement(Input.Search, { defaultValue: "query" }), createElement(InputNumber, { defaultValue: 7 })));',
      "const markup = renderToString(tree);",
      'if (!markup.includes("yakit-btn") || !markup.includes("yakit-input") || !markup.includes("yakit-input-number") || markup.includes("ant-")) throw new Error("installed package SSR markup is invalid");',
      "process.stdout.write(markup);",
      "",
    ].join("\n"),
  );
  const { stdout: ssrMarkup } = await execute(
    process.execPath,
    ["ssr-consumer.mjs"],
    {
      cwd: fixture,
      env: publicRegistryEnvironment(),
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  if (!ssrMarkup.includes("yakit-search-input")) {
    throw new Error("installed package SSR smoke did not render Input.Search");
  }

  const installedPackage = path.join(
    fixture,
    "node_modules/@yakit-libs/yakit-ui",
  );
  const installedManifest = JSON.parse(
    await readFile(path.join(installedPackage, "package.json"), "utf8"),
  );
  if (installedManifest.name !== "@yakit-libs/yakit-ui")
    throw new Error("installed tarball identity mismatch");
  const installedIconsManifest = JSON.parse(
    await readFile(
      path.join(
        fixture,
        "node_modules/@yakit-libs/yakit-ui-icons/package.json",
      ),
      "utf8",
    ),
  );
  if (
    installedIconsManifest.name !== "@yakit-libs/yakit-ui-icons" ||
    JSON.stringify(installedIconsManifest.peerDependencies) !==
      JSON.stringify({ react: "^18.2.0" }) ||
    JSON.stringify(installedIconsManifest.dependencies) !==
      JSON.stringify({ "@yakit-libs/color": "1.4.1" }) ||
    installedIconsManifest.peerDependenciesMeta
  )
    throw new Error(
      "installed icons tarball identity, color dependency, or React peer contract mismatch",
    );
  const installedColorManifest = JSON.parse(
    await readFile(
      path.join(fixture, "node_modules/@yakit-libs/color/package.json"),
      "utf8",
    ),
  );
  if (
    installedColorManifest.version !== "1.4.1" ||
    !installedColorManifest.exports?.["./preview"] ||
    !installedColorManifest.exports?.["./css"]
  )
    throw new Error("installed @yakit-libs/color 1.4.1 exports are invalid");
  const { stdout: colorProbeOutput } = await execute(
    process.execPath,
    [
      "-e",
      'const color = require("@yakit-libs/color"); const light = color.generateColors("light"); const dark = color.generateColors("dark"); process.stdout.write(JSON.stringify({ lightBase: light["--yakit-colors-Neutral-100"], lightToken: light["--Colors-Use-Neutral-Text-1-Title"], darkBase: dark["--yakit-colors-Neutral-80"], darkToken: dark["--Colors-Use-Neutral-Text-1-Title"] }));',
    ],
    { cwd: fixture, env: publicRegistryEnvironment() },
  );
  const colorProbe = JSON.parse(colorProbeOutput);
  if (
    colorProbe.lightBase !== "#353639" ||
    colorProbe.lightToken !== "var(--yakit-colors-Neutral-100)" ||
    colorProbe.darkBase !== "#c8d0dd" ||
    colorProbe.darkToken !== "var(--yakit-colors-Neutral-80)"
  )
    throw new Error(
      "installed @yakit-libs/color 1.4.1 token contract is invalid",
    );

  const pnpmFixture = path.join(fixture, "pnpm-strict-icons");
  await mkdir(pnpmFixture);
  await writeFile(
    path.join(pnpmFixture, ".npmrc"),
    "node-linker=isolated\nhoist=false\n",
  );
  await writeFile(
    path.join(pnpmFixture, "package.json"),
    `${JSON.stringify({ name: "yakit-ui-icons-pnpm-consumer", private: true, type: "module" }, null, 2)}\n`,
  );
  await execute(
    "pnpm",
    [
      "add",
      "--ignore-scripts",
      "--save-exact",
      iconsTarball,
      "@yakit-libs/color@1.4.1",
      "react@18.3.1",
      "vite@6.3.5",
    ],
    {
      cwd: pnpmFixture,
      env: publicRegistryEnvironment(),
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  await writeFile(
    path.join(pnpmFixture, "index.html"),
    '<!doctype html><html><body><script type="module" src="/consumer.mjs"></script></body></html>\n',
  );
  await writeFile(
    path.join(pnpmFixture, "consumer.mjs"),
    'import { applyThemeColors, getColors } from "@yakit-libs/color/preview";\nimport { HomeOutlined } from "@yakit-libs/yakit-ui-icons";\nimport * as ColorfulIcons from "@yakit-libs/yakit-ui-icons/colorful";\napplyThemeColors("light", getColors("light"));\nwindow.iconLoaded = Boolean(HomeOutlined) && Object.keys(ColorfulIcons).length > 0;\n',
  );
  await execute(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
    cwd: pnpmFixture,
    env: publicRegistryEnvironment(),
    maxBuffer: 16 * 1024 * 1024,
  });
  await access(path.join(pnpmFixture, "dist/index.html"));
  const pnpmManifest = JSON.parse(
    await readFile(path.join(pnpmFixture, "package.json"), "utf8"),
  );
  if (pnpmManifest.dependencies?.["@yakit-libs/color"] !== "1.4.1") {
    throw new Error(
      "pnpm consumer must install @yakit-libs/color 1.4.1 directly",
    );
  }
  const cssPath = path.join(installedPackage, "dist/index.css");
  await access(cssPath);
  if (!(await readFile(cssPath, "utf8")).trim())
    throw new Error("packed CSS export is empty");

  const port = await reservePort();
  const launcher = spawn(
    process.execPath,
    [
      path.join(installedPackage, "dist/bin/yakit-ui-storybook.mjs"),
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: fixture,
      env: publicRegistryEnvironment(),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const launcherObservation = observeLauncher(launcher);
  try {
    const baseUrl = `http://127.0.0.1:${port}/`;
    const html = await waitForStorybook(baseUrl, launcher, launcherObservation);
    const asset = html.match(
      /(?:src|href)=["']([^"']+\.(?:css|js)(?:\?[^"']*)?)["']/i,
    )?.[1];
    if (!asset)
      throw new Error(
        "packed Storybook index contains no CSS or JavaScript asset",
      );
    const response = await fetch(new URL(asset, baseUrl));
    if (!response.ok)
      throw new Error(
        `packed Storybook asset returned HTTP ${response.status}`,
      );
  } finally {
    await stopLauncher(launcher);
  }

  console.log(
    JSON.stringify(
      {
        css: "passed",
        bundler: "passed",
        package: `${installedManifest.name}@${installedManifest.version}`,
        iconsPackage: `${installedIconsManifest.name}@${installedIconsManifest.version}`,
        removedUiRuntimes: "absent",
        pnpmStrictLayout: "passed",
        ssr: "passed",
        storybook: "passed",
        typescript: "passed",
      },
      null,
      2,
    ),
  );
} finally {
  await rm(fixture, { force: true, recursive: true });
}
