import path from 'node:path';

const fail = (token, detail) => {
  throw new Error(`${token}: ${detail}`);
};

const sourceNodeIdFromFile = (file) => path.basename(file, '.svg').replace(/^([^-]+)-/, '$1:');

export function parseIconIndexMapping(source) {
  const imports = new Map();
  for (const match of source.matchAll(
    /import\s+(\w+)Svg\s+from\s+['"]\.\/(.+?\.svg)\?react['"];?/g,
  )) {
    const [, localName, file] = match;
    if (imports.has(localName)) fail('FIGMA_NAME_IMPORT_DUPLICATE', localName);
    imports.set(localName, file);
  }

  const exports = new Map();
  for (const match of source.matchAll(
    /export\s+const\s+(\w+)\s*=\s*createIcon\(\s*(\w+)Svg\s*,/g,
  )) {
    const [, exportName, localName] = match;
    if (exports.has(exportName)) fail('FIGMA_NAME_EXPORT_DUPLICATE', exportName);
    const file = imports.get(localName);
    if (!file) fail('FIGMA_NAME_IMPORT_MISSING', exportName);
    exports.set(exportName, { file, sourceNodeId: sourceNodeIdFromFile(file) });
  }
  for (const match of source.matchAll(
    /export\s+const\s+(\w+)\s*=\s*createIcon\(\s*\w+Svg\s*,\s*(['"])[^'"]*\2\s*,\s*(['"])([^'"]*)\3\s*,?\s*\)/g,
  )) {
    const record = exports.get(match[1]);
    if (record) record.defaultColor = match[4];
  }
  return exports;
}
