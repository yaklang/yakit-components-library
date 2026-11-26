import { accessSync, constants, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// Oldicon is ordinary handwritten source. Read actual modules; never generate or rename them.
export function readOldiconAssets(
  root = fileURLToPath(new URL('../', import.meta.url)),
  readText = (file) => readFileSync(file, 'utf8'),
) {
  const directory = path.join(root, 'src/oldicon')
  const barrel = readText(path.join(directory, 'index.tsx'))
  const exports = [...barrel.matchAll(/export \{ (\w+) \} from ['"]\.\/icons\/(\w+)\.js['"]/g)].map(
    ([, exportName, module]) => {
      const source = readText(path.join(directory, 'icons', `${module}.tsx`))
      const assetFile = source.match(/from ['"]\.\.\/(assets\/[^'"]+\.svg)\?react['"]/)?.[1]
      if (!assetFile || !source.includes(`export const ${exportName} =`))
        throw new Error(`OLDICON_MODULE_INVALID: ${exportName}`)
      const assetPath = path.join(directory, assetFile)
      accessSync(assetPath, constants.R_OK)
      if (!statSync(assetPath).isFile()) throw new Error(`OLDICON_ASSET_INVALID: ${assetFile}`)
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
