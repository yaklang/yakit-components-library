import { spawn, spawnSync } from 'node:child_process';

const build = spawnSync('pnpm', ['--filter', '@yakit-libs/yakit-ui-icons', 'run', 'build'], {
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);
const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error('Expected a development server command');
const children = [
  spawn('pnpm', ['--filter', '@yakit-libs/yakit-ui-icons', 'run', 'watch'], { stdio: 'inherit' }),
  spawn('pnpm', ['exec', command, ...args], { stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', (error) => {
    console.error(error);
    stop(1);
  });
  child.on('exit', (code) => stop(code ?? 1));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
