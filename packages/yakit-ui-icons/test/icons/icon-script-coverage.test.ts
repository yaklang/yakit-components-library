import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))
const { scripts } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>
}

describe('icon command coverage', () => {
  it('runs node tests before browser tests, so SSR fixtures are ready without repeating suites', () => {
    expect(scripts['test:ci']).toBe('pnpm run test:node && pnpm run test:browser')
    expect(readFileSync(resolve(root, 'vitest.node.config.ts'), 'utf8')).toContain('test/icons/**/*.test.ts')
    expect(readFileSync(resolve(root, 'vitest.config.ts'), 'utf8')).toContain('test/components/**/*.test.tsx')
  })
  it('has no command pointing at a deleted test or script', () => {
    for (const command of Object.values(scripts))
      for (const token of command.split(/\s+/))
        if (/^(scripts|test|config)\/.+\.(mjs|ts|tsx)$/.test(token))
          expect(existsSync(resolve(root, token)), token).toBe(true)
  })
  it('keeps checks separate from builds and has no historical gate', () => {
    expect(scripts['icons:check']).toBe('node scripts/check.mjs')
    expect(scripts['verify:history']).toBeUndefined()
    const check = readFileSync(resolve(root, 'scripts/check.mjs'), 'utf8')
    for (const step of ['audit:icons', 'test:workflow', 'test:ci', 'test:types']) expect(check).toContain(step)
    expect(check).not.toMatch(/runPnpm\(\['run', 'build'/)
  })
})
