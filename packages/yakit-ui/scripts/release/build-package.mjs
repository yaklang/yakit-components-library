import { chmod, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const storybookCommand = path.join(
  packageRoot,
  'node_modules/.bin',
  process.platform === 'win32' ? 'storybook.cmd' : 'storybook',
);

function portableBuildEnvironment() {
  const environment = { ...process.env };
  delete environment.NODE_PATH;
  return environment;
}

async function run(command, args, label) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: packageRoot,
      env: portableBuildEnvironment(),
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${label} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`,
        ),
      );
    });
  });
}

async function scrubStorybookNodePath() {
  const managerBundle = path.join(
    packageRoot,
    'storybook-static/sb-addons/chromatic-com-storybook-9/manager-bundle.js',
  );
  const source = await readFile(managerBundle, 'utf8');
  const matches = source.match(/NODE_PATH:\[(?:"[^"]*"(?:,)*)*\]/g) ?? [];
  if (matches.length !== 1) {
    throw new Error(`expected one embedded Storybook NODE_PATH, found ${matches.length}`);
  }
  await writeFile(managerBundle, source.replace(matches[0], 'NODE_PATH:[]'));
}

await rm(path.join(packageRoot, 'dist'), { force: true, recursive: true });
await rm(path.join(packageRoot, 'storybook-static'), { force: true, recursive: true });

await run(pnpmCommand, ['run', 'build:lib'], 'build:lib');
await run(storybookCommand, ['build'], 'build-storybook');
await scrubStorybookNodePath();

const binDirectory = path.join(packageRoot, 'dist/bin');
const launcher = path.join(binDirectory, 'yakit-ui-storybook.mjs');
await mkdir(binDirectory, { recursive: true });
await copyFile(path.join(packageRoot, 'scripts/release/storybook-server.mjs'), launcher);
await chmod(launcher, 0o755);

await run(pnpmCommand, ['run', 'verify:package'], 'verify:package');
