#!/usr/bin/env node

import { createServer } from 'node:http';
import { access, readFile, realpath, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 6006;
const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function usage() {
  return `Usage: yakit-ui-storybook [options]\n\nOptions:\n  --host <host>  Host to bind (default: ${DEFAULT_HOST})\n  --port <port>  Port to bind (default: ${DEFAULT_PORT})\n  --open         Open Storybook in the default browser\n  -h, --help     Show this help`;
}

export function parseArgs(argv) {
  const options = { host: DEFAULT_HOST, open: false, port: DEFAULT_PORT };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') return { help: true, ...options };
    if (argument === '--open') {
      options.open = true;
      continue;
    }
    const [name, inlineValue] = argument.split('=', 2);
    if (name === '--host' || name === '--port') {
      const value = inlineValue ?? argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
      if (name === '--host') options.host = value;
      else options.port = Number(value);
      continue;
    }
    throw new Error(`unknown option: ${argument}`);
  }
  if (!options.host.trim() || /[\s/]/u.test(options.host))
    throw new Error('host must be a hostname or IP address');
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new Error('port must be an integer from 1 to 65535');
  }
  return options;
}

function hasTraversal(requestTarget) {
  const rawPath = requestTarget.split(/[?#]/u, 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return true;
  }
  return decoded.includes('\0') || decoded.split(/[\\/]/u).some((segment) => segment === '..');
}

function isInside(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

export async function resolveAssetPath(root, requestTarget) {
  if (hasTraversal(requestTarget)) return { status: 400 };
  const url = new URL(requestTarget, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  const relativePath = pathname.replace(/^\/+/, '');
  const candidate = path.resolve(root, relativePath || 'index.html');
  if (!isInside(root, candidate)) return { status: 403 };

  try {
    const candidateStat = await stat(candidate);
    const file = candidateStat.isDirectory() ? path.join(candidate, 'index.html') : candidate;
    const resolvedFile = await realpath(file);
    if (!isInside(root, resolvedFile)) return { status: 403 };
    if (!(await stat(resolvedFile)).isFile()) return { status: 404 };
    return { file: resolvedFile, status: 200 };
  } catch {
    if (path.extname(relativePath)) return { status: 404 };
    return { file: path.join(root, 'index.html'), status: 200 };
  }
}

export function contentTypeFor(file) {
  return MIME_TYPES.get(path.extname(file).toLowerCase()) || 'application/octet-stream';
}

function openBrowser(url) {
  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.once('error', (error) => console.error(`Could not open a browser: ${error.message}`));
  child.unref();
}

export async function run(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`yakit-ui-storybook: ${error.message}\n\n${usage()}`);
    return 2;
  }

  if (options.help) {
    console.log(usage());
    return 0;
  }

  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const storybookDirectory = path.join(packageRoot, 'storybook-static');
  const indexFile = path.join(storybookDirectory, 'index.html');

  try {
    await access(indexFile, constants.R_OK);
  } catch {
    console.error(`yakit-ui-storybook: packaged Storybook is missing at ${indexFile}`);
    return 1;
  }

  const storybookRoot = await realpath(storybookDirectory);
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, {
          allow: 'GET, HEAD',
          'content-type': 'text/plain; charset=utf-8',
        });
        response.end('Method not allowed');
        return;
      }
      const asset = await resolveAssetPath(storybookRoot, request.url || '/');
      if (!asset.file) {
        response.writeHead(asset.status, { 'content-type': 'text/plain; charset=utf-8' });
        response.end(
          asset.status === 400 ? 'Bad request' : asset.status === 403 ? 'Forbidden' : 'Not found',
        );
        return;
      }
      const body = await readFile(asset.file);
      response.writeHead(200, {
        'cache-control': 'no-cache',
        'content-length': body.byteLength,
        'content-type': contentTypeFor(asset.file),
        'x-content-type-options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Internal server error');
      console.error(`yakit-ui-storybook: ${error.message}`);
    }
  });

  server.once('error', (error) => {
    console.error(
      `yakit-ui-storybook: cannot listen on ${options.host}:${options.port}: ${error.message}`,
    );
    process.exitCode = 1;
  });

  server.listen(options.port, options.host, () => {
    const displayHost =
      options.host === '0.0.0.0' || options.host === '::' ? 'localhost' : options.host;
    const url = `http://${displayHost}:${options.port}/`;
    console.log(`yakit-ui Storybook is available at ${url}`);
    if (options.open) openBrowser(url);
  });
  return undefined;
}

if (process.argv[1]) {
  let invokedFile = path.resolve(process.argv[1]);
  let moduleFile = fileURLToPath(import.meta.url);
  try {
    [invokedFile, moduleFile] = await Promise.all([realpath(invokedFile), realpath(moduleFile)]);
  } catch {
    // Preserve the resolved paths so missing files fail through the normal launcher flow.
  }
  if (invokedFile === moduleFile) {
    const exitCode = await run();
    if (exitCode !== undefined) process.exit(exitCode);
  }
}
