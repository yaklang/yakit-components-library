import { forwardRef, type SVGProps } from 'react';

import { DEFAULT_ICON_COLOR } from '../createIcon.js';
import { IconBase } from '../IconBase.js';
import type { IconProps as BaseIconProps } from '../types.js';

export interface LoadingProps extends BaseIconProps {
  spin?: boolean;
  spinSpeed?: number;
}

/** @deprecated Use LoadingProps. */
export type IconProps = LoadingProps;

const LOADING_KEYFRAME = 'yakitIconLoadingSpin_b1a35c158267';
const DEFAULT_LOADING_STROKE_WIDTH = 1.5;

const LoadingSvg = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3"
      stroke="currentColor"
      strokeWidth={props.style?.strokeWidth ?? props.strokeWidth ?? DEFAULT_LOADING_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Loading = forwardRef<HTMLSpanElement, LoadingProps>(
  ({ size = 24, spin = false, spinSpeed = 1, svgProps, ...rootProps }, ref) => {
    const animation = spin ? `${LOADING_KEYFRAME} ${spinSpeed}s linear infinite` : undefined;
    const innerClassName = ['yakit-icon-loading-svg', svgProps?.className]
      .filter(Boolean)
      .join(' ');

    return (
      <IconBase
        {...rootProps}
        ref={ref}
        Svg={LoadingSvg}
        defaultColor={DEFAULT_ICON_COLOR}
        size={size}
        svgProps={{
          ...svgProps,
          className: innerClassName,
          style: {
            animation,
            ...svgProps?.style,
          },
        }}
      />
    );
  },
);

Loading.displayName = 'Loading';

export default Loading;
