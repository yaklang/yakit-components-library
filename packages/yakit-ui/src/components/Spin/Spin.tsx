import classNames from 'classnames';
import {
  Children,
  cloneElement,
  forwardRef,
  Fragment,
  isValidElement,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import useYakitConfig from '../../hooks/useYakitConfig';
import { getYakitTokenVariables } from '../../styles/tokenVariables';
import type { YakitCSSProperties } from '../../styles/tokenVariables';

import { useDelayedSpinning } from './hooks/useDelayedSpinning';
import { isViewportContainer, useSpinContainer } from './hooks/useSpinContainer';
import './style/index.css';
import type { SpinIndicator, SpinProps, SpinRef, SpinSize } from './type';

const prefixCls = 'yakit-spin';

const indicatorSizeBySpin: Record<SpinSize, number> = {
  small: 14,
  medium: 20,
  large: 32,
};

const hasRenderableNode = (value: ReactNode): boolean => {
  if (value == null || value === false || value === '') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(hasRenderableNode);
  }

  if (isValidElement(value) && value.type === Fragment) {
    return hasRenderableNode((value.props as { children?: ReactNode }).children);
  }

  return true;
};

const DefaultIndicator = () => (
  <span className={`${prefixCls}-dot-holder`}>
    <span className={classNames(`${prefixCls}-dot`, `${prefixCls}-dot-spin`)}>
      <i className={`${prefixCls}-dot-item`} />
      <i className={`${prefixCls}-dot-item`} />
      <i className={`${prefixCls}-dot-item`} />
      <i className={`${prefixCls}-dot-item`} />
    </span>
  </span>
);

const isYakitIconType = (type: ReactElement['type']) =>
  typeof type !== 'string' && (type as { isYakitIcon?: boolean }).isYakitIcon === true;

const decorateIndicator = (indicator: ReactElement, size: SpinSize) => {
  const element = indicator as ReactElement<{
    className?: string;
    color?: string;
    size?: number | string;
  }>;
  const isYakitIcon = isYakitIconType(element.type);
  return cloneElement(element, {
    className: classNames(element.props.className, `${prefixCls}-custom`),
    ...(isYakitIcon && element.props.color == null ? { color: 'currentColor' } : null),
    ...(isYakitIcon && element.props.size == null ? { size: indicatorSizeBySpin[size] } : null),
  });
};

const renderIndicator = (indicator: SpinIndicator | undefined, size: SpinSize) => {
  // 显式传 null 或空片段都可以藏掉默认圆点，同时保留遮罩。
  if (indicator === null) {
    return null;
  }

  if (!indicator || !isValidElement(indicator)) {
    return <DefaultIndicator />;
  }

  // 空片段用来藏掉默认圆点。片段里如果有真实节点，则作为自定义指示器渲染。
  // 不要往 Fragment 上抄 className，避免控制台警告。
  if (indicator.type === Fragment) {
    const items = Children.toArray((indicator.props as { children?: ReactNode }).children).filter(
      (child) => typeof child !== 'string' || child.trim() !== '',
    );

    if (items.length === 0) {
      return null;
    }

    return items.map((child) => (isValidElement(child) ? decorateIndicator(child, size) : child));
  }

  return decorateIndicator(indicator, size);
};

export const Spin = forwardRef<SpinRef, SpinProps>(
  (
    {
      className,
      rootClassName,
      style,
      children,
      tip,
      spinning: spinningProp = true,
      size = 'medium',
      delay = 0,
      indicator,
      getContainer,
    },
    ref,
  ) => {
    const config = useYakitConfig();
    const spinning = useDelayedSpinning(spinningProp, delay);
    const hasChildren = hasRenderableNode(children);
    const containerTarget = useSpinContainer(getContainer);
    const portaled = getContainer != null;
    const nestForHint = !portaled && !hasChildren && hasRenderableNode(tip);
    const resolvedChildren = nestForHint ? (
      <div className={`${prefixCls}-nest`} />
    ) : hasChildren ? (
      children
    ) : undefined;
    const nested = !portaled && resolvedChildren !== undefined;

    const classes = useMemo(
      () =>
        classNames(
          prefixCls,
          `${prefixCls}-${size}`,
          {
            [`${prefixCls}-spinning`]: spinning,
            [`${prefixCls}-nested`]: nested,
            [`${prefixCls}-portal`]: portaled,
            [`${prefixCls}-viewport`]:
              portaled && containerTarget != null && isViewportContainer(containerTarget),
          },
          className,
          rootClassName,
        ),
      [size, spinning, nested, portaled, containerTarget, className, rootClassName],
    );

    const indicatorElement = useMemo(() => renderIndicator(indicator, size), [indicator, size]);

    const indicatorNode = (
      <>
        {indicatorElement}
        {hasRenderableNode(tip) ? <div className={`${prefixCls}-tip`}>{tip}</div> : null}
      </>
    );

    const root = (
      <div
        ref={ref}
        className={classes}
        style={
          {
            ...getYakitTokenVariables(config.token),
            ...style,
          } as YakitCSSProperties
        }
        data-theme={config.mode}
        dir={config.direction}
        aria-live="polite"
        aria-busy={spinning}
      >
        {spinning ? (
          !portaled && nested ? (
            <div className={`${prefixCls}-section`}>{indicatorNode}</div>
          ) : (
            indicatorNode
          )
        ) : null}
        {!portaled && resolvedChildren !== undefined ? (
          <div className={`${prefixCls}-container`}>{resolvedChildren}</div>
        ) : null}
      </div>
    );

    if (portaled) {
      return (
        <>
          {hasChildren ? children : null}
          {containerTarget ? createPortal(root, containerTarget) : null}
        </>
      );
    }

    return root;
  },
);

Spin.displayName = 'Spin';
