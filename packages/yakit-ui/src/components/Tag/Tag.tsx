import { XOutlined } from '@yakit-libs/yakit-ui-icons';
import classNames from 'classnames';
import {
  cloneElement,
  isValidElement,
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import { getYakitTokenVariables } from '../../styles/tokenVariables';
import type { YakitCSSProperties } from '../../styles/tokenVariables';
import { returnOrFalse } from '../../utils';

import { TagCopy } from './TagCopy';
import './style/index.css';
import type {
  CheckableTagGroupProps,
  CheckableTagOption,
  CheckableTagProps,
  CheckableTagValue,
  TagCopyProps,
  TagColor,
  TagProps,
  TagSize,
  TagVariant,
} from './type';

const prefixCls = 'yakit-tag';

/**
 * Outline 图标默认多为 Neutral Title 灰色；Tag 内图标应跟随标签文字色。
 * 若节点未显式传入 `color`，则注入 `color="currentColor"`，使图标继承 Tag 文本色。
 */
const withInheritedIconColor = (node: ReactNode): ReactNode => {
  if (!isValidElement(node)) return node;
  const el = node as ReactElement<{ color?: string }>;
  if (el.props.color != null && String(el.props.color).trim() !== '') return el;
  return cloneElement(el, { color: 'currentColor' });
};

/** 抽取可展示纯文本（string/number）；复杂节点返回 undefined（ellipsis title 用）。 */
const plainTextTitle = (node: ReactNode): string | undefined => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return undefined;
};

/** 递归抽取节点文案，供复制默认内容（忽略纯空白）。 */
const collectPlainText = (node: ReactNode): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectPlainText).join('');
  if (isValidElement(node)) {
    return collectPlainText((node.props as { children?: ReactNode }).children);
  }
  return '';
};

/** 亚像素安全的截断检测（`scrollWidth > clientWidth`）。 */
const isTruncated = (el: HTMLElement | null): boolean =>
  el != null && el.scrollWidth > el.clientWidth + 0.5;

/**
 * 节点是否会渲染出可见内容（对齐 React 渲染语义，而非 falsy）：
 * null / undefined / boolean（条件渲染哨兵）/ '' / 空数组不渲染任何内容；
 * `0` / `NaN` 会渲染为文本，视为有内容。
 */
const isRenderableContent = (node: ReactNode): boolean => {
  if (node == null || node === '' || typeof node === 'boolean') return false;
  if (Array.isArray(node) && node.length === 0) return false;
  return true;
};

const normalizeSize = (
  size: TagSize | 'huge' | undefined,
  fallback: TagSize = 'medium',
): TagSize => {
  const resolved = size ?? fallback;
  if (resolved === 'huge') return 'large';
  return resolved;
};

const normalizeColor = (color: TagColor | undefined): TagColor => {
  if (!color) return 'default';
  return color;
};

const resolveVariant = (
  variant: TagVariant | undefined,
  bordered: boolean | undefined,
): TagVariant => {
  if (variant) return variant;
  if (bordered === false) return 'borderless';
  return 'soft';
};

