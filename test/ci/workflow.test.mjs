import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { extractWorkflowJobs } from '../release/helpers/release-contracts.mjs'
const read = (name) => readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), 'utf8')

test('PRs and prerelease pushes run CI, main pushes only enter publication', () => {
  const ci = read('ci.yml').split('permissions:')[0]
  assert.match(ci, /pull_request:/)
  assert.match(ci, /pre\/\*\*/)
  assert.doesNotMatch(ci, /- main/)
  assert.match(read('publish.yml').split('permissions:')[0], /- main/)
})
test('platform jobs cover Windows and macOS; Linux checks are reused', () => {
  const jobs = extractWorkflowJobs(read('ci.yml'))
  assert.match(jobs.get('icons'), /runs-on: ubuntu-latest/)
  assert.match(jobs.get('icon-platforms'), /os: \[windows-latest, macos-latest\]/)
  assert.match(jobs.get('icon-platforms'), /outputs.platforms == 'true'/)
})
test('aggregate preserves the required check and rejects failures or cancellation', () => {
  const summary = extractWorkflowJobs(read('ci.yml')).get('quality')
  assert.match(summary, /if: always\(\)/)
  assert.match(
    summary,
    /needs:\s*\[\s*scope,\s*repository,\s*icons,\s*ui,\s*release-tools,\s*icon-platforms,\s*icon-isolation,?\s*\]/,
  )
  const match = /node -e '([^']+)'/.exec(summary)
  assert.ok(match)
  const evaluate = (results) => {
    let exitCode = 0
    new Function('process', match[1])({
      env: { RESULTS: JSON.stringify(results) },
      exit: (code) => {
        exitCode = code
      },
    })
    return exitCode
  }
  assert.equal(evaluate({ scope: { result: 'success' }, icons: { result: 'skipped' } }), 0)
  for (const result of ['failure', 'cancelled'])
    assert.equal(evaluate({ scope: { result: 'success' }, icons: { result } }), 1)
  assert.equal(evaluate({ scope: { result: 'skipped' } }), 1)
})
