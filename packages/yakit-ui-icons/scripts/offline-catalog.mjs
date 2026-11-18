import { readFile } from 'node:fs/promises';
import { generateColors } from '@yakit-libs/color';
import { inspectFragmentGraph } from './colorful-fragments.mjs';

const tagPattern = /<([A-Za-z][\w:.-]*)(\s[^<>]*?)?\/?>/g;
const attributePattern = /([:\w.-]+)\s*=\s*(["'])(.*?)\2/g;
const localUrl = /url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/g;

// Keep the production artwork intact; namespace only IDs and their references.
export function isolateCatalogSvg(svg, prefix) {
  if (!/^[A-Za-z][\w-]*$/.test(prefix)) throw new Error('CATALOG_PREFIX_INVALID');
  if (/<(?:script|style|foreignObject|a)\b|<!DOCTYPE|<\?/i.test(svg))
    throw new Error('CATALOG_SVG_CONTENT_UNSUPPORTED');
  const graph = inspectFragmentGraph(svg);
  const ids = new Map(graph.owners.map(({ id }, index) => [id, `${prefix}-${index}`]));
  if (ids.size !== graph.owners.length) throw new Error('CATALOG_DUPLICATE_ID');
  for (const { id } of graph.references)
    if (!ids.has(id)) throw new Error(`CATALOG_ORPHAN_REFERENCE: ${id}`);
  return svg.replace(tagPattern, (tag) =>
    tag.replace(attributePattern, (_, name, quote, value) => {
      if (/^on/i.test(name)) throw new Error('CATALOG_SVG_EVENT_UNSUPPORTED');
      if (
        ['href', 'xlink:href'].includes(name) &&
        !value.startsWith('#') &&
        !/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(value)
      )
        throw new Error('CATALOG_EXTERNAL_REFERENCE');
      if (/url\(/i.test(value.replace(localUrl, ''))) throw new Error('CATALOG_EXTERNAL_URL');
      let next = value.replace(localUrl, (_whole, id) => `url(#${ids.get(id)})`);
      if (name === 'id') next = ids.get(value);
      if (['href', 'xlink:href'].includes(name) && value.startsWith('#'))
        next = `#${ids.get(value.slice(1))}`;
      if (['aria-labelledby', 'aria-describedby'].includes(name))
        next = value
          .trim()
          .split(/\s+/)
          .map((id) => ids.get(id))
          .join(' ');
      return `${name}=${quote}${next}${quote}`;
    }),
  );
}

const scriptJson = (value) =>
  JSON.stringify(value, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

export async function renderOfflineCatalog({ entries, assets, brands }) {
  const icons = entries.map(
    ({ family, figmaName, exportName, sourceNodeId, file, defaultColor }, index) => {
      if (!['outline', 'solid', 'colorful'].includes(family) || !/^\d+:\d+$/.test(sourceNodeId))
        throw new Error(`CATALOG_METADATA_INVALID: ${exportName}`);
      const svg = assets.get(file);
      if (!svg) throw new Error(`CATALOG_SVG_MISSING: ${file}`);
      return {
        family,
        figmaName,
        exportName,
        nodeId: sourceNodeId,
        defaultColor,
        svg: isolateCatalogSvg(svg, `catalog-${family}-${index}`),
      };
    },
  );
  const palettes = {};
  for (const [key, brand] of Object.entries(brands)) {
    palettes[key] = {};
    for (const mode of ['light', 'dark']) {
      if (!/^#[\da-f]{6}$/i.test(brand[mode])) throw new Error(`CATALOG_BRAND_INVALID: ${key}`);
      palettes[key][mode] = generateColors(mode, brand[mode]);
    }
  }
  const [template, css, app] = await Promise.all(
    ['index.html', 'style.css', 'app.js'].map((file) =>
      readFile(new URL(`./catalog/${file}`, import.meta.url), 'utf8'),
    ),
  );
  return template
    .replace('/* CATALOG_STYLES */', () => css)
    .replace('/* CATALOG_DATA */', () => scriptJson({ icons, brands, palettes }))
    .replace('/* CATALOG_APP */', () => app);
}
