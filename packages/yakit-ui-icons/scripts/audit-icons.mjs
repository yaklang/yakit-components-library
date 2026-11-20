import { createHash } from 'node:crypto'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ICON_STROKE_WIDTH,
  ID_HYGIENE_ALGORITHM_VERSION,
  PAINT_COMPARISON_NORMALIZATION_VERSION,
  PAINT_SEMANTICS_ALGORITHM_VERSION,
  POLICY_DIGEST_ALGORITHM_VERSION,
  canonicalJson,
  getIconAuditPolicy,
  policyDigest,
  sortedPublicMapping,
} from './icon-audit-contracts.mjs'
import { buildIconNameCatalog, renderIconNameCatalog } from './icon-name-catalog-core.mjs'
import { formatGeneratedFile } from './format-generated-file.mjs'

export { canonicalJson } from './icon-audit-contracts.mjs'

// Load source projections lazily: the document builder also uses this module's SVG parser.
async function readIconInput(...args) {
  return (await import('./icon-source-documents.mjs')).readIconInput(...args)
}

const DRAWABLES = new Set(['circle', 'ellipse', 'image', 'line', 'path', 'polygon', 'polyline', 'rect', 'text', 'use'])
const DEFINITION_CONTAINERS = new Set([
  'clippath',
  'defs',
  'filter',
  'lineargradient',
  'mask',
  'marker',
  'pattern',
  'radialgradient',
  'symbol',
])
const RAW_FRAGMENT_BASE = /^icon_[A-Za-z0-9_]+__[A-Za-z][A-Za-z0-9_]*_\d+$/
const PAINT_ATTRIBUTES = new Set(['color', 'fill', 'stroke'])
const SEMANTIC_PAINT_CONTAINERS = new Set(['clippath', 'mask'])
const SEMANTIC_ERASE_SOURCE_IDS = new Set(['14203:193724', '38678:28634'])
const sha256 = (source) => createHash('sha256').update(source).digest('hex')
const lowerName = (node) => node.name.toLowerCase()

function decodeXml(value) {
  return value.replace(/&(?:#(\d+)|#x([\dA-Fa-f]+)|amp|apos|gt|lt|quot);/g, (entity, decimal, hexadecimal) => {
    if (decimal) return String.fromCodePoint(Number(decimal))
    if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16))
    return { '&amp;': '&', '&apos;': "'", '&gt;': '>', '&lt;': '<', '&quot;': '"' }[entity]
  })
}

function parseAttributes(source) {
  const attributes = new Map()
  let cursor = 0
  while (cursor < source.length) {
    while (/\s/.test(source[cursor] ?? '')) cursor += 1
    if (cursor >= source.length) break
    const nameMatch = /^[^\s=/>]+/.exec(source.slice(cursor))
    if (!nameMatch) throw new Error('invalid attribute name')
    const name = nameMatch[0]
    cursor += name.length
    while (/\s/.test(source[cursor] ?? '')) cursor += 1
    if (source[cursor] !== '=') throw new Error(`attribute ${name} has no value`)
    cursor += 1
    while (/\s/.test(source[cursor] ?? '')) cursor += 1
    const quote = source[cursor]
    if (quote !== '"' && quote !== "'") throw new Error(`attribute ${name} is unquoted`)
    const end = source.indexOf(quote, cursor + 1)
    if (end < 0) throw new Error(`attribute ${name} is unterminated`)
    if (attributes.has(name)) throw new Error(`attribute ${name} is duplicated`)
    attributes.set(name, decodeXml(source.slice(cursor + 1, end)))
    cursor = end + 1
  }
  return attributes
}

function findTagEnd(source, start) {
  let quote
  for (let cursor = start; cursor < source.length; cursor += 1) {
    const character = source[cursor]
    if (quote) {
      if (character === quote) quote = undefined
    } else if (character === '"' || character === "'") quote = character
    else if (character === '>') return cursor
  }
  return -1
}

/**
 * @typedef {object} SvgNode
 * @property {Map<string, string>} attributes
 * @property {SvgNode[]} children
 * @property {string} name
 * @property {SvgNode | null} parent
 * @property {string} text
 * @property {number} [sourceStart]
 * @property {number} [sourceEnd]
 */

/**
 * @param {string} source
 * @returns {SvgNode}
 */
export function parseSvg(source) {
  /** @type {SvgNode} */
  const document = {
    attributes: new Map(),
    children: [],
    name: '#document',
    parent: null,
    text: '',
  }
  const stack = [document]
  let cursor = source.charCodeAt(0) === 0xfeff ? 1 : 0
  while (cursor < source.length) {
    if (source[cursor] !== '<') {
      const end = source.indexOf('<', cursor)
      const textEnd = end < 0 ? source.length : end
      stack.at(-1).text += decodeXml(source.slice(cursor, textEnd))
      cursor = textEnd
      continue
    }
    if (source.startsWith('<!--', cursor)) {
      const end = source.indexOf('-->', cursor + 4)
      if (end < 0) throw new Error('unterminated comment')
      cursor = end + 3
      continue
    }
    if (source.startsWith('<?', cursor)) {
      const end = source.indexOf('?>', cursor + 2)
      if (end < 0) throw new Error('unterminated processing instruction')
      cursor = end + 2
      continue
    }
    if (source.startsWith('<![CDATA[', cursor)) {
      const end = source.indexOf(']]>', cursor + 9)
      if (end < 0) throw new Error('unterminated CDATA')
      stack.at(-1).text += source.slice(cursor + 9, end)
      cursor = end + 3
      continue
    }
    if (source.startsWith('<!', cursor)) throw new Error('unsupported declaration')
    const end = findTagEnd(source, cursor + 1)
    if (end < 0) throw new Error('unterminated tag')
    let body = source.slice(cursor + 1, end).trim()
    if (body.startsWith('/')) {
      const closingName = body.slice(1).trim()
      const current = stack.pop()
      if (stack.length === 0 || current.name !== closingName) throw new Error(`mismatched closing tag ${closingName}`)
      cursor = end + 1
      continue
    }
    const selfClosing = body.endsWith('/')
    if (selfClosing) body = body.slice(0, -1).trimEnd()
    const nameMatch = /^[^\s/>]+/.exec(body)
    if (!nameMatch) throw new Error('missing element name')
    const name = nameMatch[0]
    const parent = stack.at(-1)
    /** @type {SvgNode} */
    const node = {
      attributes: parseAttributes(body.slice(name.length)),
      sourceStart: cursor,
      sourceEnd: end + 1,
      children: [],
      name,
      parent,
      text: '',
    }
    parent.children.push(node)
    if (!selfClosing) stack.push(node)
    cursor = end + 1
  }
  if (stack.length !== 1) throw new Error(`unclosed tag ${stack.at(-1).name}`)
  if (document.children.length !== 1 || lowerName(document.children[0]) !== 'svg')
    throw new Error('document must contain one svg root')
  return document.children[0]
}

