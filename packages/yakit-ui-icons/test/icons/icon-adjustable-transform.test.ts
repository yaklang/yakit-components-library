import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { build, type Rollup } from 'vite';
import { describe, expect, it } from 'vitest';

import {
  checkIconStrokeContract,
  generateIconStrokeContract,
  serializeIconStrokeContract,
} from '../../config/generateIconStrokeContract.mjs';
import {
  applyIconStrokeContract,
  type IconStrokeContract,
  type StrokeTargetContract,
  validateIconStrokeContract,
} from '../../config/iconStrokeContract';
import { createSvgReactPlugin } from '../../config/svgReactTransform';

// Test builders intentionally expose arbitrary Babel AST fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = Record<string, any>;

const digest = (source: string) => createHash('sha256').update(source).digest('hex');
const identifier = (name: string) => ({ name, type: 'JSXIdentifier' });
const numeric = (value: number) => ({ type: 'NumericLiteral', value });
const attribute = (name: string, value: Node) => ({
  name: identifier(name),
  type: 'JSXAttribute',
  value: { expression: value, type: 'JSXExpressionContainer' },
});
const element = (name: string, attributes: Node[] = [], children: Node[] = []): Node => ({
  children,
  openingElement: { attributes, name: identifier(name), type: 'JSXOpeningElement' },
  type: 'JSXElement',
});
const contract = (source: string, targets: IconStrokeContract['targets']): IconStrokeContract => ({
  classification: 'adjustable',
  file: 'fixture.svg',
  sha256: digest(source),
  targets,
});
const target = (
  locator: number[],
  overrides: Partial<StrokeTargetContract> = {},
): StrokeTargetContract => ({
  element: 'path',
  expectedMatches: 1 as const,
  locator,
  role: 'adjustable-primary' as const,
  sourceDefault: '1',
  surface: 'attribute' as const,
  ...overrides,
});

