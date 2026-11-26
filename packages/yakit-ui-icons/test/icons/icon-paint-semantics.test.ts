import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium, type Browser, type Page } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
let browser: Browser
let server: ViteDevServer
let page: Page

beforeAll(async () => {
  server = await createServer({
    configFile: resolve(packageRoot, 'vite.config.ts'),
    logLevel: 'silent',
    root: resolve(packageRoot, 'test'),
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  })
  await server.listen()
  const origin = server.resolvedUrls?.local[0]
  if (!origin) throw new Error('Vite test server did not expose a local URL')
  const fixtureUrl = new URL('icons/fixtures/icon-paint-semantics.html', origin).href
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    headless: true,
  })
  page = await browser.newPage()
  await page.goto(fixtureUrl)
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

describe('Outline icon paint semantics in Chromium', { timeout: 15000 }, () => {
  it('preserves the native white overdraw on dark and transparent backgrounds', async () => {
    await page.getByTestId('star-dark').waitFor()
    const results = await page.evaluate(() => {
      const inspect = (testId: string) => {
        const host = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)!
        const svg = host.querySelector('svg')!
        const white = svg.querySelector<SVGPathElement>('path[stroke="white"]')!
        const strokes = [...svg.querySelectorAll<SVGPathElement>('path[stroke="currentColor"]')]
        const whiteStyle = getComputedStyle(white)
        return {
          background: getComputedStyle(host).backgroundColor,
          masks: svg.querySelectorAll('mask').length,
          whiteStroke: whiteStyle.stroke,
          whiteWidth: whiteStyle.strokeWidth,
          foreground: strokes.map((path) => {
            const { stroke, strokeWidth } = getComputedStyle(path)
            return { stroke, strokeWidth }
          }),
        }
      }
      return {
        rocketDark: inspect('rocket-dark'),
        rocketTransparent: inspect('rocket-transparent'),
        starDark: inspect('star-dark'),
        starTransparent: inspect('star-transparent'),
      }
    })
    for (const result of Object.values(results)) {
      expect(result.masks).toBe(0)
      expect(result.whiteStroke).toBe('rgb(255, 255, 255)')
      expect(result.whiteWidth).toBe('1.5px')
      expect(result.foreground.length).toBeGreaterThan(0)
      for (const path of result.foreground) expect(path).toEqual({ stroke: 'rgb(243, 244, 246)', strokeWidth: '1.5px' })
    }
    expect(results.starDark.background).toBe('rgb(17, 24, 39)')
    expect(results.rocketDark.background).toBe('rgb(17, 24, 39)')
    expect(results.starTransparent.background).toBe('rgba(0, 0, 0, 0)')
    expect(results.rocketTransparent.background).toBe('rgba(0, 0, 0, 0)')
  })

  it('keeps DataCompare secondary strokes at half opacity for default, custom and inherited colors', async () => {
    await page.getByTestId('data-compare-default').waitFor()
    const results = await page.evaluate(() => {
      const toHex = (color: string) => {
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const context = canvas.getContext('2d')!
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        return `#${[...context.getImageData(0, 0, 1, 1).data]
          .slice(0, 3)
          .map((channel) => channel.toString(16).padStart(2, '0'))
          .join('')}`.toUpperCase()
      }
      const inspect = (testId: string) => {
        const svg = document.querySelector<SVGSVGElement>(`[data-testid="${testId}"]`)!
        const relativePath = svg.querySelector<SVGPathElement>('path[opacity="0.5"][stroke]')!
        const style = getComputedStyle(relativePath)
        return {
          base: toHex(getComputedStyle(svg).color),
          opacity: style.opacity,
          secondary: toHex(style.stroke),
        }
      }
      return {
        default: inspect('data-compare-default'),
        custom: inspect('data-compare-custom'),
        inherit: inspect('data-compare-inherit'),
      }
    })

    expect(results.default).toEqual({ base: '#353639', opacity: '0.5', secondary: '#353639' })
    expect(results.custom).toEqual({ base: '#123456', opacity: '0.5', secondary: '#123456' })
    expect(results.inherit).toEqual({ base: '#0A0A0A', opacity: '0.5', secondary: '#0A0A0A' })
  })
})
