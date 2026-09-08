import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, normalize } from 'node:path';

import { outlineStrokeContract } from './iconStrokeContract.generated';

export type StrokeTargetRole = 'adjustable-primary' | 'coupled-cutout' | 'fixed-definition';

export interface StrokeTargetContract {
  element: string;
  expectedMatches: 1;
  locator: number[];
  role: StrokeTargetRole;
  sourceDefault: string;
  surface: 'attribute' | 'style';
}

export interface AdjustableStrokeContract {
  classification: 'adjustable';
  file: string;
  sha256: string;
  targets: StrokeTargetContract[];
}

export interface FixedFillStrokeContract {
  classification: 'fixed-fill';
  file: string;
  reason: string;
  sha256: string;
  targets: [];
}

export type IconStrokeContract = AdjustableStrokeContract | FixedFillStrokeContract;

interface AstNode {
  [key: string]: AstNode | AstNode[] | boolean | null | number | string | undefined;
  type?: string;
}

function isAstNode(value: unknown): value is AstNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const contractByFile: Readonly<Record<string, IconStrokeContract>> = outlineStrokeContract;

const adjustableRoles = new Set<StrokeTargetRole>(['adjustable-primary', 'coupled-cutout']);
const numericLiteral = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

const hash = (source: string) => createHash('sha256').update(source).digest('hex');

function jsxElementName(node: AstNode): string | undefined {
  const opening = node.openingElement;
  if (!isAstNode(opening)) return undefined;
  const name = opening.name;
  return isAstNode(name) && name.type === 'JSXIdentifier' ? String(name.name) : undefined;
}

function elementChildren(node: AstNode): AstNode[] {
  const children = node.children;
  return Array.isArray(children) ? children.filter((child) => child.type === 'JSXElement') : [];
}

function elementAt(root: AstNode, locator: number[]): AstNode | undefined {
  let current = root;
  for (const index of locator) {
    const child = elementChildren(current)[index];
    if (!child) return undefined;
    current = child;
  }
  return current;
}

function openingAttributes(node: AstNode): AstNode[] {
  const opening = node.openingElement;
  if (!isAstNode(opening)) return [];
  return Array.isArray(opening.attributes) ? opening.attributes : [];
}

function attributeName(attribute: AstNode): string | undefined {
  const name = attribute.name;
  return isAstNode(name) && name.type === 'JSXIdentifier' ? String(name.name) : undefined;
}

function strokeAttributes(node: AstNode): AstNode[] {
  return openingAttributes(node).filter(
    (attribute) => attribute.type === 'JSXAttribute' && attributeName(attribute) === 'strokeWidth',
  );
}

function strokeAttribute(node: AstNode): AstNode | undefined {
  return strokeAttributes(node)[0];
}

function styleStrokeProperties(node: AstNode): AstNode[] {
  const style = openingAttributes(node).find(
    (attribute) => attribute.type === 'JSXAttribute' && attributeName(attribute) === 'style',
  );
  if (!style || !isAstNode(style.value)) return [];
  const expression = style.value.expression;
  if (!isAstNode(expression) || expression.type !== 'ObjectExpression') return [];
  const properties = expression.properties;
  if (!Array.isArray(properties)) return [];
  return properties.filter((property) => {
    if (property.type !== 'ObjectProperty') return false;
    const key = property.key;
    return (
      isAstNode(key) &&
      ((key.type === 'Identifier' && key.name === 'strokeWidth') ||
        (key.type === 'StringLiteral' && key.value === 'strokeWidth'))
    );
  });
}

function styleStrokeProperty(node: AstNode): AstNode | undefined {
  return styleStrokeProperties(node)[0];
}

function widthSurfaces(node: AstNode): Array<'attribute' | 'style'> {
  if (strokeAttributes(node).length > 1 || styleStrokeProperties(node).length > 1)
    throw new Error('ICON_STROKE_AST_DUPLICATE_WIDTH');
  return [
    ...(strokeAttribute(node) ? (['attribute'] as const) : []),
    ...(styleStrokeProperty(node) ? (['style'] as const) : []),
  ];
}

function literalValue(node: unknown): string | undefined {
  if (!isAstNode(node)) return undefined;
  if (node.type === 'JSXExpressionContainer') return literalValue(node.expression);
  if (node.type === 'NumericLiteral' || node.type === 'StringLiteral') return String(node.value);
  return undefined;
}

function targetSourceDefault(node: AstNode, surface: 'attribute' | 'style'): string | undefined {
  if (surface === 'attribute') return literalValue(strokeAttribute(node)?.value);
  return literalValue(styleStrokeProperty(node)?.value);
}

function defaultsMatch(expected: string, actual: string | undefined): boolean {
  if (actual === undefined) return false;
  if (numericLiteral.test(expected) && numericLiteral.test(actual))
    return Number(expected) === Number(actual);
  return expected === actual;
}

function collectWidthDeclarations(
  node: AstNode,
  locator: number[] = [],
): Array<{ locator: number[]; surface: 'attribute' | 'style' }> {
  const declarations = widthSurfaces(node).map((surface) => ({ locator, surface }));
  elementChildren(node).forEach((child, index) => {
    declarations.push(...collectWidthDeclarations(child, [...locator, index]));
  });
  return declarations;
}

