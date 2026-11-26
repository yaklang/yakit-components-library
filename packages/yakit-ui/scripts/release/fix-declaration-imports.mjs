import { access, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const scriptPath = fileURLToPath(import.meta.url)
const packageRoot = path.resolve(path.dirname(scriptPath), '../..')
const declarationRoot = path.join(packageRoot, 'dist')

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(absolute)))
    else if (entry.isFile() && entry.name.endsWith('.d.ts')) files.push(absolute)
  }
  return files
}

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

async function resolveSpecifier(declaration, specifier) {
  if (!specifier.startsWith('.') || path.posix.extname(specifier)) return specifier
  const target = path.resolve(path.dirname(declaration), specifier)
  if (await exists(`${target}.d.ts`)) return `${specifier}.js`
  if (await exists(path.join(target, 'index.d.ts'))) return `${specifier}/index.js`
  throw new Error(`Cannot map declaration specifier ${specifier} from ${path.relative(packageRoot, declaration)}`)
}

function collectModuleSpecifiers(sourceFile) {
  const specifiers = []
  const add = (node) => {
    if (node && ts.isStringLiteralLike(node)) specifiers.push(node)
  }
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      add(node.moduleSpecifier)
    } else if (ts.isImportTypeNode(node)) {
      if (ts.isLiteralTypeNode(node.argument)) add(node.argument.literal)
    } else if (ts.isExternalModuleReference(node)) {
      add(node.expression)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return specifiers
}

function parseDeclaration(declaration, source) {
  return ts.createSourceFile(declaration, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

export function findNodeNextIncompatibleSpecifiers(declaration, source) {
  return collectModuleSpecifiers(parseDeclaration(declaration, source))
    .map((node) => node.text)
    .filter((specifier) => specifier.startsWith('.') && !path.posix.extname(specifier))
}

export async function rewriteDeclarationSource(declaration, source) {
  const sourceFile = parseDeclaration(declaration, source)
  const edits = []

  for (const node of collectModuleSpecifiers(sourceFile)) {
    const resolved = await resolveSpecifier(declaration, node.text)
    if (resolved !== node.text) {
      edits.push({
        end: node.end - 1,
        replacement: resolved,
        start: node.getStart(sourceFile) + 1,
      })
    }
  }

  let output = source
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    output = `${output.slice(0, edit.start)}${edit.replacement}${output.slice(edit.end)}`
  }
  return output
}

export async function rewriteDeclarationTree(root = declarationRoot) {
  for (const declaration of await walk(root)) {
    const source = await readFile(declaration, 'utf8')
    const output = await rewriteDeclarationSource(declaration, source)
    if (output !== source) await writeFile(declaration, output)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await rewriteDeclarationTree()
}
