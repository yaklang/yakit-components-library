import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

export const COLOR_PACKAGE_VERSION = '1.4.1'

function fail(code, message) {
  throw new Error(`${code}: ${message}`)
}

function byte(value, label) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 255)
    fail('COLOR_FORMAT_UNSUPPORTED', `${label} is outside 0..255`)
  return Math.round(number)
}

function alpha(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 1) fail('COLOR_FORMAT_UNSUPPORTED', 'alpha is outside 0..1')
  return number
}

const hexByte = (value) => Number.parseInt(value, 16)
const hex = (value) => value.toString(16).padStart(2, '0').toUpperCase()

export function normalizeColor(input) {
  if (typeof input !== 'string') fail('COLOR_FORMAT_UNSUPPORTED', 'color must be a string')
  const source = input.trim()
  const hexMatch = /^#([\dA-Fa-f]{3,8})$/.exec(source)
  if (hexMatch) {
    let digits = hexMatch[1]
    if (![3, 4, 6, 8].includes(digits.length)) fail('COLOR_FORMAT_UNSUPPORTED', source)
    if (digits.length <= 4) digits = [...digits].map((digit) => `${digit}${digit}`).join('')
    const hasAlpha = digits.length === 8
    const channels = [hexByte(digits.slice(0, 2)), hexByte(digits.slice(2, 4)), hexByte(digits.slice(4, 6))]
    return {
      alpha: hasAlpha ? hexByte(digits.slice(6, 8)) / 255 : 1,
      fallbackHex: `#${channels.map(hex).join('')}`,
      rgba: [...channels, hasAlpha ? hexByte(digits.slice(6, 8)) / 255 : 1],
    }
  }
  const rgbMatch = /^rgba?\(\s*([^,\s]+)[,\s]+([^,\s]+)[,\s]+([^,\s/]+)(?:\s*[,/]\s*([^\s)]+))?\s*\)$/i.exec(source)
  if (!rgbMatch) fail('COLOR_FORMAT_UNSUPPORTED', source)
  const channel = (value, label) =>
    value.endsWith('%') ? byte((Number.parseFloat(value) * 255) / 100, label) : byte(value, label)
  const channels = [channel(rgbMatch[1], 'red'), channel(rgbMatch[2], 'green'), channel(rgbMatch[3], 'blue')]
  const normalizedAlpha = rgbMatch[4]
    ? rgbMatch[4].endsWith('%')
      ? alpha(Number.parseFloat(rgbMatch[4]) / 100)
      : alpha(rgbMatch[4])
    : 1
  return {
    alpha: normalizedAlpha,
    fallbackHex: `#${channels.map(hex).join('')}`,
    rgba: [...channels, normalizedAlpha],
  }
}

export function resolveVariable(variableName, source, stack = []) {
  if (stack.includes(variableName))
    fail('COLOR_TOKEN_RESOLUTION_ERROR', `cycle: ${[...stack, variableName].join(' -> ')}`)
  const raw = source[variableName]
  if (typeof raw !== 'string' || raw.trim() === '') fail('COLOR_TOKEN_RESOLUTION_ERROR', `missing ${variableName}`)
  const varMatch = /^var\(\s*(--[\w-]+)(?:\s*,\s*([^)]*))?\s*\)$/.exec(raw.trim())
  if (!varMatch) return normalizeColor(raw).fallbackHex
  return resolveVariable(varMatch[1], source, [...stack, variableName])
}

export function buildTokenCatalog({ dark, light, packageVersion = COLOR_PACKAGE_VERSION }) {
  if (packageVersion !== COLOR_PACKAGE_VERSION)
    fail('COLOR_PACKAGE_VERSION_MISMATCH', `expected ${COLOR_PACKAGE_VERSION}, received ${packageVersion}`)
  const names = [...new Set([...Object.keys(light), ...Object.keys(dark)])].sort()
  return names.map((name) => ({
    dark: resolveVariable(name, dark),
    light: resolveVariable(name, light),
    name,
  }))
}

function candidateRank(candidate, boundVariable) {
  if (candidate.name === boundVariable) return 0
  if (candidate.name.startsWith('--Colors-Use-')) return 1
  if (candidate.name.startsWith('--yakit-colors-')) return 2
  return 3
}

export function resolveColorDecision(
  { boundVariable = null, figmaColor, intendedTheme = 'light', reviewedThemeEvidence = false, themeSemantic = false },
  catalog,
) {
  if (!['light', 'dark'].includes(intendedTheme))
    fail('COLOR_FORMAT_UNSUPPORTED', `unknown intended theme ${intendedTheme}`)
  if (themeSemantic && !boundVariable && !reviewedThemeEvidence)
    fail('PAINT_CLASS_VIOLATION', 'themeSemantic requires a Figma binding or reviewed theme evidence')
  const normalized = normalizeColor(figmaColor)
  const exact = catalog.filter((candidate) => candidate[intendedTheme] === normalized.fallbackHex)
  const eligible = exact.filter(
    (candidate) =>
      (themeSemantic && (candidate.name === boundVariable || reviewedThemeEvidence)) ||
      (!themeSemantic && candidate.light === normalized.fallbackHex && candidate.dark === normalized.fallbackHex),
  )
  eligible.sort(
    (left, right) =>
      candidateRank(left, boundVariable) - candidateRank(right, boundVariable) || left.name.localeCompare(right.name),
  )
  const selected = eligible[0] ?? null
  return Object.freeze({
    allExactCandidates: exact.map(({ dark, light, name }) => ({ dark, light, name })),
    decisionReason: selected
      ? selected.name === boundVariable
        ? 'exact-figma-bound-variable'
        : selected.name.startsWith('--Colors-Use-')
          ? 'exact-semantic-token'
          : selected.name.startsWith('--yakit-colors-')
            ? 'exact-primitive-token'
            : 'exact-token-lexical-fallback'
      : 'exact-figma-hex-no-eligible-token',
    fallbackHex: normalized.fallbackHex,
    normalizedRgba: normalized.rgba,
    resolvedDark: selected?.dark ?? null,
    resolvedLight: selected?.light ?? null,
    selectedToken: selected?.name ?? null,
    serializedPaint: selected ? `var(${selected.name}, ${normalized.fallbackHex})` : normalized.fallbackHex,
  })
}

export async function loadPinnedTokenCatalog() {
  const entry = createRequire(import.meta.url).resolve('@yakit-libs/color')
  const packageJsonPath = path.resolve(entry, '../../package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  const { generateColors } = await import('@yakit-libs/color')
  return buildTokenCatalog({
    dark: generateColors('dark'),
    light: generateColors('light'),
    packageVersion: packageJson.version,
  })
}
