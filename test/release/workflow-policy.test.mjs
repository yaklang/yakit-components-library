import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import test from 'node:test'

import {
  assertCredentialFree,
  extractWorkflowJobs,
  isFullShaActionReference,
  thirdPartyActionReferences,
} from './helpers/release-contracts.mjs'

const root = resolve(import.meta.dirname, '../..')
const workflow = (name) => {
  const file = join(root, '.github/workflows', name)
  assert.ok(existsSync(file), `${name} must exist`)
  return readFileSync(file, 'utf8')
}

test('CI workflow has no publish credential or OIDC authority', () => {
  const source = workflow('ci.yml')
  assertCredentialFree('ci.yml', source)
  assert.doesNotMatch(source, /id-token:\s*write/)
  assert.doesNotMatch(source, /npm\s+publish|changesets\/action\/publish|pull_request_target/)
})

test('CI and release selection check deferrals, and packing checks the exact publish plan', () => {
  const jobs = extractWorkflowJobs(workflow('publish.yml'))
  assert.match(workflow('ci.yml'), /pnpm run release:deferral-check/)
  const selector = jobs.get('select-mode') ?? ''
  assert.ok(selector.indexOf('pnpm run release:deferral-check') >= 0)
  assert.ok(
    selector.indexOf('pnpm run release:deferral-check') < selector.indexOf('uses: changesets/action/select-mode'),
  )
  const build = jobs.get('build-and-pack') ?? ''
  const check = build.indexOf('pnpm run release:deferral-check --publish-plan .release/publish-plan/publish-plan.json')
  assert.ok(check > build.indexOf('publish-plan-job-output.mjs restore'))
  assert.ok(check < build.indexOf('uses: changesets/action/pack'))
})

test('CI consumers reuse icon builds and publish verification gates auto-import', () => {
  const jobs = extractWorkflowJobs(workflow('ci.yml'))
  const icons = jobs.get('icons') ?? ''
  const ui = jobs.get('ui') ?? ''
  assert.match(icons, /run: pnpm --filter @yakit-libs\/yakit-ui-icons run build/)
  assert.match(ui, /needs: \[scope, icons\]/)
  assert.match(ui, /name: icons-dist/)
  assert.match(ui, /run: pnpm run test:auto-import/)
  assert.match(ui, /run: pnpm --filter @yakit-libs\/yakit-ui run build:package:prepared/)
  const publish = extractWorkflowJobs(workflow('publish.yml')).get('build-and-pack') ?? ''
  const autoImport = publish.indexOf('run: pnpm run test:auto-import')
  for (const command of [
    'run: pnpm --filter @yakit-libs/yakit-ui-icons run build',
    'run: pnpm --filter @yakit-libs/yakit-ui run build:package:prepared',
  ])
    assert.ok(publish.indexOf(command) >= 0 && publish.indexOf(command) < autoImport)
})

test('all third-party workflow actions are pinned to full commit SHAs', () => {
  for (const name of ['ci.yml', 'publish.yml']) {
    const references = thirdPartyActionReferences(workflow(name))
    assert.ok(references.length > 0, `${name} must use reviewed actions`)
    assert.deepEqual(
      references.filter((reference) => !isFullShaActionReference(reference)),
      [],
      `${name} contains mutable action references`,
    )
  }
})

test('release actions use the reviewed upstream commit SHAs', () => {
  const reviewed = new Map([
    ['actions/checkout', '3d3c42e5aac5ba805825da76410c181273ba90b1'],
    ['actions/setup-node', '820762786026740c76f36085b0efc47a31fe5020'],
    ['actions/upload-artifact', '330a01c490aca151604b8cf639adc76d48f6c5d4'],
    ['actions/download-artifact', '018cc2cf5baa6db3ef3c5f8a56943fffe632ef53'],
    ['pnpm/action-setup', 'fc06bc1257f339d1d5d8b3a19a8cae5388b55320'],
    // v2.1.1 is annotated: pin the peeled commit, not the tag-object SHA.
    ['changesets/action/select-mode', '8488615a623b1b9c987934bb89eae8af6a946ac1'],
    ['changesets/action/version', '8488615a623b1b9c987934bb89eae8af6a946ac1'],
    ['changesets/action/pack', '8488615a623b1b9c987934bb89eae8af6a946ac1'],
  ])
  const references = ['ci.yml', 'publish.yml'].flatMap((name) => thirdPartyActionReferences(workflow(name)))
  for (const reference of references) {
    const split = reference.lastIndexOf('@')
    const action = reference.slice(0, split)
    const sha = reference.slice(split + 1)
    assert.equal(sha, reviewed.get(action), `${action} must use its reviewed SHA`)
  }
})

