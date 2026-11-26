import loadingSource from '../../config/icon-sources/loading.json'
import { colorful as colorfulSource } from '../helpers/sources'
import { outline as outlineSource } from '../helpers/sources'
import { solid as solidSource } from '../helpers/sources'

// Expectations come from the maintained sources, not generated barrels or runtime exports.
const publicColorful = colorfulSource.records.filter(({ publicExposure }) =>
  ['canonical', 'semantic-alias'].includes(publicExposure),
)
const familyExports = {
  outline: outlineSource.records.map(({ exportName }) => exportName),
  solid: solidSource.records.map(({ exportName }) => exportName),
  colorful: publicColorful.map(({ exportName }) => exportName),
}
const registryExports = Object.values(familyExports).flat()
const rootExports = [...registryExports, ...loadingSource.records.map(({ exportName }) => exportName)]
const oldiconExports = Object.keys(import.meta.glob('../../src/oldicon/icons/*.tsx')).map((file) =>
  file.slice(file.lastIndexOf('/') + 1, -4),
)
export const iconExports = {
  ...familyExports,
  registry: registryExports,
  root: rootExports,
  oldicon: oldiconExports,
  all: [...rootExports, ...oldiconExports],
}
export const iconCounts = {
  outline: iconExports.outline.length,
  solid: iconExports.solid.length,
  colorful: iconExports.colorful.length,
  oldicon: iconExports.oldicon.length,
  registry: iconExports.registry.length,
  root: iconExports.root.length,
  all: iconExports.all.length,
  figmaCatalog: iconExports.outline.length + iconExports.solid.length,
}
export const expectedFigmaNames = [...outlineSource.records, ...solidSource.records]
  .map(({ name }) => name.trim())
  .filter(Boolean)
export const iconSourceFiles = [
  ...new Set([
    ...outlineSource.records.map(({ file }) => `icons/outline/${file}`),
    ...solidSource.records.map(({ file }) => `icons/solid/${file}`),
    ...colorfulSource.records.filter(({ localFile }) => localFile).map(({ localFile }) => `icons/${localFile}`),
    ...Object.keys(import.meta.glob('../../src/oldicon/assets/*.svg')).map((file) =>
      file.replace('../../src/', 'icons/'),
    ),
  ]),
].sort()