function defaultExpression(value: string): AstNode {
  return numericLiteral.test(value)
    ? { type: 'NumericLiteral', value: Number(value) }
    : { type: 'StringLiteral', value };
}

function effectiveStrokeWidthExpression(sourceDefault: string): AstNode {
  const props = { name: 'props', type: 'Identifier' };
  const style = {
    computed: false,
    object: props,
    property: { name: 'style', type: 'Identifier' },
    type: 'MemberExpression',
  };
  const styleStrokeWidth = {
    computed: false,
    object: style,
    optional: true,
    property: { name: 'strokeWidth', type: 'Identifier' },
    type: 'OptionalMemberExpression',
  };
  const propStrokeWidth = {
    computed: false,
    object: props,
    property: { name: 'strokeWidth', type: 'Identifier' },
    type: 'MemberExpression',
  };
  return {
    left: {
      left: styleStrokeWidth,
      operator: '??',
      right: propStrokeWidth,
      type: 'LogicalExpression',
    },
    operator: '??',
    right: defaultExpression(sourceDefault),
    type: 'LogicalExpression',
  };
}

function replaceTargetWidth(node: AstNode, target: StrokeTargetContract) {
  const expression = effectiveStrokeWidthExpression(target.sourceDefault);
  if (target.surface === 'attribute') {
    const attribute = strokeAttribute(node);
    if (!attribute) throw new Error('ICON_STROKE_CONTRACT_INTERNAL: missing strokeWidth');
    attribute.value = { expression, type: 'JSXExpressionContainer' };
    return;
  }

  const property = styleStrokeProperty(node);
  if (!property) throw new Error('ICON_STROKE_CONTRACT_INTERNAL: missing style.strokeWidth');
  property.value = expression;
}

function sourceKey(filePath: string): string | undefined {
  const normalizedPath = normalize(filePath);
  const outlineSegment = `${normalize('/src/icons/outline/')}`;
  const index = normalizedPath.lastIndexOf(outlineSegment);
  if (index < 0 || !normalizedPath.endsWith('.svg')) return undefined;
  return basename(normalizedPath);
}

export function validateIconStrokeContract(
  jsx: AstNode,
  source: string,
  contract: IconStrokeContract,
) {
  if (hash(source) !== contract.sha256)
    throw new Error(`ICON_STROKE_SOURCE_DRIFT: outline/${contract.file}`);

  const declarations = collectWidthDeclarations(jsx);
  if (contract.classification === 'fixed-fill' && declarations.length > 0)
    throw new Error(`ICON_STROKE_FIXED_FILL_HAS_WIDTH: outline/${contract.file}`);
  const contractKeys = new Set<string>();
  for (const target of contract.targets) {
    const key = `${target.locator.join('.')}:${target.surface}`;
    if (target.expectedMatches !== 1)
      throw new Error(
        `ICON_STROKE_INVALID_EXPECTED_COUNT: outline/${contract.file}:${key}:${target.expectedMatches}`,
      );
    if (contractKeys.has(key))
      throw new Error(`ICON_STROKE_DUPLICATE_TARGET: outline/${contract.file}:${key}`);
    contractKeys.add(key);

    const node = elementAt(jsx, target.locator);
    const matches = Number(
      node &&
        jsxElementName(node) === target.element &&
        widthSurfaces(node).includes(target.surface),
    );
    if (matches !== target.expectedMatches)
      throw new Error(
        `ICON_STROKE_LOCATOR_DRIFT: outline/${contract.file}:${key}: expected=${target.expectedMatches}: actual=${matches}`,
      );
    const actualDefault = node ? targetSourceDefault(node, target.surface) : undefined;
    if (!defaultsMatch(target.sourceDefault, actualDefault))
      throw new Error(
        `ICON_STROKE_DEFAULT_DRIFT: outline/${contract.file}:${key}: expected=${JSON.stringify(target.sourceDefault)}: actual=${JSON.stringify(actualDefault)}`,
      );
  }

  const declarationKeys = declarations.map(
    ({ locator, surface }) => `${locator.join('.')}:${surface}`,
  );
  const unclassified = declarationKeys.filter((key) => !contractKeys.has(key));
  if (unclassified.length > 0)
    throw new Error(`ICON_STROKE_UNCLASSIFIED: outline/${contract.file}:${unclassified.join(',')}`);
  if (
    contract.classification === 'adjustable' &&
    contract.targets.every(({ role }) => !adjustableRoles.has(role))
  )
    throw new Error(`ICON_STROKE_ADJUSTABLE_WITHOUT_TARGET: outline/${contract.file}`);
}

export function applyIconStrokeContract(
  jsx: AstNode,
  filePath: string,
  source = readFileSync(filePath, 'utf8'),
  contractOverride?: IconStrokeContract,
): boolean {
  const file = sourceKey(filePath);
  if (!file) return false;

  const contract = contractOverride ?? contractByFile[file];
  if (!contract) throw new Error(`ICON_STROKE_FILE_UNCLASSIFIED: outline/${file}`);
  if (contract.file !== file)
    throw new Error(`ICON_STROKE_FILE_MISMATCH: outline/${file}: contract=${contract.file}`);
  validateIconStrokeContract(jsx, source, contract);
  for (const target of contract.targets) {
    if (!adjustableRoles.has(target.role)) continue;
    replaceTargetWidth(elementAt(jsx, target.locator)!, target);
  }
  return contract.classification === 'adjustable';
}
