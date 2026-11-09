import { forwardRef, type ComponentType, type SVGProps } from 'react';

import { IconBase } from './IconBase.js';
import type { IconComponent, IconProps } from './types.js';

type SvgIcon = ComponentType<SVGProps<SVGSVGElement>>;

/** Figma `Colors-Use/Neutral/Text 1-Title`, provided by @yakit-libs/color. */
export const DEFAULT_ICON_COLOR = 'var(--Colors-Use-Neutral-Text-1-Title, #353639)';

/**
 * Turns a Figma-exported SVG into an icon component with an Ant Design-like API.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createIcon(
  svg: unknown,
  displayName: string,
  defaultColor = DEFAULT_ICON_COLOR,
): IconComponent {
  // SVG modules are typed by vite-plugin-svgr. Keeping that type at this boundary
  // avoids exposing its React type-version details through the public icon API.
  const Svg = svg as SvgIcon;
  const Icon = forwardRef<HTMLSpanElement, IconProps>((props, ref) => (
    <IconBase {...props} ref={ref} Svg={Svg} defaultColor={defaultColor} />
  ));

  Icon.displayName = displayName;
  return Icon;
}