export function canonicalizeSvg(
  source,
  {
    geometryOnly = false,
    ignoreUnreferencedIds = false,
    normalizeForegroundPaint = false,
    normalizeSemanticErase = false,
    normalizeStrokeWidth = false,
    semanticEraseSourceId,
  } = {},
) {
  const root = parseSvg(source)
  const ignorePresentationIds = ignoreUnreferencedIds || geometryOnly
  const referencedIds = new Set()
  if (ignorePresentationIds) visit(root, (node) => referencesFrom(node).forEach(({ id }) => referencedIds.add(id)))
  const semanticEraseEnabled = normalizeSemanticErase && SEMANTIC_ERASE_SOURCE_IDS.has(semanticEraseSourceId)
  const semanticEraseMasks = new Map()
  if (semanticEraseEnabled) {
    const referenceCounts = new Map()
    visit(root, (node) => {
      for (const reference of referencesFrom(node))
        referenceCounts.set(reference.id, (referenceCounts.get(reference.id) ?? 0) + 1)
    })
    visit(root, (node) => {
      if (lowerName(node) !== 'mask' || node.attributes.get('mask-type') !== 'luminance') return
      const id = node.attributes.get('id')
      const rectangles = node.children.filter((child) => lowerName(child) === 'rect')
      const paths = node.children.filter((child) => lowerName(child) === 'path')
      if (
        !id ||
        referenceCounts.get(id) !== 1 ||
        rectangles.length !== 1 ||
        paths.length !== 1 ||
        rectangles[0].attributes.get('width') !== '24' ||
        rectangles[0].attributes.get('height') !== '24' ||
        rectangles[0].attributes.get('fill') !== 'white' ||
        paths[0].attributes.get('stroke') !== 'black'
      )
        return
      semanticEraseMasks.set(id, { mask: node, path: paths[0] })
    })
  }
  const idMap = new Map()
  let idOrdinal = 0
  visit(root, (node) => {
    const id = node.attributes.get('id')
    if (id && (!ignorePresentationIds || referencedIds.has(id))) idMap.set(id, `fragment_${idOrdinal++}`)
  })
  const normalizeValue = (name, value, insideDefinition) => {
    let normalized = value.trim().replace(/\s+/g, ' ')
    for (const [id, replacement] of idMap) normalized = normalized.replaceAll(id, replacement)
    if (normalizeStrokeWidth && name === 'stroke-width') return ICON_STROKE_WIDTH
    if (geometryOnly && (PAINT_ATTRIBUTES.has(name) || name === 'style') && normalized !== 'none') return '<paint>'
    if (normalizeForegroundPaint && !insideDefinition) {
      if (PAINT_ATTRIBUTES.has(name) && normalized !== 'none' && !normalized.startsWith('url(')) return '<foreground>'
    }
    if (name === 'style' && (normalizeForegroundPaint || normalizeStrokeWidth))
      normalized = styleDeclarations(normalized)
        .map(({ attribute, value: styleValue }) => {
          if (normalizeStrokeWidth && attribute === 'stroke-width') return `${attribute}:${ICON_STROKE_WIDTH}`
          if (
            normalizeForegroundPaint &&
            PAINT_ATTRIBUTES.has(attribute) &&
            styleValue !== 'none' &&
            !styleValue.startsWith('url(')
          )
            return `${attribute}:<foreground>`
          return `${attribute}:${styleValue}`
        })
        .join(';')
    return normalized
  }
  const serializeSemanticErase = (node) => {
    const attributes = [...node.attributes]
      .filter(([name]) => !PAINT_ATTRIBUTES.has(name))
      .map(([name, value]) => [name, normalizeValue(name, value, false)])
      .sort(([left], [right]) => left.localeCompare(right))
    return `<semanticErase${attributes
      .map(([name, value]) => ` ${name}=${JSON.stringify(value)}`)
      .join('')}></semanticErase>`
  }
  const serialize = (node, insideDefinition = false) => {
    const nextInsideDefinition = insideDefinition || DEFINITION_CONTAINERS.has(lowerName(node))
    if (
      semanticEraseEnabled &&
      lowerName(node) === 'path' &&
      !insideDefinition &&
      node.attributes.get('stroke') === 'white'
    )
      return serializeSemanticErase(node)
    if (semanticEraseEnabled && lowerName(node) === 'mask' && semanticEraseMasks.has(node.attributes.get('id')))
      return ''
    const attributes = [...node.attributes]
      .filter(
        ([name, value]) =>
          !(
            semanticEraseEnabled &&
            name === 'mask' &&
            value.startsWith('url(#') &&
            semanticEraseMasks.has(value.slice(5, -1))
          ),
      )
      .filter(([name]) => !geometryOnly || (name !== 'id' && !name.startsWith('aria-')))
      .filter(([name, value]) => !(ignoreUnreferencedIds && name === 'id' && !referencedIds.has(value)))
      .map(([name, value]) => [name, normalizeValue(name, value, nextInsideDefinition)])
      .sort(([left], [right]) => left.localeCompare(right))
    let content = `${node.text.trim()}${node.children.map((child) => serialize(child, nextInsideDefinition)).join('')}`
    if (semanticEraseEnabled) {
      const maskReference = node.attributes.get('mask')
      if (maskReference?.startsWith('url(#')) {
        const semanticMask = semanticEraseMasks.get(maskReference.slice(5, -1))
        if (semanticMask) content += serializeSemanticErase(semanticMask.path)
      }
    }
    if (lowerName(node) === 'defs' && content === '') return ''
    if (lowerName(node) === 'g' && attributes.length === 0 && node.text.trim() === '') return content
    return `<${node.name}${attributes.map(([name, value]) => ` ${name}=${JSON.stringify(value)}`).join('')}>${content}</${node.name}>`
  }
  return serialize(root)
}

