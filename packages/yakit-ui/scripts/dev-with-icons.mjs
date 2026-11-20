import { spawn, spawnSync } from 'node:child_process'
import { pnpmInvocation } from '../../yakit-ui-icons/scripts/process.mjs'

const build = spawnSync(...pnpmInvocation(['--filter', '@yakit-libs/yakit-ui-icons', 'run', 'build']), {
  stdio: 'inherit',
})
if (build.error) {
  console.error(build.error)
  process.exit(1)
}
if (build.status !== 0) process.exit(build.status ?? 1)
const [command, ...args] = process.argv.slice(2)
if (!command) throw new Error('Expected a development server command')
const children = [
  spawn(...pnpmInvocation(['--filter', '@yakit-libs/yakit-ui-icons', 'run', 'watch']), {
    stdio: 'inherit',
  }),
  spawn(...pnpmInvocation(['exec', command, ...args]), { stdio: 'inherit' }),
]
let stopping = false
function stop(code = 0) {
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
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
