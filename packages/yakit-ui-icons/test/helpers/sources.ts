import display from '../../config/icon-display.json'
import colorfulProject from '../../config/icon-project/colorful.json'
import outlineProject from '../../config/icon-project/outline.json'
import solidProject from '../../config/icon-project/solid.json'
import colorfulDocument from '../../config/icon-sources/colorful.json'
import outlineDocument from '../../config/icon-sources/outline.json'
import solidDocument from '../../config/icon-sources/solid.json'
import { joinIconSource } from '../../scripts/icon-source-model.mjs'

type JoinedSource = {
  family: 'outline' | 'solid' | 'colorful'
  fileKey: string
  records: {
    nodeId: string
    name: string
    exportName: string
    file: string
    localFile: string
    svgFile: string
    raw: { svg: string }
    rawSvg: string
    publicExposure: string
    scopeRole: string
    defaultColor?: string
  }[]
}

const rawFiles = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../config/icon-sources/svg/**/*.svg', {
      eager: true,
      query: '?raw',
      import: 'default',
    }),
  ).map(([file, raw]) => [file.replace('../../config/icon-sources/', ''), raw]),
)
const evidence = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../config/icon-sources/evidence/**/*.json', {
      eager: true,
      import: 'default',
    }),
  ).map(([file, value]) => [file.replace('../../config/icon-sources/', ''), value]),
)
export const outline: JoinedSource = joinIconSource(
  outlineDocument,
  outlineProject,
  rawFiles,
  evidence,
  display.families.outline,
)
export const solid: JoinedSource = joinIconSource(
  solidDocument,
  solidProject,
  rawFiles,
  evidence,
  display.families.solid,
)
export const colorful: JoinedSource = joinIconSource(
  colorfulDocument,
  colorfulProject,
  rawFiles,
  evidence,
  display.families.colorful,
)
