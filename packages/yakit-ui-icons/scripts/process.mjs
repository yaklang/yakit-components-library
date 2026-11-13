import { spawn } from 'node:child_process';
import path from 'node:path';

// Use Node for pnpm's JS entry, or invoke its standalone executable directly.
// Never pass a .cmd file, arguments or paths through a shell.
export function pnpmInvocation(args, cli = process.env.npm_execpath) {
  if (!cli) throw new Error('Run this command through pnpm to locate its entry.');
  const name = path.basename(cli);
  if (/pnpm\.(?:c?js|mjs)$/i.test(name)) return [process.execPath, [cli, ...args]];
  if (/^pnpm(?:\.exe)?$/i.test(name)) return [cli, args];
  throw new Error('Unsupported pnpm entry; use pnpm with a JS or native executable entry.');
}
export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options, shell: false });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} failed (${signal ?? code})`));
    });
  });
}
export function runPnpm(args, options) {
  return run(...pnpmInvocation(args), options);
}
