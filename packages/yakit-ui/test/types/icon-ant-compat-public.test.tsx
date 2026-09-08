import { createRef } from 'react';

import {
  Loading,
  QuestionMarkCircleOutlined,
  type IconComponent,
  type IconProps,
  type IconRef,
  type IconSvgProps,
  type LoadingProps,
} from '../../src/icons';
import type {
  IconComponent as ColorfulIconComponent,
  IconProps as ColorfulIconProps,
  IconRef as ColorfulIconRef,
  IconSvgProps as ColorfulIconSvgProps,
} from '../../src/icons/colorful';
import type {
  IconComponent as OutlineIconComponent,
  IconProps as OutlineIconProps,
  IconRef as OutlineIconRef,
  IconSvgProps as OutlineIconSvgProps,
} from '../../src/icons/outline';
import { iconRegistry } from '../../src/icons/registry';
import type {
  IconComponent as SolidIconComponent,
  IconProps as SolidIconProps,
  IconRef as SolidIconRef,
  IconSvgProps as SolidIconSvgProps,
} from '../../src/icons/solid';

const spanRef = createRef<HTMLSpanElement>();
const rootProps = {
  'aria-label': 'question',
  className: 'consumer-icon',
  onClick: () => undefined,
  size: 16,
  style: { color: '#123456' },
  svgProps: {
    className: 'inner-icon',
    fill: 'none',
    height: 19,
    preserveAspectRatio: 'xMidYMid',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    width: 18,
  },
} satisfies IconProps;

const svgProps = rootProps.svgProps satisfies IconSvgProps;
const iconRefIsSpan: IconRef extends HTMLSpanElement ? true : false = true;
const component: IconComponent = QuestionMarkCircleOutlined;
const loadingProps = { spin: true, spinSpeed: 2, ...rootProps } satisfies LoadingProps;
const familyTypes:
  | [
      OutlineIconComponent,
      SolidIconComponent,
      ColorfulIconComponent,
      OutlineIconProps,
      SolidIconProps,
      ColorfulIconProps,
      OutlineIconRef,
      SolidIconRef,
      ColorfulIconRef,
      OutlineIconSvgProps,
      SolidIconSvgProps,
      ColorfulIconSvgProps,
    ]
  | null = null;

export const IconAntCompatTypeFixture = () => (
  <>
    <QuestionMarkCircleOutlined {...rootProps} data-icon-purpose="help" ref={spanRef} />
    <Loading {...loadingProps} ref={spanRef} />
  </>
);

iconRegistry.forEach(({ Component }) => {
  const registryComponent: IconComponent = Component;
  void registryComponent;
});

// Top-level SVG presentation attributes no longer target the public root.
// @ts-expect-error width must be nested under svgProps
const invalidRootWidth: IconProps = { width: 24 };
// @ts-expect-error fill must be nested under svgProps
const invalidRootFill: IconProps = { fill: 'none' };

// Inner SVG props are presentation-only and cannot create a second interactive/accessibility node.
// @ts-expect-error ARIA attributes belong to the span root
const invalidSvgAria: IconSvgProps = { 'aria-label': 'duplicate' };
// @ts-expect-error events belong to the span root
const invalidSvgEvent: IconSvgProps = { onClick: () => undefined };
// @ts-expect-error role belongs to the span root
const invalidSvgRole: IconSvgProps = { role: 'button' };
// @ts-expect-error tabIndex belongs to the span root
const invalidSvgTabIndex: IconSvgProps = { tabIndex: 0 };
// @ts-expect-error focusable is fixed by the implementation
const invalidSvgFocusable: IconSvgProps = { focusable: 'true' };
// @ts-expect-error ref belongs to the span root
const invalidSvgRef: IconSvgProps = { ref: createRef<SVGSVGElement>() };
// @ts-expect-error fixed icon children cannot be replaced
const invalidSvgChildren: IconSvgProps = { children: <title>replacement</title> };
// @ts-expect-error raw HTML cannot replace fixed icon children
const invalidSvgHtml: IconSvgProps = { dangerouslySetInnerHTML: { __html: '<path />' } };

void component;
void familyTypes;
void iconRefIsSpan;
void invalidRootFill;
void invalidRootWidth;
void invalidSvgAria;
void invalidSvgChildren;
void invalidSvgEvent;
void invalidSvgFocusable;
void invalidSvgHtml;
void invalidSvgRef;
void invalidSvgRole;
void invalidSvgTabIndex;
void svgProps;

const adjustableWidth: IconProps = { svgProps: { strokeWidth: 0, style: { strokeWidth: '1px' } } };
// @ts-expect-error strokeWidth belongs to svgProps, not the outer span API
const invalidTopLevelWidth: IconProps = { strokeWidth: 2 };
void adjustableWidth;
void invalidTopLevelWidth;
