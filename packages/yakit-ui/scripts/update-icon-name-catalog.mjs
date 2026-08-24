import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildIconNameCatalog, renderIconNameCatalog } from './icon-name-catalog-core.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArguments(argv) {
  const options = {
    output: path.join(packageRoot, 'src/icons/figmaNameCatalog.ts'),
    outlineIndex: path.join(packageRoot, 'src/icons/outline/index.tsx'),
    outlineManifest: path.join(packageRoot, 'scripts/figma-outline-icons-inventory.json'),
    outlinePlacementProvenance: path.join(
      packageRoot,
      'test/fixtures/icons/reference/figma-outline-placement-provenance-v1.json',
    ),
    outlineRawProvenance: path.join(
      packageRoot,
      'test/fixtures/icons/reference/figma-outline-raw-provenance-v1.json',
    ),
    replaceExisting: false,
    solidIndex: path.join(packageRoot, 'src/icons/solid/index.tsx'),
    solidManifest: path.join(packageRoot, 'scripts/figma-solid-icons-inventory.json'),
    solidPlacementProvenance: path.join(
      packageRoot,
      'test/fixtures/icons/reference/figma-solid-placement-provenance-v1.json',
    ),
    solidRawProvenance: path.join(
      packageRoot,
      'test/fixtures/icons/reference/figma-solid-raw-provenance-v1.json',
    ),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--replace-existing') options.replaceExisting = true;
    else if (argument === '--output') options.output = path.resolve(argv[++index]);
    else if (argument === '--outline-index') options.outlineIndex = path.resolve(argv[++index]);
    else if (argument === '--outline-manifest') options.outlineManifest = path.resolve(argv[++index]);
    else if (argument === '--outline-placement-provenance')
      options.outlinePlacementProvenance = path.resolve(argv[++index]);
    else if (argument === '--outline-raw-provenance')
      options.outlineRawProvenance = path.resolve(argv[++index]);
    else if (argument === '--solid-index') options.solidIndex = path.resolve(argv[++index]);
    else if (argument === '--solid-manifest') options.solidManifest = path.resolve(argv[++index]);
    else if (argument === '--solid-placement-provenance')
      options.solidPlacementProvenance = path.resolve(argv[++index]);
    else if (argument === '--solid-raw-provenance')
      options.solidRawProvenance = path.resolve(argv[++index]);
    else throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const [
    outlineManifestSource,
    solidManifestSource,
    outlineIndexSource,
    solidIndexSource,
    outlinePlacementSource,
    outlineRawSource,
    solidPlacementSource,
    solidRawSource,
  ] = await Promise.all([
      readFile(options.outlineManifest, 'utf8'),
      readFile(options.solidManifest, 'utf8'),
      readFile(options.outlineIndex, 'utf8'),
      readFile(options.solidIndex, 'utf8'),
      readFile(options.outlinePlacementProvenance, 'utf8'),
      readFile(options.outlineRawProvenance, 'utf8'),
      readFile(options.solidPlacementProvenance, 'utf8'),
      readFile(options.solidRawProvenance, 'utf8'),
    ]);
  const source = renderIconNameCatalog(
    buildIconNameCatalog({
      outlineIndexSource,
      outlineManifest: JSON.parse(outlineManifestSource),
      outlinePlacementProvenance: JSON.parse(outlinePlacementSource),
      outlineRawProvenance: JSON.parse(outlineRawSource),
      solidIndexSource,
      solidManifest: JSON.parse(solidManifestSource),
      solidPlacementProvenance: JSON.parse(solidPlacementSource),
      solidRawProvenance: JSON.parse(solidRawSource),
    }),
  );
  await writeFile(options.output, source, {
    encoding: 'utf8',
    flag: options.replaceExisting ? 'w' : 'wx',
  });
  console.log(`ICON_NAME_CATALOG_UPDATED ${options.output}`);
}

main().catch((error) => {
  console.error(`ICON_NAME_CATALOG_ERROR ${error.message}`);
  process.exitCode = 2;
});