const TagInternal = memo(function TagInternal({
  size: sizeProp,
  color: colorProp = 'default',
  variant: variantProp,
  bordered = true,
  shape = 'default',
  icon,
  avatar,
  dot = false,
  extra,
  closable = false,
  closeIcon,
  onClose,
  copy = false,
  onCopy,
  onClick,
  checkable = false,
  checked: checkedProp,
  defaultChecked = false,
  onChange,
  ellipsis = false,
  disabled: disabledProp,
  children,
  className,
  rootClassName,
  style,
  'aria-label': ariaLabel,
}: TagProps) {
  const config = useYakitConfig();
  const size = normalizeSize(sizeProp ?? (config.componentSize as TagSize | 'huge' | undefined));
  const disabled = disabledProp ?? config.componentDisabled ?? false;
  const tagToken = config.token.YakitTag;
  const color = normalizeColor(colorProp);
  // 有 extra → 分栏；按 React 是否渲染出内容判定（0 渲染 "0" 仍分栏；false / true / '' / 空数组不渲染，视为单段）
  const hasExtra = isRenderableContent(extra);
  // 分栏（extra）仅对齐 Figma soft：左软底 + 右白底；忽略 solid / borderless / bordered→borderless
  let variant: TagVariant = hasExtra ? 'soft' : resolveVariant(variantProp, bordered);
  // 可选择仅支持 soft / borderless；solid（或其它非法值）回落为 borderless
  if (checkable && variant === 'solid') {
    variant = 'borderless';
  }
  const showBorder = variant === 'soft' && bordered !== false;
  const clickable = Boolean(onClick) && !checkable;

  const [visible, setVisible] = useState(true);
  const isCheckedControlled = checkedProp !== undefined;
  const [innerChecked, setInnerChecked] = useState(defaultChecked);
  const checked = isCheckedControlled ? Boolean(checkedProp) : innerChecked;

  const copyEnabled = copy === true || (typeof copy === 'object' && copy != null);
  const copyTextFromProp =
    typeof copy === 'object' && copy != null && copy.text != null && copy.text !== ''
      ? copy.text
      : undefined;
  // 无可渲染 children 且 copy 带 text：用 text 作为展示
  const resolvedChildren = isRenderableContent(children)
    ? children
    : copyEnabled && copyTextFromProp != null
      ? copyTextFromProp
      : children;
  // 自定义 copy.text 优先；否则默认复制 children 纯文本（仅开启 copy 时收集）
  const resolvedCopyText = useMemo(() => {
    if (!copyEnabled) return '';
    if (copyTextFromProp != null) return copyTextFromProp;
    return collectPlainText(resolvedChildren).trim();
  }, [copyEnabled, copyTextFromProp, resolvedChildren]);
  const isIconOnly = Boolean((icon || avatar) && !isRenderableContent(resolvedChildren) && !dot);
  const showClose =
    closable || closeIcon === true || (closeIcon !== undefined && closeIcon !== false);
  const showCopy = copyEnabled;

  const classes = classNames(
    prefixCls,
    {
      [`${prefixCls}-${size}`]: size,
      [`${prefixCls}-${shape}`]: returnOrFalse(shape),
      [`${prefixCls}-color-${color}`]: color,
      [`${prefixCls}-${variant}`]: variant,
      [`${prefixCls}-bordered`]: showBorder,
      [`${prefixCls}-borderless`]: !showBorder && variant !== 'solid',
      [`${prefixCls}-disabled`]: disabled,
      [`${prefixCls}-checkable`]: checkable,
      [`${prefixCls}-checked`]: checkable && checked,
      [`${prefixCls}-clickable`]: clickable && !disabled,
      [`${prefixCls}-icon-only`]: isIconOnly,
      [`${prefixCls}-closable`]: showClose,
      [`${prefixCls}-has-copy`]: showCopy,
      [`${prefixCls}-has-dot`]: dot,
      [`${prefixCls}-has-avatar`]: Boolean(avatar),
      [`${prefixCls}-has-icon`]: Boolean(icon),
      [`${prefixCls}-ellipsis`]: ellipsis,
      [`${prefixCls}-split`]: hasExtra,
    },
    className,
    rootClassName,
  );

  const handleClose = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      if (disabled) return;
      onClose?.(e);
      if (!e.defaultPrevented) {
        setVisible(false);
      }
    },
    [disabled, onClose],
  );

  const toggleChecked = useCallback(() => {
    if (disabled || !checkable) return;
    const next = !checked;
    if (!isCheckedControlled) setInnerChecked(next);
    onChange?.(next);
  }, [disabled, checkable, checked, isCheckedControlled, onChange]);

  const activateCheckable = useCallback(
    (e: MouseEvent<HTMLSpanElement> | KeyboardEvent<HTMLSpanElement>) => {
      toggleChecked();
      onClick?.(e as MouseEvent<HTMLSpanElement>);
    },
    [toggleChecked, onClick],
  );

  const handleClick = useCallback(
    (e: MouseEvent<HTMLSpanElement>) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      if (checkable) {
        activateCheckable(e);
        return;
      }
      onClick?.(e);
    },
    [disabled, checkable, activateCheckable, onClick],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLSpanElement>) => {
      // 忽略 close / TagCopy 等内嵌按钮冒泡上来的键事件
      if (disabled || e.target !== e.currentTarget) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (checkable) {
        e.preventDefault();
        activateCheckable(e);
        return;
      }
      if (clickable) {
        e.preventDefault();
        onClick?.(e as unknown as MouseEvent<HTMLSpanElement>);
      }
    },
    [checkable, clickable, disabled, activateCheckable, onClick],
  );

  const closeIconNode = showClose ? (
    closeIcon && closeIcon !== true ? (
      closeIcon
    ) : (
      <XOutlined color="currentColor" />
    )
  ) : null;

  const closeButton = showClose ? (
    <button
      type="button"
      className={`${prefixCls}-close`}
      aria-label={config.locale.Tag?.close ?? '关闭'}
      disabled={disabled}
      onClick={handleClose}
    >
      {closeIconNode}
    </button>
  ) : null;

  const copyButton = showCopy ? (
    <TagCopy
      copyText={resolvedCopyText}
      color="currentColor"
      onCopy={onCopy}
      disabled={disabled}
      size={size}
    />
  ) : null;

  const rootRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const extraContentRef = useRef<HTMLSpanElement>(null);
  const [contentTitle, setContentTitle] = useState<string | undefined>();
  const [extraTitle, setExtraTitle] = useState<string | undefined>();

  const childrenPlain = useMemo(() => plainTextTitle(resolvedChildren), [resolvedChildren]);
  const extraPlain = useMemo(
    () => (hasExtra ? plainTextTitle(extra) : undefined),
    [hasExtra, extra],
  );
  const styleMaxWidth = style?.maxWidth;

  // 仅在开启 ellipsis 且文本节点实际被截断时挂载原生 `title`。
  // 单例 ResizeObserver；rAF 合并；title 未变跳过 setState；同时观察 root，避免仅祖先约束变窄时 content 不触发回调。
  useLayoutEffect(() => {
    if (!ellipsis) {
      setContentTitle(undefined);
      setExtraTitle(undefined);
      return;
    }

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nextContent =
          childrenPlain && isTruncated(contentRef.current) ? childrenPlain : undefined;
        const nextExtra =
          extraPlain && isTruncated(extraContentRef.current) ? extraPlain : undefined;
        setContentTitle((prev) => (prev === nextContent ? prev : nextContent));
        setExtraTitle((prev) => (prev === nextExtra ? prev : nextExtra));
      });
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      return () => cancelAnimationFrame(raf);
    }

    const ro = new ResizeObserver(update);
    if (rootRef.current) ro.observe(rootRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    if (hasExtra && extraContentRef.current) ro.observe(extraContentRef.current);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [ellipsis, childrenPlain, extraPlain, size, styleMaxWidth, hasExtra]);

  const cssStyle = useMemo(
    () =>
      ({
        ...getYakitTokenVariables(config.token),
        '--yakit-tag-border-radius-lg': tagToken?.borderRadiusLG,
        '--yakit-tag-border-radius-md': tagToken?.borderRadiusMD,
        '--yakit-tag-border-radius-sm': tagToken?.borderRadiusSM,
        '--yakit-tag-padding-lg': tagToken?.paddingLG,
        '--yakit-tag-padding-md': tagToken?.paddingMD,
        '--yakit-tag-padding-sm': tagToken?.paddingSM,
        '--yakit-tag-font-size-lg': tagToken?.fontSizeLG,
        '--yakit-tag-font-size-md': tagToken?.fontSizeMD,
        '--yakit-tag-font-size-sm': tagToken?.fontSizeSM,
        '--yakit-tag-icon-gap': tagToken?.iconGap,
        ...style,
      }) as YakitCSSProperties,
    [config.token, tagToken, style],
  );

  const iconNode = useMemo(() => (icon ? withInheritedIconColor(icon) : null), [icon]);

  const mainNodes = (
    <>
      {dot ? <span className={`${prefixCls}-dot`} aria-hidden="true" /> : null}
      {avatar ? <span className={`${prefixCls}-avatar`}>{avatar}</span> : null}
      {iconNode ? <span className={`${prefixCls}-icon`}>{iconNode}</span> : null}
      {isRenderableContent(resolvedChildren) ? (
        <span ref={contentRef} className={`${prefixCls}-content`} title={contentTitle}>
          {resolvedChildren}
        </span>
      ) : null}
    </>
  );

  if (!visible) return null;

  return (
    <span
      ref={rootRef}
      className={classes}
      data-theme={config.mode}
      dir={config.direction}
      role={checkable ? 'checkbox' : clickable ? 'button' : undefined}
      aria-checked={checkable ? checked : undefined}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      tabIndex={(checkable || clickable) && !disabled ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={cssStyle}
    >
      {hasExtra ? (
        <>
          <span className={`${prefixCls}-main`}>{mainNodes}</span>
          <span className={`${prefixCls}-divider`} aria-hidden="true" />
          <span className={`${prefixCls}-extra`}>
            <span ref={extraContentRef} className={`${prefixCls}-extra-content`} title={extraTitle}>
              {extra}
            </span>
            {copyButton}
            {closeButton}
          </span>
        </>
      ) : (
        <>
          {mainNodes}
          {copyButton}
          {closeButton}
        </>
      )}
    </span>
  );
});
TagInternal.displayName = 'Tag';

