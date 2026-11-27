import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { colorfulIconRegistry, outlineIconRegistry, solidIconRegistry } from '@yakit-libs/yakit-ui-icons/registry'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { readIconInputSync } from '../../../packages/yakit-ui-icons/scripts/icon-source-documents.mjs'
import iconStory, * as iconStories from '../../stories/icons/Icon.stories'

const colorfulManifest: {
  groups: {
    category: string
    name: string
    storybook?: { label?: string; exportName?: string }
  }[]
  rows: {
    nodeId: string
    category: string
    exportName: string
    publicExposure: string
  }[]
} = JSON.parse(
  readIconInputSync(
    new URL('../../../packages/yakit-ui-icons/config/icon-sources/colorful.json#manifest', import.meta.url),
    'utf8',
  ),
)

const storiesRoot = resolve(import.meta.dirname, '../../stories/icons')
const colorfulIconsRoot = resolve(import.meta.dirname, '../../../packages/yakit-ui-icons/src/colorful')
const iconStorySource = readIconInputSync(resolve(storiesRoot, 'Icon.stories.tsx'), 'utf8')
const iconStoryMarkup = renderToStaticMarkup(createElement(iconStory.component))
const colorfulStorySpecs = colorfulManifest.groups.map(({ category, storybook, name }) => ({
  category,
  displayName: `Colorful · ${storybook?.label ?? name}`,
  exportName:
    storybook?.exportName ??
    category
      .split('-')
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(''),
}))
const storySpecs = [
  { displayName: 'Overview', exportName: 'Overview' },
  { displayName: 'Outline', exportName: 'Outline' },
  { displayName: 'Solid', exportName: 'Solid' },
  ...colorfulStorySpecs,
] as const

const storyExports = () => [...iconStorySource.matchAll(/^export const (\w+)/gm)].map((match) => match[1])

const renderStory = (story: unknown) => {
  const render = (
    story as {
      render?: (args: Record<string, never>, context: never) => ReactElement
    }
  ).render
  expect(render).toBeTypeOf('function')
  return renderToStaticMarkup(render!({}, {} as never))
}

const renderedExports = (markup: string) => [...markup.matchAll(/data-icon-export="([^"]+)"/g)].map((match) => match[1])

const colorfulByExport = new Map(colorfulIconRegistry.map((icon) => [icon.exportName, icon] as const))
const renderedSourceNodeIds = (markup: string) =>
  renderedExports(markup).map((exportName) => colorfulByExport.get(exportName)?.sourceNodeId)

const figmaStorySourceNodeOrder: Record<string, readonly string[]> = {
  'ai-model': [
    '38864:130867',
    '38803:60735',
    '38808:60821',
    '38808:60837',
    '38808:60849',
    '38808:67833',
    '38808:67860',
    '38808:67883',
    '38808:67896',
    '39233:7592',
    '39233:7605',
    '39233:7631',
    '45038:1909',
    '45594:5407',
    '38864:130874',
    '38808:67916',
    '38808:67857',
    '38808:67851',
    '38808:67848',
    '38808:67843',
    '38808:67874',
    '38808:67893',
    '38808:67907',
    '39233:7601',
    '39233:7642',
    '39233:7669',
    '45038:1923',
    '45594:5420',
  ],
  avatar: [
    '37202:11853',
    '37202:11830',
    '37202:11824',
    '37221:35748',
    '37221:35732',
    '37221:35740',
    '37221:35736',
    '37221:35744',
    '37221:35731',
  ],
  coding: [
    '37155:20116',
    '37155:20119',
    '37155:20123',
    '37155:20127',
    '37155:20130',
    '37155:20132',
    '37155:20137',
    '37155:20140',
    '37155:20145',
    '37155:20148',
    '37155:20152',
    '37155:20156',
    '37155:20158',
    '37155:20161',
    '37155:20168',
    '37155:20188',
    '37155:20193',
    '37155:20197',
    '37155:20200',
    '37155:20206',
    '37155:20209',
    '22799:2274',
    '22801:2402',
    '22801:2406',
    '22801:2404',
  ],
  cursor: ['256:9484', '266:9426', '13394:167118', '37153:13454', '14666:220525'],
  'file-type': [
    '32338:71077',
    '45132:119394',
    '32338:71076',
    '32338:71075',
    '32338:71074',
    '32338:71073',
    '32338:71072',
    '32338:71082',
  ],
  'log-task-node': [
    '14012:175288',
    '14586:211780',
    '14586:211782',
    '14586:211797',
    '31042:85219',
    '14586:211801',
    '15752:248591',
    '14586:211810',
    '13807:174539',
    '13807:174540',
    '13807:174541',
    '13807:174542',
    '13807:174543',
    '13807:174544',
    '13807:174545',
    '37153:13731',
    '37153:13733',
    '37153:13735',
    '37153:13737',
    '37153:13739',
    '45425:2032',
    '45425:2030',
    '45425:2003',
    '45425:2011',
    '45425:2005',
    '45428:2113',
    '45428:2123',
    '45428:2083',
    '45428:2093',
    '45428:2103',
  ],
  'plugin-source': ['3409:103588', '3409:103589', '3409:103590', '37153:16224', '3054:91957'],
  'yakit-logo': [
    '15444:242046',
    '37221:35186',
    '37221:35146',
    '15454:242111',
    '37221:35164',
    '37221:35129',
    '37154:12492',
    '37221:35443',
    '37221:35427',
    '37154:12490',
    '37221:35332',
    '37221:35328',
    '44518:10212',
    '44520:3491',
    '44520:1884',
    '44520:3547',
    '44520:3560',
    '44520:3632',
    '44520:5040',
    '44521:5060',
    '44521:5122',
    '44521:5198',
    '44521:5204',
    '44522:5642',
  ],
} as const

