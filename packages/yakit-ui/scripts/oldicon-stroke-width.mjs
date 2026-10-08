import { createHash } from 'node:crypto';

import { normalizeSvgStrokeWidth } from './icon-stroke-width.mjs';

const ASSET_FILE_PATTERN = /^assets\/([a-f0-9]{64})\.svg$/;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const clone = (value) => JSON.parse(JSON.stringify(value));

const assertAssetFile = (assetFile, source) => {
  const match = ASSET_FILE_PATTERN.exec(assetFile);
  if (!match) throw new Error(`OLDICON_ASSET_FILE_INVALID: ${assetFile}`);
  const actualHash = sha256(source);
  if (match[1] !== actualHash)
    throw new Error(`OLDICON_ASSET_HASH_MISMATCH: ${assetFile} !== ${actualHash}`);
};

const updateAssetReference = (record, replacements) => {
  const assetFile = replacements.get(record.assetFile);
  if (!assetFile) throw new Error(`OLDICON_ASSET_MISSING: ${record.assetFile}`);
  const artworkSha256 = ASSET_FILE_PATTERN.exec(assetFile)[1];
  record.assetFile = assetFile;
  record.artworkSha256 = artworkSha256;
  if ('assetSha256' in record) record.assetSha256 = artworkSha256;
};

/**
 * Plans the offline Oldicon stroke-width migration without changing its inputs.
 * Source evidence, canonical artwork identity, export names, and source keys remain
 * stable; only emitted asset bytes and their content-addressed references change.
 */
export function planOldiconStrokeWidth(inventory, assetsMap) {
  if (!inventory || !Array.isArray(inventory.entries) || !Array.isArray(inventory.exports))
    throw new Error('OLDICON_INVENTORY_INVALID');
  if (!(assetsMap instanceof Map)) throw new Error('OLDICON_ASSETS_INVALID');

  const assets = new Map();
  const replacements = new Map();
  for (const [assetFile, source] of assetsMap) {
    if (typeof source !== 'string') throw new Error(`OLDICON_ASSET_SOURCE_INVALID: ${assetFile}`);
    assertAssetFile(assetFile, source);
    const normalizedSource = normalizeSvgStrokeWidth(source);
    const normalizedHash = sha256(normalizedSource);
    const normalizedAssetFile = `assets/${normalizedHash}.svg`;
    const existingSource = assets.get(normalizedAssetFile);
    if (existingSource !== undefined && existingSource !== normalizedSource)
      throw new Error(`OLDICON_ASSET_HASH_COLLISION: ${normalizedAssetFile}`);
    assets.set(normalizedAssetFile, normalizedSource);
    replacements.set(assetFile, normalizedAssetFile);
  }

  const nextInventory = clone(inventory);
  for (const entry of nextInventory.entries) updateAssetReference(entry, replacements);
  for (const exported of nextInventory.exports) updateAssetReference(exported, replacements);
  nextInventory.generationPolicy = {
    ...nextInventory.generationPolicy,
    strokeWidth: {
      strategy: 'local-uniform-stroke-v1',
      value: '1.5',
    },
  };
  nextInventory.hashSemantics = {
    ...nextInventory.hashSemantics,
    artworkSha256: 'alias of assetSha256',
    assetSha256: 'SHA-256 of exact emitted stroke-width-normalized SVG file bytes',
    canonicalArtworkSha256:
      'SHA-256 after orphan cleanup and canonical fragment normalization, before emitted stroke-width normalization',
  };
  nextInventory.totals = {
    ...nextInventory.totals,
    artworks: assets.size,
  };

  return { assets, inventory: nextInventory, replacements };
}
