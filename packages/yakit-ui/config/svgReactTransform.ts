import svgr from 'vite-plugin-svgr';

type SvgrPluginOptions = NonNullable<Parameters<typeof svgr>[0]>;
type SvgrTemplate = NonNullable<NonNullable<SvgrPluginOptions['svgrOptions']>['template']>;

const normalizedFragmentBase = /icon_[A-Za-z0-9_]+__[A-Za-z][A-Za-z0-9_]*_\d+(?!\d|__)/g;

interface AstNode {
  [key: string]: AstNode | AstNode[] | boolean | null | number | string | undefined;
  type?: string;
}

const stringLiteral = (value: string): AstNode => ({ type: 'StringLiteral', value });
const identifier = (name: string): AstNode => ({ name, type: 'Identifier' });

function dynamicFragmentExpression(value: string): AstNode | undefined {
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
  return expression;
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
      const expression = dynamicFragmentExpression(String(value.value));
      if (expression) {
        node.value = { expression, type: 'JSXExpressionContainer' };
        return true;
      }
    }
  }

  let changed = false;
  for (const [key, value] of Object.entries(node)) {
    if (!value || typeof value !== 'object') continue;

    if (!Array.isArray(value) && value.type === 'StringLiteral') {
      const replacement = dynamicFragmentExpression(String(value.value));
      if (replacement) {
        node[key] = replacement;
        changed = true;
      }
      continue;
    }

    changed = appendInstanceSuffix(value as AstNode | AstNode[]) || changed;
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

const iconFactoryModule =
  /[/\\]icons[/\\](?:(?:colorful|outline|solid)[/\\]index|oldicon[/\\]icons[/\\][A-Za-z_$][A-Za-z0-9_$]*)\.tsx$/;
const unannotatedCreateIconCall = /(?<!@__PURE__ \*\/)\bcreateIcon\s*\(/g;

/** Preserve per-export tree shaking when Rollup compiles icon family barrels. */
export const createIconPureAnnotationPlugin = () => ({
  enforce: 'pre' as const,
  name: 'yakit-icon-pure-annotations',
  transform(code: string, id: string) {
    if (!iconFactoryModule.test(id) || !code.includes('createIcon(')) return null;
    return {
      code: code.replace(unannotatedCreateIconCall, '/* @__PURE__ */ createIcon('),
      map: null,
    };
  },
});
