import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'

export function writeFragmentFixtures(tree: ReactElement, family: 'outline' | 'solid', filename: string) {
  const render = (identifierPrefix?: string) => {
    const markup = renderToString(tree, { identifierPrefix })
    const serverIds = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])
    return { identifierPrefix, markup, serverIds }
  }
  const fixtures = { custom: render(family + '-audit-'), default: render() }
  const directory = resolve(cwd(), 'test-results/icons')
  mkdirSync(directory, { recursive: true })
  writeFileSync(resolve(directory, filename), JSON.stringify(fixtures) + '\n')
  return fixtures
}