/**
 * 对齐 antd `Tag.CheckableTag`：完全受控的可选择标签（类似 Checkbox）。
 * 等价于 `<Tag checkable checked onChange />`；不支持非受控用法。
 */
export const CheckableTag = memo(function CheckableTag({
  checked,
  onChange,
  ...rest
}: CheckableTagProps) {
  return <TagInternal checkable checked={checked} onChange={onChange} {...rest} />;
});
CheckableTag.displayName = 'CheckableTag';

function isPlainOptionObject(option: unknown): option is CheckableTagOption<CheckableTagValue> {
  return (
    typeof option === 'object' &&
    option != null &&
    !Array.isArray(option) &&
    'value' in (option as object)
  );
}

/**
 * 对齐 antd `Tag.CheckableTagGroup`：选项组，类似 CheckboxGroup / RadioGroup。
 * - `multiple`：多选，`value` / `onChange` 为数组
 * - 默认单选，再次点击可取消为 `null`
 */

type CheckableTagGroupItemProps<T extends CheckableTagValue> = {
  value: T;
  label: ReactNode;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  color: TagColor;
  checked: boolean;
  onItemChange: (value: T, checked: boolean) => void;
};

const CheckableTagGroupItem = memo(function CheckableTagGroupItem<T extends CheckableTagValue>({
  value,
  label,
  className,
  style,
  disabled,
  color,
  checked,
  onItemChange,
}: CheckableTagGroupItemProps<T>) {
  const onChange = useCallback(
    (next: boolean) => {
      onItemChange(value, next);
    },
    [onItemChange, value],
  );

  return (
    <CheckableTag
      className={className}
      style={style}
      checked={checked}
      disabled={disabled}
      color={color}
      variant="borderless"
      onChange={onChange}
    >
      {label}
    </CheckableTag>
  );
}) as <T extends CheckableTagValue>(props: CheckableTagGroupItemProps<T>) => ReactElement;