test('publish workflow defaults to no workflow-level authority', () => {
  const source = workflow('publish.yml')
  assert.match(source, /^permissions:\s*\{\}\s*$/m)
  assert.doesNotMatch(source, /actions:\s*write/)
  assertCredentialFree('publish.yml', source)
})

test('normal, prerelease, and recovery publication share one global lock', () => {
  const source = workflow('publish.yml')
  assert.match(source, /concurrency:\s*\n\s*group:\s*yakit-ui-npm-release\s*\n\s*cancel-in-progress:\s*false/)
  assert.doesNotMatch(source, /group:[^\n]*(?:github\.ref|github\.workflow)/)
})

test('publish and recovery fail closed on cutover and exact impact evidence', () => {
  const source = workflow('publish.yml')
  const jobs = extractWorkflowJobs(source)
  const selector = jobs.get('select-mode') ?? ''
  const build = jobs.get('build-and-pack') ?? ''
  const verifier = jobs.get('verify-pack') ?? ''
  const recovery = jobs.get('recovery-verify') ?? ''
  for (const job of [selector, recovery]) {
    assert.match(job, /collect-release-cutover-evidence\.mjs/)
    assert.match(job, /release-cutover-preflight\.mjs/)
  }
  assert.match(build, /release-impact\.mjs/)
  assert.match(build, /--from-release-tags --build-isolated/)
  assert.match(build, /publish-plan\.json/)
  assert.match(selector, /publish-plan-job-output\.mjs export/)
  assert.match(selector, /publish-plan-base64/)
  assert.match(selector, /publish-plan-sha256/)
  assert.match(build, /publish-plan-job-output\.mjs restore/)
  assert.doesNotMatch(build, /Download exact Changesets publish plan/)
  assert.doesNotMatch(build, /publish-plan-artifact-id:/)
  assert.match(build, /Upload immutable release impact evidence/)
  assert.match(verifier, /needs\.build-and-pack\.outputs\.impact-artifact-id/)
  assert.match(verifier, /RELEASE_IMPACT_OUTPUT:/)
  const preparation = readFileSync(join(root, 'scripts/release/prepare-verification-artifact.mjs'), 'utf8')
  assert.match(preparation, /impactProbesForRelease/)
  assert.match(preparation, /impactProbeSet/)
})

test('only protected publication jobs receive OIDC authority', () => {
  const jobs = extractWorkflowJobs(workflow('publish.yml'))
  const oidcJobs = [...jobs].filter(([, source]) => /id-token:\s*write/.test(source)).map(([name]) => name)
  assert.deepEqual(oidcJobs, ['publish', 'recovery-publish'])
})

test('publish authority is protected and cannot write repository contents', () => {
  const jobs = extractWorkflowJobs(workflow('publish.yml'))
  for (const name of ['publish', 'recovery-publish']) {
    const job = jobs.get(name) ?? ''
    assert.match(job, /environment:\s*(?:name:\s*)?npm-release/)
    assert.match(job, /contents:\s*read/)
    assert.doesNotMatch(job, /contents:\s*write/)
  }
  assert.match(jobs.get('publish') ?? '', /--ignore-scripts/)
})

test('OIDC publishing requires an explicit repository opt-in', () => {
  const jobs = extractWorkflowJobs(workflow('publish.yml'))
  for (const name of ['publish', 'recovery-publish'])
    assert.match(jobs.get(name) ?? '', /vars\.NPM_TRUSTED_PUBLISHING_ENABLED\s*==\s*'true'/)
})

test('normal publish consumes exact verified tarballs without Changesets publish', () => {
  const job = extractWorkflowJobs(workflow('publish.yml')).get('publish') ?? ''
  assert.doesNotMatch(job, /changesets\/action\/publish/)
  assert.match(job, /publish-verification-artifact\.mjs/)
  assert.match(job, /\.release\/verified/)
  assert.match(job, /\.release\/publish-intent/)
  assert.doesNotMatch(job, /create-github-releases|push-git-tags/)
})

test('verification and publish consume the same Changesets pack artifact output', () => {
  const jobs = extractWorkflowJobs(workflow('publish.yml'))
  const reference = /needs\.build-and-pack\.outputs\.pack-dir-artifact-id/
  assert.match(jobs.get('verify-pack') ?? '', reference)
  assert.match(jobs.get('publish') ?? '', reference)
})

