import { parseIconIndexMapping } from './icon-index-mapping.mjs'
export { parseIconIndexMapping } from './icon-index-mapping.mjs'
import path from 'node:path'

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const outlineCount = require('../config/icon-sources/outline.json').records.length
const solidCount = require('../config/icon-sources/solid.json').records.length
const EXPECTED_COUNTS = Object.freeze({
  outline: outlineCount,
  solid: solidCount,
  total: outlineCount + solidCount,
})
const VALID_STATUSES = new Set(['current', 'supplement', 'unnamed-in-figma', 'legacy-non-current-figma'])

const fail = (token, detail) => {
  throw new Error(detail ? `${token}: ${detail}` : token)
}

const trimmedFigmaName = (value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

const nodeName = (entry, nodeKey) => ({
  name: trimmedFigmaName(entry?.name),
  nodeId: entry?.[nodeKey],
})

function validateProvenancePair({ authoritative, authoritativeNodeKey, label, raw, rawNodeKey }) {
  const authoritativeRecords = authoritative.map((entry) => nodeName(entry, authoritativeNodeKey))
  const rawRecords = raw.map((entry) => nodeName(entry, rawNodeKey))
  const authoritativeByNode = new Map(authoritativeRecords.map((entry) => [entry.nodeId, entry.name]))
  const rawByNode = new Map(rawRecords.map((entry) => [entry.nodeId, entry.name]))
  if (
    authoritativeByNode.size !== authoritativeRecords.length ||
    rawByNode.size !== rawRecords.length ||
    authoritativeRecords.length !== rawRecords.length
  )
    fail('FIGMA_NAME_PROVENANCE_MISMATCH', `${label}/count-or-duplicate`)
  for (const [nodeId, name] of authoritativeByNode)
    if (!rawByNode.has(nodeId) || rawByNode.get(nodeId) !== name)
      fail('FIGMA_NAME_PROVENANCE_MISMATCH', `${label}/${nodeId}`)
  for (const nodeId of rawByNode.keys())
    if (!authoritativeByNode.has(nodeId)) fail('FIGMA_NAME_PROVENANCE_MISMATCH', `${label}/${nodeId}`)
  return authoritativeRecords
}

function validateManifestSequence({ authoritative, family, manifestRecords, manifestNodeKey }) {
  if (manifestRecords.length !== authoritative.length)
    fail('FIGMA_NAME_PROVENANCE_MISMATCH', `${family}/manifest-count`)
  for (let index = 0; index < authoritative.length; index += 1) {
    const source = authoritative[index]
    const manifest = manifestRecords[index]
    if (source.nodeId !== manifest?.[manifestNodeKey]) fail('FIGMA_NAME_ORDER_MISMATCH', `${family}/${index}`)
    if (source.name !== trimmedFigmaName(manifest.name))
      fail('FIGMA_NAME_PROVENANCE_MISMATCH', `${family}/${source.nodeId}`)
  }
}

function expectedRecords({
  outlineManifest,
  outlinePlacementProvenance,
  outlineRawProvenance,
  solidManifest,
  solidPlacementProvenance,
  solidRawProvenance,
}) {
  const outlineSymbols = outlineManifest?.symbols ?? []
  const outlineLegacy = outlineManifest?.legacySources ?? []
  const solidSymbols = solidManifest?.symbols ?? []
  const solidSupplements = solidManifest?.supplementalSources ?? []

  const outlineAuthoritative = validateProvenancePair({
    authoritative: outlinePlacementProvenance?.currentSymbols ?? [],
    authoritativeNodeKey: 'exportedSourceNodeId',
    label: 'outline',
    raw: outlineRawProvenance?.components ?? [],
    rawNodeKey: 'nodeId',
  })
  const solidTargets = validateProvenancePair({
    authoritative: solidPlacementProvenance?.targetSymbols ?? [],
    authoritativeNodeKey: 'nodeId',
    label: 'solid-target',
    raw: solidRawProvenance?.components ?? [],
    rawNodeKey: 'nodeId',
  })
  const solidSupplementEvidence = validateProvenancePair({
    authoritative: solidPlacementProvenance?.supplementalSources ?? [],
    authoritativeNodeKey: 'nodeId',
    label: 'solid-supplement',
    raw: solidRawProvenance?.supplementalComponents ?? [],
    rawNodeKey: 'nodeId',
  })
  validateManifestSequence({
    authoritative: outlineAuthoritative,
    family: 'outline',
    manifestNodeKey: 'exportedSourceNodeId',
    manifestRecords: outlineSymbols,
  })
  validateManifestSequence({
    authoritative: solidTargets,
    family: 'solid',
    manifestNodeKey: 'nodeId',
    manifestRecords: solidSymbols,
  })
  validateManifestSequence({
    authoritative: solidSupplementEvidence,
    family: 'solid-supplement',
    manifestNodeKey: 'nodeId',
    manifestRecords: solidSupplements,
  })
  return [
    ...outlineSymbols.map((entry, index) => ({
      exportName: entry.exportName,
      figmaName: outlineAuthoritative[index].name,
      family: 'outline',
      file: entry.file,
      manifestSourceNodeId: entry.exportedSourceNodeId,
      sourceStatus: outlineAuthoritative[index].name ? 'current' : 'unnamed-in-figma',
    })),
    ...outlineLegacy.map((entry) => ({
      exportName: entry.exportName,
      figmaName: null,
      family: 'outline',
      file: entry.file,
      manifestSourceNodeId: entry.exportedSourceNodeId,
      sourceStatus: 'legacy-non-current-figma',
    })),
    ...solidSymbols.map((entry, index) => ({
      exportName: entry.exportName,
      figmaName: solidTargets[index].name,
      family: 'solid',
      file: entry.localFile,
      manifestSourceNodeId: entry.nodeId,
      sourceStatus: solidTargets[index].name ? 'current' : 'unnamed-in-figma',
    })),
    ...solidSupplements.map((entry, index) => ({
      exportName: entry.exportName,
      figmaName: solidSupplementEvidence[index].name,
      family: 'solid',
      file: entry.localFile,
      manifestSourceNodeId: entry.nodeId,
      sourceStatus: 'supplement',
    })),
  ]
}

export function buildIconNameCatalog({
  outlineIndexSource,
  outlineManifest,
  outlinePlacementProvenance,
  outlineRawProvenance,
  solidIndexSource,
  solidManifest,
  solidPlacementProvenance,
  solidRawProvenance,
}) {
  const indexes = {
    outline: parseIconIndexMapping(outlineIndexSource),
    solid: parseIconIndexMapping(solidIndexSource),
  }

  const records = expectedRecords({
    outlineManifest,
    outlinePlacementProvenance,
    outlineRawProvenance,
    solidManifest,
    solidPlacementProvenance,
    solidRawProvenance,
  })
  const seenExports = new Set()
  for (const record of records) {
    if (!record.exportName || seenExports.has(record.exportName)) fail('FIGMA_NAME_EXPORT_DUPLICATE', record.exportName)
    seenExports.add(record.exportName)
    if (!VALID_STATUSES.has(record.sourceStatus)) fail('FIGMA_NAME_STATUS_UNKNOWN', record.sourceStatus)
    const actual = indexes[record.family].get(record.exportName)
    if (!actual) fail('FIGMA_NAME_MAPPING_MISSING', record.exportName)
    if (actual.sourceNodeId !== record.manifestSourceNodeId) fail('FIGMA_NAME_SOURCE_MISMATCH', record.exportName)
    const expectedFile = path.basename(record.file)
    if (actual.file !== expectedFile) fail('FIGMA_NAME_SOURCE_MISMATCH', record.exportName)
  }

  for (const [family, index] of Object.entries(indexes))
    for (const exportName of index.keys())
      if (!seenExports.has(exportName)) fail('FIGMA_NAME_MAPPING_UNKNOWN', `${family}/${exportName}`)
  if (records.length !== indexes.outline.size + indexes.solid.size || seenExports.size !== records.length)
    fail('FIGMA_NAME_CATALOG_INCOMPLETE')

  return records.map(({ exportName, figmaName, family, manifestSourceNodeId, sourceStatus }) => ({
    exportName,
    figmaName,
    family,
    sourceNodeId: manifestSourceNodeId,
    sourceStatus,
  }))
}

export function renderIconNameCatalog(records) {
  const tsString = (value) =>
    value === null ? 'null' : `'${JSON.stringify(value).slice(1, -1).replaceAll("'", "\\'")}'`
  const lines = records.map(
    (entry) =>
      `  {\n    exportName: ${tsString(entry.exportName)},\n    figmaName: ${tsString(entry.figmaName)},\n    family: ${tsString(entry.family)},\n    sourceNodeId: ${tsString(entry.sourceNodeId)},\n    sourceStatus: ${tsString(entry.sourceStatus)},\n  },`,
  )
  return `// Generated by scripts/update-icons.mjs. Do not edit manually.\n\nexport type IconFigmaNameSourceStatus =\n  | 'current'\n  | 'supplement'\n  | 'unnamed-in-figma'\n  | 'legacy-non-current-figma';\n\nexport interface IconFigmaNameEntry {\n  exportName: string;\n  figmaName: string | null;\n  family: 'outline' | 'solid';\n  sourceNodeId: string;\n  sourceStatus: IconFigmaNameSourceStatus;\n}\n\nexport const figmaIconNameCatalog = [\n${lines.join('\n')}\n] as const satisfies readonly IconFigmaNameEntry[];\n\nexport const outlineIconNameCatalog = figmaIconNameCatalog.filter(\n  ({ family }) => family === 'outline',\n);\n\nexport const solidIconNameCatalog = figmaIconNameCatalog.filter(({ family }) => family === 'solid');\n\nexport const figmaIconNameByExport = Object.fromEntries(\n  figmaIconNameCatalog.map(({ exportName, figmaName }) => [exportName, figmaName]),\n) as Readonly<Record<string, string | null>>;\n`
}

export const ICON_NAME_CATALOG_EXPECTED_COUNTS = EXPECTED_COUNTS
