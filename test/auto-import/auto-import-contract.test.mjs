import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const packageRoots = {
  icons: resolve(repositoryRoot, "packages/yakit-ui-icons"),
  ui: resolve(repositoryRoot, "packages/yakit-ui"),
};
const typescriptInstallations = ["5.8.3", "5.9.2"].map((version) => ({
  serverPath: resolve(
    repositoryRoot,
    `node_modules/.pnpm/typescript@${version}/node_modules/typescript/lib/tsserver.js`,
  ),
  version,
}));
const installSets = {
  both: ["ui", "icons"],
  "icons-only": ["icons"],
  "ui-only": ["ui"],
};
const importScenarios = [
  { id: "outline-root", subpath: "", symbolName: "HomeOutlined" },
  { id: "outline-family", subpath: "outline", symbolName: "HomeOutlined" },
  { id: "solid-family", subpath: "solid", symbolName: "HomeSolid" },
  {
    id: "colorful-family",
    subpath: "colorful",
    symbolName: "AddFolderFileTypeColorful",
  },
  {
    id: "oldicon",
    installSets: ["both", "icons-only"],
    subpath: "oldicon",
    symbolName: "PopoverArrowIcon",
  },
  {
    // tsserver does not enumerate wildcard exports, so the aggregate public
    // path remains the valid auto-import fallback for a per-icon symbol.
    id: "oldicon-with-per-icon-export",
    installSets: ["both", "icons-only"],
    subpath: "oldicon/PopoverArrowIcon",
    symbolName: "PopoverArrowIcon",
  },
  { id: "registry", subpath: "registry", symbolName: "iconRegistry" },
];

function scenarioContract(scenario, installSet) {
  const isUiOnly = installSet === "ui-only";
  const rootSpecifier = isUiOnly
    ? "@yakit-libs/yakit-ui"
    : "@yakit-libs/yakit-ui-icons";
  const preferredSpecifier = scenario.subpath
    ? `${isUiOnly ? "@yakit-libs/yakit-ui/icons" : rootSpecifier}/${scenario.subpath}`
    : rootSpecifier;
  let acceptedSpecifierSet = [preferredSpecifier];
  if (scenario.subpath && scenario.subpath !== "registry") {
    if (scenario.subpath.startsWith("oldicon")) {
      const aggregateSpecifier = `${rootSpecifier}/oldicon`;
      acceptedSpecifierSet =
        scenario.subpath === "oldicon"
          ? [preferredSpecifier]
          : [preferredSpecifier, aggregateSpecifier];
    } else {
      acceptedSpecifierSet = [preferredSpecifier, rootSpecifier];
    }
  }
  if (isUiOnly && scenario.subpath === "registry") {
    // yakit-ui's root still re-exports the registry, so it is a valid compatibility fallback.
    acceptedSpecifierSet.push(rootSpecifier);
  }
  return { acceptedSpecifierSet, preferredSpecifier };
}

function verifyPrerequisites() {
  for (const [name, root] of Object.entries(packageRoots)) {
    assert.ok(
      existsSync(resolve(root, "dist/index.d.ts")),
      `${name} package must be built`,
    );
  }
  for (const installation of typescriptInstallations) {
    assert.ok(
      existsSync(installation.serverPath),
      `TypeScript ${installation.version} must be installed`,
    );
  }
}

function copyPackage(fixtureRoot, packageRoot) {
  const scopeRoot = resolve(fixtureRoot, "node_modules/@yakit-libs");
  mkdirSync(scopeRoot, { recursive: true });
  const packageJsonPath = resolve(packageRoot, "package.json");
  const manifest = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const destination = resolve(
    scopeRoot,
    manifest.name.slice("@yakit-libs/".length),
  );
  mkdirSync(destination, { recursive: true });
  copyFileSync(packageJsonPath, resolve(destination, "package.json"));
  cpSync(resolve(packageRoot, "dist"), resolve(destination, "dist"), {
    recursive: true,
  });
  return manifest;
}

function linkConsumerDependency(fixtureRoot, name, source) {
  const destination = resolve(fixtureRoot, "node_modules", name);
  mkdirSync(resolve(destination, ".."), { recursive: true });
  symlinkSync(realpathSync(source), destination, "dir");
}

