import { createIconInputReader } from './icon-source-documents.mjs'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadPinnedTokenCatalog, normalizeColor } from './colorful-color-resolver.mjs'
import {
  canonicalJson,
  colorfulLocalFile,
  colorfulDigest,
  validateColorfulInventory,
} from './colorful-icon-contracts.mjs'
import { auditColorfulFragmentFiles } from './colorful-fragments.mjs'

const colorfulSource = createRequire(import.meta.url)('../config/icon-sources/colorful.json')
const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PAINT_ATTRIBUTE = /\b(?:fill|stroke|stop-color|flood-color)\s*=\s*(["'])(.*?)\1/gi
const STYLE_ATTRIBUTE = /\bstyle\s*=\s*(["'])(.*?)\1/gi
const STYLE_PAINT = /(?:^|;)\s*(?:fill|stroke|stop-color|flood-color)\s*:\s*([^;]+)/gi
const TOKEN_PAINT = /^var\(\s*(--[\w-]+)\s*,\s*(#[\dA-Fa-f]{6})\s*\)$/
const PATH_TAG = /<path\b((?:"[^"]*"|'[^']*'|[^"'<>])*)>/gi
const PATH_DATA_ATTRIBUTE = /(?:^|\s)d\s*=\s*(["'])([\s\S]*?)\1/gi
const PATH_COMMAND = /^[AaCcHhLlMmQqSsTtVvZz]/
const PATH_NUMBER = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?/
const PATH_PARAMETER_COUNT = Object.freeze({
  A: 7,
  C: 6,
  H: 1,
  L: 2,
  M: 2,
  Q: 4,
  S: 4,
  T: 2,
  V: 1,
  Z: 0,
})
const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex')

function fail(code, message) {
  throw new Error(`${code}: ${message}`)
}

function assertSvgTagBalance(svg, sourcePath) {
  const stack = []
  for (const match of svg.matchAll(/<\/?([A-Za-z][\w:.-]*)(?:\s[^<>]*?)?\s*\/?>/g)) {
    const source = match[0]
    const name = match[1]
    if (source.startsWith('</')) {
      const owner = stack.pop()
      if (owner !== name)
        fail('SVG_STRUCTURE_INVALID', `${sourcePath}: expected </${owner ?? 'none'}>, received </${name}>`)
    } else if (!source.endsWith('/>')) stack.push(name)
  }
  if (stack.length > 0) fail('SVG_STRUCTURE_INVALID', `${sourcePath}: unclosed <${stack.at(-1)}>`)
}

function tokenizeSvgPathData(data, sourcePath, pathIndex) {
  const tokens = []
  let cursor = 0
  let commaPending = false
  while (cursor < data.length) {
    const separator = /^[\s,]+/.exec(data.slice(cursor))
    if (separator) {
      const commas = separator[0].match(/,/g)?.length ?? 0
      if (commas > 0) {
        if (commas !== 1 || tokens.at(-1)?.kind !== 'number' || commaPending)
          fail('SVG_PATH_DATA_INVALID', `${sourcePath}: path ${pathIndex} has an invalid comma`)
        commaPending = true
      }
      cursor += separator[0].length
      continue
    }
    const command = PATH_COMMAND.exec(data.slice(cursor))
    if (command) {
      if (commaPending) fail('SVG_PATH_DATA_INVALID', `${sourcePath}: path ${pathIndex} has a comma before a command`)
      tokens.push({ kind: 'command', value: command[0] })
      cursor += command[0].length
      continue
    }
    const number = PATH_NUMBER.exec(data.slice(cursor))
    if (number) {
      if (!Number.isFinite(Number(number[0])))
        fail('SVG_PATH_DATA_INVALID', `${sourcePath}: path ${pathIndex} contains a non-finite number`)
      tokens.push({ kind: 'number', value: number[0] })
      commaPending = false
      cursor += number[0].length
      continue
    }
    const excerpt = data.slice(cursor, cursor + 24)
    fail('SVG_PATH_DATA_INVALID', `${sourcePath}: path ${pathIndex} near ${JSON.stringify(excerpt)}`)
  }
  if (commaPending) fail('SVG_PATH_DATA_INVALID', `${sourcePath}: path ${pathIndex} has a trailing comma`)
  return tokens
}

function assertSvgPathData(svg, sourcePath) {
  let pathIndex = 0
  for (const match of svg.matchAll(PATH_TAG)) {
    pathIndex += 1
    const dataAttributes = [...match[1].matchAll(PATH_DATA_ATTRIBUTE)]
    if (dataAttributes.length > 1)
      fail('SVG_PATH_DATA_INVALID', `${sourcePath}: path ${pathIndex} has duplicate d attributes`)
    if (dataAttributes.length === 0) continue
    const tokens = tokenizeSvgPathData(dataAttributes[0][2], sourcePath, pathIndex)
    if (tokens.length === 0) continue
    if (tokens[0].kind !== 'command' || tokens[0].value.toUpperCase() !== 'M')
      fail('SVG_PATH_DATA_INVALID', `${sourcePath}: path ${pathIndex} must start with moveto`)
    let tokenIndex = 0
    while (tokenIndex < tokens.length) {
      const commandToken = tokens[tokenIndex]
      if (commandToken.kind !== 'command')
        fail('SVG_PATH_DATA_INVALID', `${sourcePath}: path ${pathIndex} has parameters without a command`)
      const command = commandToken.value.toUpperCase()
      const parameterCount = PATH_PARAMETER_COUNT[command]
      tokenIndex += 1
      const firstParameter = tokenIndex
      while (tokenIndex < tokens.length && tokens[tokenIndex].kind === 'number') tokenIndex += 1
      const received = tokenIndex - firstParameter
      if (parameterCount === 0) {
        if (received > 0)
          fail(
            'SVG_PATH_DATA_INVALID',
            `${sourcePath}: path ${pathIndex} command ${commandToken.value} received ${received} parameters`,
          )
        continue
      }
      if (received < parameterCount || received % parameterCount !== 0)
        fail(
          'SVG_PATH_DATA_INVALID',
          `${sourcePath}: path ${pathIndex} command ${commandToken.value} received ${received} parameters`,
        )
      if (command === 'A') {
        for (let offset = 0; offset < received; offset += parameterCount)
          for (const flagOffset of [3, 4]) {
            const flag = tokens[firstParameter + offset + flagOffset].value
            if (flag !== '0' && flag !== '1')
              fail(
                'SVG_PATH_DATA_INVALID',
                `${sourcePath}: path ${pathIndex} command ${commandToken.value} has invalid arc flag ${flag}`,
              )
          }
      }
    }
  }
}

function inspectPaint(value, sourcePath, tokenCatalog, themePaintBindings = [], projectPaintBindings = []) {
  const paint = value.trim()
  if (paint === 'none' || paint === 'currentColor' || /^url\(/.test(paint)) return
  const token = TOKEN_PAINT.exec(paint)
  if (token) {
    const fallback = normalizeColor(token[2]).fallbackHex
    if (tokenCatalog) {
      const definition = tokenCatalog.find(({ name }) => name === token[1])
      if (!definition) fail('COLOR_TOKEN_UNKNOWN', `${sourcePath}: ${token[1]}`)
      // Explicit project mappings are not Figma variable evidence; allow their chosen fallback.
      if (projectPaintBindings.includes(paint)) return
      const figmaBoundThemePaint = themePaintBindings.some(
        (binding) =>
          binding.token === token[1] &&
          binding.fallbackHex === fallback &&
          /^VariableID:/.test(binding.figmaVariableId ?? '') &&
          binding.sourceNodeIds?.length > 0,
      )
      if (definition.light !== fallback || (!figmaBoundThemePaint && definition.dark !== fallback))
        fail('COLOR_TOKEN_FALLBACK_MISMATCH', `${sourcePath}: ${paint}`)
    }
    return
  }
  try {
    normalizeColor(paint)
  } catch {
    fail('COLOR_FORMAT_UNSUPPORTED', `${sourcePath}: ${paint}`)
  }
}

export function auditColorfulInputs(
  { inventory, sources },
  {
    expectedGroupCount = colorfulSource.groups.length,
    expectedRowCount = colorfulSource.records.length,
    requireFrozenClassification = false,
    requireProvenance = false,
    tokenCatalog,
  } = {},
) {
  const summary = validateColorfulInventory(inventory, {
    expectedGroupCount,
    expectedRowCount,
    requireFrozenClassification,
    requireProvenance,
  })
  const canonicalRows = inventory.rows.filter((row) => row.rowDisposition === 'canonical-new')
  const expectedFiles = new Set(canonicalRows.map(colorfulLocalFile))
  const receivedFiles = new Set(sources.map((source) => source.path))
  for (const expected of expectedFiles) if (!receivedFiles.has(expected)) fail('CANONICAL_SOURCE_MISSING', expected)
  for (const received of receivedFiles) if (!expectedFiles.has(received)) fail('CANONICAL_SOURCE_UNDECLARED', received)

  for (const source of sources) {
    assertSvgTagBalance(source.svg, source.path)
    assertSvgPathData(source.svg, source.path)
    const row = canonicalRows.find((candidate) => colorfulLocalFile(candidate) === source.path)
    if (row?.normalizedSvgSha256 && sha256(source.svg) !== row.normalizedSvgSha256)
      fail('LOCAL_SOURCE_HASH_MISMATCH', source.path)
    const root = /<svg\b([^>]*)>/.exec(source.svg)?.[1] ?? ''
    if (!/\bpreserveAspectRatio=["']xMidYMid meet["']/.test(root)) fail('PRESERVE_ASPECT_RATIO_INVALID', source.path)
    const width = Number(/\bwidth=["']([\d.]+)["']/.exec(root)?.[1])
    const height = Number(/\bheight=["']([\d.]+)["']/.exec(root)?.[1])
    if (row?.width !== undefined && (width !== row.width || height !== row.height))
      fail('VIEWPORT_MISMATCH', source.path)
    for (const match of source.svg.matchAll(PAINT_ATTRIBUTE))
      inspectPaint(match[2], source.path, tokenCatalog, row?.themePaintBindings, row?.projectPaintBindings)
    for (const style of source.svg.matchAll(STYLE_ATTRIBUTE))
      for (const match of style[2].matchAll(STYLE_PAINT))
        inspectPaint(match[1], source.path, tokenCatalog, row?.themePaintBindings, row?.projectPaintBindings)
  }
  const fragmentSummary = auditColorfulFragmentFiles(sources)
  const sourceDigests = sources
    .map((source) => ({ path: source.path, sha256: sha256(source.svg) }))
    .sort((left, right) => left.path.localeCompare(right.path))
  return Object.freeze({
    ...summary,
    ...fragmentSummary,
    inputDigest: colorfulDigest({ inventory, sourceDigests }),
  })
}

function option(args, name, fallback) {
  const index = args.indexOf(name)
  return index < 0 ? fallback : args[index + 1]
}

async function listSvgFiles(root, relativeRoot, readIconInput) {
  const files = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name)
    if (entry.isDirectory()) files.push(...(await listSvgFiles(absolute, relativeRoot, readIconInput)))
    else if (entry.name.endsWith('.svg'))
      files.push({
        path: path.relative(relativeRoot, absolute).split(path.sep).join('/'),
        svg: await readIconInput(absolute, 'utf8'),
      })
  }
  return files
}

export async function runColorfulAuditCli(args = process.argv.slice(2)) {
  const manifestPath = path.resolve(
    PACKAGE_ROOT,
    option(args, '--manifest', 'config/icon-sources/colorful.json#manifest'),
  )
  const sourceRoot = path.resolve(PACKAGE_ROOT, option(args, '--source-root', 'src'))
  const readIconInput = createIconInputReader()
  const inventory = JSON.parse(readIconInput(manifestPath, 'utf8'))
  const tokenCatalog = await loadPinnedTokenCatalog()
  const sources = (await listSvgFiles(path.join(sourceRoot, 'colorful'), sourceRoot, readIconInput)).sort(
    (left, right) => left.path.localeCompare(right.path),
  )
  const result = auditColorfulInputs(
    { inventory, sources },
    {
      expectedGroupCount: Number(option(args, '--expected-groups', String(colorfulSource.groups.length))),
      expectedRowCount: Number(option(args, '--expected-rows', String(colorfulSource.records.length))),
      requireFrozenClassification: true,
      requireProvenance: true,
      tokenCatalog,
    },
  )
  return `AUDIT_OK ${result.colorfulPublicExportCount} ${result.inputDigest}\n`
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(await runColorfulAuditCli())
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  }
}

export { canonicalJson }
