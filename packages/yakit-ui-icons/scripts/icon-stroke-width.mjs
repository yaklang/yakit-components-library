import { parseSvg } from './audit-icons.mjs'
import { ICON_STROKE_WIDTH } from './icon-audit-contracts.mjs'

const numericWidth = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i

/** Inspect declarations without changing paint, geometry, or inherited SVG defaults. */
export function svgStrokeWidths(source) {
  const widths = []
  const walk = (node) => {
    if (node.name.toLowerCase() === 'style')
      throw new Error('STROKE_WIDTH_STYLESHEET_UNSUPPORTED: use presentation attributes or inline style')
    const value = node.attributes.get('stroke-width')
    if (value !== undefined) widths.push({ tag: node.name, surface: 'attribute', value })
    for (const declaration of (node.attributes.get('style') ?? '').split(';')) {
      const separator = declaration.indexOf(':')
      if (declaration.slice(0, separator).trim().toLowerCase() === 'stroke-width')
        widths.push({
          tag: node.name,
          surface: 'style',
          value: declaration.slice(separator + 1).trim(),
        })
    }
    node.children.forEach(walk)
  }
  walk(parseSvg(source))
  return widths
}

/** Positive literal widths are the only reviewed migration; do not activate zero-width strokes. */
export function normalizeSvgStrokeWidth(source) {
  for (const { tag, value } of svgStrokeWidths(source)) {
    if (!numericWidth.test(value.trim()) || !Number.isFinite(Number(value)) || Number(value) <= 0)
      throw new Error(`STROKE_WIDTH_UNSUPPORTED: ${tag} stroke-width=${JSON.stringify(value)}`)
  }
  // Match whole start tags, including quoted '>' characters, leaving comments and text intact.
  return source.replace(/<!--[\s\S]*?-->|<[A-Za-z](?:[^<>"']|"[^"]*"|'[^']*')*>/g, (tag) => {
    if (tag.startsWith('<!--')) return tag
    return tag.replace(/([\w:-]+)(\s*=\s*)(["'])([\s\S]*?)\3/g, (attribute, name, equals, quote, value) => {
      if (name === 'stroke-width') return `${name}${equals}${quote}${ICON_STROKE_WIDTH}${quote}`
      if (name !== 'style') return attribute
      const style = value.replace(
        /(^|;)(\s*stroke-width\s*:\s*)([^;]*?)(\s*)(?=;|$)/gi,
        (_declaration, separator, property, _width, spaces) => `${separator}${property}${ICON_STROKE_WIDTH}${spaces}`,
      )
      return `${name}${equals}${quote}${style}${quote}`
    })
  })
}

/** Recognize Loading's literal migration form or its reviewed configurable expression. */
export function loadingStrokeWidthDefault(source) {
  const widths = [...source.matchAll(/\bstrokeWidth\s*=\s*\{([^}]+)\}/g)]
  if (widths.length !== 1) return undefined
  const expression = widths[0][1].replace(/\s+/g, '')
  if (numericWidth.test(expression)) return expression
  if (expression !== 'props.style?.strokeWidth??props.strokeWidth??DEFAULT_LOADING_STROKE_WIDTH') return undefined
  const declarations = [...source.matchAll(/\bconst\s+DEFAULT_LOADING_STROKE_WIDTH\s*=\s*(\d+(?:\.\d+)?)\s*;/g)]
  return declarations.length === 1 ? declarations[0][1] : undefined
}
