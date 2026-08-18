import type { SVGProps } from 'react';

/** Shared props for every icon exported by Yakit UI. */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  /** Overrides the Figma-defined default size. */
  size?: number | string;
}