describe('Icon Storybook contract', () => {
  it('keeps one Icon meta group and exposes every navigation story in frozen order', () => {
    expect(iconStory.title).toBe('YakitUi/通用/Icon')
    expect(existsSync(resolve(storiesRoot, 'IconAudit.stories.tsx'))).toBe(false)
    expect(existsSync(resolve(storiesRoot, 'SolidIconAudit.stories.tsx'))).toBe(false)
    expect(storyExports()).toEqual([...storySpecs.map(({ exportName }) => exportName), 'StrokeWidth'])
    expect(
      Object.keys(iconStories)
        .filter((name) => name !== 'default')
        .sort(),
    ).toEqual([...storySpecs.map(({ exportName }) => exportName), 'StrokeWidth'].sort())
    for (const { displayName, exportName } of storySpecs) {
      expect(iconStories[exportName as keyof typeof iconStories]).toMatchObject({
        name: displayName,
      })
      expect(iconStorySource, `${exportName} requires a statically extractable Storybook name`).toContain(
        `export const ${exportName}: Story = {\n  name: '${displayName}',`,
      )
    }
  })

  it('exposes an interactive stroke width example using the public SVG API', () => {
    expect(iconStories.StrokeWidth).toMatchObject({
      name: '描边宽度',
      args: { strokeWidth: 1.5 },
      argTypes: { strokeWidth: { control: { type: 'range', min: 0, max: 3, step: 0.5 } } },
    })
    const markup = renderToStaticMarkup(iconStories.StrokeWidth.render!({ strokeWidth: 0 }, {} as never))
    expect(markup).toContain('stroke-width="0"')
    for (const name of ['BugOutlined', 'HomeOutlined', 'StarOffOutlined', 'Loading']) expect(markup).toContain(name)
  })

  it('renders every colorful category once in frozen Figma group order', () => {
    let previousPosition = -1
    for (const { category } of colorfulManifest.groups) {
      const marker = `data-colorful-category="${category}"`
      const position = iconStoryMarkup.indexOf(marker)
      expect(position, category).toBeGreaterThan(previousPosition)
      expect(iconStoryMarkup.split(marker)).toHaveLength(2)
      previousPosition = position
    }
  })

  it('renders every public colorful icon exactly once', () => {
    const publicRows = colorfulManifest.rows.filter(({ publicExposure }) =>
      ['canonical', 'semantic-alias'].includes(publicExposure),
    )

    expect(iconStoryMarkup.match(/data-icon-family="colorful"/g)).toHaveLength(publicRows.length)
    for (const { category, exportName } of publicRows) {
      const marker = `data-icon-category="${category}" data-icon-export="${exportName}" data-icon-family="colorful"`
      expect(iconStoryMarkup.split(marker), exportName).toHaveLength(2)
    }
  })

  it('projects Outline and Solid into isolated navigation stories', () => {
    for (const { expected, family, story } of [
      { expected: outlineIconRegistry, family: 'outline', story: iconStories.Outline },
      { expected: solidIconRegistry, family: 'solid', story: iconStories.Solid },
    ]) {
      const markup = renderStory(story)
      expect(renderedExports(markup)).toEqual(expected.map(({ exportName }) => exportName))
      expect(markup.match(new RegExp(`data-icon-family="${family}"`, 'g'))).toHaveLength(expected.length)
    }
  })

  it('projects every public colorful icon into exactly one navigation group', () => {
    const publicRows = colorfulManifest.rows.filter(({ publicExposure }) =>
      ['canonical', 'semantic-alias'].includes(publicExposure),
    )
    const groupedExports: string[] = []

    for (const { category, exportName } of colorfulStorySpecs) {
      const expected = publicRows.filter((row) => row.category === category).map((row) => row.exportName)
      const markup = renderStory(iconStories[exportName as keyof typeof iconStories])
      const actual = renderedExports(markup)
      expect([...actual].sort(), category).toEqual([...expected].sort())
      expect(markup.match(/data-icon-family="colorful"/g), category).toHaveLength(expected.length)
      expect(markup).toContain(`data-colorful-category="${category}"`)
      groupedExports.push(...actual)
    }

    expect([...groupedExports].sort()).toEqual(publicRows.map(({ exportName }) => exportName).sort())
    expect(new Set(groupedExports).size).toBe(publicRows.length)
    expect([...groupedExports].sort()).toEqual(colorfulIconRegistry.map(({ exportName }) => exportName).sort())
  })

  it('uses the visual Figma node order inside audited colorful stories', () => {
    const basicMarkup = renderStory(iconStories.Basic)
    const basicExports = renderedExports(basicMarkup)
    const historicalBasic = new Set(
      colorfulManifest.rows
        .filter((row) => row.category === 'basic')
        .slice(0, 82)
        .map((row) => row.exportName),
    )
    const historicalExports = basicExports.filter((name) => historicalBasic.has(name))
    expect(historicalExports).toHaveLength(82)
    expect(historicalExports.slice(0, 41).every((name) => name.endsWith('SolidColorful'))).toBe(true)
    expect(historicalExports.slice(41).every((name) => name.endsWith('OutlineColorful'))).toBe(true)
    expect(renderedSourceNodeIds(basicMarkup).slice(0, 3)).toEqual(['37151:15203', '37151:15202', '37151:15201'])
    expect(
      renderedSourceNodeIds(basicMarkup)
        .filter((id) =>
          colorfulManifest.rows
            .filter((row) => row.category === 'basic')
            .slice(0, 82)
            .some((row) => row.nodeId === id),
        )
        .slice(-3),
    ).toEqual(['38051:62408', '38723:88885', '44983:1900'])

    for (const [category, expected] of Object.entries(figmaStorySourceNodeOrder)) {
      const story = colorfulStorySpecs.find((spec) => spec.category === category)
      expect(story, category).toBeTruthy()
      expect(
        renderedSourceNodeIds(renderStory(iconStories[story!.exportName as keyof typeof iconStories])).filter(
          (id) => id !== undefined && expected.includes(id),
        ),
        category,
      ).toEqual(expected)
    }
  })

  it('keeps the two unbacked Memfit compositions on their exact Figma geometry', () => {
    const horizontal = readIconInputSync(resolve(colorfulIconsRoot, '44520-3632.svg'), 'utf8')
    const vertical = readIconInputSync(resolve(colorfulIconsRoot, '44520-3560.svg'), 'utf8')

    expect(horizontal).toContain('M8.49335 14.0987H6V26.7533H8.49335V14.0987Z')
    expect(horizontal).not.toContain('scale(0.2284173884793107')
    expect(vertical).toContain('M13.7761 14.86H11.6396V25.7743H13.7761V14.86Z')
    expect(vertical).not.toContain('scale(0.5132218874996354')
  })

  it('keeps the combined Overview catalog complete', () => {
    expect(renderedExports(iconStoryMarkup)).toEqual([
      ...outlineIconRegistry.map(({ exportName }) => exportName),
      ...solidIconRegistry.map(({ exportName }) => exportName),
      ...colorfulStorySpecs.flatMap(({ exportName }) =>
        renderedExports(renderStory(iconStories[exportName as keyof typeof iconStories])),
      ),
    ])
  })
})