function geometryAttributes(node, { normalizeStrokeWidth = false } = {}) {
  return [...node.attributes]
    .filter(
      ([name]) =>
        !PAINT_ATTRIBUTES.has(name) &&
        name !== 'style' &&
        name !== 'id' &&
        !name.startsWith('aria-') &&
        name !== 'href' &&
        name !== 'xlink:href' &&
        !['clip-path', 'mask', 'filter'].includes(name),
    )
    .map(([name, value]) => [
      name,
      normalizeStrokeWidth && name === 'stroke-width' ? ICON_STROKE_WIDTH : value.trim().replace(/\s+/g, ' '),
    ])
    .sort(([left], [right]) => left.localeCompare(right))
}

export function collectPaintSemantics(source, { normalizeFigmaPrimary = false, normalizeStrokeWidth = false } = {}) {
  const root = typeof source === 'string' ? parseSvg(source) : source
  const rows = []
  let drawableOrdinal = 0
  visit(root, (node, insideDefinition) => {
    if (!DRAWABLES.has(lowerName(node))) return
    const ordinal = drawableOrdinal++
    for (const { attribute, value } of paintValues(node)) {
      if (value === 'none' || value.startsWith('url(')) continue
      let role
      let normalizedValue = value
      if (insideDefinition) role = 'definition-semantic-literal'
      else if (value === 'currentColor') role = 'primary-currentColor'
      else if (normalizeFigmaPrimary && value.toLowerCase() === '#353639') {
        role = 'primary-currentColor'
        normalizedValue = 'currentColor'
      } else if (['white', '#fff', '#ffffff'].includes(value.toLowerCase())) role = 'foreground-cutout-literal'
      else role = 'secondary-literal'
      rows.push({
        drawableOrdinal: ordinal,
        tag: lowerName(node),
        geometryAttributesSha256: sha256(canonicalJson(geometryAttributes(node, { normalizeStrokeWidth }))),
        paintAttribute: attribute,
        role,
        value: normalizedValue,
      })
    }
  })
  rows.sort(
    (left, right) =>
      left.drawableOrdinal - right.drawableOrdinal || left.paintAttribute.localeCompare(right.paintAttribute),
  )
  return rows
}

export function paintSemanticsSha256(source, options) {
  return sha256(canonicalJson(collectPaintSemantics(source, options)))
}

function visit(node, callback, insideDefinition = false) {
  const nextInsideDefinition = insideDefinition || DEFINITION_CONTAINERS.has(lowerName(node))
  callback(node, nextInsideDefinition)
  node.children.forEach((child) => visit(child, callback, nextInsideDefinition))
}