describe('adjustable icon stroke transform contract', () => {
  it('compiles a registered Outline stroke against svgProps precedence', async () => {
    const result = (await build({
      build: {
        minify: false,
        rollupOptions: {
          external: ['react', 'react/jsx-runtime'],
          input: resolve(import.meta.dirname, '../fixtures/icons/transform/outline-entry.ts'),
          preserveEntrySignatures: 'strict',
          treeshake: false,
        },
        write: false,
      },
      configFile: false,
      logLevel: 'silent',
      plugins: [createSvgReactPlugin()],
    })) as Rollup.RollupOutput;
    const output = result.output
      .filter((entry): entry is Rollup.OutputChunk => entry.type === 'chunk')
      .map(({ code }) => code)
      .join('\n');
    expect(output).toContain('props.style');
    expect(output).toMatch(/\.strokeWidth\)\s*\?\?\s*props\.strokeWidth\s*\?\?\s*1/);
  });

  it('binds actual stroke nodes with style, attribute, zero, and unit-preserving precedence', () => {
    const source = '<svg><path stroke-width="1px"/></svg>';
    const path = element('path', [
      attribute('strokeWidth', { type: 'StringLiteral', value: '1px' }),
    ]);
    const root = element('svg', [], [path]);
    const fixtureContract = contract(source, [target([0], { sourceDefault: '1px' })]);

    validateIconStrokeContract(root, source, fixtureContract);
    expect(
      applyIconStrokeContract(root, '/project/src/outline/fixture.svg', source, fixtureContract),
    ).toBe(true);

    expect(path.openingElement.attributes[0].value.expression).toMatchObject({
      left: {
        left: {
          object: { object: { name: 'props' }, property: { name: 'style' } },
          optional: true,
        },
        operator: '??',
        right: { object: { name: 'props' }, property: { name: 'strokeWidth' } },
      },
      operator: '??',
      right: { type: 'StringLiteral', value: '1px' },
    });
  });

  it('mutates visible and coupled targets while preserving fixed definitions', () => {
    const source =
      '<svg><path stroke-width="1"/><defs><mask><path stroke-width="1"/><path stroke-width="1"/></mask></defs></svg>';
    const visible = element('path', [attribute('strokeWidth', numeric(1))]);
    const coupled = element('path', [attribute('strokeWidth', numeric(1))]);
    const fixed = element('path', [attribute('strokeWidth', numeric(1))]);
    const root = element(
      'svg',
      [],
      [visible, element('defs', [], [element('mask', [], [coupled, fixed])])],
    );
    const fixtureContract = contract(source, [
      target([0]),
      target([1, 0, 0], { role: 'coupled-cutout' }),
      target([1, 0, 1], { role: 'fixed-definition' }),
    ]);
    applyIconStrokeContract(root, '/project/src/outline/fixture.svg', source, fixtureContract);
    expect(visible.openingElement.attributes[0].value.expression.type).toBe('LogicalExpression');
    expect(coupled.openingElement.attributes[0].value.expression.type).toBe('LogicalExpression');
    expect(fixed.openingElement.attributes[0].value.expression).toEqual(numeric(1));
  });

  it('replaces inline style width while preserving the other style properties', () => {
    const source = '<svg><path style="stroke-width: 1; fill: none"/></svg>';
    const strokeWidth = {
      computed: false,
      key: { name: 'strokeWidth', type: 'Identifier' },
      type: 'ObjectProperty',
      value: numeric(1),
    };
    const fill = {
      computed: false,
      key: { name: 'fill', type: 'Identifier' },
      type: 'ObjectProperty',
      value: { type: 'StringLiteral', value: 'none' },
    };
    const path = element('path', [
      attribute('style', { properties: [strokeWidth, fill], type: 'ObjectExpression' }),
    ]);
    const root = element('svg', [], [path]);
    applyIconStrokeContract(
      root,
      '/project/src/outline/fixture.svg',
      source,
      contract(source, [target([0], { surface: 'style' })]),
    );
    expect(strokeWidth.value.type).toBe('LogicalExpression');
    expect(fill.value).toEqual({ type: 'StringLiteral', value: 'none' });
  });

  it('rejects hash, locator, expected-count, duplicate, and unclassified-node drift', () => {
    const source = '<svg><path stroke-width="1"/></svg>';
    const root = element('svg', [], [element('path', [attribute('strokeWidth', numeric(1))])]);
    const valid = contract(source, [target([0])]);
    expect(() => validateIconStrokeContract(root, `${source} `, valid)).toThrow(
      /ICON_STROKE_SOURCE_DRIFT/,
    );
    expect(() => validateIconStrokeContract(root, source, contract(source, [target([1])]))).toThrow(
      /ICON_STROKE_LOCATOR_DRIFT/,
    );
    expect(() =>
      validateIconStrokeContract(
        root,
        source,
        contract(source, [target([0], { expectedMatches: 2 as 1 })]),
      ),
    ).toThrow(/ICON_STROKE_INVALID_EXPECTED_COUNT/);
    expect(() =>
      validateIconStrokeContract(root, source, contract(source, [target([0]), target([0])])),
    ).toThrow(/ICON_STROKE_DUPLICATE_TARGET/);
    expect(() =>
      validateIconStrokeContract(
        root,
        source,
        contract(source, [target([0], { sourceDefault: '2' })]),
      ),
    ).toThrow(/ICON_STROKE_DEFAULT_DRIFT/);
    const duplicateAttribute = element(
      'svg',
      [],
      [
        element('path', [
          attribute('strokeWidth', numeric(1)),
          attribute('strokeWidth', numeric(1)),
        ]),
      ],
    );
    expect(() => validateIconStrokeContract(duplicateAttribute, source, valid)).toThrow(
      /ICON_STROKE_AST_DUPLICATE_WIDTH/,
    );

    const extra = element(
      'svg',
      [],
      [
        element('path', [attribute('strokeWidth', numeric(1))]),
        element('circle', [attribute('strokeWidth', numeric(1))]),
      ],
    );
    expect(() => validateIconStrokeContract(extra, source, valid)).toThrow(
      /ICON_STROKE_UNCLASSIFIED/,
    );
  });

  it('rejects adjustable entries without an adjustable role and fixed-fill entries with widths', () => {
    const source = '<svg><path stroke-width="1"/></svg>';
    const root = element('svg', [], [element('path', [attribute('strokeWidth', numeric(1))])]);
    expect(() =>
      validateIconStrokeContract(
        root,
        source,
        contract(source, [target([0], { role: 'fixed-definition' })]),
      ),
    ).toThrow(/ICON_STROKE_ADJUSTABLE_WITHOUT_TARGET/);
    expect(() =>
      validateIconStrokeContract(root, source, {
        classification: 'fixed-fill',
        file: 'fixture.svg',
        reason: 'fixture',
        sha256: digest(source),
        targets: [],
      }),
    ).toThrow(/ICON_STROKE_FIXED_FILL_HAS_WIDTH/);
  });

  it('generates every declared width and rejects unknown fill-only or unsupported stroke nodes', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'icon-stroke-contract-'));
    try {
      writeFileSync(
        resolve(root, 'multi.svg'),
        '<svg stroke="currentColor"><path stroke-width="1"/><circle style="stroke-width: 2px; fill: none"/></svg>',
      );
      expect(generateIconStrokeContract(root, { fixedFill: new Map() })['multi.svg']).toMatchObject(
        {
          classification: 'adjustable',
          targets: [
            { locator: [0], sourceDefault: '1', surface: 'attribute' },
            { locator: [1], sourceDefault: '2px', surface: 'style' },
          ],
        },
      );

      writeFileSync(
        resolve(root, 'group.svg'),
        '<svg><g stroke-width="1"><path stroke="currentColor"/></g></svg>',
      );
      expect(
        generateIconStrokeContract(root, { fixedFill: new Map() })['group.svg'].targets,
      ).toMatchObject([{ element: 'g', locator: [0], sourceDefault: '1' }]);
      writeFileSync(
        resolve(root, 'group.svg'),
        '<svg stroke="currentColor"><path stroke="unset" stroke-width="1"/></svg>',
      );
      expect(
        generateIconStrokeContract(root, { fixedFill: new Map() })['group.svg'].classification,
      ).toBe('adjustable');
      rmSync(resolve(root, 'group.svg'));
      for (const nonpainting of [
        '<svg><g stroke-width="1"><path stroke="currentColor" stroke-width="2"/></g></svg>',

        '<svg><path stroke="none" stroke-width="1"/></svg>',
        '<svg><path fill="currentColor" stroke-width="1"/></svg>',
        '<svg stroke="currentColor"><path style="stroke:none;stroke-width:1"/></svg>',
      ]) {
        writeFileSync(resolve(root, 'unknown.svg'), nonpainting);
        expect(() => generateIconStrokeContract(root, { fixedFill: new Map() })).toThrow(
          /ICON_STROKE_NONPAINTING_WIDTH_UNSUPPORTED/,
        );
      }
      writeFileSync(resolve(root, 'unknown.svg'), '<svg><path fill="currentColor"/></svg>');
      expect(() => generateIconStrokeContract(root, { fixedFill: new Map() })).toThrow(
        /ICON_STROKE_FILL_DISPOSITION_MISSING: outline\/unknown\.svg/,
      );
      writeFileSync(resolve(root, 'unknown.svg'), '<svg><use stroke-width="1"/></svg>');
      expect(() => generateIconStrokeContract(root, { fixedFill: new Map() })).toThrow(
        /ICON_STROKE_ELEMENT_UNSUPPORTED: outline\/unknown\.svg:use/,
      );
      writeFileSync(
        resolve(root, 'unknown.svg'),
        '<svg><path style="stroke-width: 1; stroke-width: 2"/></svg>',
      );
      expect(() => generateIconStrokeContract(root, { fixedFill: new Map() })).toThrow(
        /ICON_STROKE_DUPLICATE_STYLE_WIDTH/,
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it('checks generated data without rewriting it and rejects stale output', async () => {
    const root = mkdtempSync(resolve(tmpdir(), 'icon-stroke-contract-check-'));
    const target = resolve(root, 'contract.ts');
    try {
      writeFileSync(
        resolve(root, 'fixture.svg'),
        '<svg stroke="currentColor"><path stroke-width="1"/></svg>',
      );
      const options = { fixedFill: new Map() };
      writeFileSync(
        target,
        await serializeIconStrokeContract(generateIconStrokeContract(root, options)),
      );
      const before = statSync(target, { bigint: true }).mtimeNs;
      await expect(checkIconStrokeContract(root, target, options)).resolves.toEqual({ files: 1 });
      expect(statSync(target, { bigint: true }).mtimeNs).toBe(before);

      writeFileSync(target, '// stale\n');
      await expect(checkIconStrokeContract(root, target, options)).rejects.toThrow(
        /ICON_STROKE_CONTRACT_STALE/,
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it('rejects a contract registered under the wrong source filename', () => {
    const source = '<svg><path stroke-width="1"/></svg>';
    const root = element('svg', [], [element('path', [attribute('strokeWidth', numeric(1))])]);
    const mismatched = { ...contract(source, [target([0])]), file: 'other.svg' };
    expect(() =>
      applyIconStrokeContract(root, '/project/src/outline/fixture.svg', source, mismatched),
    ).toThrow(/ICON_STROKE_FILE_MISMATCH/);
  });
});