function createFixture(suiteRoot, installSet, moduleResolution, syntax) {
  const fixtureRoot = resolve(
    suiteRoot,
    `${installSet}-${moduleResolution}-${syntax}`,
  );
  mkdirSync(fixtureRoot, { recursive: true });
  const dependencies = {};
  for (const packageKey of installSets[installSet]) {
    const manifest = copyPackage(fixtureRoot, packageRoots[packageKey]);
    dependencies[manifest.name] = manifest.version;
  }
  linkConsumerDependency(
    fixtureRoot,
    "react",
    resolve(packageRoots.icons, "node_modules/react"),
  );
  linkConsumerDependency(
    fixtureRoot,
    "@types/react",
    resolve(packageRoots.icons, "node_modules/@types/react"),
  );
  writeFileSync(
    resolve(fixtureRoot, "package.json"),
    `${JSON.stringify({ dependencies, private: true, type: "module" }, null, 2)}\n`,
  );
  writeFileSync(
    resolve(fixtureRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          jsx: "react-jsx",
          module: moduleResolution === "nodenext" ? "NodeNext" : "ESNext",
          moduleResolution:
            moduleResolution === "nodenext" ? "NodeNext" : "Bundler",
          skipLibCheck: true,
          target: "ES2022",
        },
      },
      null,
      2,
    )}\n`,
  );
  return fixtureRoot;
}

function classifyCandidates({
  acceptedSpecifierSet,
  observedCandidates,
  preferredSpecifier,
}) {
  if (observedCandidates.length === 0)
    return {
      preferredMissing: true,
      selectedCandidate: null,
      state: "NO_SUGGESTION",
    };
  const hasDeepCandidate = observedCandidates.some(
    (value) => value.includes("/dist/") || value.includes("/src/"),
  );
  const selectedCandidate = observedCandidates.includes(preferredSpecifier)
    ? preferredSpecifier
    : (acceptedSpecifierSet.find((value) =>
        observedCandidates.includes(value),
      ) ?? null);
  if (selectedCandidate) {
    return {
      preferredMissing: selectedCandidate !== preferredSpecifier,
      selectedCandidate,
      state: "VALID",
    };
  }
  const preferredPackage = preferredSpecifier.split("/").slice(0, 2).join("/");
  const hasCanonicalPackageCandidate = observedCandidates.some(
    (value) =>
      value === preferredPackage || value.startsWith(`${preferredPackage}/`),
  );
  return {
    preferredMissing: true,
    selectedCandidate: null,
    state:
      hasDeepCandidate || hasCanonicalPackageCandidate
        ? "WRONG_SUBPATH"
        : "WRONG_PACKAGE",
  };
}

function applyImportChanges(source, symbolName, prefix, textChanges) {
  const symbolStart = source.indexOf(prefix);
  const protocolOffset = ({ line, offset }) => {
    const lines = source.split("\n");
    return (
      lines
        .slice(0, line - 1)
        .reduce((total, value) => total + value.length + 1, 0) +
      offset -
      1
    );
  };
  const normalizedChanges = textChanges.map((change) => ({
    length: protocolOffset(change.end) - protocolOffset(change.start),
    newText: change.newText,
    start: protocolOffset(change.start),
  }));
  let updated = `${source.slice(0, symbolStart)}${symbolName}${source.slice(symbolStart + prefix.length)}`;
  for (const change of normalizedChanges.sort(
    (left, right) => right.start - left.start,
  )) {
    assert.ok(
      change.start <= symbolStart,
      `Unexpected completion change after identifier: ${JSON.stringify(change)}`,
    );
    updated = `${updated.slice(0, change.start)}${change.newText}${updated.slice(change.start + change.length)}`;
  }
  return updated;
}

test("auto-import candidate classification is deterministic", () => {
  const contract = {
    acceptedSpecifierSet: [
      "@yakit-libs/yakit-ui-icons/solid",
      "@yakit-libs/yakit-ui-icons",
    ],
    preferredSpecifier: "@yakit-libs/yakit-ui-icons/solid",
  };

  assert.deepEqual(
    classifyCandidates({
      ...contract,
      observedCandidates: [
        "@yakit-libs/yakit-ui-icons",
        "@yakit-libs/yakit-ui-icons/solid",
      ],
    }),
    {
      preferredMissing: false,
      selectedCandidate: "@yakit-libs/yakit-ui-icons/solid",
      state: "VALID",
    },
  );
  assert.deepEqual(
    classifyCandidates({
      ...contract,
      observedCandidates: ["@yakit-libs/yakit-ui-icons"],
    }),
    {
      preferredMissing: true,
      selectedCandidate: "@yakit-libs/yakit-ui-icons",
      state: "VALID",
    },
  );
  assert.deepEqual(
    classifyCandidates({
      ...contract,
      observedCandidates: ["@yakit-libs/yakit-ui-icons/dist/solid/index.js"],
    }),
    {
      preferredMissing: true,
      selectedCandidate: null,
      state: "WRONG_SUBPATH",
    },
  );
  assert.deepEqual(
    classifyCandidates({
      ...contract,
      observedCandidates: ["another-icon-package"],
    }),
    {
      preferredMissing: true,
      selectedCandidate: null,
      state: "WRONG_PACKAGE",
    },
  );
  assert.deepEqual(
    classifyCandidates({ ...contract, observedCandidates: [] }),
    {
      preferredMissing: true,
      selectedCandidate: null,
      state: "NO_SUGGESTION",
    },
  );
});

class TsserverClient {
  #buffer = Buffer.alloc(0);
  #pending = new Map();
  #process;
  #sequence = 0;

  constructor(serverPath) {
    this.#process = spawn(
      process.execPath,
      [serverPath, "--useInferredProjectPerProjectRoot"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    this.#process.stdout.on("data", (chunk) => this.#read(chunk));
    this.#process.stderr.on("data", (chunk) => {
      if (process.env.DEBUG_AUTO_IMPORT) process.stderr.write(chunk);
    });
    this.#process.on("exit", (code) => {
      for (const { reject } of this.#pending.values())
        reject(new Error(`tsserver exited with code ${code}`));
      this.#pending.clear();
    });
  }

  #read(chunk) {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    while (true) {
      const separator = this.#buffer.indexOf("\r\n\r\n");
      if (separator < 0) return;
      const header = this.#buffer.subarray(0, separator).toString("utf8");
      const length = Number(/Content-Length: (\d+)/i.exec(header)?.[1]);
      if (!Number.isFinite(length))
        throw new Error(`Invalid tsserver header: ${header}`);
      const bodyStart = separator + 4;
      if (this.#buffer.length < bodyStart + length) return;
      const message = JSON.parse(
        this.#buffer.subarray(bodyStart, bodyStart + length).toString("utf8"),
      );
      this.#buffer = this.#buffer.subarray(bodyStart + length);
      if (message.type !== "response") continue;
      const pending = this.#pending.get(message.request_seq);
      if (!pending) continue;
      this.#pending.delete(message.request_seq);
      if (message.success) pending.resolve(message.body);
      else
        pending.reject(
          new Error(
            message.message ?? `tsserver command ${message.command} failed`,
          ),
        );
    }
  }

  notify(command, args) {
    this.#process.stdin.write(
      `${JSON.stringify({ arguments: args, command, seq: ++this.#sequence, type: "request" })}\n`,
    );
  }

  request(command, args) {
    const request = {
      arguments: args,
      command,
      seq: ++this.#sequence,
      type: "request",
    };
    return new Promise((resolvePromise, reject) => {
      this.#pending.set(request.seq, { reject, resolve: resolvePromise });
      this.#process.stdin.write(`${JSON.stringify(request)}\n`);
    });
  }

  close() {
    this.#process.stdin.end();
    this.#process.kill();
  }
}

