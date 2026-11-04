import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const scripts = packageJson.scripts;

const plannedNodeTests = readdirSync(resolve(packageRoot, 'test/icons'))
  .filter((file) => file.startsWith('solid-') && file.endsWith('.test.ts'))
  .sort();
const plannedBrowserTests = readdirSync(resolve(packageRoot, 'test/components'))
  .filter((file) => file.startsWith('solid-icon-') && file.endsWith('.test.tsx'))
  .sort();

describe('icon package script coverage', () => {
  it('wires both family audits through explicit immutable policies', () => {
    expect(scripts['audit:icons:outline']).toContain('--policy outline-v1');
    expect(scripts['audit:icons:outline']).toContain('config/icon-sources/outline.json#manifest');
    expect(scripts['audit:icons:solid']).toContain('--policy solid-v1');
    expect(scripts['audit:icons:solid']).toContain('config/icon-sources/solid.json#manifest');
    expect(scripts['audit:icons:solid']).toContain('config/icon-sources/solid.json#raw');
    expect(scripts['audit:icons:solid']).toContain('config/icon-sources/solid.json#placement');
    expect(scripts['audit:icons:colorful']).toBe(
      'node scripts/colorful-audit.mjs && node scripts/colorful-entry-generator.mjs',
    );
    expect(scripts['audit:icons']).toBe(
      'pnpm run audit:icons:stroke && pnpm run audit:icons:adjustable && pnpm run audit:icons:outline && pnpm run audit:icons:solid && pnpm run audit:icons:colorful',
    );
  });

  it('checks all production stroke widths and executes compatibility and runtime regressions', () => {
    expect(scripts['audit:icons:stroke']).toBe('node scripts/check-icon-stroke-width.mjs --check');
    expect(scripts['test:ci']).toContain('pnpm run audit:icons:stroke');
    expect(scripts['test:ci']).toContain('pnpm run test:icon-stroke-width');
    for (const file of [
      'icon-stroke-width.test.ts',
      'oldicon-stroke-width.test.ts',
      'icon-stroke-width-ssr.test.ts',
    ])
      expect(scripts['test:icon-stroke-width']).toContain(`test/icons/${file}`);
    expect(scripts['test:icon-visual']).toContain('test/icons/icon-stroke-width-visual.test.ts');
  });

  it('wires adjustable stroke contracts, browser, geometry, visual, and consumer gates', () => {
    expect(scripts['audit:icons:adjustable']).toBe(
      'node config/generateIconStrokeContract.mjs --check',
    );
    expect(scripts['test:ci']).toContain('pnpm run test:icon-adjustable');
    for (const file of ['transform', 'audit', 'geometry', 'ssr'])
      expect(scripts['test:icon-adjustable']).toContain(
        `test/icons/icon-adjustable-${file}.test.ts`,
      );
    expect(scripts['test:icon-adjustable']).toContain(
      'test/components/icon-adjustable-runtime.test.tsx',
    );
    expect(scripts['test:icon-visual']).toContain('test/icons/icon-adjustable-visual.test.ts');
    expect(scripts['test:icon-dist-consumer']).toContain(
      'test/icons/icon-adjustable-consumer.test.ts',
    );
  });

  it('executes every Solid node and browser test from an explicit package aggregate', () => {
    expect(plannedNodeTests.length).toBeGreaterThan(0);
    expect(plannedBrowserTests.length).toBeGreaterThan(0);
    const solidTestArguments = scripts['test:icons:solid'].split(/\s+/);
    for (const file of [...plannedNodeTests, ...plannedBrowserTests]) {
      expect(solidTestArguments, file).toContain(
        `test/${file.endsWith('.tsx') ? 'components' : 'icons'}/${file}`,
      );
    }
    expect(scripts['test:icons:solid']).toContain('pnpm run test:types');
    expect(scripts['test:icons:audit-determinism']).toContain(
      'test/icons/icon-audit-determinism.test.ts',
    );
  });

  it('lints complete source, script, Storybook, test, and type directories', () => {
    for (const command of [scripts.lint, scripts['lint:fix']]) {
      for (const target of [
        'src',
        'config',
        'scripts',
        '.storybook',
        'test/icons',
        'test/components',
        'test/types',
      ]) {
        expect(command, target).toContain(target);
      }
    }
  });

  it('includes the Solid type contract and keeps the direct dist consumer gate', () => {
    const typeConfig = readFileSync(resolve(packageRoot, 'test/types/tsconfig.json'), 'utf8');
    expect(typeConfig).toMatch(/\*\.test\.tsx|solid-icon-public\.test\.tsx/);
    expect(scripts['test:icon-dist-consumer']).toContain('pnpm run build:lib');
    expect(scripts['test:icon-dist-consumer']).toContain('test/icons/dist-consumer.test.ts');
    expect(scripts['test:icon-dist-consumer']).toContain(
      'pnpm --filter @yakit-libs/yakit-ui-icons run build',
    );
    expect(scripts['test:icon-dist-consumer']).toContain(
      'test/icons/icon-stroke-width-dist.test.ts',
    );
  });

  it('keeps one root update entry alongside the Figma name checks', () => {
    const rootScripts = JSON.parse(
      readFileSync(resolve(packageRoot, '../../package.json'), 'utf8'),
    ).scripts;
    expect(scripts['test:audit-icons']).toContain('test/icons/icon-figma-names.test.ts');
    expect(scripts['test:audit-icons']).toContain('test/icons/icon-registry-names.test.ts');
    expect(rootScripts['icons:update']).toBe('node packages/yakit-ui/scripts/update-icons.mjs');
    expect(rootScripts['icons:import']).toBe(
      'node packages/yakit-ui/scripts/import-icon-sources.mjs',
    );
    expect(rootScripts['icons:test']).toBe('node --test test/icons/*.test.mjs');
    expect(
      Object.values(scripts).filter((command) => command.includes('scripts/update-icons.mjs')),
    ).toEqual([]);
  });
});
