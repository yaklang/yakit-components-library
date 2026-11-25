// Check that all package SVG assets are registered, present, and parseable.
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseSvg } from './audit-icons.mjs'
import { readOldiconAssets } from './oldicon-assets.mjs'
import { readIconSources, sourceFiles } from './icon-source-data.mjs'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDirectory = 'config/icon-sources'

export async function svgFiles(directory, prefix = '') {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name)
    if (entry.isDirectory()) result.push(...(await svgFiles(path.join(directory, entry.name), relative)))
    else if (entry.isFile() && entry.name.endsWith('.svg')) result.push(relative)
  }
  return result.sort()
}

export async function checkIconAssets(root = packageRoot) {
  const files = await svgFiles(path.join(root, 'src'))
  const errors = []
  try {
    const sources = readIconSources(pathToFileURL(`${root}/config/icon-sources/`))
    const expected = new Set([
      ...readOldiconAssets(root).assets.map((file) => `oldicon/${file}`),
      ...Object.values(sources)
        .flatMap(sourceFiles)
        .filter((file) => file.endsWith('.svg')),
    ])
    for (const file of files)
      if (!expected.has(file)) errors.push(`${file}: source is not registered in ${sourceDirectory}`)
    for (const file of expected) if (!files.includes(file)) errors.push(`${file}: registered source is missing`)
  } catch (error) {
    errors.push(`${sourceDirectory}: ${error.message}`)
  }
  for (const file of files) {
    try {
      const source = await readFile(path.join(root, 'src', file), 'utf8')
      parseSvg(source)
    } catch (error) {
      errors.push(`${file}: ${error.message}`)
    }
  }
  if (errors.length) throw new Error(`ICON_ASSETS_INVALID\n${errors.join('\n')}`)
  return { svgFiles: files.length, violations: 0 }
}

export async function runIconAssetCheck(args = [], root = packageRoot) {
  if (args.length > 1 || args.some((arg) => arg !== '--check'))
    throw new Error('Usage: check-icon-assets.mjs [--check]; this command never writes files')
  return checkIconAssets(root)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runIconAssetCheck(process.argv.slice(2))
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.message}\n`)
      process.exitCode = 1
    })
}
