import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { colorfulStoryGroups } from '../../scripts/icons/storybook.mjs'
import { runWorkspaceIconUpdate } from '../../scripts/icons/update.mjs'

const fixture = () => ({
  groups: [
    {
      category: 'file-type',
      name: 'Files',
      storybook: { preferredNodeOrder: ['1:2', '1:1'] },
    },
  ],
  records: ['1:1', '1:2', '1:3'].map((nodeId) => ({
    nodeId,
    category: 'file-type',
    publicExposure: 'canonical',
  })),
})

test('new icons append without changing existing display order; new groups gain navigation', () => {
  const source = fixture()
  source.records.push({
    nodeId: '2:1',
    category: 'new-group',
    publicExposure: 'semantic-alias',
  })
  source.records.push({
    nodeId: '2:2',
    category: 'new-group',
    publicExposure: 'none',
  })
  source.groups.push({ category: 'new-group', name: 'New group' })
  const groups = colorfulStoryGroups(source)
  assert.deepEqual(groups[0].nodeIds, ['1:2', '1:1', '1:3'])
  assert.deepEqual(groups[1], {
    category: 'new-group',
    label: 'New group',
    exportName: 'NewGroup',
    nodeIds: ['2:1'],
  })
})

test('invalid order, missing groups and conflicting story names fail instead of hiding icons', () => {
  const source = fixture()
  source.groups[0].storybook.preferredNodeOrder = ['missing']
  assert.throws(() => colorfulStoryGroups(source), /STORYBOOK_ORDER_INVALID/)
  source.groups[0].storybook.preferredNodeOrder = ['1:1', '1:1']
  assert.throws(() => colorfulStoryGroups(source), /STORYBOOK_ORDER_INVALID/)
  source.groups[0].storybook.preferredNodeOrder = []
  source.groups[0].storybook.exportName = 'Overview'
  assert.throws(() => colorfulStoryGroups(source), /STORYBOOK_EXPORT_INVALID/)
  delete source.groups[0].storybook.exportName
  source.records[0].category = 'missing'
  assert.throws(() => colorfulStoryGroups(source), /STORYBOOK_CATEGORY_MISSING/)
})

test('root update covers new icons and navigation, checks drift without writing and respects family selection', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yakit-storybook-update-'))
  const read = (file) => readFile(path.join(root, file), 'utf8')
  const write = (file, value) => writeFile(path.join(root, file), value)
  const sourcePath = 'packages/yakit-ui-icons/config/icon-sources/colorful.json'
  const storyPath = 'storybook/stories/icons/Icon.stories.tsx'
  const generatedPath = 'storybook/stories/icons/icon-colorful.generated.ts'
  try {
    for (const dir of [
      'packages/yakit-ui-icons/config',
      'packages/yakit-ui-icons/src',
      'packages/yakit-ui/src/components',
      'packages/yakit-ui/config/icon-sources',
      'storybook/stories/icons',
    ]) {
      await mkdir(path.dirname(path.join(root, dir)), { recursive: true })
      await cp(new URL(`../../${dir}`, import.meta.url), path.join(root, dir), {
        recursive: true,
      })
    }
    await runWorkspaceIconUpdate([], root)
    const source = JSON.parse(await read(sourcePath))
    const projectPath = 'packages/yakit-ui-icons/config/icon-project/colorful.json'
    const project = JSON.parse(await read(projectPath))
    const displayPath = 'packages/yakit-ui-icons/config/icon-display.json'
    const display = JSON.parse(await read(displayPath))
    const template = source.records.find((row) => project.records[row.nodeId].exportName === 'AddFileTypeColorful')
    source.records.push({
      ...template,
      nodeId: '99999:1',
      svgFile: `svg/${source.fileKey}/99999-1.svg`,
      colorBindings: { status: 'unknown', bindings: [] },
    })
    project.records['99999:1'] = {
      exportName: 'NewFileTypeColorful',
      file: 'colorful/99999-1.svg',
    }
    await write(
      `packages/yakit-ui-icons/config/icon-sources/svg/${source.fileKey}/99999-1.svg`,
      '<svg width="48" height="48" viewBox="0 0 48 48"><path d="M1 1H40" fill="#123456"/></svg>',
    )
    // Verify that static navigation exports are regenerated from source metadata.
    const group = Object.values(display.families.colorful.groups).find((g) => g.category === 'colorful-icon')
    group.storybook.exportName = 'NewColorfulGroup'
    await write(sourcePath, JSON.stringify(source, null, 2) + '\n')
    await write(projectPath, JSON.stringify(project, null, 2) + '\n')
    await write(displayPath, JSON.stringify(display, null, 2) + '\n')
    const before = await read(storyPath)
    const beforeCatalog = await read(generatedPath)
    await assert.rejects(runWorkspaceIconUpdate(['--check'], root), /ICON_GENERATED_DRIFT[\s\S]*Icon.stories.tsx/)
    assert.equal(await read(storyPath), before)
    assert.equal(await read(generatedPath), beforeCatalog)
    // Invalid presentation must prevent even public SVG writes.
    group.storybook.exportName = 'Overview'
    await write(sourcePath, JSON.stringify(source, null, 2) + '\n')
    await write(projectPath, JSON.stringify(project, null, 2) + '\n')
    await write(displayPath, JSON.stringify(display, null, 2) + '\n')
    await assert.rejects(runWorkspaceIconUpdate([], root), /STORYBOOK_EXPORT_INVALID/)
    await assert.rejects(read('packages/yakit-ui-icons/src/colorful/99999-1.svg'), /ENOENT/)
    group.storybook.exportName = 'NewColorfulGroup'
    await write(sourcePath, JSON.stringify(source, null, 2) + '\n')
    await write(projectPath, JSON.stringify(project, null, 2) + '\n')
    await write(displayPath, JSON.stringify(display, null, 2) + '\n')
    await runWorkspaceIconUpdate(['--family', 'colorful'], root)
    assert.match(await read(storyPath), /export const NewColorfulGroup/)
    assert.match(await read(generatedPath), /99999:1/)
    const offlinePage = 'packages/yakit-ui-icons/catalog/index.html'
    assert.match(await read(offlinePage), /NewFileTypeColorful/)
    assert.match(await read(offlinePage), /99999:1/)
    assert.match(await read('packages/yakit-ui-icons/src/colorful/99999-1.svg'), /#123456/)
    assert.match(await runWorkspaceIconUpdate([], root), /UPDATED 0 file/)
    assert.match(await runWorkspaceIconUpdate(['--check'], root), /CHECK_OK 0 file/)
    await write(offlinePage, 'stale catalog\n')
    await assert.rejects(runWorkspaceIconUpdate(['--check'], root), /catalog\/index.html/)
    assert.equal(await read(offlinePage), 'stale catalog\n')
    await runWorkspaceIconUpdate([], root)
    assert.match(await read(offlinePage), /NewFileTypeColorful/)
    await write(generatedPath, '// stale\n')
    await assert.rejects(
      runWorkspaceIconUpdate(['--family', 'colorful', '--check'], root),
      /icon-colorful.generated.ts/,
    )
    await runWorkspaceIconUpdate(['--family', 'outline'], root)
    assert.equal(await read(generatedPath), '// stale\n')
    await runWorkspaceIconUpdate(['--family', 'colorful'], root)
    assert.match(await runWorkspaceIconUpdate(['--check'], root), /CHECK_OK 0 file/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
