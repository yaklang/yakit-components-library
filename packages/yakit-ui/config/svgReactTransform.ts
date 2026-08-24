import svgr from 'vite-plugin-svgr';

type SvgrPluginOptions = NonNullable<Parameters<typeof svgr>[0]>;
type SvgrTemplate = NonNullable<NonNullable<SvgrPluginOptions['svgrOptions']>['template']>;

const normalizedFragmentBase = /icon_[A-Za-z0-9_]+__[A-Za-z][A-Za-z0-9_]*_\d+/g;

interface AstNode {
  [key: string]: AstNode | AstNode[] | boolean | null | number | string | undefined;
  type?: string;
}

const stringLiteral = (value: string): AstNode => ({ type: 'StringLiteral', value });
const identifier = (name: string): AstNode => ({ name, type: 'Identifier' });

function dynamicFragmentValue(value: string): AstNode | undefined {
  const matches = [...value.matchAll(normalizedFragmentBase)];
  if (matches.length === 0) return undefined;

  const parts: AstNode[] = [];
  let cursor = 0;
  for (const match of matches) {
    const index = match.index ?? 0;
    parts.push(stringLiteral(`${value.slice(cursor, index)}${match[0]}__`));
    parts.push(identifier('iconInstanceId'));
    cursor = index + match[0].length;
  }
  parts.push(stringLiteral(value.slice(cursor)));

  const expression = parts
    .slice(1)
    .reduce<AstNode>(
      (left, right) => ({ left, operator: '+', right, type: 'BinaryExpression' }),
      parts[0],
    );
  return { expression, type: 'JSXExpressionContainer' };
}

function appendInstanceSuffix(node: AstNode | AstNode[] | null | undefined): boolean {
  if (!node) return false;
  if (Array.isArray(node)) {
    return node.map(appendInstanceSuffix).some(Boolean);
  }

  if (node.type === 'JSXAttribute') {
    const value = node.value;
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      value.type === 'StringLiteral'
    ) {
      const replacement = dynamicFragmentValue(String(value.value));
      if (replacement) {
        node.value = replacement;
        return true;
      }
    }
    return false;
  }

  let changed = false;
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') {
      changed = appendInstanceSuffix(value as AstNode | AstNode[]) || changed;
    }
  }
  return changed;
}

const svgReactTemplate: SvgrTemplate = (variables, { tpl }) => {
  const hasFragments = appendInstanceSuffix(variables.jsx as unknown as AstNode);

  if (!hasFragments) {
    return tpl`
${variables.imports};

${variables.interfaces};

const ${variables.componentName} = (${variables.props}) => (
  ${variables.jsx}
);

${variables.exports};
`;
  }

  return tpl`
import { useId } from 'react';
${variables.imports};

${variables.interfaces};

const ${variables.componentName} = (${variables.props}) => {
  const iconInstanceId = Array.from(
    useId(),
    (character) => character.codePointAt(0).toString(16).padStart(6, '0'),
  ).join('_');

  return ${variables.jsx};
};

${variables.exports};
`;
};

export const svgReactPluginOptions: SvgrPluginOptions = {
  include: '**/*.svg?react',
  svgrOptions: {
    runtimeConfig: false,
    template: svgReactTemplate,
  },
};

/** The only SVG-to-React compilation contract used by Vite, Vitest, and Storybook. */
export const createSvgReactPlugin = () => svgr(svgReactPluginOptions);
