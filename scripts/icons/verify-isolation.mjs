import { runPnpm } from '../../packages/yakit-ui-icons/scripts/process.mjs'
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../../packages/yakit-ui-icons/', import.meta.url))
const root = await mkdtemp(path.join(tmpdir(), 'yakit-icons-isolation-'))
try {
  await cp(source, root, {
    recursive: true,
    filter: (file) =>
      !path
        .relative(source, file)
        .split(path.sep)
        .some((part) => ['node_modules', 'dist', '.turbo', 'test-results'].includes(part)),
  })
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const workspace = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'))
  manifest.packageManager = workspace.packageManager
  await writeFile(path.join(root, 'package.json'), JSON.stringify(manifest))
  // Reuse installed tooling, but copy no UI source or workspace configuration.
  // The temporary package has only its own declared dependency links.
  await mkdir(path.join(root, 'node_modules'))
  for (const entry of await readdir(path.join(source, 'node_modules'), {
    withFileTypes: true,
  })) {
    if (entry.name.startsWith('.') && entry.name !== '.bin') continue
    if (entry.name.startsWith('@')) {
      await mkdir(path.join(root, 'node_modules', entry.name))
      for (const name of await readdir(path.join(source, 'node_modules', entry.name)))
        await symlink(
          await realpath(path.join(source, 'node_modules', entry.name, name)),
          path.join(root, 'node_modules', entry.name, name),
          process.platform === 'win32' ? 'junction' : 'dir',
        )
    } else {
      await symlink(
        await realpath(path.join(source, 'node_modules', entry.name)),
        path.join(root, 'node_modules', entry.name),
        process.platform === 'win32' ? 'junction' : 'dir',
      )
    }
  }
  for (const [script, args] of [
    ['icons:update', ['--check']],
    ['build', []],
    ['verify:package', []],
  ])
    await runPnpm(['run', script, ...args], { cwd: root })
  console.log('ICON_ISOLATION_VERIFIED: generation, build and package usage passed without UI source')
} finally {
  await rm(root, { recursive: true, force: true })
}
