import classNames from 'classnames';
import {
  cloneElement,
  isValidElement,
  useRef,
  useCallback,
  useEffect,
  type FC,
  type ReactNode,
  type MouseEvent,
  type ReactElement,
  type KeyboardEvent,
  type Ref,
} from 'react';

import type { BaseProps } from '../../../types/common';

import './style/index.css';

export interface WaveProps extends BaseProps {
  children: ReactNode;
  className?: string;
  animation?: 'wave' | false;
}

const prefixCls = 'yakit-wave';

const assignRef = <T,>(ref: Ref<T> | undefined, value: T | null) => {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
};

export const Wave: FC<WaveProps> = ({ children, className, animation, rootClassName }) => {
  const nodeRef = useRef<HTMLElement | null>(null);
  const holderCleanupsRef = useRef<Map<HTMLElement, () => void>>(new Map());

  const classes = classNames(prefixCls, className, rootClassName);

  useEffect(
    () => () => {
      holderCleanupsRef.current.forEach((cleanup) => cleanup());
      holderCleanupsRef.current.clear();
    },
    [],
  );

  const showWave = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;

    const holder = document.createElement('div');
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;

    holder.style.width = `${rect.width}px`;
    holder.style.height = `${rect.height}px`;
    holder.style.left = `-${borderLeft}px`;
    holder.style.top = `-${borderTop}px`;
    holder.className = `${prefixCls}-holder`;

    const wave = document.createElement('div');
    wave.className = `${prefixCls}-effect`;

    holder.appendChild(wave);
    node.appendChild(holder);
    let animationFrame: number | undefined;
    let fallbackTimer: number | undefined;

    const cleanup = () => {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      holderCleanupsRef.current.delete(holder);
      holder.remove();
    };
    holderCleanupsRef.current.set(holder, cleanup);

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      cleanup();
      return;
    }

    // 触发动画
    animationFrame = requestAnimationFrame(() => {
      animationFrame = undefined;
      wave.style.boxShadow = '0 0 0 8px var(--wave-color)';
      wave.style.opacity = '0';
    });

    // 动画结束自动删除
    wave.addEventListener('transitionend', cleanup, { once: true });
    fallbackTimer = window.setTimeout(cleanup, 500);
  }, []);

  const childRef = isValidElement(children)
    ? (children as ReactElement & { ref?: Ref<HTMLElement> }).ref
    : undefined;
  const mergedRef = useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node;
      assignRef(childRef, node);
    },
    [childRef],
  );

  if (!isValidElement(children)) return children as ReactNode;

  const child = children as ReactElement & { ref?: Ref<HTMLElement> };

  return cloneElement(child, {
    ref: mergedRef,
    className: classNames(children.props.className, classes),
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
  });
};

export default Wave;
