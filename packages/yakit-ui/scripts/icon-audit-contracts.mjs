import { createHash } from 'node:crypto';

export const POLICY_DIGEST_ALGORITHM_VERSION = 'policy-digest-canonical-json-v1';
export const ID_HYGIENE_ALGORITHM_VERSION = 'solid-id-hygiene-v1';
export const PAINT_SEMANTICS_ALGORITHM_VERSION = 'geometry-role-locator-v1';
export const PAINT_COMPARISON_NORMALIZATION_VERSION = 'figma-primary-currentcolor-v1';
export const ICON_STROKE_WIDTH = '1';
export const ICON_STROKE_WIDTH_POLICY = Object.freeze({
  strategy: 'local-uniform-stroke-v1',
  value: ICON_STROKE_WIDTH,
});

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

export function policyDigest(value) {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

const SOLID_SUPPLEMENTS = [
  {
    nodeId: '4936:115787',
    localFile: 'solid/4936-115787.svg',
    exportName: 'FigmaIcon4936115787Solid',
    scopeRole: 'supplement',
  },
  {
    nodeId: '4936:115790',
    localFile: 'solid/4936-115790.svg',
    exportName: 'FigmaIcon4936115790Solid',
    scopeRole: 'supplement',
  },
  {
    nodeId: '4936:115789',
    localFile: 'solid/4936-115789.svg',
    exportName: 'FigmaIcon4936115789Solid',
    scopeRole: 'supplement',
  },
  {
    nodeId: '4936:115788',
    localFile: 'solid/4936-115788.svg',
    exportName: 'FigmaIcon4936115788Solid',
    scopeRole: 'supplement',
  },
];

export const ICON_AUDIT_POLICIES = Object.freeze({
  'outline-v1': Object.freeze({
    id: 'outline-v1',
    variant: 'outline',
    fileKey: 'QWct5XE0Bg0bNDQ93eYgEw',
    frameNodeId: '46824:1930',
    strokeWidthPolicy: ICON_STROKE_WIDTH_POLICY,
    expectedCounts: Object.freeze({
      currentSymbols: 356,
      instances: 3,
      placements: 359,
      publicExports: 356,
    }),
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
    strokeWidthPolicy: ICON_STROKE_WIDTH_POLICY,
    prechangeBaselinePath: 'test/fixtures/icons/reference/solid-local-prechange-controls-v1.json',
    expectedCounts: Object.freeze({
      targetSymbols: 251,
      supplementalSources: 4,
      publicExports: 255,
      orphanSources: 0,
    }),
    targetMembershipSha256: '16b679e138399793f27a27b64c5e7573302416bcb81dd93fb91ed5796c2f415e',
    targetOrderSha256: '20beb1548e3309958bc085ed8cb699e141588c9c8c6a8fbe9c027925d37f1740',
    publicMappingSha256: '1955dcdb5debc249410d92ced9ca8859ceb1d5e12c850697eae18c4eb40baa73',
    supplementalSources: Object.freeze(SOLID_SUPPLEMENTS.map((entry) => Object.freeze(entry))),
  }),
});

export function getIconAuditPolicy(policyId) {
  const policy = ICON_AUDIT_POLICIES[policyId];
  if (!policy) throw new Error(`unsupported icon audit policy: ${policyId}`);
  return policy;
}

export function sortedPublicMapping(rows) {
  return rows
    .map(({ nodeId, localFile, exportName, scopeRole }) => ({
      nodeId,
      localFile,
      exportName,
      scopeRole,
    }))
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
}
