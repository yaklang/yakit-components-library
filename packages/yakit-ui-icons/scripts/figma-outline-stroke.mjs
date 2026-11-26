// Read the actual vertices and Bézier handles. An exported filled contour does
// not contain this information.

import { parseSvg } from './audit-icons.mjs'

async function figmaJson(endpoint, query, nodeId) {
  const token = process.env.FIGMA_API_KEY || process.env.FIGMA_OAUTH_TOKEN
  if (!token)
    throw new Error(
      `ICON_FIGMA_GEOMETRY_REQUIRED: ${nodeId}: provide a geometry=paths snapshot and node-labelled SVG or Figma credentials`,
    )
  const url = new URL(`https://api.figma.com/v1/${endpoint}`)
  url.search = new URLSearchParams(query)
  const result = await fetch(url, {
    headers: process.env.FIGMA_API_KEY ? { 'X-Figma-Token': token } : { Authorization: `Bearer ${token}` },
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
  })
  if (!result.ok) throw new Error(`ICON_FIGMA_REQUEST_FAILED: ${nodeId} HTTP ${result.status}`)
  return result.json()
}

export async function readGeometryNode(fileKey, nodeId, snapshot) {
  const response = snapshot ?? (await figmaJson(`files/${fileKey}/nodes`, { ids: nodeId, geometry: 'paths' }, nodeId))
  const node = response.nodes?.[nodeId]?.document
  if (node?.id !== nodeId || node.type !== 'COMPONENT' || !Array.isArray(node.children))
    throw new Error(`ICON_FIGMA_GEOMETRY_MISSING: ${nodeId}`)
  return node
}

const visible = (items = []) => items.filter((item) => item.visible !== false && item.opacity !== 0)
const number = (n) => {
  if (!Number.isFinite(n)) throw new Error('Invalid vector coordinate')
  return +n.toFixed(6)
}
const point = (p, offset = { x: 0, y: 0 }) => `${number(p.x + offset.x)} ${number(p.y + offset.y)}`

// Follow an uninterrupted chain through degree-two vertices. Start a new
// subpath at junctions and close loops so SVG applies line joins correctly.
function networkPath({ vertices, segments }, dx, dy) {
  if (!Array.isArray(segments) || !segments.length) throw new Error('Missing vector segments')
  const points = vertices.map(({ position }) => ({ x: position.x + dx, y: position.y + dy }))
  const adjacent = points.map(() => [])
  segments.forEach(({ start, end }, i) => {
    adjacent[start].push(i)
    adjacent[end].push(i)
  })
  const used = new Set()
  const paths = []
  function trace(start, edge) {
    if (used.has(edge)) return
    let vertex = start
    let path = 'M' + point(points[start])
    while (edge !== undefined && !used.has(edge)) {
      used.add(edge)
      const seg = segments[edge]
      const forward = seg.start === vertex
      const next = forward ? seg.end : seg.start
      const t1 = forward ? seg.startTangent : seg.endTangent
      const t2 = forward ? seg.endTangent : seg.startTangent
      if (t1?.x || t1?.y || t2?.x || t2?.y)
        path += ` C${point(points[vertex], t1)} ${point(points[next], t2)} ${point(points[next])}`
      else path += ' L' + point(points[next])
      vertex = next
      edge = adjacent[vertex].length === 2 ? adjacent[vertex].find((i) => !used.has(i)) : undefined
    }
    paths.push(path + (vertex === start ? ' Z' : ''))
  }
  adjacent.forEach((edges, start) => {
    if (edges.length !== 2) for (const edge of edges) trace(start, edge)
  })
  segments.forEach(({ start }, i) => trace(start, i))
  return paths.join(' ')
}

