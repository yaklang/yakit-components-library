import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  assertCredentialFree,
  extractWorkflowJobs,
  isFullShaActionReference,
  thirdPartyActionReferences,
} from "./helpers/release-contracts.mjs";

const root = resolve(import.meta.dirname, "../..");
const workflow = (name) => {
  const file = join(root, ".github/workflows", name);
  assert.ok(existsSync(file), `${name} must exist`);
  return readFileSync(file, "utf8");
};

test("CI workflow has no publish credential or OIDC authority", () => {
  const source = workflow("ci.yml");
  assertCredentialFree("ci.yml", source);
  assert.doesNotMatch(source, /id-token:\s*write/);
  assert.doesNotMatch(
    source,
    /npm\s+publish|changesets\/action\/publish|pull_request_target/,
  );
});

test("all third-party workflow actions are pinned to full commit SHAs", () => {
  for (const name of ["ci.yml", "publish.yml"]) {
    const references = thirdPartyActionReferences(workflow(name));
    assert.ok(references.length > 0, `${name} must use reviewed actions`);
    assert.deepEqual(
      references.filter((reference) => !isFullShaActionReference(reference)),
      [],
      `${name} contains mutable action references`,
    );
  }
});

test("release actions use the reviewed upstream commit SHAs", () => {
  const reviewed = new Map([
    ["actions/checkout", "3d3c42e5aac5ba805825da76410c181273ba90b1"],
    ["actions/setup-node", "820762786026740c76f36085b0efc47a31fe5020"],
    ["actions/upload-artifact", "330a01c490aca151604b8cf639adc76d48f6c5d4"],
    ["actions/download-artifact", "018cc2cf5baa6db3ef3c5f8a56943fffe632ef53"],
    ["pnpm/action-setup", "fc06bc1257f339d1d5d8b3a19a8cae5388b55320"],
    // v2.1.1 is annotated: pin the peeled commit, not the tag-object SHA.
    [
      "changesets/action/select-mode",
      "8488615a623b1b9c987934bb89eae8af6a946ac1",
    ],
    ["changesets/action/version", "8488615a623b1b9c987934bb89eae8af6a946ac1"],
    ["changesets/action/pack", "8488615a623b1b9c987934bb89eae8af6a946ac1"],
    ["changesets/action/publish", "8488615a623b1b9c987934bb89eae8af6a946ac1"],
  ]);
  const references = ["ci.yml", "publish.yml"].flatMap((name) =>
    thirdPartyActionReferences(workflow(name)),
  );
  for (const reference of references) {
    const split = reference.lastIndexOf("@");
    const action = reference.slice(0, split);
    const sha = reference.slice(split + 1);
    assert.equal(
      sha,
      reviewed.get(action),
      `${action} must use its reviewed SHA`,
    );
  }
});

test("publish workflow defaults to no workflow-level authority", () => {
  const source = workflow("publish.yml");
  assert.match(source, /^permissions:\s*\{\}\s*$/m);
  assert.doesNotMatch(source, /actions:\s*write/);
  assertCredentialFree("publish.yml", source);
});

test("only publish job receives OIDC authority", () => {
  const jobs = extractWorkflowJobs(workflow("publish.yml"));
  const oidcJobs = [...jobs]
    .filter(([, source]) => /id-token:\s*write/.test(source))
    .map(([name]) => name);
  assert.deepEqual(oidcJobs, ["publish"]);
});

test("publish authority is protected and cannot write repository contents", () => {
  const job = extractWorkflowJobs(workflow("publish.yml")).get("publish") ?? "";
  assert.match(job, /environment:\s*(?:name:\s*)?npm-release/);
  assert.match(job, /contents:\s*read/);
  assert.doesNotMatch(job, /contents:\s*write/);
  assert.match(job, /--ignore-scripts/);
});

