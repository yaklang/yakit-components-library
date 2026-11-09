import type {
  AriaAttributes,
  ComponentPropsWithoutRef,
  DOMAttributes,
  ForwardRefExoticComponent,
  RefAttributes,
  SVGProps,
} from 'react';

type ForbiddenIconSvgProps =
  | keyof AriaAttributes
  | keyof DOMAttributes<SVGSVGElement>
  | 'role'
  | 'tabIndex'
  | 'focusable'
  | 'ref'
  | 'children'
  | 'dangerouslySetInnerHTML';

/** Presentation-only overrides for the inner SVG; strokeWidth controls stroked Outline icons and Loading. */
export type IconSvgProps = Omit<SVGProps<SVGSVGElement>, ForbiddenIconSvgProps>;

/** Shared props for every icon exported by Yakit UI. */
export type IconProps = Omit<
  ComponentPropsWithoutRef<'span'>,
  'children' | 'dangerouslySetInnerHTML' | 'color'
> & {
  /** Applies an explicit root color. `currentColor` preserves natural inheritance. */
  color?: string;
  /** Overrides the Figma-defined SVG size. */
  size?: number | string;
  /** Applies presentation-only attributes to the inner SVG. */
  svgProps?: IconSvgProps;
};

export type IconRef = HTMLSpanElement;

export type IconComponent = ForwardRefExoticComponent<IconProps & RefAttributes<HTMLSpanElement>>;
