import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function checkPrivateIcons(root = fileURLToPath(new URL('..', import.meta.url))) {
  const source = JSON.parse(
    await readFile(path.join(root, 'config/icon-sources/private.json'), 'utf8'),
  );
  if (
    source.schemaVersion !== 1 ||
    !Array.isArray(source.files) ||
    new Set(source.files).size !== source.files.length
  )
    throw new Error('ICON_PRIVATE_SOURCE_SCHEMA_INVALID');
  const expected = new Set(
    source.files.map((file) => {
      if (
        typeof file !== 'string' ||
        !file.startsWith('components/') ||
        file.includes('\\') ||
        file.split('/').some((part) => !part || part === '.' || part === '..')
      )
        throw new Error(`ICON_PRIVATE_PATH_INVALID: ${file}`);
      return `src/${file}`;
    }),
  );
  async function visit(directory) {
    for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
      const file = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`ICON_PRIVATE_SYMLINK_UNSUPPORTED: ${file}`);
      if (entry.isDirectory()) await visit(file);
      else if (file.endsWith('.svg') && !expected.delete(file))
        throw new Error(`ICON_PRIVATE_SVG_UNREGISTERED: ${file}`);
    }
  }
  await visit('src/components');
  if (expected.size) throw new Error(`ICON_PRIVATE_SVG_MISSING: ${[...expected].join(', ')}`);
  return source.files.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`PRIVATE_ICONS_CHECK_OK ${await checkPrivateIcons()} file(s)`);
}
