import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const UI = "@yakit-libs/yakit-ui";
const ICONS = "@yakit-libs/yakit-ui-icons";
const verifier = path.resolve(
  import.meta.dirname,
  "../../scripts/release/verify-tarball-consumer.mjs",
);
const { shouldVerifyInstalledContract } = await import(
  pathToFileURL(verifier).href,
);

function createTarball(directory, packageName, version, filename) {
  const staging = path.join(directory, `${filename}-staging`, "package");
  mkdirSync(staging, { recursive: true });
  writeFileSync(
    path.join(staging, "package.json"),
    `${JSON.stringify({ name: packageName, version })}\n`,
  );
  const tarball = path.join(directory, filename);
  execFileSync("tar", [
    "-czf",
    tarball,
    "-C",
    path.dirname(staging),
    "package",
  ]);
  return tarball;
}

function fixture({ tamperBaselineHash = false } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "tarball-consumer-path-"));
  const verified = path.join(root, "verified");
  const bin = path.join(root, "bin");
  mkdirSync(verified);
  mkdirSync(bin);
  const baseline = createTarball(
    verified,
    UI,
    "0.2.3",
    "baseline-yakit-ui-0.2.3.tgz",
  );
  const candidate = createTarball(
    verified,
    ICONS,
    "0.2.4",
    "yakit-libs-yakit-ui-icons-0.2.4.tgz",
  );
  const bytes = readFileSync(baseline);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const integrity = `sha512-${createHash("sha512")
    .update(bytes)
    .digest("base64")}`;
  writeFileSync(
    path.join(verified, "verification-manifest.json"),
    `${JSON.stringify({
      releaseSet: [ICONS],
      compatibilityBaselineSet: [
        {
          package: UI,
          version: "0.2.3",
          filename: path.basename(baseline),
          integrity,
          sha256: tamperBaselineHash ? "0".repeat(64) : sha256,
          packedBytes: bytes.length,
        },
      ],
    })}\n`,
  );
  const capture = path.join(root, "npm-arguments.json");
  const fakeNpm = path.join(bin, "npm");
  writeFileSync(
    fakeNpm,
    '#!/bin/sh\nnode -e \'require("node:fs").writeFileSync(process.env.NPM_ARGUMENT_CAPTURE, JSON.stringify(process.argv.slice(1)))\' -- "$@"\nexit 73\n',
  );
  chmodSync(fakeNpm, 0o755);
  return { root, verified, baseline, candidate, bin, capture };
}

function runVerifier(state) {
  return () =>
    execFileSync(process.execPath, [verifier, path.basename(state.verified)], {
      cwd: state.root,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${state.bin}${path.delimiter}${process.env.PATH}`,
        NPM_ARGUMENT_CAPTURE: state.capture,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
}

test("CLI resolves a relative verified directory before changing consumer cwd", (t) => {
  const state = fixture();
  t.after(() => rmSync(state.root, { recursive: true, force: true }));
  assert.throws(runVerifier(state));
  const argumentsPassed = JSON.parse(readFileSync(state.capture, "utf8"));
  assert.ok(argumentsPassed.includes(realpathSync(state.baseline)));
  assert.ok(argumentsPassed.includes(realpathSync(state.candidate)));
  for (const tarball of [state.baseline, state.candidate])
    assert.equal(path.isAbsolute(tarball), true);
});

test("new package contracts are skipped for compatibility baselines", () => {
  const iconsOnly = { releaseSet: [ICONS] };
  const uiOnly = { releaseSet: [UI] };

  assert.equal(shouldVerifyInstalledContract(iconsOnly, UI), false);
  assert.equal(shouldVerifyInstalledContract(iconsOnly, ICONS), true);
  assert.equal(shouldVerifyInstalledContract(uiOnly, UI), true);
  assert.equal(shouldVerifyInstalledContract(uiOnly, ICONS), false);
  assert.equal(shouldVerifyInstalledContract(undefined, UI), true);
  assert.equal(shouldVerifyInstalledContract(undefined, ICONS), true);
});

test("relative directory normalization preserves baseline digest validation", (t) => {
  const state = fixture({ tamperBaselineHash: true });
  t.after(() => rmSync(state.root, { recursive: true, force: true }));
  assert.throws(runVerifier(state), /exact compatibility baseline mismatch/);
  assert.equal(existsSync(state.capture), false);
});