async function inspectAutoImport({
  client,
  fixtureRoot,
  installSet,
  moduleResolution,
  scenario,
  syntax,
  tsVersion,
}) {
  const { symbolName } = scenario;
  const prefix = symbolName.slice(0, -2);
  const source =
    syntax === "tsx" && symbolName !== "iconRegistry"
      ? `const view = <${prefix} />;\n`
      : `const value = ${prefix};\n`;
  const file = resolve(fixtureRoot, `consumer-${scenario.id}.${syntax}`);
  writeFileSync(file, source);
  client.notify("open", {
    file,
    fileContent: source,
    projectRootPath: fixtureRoot,
  });
  try {
    const body = await client.request("completionInfo", {
      file,
      includeExternalModuleExports: true,
      includeInsertTextCompletions: true,
      line: 1,
      offset: source.indexOf(prefix) + prefix.length + 1,
      preferences: {
        importModuleSpecifierPreference: "non-relative",
        includePackageJsonAutoImports: "on",
      },
    });
    const completionEntries = (body?.entries ?? []).filter(
      (entry) => entry.name === symbolName && typeof entry.source === "string",
    );
    const observedCandidates = [
      ...new Set(completionEntries.map((entry) => entry.source)),
    ].sort();
    const { acceptedSpecifierSet, preferredSpecifier } = scenarioContract(
      scenario,
      installSet,
    );
    const classification = classifyCandidates({
      acceptedSpecifierSet,
      observedCandidates,
      preferredSpecifier,
    });
    let actualInsertedSpecifier = null;
    let semanticDiagnostics = [];
    if (classification.state === "VALID") {
      const selectedEntry = completionEntries.find(
        (entry) => entry.source === classification.selectedCandidate,
      );
      assert.ok(
        selectedEntry,
        "selected candidate must retain its completion entry",
      );
      const detailBody = await client.request("completionEntryDetails", {
        entryNames: [
          {
            data: selectedEntry.data,
            name: selectedEntry.name,
            source: selectedEntry.source,
          },
        ],
        file,
        line: 1,
        offset: source.indexOf(prefix) + prefix.length + 1,
        preferences: {
          importModuleSpecifierPreference: "non-relative",
          includePackageJsonAutoImports: "on",
        },
      });
      const detail = Array.isArray(detailBody) ? detailBody[0] : detailBody;
      const importChanges = (detail?.codeActions ?? [])
        .flatMap((action) => action.changes ?? [])
        .filter((change) => change.fileName === file)
        .flatMap((change) => change.textChanges ?? []);
      const importText = importChanges
        .map((change) => change.newText)
        .join("\n");
      actualInsertedSpecifier =
        /(?:from\s+|import\s+)["']([^"']+)["']/.exec(importText)?.[1] ?? null;
      assert.equal(
        actualInsertedSpecifier,
        classification.selectedCandidate,
        `completion action must import the selected candidate: ${importText}`,
      );
      const completedSource = applyImportChanges(
        source,
        symbolName,
        prefix,
        importChanges,
      );
      client.notify("close", { file });
      writeFileSync(file, completedSource);
      client.notify("open", {
        file,
        fileContent: completedSource,
        projectRootPath: fixtureRoot,
      });
      semanticDiagnostics =
        (await client.request("semanticDiagnosticsSync", { file })) ?? [];
      assert.deepEqual(
        semanticDiagnostics,
        [],
        `applied auto-import must typecheck: ${completedSource}`,
      );
    }
    return {
      acceptedSpecifierSet,
      actualInsertedSpecifier,
      installSet,
      moduleResolution,
      multiplicity: observedCandidates.length,
      observedCandidates,
      preferredSpecifier,
      preferredMissing: classification.preferredMissing,
      scenario: scenario.id,
      selectedCandidate: classification.selectedCandidate,
      semanticDiagnostics,
      state: classification.state,
      symbolName,
      syntax,
      typescriptVersion: tsVersion,
    };
  } catch (error) {
    return {
      acceptedSpecifierSet: scenarioContract(scenario, installSet)
        .acceptedSpecifierSet,
      error:
        error instanceof Error ? (error.stack ?? error.message) : String(error),
      installSet,
      moduleResolution,
      multiplicity: 0,
      observedCandidates: [],
      preferredSpecifier: scenarioContract(scenario, installSet)
        .preferredSpecifier,
      preferredMissing: true,
      scenario: scenario.id,
      selectedCandidate: null,
      state: "INCONCLUSIVE",
      symbolName,
      syntax,
      typescriptVersion: tsVersion,
    };
  } finally {
    client.notify("close", { file });
  }
}

