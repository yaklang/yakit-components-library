import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runPnpm } from './process.mjs'
import { packageRoot, runIconUpdate } from './update-icons.mjs'

export async function checkIcons({ generatedChecked = false } = {}) {
  if (!generatedChecked) process.stdout.write(await runIconUpdate(['--check']))
  for (const script of ['audit:icons', 'test:workflow', 'test:ci', 'test:types']) {
    console.log(`\nICON_CHECK: ${script}`)
    await runPnpm(['run', script], { cwd: packageRoot })
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await checkIcons()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