test("OIDC publishing requires an explicit repository opt-in", () => {
  const job = extractWorkflowJobs(workflow("publish.yml")).get("publish") ?? "";
  assert.match(job, /vars\.NPM_TRUSTED_PUBLISHING_ENABLED\s*==\s*'true'/);
});

test("publish action disables GitHub tag and release creation", () => {
  const job = extractWorkflowJobs(workflow("publish.yml")).get("publish") ?? "";
  assert.match(job, /create-github-releases:\s*(?:false|['"]false['"])/);
  assert.match(job, /push-git-tags:\s*(?:false|['"]false['"])/);
});

test("verification and publish consume the same Changesets pack artifact output", () => {
  const jobs = extractWorkflowJobs(workflow("publish.yml"));
  const reference = /needs\.build-and-pack\.outputs\.pack-dir-artifact-id/;
  assert.match(jobs.get("verify-pack") ?? "", reference);
  assert.match(jobs.get("publish") ?? "", reference);
});

test("publish job cannot rebuild the verified package artifact", () => {
  const job = extractWorkflowJobs(workflow("publish.yml")).get("publish") ?? "";
  assert.doesNotMatch(
    job,
    /build:package|build-storybook|\bvite\b|\btsc\b|pnpm\s+(?:run\s+)?build/,
  );
});

test("trusted workflow checkouts never persist Git credentials", () => {
  const source = workflow("publish.yml");
  const checkoutCount = (source.match(/uses:\s*actions\/checkout@/g) ?? [])
    .length;
  const hardenedCount = (source.match(/persist-credentials:\s*false/g) ?? [])
    .length;
  assert.ok(checkoutCount > 0);
  assert.equal(hardenedCount, checkoutCount);
});

test("post-publish and metadata fan out directly from publish", () => {
  const jobs = extractWorkflowJobs(workflow("publish.yml"));
  for (const name of ["post-publish", "metadata"]) {
    const job = jobs.get(name) ?? "";
    assert.match(
      job,
      /needs:\s*(?:-\s*)?publish|needs:\s*\[[^\]]*\bpublish\b[^\]]*\]/,
    );
    const sibling = name === "post-publish" ? "metadata" : "post-publish";
    assert.doesNotMatch(
      job,
      new RegExp(`needs:[\\s\\S]{0,120}-\\s*${sibling}\\b`),
    );
  }
});

test("cross-run recovery separates artifact reads from metadata writes", () => {
  const jobs = extractWorkflowJobs(workflow("publish.yml"));
  const verifier = jobs.get("recovery-verify") ?? "";
  const writer = jobs.get("recovery-metadata") ?? "";
  assert.match(verifier, /actions:\s*read/);
  assert.match(verifier, /contents:\s*read/);
  assert.doesNotMatch(verifier, /contents:\s*write|id-token:\s*write/);
  assert.match(verifier, /source_run_id/);
  assert.match(verifier, /artifact/i);
  assert.match(writer, /contents:\s*write/);
  assert.doesNotMatch(
    writer,
    /actions:\s*read|id-token:\s*write|npm\s+publish|\bpack\b|\bbuild\b/,
  );
});

test("verification artifacts are retained for the recovery window", () => {
  const source = workflow("publish.yml");
  const retentions = [...source.matchAll(/retention-days:\s*(\d+)/g)].map(
    (match) => Number(match[1]),
  );
  assert.ok(
    retentions.length > 0,
    "at least one release artifact must declare retention",
  );
  assert.ok(retentions.every((days) => days >= 30));
});

test("workflow release script references exist in the repository", () => {
  for (const name of ["ci.yml", "publish.yml"]) {
    const source = workflow(name);
    const scripts = [
      ...source.matchAll(
        /\bnode\s+(scripts\/release\/[A-Za-z0-9._/-]+\.mjs)\b/g,
      ),
    ].map((match) => match[1]);
    for (const script of scripts) {
      assert.ok(
        existsSync(join(root, script)),
        `${name} references missing ${script}`,
      );
    }
  }
});
