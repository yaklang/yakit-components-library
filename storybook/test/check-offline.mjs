// Exercise the downloaded archive from outside the workspace with external requests blocked.
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const archive = path.resolve(process.argv[2])
const directory = await mkdtemp(path.join(tmpdir(), 'offline-storybook-test-'))
let launcher
let browser
try {
  execFileSync('unzip', ['-q', archive, '-d', directory])
  const entries = Object.values(
    JSON.parse(await readFile(path.join(directory, 'storybook-static/index.json'), 'utf8')).entries,
  )
  const find = (component, name) => {
    const entry = entries.find((entry) => entry.title.endsWith('/' + component) && entry.name === name)
    assert.ok(entry, `Missing story: ${component}/${name}`)
    return entry.id
  }
  const socket = createServer().listen(0, '127.0.0.1')
  await once(socket, 'listening')
  const { port } = socket.address()
  await new Promise((resolve) => socket.close(resolve))
  const base = `http://127.0.0.1:${port}`
  launcher = spawn(process.execPath, ['serve.mjs', '--port', String(port)], {
    cwd: directory,
    stdio: 'inherit',
  })
  for (let i = 0; i < 100; i++) {
    if (launcher.exitCode !== null) throw new Error('Offline launcher exited')
    if (
      await fetch(base)
        .then((r) => r.ok)
        .catch(() => false)
    )
      break
    await delay(100)
  }
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  })
  const page = await browser.newPage()
  await page.route(/^https?:/, (route) =>
    new URL(route.request().url()).origin === base ? route.continue() : route.abort(),
  )
  page.on('pageerror', (error) => console.error(error.message))
  const id = find('Input', 'Default')
  await page.goto(`${base}/?path=/story/${encodeURIComponent(id)}`)
  const input = page.frameLocator('#storybook-preview-iframe').locator('#storybook-root input').first()
  await input.fill('离线预览', { timeout: 25000 })
  assert.equal(await input.inputValue(), '离线预览')
  await page.goto(
    `${base}/iframe.html?id=${encodeURIComponent(find('Icon', 'Outline'))}&viewMode=story&globals=theme:dark`,
  )
  await page.locator('#storybook-root svg').first().waitFor()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  console.log(`Offline interaction, icons and dark theme passed: ${path.basename(archive)}`)
} finally {
  await browser?.close()
  if (launcher && launcher.exitCode === null) launcher.kill()
  await rm(directory, { recursive: true, force: true })
}
