import { readFileSync } from 'node:fs';

export const ICON_FAMILIES = ['outline', 'solid', 'colorful', 'oldicon', 'loading'];
export function readIconSources(root = new URL('../config/icon-sources/', import.meta.url)) {
  return Object.fromEntries(
    ICON_FAMILIES.map((family) => [
      family,
      JSON.parse(readFileSync(new URL(`${family}.json`, root), 'utf8')),
    ]),
  );
}
export function sourceExports(source) {
  if (source.family === 'oldicon')
    return [...new Set(source.records.flatMap((r) => r.sources.map((s) => s.exportName)))];
  if (source.family === 'colorful')
    return source.records
      .filter((r) => ['canonical', 'semantic-alias'].includes(r.publicExposure))
      .map((r) => r.exportName);
  return source.records.map((r) => r.exportName);
}
export function sourceFiles(source) {
  if (source.family === 'oldicon') return source.records.map((r) => `oldicon/${r.assetFile}`);
  if (source.family === 'colorful')
    return source.records.filter((r) => r.localFile).map((r) => r.localFile.replace(/^src\//, ''));
  if (source.family === 'loading') return source.records.map((r) => r.file);
  return source.records.map((r) => `${source.family}/${r.file}`);
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