function strokeAttributes(node, ancestors) {
  function reject() {
    throw new Error(`ICON_FIGMA_STROKE_UNSUPPORTED: ${ancestors[0].id}/${node.id}`)
  }
  let x = 0,
    y = 0
  for (const layer of [...ancestors.slice(1), node]) {
    const [[a, b, dx], [c, d, dy]] = layer.relativeTransform ?? [[], []]
    if (a !== 1 || d !== 1 || b !== 0 || c !== 0 || layer.isMask || visible(layer.effects).length) reject()
    x += number(dx)
    y += number(dy)
  }
  const strokes = visible(node.strokes)
  const [paint] = strokes
  const cap = { NONE: 'butt', ROUND: 'round', SQUARE: 'square' }[node.strokeCap ?? 'NONE']
  const join = { MITER: 'miter', ROUND: 'round', BEVEL: 'bevel' }[node.strokeJoin ?? 'MITER']
  if (
    node.type !== 'VECTOR' ||
    !node.vectorNetwork ||
    node.strokeAlign !== 'CENTER' ||
    strokes.length !== 1 ||
    paint.type !== 'SOLID' ||
    (paint.opacity ?? 1) !== 1 ||
    (paint.color?.a ?? 1) !== 1 ||
    node.strokeDashes?.length ||
    node.variableWidthPoints?.length ||
    (node.complexStrokeProperties?.strokeType ?? 'BASIC') !== 'BASIC' ||
    !(node.strokeWeight > 0) ||
    !cap ||
    !join
  )
    reject()
  const color = ['r', 'g', 'b']
    .map((channel) => {
      const value = paint.color[channel]
      if (!Number.isFinite(value) || value < 0 || value > 1) reject()
      return Math.round(value * 255)
        .toString(16)
        .padStart(2, '0')
    })
    .join('')
    .toUpperCase()
  const d = networkPath(node.vectorNetwork, x, y)
  return `fill="none" d="${d}" stroke="#${color}" stroke-width="${number(node.strokeWeight)}" stroke-linecap="${cap}" stroke-linejoin="${join}"`
}

// Compare to this import's Figma export at its original width, before the
// project's 1.5 stroke normalization. This also detects mismatched snapshots.
async function verifyOutlineStroke(exportedSvg, strokeSvg, nodeId) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    const overlap = await page.evaluate(
      async (sources) => {
        const pixels = await Promise.all(
          sources.map(async (svg) => {
            const img = new globalThis.Image()
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
            await img.decode()
            const canvas = globalThis.document.createElement('canvas')
            canvas.width = canvas.height = 384
            const context = canvas.getContext('2d')
            context.drawImage(img, 0, 0, 384, 384)
            return context.getImageData(0, 0, 384, 384).data
          }),
        )
        let difference = 0,
          area = 0
        for (let i = 0; i < pixels[0].length; i += 4) {
          const a = pixels[0][i + 3],
            b = pixels[1][i + 3]
          let error = Math.abs(a - b)
          for (let c = i; c < i + 3; c++) error = Math.max(error, Math.abs(pixels[0][c] * a - pixels[1][c] * b) / 255)
          difference += error
          area += Math.max(a, b)
        }
        return area ? 1 - difference / area : 0
      },
      [exportedSvg, strokeSvg],
    )
    if (overlap < 0.99) throw new Error(`ICON_FIGMA_STROKE_RENDER_MISMATCH: ${nodeId} (${overlap.toFixed(4)})`)
  } finally {
    await browser.close()
  }
}

const definitions = new Set(['defs', 'mask', 'clipPath', 'pattern', 'marker', 'symbol'])
export function filledPaths(svgRoot) {
  const paths = []
  const strokedLayers = new Set()
  function walk(node, fill, stroke, id, locator) {
    if (definitions.has(node.name)) return
    const attrs = node.attributes
    id = attrs.get('data-node-id') ?? id
    const style = new Map((attrs.get('style') ?? '').split(';').map((p) => p.split(':').map((v) => v.trim())))
    const inherited = (name, value) => {
      const paint = style.get(name) || attrs.get(name)
      return !paint || paint === 'inherit' ? value : paint
    }
    fill = inherited('fill', fill)
    stroke = inherited('stroke', stroke)
    if (['path', 'circle', 'ellipse', 'line', 'rect', 'polygon', 'polyline'].includes(node.name) && stroke !== 'none')
      strokedLayers.add(id)
    if (node.name === 'path' && fill !== 'none' && stroke === 'none') paths.push({ node, id, locator })
    node.children.forEach((child, i) => walk(child, fill, stroke, id, [...locator, i]))
  }
  walk(svgRoot, 'black', 'none', undefined, [])
  return paths.map((path) => ({ ...path, nativeStroke: strokedLayers.has(path.id) }))
}

