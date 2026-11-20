import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const changesetsCli = path.join(path.dirname(require.resolve('@changesets/cli/package.json')), 'bin.js')
const packages = {
  '@yakit-libs/yakit-ui': { directory: 'yakit-ui', version: '1.2.3' },
  '@yakit-libs/yakit-ui-icons': {
    directory: 'yakit-ui-icons',
    version: '2.0.0',
  },
}

function versionFixture(entries) {
  const root = mkdtempSync(path.join(tmpdir(), 'yakit-independent-version-'))
  mkdirSync(path.join(root, '.changeset'))
  mkdirSync(path.join(root, 'packages'))
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }))
  writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n')
  writeFileSync(
    path.join(root, '.changeset/config.json'),
    JSON.stringify({
      $schema: 'https://unpkg.com/@changesets/config@3.1.1/schema.json',
      access: 'public',
      baseBranch: 'main',
      changelog: false,
      commit: false,
      fixed: [],
      ignore: [],
      linked: [],
      updateInternalDependencies: 'patch',
    }),
  )
  for (const [name, item] of Object.entries(packages)) {
    const directory = path.join(root, 'packages', item.directory)
    mkdirSync(directory)
    writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name, private: false, version: item.version }))
  }
  const frontmatter = Object.entries(entries)
    .map(([name, bump]) => `"${name}": ${bump}`)
    .join('\n')
  writeFileSync(
    path.join(root, '.changeset/independent-release.md'),
    `---\n${frontmatter}\n---\n\nIndependent release fixture.\n`,
  )
  execFileSync(process.execPath, [changesetsCli, 'version'], {
    cwd: root,
    stdio: 'pipe',
  })
  return Object.fromEntries(
    Object.entries(packages).map(([name, item]) => [
      name,
      JSON.parse(readFileSync(path.join(root, 'packages', item.directory, 'package.json'), 'utf8')).version,
    ]),
  )
}

test('Changesets versions UI without coupling icons', () => {
  assert.deepEqual(versionFixture({ '@yakit-libs/yakit-ui': 'patch' }), {
    '@yakit-libs/yakit-ui': '1.2.4',
    '@yakit-libs/yakit-ui-icons': '2.0.0',
  })
})

test('Changesets versions icons without coupling UI', () => {
  assert.deepEqual(versionFixture({ '@yakit-libs/yakit-ui-icons': 'minor' }), {
    '@yakit-libs/yakit-ui': '1.2.3',
    '@yakit-libs/yakit-ui-icons': '2.1.0',
  })
})

test('Changesets permits different bumps and versions in one release', () => {
  assert.deepEqual(
    versionFixture({
      '@yakit-libs/yakit-ui': 'patch',
      '@yakit-libs/yakit-ui-icons': 'minor',
    }),
    {
      '@yakit-libs/yakit-ui': '1.2.4',
      '@yakit-libs/yakit-ui-icons': '2.1.0',
    },
  )
})
