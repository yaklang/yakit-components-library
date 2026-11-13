import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  checkIconStrokeWidths,
  runIconStrokeCheck,
  svgFiles,
} from '../../scripts/check-icon-stroke-width.mjs';
import { readIconInputSync } from '../../scripts/icon-source-documents.mjs';
import { normalizeSvgStrokeWidth, svgStrokeWidths } from '../../scripts/icon-stroke-width.mjs';

import { iconSourceFiles } from './icon-inventory';

const createCheckRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'icon-stroke-check-'));
  mkdirSync(resolve(root, 'src/loading'), { recursive: true });
  mkdirSync(resolve(root, 'src/outline'), { recursive: true });
  writeFileSync(
    resolve(root, 'src/outline/example.svg'),
    '<svg><path stroke="currentColor" stroke-width="1.5"/></svg>',
  );
  writeFileSync(
    resolve(root, 'src/loading/index.tsx'),
    'export const Loading = () => <path d="M0 0" strokeWidth={1.5} />;\n',
  );
  mkdirSync(resolve(root, 'config/icon-sources'), { recursive: true });
  writeFileSync(
    resolve(root, 'config/icon-sources/private.json'),
    JSON.stringify({ schemaVersion: 1, files: [] }),
  );
  for (const family of ['outline', 'solid', 'colorful', 'oldicon', 'loading']) {
    writeFileSync(
      resolve(root, `config/icon-sources/${family}.json`),
      JSON.stringify({
        schemaVersion: 1,
        family,
        records: family === 'outline' ? [{ file: 'example.svg' }] : [],
      }),
    );
  }
  return root;
};

describe('source stroke-width policy', () => {
  it('sets positive literal attribute and inline style widths to 1.5 without changing artwork', () => {
    const source =
      '<svg viewBox="0 0 24 24"><g stroke="red" stroke-width="2"><path d="M1.5 2h3" style="stroke-width: 0.5;fill:none"/><defs><mask id="erase"><path stroke="black" stroke-width="4"/></mask></defs></g></svg>';
    const expected =
      '<svg viewBox="0 0 24 24"><g stroke="red" stroke-width="1.5"><path d="M1.5 2h3" style="stroke-width: 1.5;fill:none"/><defs><mask id="erase"><path stroke="black" stroke-width="1.5"/></mask></defs></g></svg>';
    expect(normalizeSvgStrokeWidth(source)).toBe(expected);
    expect(normalizeSvgStrokeWidth(expected)).toBe(expected);
    expect(svgStrokeWidths(expected).map(({ value }) => value)).toEqual(['1.5', '1.5', '1.5']);
  });

  it('keeps fill-only artwork, default widths, IDs and literal text intact', () => {
    const source =
      '<svg><!-- stroke-width="2" --><path d="M1.5 2h3" fill="red"/><path stroke="currentColor"/><text>stroke-width="2"</text></svg>';
    expect(normalizeSvgStrokeWidth(source)).toBe(source);
  });

  it('preserves quoting and supports quoted greater-than attributes', () => {
    expect(
      normalizeSvgStrokeWidth('<svg data-label="a > b"><path stroke-width=\'2\'/></svg>'),
    ).toBe('<svg data-label="a > b"><path stroke-width=\'1.5\'/></svg>');
  });

  it.each(['0', '-1', '1px', '20%', 'inherit', 'var(--width)', 'calc(1 + 1)', 'NaN'])(
    'rejects unsupported width %s with a diagnostic',
    (value) => {
      expect(() => normalizeSvgStrokeWidth(`<svg><path stroke-width="${value}"/></svg>`)).toThrow(
        'STROKE_WIDTH_UNSUPPORTED',
      );
    },
  );

  it('rejects embedded stylesheets rather than silently missing their stroke declarations', () => {
    expect(() =>
      normalizeSvgStrokeWidth('<svg><style>path { stroke-width: 2 }</style></svg>'),
    ).toThrow('STROKE_WIDTH_STYLESHEET_UNSUPPORTED');
  });
});

const packageRoot = process.cwd();

describe('current source coverage', () => {
  it('covers component-local SVGs as well as every public family and Loading', async () => {
    const expected = iconSourceFiles.map((file) => file.replace(/^icons\//, '')).sort();
    expect(await svgFiles(resolve(packageRoot, 'src'))).toEqual(expected);
    expect(await checkIconStrokeWidths(packageRoot)).toEqual({
      svgFiles: expected.length,
      loading: 0,
      violations: 0,
    });
  });
});

describe('read-only stroke-width check CLI', () => {
  it('keeps --check read-only, including source and inventory mtimes', async () => {
    const root = createCheckRoot();
    const paths = ['src/outline/example.svg', 'src/loading/index.tsx'];
    try {
      const beforeState = paths.map((file) => ({
        contents: readIconInputSync(resolve(root, file), 'utf8'),
        mtimeNs: statSync(resolve(root, file), { bigint: true }).mtimeNs,
      }));
      await expect(runIconStrokeCheck(['--write'], root)).rejects.toThrow(/never writes files/);
      await expect(runIconStrokeCheck(['--capture'], root)).rejects.toThrow(/never writes files/);
      await expect(runIconStrokeCheck(['--check'], root)).resolves.toEqual({
        svgFiles: 1,
        loading: 0,
        violations: 0,
      });
      expect(
        paths.map((file) => ({
          contents: readIconInputSync(resolve(root, file), 'utf8'),
          mtimeNs: statSync(resolve(root, file), { bigint: true }).mtimeNs,
        })),
      ).toEqual(beforeState);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it.each([
    ['attribute', '<svg><path stroke-width="2"/></svg>', /stroke-width=2/],
    ['inline style', '<svg><path style="stroke-width: 2.5"/></svg>', /stroke-width=2\.5/],
  ])('locates an invalid %s declaration', async (_label, source, diagnostic) => {
    const root = createCheckRoot();
    try {
      writeFileSync(resolve(root, 'src/outline/example.svg'), source);
      await expect(checkIconStrokeWidths(root)).rejects.toThrow(diagnostic);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it('accepts registered non-Outline widths and independent Loading defaults', async () => {
    const root = createCheckRoot();
    try {
      for (const family of ['solid', 'colorful', 'oldicon']) {
        mkdirSync(resolve(root, `src/${family}`), { recursive: true });
        writeFileSync(
          resolve(root, `src/${family}/example.svg`),
          '<svg><path stroke-width="3" style="stroke-width: 2.5"/></svg>',
        );
        const record =
          family === 'oldicon'
            ? { assetFile: 'example.svg' }
            : family === 'colorful'
              ? { localFile: 'colorful/example.svg' }
              : { file: 'example.svg' };
        writeFileSync(
          resolve(root, `config/icon-sources/${family}.json`),
          JSON.stringify({ schemaVersion: 1, family, records: [record] }),
        );
      }
      writeFileSync(
        resolve(root, 'src/loading/index.tsx'),
        'export const Loading = () => <path strokeWidth={3}/>;',
      );
      await expect(checkIconStrokeWidths(root)).resolves.toMatchObject({
        violations: 0,
        loading: 0,
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it('rejects unregistered SVGs without enforcing Loading width', async () => {
    const root = createCheckRoot();
    try {
      writeFileSync(
        resolve(root, 'src/loading/index.tsx'),
        'export const Loading = () => <path d="M0 0" strokeWidth={2} />;\n',
      );
      writeFileSync(resolve(root, 'src/unregistered.svg'), '<svg><path stroke-width="1"/></svg>');
      await expect(checkIconStrokeWidths(root)).rejects.toThrow(
        /unregistered\.svg: source is not registered/,
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