function leavesOf(node, ancestors = []) {
  if (node.visible === false || node.opacity === 0) return []
  return node.children ? node.children.flatMap((child) => leavesOf(child, [...ancestors, node])) : [{ node, ancestors }]
}

async function labelledPaths(fileKey, nodeId, svg, paths) {
  const result = await figmaJson(
    `images/${fileKey}`,
    { ids: nodeId, format: 'svg', svg_include_node_id: 'true' },
    nodeId,
  )
  const response = await fetch(new URL(result.images[nodeId]), {
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`ICON_FIGMA_SVG_REQUEST_FAILED: ${nodeId} HTTP ${response.status}`)
  const labelled = await response.text()
  // Ignore only the added labels. The supplied export must be from the same artwork.
  const stripIds = (s) => s.replace(/\s+data-node-id="[^"]*"/g, '')
  if (stripIds(labelled).trim() !== stripIds(svg).trim())
    throw new Error(`ICON_FIGMA_LABELLED_EXPORT_MISMATCH: ${nodeId}`)
  const labels = filledPaths(parseSvg(labelled))
  return paths.map((path, i) => ({
    ...path,
    id: labels[i].id,
    nativeStroke: labels[i].nativeStroke,
  }))
}

export async function restoreOutlineStrokes(svg, paths, component, fileKey) {
  const leaves = leavesOf(component)
  if (!leaves.length) throw new Error(`ICON_FIGMA_GEOMETRY_MISSING: ${component.id}`)
  const hasPaint = ({ node }) => visible(node.fills).length || visible(node.strokes).length
  if (!leaves.some(hasPaint)) throw new Error(`ICON_FIGMA_PAINT_MISSING: ${component.id}`)
  if (!leaves.some(({ node }) => visible(node.strokes).length)) return { svg, locators: [] }
  const layers = new Map(leaves.map((leaf) => [leaf.node.id, leaf]))
  // A single drawable source and path are unambiguous even in an unlabelled export.
  if (leaves.length === 1 && paths.length === 1 && (!paths[0].id || paths[0].id === component.id))
    paths = [{ ...paths[0], id: leaves[0].node.id }]
  if (paths.some((p) => !layers.has(p.id))) paths = await labelledPaths(fileKey, component.id, svg, paths)
  const edits = []
  for (const { node: shape, id, locator, nativeStroke } of paths) {
    const leaf = layers.get(id)
    if (!leaf) throw new Error(`ICON_FIGMA_LAYER_UNRESOLVED: ${component.id}/${id}`)
    if (!visible(leaf.node.strokes).length) {
      if (visible(leaf.node.fills).length) continue
      throw new Error(`ICON_FIGMA_PAINT_MISSING: ${component.id}/${id}`)
    }
    if (visible(leaf.node.fills).length) {
      if (nativeStroke) continue
      throw new Error(`ICON_FIGMA_MIXED_PAINT_UNRESOLVED: ${component.id}/${id}`)
    }
    if (shape.attributes.has('style') || shape.attributes.has('class'))
      throw new Error(`ICON_FIGMA_LAYER_STYLE_UNSUPPORTED: ${component.id}/${id}`)
    // Extract this layer alone in component coordinates. Keep unrelated nodes and their paint order.
    if (paths.filter((p) => p.id === id).length !== 1)
      throw new Error(`ICON_FIGMA_LAYER_AMBIGUOUS: ${component.id}/${id}`)
    if (nativeStroke) throw new Error(`ICON_FIGMA_LAYER_AMBIGUOUS: ${component.id}/${id}`)
    const attrs = strokeAttributes(leaf.node, leaf.ancestors)
    const startTag = svg.slice(shape.sourceStart, shape.sourceEnd)
    let tag = startTag.replace(
      /\s(?:d|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)\s*=\s*(?:"[^"]*"|'[^']*')/g,
      '',
    )
    tag = tag.replace(/\s*(\/?>)$/, ` ${attrs}$1`)
    edits.push({ start: shape.sourceStart, end: shape.sourceEnd, tag, locator })
  }
  if (!edits.length) return { svg, locators: [] }
  let output = svg
  for (const e of edits.reverse()) output = output.slice(0, e.start) + e.tag + output.slice(e.end)
  await verifyOutlineStroke(svg, output, component.id)
  return { svg: output, locators: edits.map((e) => e.locator) }
}
