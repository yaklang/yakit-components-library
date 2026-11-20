const RAW_FRAGMENT_BASE = /^icon_\d+__[A-Za-z][A-Za-z0-9_]*_\d+$/
const LOCAL_URL = /url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/g
const OWNER_TAG = /<([A-Za-z][\w:.-]*)(\s[^<>]*?)?>/g
const ATTRIBUTE = /([:\w.-]+)\s*=\s*(["'])(.*?)\2/g

function fail(code, message) {
  throw new Error(`${code}: ${message}`)
}

const ownerKind = (tag) =>
  ({
    clippath: 'clip',
    filter: 'filter',
    lineargradient: 'linearGradient',
    marker: 'marker',
    mask: 'mask',
    pattern: 'pattern',
    radialgradient: 'radialGradient',
    symbol: 'symbol',
  })[tag.toLowerCase()] ?? 'semantic'

function localReferences(name, value) {
  const references = []
  for (const match of value.matchAll(LOCAL_URL)) references.push(match[1])
  if (['href', 'xlink:href'].includes(name) && value.startsWith('#')) references.push(value.slice(1))
  if (['aria-labelledby', 'aria-describedby'].includes(name)) references.push(...value.trim().split(/\s+/))
  return references.filter(Boolean)
}

export function inspectFragmentGraph(svg) {
  const owners = []
  const references = []
  for (const tagMatch of svg.matchAll(OWNER_TAG)) {
    const [, tag, rawAttributes = ''] = tagMatch
    for (const attributeMatch of rawAttributes.matchAll(ATTRIBUTE)) {
      const [, name, , value] = attributeMatch
      if (name === 'id') owners.push({ id: value, kind: ownerKind(tag), tag })
      for (const id of localReferences(name, value)) references.push({ attribute: name, id, tag })
    }
  }
  return { owners, references }
}

export function normalizeColorfulFragments(svg, sourceNodeId) {
  if (typeof svg !== 'string' || !/<svg\b/.test(svg))
    fail('FRAGMENT_REFERENCE_UNSUPPORTED', 'input is not an SVG document')
  if (/<style\b/i.test(svg)) fail('FRAGMENT_STYLE_UNSUPPORTED', 'SVG style elements must be expanded to attributes')
  const sourceDigits = String(sourceNodeId).replace(/\D/g, '')
  if (!sourceDigits) fail('FRAGMENT_BASE_INVALID', `invalid source node ${sourceNodeId}`)
  const graph = inspectFragmentGraph(svg)
  const ownerCounts = new Map()
  for (const owner of graph.owners) ownerCounts.set(owner.id, (ownerCounts.get(owner.id) ?? 0) + 1)
  for (const reference of graph.references) {
    if (!ownerCounts.has(reference.id)) fail('FRAGMENT_ORPHAN', reference.id)
    if (ownerCounts.get(reference.id) !== 1) fail('FRAGMENT_OWNER_DUPLICATE', reference.id)
  }

  const referenced = new Set(graph.references.map(({ id }) => id))
  const replacements = new Map()
  const ordinals = new Map()
  const fragments = []
  const removedPresentationIds = []
  for (const owner of graph.owners) {
    if (!referenced.has(owner.id)) {
      removedPresentationIds.push(owner.id)
      continue
    }
    const ordinal = ordinals.get(owner.kind) ?? 0
    ordinals.set(owner.kind, ordinal + 1)
    const normalizedId = `icon_${sourceDigits}__${owner.kind}_${ordinal}`
    replacements.set(owner.id, normalizedId)
    fragments.push({ kind: owner.kind, normalizedId, originalId: owner.id, ordinal })
  }

  const rewritten = svg.replace(OWNER_TAG, (tagSource) => {
    return tagSource.replace(ATTRIBUTE, (attributeSource, name, quote, value) => {
      if (name === 'id') {
        if (replacements.has(value)) return `${name}=${quote}${replacements.get(value)}${quote}`
        if (removedPresentationIds.includes(value)) return ''
      }
      let next = value.replace(LOCAL_URL, (whole, id) => {
        if (!replacements.has(id)) fail('FRAGMENT_ORPHAN', id)
        return whole.replace(`#${id}`, `#${replacements.get(id)}`)
      })
      if (['href', 'xlink:href'].includes(name) && next.startsWith('#')) {
        const id = next.slice(1)
        if (!replacements.has(id)) fail('FRAGMENT_ORPHAN', id)
        next = `#${replacements.get(id)}`
      }
      if (['aria-labelledby', 'aria-describedby'].includes(name))
        next = next
          .trim()
          .split(/\s+/)
          .map((id) => replacements.get(id) ?? fail('ACCESSIBILITY_REFERENCE_INVALID', id))
          .join(' ')
      return `${name}=${quote}${next}${quote}`
    })
  })
  const normalizedGraph = inspectFragmentGraph(rewritten)
  for (const owner of normalizedGraph.owners) {
    if (!RAW_FRAGMENT_BASE.test(owner.id)) fail('FRAGMENT_BASE_INVALID', owner.id)
  }
  return Object.freeze({ fragments, removedPresentationIds, svg: rewritten })
}

export function auditColorfulFragmentFiles(files) {
  const bases = new Map()
  for (const file of files) {
    if (/<style\b/i.test(file.svg))
      fail('FRAGMENT_STYLE_UNSUPPORTED', `${file.path}: SVG style elements are unsupported`)
    const graph = inspectFragmentGraph(file.svg)
    const owners = new Map()
    for (const owner of graph.owners) {
      if (!RAW_FRAGMENT_BASE.test(owner.id)) fail('FRAGMENT_BASE_INVALID', `${file.path}: ${owner.id}`)
      if (owners.has(owner.id)) fail('FRAGMENT_OWNER_DUPLICATE', `${file.path}: ${owner.id}`)
      if (bases.has(owner.id)) fail('FRAGMENT_BASE_COLLISION', `${owner.id} in ${bases.get(owner.id)} and ${file.path}`)
      owners.set(owner.id, owner)
      bases.set(owner.id, file.path)
    }
    const referenced = new Set()
    for (const reference of graph.references) {
      if (!owners.has(reference.id)) fail('FRAGMENT_ORPHAN', `${file.path}: ${reference.id}`)
      referenced.add(reference.id)
    }
    for (const id of owners.keys()) if (!referenced.has(id)) fail('PRESENTATION_ID_UNUSED', `${file.path}: ${id}`)
  }
  return Object.freeze({ fragmentBaseCount: bases.size, fragmentFileCount: files.length })
}
