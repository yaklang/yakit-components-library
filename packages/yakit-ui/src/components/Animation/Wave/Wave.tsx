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
  const { wrapSSR, hashId, token } = useComponentStyle(prefixCls, WaveStyle);

  const classes = classNames(prefixCls, hashId, className, rootClassName);

  const showWave = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;

    const holder = document.createElement('div');
    holder.className = `${prefixCls}-holder ${hashId}`;

    const wave = document.createElement('div');
    wave.className = `${prefixCls}-effect ${hashId}`;

    holder.appendChild(wave);
    node.appendChild(holder);

    // 触发动画
    requestAnimationFrame(() => {
      wave.style.boxShadow = `0 0 0 8px ${token.colorPrimary}`;
      wave.style.opacity = '0';
    });

    // 动画结束自动删除
    wave.addEventListener('transitionend', () => {
      holder.remove();
    });
  }, [hashId, token.colorPrimary]);

  if (!isValidElement(children)) return children as ReactNode;

  return wrapSSR(
    cloneElement(children as ReactElement, {
      ref: nodeRef,
      className: classNames(children.props.className, classes),
      onClick: (e: MouseEvent<HTMLElement>) => {
        children.props.onClick?.(e);
      },
      onMouseDown: () => {
        if (animation === 'wave') showWave();
      },
      style: {
        ...children.props.style,
        position: 'relative',
        overflow: 'visible',
      },
    }),
  );
};

export default Wave;
