import classNames from 'classnames';
import {
  forwardRef,
  memo,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import useIsomorphicLayoutEffect from '../../hooks/useIsomorphicLayoutEffect';
import useYakitConfig from '../../hooks/useYakitConfig';
import { getYakitTokenVariables } from '../../styles/tokenVariables';
import type { YakitCSSProperties } from '../../styles/tokenVariables';

import './style/index.css';
import type { CollapseTextProps, CollapseTextRef } from './type';

const prefixCls = 'yakit-collapse-text';
const DEFAULT_ROWS = 3;
const DEFAULT_LINE_HEIGHT = 16;
const DEFAULT_FONT_SIZE = 12;

const clampPositive = (value: number | undefined, fallback: number) => {
  if (value == null || Number.isNaN(value) || value <= 0) return fallback;
  return value;
};

export const CollapseText = memo(
  forwardRef<CollapseTextRef, CollapseTextProps>(function CollapseText(
    {
      content,
      rows = DEFAULT_ROWS,
      lineHeight = DEFAULT_LINE_HEIGHT,
      fontSize = DEFAULT_FONT_SIZE,
      wrapperClassName,
      className,
      rootClassName,
      style,
    },
    ref,
  ) {
    const config = useYakitConfig();
    const textRef = useRef<HTMLDivElement>(null);
    const contentId = useId();
    const resolvedRows = clampPositive(rows, DEFAULT_ROWS);
    const resolvedLineHeight = clampPositive(lineHeight, DEFAULT_LINE_HEIGHT);
    const resolvedFontSize = clampPositive(fontSize, DEFAULT_FONT_SIZE);
    const collapsedMaxHeight = resolvedRows * resolvedLineHeight;

    const [showExpand, setShowExpand] = useState(false);
    const [isExpand, setIsExpand] = useState(false);

    const measure = useCallback(() => {
      const el = textRef.current;
      if (!el) return;
      if (el.clientWidth === 0 && el.scrollHeight === 0) return;
      const overflows = el.scrollHeight > collapsedMaxHeight + 0.5;
      setShowExpand(overflows);
      if (!overflows) setIsExpand(false);
    }, [collapsedMaxHeight]);

    useIsomorphicLayoutEffect(() => {
      measure();
      const el = textRef.current;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => measure());
      observer.observe(el);
      return () => observer.disconnect();
    }, [measure, content, resolvedFontSize]);

    const textStyle = useMemo(
      (): CSSProperties => ({
        fontSize: `${resolvedFontSize}px`,
        lineHeight: `${resolvedLineHeight}px`,
        maxHeight: isExpand ? undefined : `${collapsedMaxHeight}px`,
      }),
      [resolvedFontSize, resolvedLineHeight, collapsedMaxHeight, isExpand],
    );

    const rootStyle = useMemo(
      (): YakitCSSProperties => ({
        ...getYakitTokenVariables(config.token),
        ...style,
      }),
      [config.token, style],
    );

    const locale = config.locale.CollapseText;
    const expandLabel = locale?.expand ?? '展开';
    const collapseLabel = locale?.collapse ?? '收起';

    const onToggle = useCallback(() => {
      setIsExpand((value) => !value);
    }, []);

    return (
      <div
        ref={ref}
        data-theme={config.mode}
        className={classNames(prefixCls, className, rootClassName, wrapperClassName)}
        style={rootStyle}
      >
        <div id={contentId} ref={textRef} className={`${prefixCls}-content`} style={textStyle}>
          {content}
        </div>
        {showExpand ? (
          <button
            type="button"
            className={`${prefixCls}-action`}
            onClick={onToggle}
            title={content}
            aria-expanded={isExpand}
            aria-controls={contentId}
          >
            {isExpand ? collapseLabel : expandLabel}
          </button>
        ) : null}
      </div>
    );
  }),
);

CollapseText.displayName = 'CollapseText';
