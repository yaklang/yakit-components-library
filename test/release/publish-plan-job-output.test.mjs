import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  exportPublishPlan,
  restorePublishPlan,
} from "../../scripts/release/publish-plan-job-output.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "publish-plan-output-"));
  const sourceDirectory = join(root, "changeset-publish-plan-1");
  const output = join(root, "github-output");
  mkdirSync(sourceDirectory);
  const raw = `${JSON.stringify({
    version: 1,
    plan: [{ name: "@yakit-libs/yakit-ui", version: "0.2.2" }],
  })}\n`;
  writeFileSync(join(sourceDirectory, "publish-plan.json"), raw);
  return { output, raw, root };
}

function parseOutputs(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .trim()
      .split("\n")
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

test("publish plan transport preserves the exact Changesets plan", async (t) => {
  const current = fixture();
  t.after(() => rmSync(current.root, { recursive: true, force: true }));
  await exportPublishPlan(current.root, current.output);
  const outputs = parseOutputs(current.output);
  const restored = join(current.root, "restored", "publish-plan.json");
  await restorePublishPlan(
    outputs["publish-plan-base64"],
    outputs["publish-plan-sha256"],
    restored,
  );
  assert.equal(readFileSync(restored, "utf8"), current.raw);
});

test("publish plan export fails closed for missing or ambiguous plans", async (t) => {
  const empty = mkdtempSync(join(tmpdir(), "publish-plan-empty-"));
  const current = fixture();
  t.after(() => rmSync(empty, { recursive: true, force: true }));
  t.after(() => rmSync(current.root, { recursive: true, force: true }));
  await assert.rejects(
    exportPublishPlan(empty, join(empty, "output")),
    /expected exactly one publish plan, found 0/,
  );
  const second = join(current.root, "changeset-publish-plan-2");
  mkdirSync(second);
  writeFileSync(join(second, "publish-plan.json"), current.raw);
  await assert.rejects(
    exportPublishPlan(current.root, current.output),
    /expected exactly one publish plan, found 2/,
  );
});

test("publish plan restore rejects tampered content and invalid documents", async (t) => {
  const current = fixture();
  t.after(() => rmSync(current.root, { recursive: true, force: true }));
  await exportPublishPlan(current.root, current.output);
  const outputs = parseOutputs(current.output);
  await assert.rejects(
    restorePublishPlan(
      outputs["publish-plan-base64"],
      "0".repeat(64),
      join(current.root, "tampered.json"),
    ),
    /SHA-256 mismatch/,
  );
  const invalid = Buffer.from(
    JSON.stringify({ version: 1, plan: [] }),
  ).toString("base64");
  await assert.rejects(
    restorePublishPlan(
      invalid,
      outputs["publish-plan-sha256"],
      join(current.root, "invalid.json"),
    ),
    /non-empty plan/,
  );
});
