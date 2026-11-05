import colorfulSource from '../../config/icon-sources/colorful.json';
import loadingSource from '../../config/icon-sources/loading.json';
import oldiconSource from '../../config/icon-sources/oldicon.json';
import outlineSource from '../../config/icon-sources/outline.json';
import solidSource from '../../config/icon-sources/solid.json';

// Expectations come from the maintained sources, not generated barrels or runtime exports.
const publicColorful = colorfulSource.records.filter(({ publicExposure }) =>
  ['canonical', 'semantic-alias'].includes(publicExposure),
);
const familyExports = {
  outline: outlineSource.records.map(({ exportName }) => exportName),
  solid: solidSource.records.map(({ exportName }) => exportName),
  colorful: publicColorful.map(({ exportName }) => exportName),
};
const registryExports = Object.values(familyExports).flat();
const rootExports = [
  ...registryExports,
  ...loadingSource.records.map(({ exportName }) => exportName),
];
const oldiconExports = [
  ...new Set(
    oldiconSource.records.flatMap(({ sources }) => sources.map(({ exportName }) => exportName)),
  ),
];
export const iconExports = {
  ...familyExports,
  registry: registryExports,
  root: rootExports,
  oldicon: oldiconExports,
  all: [...rootExports, ...oldiconExports],
};
export const iconCounts = {
  outline: iconExports.outline.length,
  solid: iconExports.solid.length,
  colorful: iconExports.colorful.length,
  oldicon: iconExports.oldicon.length,
  registry: iconExports.registry.length,
  root: iconExports.root.length,
  all: iconExports.all.length,
  figmaCatalog: iconExports.outline.length + iconExports.solid.length,
};
export const expectedFigmaNames = [...outlineSource.records, ...solidSource.records]
  .map(({ name }) => name.trim())
  .filter(Boolean);
export const iconSourceFiles = [
  ...new Set([
    ...outlineSource.records.map(({ file }) => `icons/outline/${file}`),
    ...solidSource.records.map(({ file }) => `icons/solid/${file}`),
    ...colorfulSource.records
      .filter(({ localFile }) => localFile)
      .map(({ localFile }) => `icons/${localFile}`),
    ...oldiconSource.records.map(({ assetFile }) => `icons/oldicon/${assetFile}`),
  ]),
].sort();

export const oldiconSourceCounts = {
  entries: oldiconSource.records.reduce((count, row) => count + row.sources.length, 0),
  repaired: oldiconSource.records
    .flatMap((row) => row.sources)
    .filter((row) => row.repairs.length > 0).length,
};