test('tarball verification installs pnpm before running strict-layout consumers', () => {
  const job = extractWorkflowJobs(workflow('publish.yml')).get('verify-pack') ?? ''
  const setup = 'uses: pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320'
  const smoke = 'run: node scripts/release/verify-tarball-consumer.mjs .release/verified'
  const setupIndex = job.indexOf(setup)
  const smokeIndex = job.indexOf(smoke)
  const sealIndex = job.indexOf('record-verification-gate.mjs')
  const sizeIndex = job.indexOf('verify-icons-size-gate.mjs')
  const installIndex = job.indexOf('run: pnpm install --frozen-lockfile --ignore-scripts')
  assert.ok(setupIndex >= 0, 'verify-pack must install the reviewed pnpm action')
  assert.match(job, /version:\s*10\.34\.5/)
  assert.ok(smokeIndex >= 0, 'verify-pack must run the strict-layout smoke test')
  assert.ok(setupIndex < smokeIndex, 'verify-pack must install pnpm before smoke tests')
  assert.ok(
    installIndex > setupIndex && installIndex < sizeIndex,
    'verify-pack must install size verification tooling before the exact icons size gate',
  )
  assert.ok(smokeIndex < sealIndex, 'the consumer gate must be sealed only after the exact consumer passes')
  assert.ok(
    sizeIndex >= 0 && sizeIndex < smokeIndex,
    'the exact icons size report must be bound before consumer verification',
  )
  const sizeGate = readFileSync(join(root, 'scripts/release/verify-icons-size-gate.mjs'), 'utf8')
  assert.match(sizeGate, /if \(!icons\)/)
  assert.match(sizeGate, /sizeGate:\s*['"]skipped['"]/)
  assert.match(sizeGate, /entry\.name === ['"]@yakit-libs\/yakit-ui-icons['"]|@yakit-libs\/yakit-ui-icons/)
})

test('CI validates both build surfaces while the publish artifact selects a non-empty releaseSet', () => {
  const ci = workflow('ci.yml')
  const publishBuild = extractWorkflowJobs(workflow('publish.yml')).get('build-and-pack') ?? ''
  for (const source of [ci, publishBuild]) {
    assert.match(source, /--filter @yakit-libs\/yakit-ui run build:package/)
    assert.match(source, /--filter @yakit-libs\/yakit-ui-icons run build/)
    assert.match(source, /--filter @yakit-libs\/yakit-ui-icons run verify:package/)
    assert.match(source, /--dir storybook run test:icons/)
  }
  assert.match(publishBuild, /changesets\/action\/pack/)
  assert.match(workflow('publish.yml'), /release-matrix/)
})

test('partial recovery publishes no rebuilt or already-published package', () => {
  const job = extractWorkflowJobs(workflow('publish.yml')).get('recovery-publish') ?? ''
  const publisher = readFileSync(join(root, 'scripts/release/publish-verification-artifact.mjs'), 'utf8')
  assert.match(job, /publish-verification-artifact\.mjs[\s\S]*\.release\/recovery[\s\S]*\.release\/recovery-intent/)
  assert.match(publisher, /['"]--ignore-scripts['"]/)
  assert.doesNotMatch(
    publisher,
    /['"]--provenance['"]/,
    'Trusted Publishing must decide provenance automatically so private repositories remain publishable',
  )
  assert.doesNotMatch(job, /\bbuild\b|\bvite\b|\btsc\b|changesets\/action\/publish/)
  assert.match(job, /id-token:\s*write/)
  assert.match(job, /actions:\s*read/)
})

test('durable PROCESSING intent is uploaded before either OIDC publisher can run', () => {
  const jobs = extractWorkflowJobs(workflow('publish.yml'))
  const verifier = jobs.get('verify-pack') ?? ''
  const publisher = jobs.get('publish') ?? ''
  const recoveryVerifier = jobs.get('recovery-verify') ?? ''
  const recoveryPublisher = jobs.get('recovery-publish') ?? ''
  assert.ok(
    verifier.indexOf('prepare-publication-attempt.mjs') <
      verifier.indexOf('Upload durable pre-side-effect publication intent'),
  )
  assert.match(verifier, /publication-intent-artifact-id/)
  assert.match(publisher, /publication-intent-artifact-id/)
  assert.match(publisher, /PUBLICATION_INTENT_ARTIFACT_DIGEST/)
  assert.match(publisher, /Upload append-only publication receipt[\s\S]*if: always\(\)/)
  assert.match(recoveryVerifier, /prepare-publication-attempt\.mjs/)
  assert.match(recoveryVerifier, /Upload durable pre-side-effect recovery intent/)
  assert.match(recoveryPublisher, /PUBLICATION_INTENT_ARTIFACT_DIGEST/)
  assert.match(recoveryPublisher, /Upload append-only recovery receipt[\s\S]*if: always\(\)/)
})

test('private repository provenance recovery is evidence-bound and explicitly authorized', () => {
  const source = workflow('publish.yml')
  const jobs = extractWorkflowJobs(source)
  const recoveryVerifier = jobs.get('recovery-verify') ?? ''
  const recoveryPublisher = jobs.get('recovery-publish') ?? ''
  assert.match(source, /incident_id:/)
  assert.doesNotMatch(source, /private_provenance_rejection_job_id:/)
  assert.match(
    recoveryVerifier,
    /Resolve the exact checked-in private provenance incident[\s\S]*private-provenance-recovery\.mjs/,
  )
  assert.match(
    recoveryVerifier,
    /Re-enforce cutover with the exact incident resolution[\s\S]*RELEASE_INCIDENT_RESOLUTION/,
  )
  assert.match(recoveryVerifier, /Upload append-only incident resolution/)
  assert.match(recoveryVerifier, /AUTHORIZE_PUBLICATION_RETRY/)
  assert.match(recoveryVerifier, /RETRY_INTENT_ARTIFACT_ID/)
  assert.match(recoveryVerifier, /RETRY_RECEIPT_ARTIFACT_ID/)
  assert.match(recoveryVerifier, /GITHUB_TOKEN/)
  const preparation = readFileSync(join(root, 'scripts/release/prepare-publication-attempt.mjs'), 'utf8')
  assert.match(preparation, /bindPrivateProvenanceResolutionArtifact/)
  assert.match(preparation, /definitiveNoApplyEvidence/)
  assert.match(recoveryPublisher, /Download exact append-only incident resolution/)
  assert.match(recoveryPublisher, /PRIVATE_PROVENANCE_RESOLUTION_ARTIFACT_ID/)
})

test('verification evidence contains a manifest-bound immutable publication outbox', () => {
  const preparation = readFileSync(join(root, 'scripts/release/prepare-verification-artifact.mjs'), 'utf8')
  const consumer = readFileSync(join(root, 'scripts/release/publication-consumer.mjs'), 'utf8')
  assert.match(preparation, /transactional-outbox\.json/)
  assert.match(preparation, /manifest\.publicationOutbox/)
  assert.match(consumer, /PUBLISH_INTENT_DURABLY_RECORDED/)
  assert.match(consumer, /DURABLE_INTENT_ARTIFACT_VALIDATED/)
  assert.match(consumer, /is UNKNOWN because its durable success receipt is missing; replay is forbidden/)
  assert.match(consumer, /authorized retry dual evidence identity mismatch/)
  assert.match(consumer, /AMBIGUOUS is never retry authority/)
  assert.match(consumer, /registryAbsenceEvidence/)
  assert.match(consumer, /evidenceHash !== payloadHash\(payload\)/)
  const publisher = readFileSync(join(root, 'scripts/release/publish-verification-artifact.mjs'), 'utf8')
  assert.match(publisher, /error\.publicationOutcome = ['"]NOT_ATTEMPTED['"]/)
})

test('recovery metadata waits until no verified package is missing', () => {
  const job = extractWorkflowJobs(workflow('publish.yml')).get('recovery-metadata') ?? ''
  assert.match(job, /recovery-publish\.result == 'success'/)
  assert.match(job, /has-missing == 'false'/)
  assert.doesNotMatch(
    job,
    /recovery-publish\.result == 'success'\s*\|\|\s*needs\.recovery-publish\.result == 'skipped'/,
  )
})

test('recovery metadata uses the package identity emitted by evidence validation', () => {
  const source = workflow('publish.yml')
  const metadata = extractWorkflowJobs(source).get('recovery-metadata') ?? ''
  assert.match(source, /release-matrix:\s*\$\{\{\s*steps\.identity\.outputs\.release-matrix\s*\}\}/)
  assert.match(metadata, /matrix:\s*\$\{\{ fromJSON\(needs\.recovery-verify\.outputs\.release-matrix\) \}\}/)
  assert.match(metadata, /PACKAGE_NAME:\s*\$\{\{ matrix\.package \}\}/)

  const recovery = readFileSync(join(root, 'scripts/release/recover-partial-publication.mjs'), 'utf8')
  assert.match(recovery, /['"]package-name['"]:\s*primaryPackageName/)
  assert.match(recovery, /['"]tag-name['"]:\s*`\$\{primaryPackageName\}@/)

  const reconciler = readFileSync(join(root, 'scripts/release/reconcile-github-metadata.mjs'), 'utf8')
  assert.match(reconciler, /['"]yakit-ui['"]/)
  assert.match(reconciler, /['"]@yakit-libs\/yakit-ui['"]/)
  assert.match(reconciler, /['"]@yakit-libs\/yakit-ui-icons['"]/)
  assert.match(reconciler, /tag !== `\$\{packageName\}@\$\{packageVersion\}`/)
})

test('post-publish smoke verifies exactly the release matrix packages', () => {
  const job = extractWorkflowJobs(workflow('publish.yml')).get('post-publish') ?? ''
  assert.match(job, /matrix:\s*\$\{\{ fromJSON\(needs\.verify-pack\.outputs\.release-matrix\) \}\}/)
  assert.match(job, /PACKAGE_NAME:\s*\$\{\{ matrix\.package \}\}/)
  assert.match(job, /PACKAGE_VERSION:\s*\$\{\{ matrix\.version \}\}/)
})

test('publish job cannot rebuild the verified package artifact', () => {
  const job = extractWorkflowJobs(workflow('publish.yml')).get('publish') ?? ''
  assert.doesNotMatch(job, /build:package|build-storybook|\bvite\b|\btsc\b|pnpm\s+(?:run\s+)?build/)
})

test('trusted workflow checkouts never persist Git credentials', () => {
  const source = workflow('publish.yml')
  const checkoutCount = (source.match(/uses:\s*actions\/checkout@/g) ?? []).length
  const hardenedCount = (source.match(/persist-credentials:\s*false/g) ?? []).length
  assert.ok(checkoutCount > 0)
  assert.equal(hardenedCount, checkoutCount)
})

test('post-publish and metadata fan out directly from publish', () => {
  const jobs = extractWorkflowJobs(workflow('publish.yml'))
  for (const name of ['post-publish', 'metadata']) {
    const job = jobs.get(name) ?? ''
    assert.match(job, /needs:\s*(?:-\s*)?publish|needs:\s*\[[^\]]*\bpublish\b[^\]]*\]/)
    const sibling = name === 'post-publish' ? 'metadata' : 'post-publish'
    assert.doesNotMatch(job, new RegExp(`needs:[\\s\\S]{0,120}-\\s*${sibling}\\b`))
  }
})

test('cross-run recovery separates artifact reads from metadata writes', () => {
  const jobs = extractWorkflowJobs(workflow('publish.yml'))
  const verifier = jobs.get('recovery-verify') ?? ''
  const writer = jobs.get('recovery-metadata') ?? ''
  assert.match(verifier, /actions:\s*read/)
  assert.match(verifier, /contents:\s*read/)
  assert.doesNotMatch(verifier, /contents:\s*write|id-token:\s*write/)
  assert.match(verifier, /source_run_id/)
  assert.match(verifier, /artifact/i)
  assert.match(writer, /contents:\s*write/)
  assert.doesNotMatch(writer, /actions:\s*read|id-token:\s*write|npm\s+publish|\bpack\b|\bbuild\b/)
})

test('verification artifacts are retained for the recovery window', () => {
  const source = workflow('publish.yml')
  const retentions = [...source.matchAll(/retention-days:\s*(\d+)/g)].map((match) => Number(match[1]))
  assert.ok(retentions.length > 0, 'at least one release artifact must declare retention')
  assert.ok(retentions.every((days) => days >= 30))
})

test('workflow release script references exist in the repository', () => {
  for (const name of ['ci.yml', 'publish.yml']) {
    const source = workflow(name)
    const scripts = [...source.matchAll(/\bnode\s+(scripts\/release\/[A-Za-z0-9._/-]+\.mjs)\b/g)].map(
      (match) => match[1],
    )
    for (const script of scripts) {
      assert.ok(existsSync(join(root, script)), `${name} references missing ${script}`)
    }
  }
})
