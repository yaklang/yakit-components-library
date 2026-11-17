import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { FIGMA_FAMILIES, joinIconSource } from './icon-source-model.mjs';
export { FIGMA_FAMILIES } from './icon-source-model.mjs';
export const ICON_FAMILIES = [...FIGMA_FAMILIES, 'loading'];
const defaultRoot = new URL('../config/icon-sources/', import.meta.url);
export function readIconSources(root = defaultRoot) {
  if (!(root instanceof URL)) root = pathToFileURL(`${path.resolve(root)}/`);
  const json = (url) => JSON.parse(readFileSync(url, 'utf8'));
  const display = json(new URL('../icon-display.json', root));
  if (display.schemaVersion !== 1) throw new Error('ICON_DISPLAY_SCHEMA_INVALID');
  return Object.fromEntries(
    ICON_FAMILIES.map((family) => {
      const document = json(new URL(`${family}.json`, root));
      if (family === 'loading') return [family, document];
      const project = json(new URL(`../icon-project/${family}.json`, root));
      const rawFiles = {};
      const evidenceFiles = {};
      for (const record of document.records) {
        for (const key of ['svgFile', 'evidenceFile']) {
          const value = record[key];
          if (value === undefined && key === 'evidenceFile') continue;
          if (
            typeof value !== 'string' ||
            value.includes('\\') ||
            value.split('/').some((p) => !p || p === '..' || p === '.') ||
            path.isAbsolute(value)
          )
            throw new Error(`ICON_PATH_INVALID: ${value}`);
          const url = new URL(value, root);
          if (!fileURLToPath(url).startsWith(fileURLToPath(root)))
            throw new Error(`ICON_PATH_INVALID: ${value}`);
          if (key === 'svgFile') rawFiles[value] = readFileSync(url, 'utf8');
          else evidenceFiles[value] = json(url);
        }
      }
      return [
        family,
        joinIconSource(document, project, rawFiles, evidenceFiles, display.families[family]),
      ];
    }),
  );
}
export function sourceExports(source) {
  return source.records.map((r) => r.exportName);
}
export function sourceFiles(source) {
  return source.records.map((r) => (source.family === 'loading' ? r.file : r.localFile));
}
export function sourceCounts(source) {
  const records = source.records;
  if (source.family === 'outline') {
    const placements = records.flatMap((r) => r.placements);
    return {
      currentSymbols: records.length,
      instances: placements.filter((r) => r.nodeType === 'instance').length,
      placements: placements.length,
      publicExports: records.length,
    };
  }
  if (source.family === 'solid')
    return {
      targetSymbols: records.filter((r) => r.scopeRole === 'target').length,
      supplementalSources: records.filter((r) => r.scopeRole === 'supplement').length,
      publicExports: records.length,
      orphanSources: 0,
    };
  return { assets: sourceFiles(source).length, publicExports: sourceExports(source).length };
}