export const CheckableTagGroup = <T extends CheckableTagValue = CheckableTagValue>({
  options,
  color,
  disabled: disabledProp,
  className,
  rootClassName,
  style,
  id,
  multiple,
  value,
  defaultValue,
  onChange,
}: CheckableTagGroupProps<T>) => {
  const config = useYakitConfig();
  const disabled = disabledProp ?? config.componentDisabled ?? false;
  const groupPrefix = `${prefixCls}-checkable-group`;
  const isControlled = value !== undefined;
  const [innerValue, setInnerValue] = useState<T | T[] | null | undefined>(defaultValue);
  const mergedValue = isControlled ? value : innerValue;
  const mergedValueRef = useRef(mergedValue);
  mergedValueRef.current = mergedValue;

  const parsedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [] as CheckableTagOption<T>[];
    return options.map((option) => {
      if (isPlainOptionObject(option)) {
        return option as CheckableTagOption<T>;
      }
      return { value: option as T, label: option as ReactNode };
    });
  }, [options]);

  const setValue = useCallback(
    (next: T | T[] | null) => {
      if (!isControlled) setInnerValue(next);
      // antd 泛型在运行时同样直传
      (onChange as ((v: T | T[] | null) => void) | undefined)?.(next);
    },
    [isControlled, onChange],
  );

  const handleItemChange = useCallback(
    (optionValue: T, checked: boolean) => {
      const option = parsedOptions.find((item) => item.value === optionValue);
      if (!option || disabled || option.disabled) return;
      if (multiple) {
        const current = mergedValueRef.current;
        const list = Array.isArray(current) ? [...current] : [];
        const next = checked
          ? list.includes(option.value)
            ? list
            : [...list, option.value]
          : list.filter((item) => item !== option.value);
        setValue(next);
        return;
      }
      setValue(checked ? option.value : null);
    },
    [parsedOptions, disabled, multiple, setValue],
  );

  const isChecked = useCallback(
    (optionValue: T): boolean => {
      if (multiple) {
        return Array.isArray(mergedValue) && mergedValue.includes(optionValue);
      }
      return mergedValue === optionValue;
    },
    [multiple, mergedValue],
  );

  return (
    <div
      id={id}
      className={classNames(
        groupPrefix,
        { [`${groupPrefix}-disabled`]: disabled },
        className,
        rootClassName,
      )}
      style={style}
      role="group"
      aria-disabled={disabled || undefined}
    >
      {parsedOptions.map((option) => (
        <CheckableTagGroupItem
          key={String(option.value)}
          value={option.value}
          label={option.label}
          className={classNames(`${groupPrefix}-item`, option.className)}
          style={option.style}
          checked={isChecked(option.value)}
          disabled={disabled || !!option.disabled}
          color={option.color ?? color ?? 'primary'}
          onItemChange={handleItemChange}
        />
      ))}
    </div>
  );
};

export type TagType = ((props: TagProps) => ReactElement | null) & {
  CheckableTag: typeof CheckableTag;
  CheckableTagGroup: typeof CheckableTagGroup;
  TagCopy: typeof TagCopy;
};

export const Tag = TagInternal as unknown as TagType;
Tag.CheckableTag = CheckableTag;
Tag.CheckableTagGroup = CheckableTagGroup;
Tag.TagCopy = TagCopy;

export { TagCopy };
export type { TagCopyProps };
