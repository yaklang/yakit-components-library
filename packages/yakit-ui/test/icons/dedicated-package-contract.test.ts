import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

import ts from 'typescript';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';

import { iconCounts, iconExports } from '../../../yakit-ui-icons/test/icons/icon-inventory';

const coreRoot = process.cwd();
const iconsRoot = resolve(coreRoot, '../yakit-ui-icons');
const requireFromIcons = createRequire(resolve(iconsRoot, 'package.json'));
const forbiddenComponentDependencies = [
  'antd',
  '@ant-design/cssinjs',
  '@emotion/react',
  'react-dom',
  'classnames',
  '@yakit-libs/color',
] as const;
const entryPairs = [
  ['.', './icons'],
  ['./outline', './icons/outline'],
  ['./solid', './icons/solid'],
  ['./colorful', './icons/colorful'],
  ['./registry', './icons/registry'],
] as const;

type PackageManifest = {
  dependencies?: Record<string, string>;
  exports: Record<string, string | { import?: string; types?: string }>;
  name: string;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  private?: boolean;
  sideEffects?: boolean | string[];
};

function readManifest(root: string) {
  return JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as PackageManifest;
}

const coreManifest = readManifest(coreRoot);
const iconsManifest = readManifest(iconsRoot);

function exportTarget(
  root: string,
  manifest: PackageManifest,
  subpath: string,
  condition: 'import' | 'types',
) {
  const declaration = manifest.exports[subpath];
  const target = typeof declaration === 'string' ? declaration : declaration?.[condition];
  expect(target, `${manifest.name} ${subpath} must declare an ${condition} target`).toBeTypeOf(
    'string',
  );
  return resolve(root, target as string);
}

function collectRelativeModuleGraph(entry: string) {
  const pending = [entry];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const source = readFileSync(current, 'utf8');
    for (const match of source.matchAll(
      /(?:from\s*|import\s*\(|export\s+\*\s+from\s*)["'](\.{1,2}\/[^"']+)["']/g,
    )) {
      const specifier = match[1];
      if (!specifier) continue;
      const base = resolve(dirname(current), specifier);
      const candidate = [base, `${base}.js`, resolve(base, 'index.js')].find(
        (path) => existsSync(path) && statSync(path).isFile(),
      );
      expect(candidate, `relative import ${specifier} from ${current} must resolve`).toBeTruthy();
      if (candidate) pending.push(candidate);
    }
  }

  return [...visited];
}

function declarationExportNames(entry: string) {
  const program = ts.createProgram([entry], {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2020,
  });
  const source = program.getSourceFile(entry);
  const symbol = source && program.getTypeChecker().getSymbolAtLocation(source);
  expect(symbol, `TypeScript must inspect ${entry}`).toBeTruthy();
  return symbol
    ? program
        .getTypeChecker()
        .getExportsOfModule(symbol)
        .map(({ name }) => name)
        .sort()
    : [];
}

