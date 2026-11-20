import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// Oldicon is ordinary handwritten source. Read actual modules; never generate or rename them.
export function readOldiconAssets(root = fileURLToPath(new URL('../', import.meta.url))) {
  const directory = path.join(root, 'src/oldicon')
  const barrel = readFileSync(path.join(directory, 'index.tsx'), 'utf8')
  const exports = [...barrel.matchAll(/export \{ (\w+) \} from ['"]\.\/icons\/(\w+)\.js['"]/g)].map(
    ([, exportName, module]) => {
      const source = readFileSync(path.join(directory, 'icons', `${module}.tsx`), 'utf8')
      const assetFile = source.match(/from ['"]\.\.\/(assets\/[^'"]+\.svg)\?react['"]/)?.[1]
      if (!assetFile || !source.includes(`export const ${exportName} =`))
        throw new Error(`OLDICON_MODULE_INVALID: ${exportName}`)
      readFileSync(path.join(directory, assetFile))
      return { exportName, assetFile }
    },
  )
  if (new Set(exports.map((r) => r.exportName)).size !== exports.length) throw new Error('OLDICON_EXPORT_DUPLICATE')
  return {
    exports,
    assets: readdirSync(path.join(directory, 'assets'))
      .filter((f) => f.endsWith('.svg'))
      .sort()
      .map((f) => `assets/${f}`),
  }
}
