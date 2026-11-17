import {
  CheckOutlined,
  DocumentDuplicateOutlined,
  LoadingOutlined,
} from '@yakit-libs/yakit-ui-icons/outline';
import classNames from 'classnames';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import { getYakitTokenVariables } from '../../styles/tokenVariables';
import type { YakitCSSProperties } from '../../styles/tokenVariables';

import type { TagCopyProps } from './type';

const prefixCls = 'yakit-tag';
/** 最短 loading 可见时间（ms） */
const LOADING_MIN_MS = 400;
/** 成功对勾展示时长（ms） */
const SUCCESS_MS = 1600;

async function writeClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // legacy fallback below
  }
  if (typeof document === 'undefined') return false;
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    // 老版 iOS Safari 上 select() 不完全生效，补 setSelectionRange 全选（copy-to-clipboard 同款加固）。
    el.setSelectionRange(0, el.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

const ICON_PX: Record<NonNullable<TagCopyProps['size']>, number> = {
  small: 10,
  medium: 12,
  large: 14,
};

/**
 * 复制按钮（Tag 内嵌或独立使用）。成功仅做图标反馈；业务提示请用 `onCopy`。
 * 独立使用默认主色；`color` 可传 CSS 色值。嵌在 Tag 内传 `currentColor` 跟随文字色。
 */
export const TagCopy = memo(function TagCopy({
  className,
  copyText,
  color = 'primary',
  size,
  onCopy,
  disabled: disabledProp,
}: TagCopyProps) {
  const config = useYakitConfig();
  const disabled = disabledProp ?? config.componentDisabled ?? false;
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const timerRef = useRef<number | null>(null);
  /** 同步互斥，避免同 tick 连点仅靠 phase 挡不住 */
  const lockingRef = useRef(false);
  const mountedRef = useRef(true);

  const resetTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      resetTimer();
      lockingRef.current = false;
    };
  }, [resetTimer]);

  const handleClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();
      if (disabled || !copyText || lockingRef.current || phaseRef.current === 'loading') return;

      lockingRef.current = true;
      resetTimer();
      setPhase('loading');
      const started = Date.now();
      const ok = await writeClipboard(copyText);
      if (!mountedRef.current) {
        lockingRef.current = false;
        return;
      }
      const elapsed = Date.now() - started;
      if (elapsed < LOADING_MIN_MS) {
        await new Promise<void>((resolve) => {
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            resolve();
          }, LOADING_MIN_MS - elapsed);
        });
        if (!mountedRef.current) {
          lockingRef.current = false;
          return;
        }
      }
      onCopy?.(e, { text: copyText, ok });

      if (!ok) {
        setPhase('idle');
        lockingRef.current = false;
        return;
      }

      setPhase('done');
      timerRef.current = window.setTimeout(() => {
        if (mountedRef.current) setPhase('idle');
        lockingRef.current = false;
        timerRef.current = null;
      }, SUCCESS_MS);
    },
    [copyText, disabled, onCopy, resetTimer],
  );

  // 独立默认 primary；Tag 内嵌传 currentColor；其它值为任意 CSS 色。
  const resolvedColor = color ?? 'primary';
  const inheritTone = resolvedColor === 'currentColor' || resolvedColor === 'inherit';
  const usePrimary = !inheritTone && resolvedColor === 'primary';
  const customCss = !inheritTone && !usePrimary ? resolvedColor : undefined;

  const toneColor = 'currentColor';
  const iconPx = size ? ICON_PX[size] : 12;

  let icon: ReactNode;
  if (phase === 'loading') {
    icon = <LoadingOutlined spin size={iconPx} color={toneColor} aria-hidden />;
  } else if (phase === 'done') {
    icon = (
      <CheckOutlined
        color="var(--Colors-Use-Success-Primary, var(--yakit-color-success))"
        aria-hidden
      />
    );
  } else {
    icon = <DocumentDuplicateOutlined color={toneColor} aria-hidden />;
  }

  const buttonStyle = useMemo((): YakitCSSProperties | undefined => {
    if (inheritTone) return undefined;
    if (usePrimary) {
      return {
        ...getYakitTokenVariables(config.token),
        '--yakit-tag-color-base': 'var(--yakit-color-primary)',
        color: 'var(--yakit-color-primary)',
      };
    }
    return { color: customCss };
  }, [inheritTone, usePrimary, config.token, customCss]);

  return (
    <button
      type="button"
      data-theme={config.mode}
      className={classNames(
        `${prefixCls}-copy`,
        usePrimary && `${prefixCls}-color-primary`,
        !inheritTone && `${prefixCls}-copy-colored`,
        size === 'small' && `${prefixCls}-copy-sm`,
        size === 'medium' && `${prefixCls}-copy-md`,
        size === 'large' && `${prefixCls}-copy-lg`,
        className,
      )}
      style={buttonStyle}
      aria-label={config.locale.Tag?.copy ?? '复制'}
      disabled={disabled || !copyText}
      onClick={handleClick}
    >
      {icon}
    </button>
  );
});
TagCopy.displayName = 'TagCopy';