verifyPrerequisites();
for (const installation of typescriptInstallations) {
  test(`TypeScript ${installation.version} suggests canonical public icon imports`, async (context) => {
    const suiteRoot = mkdtempSync(join(tmpdir(), "yakit-auto-import-"));
    const results = [];
    try {
      for (const installSet of Object.keys(installSets)) {
        for (const moduleResolution of ["bundler", "nodenext"]) {
          for (const syntax of ["ts", "tsx"]) {
            const client = new TsserverClient(installation.serverPath);
            const fixtureRoot = createFixture(
              suiteRoot,
              installSet,
              moduleResolution,
              syntax,
            );
            try {
              client.notify("configure", {
                preferences: {
                  importModuleSpecifierPreference: "non-relative",
                  includePackageJsonAutoImports: "on",
                },
              });
              for (const scenario of importScenarios) {
                if (
                  scenario.installSets &&
                  !scenario.installSets.includes(installSet)
                )
                  continue;
                results.push(
                  await inspectAutoImport({
                    client,
                    fixtureRoot,
                    installSet,
                    moduleResolution,
                    scenario,
                    syntax,
                    tsVersion: installation.version,
                  }),
                );
              }
            } finally {
              client.close();
            }
          }
        }
      }
    } finally {
      rmSync(suiteRoot, { force: true, recursive: true });
    }
    if (process.env.AUTO_IMPORT_REPORT === "1") {
      context.diagnostic(JSON.stringify(results, null, 2));
    }
    for (const result of results) {
      context.assert.equal(
        result.state,
        "VALID",
        `${JSON.stringify(result, null, 2)}\nCandidate order is intentionally not asserted.`,
      );
      context.assert.ok(
        result.multiplicity >= 1,
        JSON.stringify(result, null, 2),
      );
      context.assert.ok(
        result.observedCandidates.every(
          (value) => !value.includes("/dist/") && !value.includes("/src/"),
        ),
        JSON.stringify(result, null, 2),
      );
    }
  });
}
