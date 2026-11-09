import { spawn } from 'node:child_process';

const children = [
  spawn('pnpm', ['exec', 'vite', 'build', '--watch', '--emptyOutDir', 'false'], {
    stdio: 'inherit',
  }),
  spawn('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json', '--watch', '--preserveWatchOutput'], {
    stdio: 'inherit',
  }),
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
