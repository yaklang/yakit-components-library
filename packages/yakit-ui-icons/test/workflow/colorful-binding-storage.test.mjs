import assert from 'node:assert/strict'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { planSourceImport } from '../../scripts/import-icon-sources.mjs'
import { applyChanges, packageRoot, renderImportedSvg } from '../../scripts/update-icons.mjs'

const token = '--Colors-Use-Main-Primary'
const binding = {
  figmaVariableId: 'VariableID:test',
  fallbackHex: '#F28C45',
  sourceNodeIds: ['999999:1'],
  targets: [{ locator: [0], attribute: 'fill', expectedValue: '#F28C45' }],
}
const rawSvg =
  '<svg width="48" height="48" viewBox="0 0 48 48"><path fill="#F28C45" d="M0 0H20V20Z"/><path fill="#F28C45" d="M25 25H30V30Z"/></svg>'

test('precise bindings replace only the specified paint; duplicate or stale targets fail', () => {
  const record = {
    nodeId: '1:2',
    rawSvg,
    themePaintBindings: [binding],
    variableTokens: { 'VariableID:test': token },
  }
  const output = renderImportedSvg(record, 'colorful')
  assert.match(output, /fill="var\(--Colors-Use-Main-Primary, #F28C45\)"/)
  assert.match(output, /<path fill="#F28C45" d="M25/)
  assert.throws(() => renderImportedSvg({ ...record, themePaintBindings: [binding, binding] }, 'colorful'), /AMBIGUOUS/)
  assert.throws(
    () => renderImportedSvg({ ...record, rawSvg: rawSvg.replace('#F28C45', '#000000') }, 'colorful'),
    /AMBIGUOUS/,
  )
  assert.throws(
    () => renderImportedSvg({ ...record, themePaintBindings: [{ ...binding, targets: [] }] }, 'colorful'),
    /TARGET_REQUIRED/,
  )
})

test('source stores bindings separately from token policy and captured evidence; imports are idempotent', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yakit-binding-storage-'))
  try {
    await cp(path.join(packageRoot, 'config'), path.join(root, 'config'), { recursive: true })
    const svgPath = path.join(root, 'input.svg')
    await writeFile(svgPath, rawSvg)
    const icon = {
      url: 'https://www.figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/Icons?node-id=999999-1',
      family: 'colorful',
      groupNodeId: '37202:12895',
      name: 'colorful/binding-fixture',
      nodeType: 'COMPONENT',
      width: 48,
      height: 48,
      svgPath,
      colorBindings: { status: 'captured', bindings: [binding] },
      variableTokens: { 'VariableID:test': token },
      evidence: { component: { nodeType: 'COMPONENT' } },
    }
    const plan = () => planSourceImport({ schemaVersion: 1, icons: [icon] }, root)
    const realToken = icon.variableTokens['VariableID:test']
    icon.variableTokens['VariableID:test'] = '--Unknown-Project-Color'
    await assert.rejects(plan(), /COLOR_TOKEN_UNKNOWN/)
    icon.variableTokens['VariableID:test'] = realToken
    const first = await plan()
    const source = JSON.parse(first.changes.get('config/icon-sources/colorful.json').after)
    const record = source.records.find((r) => r.nodeId === '999999:1')
    assert.deepEqual(record.colorBindings, { status: 'captured', bindings: [binding] })
    assert.equal(record.rawSvg, undefined)
    assert.equal(record.colorBindings.bindings[0].token, undefined)
    assert.ok(first.changes.has(`config/icon-sources/${record.evidenceFile}`))
    assert.equal(first.changes.get(`config/icon-sources/${record.svgFile}`).after, rawSvg)
    await applyChanges(root, first.changes)
    assert.equal((await plan()).changes.size, 0)
    icon.colorBindings = { status: 'none', bindings: [] }
    const next = await plan()
    await applyChanges(root, next.changes)
    assert.equal(
      JSON.parse(await readFile(path.join(root, 'config/icon-sources/colorful.json'), 'utf8')).records.at(-1)
        .colorBindings.status,
      'none',
    )
    delete icon.colorBindings
    await writeFile(svgPath, rawSvg.replace('M0 0', 'M1 1'))
    const changed = await plan()
    assert.equal(
      JSON.parse(changed.changes.get('config/icon-sources/colorful.json').after).records.at(-1).colorBindings.status,
      'unknown',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