function referencesFrom(node) {
  const references = []
  for (const [name, value] of node.attributes) {
    for (const match of value.matchAll(/url\(\s*#([^\s)]+)\s*\)/g)) references.push({ id: match[1], name, node })
    if ((name === 'href' || name === 'xlink:href') && value.startsWith('#'))
      references.push({ id: value.slice(1), name, node })
    if (name === 'aria-labelledby' || name === 'aria-describedby') {
      value
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .forEach((id) => references.push({ id, name, node }))
    }
  }
  return references
}

function exceptionMatches(exceptions, relativePath, node, attribute, value) {
  let owner = node
  while (owner && !(DEFINITION_CONTAINERS.has(lowerName(owner)) && owner.attributes.get('id'))) owner = owner.parent
  const ownerName = owner && lowerName(owner)
  return (
    SEMANTIC_PAINT_CONTAINERS.has(ownerName) &&
    exceptions.some(
      (entry) =>
        entry.path === relativePath &&
        entry.attribute === attribute &&
        entry.value === value &&
        entry.definitionId === owner?.attributes.get('id') &&
        typeof entry.reason === 'string' &&
        entry.reason.trim(),
    )
  )
}

function styleDeclarations(value) {
  return value
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(':')
      if (separator < 1) return { attribute: 'style', value: declaration }
      return {
        attribute: declaration.slice(0, separator).trim().toLowerCase(),
        value: declaration.slice(separator + 1).trim(),
      }
    })
}

function stylePaints(value) {
  return styleDeclarations(value).filter(({ attribute }) => PAINT_ATTRIBUTES.has(attribute))
}

export function invalidStrokeWidths(source) {
  const root = typeof source === 'string' ? parseSvg(source) : source
  const violations = []
  visit(root, (node) => {
    const attributeValue = node.attributes.get('stroke-width')
    if (attributeValue !== undefined && attributeValue.trim() !== ICON_STROKE_WIDTH)
      violations.push({ surface: 'attribute', tag: lowerName(node), value: attributeValue.trim() })
    for (const { attribute, value } of styleDeclarations(node.attributes.get('style') ?? ''))
      if (attribute === 'stroke-width' && value !== ICON_STROKE_WIDTH)
        violations.push({ surface: 'style', tag: lowerName(node), value })
  })
  return violations
}

function paintValues(node) {
  const values = []
  for (const [attribute, value] of node.attributes) {
    if (PAINT_ATTRIBUTES.has(attribute)) values.push({ attribute, value })
    if (attribute === 'style') values.push(...stylePaints(value))
  }
  return values
}

export function inspectSvg({ manifest, relativePath, source, variant }) {
  const errors = []
  let root
  try {
    root = parseSvg(source)
  } catch {
    return ['XML_INVALID']
  }
  if (variant === 'outline' && invalidStrokeWidths(root).length > 0) errors.push('STROKE_WIDTH_INVALID')
  const expectedSize = variant === 'outline' ? '24' : '20'
  const expectedViewBox = `0 0 ${expectedSize} ${expectedSize}`
  if (root.attributes.get('preserveAspectRatio') === 'none' || root.attributes.get('overflow') === 'visible')
    errors.push('PARTIAL_EXPORT')
  else if (
    root.attributes.get('width') !== expectedSize ||
    root.attributes.get('height') !== expectedSize ||
    root.attributes.get('viewBox') !== expectedViewBox
  )
    errors.push(`VIEWPORT_${variant.toUpperCase()}_INVALID`)

  const drawables = []
  const references = []
  const ids = new Map()
  const exceptions = manifest?.paintExceptions ?? []
  const record =
    (manifest?.symbols ?? manifest?.currentSymbols ?? []).find(
      (entry) => entry.localFile === relativePath || entry.file === path.basename(relativePath),
    ) ??
    manifest?.supplementalSources?.find(
      (entry) => entry.localFile === relativePath || entry.file === path.basename(relativePath),
    )
  visit(root, (node, insideDefinition) => {
    if (DRAWABLES.has(lowerName(node)) && !insideDefinition) drawables.push(node)
    const id = node.attributes.get('id')
    if (id) {
      if (ids.has(id)) errors.push('FRAGMENT_BASE_COLLISION')
      ids.set(id, node)
    }
    references.push(...referencesFrom(node))
    if (variant === 'outline') {
      for (const { attribute, value } of paintValues(node)) {
        if (
          value === 'currentColor' ||
          value === 'var(--Colors-Use-Neutral-Text-1-Title, #353639)' ||
          value === 'none' ||
          value.startsWith('url(')
        )
          continue
        if (!insideDefinition) {
          const sourcePaint = record?.sourceForegroundPaints?.some(
            (paint) =>
              paint.tag === node.name &&
              paint.d === node.attributes.get('d') &&
              paint.attribute === attribute &&
              paint.value === value &&
              ['white', '#fff', '#ffffff'].includes(value.toLowerCase()),
          )
          if (!sourcePaint) errors.push('FOREGROUND_LITERAL')
        } else if (!exceptionMatches(exceptions, relativePath, node, attribute, value))
          errors.push('MASK_EXCEPTION_INVALID')
      }
    } else if (variant === 'solid') {
      for (const { value } of paintValues(node)) {
        if (!insideDefinition && value.toLowerCase() === '#353639') errors.push('FOREGROUND_LITERAL')
      }
    }
  })
  if (drawables.length === 0) errors.push('DRAWABLE_EMPTY')
  if (
    drawables.length === 1 &&
    lowerName(drawables[0]) === 'rect' &&
    ['100%', expectedSize].includes(drawables[0].attributes.get('width')) &&
    ['100%', expectedSize].includes(drawables[0].attributes.get('height'))
  )
    errors.push('PLACEHOLDER_RECT')

  for (const reference of references) {
    const owner = ids.get(reference.id)
    if (!owner) errors.push('FRAGMENT_ORPHAN')
    if (!RAW_FRAGMENT_BASE.test(reference.id)) errors.push('FRAGMENT_BASE_INVALID')
    if (owner && DEFINITION_CONTAINERS.has(lowerName(owner))) {
      let hasDrawable = false
      visit(owner, (node) => {
        if (node !== owner && DRAWABLES.has(lowerName(node))) hasDrawable = true
      })
      if (!hasDrawable) errors.push('DEFINITION_EMPTY')
    }
  }
  for (const id of ids.keys())
    if (!references.some((reference) => reference.id === id)) errors.push('FRAGMENT_UNUSED_ID')
  const semanticEraseSourceId = manifest?.semanticEraseNormalizations?.some(
    (entry) =>
      entry.exportedSourceNodeId === record?.exportedSourceNodeId && entry.strategy === 'luminance-mask-overdraw-v1',
  )
    ? record.exportedSourceNodeId
    : undefined
  if (record?.localRawSvgSha256 && record.localRawSvgSha256 !== sha256(source)) errors.push('LOCAL_RAW_HASH_MISMATCH')
  if (record?.figmaRawSvg && record.figmaRawSvgSha256 !== sha256(record.figmaRawSvg))
    errors.push('FIGMA_RAW_HASH_MISMATCH')
  const normalizedAstSha256 = sha256(
    canonicalizeSvg(source, {
      ignoreUnreferencedIds: variant === 'solid',
      normalizeForegroundPaint: true,
      normalizeSemanticErase: true,
      normalizeStrokeWidth: variant !== 'solid',
      semanticEraseSourceId,
    }),
  )
  const geometrySha256 = sha256(
    canonicalizeSvg(source, {
      geometryOnly: true,
      ignoreUnreferencedIds: variant === 'solid',
      normalizeSemanticErase: true,
      normalizeStrokeWidth: variant !== 'solid',
      semanticEraseSourceId,
    }),
  )
  if (record?.localNormalizedAstSha256 && record.localNormalizedAstSha256 !== normalizedAstSha256)
    errors.push('AST_DIGEST_MISMATCH')
  if (record?.normalizedAstSha256 && record.normalizedAstSha256 !== normalizedAstSha256)
    errors.push('AST_DIGEST_MISMATCH')
  if (record?.localGeometrySha256 && record.localGeometrySha256 !== geometrySha256)
    errors.push('GEOMETRY_DIGEST_MISMATCH')
  if (record?.geometrySha256 && record.geometrySha256 !== geometrySha256) errors.push('GEOMETRY_DIGEST_MISMATCH')
  if (
    variant === 'solid' &&
    record?.localPaintSemanticsSha256 &&
    record.localPaintSemanticsSha256 !==
      paintSemanticsSha256(source, {
        normalizeFigmaPrimary: true,
        normalizeStrokeWidth: variant !== 'solid',
      })
  )
    errors.push('PAINT_SEMANTICS_MISMATCH')
  if (record?.minimumDrawableCount && drawables.length < record.minimumDrawableCount) errors.push('PARTIAL_EXPORT')
  return [...new Set(errors)]
}

async function listSvgFiles(root, variants = ['outline', 'solid']) {
  const files = []
  for (const variant of variants) {
    const directory = path.join(root, variant)
    try {
      for (const name of (await readdir(directory)).filter((entry) => entry.endsWith('.svg')).sort())
        files.push({
          absolutePath: path.join(directory, name),
          relativePath: `${variant}/${name}`,
          variant,
        })
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  return files
}

function validateSolidManifest(manifest, files, policy) {
  const errors = []
  const algorithmsMatch =
    manifest.policyDigestAlgorithmVersion === POLICY_DIGEST_ALGORITHM_VERSION &&
    manifest.idHygieneAlgorithmVersion === ID_HYGIENE_ALGORITHM_VERSION &&
    manifest.paintSemanticsAlgorithmVersion === PAINT_SEMANTICS_ALGORITHM_VERSION
  const paintComparisonVersionMatches =
    manifest.paintComparisonNormalizationVersion === PAINT_COMPARISON_NORMALIZATION_VERSION
  if (!algorithmsMatch || !paintComparisonVersionMatches) errors.push('ALGORITHM_VERSION_UNSUPPORTED')
  if (canonicalJson(manifest.strokeWidthPolicy) !== canonicalJson(policy.strokeWidthPolicy))
    errors.push('POLICY_CONTRACT_MISMATCH')
  if (
    manifest.policyId !== policy.id ||
    manifest.variant !== policy.variant ||
    manifest.fileKey !== policy.fileKey ||
    manifest.frameNodeId !== policy.frameNodeId
  )
    errors.push('MANIFEST_INCOMPLETE')
  const symbols = manifest.symbols ?? []
  const supplements = manifest.supplementalSources ?? []
  const publicExports = manifest.publicExports ?? []
  const orphans = manifest.orphanSources ?? []
  if (
    symbols.length !== policy.expectedCounts.targetSymbols ||
    supplements.length !== policy.expectedCounts.supplementalSources ||
    publicExports.length !== policy.expectedCounts.publicExports ||
    orphans.length !== policy.expectedCounts.orphanSources ||
    canonicalJson(manifest.expectedCounts) !== canonicalJson(policy.expectedCounts)
  )
    errors.push('MANIFEST_INCOMPLETE')
  const targetIds = symbols.map((entry) => entry.nodeId ?? entry.exportedSourceNodeId)
  const targetIdSet = new Set(targetIds)
  const supplementIds = supplements.map((entry) => entry.nodeId ?? entry.exportedSourceNodeId)
  if (supplementIds.some((nodeId) => targetIdSet.has(nodeId))) errors.push('MANIFEST_SCOPE_OVERLAP')
  const membershipDigest = policyDigest([...targetIds].sort())
  const orderDigest = policyDigest(targetIds)
  const mappingDigest = policyDigest(sortedPublicMapping(publicExports))
  if (
    membershipDigest !== policy.targetMembershipSha256 ||
    orderDigest !== policy.targetOrderSha256 ||
    mappingDigest !== policy.publicMappingSha256 ||
    manifest.targetMembershipSha256 !== policy.targetMembershipSha256 ||
    manifest.targetOrderSha256 !== policy.targetOrderSha256 ||
    manifest.publicMappingSha256 !== policy.publicMappingSha256 ||
    canonicalJson(
      supplements.map(({ nodeId, exportedSourceNodeId, localFile, exportName, scopeRole }) => ({
        nodeId: nodeId ?? exportedSourceNodeId,
        localFile,
        exportName,
        scopeRole,
      })),
    ) !== canonicalJson(policy.supplementalSources)
  )
    errors.push('POLICY_CONTRACT_MISMATCH')
  const fileNames = new Set(files.filter(({ variant }) => variant === 'solid').map(({ relativePath }) => relativePath))
  const classified = [...symbols, ...supplements]
  const classifiedFiles = new Set(classified.map(({ localFile }) => localFile))
  if (
    classifiedFiles.size !== policy.expectedCounts.publicExports ||
    fileNames.size !== policy.expectedCounts.publicExports ||
    [...fileNames].some((file) => !classifiedFiles.has(file)) ||
    [...classifiedFiles].some((file) => !fileNames.has(file))
  )
    errors.push('INVENTORY_CURRENT_MISSING')
  for (const record of classified) {
    if (
      !record.nodeId ||
      !record.localFile ||
      !record.exportName ||
      !record.figmaRawSvgSha256 ||
      !record.localRawSvgSha256 ||
      !record.normalizedAstSha256 ||
      !record.geometrySha256 ||
      !record.figmaPaintSemanticsSha256 ||
      !record.localPaintSemanticsSha256 ||
      !Number.isInteger(record.minimumDrawableCount) ||
      record.minimumDrawableCount < 1 ||
      !Array.isArray(record.paintRoles)
    )
      errors.push('MANIFEST_INCOMPLETE')
    if (record.figmaPaintSemanticsSha256 !== record.localPaintSemanticsSha256) errors.push('PAINT_SEMANTICS_MISMATCH')
  }
  for (const field of ['figmaRawProvenanceSha256', 'placementProvenanceSha256'])
    if (!manifest.sourceEvidence?.[field]) errors.push('MANIFEST_INCOMPLETE')
  return [...new Set(errors)]
}

function validateManifest(manifest, files, policy) {
  if (!manifest) return []
  if (policy.variant === 'solid') return validateSolidManifest(manifest, files, policy)
  const errors = []
  if (canonicalJson(manifest.strokeWidthPolicy) !== canonicalJson(policy.strokeWidthPolicy))
    errors.push('POLICY_CONTRACT_MISMATCH')
  for (const field of ['figmaRawProvenanceSha256', 'placementProvenanceSha256'])
    if (!manifest.sourceEvidence?.[field]) errors.push('MANIFEST_INCOMPLETE')
  const symbols = manifest.symbols ?? manifest.currentSymbols ?? []
  const expected = policy.expectedCounts
  if (canonicalJson(manifest.expectedCounts) !== canonicalJson(expected) || symbols.length !== expected.currentSymbols)
    errors.push('MANIFEST_INCOMPLETE')
  if (manifest.fileKey === 'QWct5XE0Bg0bNDQ93eYgEw' && manifest.frameNodeId !== '46824:1930')
    errors.push('MANIFEST_INCOMPLETE')
  const outlineNames = new Set(
    files.filter(({ variant }) => variant === 'outline').map(({ relativePath }) => path.basename(relativePath)),
  )
  for (const symbol of symbols) {
    const file = symbol.localFile ?? symbol.file
    if (!file || !outlineNames.has(path.basename(file))) errors.push('INVENTORY_CURRENT_MISSING')
    if (!symbol.exportedSourceNodeId) errors.push('MANIFEST_INCOMPLETE')
    if (!symbol.figmaRawSvgSha256) errors.push('FIGMA_RAW_HASH_MISMATCH')
    if (!symbol.localRawSvgSha256) errors.push('LOCAL_RAW_HASH_MISMATCH')
    if (!symbol.normalizedAstSha256) errors.push('AST_DIGEST_MISMATCH')
    if (!symbol.geometrySha256) errors.push('GEOMETRY_DIGEST_MISMATCH')
    if (
      symbol.figmaNormalizedAstSha256 !== symbol.normalizedAstSha256 ||
      symbol.localNormalizedAstSha256 !== symbol.normalizedAstSha256
    )
      errors.push('AST_DIGEST_MISMATCH')
    if (symbol.figmaGeometrySha256 !== symbol.geometrySha256 || symbol.localGeometrySha256 !== symbol.geometrySha256)
      errors.push('GEOMETRY_DIGEST_MISMATCH')
  }
  const semanticEraseSourceIds = (manifest.semanticEraseNormalizations ?? [])
    .filter(({ strategy }) => strategy === 'luminance-mask-overdraw-v1')
    .map(({ exportedSourceNodeId }) => exportedSourceNodeId)
    .sort()
  if (JSON.stringify(semanticEraseSourceIds) !== JSON.stringify([...SEMANTIC_ERASE_SOURCE_IDS].sort()))
    errors.push('MANIFEST_INCOMPLETE')
  if ((manifest.legacySources ?? []).length !== 0) errors.push('LEGACY_STATUS_INVALID')
  return [...new Set(errors)]
}

async function validateProvenanceEvidence({ figmaRawProvenancePath, manifest, placementProvenancePath, policy }) {
  if (!manifest || !figmaRawProvenancePath || !placementProvenancePath) return []
  const errors = []
  const [rawText, placementText] = await Promise.all([
    readIconInput(figmaRawProvenancePath, 'utf8'),
    readIconInput(placementProvenancePath, 'utf8'),
  ])
  if (sha256(rawText) !== manifest.sourceEvidence?.figmaRawProvenanceSha256) errors.push('FIGMA_RAW_HASH_MISMATCH')
  if (sha256(placementText) !== manifest.sourceEvidence?.placementProvenanceSha256) errors.push('MANIFEST_INCOMPLETE')
  const raw = JSON.parse(rawText)
  const placement = JSON.parse(placementText)
  const components = new Map(
    [...(raw.components ?? []), ...(raw.supplementalComponents ?? [])].map((entry) => [entry.nodeId, entry.svg]),
  )
  const records =
    policy.variant === 'solid'
      ? [...(manifest.symbols ?? []), ...(manifest.supplementalSources ?? [])]
      : (manifest.symbols ?? [])
  for (const symbol of records) {
    const sourceNodeId = symbol.nodeId ?? symbol.exportedSourceNodeId
    const figmaSource = components.get(sourceNodeId)
    if (!figmaSource || sha256(figmaSource) !== symbol.figmaRawSvgSha256) {
      errors.push('FIGMA_RAW_HASH_MISMATCH')
      continue
    }
    const normalizedAstSha256 = sha256(
      canonicalizeSvg(figmaSource, {
        ignoreUnreferencedIds: policy.variant === 'solid',
        normalizeForegroundPaint: true,
        normalizeSemanticErase: true,
        normalizeStrokeWidth: policy.variant !== 'solid',
        semanticEraseSourceId: sourceNodeId,
      }),
    )
    const geometrySha256 = sha256(
      canonicalizeSvg(figmaSource, {
        geometryOnly: true,
        ignoreUnreferencedIds: policy.variant === 'solid',
        normalizeSemanticErase: true,
        normalizeStrokeWidth: policy.variant !== 'solid',
        semanticEraseSourceId: sourceNodeId,
      }),
    )
    if (symbol.figmaNormalizedAstSha256 !== normalizedAstSha256 || symbol.normalizedAstSha256 !== normalizedAstSha256)
      errors.push('AST_DIGEST_MISMATCH')
    if (symbol.figmaGeometrySha256 !== geometrySha256 || symbol.geometrySha256 !== geometrySha256)
      errors.push('GEOMETRY_DIGEST_MISMATCH')
    const figmaPaintSemanticsSha256 = paintSemanticsSha256(figmaSource, {
      normalizeFigmaPrimary: policy.variant === 'solid',
      normalizeStrokeWidth: policy.variant !== 'solid',
    })
    if (
      policy.variant === 'solid' &&
      (symbol.figmaPaintSemanticsSha256 !== figmaPaintSemanticsSha256 ||
        symbol.figmaPaintSemanticsSha256 !== symbol.localPaintSemanticsSha256)
    )
      errors.push('PAINT_SEMANTICS_MISMATCH')
  }
  if (policy.variant === 'solid') {
    const placementTargetIds = (placement.targetSymbols ?? placement.symbols ?? placement.currentSymbols ?? []).map(
      (entry) => entry.nodeId ?? entry.exportedSourceNodeId,
    )
    const rawTargetIds = (raw.components ?? []).map(({ nodeId }) => nodeId)
    const rawSupplementIds = (raw.supplementalComponents ?? []).map(({ nodeId }) => nodeId)
    const evidenceSupplementTuples = (placement.supplementalSources ?? []).map(
      ({ nodeId, exportedSourceNodeId, localFile, exportName, scopeRole }) => ({
        nodeId: nodeId ?? exportedSourceNodeId,
        localFile: localFile?.startsWith('solid/') ? localFile : `solid/${localFile}`,
        exportName,
        scopeRole: scopeRole === 'supplemental' ? 'supplement' : scopeRole,
      }),
    )
    if (
      raw.fileKey !== policy.fileKey ||
      raw.frameNodeId !== policy.frameNodeId ||
      placement.fileKey !== policy.fileKey ||
      placement.frameNodeId !== policy.frameNodeId ||
      policyDigest(placementTargetIds) !== policy.targetOrderSha256 ||
      policyDigest([...placementTargetIds].sort()) !== policy.targetMembershipSha256 ||
      policyDigest(rawTargetIds) !== policy.targetOrderSha256 ||
      policyDigest([...rawTargetIds].sort()) !== policy.targetMembershipSha256 ||
      canonicalJson(rawSupplementIds) !== canonicalJson(policy.supplementalSources.map(({ nodeId }) => nodeId)) ||
      canonicalJson(evidenceSupplementTuples) !== canonicalJson(policy.supplementalSources)
    )
      errors.push('POLICY_CONTRACT_MISMATCH')
    return [...new Set(errors)]
  }
  return [...new Set(errors)]
}

export function parseIconIndex(source) {
  const imports = new Map()
  const importFiles = new Map()
  const duplicateImports = new Set()
  for (const match of source.matchAll(/import\s+(\w+)Svg\s+from\s+['"]\.\/(.+?\.svg)\?react['"];?/g)) {
    const [, localName, file] = match
    if (imports.has(localName) || importFiles.has(file)) duplicateImports.add(file)
    imports.set(localName, file)
    importFiles.set(file, localName)
  }
  const exports = new Map()
  const duplicateExports = new Set()
  const missingImportTargets = new Set()
  for (const match of source.matchAll(/export\s+const\s+(\w+)\s*=\s*createIcon\(\s*(\w+)Svg\s*,/g)) {
    const [, exportName, localName] = match
    if (exports.has(exportName)) duplicateExports.add(exportName)
    exports.set(exportName, imports.get(localName))
    if (!imports.has(localName)) missingImportTargets.add(localName)
  }
  return { duplicateExports, duplicateImports, exports, importFiles, missingImportTargets }
}

async function validateIndex({ files, indexPath, manifest, root }) {
  if (!indexPath) return []
  const errors = []
  let indexSource
  try {
    indexSource = await readIconInput(indexPath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return ['IMPORT_MISSING']
    throw error
  }
  const parsed = parseIconIndex(indexSource)
  if (parsed.duplicateExports.size || parsed.duplicateImports.size) errors.push('EXPORT_DUPLICATE')
  if (parsed.missingImportTargets.size) errors.push('IMPORT_MISSING')
  const variant = manifest?.variant ?? 'outline'
  const variantFiles = new Set(
    files.filter((file) => file.variant === variant).map(({ relativePath }) => path.basename(relativePath)),
  )
  for (const file of parsed.importFiles.keys()) {
    try {
      await readIconInput(path.join(root, variant, file))
    } catch (error) {
      if (error.code === 'ENOENT') errors.push('IMPORT_MISSING')
      else throw error
    }
  }
  for (const file of variantFiles) if (!parsed.importFiles.has(file)) errors.push('INVENTORY_CURRENT_MISSING')
  const expectedPublicCount = manifest?.expectedCounts?.publicExports
  if (manifest && parsed.exports.size !== expectedPublicCount) errors.push('MANIFEST_INCOMPLETE')
  const publicNames = new Set(parsed.exports.keys())
  for (const symbol of manifest?.symbols ?? []) {
    if (!symbol.exportName || !publicNames.has(symbol.exportName)) errors.push('INVENTORY_CURRENT_MISSING')
  }
  for (const legacy of manifest?.legacySources ?? []) {
    if (!legacy.exportName || !publicNames.has(legacy.exportName)) errors.push('INVENTORY_CURRENT_MISSING')
  }
  for (const supplement of manifest?.supplementalSources ?? []) {
    if (!supplement.exportName || !parsed.exports.has(supplement.exportName)) errors.push('INVENTORY_CURRENT_MISSING')
  }
  if (manifest?.variant === 'solid') {
    const actualMapping = [...parsed.exports].map(([exportName, file]) => ({
      nodeId: file?.replace(/\.svg$/, '').replace('-', ':'),
      localFile: `solid/${file}`,
      exportName,
      scopeRole: manifest.supplementalSources?.some((entry) => entry.localFile === `solid/${file}`)
        ? 'supplement'
        : 'target',
    }))
    if (policyDigest(sortedPublicMapping(actualMapping)) !== manifest.publicMappingSha256)
      errors.push('POLICY_CONTRACT_MISMATCH')
  }
  return [...new Set(errors)]
}

/**
 * @param {object} options
 * @param {string} options.root
 * @param {string} [options.iconNameCatalogPath]
 * @param {string} [options.outlineNameIndexPath]
 * @param {string} [options.outlineNameManifestPath]
 * @param {string} [options.outlineNamePlacementProvenancePath]
 * @param {string} [options.outlineNameRawProvenancePath]
 * @param {string} [options.figmaRawProvenancePath]
 * @param {string} [options.indexPath]
 * @param {string} [options.manifestPath]
 * @param {string} [options.placementProvenancePath]
 * @param {string} [options.policyId]
 * @param {ReturnType<typeof getIconAuditPolicy>} [options.policyOverride]
 * @param {string} [options.solidNameIndexPath]
 * @param {string} [options.solidNameManifestPath]
 * @param {string} [options.solidNamePlacementProvenancePath]
 * @param {string} [options.solidNameRawProvenancePath]
 */
export async function auditIcons({
  iconNameCatalogPath,
  outlineNameIndexPath,
  outlineNameManifestPath,
  outlineNamePlacementProvenancePath,
  outlineNameRawProvenancePath,
  figmaRawProvenancePath,
  indexPath,
  manifestPath,
  placementProvenancePath,
  policyId,
  policyOverride,
  root,
  solidNameIndexPath,
  solidNameManifestPath,
  solidNamePlacementProvenancePath,
  solidNameRawProvenancePath,
}) {
  const manifest = manifestPath ? JSON.parse(await readIconInput(manifestPath, 'utf8')) : undefined
  const resolvedPolicyId = policyId ?? manifest?.policyId ?? 'outline-v1'
  const policy = policyOverride ?? getIconAuditPolicy(resolvedPolicyId)
  const files = await listSvgFiles(
    root,
    policyId || manifest?.policyId || manifest?.variant ? [policy.variant] : undefined,
  )
  const failures = []
  for (const file of files) {
    const source = await readIconInput(file.absolutePath, 'utf8')
    inspectSvg({
      manifest,
      relativePath: file.relativePath,
      source,
      variant: file.variant,
    }).forEach((token) => failures.push({ path: file.relativePath, token }))
  }
  const owners = new Map()
  for (const file of files) {
    const source = await readIconInput(file.absolutePath, 'utf8')
    let svg
    try {
      svg = parseSvg(source)
    } catch {
      continue
    }
    visit(svg, (node) => {
      const id = node.attributes.get('id')
      if (!id) return
      if (owners.has(id) && owners.get(id) !== file.relativePath)
        failures.push({ path: file.relativePath, token: 'FRAGMENT_BASE_COLLISION' })
      owners.set(id, file.relativePath)
    })
  }
  validateManifest(manifest, files, policy).forEach((token) => failures.push({ path: manifestPath, token }))
  // validateIndex is deliberately async because import targets are resolved from disk.
  const indexFailures = await validateIndex({ files, indexPath, manifest, root })
  indexFailures.forEach((token) => failures.push({ path: indexPath, token }))
  const provenanceFailures = await validateProvenanceEvidence({
    figmaRawProvenancePath,
    manifest,
    placementProvenancePath,
    policy,
  })
  provenanceFailures.forEach((token) => failures.push({ path: manifestPath, token }))
  if (iconNameCatalogPath) {
    try {
      const requiredNameInputs = [
        outlineNameIndexPath,
        outlineNameManifestPath,
        outlineNamePlacementProvenancePath,
        outlineNameRawProvenancePath,
        solidNameIndexPath,
        solidNameManifestPath,
        solidNamePlacementProvenancePath,
        solidNameRawProvenancePath,
      ]
      if (requiredNameInputs.some((input) => !input))
        throw new Error('FIGMA_NAME_PROVENANCE_MISMATCH: missing explicit input')
      const [
        actualCatalog,
        outlineManifestSource,
        solidManifestSource,
        outlineIndexSource,
        solidIndexSource,
        outlinePlacementSource,
        outlineRawSource,
        solidPlacementSource,
        solidRawSource,
      ] = await Promise.all([
        readIconInput(iconNameCatalogPath, 'utf8'),
        readIconInput(outlineNameManifestPath, 'utf8'),
        readIconInput(solidNameManifestPath, 'utf8'),
        readIconInput(outlineNameIndexPath, 'utf8'),
        readIconInput(solidNameIndexPath, 'utf8'),
        readIconInput(outlineNamePlacementProvenancePath, 'utf8'),
        readIconInput(outlineNameRawProvenancePath, 'utf8'),
        readIconInput(solidNamePlacementProvenancePath, 'utf8'),
        readIconInput(solidNameRawProvenancePath, 'utf8'),
      ])
      const expectedCatalog = renderIconNameCatalog(
        buildIconNameCatalog({
          outlineIndexSource,
          outlineManifest: JSON.parse(outlineManifestSource),
          outlinePlacementProvenance: JSON.parse(outlinePlacementSource),
          outlineRawProvenance: JSON.parse(outlineRawSource),
          solidIndexSource,
          solidManifest: JSON.parse(solidManifestSource),
          solidPlacementProvenance: JSON.parse(solidPlacementSource),
          solidRawProvenance: JSON.parse(solidRawSource),
        }),
      )
      if (actualCatalog !== (await formatGeneratedFile(expectedCatalog, iconNameCatalogPath)))
        failures.push({ path: iconNameCatalogPath, token: 'FIGMA_NAME_CATALOG_CHANGED' })
    } catch (error) {
      const explicitToken = /^FIGMA_NAME_[A-Z_]+/.exec(error.message)?.[0]
      failures.push({
        path: iconNameCatalogPath,
        token:
          error.code === 'ENOENT' && error.path === iconNameCatalogPath
            ? 'FIGMA_NAME_CATALOG_MISSING'
            : (explicitToken ?? 'FIGMA_NAME_PROVENANCE_MISMATCH'),
      })
    }
  }
  failures.sort((left, right) => left.path.localeCompare(right.path) || left.token.localeCompare(right.token))
  return { failures, total: files.length }
}

function parseArguments(argv) {
  const options = {
    iconNameCatalogPath: undefined,
    outlineNameIndexPath: undefined,
    outlineNameManifestPath: undefined,
    outlineNamePlacementProvenancePath: undefined,
    outlineNameRawProvenancePath: undefined,
    figmaRawProvenancePath: undefined,
    indexPath: undefined,
    manifestPath: undefined,
    placementProvenancePath: undefined,
    policyId: undefined,
    root: undefined,
    solidNameIndexPath: undefined,
    solidNameManifestPath: undefined,
    solidNamePlacementProvenancePath: undefined,
    solidNameRawProvenancePath: undefined,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--check') continue
    if (argument === '--manifest') options.manifestPath = argv[++index]
    else if (argument === '--policy') options.policyId = argv[++index]
    else if (argument === '--index') options.indexPath = argv[++index]
    else if (argument === '--name-catalog') options.iconNameCatalogPath = argv[++index]
    else if (argument === '--outline-name-index') options.outlineNameIndexPath = argv[++index]
    else if (argument === '--outline-name-manifest') options.outlineNameManifestPath = argv[++index]
    else if (argument === '--outline-name-placement-provenance')
      options.outlineNamePlacementProvenancePath = argv[++index]
    else if (argument === '--outline-name-raw-provenance') options.outlineNameRawProvenancePath = argv[++index]
    else if (argument === '--solid-name-index') options.solidNameIndexPath = argv[++index]
    else if (argument === '--solid-name-manifest') options.solidNameManifestPath = argv[++index]
    else if (argument === '--solid-name-placement-provenance') options.solidNamePlacementProvenancePath = argv[++index]
    else if (argument === '--solid-name-raw-provenance') options.solidNameRawProvenancePath = argv[++index]
    else if (argument === '--figma-raw-provenance') options.figmaRawProvenancePath = argv[++index]
    else if (argument === '--placement-provenance') options.placementProvenancePath = argv[++index]
    else if (argument === '--root') options.root = argv[++index]
    else if (!argument.startsWith('-') && !options.root) options.root = argument
    else throw new Error(`unknown argument: ${argument}`)
  }
  return options
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const policy = getIconAuditPolicy(options.policyId ?? 'outline-v1')
  const root = path.resolve(process.cwd(), options.root ?? path.join(packageRoot, 'src'))
  const manifestPath = options.manifestPath ? path.resolve(process.cwd(), options.manifestPath) : undefined
  const indexPath = options.indexPath
    ? path.resolve(process.cwd(), options.indexPath)
    : path.join(root, policy.variant, 'index.tsx')
  const iconNameCatalogPath = options.iconNameCatalogPath
    ? path.resolve(process.cwd(), options.iconNameCatalogPath)
    : undefined
  const resolveOptional = (value) => (value ? path.resolve(process.cwd(), value) : undefined)
  const figmaRawProvenancePath = path.resolve(
    options.figmaRawProvenancePath ?? path.join(packageRoot, `config/icon-sources/${policy.variant}.json#raw`),
  )
  const placementProvenancePath = path.resolve(
    options.placementProvenancePath ?? path.join(packageRoot, `config/icon-sources/${policy.variant}.json#placement`),
  )
  const result = await auditIcons({
    iconNameCatalogPath,
    outlineNameIndexPath: resolveOptional(options.outlineNameIndexPath),
    outlineNameManifestPath: resolveOptional(options.outlineNameManifestPath),
    outlineNamePlacementProvenancePath: resolveOptional(options.outlineNamePlacementProvenancePath),
    outlineNameRawProvenancePath: resolveOptional(options.outlineNameRawProvenancePath),
    figmaRawProvenancePath,
    indexPath,
    manifestPath,
    placementProvenancePath,
    policyId: policy.id,
    root,
    solidNameIndexPath: resolveOptional(options.solidNameIndexPath),
    solidNameManifestPath: resolveOptional(options.solidNameManifestPath),
    solidNamePlacementProvenancePath: resolveOptional(options.solidNamePlacementProvenancePath),
    solidNameRawProvenancePath: resolveOptional(options.solidNameRawProvenancePath),
  })
  if (result.failures.length === 0) console.log(`AUDIT_OK ${result.total}`)
  else {
    for (const failure of result.failures) console.error(`${failure.token} ${failure.path}`)
    process.exitCode = 2
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain)
  main().catch((error) => {
    console.error(`AUDIT_ERROR ${error.message}`)
    process.exitCode = 2
  })
