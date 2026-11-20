import { describe, expect, it } from 'vitest'

describe('Loading source default checks', () => {
  it('accepts only the documented override expression with the unit default', async () => {
    const { loadingStrokeWidthDefault } = await import('../../scripts/icon-stroke-width.mjs')
    const source =
      'const DEFAULT_LOADING_STROKE_WIDTH = 1; <path strokeWidth={props.style?.strokeWidth ?? props.strokeWidth ?? DEFAULT_LOADING_STROKE_WIDTH} />'
    expect(loadingStrokeWidthDefault(source)).toBe('1')
    expect(loadingStrokeWidthDefault(source.replace('= 1;', '= 2;'))).toBe('2')
    expect(loadingStrokeWidthDefault(source.replace('?? props.strokeWidth', '|| props.strokeWidth'))).toBeUndefined()
    expect(loadingStrokeWidthDefault(source + '<path strokeWidth={1} />')).toBeUndefined()
  })
})
