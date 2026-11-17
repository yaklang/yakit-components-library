// The joined, read-only working model. Only schema v2 is accepted on disk.
// Audit projections are computed from this model; they are not source records.
export const FIGMA_FAMILIES = ['outline', 'solid', 'colorful'];
export const sourceSvgPath = (fileKey, nodeId) => `svg/${fileKey}/${nodeId.replace(':', '-')}.svg`;
export const svgDimensions = (svg) => {
  const tag = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const attr = (name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`))?.[1];
  return { width: Number(attr('width')), height: Number(attr('height')), viewBox: attr('viewBox') };
};
export function joinIconSource(
  document,
  project,
  rawFiles,
  evidenceFiles = {},
  display = { groups: {} },
) {
  const { family, fileKey } = document;
  if (
    document.schemaVersion !== 2 ||
    !FIGMA_FAMILIES.includes(family) ||
    !/^[A-Za-z0-9]+$/.test(fileKey)
  )
    throw new Error(`ICON_SOURCE_SCHEMA_INVALID: ${family}`);
  if (project.schemaVersion !== 1) throw new Error(`ICON_PROJECT_SCHEMA_INVALID: ${family}`);
  const groups = document.groups.map((g) => ({ ...g, ...display.groups?.[g.nodeId] }));
  const identities = new Set();
  const records = document.records.map((record) => {
    const { nodeId } = record;
    if (!/^\d+:\d+$/.test(nodeId) || identities.has(nodeId))
      throw new Error(`ICON_NODE_DUPLICATE_OR_INVALID: ${nodeId}`);
    identities.add(nodeId);
    if (record.svgFile !== sourceSvgPath(fileKey, nodeId))
      throw new Error(`ICON_RAW_PATH_INVALID: ${nodeId}`);
    const svg = rawFiles[record.svgFile];
    if (typeof svg !== 'string') throw new Error(`ICON_RAW_SVG_MISSING: ${nodeId}`);
    const mapping = project.records[nodeId];
    if (!mapping) throw new Error(`ICON_EXPORT_MAPPING_MISSING: ${nodeId}`);
    const group = groups.find((g) => g.nodeId === record.groupNodeId);
    if (!group && (family === 'colorful' || record.groupNodeId !== null))
      throw new Error(`ICON_GROUP_MISSING: ${nodeId}`);
    const evidence = record.evidenceFile ? evidenceFiles[record.evidenceFile] : undefined;
    if (record.evidenceFile && !evidence) throw new Error(`ICON_EVIDENCE_MISSING: ${nodeId}`);
    const bindings = record.colorBindings;
    if (
      !bindings ||
      !['unknown', 'none', 'captured'].includes(bindings.status) ||
      !Array.isArray(bindings.bindings) ||
      (bindings.status !== 'captured' && bindings.bindings.length)
    )
      throw new Error(`ICON_BINDINGS_INVALID: ${nodeId}`);
    const dimensions = svgDimensions(svg);
    const placement = {
      ...record.nodeSize,
      nodeType: record.nodeType,
      localFile: mapping.file,
      exportName: mapping.exportName,
      scopeRole: mapping.catalogStatus === 'supplement' ? 'supplement' : 'target',
    };
    const themePaintBindings = bindings.bindings.map((b) => ({
      ...b,
      ...(mapping.variableTokens?.[b.figmaVariableId]
        ? { token: mapping.variableTokens[b.figmaVariableId] }
        : {}),
    }));
    return {
      ...record,
      exportName: mapping.exportName,
      file: mapping.file.split('/').at(-1),
      localFile: mapping.file,
      defaultColor: mapping.defaultColor,
      transform: mapping.transform ?? {},
      variableTokens: mapping.variableTokens ?? {},
      raw: { svg, nodeType: record.nodeType },
      rawSvg: svg,
      evidence,
      themePaintBindings,
      metadata: {
        ...record.nodeSize,
        nodeType: record.nodeType?.toLowerCase(),
        ...(mapping.sourceForegroundPaints
          ? { sourceForegroundPaints: mapping.sourceForegroundPaints }
          : {}),
      },
      scopeRole: placement.scopeRole,
      placement,
      placements: [
        {
          placementNodeId: nodeId,
          nodeType: 'component',
          mainComponentId: nodeId,
          mainComponentIdStatus: 'canonical-source-self',
          overridePayload: null,
          ...record.nodeSize,
        },
        ...(evidence?.placements ?? []),
      ],
      figmaName: record.name,
      category: group?.category,
      rowDisposition: 'canonical-new',
      publicExposure: 'canonical',
      sourceStatus: 'current',
      paintMode:
        Object.keys(mapping.transform?.paintReplacements ?? {}).length ||
        themePaintBindings.some((b) => b.targets?.length)
          ? 'mixed'
          : 'literal',
      width: dimensions.width,
      height: dimensions.height,
      assetIntrinsicWidth: dimensions.width,
      assetIntrinsicHeight: dimensions.height,
      assetViewBox: dimensions.viewBox,
      ...(record.nodeSize
        ? { componentWidth: record.nodeSize.width, componentHeight: record.nodeSize.height }
        : { dimensionsSource: 'svg-export' }),
      sourceUrl: `https://www.figma.com/design/${fileKey}/Icons?node-id=${nodeId.replace(':', '-')}`,
    };
  });
  for (const id of Object.keys(project.records))
    if (!identities.has(id)) throw new Error(`ICON_EXPORT_MAPPING_ORPHAN: ${id}`);
  const frameNodeId = groups[0]?.nodeId;
  const metadata = {
    schemaVersion:
      family === 'colorful' ? 'colorful-inventory-v1' : `figma-${family}-icons-inventory-v1`,
    policyId: `${family}-v1`,
    variant: family,
    frameNodeId,
    strokeWidthPolicy:
      family === 'outline'
        ? { strategy: 'local-uniform-stroke-v1', value: '1.5' }
        : { strategy: 'preserve-source-stroke-v1' },
    policyDigestAlgorithmVersion: 'policy-digest-canonical-json-v1',
    idHygieneAlgorithmVersion: 'solid-id-hygiene-v1',
    paintSemanticsAlgorithmVersion: 'geometry-role-locator-v1',
    paintComparisonNormalizationVersion: 'figma-primary-currentcolor-v1',
    ...project.rules,
  };
  return {
    ...document,
    records,
    groups,
    project,
    display,
    document,
    metadata,
    rawMetadata: { frameNodeId, frame: { nodeId: frameNodeId } },
    placementMetadata: { frameNodeId },
  };
}
