import type { FC, SVGProps } from 'react';

import useToken from '../../hooks/useToken';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string;
  color?: string;
  spin?: boolean;
  spinSpeed?: number;
}

const Loading: FC<IconProps> = ({
  size = 24,
  color,
  spin = false,
  spinSpeed = 1,
  style,
  ...rest
}) => {
  const [_, token] = useToken();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{
        ...style,
        animation: spin ? `loading-spin ${spinSpeed}s linear infinite` : undefined,
      }}
      {...rest}
    >
      <path
        d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3"
        stroke={color ?? token.colorPrimaryText}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <style>
        {`
          @keyframes loading-spin {
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </svg>
  );
};

export default Loading;
