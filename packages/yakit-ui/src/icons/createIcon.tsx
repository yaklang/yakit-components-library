import type { ComponentType } from 'react';

import type { IconProps } from './types.js';

type SvgIcon = ComponentType<IconProps>;

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
): ComponentType<IconProps> {
  // SVG modules are typed by vite-plugin-svgr. Keeping that type at this boundary
  // avoids exposing its React type-version details through the public icon API.
  const Svg = svg as SvgIcon;
  const Icon = ({ size, color, style, ...props }: IconProps) => {
    const sizeProps = size === undefined ? undefined : { height: size, width: size };

    return (
      <Svg
        aria-hidden={props['aria-label'] || props['aria-labelledby'] ? undefined : true}
        focusable="false"
        {...sizeProps}
        {...props}
        style={{ color: color ?? defaultColor, ...style }}
      />
    );
  };

  Icon.displayName = displayName;
  return Icon;
}
