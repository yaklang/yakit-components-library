import { describe, expect, it } from 'vitest'

import {
  buildTokenCatalog,
  loadPinnedTokenCatalog,
  normalizeColor,
  resolveColorDecision,
  resolveVariable,
} from '../../scripts/colorful-color-resolver.mjs'

describe('colorful exact color resolver', () => {
  it('normalizes supported Figma color forms without approximate matching', () => {
    expect(normalizeColor('#fff')).toMatchObject({
      fallbackHex: '#FFFFFF',
      rgba: [255, 255, 255, 1],
    })
    expect(normalizeColor('#35363980')).toMatchObject({ fallbackHex: '#353639' })
    expect(normalizeColor('rgba(192, 198, 209, 0.25)')).toEqual({
      alpha: 0.25,
      fallbackHex: '#C0C6D1',
      rgba: [192, 198, 209, 0.25],
    })
  })

  it('resolves chains and fails closed for missing references and cycles', () => {
    expect(resolveVariable('--semantic', { '--primitive': '#353639', '--semantic': 'var(--primitive)' })).toBe(
      '#353639',
    )
    expect(() => resolveVariable('--missing', {})).toThrow(/COLOR_TOKEN_RESOLUTION_ERROR/)
    expect(() => resolveVariable('--semantic', { '--semantic': 'var(--missing, #353639)' })).toThrow(
      /COLOR_TOKEN_RESOLUTION_ERROR/,
    )
    expect(() => resolveVariable('--a', { '--a': 'var(--b)', '--b': 'var(--a)' })).toThrow(/cycle/)
  })

  it('prefers an exact bound token, then semantic, primitive, and lexical order', () => {
    const catalog = buildTokenCatalog({
      dark: {
        '--Colors-Use-Neutral': '#353639',
        '--bound': '#353639',
        '--yakit-colors-Neutral-100': '#353639',
      },
      light: {
        '--Colors-Use-Neutral': '#353639',
        '--bound': '#353639',
        '--yakit-colors-Neutral-100': '#353639',
      },
    })
    expect(resolveColorDecision({ boundVariable: '--bound', figmaColor: '#353639' }, catalog)).toMatchObject({
      selectedToken: '--bound',
      serializedPaint: 'var(--bound, #353639)',
    })
  })

  it('keeps near colors and unreviewed theme-changing tokens literal', () => {
    const catalog = buildTokenCatalog({
      dark: { '--yakit-colors-Main-60': '#DB752E' },
      light: { '--yakit-colors-Main-60': '#F28C45' },
    })
    expect(resolveColorDecision({ figmaColor: '#F28B44' }, catalog)).toMatchObject({
      selectedToken: null,
      serializedPaint: '#F28B44',
    })
    expect(resolveColorDecision({ figmaColor: '#F28C45' }, catalog)).toMatchObject({
      selectedToken: null,
      serializedPaint: '#F28C45',
    })
  })

  it('loads the pinned package boundary and finds known exact colors', async () => {
    const catalog = await loadPinnedTokenCatalog()
    for (const color of ['#353639', '#FFFFFF', '#C0C6D1', '#868C97'])
      expect(catalog.some(({ dark, light }) => dark === color || light === color)).toBe(true)
  })
})
