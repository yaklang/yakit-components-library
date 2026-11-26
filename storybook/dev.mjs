import { spawn } from 'node:child_process'
import { pnpmInvocation, runPnpm } from '../packages/yakit-ui-icons/scripts/process.mjs'

const ui = ['--filter', '@yakit-libs/yakit-ui']
const icons = ['--filter', '@yakit-libs/yakit-ui-icons']
await runPnpm([...ui, 'run', 'build:lib'])

const commands = [
  [...icons, 'run', 'watch'],
  [...ui, 'exec', 'vite', 'build', '--mode', 'lib', '--watch', '--emptyOutDir', 'false'],
  [...ui, 'exec', 'tsc', '-p', 'tsconfig.lib.json', '--watch'],
  ['--dir', 'storybook', 'run', 'start', ...process.argv.slice(2)],
]
const children = commands.map((args) => spawn(...pnpmInvocation(args), { stdio: 'inherit' }))
let stopping = false
function stop(code) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
  process.exitCode = code
}
for (const child of children) {
  child.on('error', (error) => {
    console.error(error)
    stop(1)
  })
  child.on('exit', (code) => stop(code ?? 1))
}
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
