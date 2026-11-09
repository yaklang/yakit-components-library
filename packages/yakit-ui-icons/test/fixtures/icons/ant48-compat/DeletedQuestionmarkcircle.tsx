import React, { type CSSProperties, type MouseEventHandler, type SVGProps } from 'react';

export interface LockedAnt48IconProps {
  className?: string;
  onClick?: MouseEventHandler<HTMLSpanElement>;
  style?: CSSProperties;
  tabIndex?: number;
}

/**
 * Frozen copy of the deleted zero-argument SVG component from Yakit.
 * Its ignored component props are an important part of the historical contract.
 */
export const DeletedQuestionmarkcircleSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8.22766 9C8.77678 7.83481 10.2584 7 12.0001 7C14.2092 7 16.0001 8.34315 16.0001 10C16.0001 11.3994 14.7224 12.5751 12.9943 12.9066C12.4519 13.0106 12.0001 13.4477 12.0001 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="17" r="1" fill="currentColor" />
  </svg>
);

/** Behavioral snapshot of the naked-SVG 0.2.0 package contract. */
export const Naked020QuestionmarkcircleIcon = ({
  color,
  height,
  size,
  style,
  width,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number | string }) => (
  <svg
    width={width ?? size ?? 24}
    height={height ?? size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    {...props}
    style={{ color: color ?? 'var(--Colors-Use-Neutral-Text-1-Title, #353639)', ...style }}
  >
    <path
      d="M8.22766 9C8.77678 7.83481 10.2584 7 12.0001 7C14.2092 7 16.0001 8.34315 16.0001 10C16.0001 11.3994 14.7224 12.5751 12.9943 12.9066C12.4519 13.0106 12.0001 13.4477 12.0001 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="17" r="1" fill="currentColor" />
  </svg>
);

/** Locked behavioral model of @ant-design/icons@4.8.0 custom Icon. */
export const LockedAnt48CustomIcon = ({
  className,
  onClick,
  style,
  tabIndex,
}: LockedAnt48IconProps) => (
  <span
    role="img"
    className={['anticon', className].filter(Boolean).join(' ')}
    onClick={onClick}
    style={style}
    tabIndex={tabIndex === undefined && onClick ? -1 : tabIndex}
  >
    <DeletedQuestionmarkcircleSvg />
  </span>
);

/** Exact shape of the deleted public wrapper: an ordinary non-ref-forwarding function. */
export const DeletedOutlineQuestionmarkcircleIcon = (props: LockedAnt48IconProps) => (
  <LockedAnt48CustomIcon {...props} />
);
