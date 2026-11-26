import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { sourceCounts } from './icon-source-data.mjs'
import { sourceScopeRole } from './icon-source-model.mjs'

const require = createRequire(import.meta.url)
const outline = require('../config/icon-sources/outline.json')
const solid = require('../config/icon-sources/solid.json')
const solidProject = require('../config/icon-project/solid.json')

export const POLICY_DIGEST_ALGORITHM_VERSION = 'policy-digest-canonical-json-v1'
export const ID_HYGIENE_ALGORITHM_VERSION = 'solid-id-hygiene-v1'
export const PAINT_SEMANTICS_ALGORITHM_VERSION = 'geometry-role-locator-v1'
export const PAINT_COMPARISON_NORMALIZATION_VERSION = 'figma-primary-currentcolor-v1'
export const ICON_STROKE_WIDTH = '1.5'
export const ICON_STROKE_WIDTH_POLICY = Object.freeze({
  strategy: 'local-uniform-stroke-v1',
  value: ICON_STROKE_WIDTH,
})

export const SOLID_STROKE_WIDTH_POLICY = Object.freeze({ strategy: 'preserve-source-stroke-v1' })

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`
  return JSON.stringify(value)
}

export function policyDigest(value) {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')
}

const solidMapping = solid.records.map(({ nodeId }) => {
  const mapping = solidProject.records[nodeId]
  return { nodeId, localFile: mapping.file, exportName: mapping.exportName, scopeRole: sourceScopeRole(mapping) }
})
const SOLID_SUPPLEMENTS = solidMapping.filter((r) => r.scopeRole === 'supplement')
const solidIds = solidMapping.filter((r) => r.scopeRole === 'target').map((r) => r.nodeId)

export const ICON_AUDIT_POLICIES = Object.freeze({
  'outline-v1': Object.freeze({
    id: 'outline-v1',
    variant: 'outline',
    fileKey: 'QWct5XE0Bg0bNDQ93eYgEw',
    frameNodeId: '46824:1930',
    strokeWidthPolicy: ICON_STROKE_WIDTH_POLICY,
    expectedCounts: Object.freeze(sourceCounts(outline)),
  }),
  'solid-v1': Object.freeze({
    id: 'solid-v1',
    variant: 'solid',
    fileKey: 'QWct5XE0Bg0bNDQ93eYgEw',
    frameNodeId: '46824:1931',
    policyDigestAlgorithmVersion: POLICY_DIGEST_ALGORITHM_VERSION,
    idHygieneAlgorithmVersion: ID_HYGIENE_ALGORITHM_VERSION,
    paintSemanticsAlgorithmVersion: PAINT_SEMANTICS_ALGORITHM_VERSION,
    paintComparisonNormalizationVersion: PAINT_COMPARISON_NORMALIZATION_VERSION,
    strokeWidthPolicy: SOLID_STROKE_WIDTH_POLICY,
    expectedCounts: Object.freeze(sourceCounts({ family: solid.family, records: solidMapping })),
    targetMembershipSha256: policyDigest([...solidIds].sort()),
    targetOrderSha256: policyDigest(solidIds),
    publicMappingSha256: policyDigest(sortedPublicMapping(solidMapping)),
    supplementalSources: Object.freeze(SOLID_SUPPLEMENTS.map((entry) => Object.freeze(entry))),
  }),
})

export function getIconAuditPolicy(policyId) {
  const policy = ICON_AUDIT_POLICIES[policyId]
  if (!policy) throw new Error(`unsupported icon audit policy: ${policyId}`)
  return policy
}

export function sortedPublicMapping(rows) {
  return rows
    .map(({ nodeId, localFile, exportName, scopeRole }) => ({
      nodeId,
      localFile,
      exportName,
      scopeRole,
    }))
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)))
}