describe('Dedicated yakit-ui-icons package', () => {
  it('is a publishable React-only package', () => {
    const runtimeDependencies = {
      ...iconsManifest.dependencies,
      ...iconsManifest.optionalDependencies,
      ...iconsManifest.peerDependencies,
    };

    expect(iconsManifest.name).toBe('@yakit-libs/yakit-ui-icons');
    expect(iconsManifest.private).toBe(false);
    expect(Object.keys(runtimeDependencies).sort()).toEqual(['@yakit-libs/color', 'react']);
    expect(iconsManifest.dependencies).toEqual({ '@yakit-libs/color': '1.4.1' });
    expect(runtimeDependencies.react).toMatch(/18\.2\.0/);
    expect(iconsManifest.sideEffects).toEqual(['**/*.css', 'dist/browser/**/*.js']);
  });

  it('does not publish an unproven bare-SVG raw surface', () => {
    expect(Object.keys(iconsManifest.exports).some((subpath) => subpath.startsWith('./raw'))).toBe(
      false,
    );
    expect(
      Object.keys(coreManifest.exports).some((subpath) => subpath.startsWith('./icons/raw')),
    ).toBe(false);
  });

  it('uses the color 1.4.1 runtime token contract without a CSS side-effect entry', () => {
    const colorEntry = requireFromIcons.resolve('@yakit-libs/color');
    const colorManifest = JSON.parse(
      readFileSync(resolve(dirname(colorEntry), '../package.json'), 'utf8'),
    ) as { exports?: Record<string, unknown>; version?: string };
    const color = requireFromIcons('@yakit-libs/color') as {
      generateColors: (mode: 'dark' | 'light') => Record<string, string>;
    };
    const light = color.generateColors('light');
    const dark = color.generateColors('dark');

    expect(colorManifest.version).toBe('1.4.1');
    expect(colorManifest.exports).not.toHaveProperty('./dist/index.css');
    expect(light['--Colors-Use-Neutral-Text-1-Title']).toBe('var(--yakit-colors-Neutral-100)');
    expect(light['--yakit-colors-Neutral-100']).toBe('#353639');
    expect(dark['--Colors-Use-Neutral-Text-1-Title']).toBe('var(--yakit-colors-Neutral-80)');
    expect(dark['--yakit-colors-Neutral-80']).toBe('#c8d0dd');
  });

  it.each(entryPairs)('publishes readable %s JavaScript and type targets', (iconsSubpath) => {
    expect(existsSync(exportTarget(iconsRoot, iconsManifest, iconsSubpath, 'import'))).toBe(true);
    expect(existsSync(exportTarget(iconsRoot, iconsManifest, iconsSubpath, 'types'))).toBe(true);
  });

  it.each(entryPairs)(
    'mirrors the core runtime exports for %s',
    async (iconsSubpath, coreSubpath) => {
      const dedicated = await import(
        exportTarget(iconsRoot, iconsManifest, iconsSubpath, 'import')
      );
      const core = await import(exportTarget(coreRoot, coreManifest, coreSubpath, 'import'));

      expect(Object.keys(dedicated).sort()).toEqual(Object.keys(core).sort());
    },
  );

  it.each(entryPairs)('mirrors the core type exports for %s', (iconsSubpath, coreSubpath) => {
    const dedicated = declarationExportNames(
      exportTarget(iconsRoot, iconsManifest, iconsSubpath, 'types'),
    );
    const core = declarationExportNames(exportTarget(coreRoot, coreManifest, coreSubpath, 'types'));

    expect(dedicated).toEqual(core);
  });

  it('publishes only Solid-suffixed components from the solid entry', async () => {
    const solid = await import(exportTarget(iconsRoot, iconsManifest, './solid', 'import'));
    const exportNames = Object.keys(solid);

    expect(exportNames).toHaveLength(iconCounts.solid);
    expect([...exportNames].sort()).toEqual([...iconExports.solid].sort());
    expect(exportNames.every((exportName) => exportName.endsWith('Solid'))).toBe(true);
    expect(exportNames).toContain('HomeSolid');
    expect(exportNames).not.toContain('HomeFilled');
  });

  it.each(['.', './outline', './solid', './colorful'])(
    '%s excludes component and CSS side-effect imports',
    (subpath) => {
      const graph = collectRelativeModuleGraph(
        exportTarget(iconsRoot, iconsManifest, subpath, 'import'),
      );
      const source = graph.map((file) => readFileSync(file, 'utf8')).join('\n');

      expect(graph.some((file) => file.replaceAll('\\', '/').includes('/components/'))).toBe(false);
      for (const dependency of forbiddenComponentDependencies) {
        expect(source, `${subpath} must not reference ${dependency}`).not.toContain(dependency);
      }
      expect(source).toContain('var(--Colors-Use-Neutral-Text-1-Title, #353639)');
    },
  );

  it('tree-shakes one icon below the dedicated-package bundle budget', async () => {
    const entry = exportTarget(iconsRoot, iconsManifest, '.', 'import');
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        lib: { entry, formats: ['es'] },
        minify: 'esbuild',
        write: false,
        rollupOptions: {
          external: (id) => id === 'react' || id.startsWith('react/'),
          input: 'virtual:dedicated-single-icon-consumer',
          plugins: [
            {
              name: 'dedicated-single-icon-consumer',
              resolveId(id) {
                return id === 'virtual:dedicated-single-icon-consumer' ? id : null;
              },
              load(id) {
                if (id !== 'virtual:dedicated-single-icon-consumer') return null;
                return `export { HomeOutlined } from ${JSON.stringify(entry)};`;
              },
            },
          ],
        },
      },
    });
    const outputs = Array.isArray(result) ? result.flatMap(({ output }) => output) : result.output;
    const code = outputs
      .filter((output) => output.type === 'chunk')
      .map((output) => output.code)
      .join('\n');

    expect(Buffer.byteLength(code)).toBeLessThanOrEqual(15_000);
    expect(gzipSync(code).byteLength).toBeLessThanOrEqual(5_000);
    expect(code).toContain('HomeOutlined');
    expect(code).not.toContain('AcademicCapOutlined');
    expect(code).not.toContain('HomeSolid');
    expect(code).not.toMatch(/(?:outlineIconRegistry|solidIconRegistry|iconRegistry)/);
    for (const dependency of forbiddenComponentDependencies) {
      expect(code, `single-icon bundle must not reference ${dependency}`).not.toContain(dependency);
    }
  });

  it('tree-shakes one fragment-bearing colorful icon from the dedicated subpath', async () => {
    const entry = exportTarget(iconsRoot, iconsManifest, './colorful', 'import');
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        lib: { entry, formats: ['es'] },
        minify: 'esbuild',
        write: false,
        rollupOptions: {
          external: (id) => id === 'react' || id.startsWith('react/'),
          input: 'virtual:dedicated-colorful-icon-consumer',
          plugins: [
            {
              name: 'dedicated-colorful-icon-consumer',
              resolveId(id) {
                return id === 'virtual:dedicated-colorful-icon-consumer' ? id : null;
              },
              load(id) {
                if (id !== 'virtual:dedicated-colorful-icon-consumer') return null;
                return `export { EdgeBrowserColorful } from ${JSON.stringify(entry)};`;
              },
            },
          ],
        },
      },
    });
    const outputs = Array.isArray(result) ? result.flatMap(({ output }) => output) : result.output;
    const code = outputs
      .filter((output) => output.type === 'chunk')
      .map((output) => output.code)
      .join('\n');

    expect(Buffer.byteLength(code)).toBeLessThanOrEqual(15_000);
    expect(gzipSync(code).byteLength).toBeLessThanOrEqual(5_000);
    expect(code).toContain('EdgeBrowserColorful');
    expect(code).toContain('useId');
    expect(code).not.toContain('ChromeBrowserColorful');
    expect(code).not.toContain('MitmPrimaryMenuColorful');
    expect(code).not.toMatch(/(?:colorfulIconRegistry|iconRegistry)/);
  });
});
