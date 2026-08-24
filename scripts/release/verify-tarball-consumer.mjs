#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { createServer } from "node:net";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import { findPackageTarball } from "./verify-pack-directory.mjs";

const execute = promisify(execFile);

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

const packDirectory = process.argv[2];
if (!packDirectory)
  throw new Error("Usage: verify-tarball-consumer.mjs <pack-directory>");
const tarball = await findPackageTarball(packDirectory, "@yakit-libs/yakit-ui");
const iconsTarball = await findPackageTarball(
  packDirectory,
  "@yakit-libs/yakit-ui-icons",
);
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
      "react@18.3.1",
      "react-dom@18.3.1",
      "antd@6.5.4",
      "@ant-design/cssinjs@2.1.2",
      "typescript@5.9.2",
      "vite@6.3.5",
    ],
    {
      cwd: fixture,
      env: publicRegistryEnvironment(),
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  await writeFile(
    path.join(fixture, "index.html"),
    '<!doctype html><html><body><div id="app"></div><script type="module" src="/consumer.mjs"></script></body></html>\n',
  );
  await writeFile(
    path.join(fixture, "consumer.mjs"),
    'import * as YakitUi from "@yakit-libs/yakit-ui";\nimport { HomeOutlined } from "@yakit-libs/yakit-ui-icons";\nimport "@yakit-libs/yakit-ui/style.css";\nwindow.yakitUiExportCount = Object.keys(YakitUi).length + Number(Boolean(HomeOutlined));\n',
  );
  await execute(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
    cwd: fixture,
    env: publicRegistryEnvironment(),
    maxBuffer: 16 * 1024 * 1024,
  });
  await access(path.join(fixture, "dist/index.html"));
  await writeFile(
    path.join(fixture, "consumer.ts"),
    'import * as YakitUi from "@yakit-libs/yakit-ui";\nimport { HomeOutlined } from "@yakit-libs/yakit-ui-icons";\nimport { HomeFilled } from "@yakit-libs/yakit-ui-icons/solid";\nvoid [YakitUi, HomeOutlined, HomeFilled];\n',
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
          skipLibCheck: true,
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
    installedIconsManifest.dependencies ||
    installedIconsManifest.peerDependenciesMeta
  )
    throw new Error(
      "installed icons tarball identity or React-only peer contract mismatch",
    );
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
