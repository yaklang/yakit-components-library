import classNames from 'classnames';
import {
  cloneElement,
  isValidElement,
  useRef,
  useCallback,
  type FC,
  type ReactNode,
  type MouseEvent,
  type ReactElement,
  type KeyboardEvent,
} from 'react';

import useComponentStyle from '../../../hooks/useComponentStyle';
import type { BaseProps } from '../../../types/common';

import WaveStyle from './style';

export interface WaveProps extends BaseProps {
  children: ReactNode;
  className?: string;
  animation?: 'wave' | false;
}

const prefixCls = 'yakit-wave';

export const Wave: FC<WaveProps> = ({ children, className, animation, rootClassName }) => {
  const nodeRef = useRef<HTMLElement | null>(null);
  const { wrapSSR, hashId } = useComponentStyle(prefixCls, WaveStyle);

  const classes = classNames(prefixCls, hashId, className, rootClassName);

  const showWave = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;

    const holder = document.createElement('div');
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const borderTop = parseFloat(style.borderTopWidth);
    const borderWidth = parseFloat(style.borderLeftWidth);

    holder.style.width = `${rect.width}px`;
    holder.style.height = `${rect.height}px`;
    holder.style.left = `-${borderTop}px`;
    holder.style.top = `-${borderWidth}px`;
    holder.className = `${prefixCls}-holder ${hashId}`;

    const wave = document.createElement('div');
    wave.className = `${prefixCls}-effect ${hashId}`;

    holder.appendChild(wave);
    node.appendChild(holder);

    // 触发动画
    requestAnimationFrame(() => {
      wave.style.boxShadow = '0 0 0 8px var(--wave-color)';
      wave.style.opacity = '0';
    });

    // 动画结束自动删除
    wave.addEventListener('transitionend', () => {
      holder.remove();
    });
  }, [hashId]);

  if (!isValidElement(children)) return children as ReactNode;

  return wrapSSR(
    cloneElement(children as ReactElement, {
      ref: nodeRef,
      className: classNames(children.props.className, classes),
      onClick: (e: MouseEvent<HTMLElement>) => {
        children.props.onClick?.(e);
      },
      onMouseUp: (e: MouseEvent<HTMLElement>) => {
        children.props.onMouseUp?.(e);
        if (animation === 'wave') showWave();
      },
      onKeyUp: (e: KeyboardEvent<HTMLElement>) => {
        children.props.onKeyUp?.(e);
        if (animation === 'wave' && (e.key === 'Enter' || e.key === ' ')) {
          showWave();
        }
      },
      style: children.props.style,
    }),
  );
};

export default Wave;
