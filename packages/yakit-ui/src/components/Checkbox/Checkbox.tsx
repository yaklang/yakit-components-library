import { CheckOutlined } from '@yakit-libs/yakit-ui-icons';
import classNames from 'classnames';
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import { getYakitTokenVariables, type YakitCSSProperties } from '../../styles/tokenVariables';

import { useCheckboxGroup } from './GroupContext';
import './style/index.css';
import type { CheckboxNativeChangeEvent, CheckboxProps, CheckboxRef, CheckboxSize } from './type';

const prefixCls = 'yakit-checkbox';

const normalizeSize = (
  size: CheckboxSize | undefined,
  componentSize: string | undefined,
): 'medium' | 'large' => {
  if (size === 'large') return 'large';
  if (size === 'medium') return 'medium';
  if (componentSize === 'large' || componentSize === 'huge') return 'large';
  return 'medium';
};

/** Figma 勾选图标约占方框 75%（内缩约 12.5%） */
const iconSizeFor = (size: 'medium' | 'large') => (size === 'large' ? 15 : 12);

const IndeterminateIcon = () => (
  <span aria-hidden="true" className={`${prefixCls}-indeterminate-mark`} />
);

const CheckboxInner = forwardRef<CheckboxRef, CheckboxProps>(function Checkbox(
  {
    size: sizeProp,
    checked: checkedProp,
    defaultChecked = false,
    indeterminate = false,
    disabled: disabledProp,
    value: valueProp,
    children,
    description,
    className,
    rootClassName,
    style,
    id,
    name: nameProp,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedby,
    'aria-labelledby': ariaLabelledby,
    title,
    onChange,
    onClick,
    form: formAttr,
    ...rest
  },
  ref,
) {
  const config = useYakitConfig();
  const group = useCheckboxGroup();
  const size = normalizeSize(sizeProp, config.componentSize);

  /**
   * 参与 Group 组控：在 context 中 + 有 value + 收到了注入的 checked。
   * Group 对每个接管的子项（直接 / Fragment 子节点）必然注入布尔 checked（见 Group.tsx mapGroupChildren），
   * 因此「有 value 却没收到 checked」即深层包装——保持独立 Checkbox 行为（dev 下有警告）。
   */
  const inGroup = Boolean(group) && valueProp !== undefined && checkedProp !== undefined;
  const disabled = disabledProp ?? group?.disabled ?? config.componentDisabled;
  const name = nameProp ?? (inGroup ? group?.name : undefined);
  const checkboxToken = config.token.YakitCheckbox;

  const inputRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const inputId = id ?? autoId;
  const labelTextId = `${inputId}-label`;
  const descriptionId = `${inputId}-desc`;

  const isSelfControlled = checkedProp !== undefined;
  const [innerChecked, setInnerChecked] = useState(defaultChecked);

  /** Group 会为 options / 带 value 的子项注入 checked；不再从 group.value 读取 */
  const checked = inGroup
    ? Boolean(checkedProp)
    : isSelfControlled
      ? Boolean(checkedProp)
      : innerChecked;

  /** 在 context 中、有 value、却未收到注入 checked：深层包装，dev 下提醒一次改写法 */
  const isDeepWrappedInGroup = Boolean(group) && valueProp !== undefined && !inGroup;
  const deepWrapWarnedRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV || !isDeepWrappedInGroup || deepWrapWarnedRef.current) {
      return;
    }
    deepWrapWarnedRef.current = true;
    console.warn(
      `yakit-ui Checkbox: value 为 ${String(valueProp)} 的 Checkbox 在 Checkbox.Group 中被深层包装，` +
        '已按独立 Checkbox 处理（选中不进入 Group 的 value）。' +
        '请将其作为 Group 的直接子节点 / Fragment 子节点，或改用 Group 的 options 传入。',
    );
  }, [isDeepWrappedInGroup, valueProp]);

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate && !checked;
    }
  }, [indeterminate, checked]);

  /** 非受控 + 非组内：跟随所属 form 的 reset（对齐 Input） */
  useEffect(() => {
    const input = inputRef.current;
    const form = input?.form;
    if (!form || isSelfControlled || inGroup) return;
    const reset = () => setInnerChecked(defaultChecked);
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, [isSelfControlled, inGroup, defaultChecked, formAttr]);

  const toggleOption = group?.toggleOption;

  const handleChange = useCallback(
    (native: CheckboxNativeChangeEvent) => {
      if (disabled) return;
      const next = native.target.checked;
      let prevented = false;
      onChange?.({
        target: {
          type: 'checkbox',
          checked: next,
          ...(valueProp !== undefined ? { value: valueProp } : {}),
        },
        stopPropagation: () => native.stopPropagation(),
        preventDefault: () => {
          prevented = true;
          native.preventDefault();
        },
        nativeEvent: native.nativeEvent,
      });
      if (prevented || native.defaultPrevented) return;
      if (!inGroup && !isSelfControlled) setInnerChecked(next);
      if (inGroup && valueProp !== undefined) {
        toggleOption?.(valueProp);
      }
    },
    [disabled, inGroup, isSelfControlled, onChange, toggleOption, valueProp],
  );

  const showIndeterminate = indeterminate && !checked;
  const hasContent = children != null && children !== false && children !== '';
  const hasDescription = description != null && description !== false && description !== '';

  /** 有主/副文案或显式 aria-label 时，不用 locale 半选文案盖掉无障碍名 */
  const resolvedAriaLabel =
    ariaLabel ??
    (!hasContent && !hasDescription && showIndeterminate
      ? config.locale.Checkbox?.indeterminate
      : undefined);

  /** 消费方显式传入的 aria 关联优先，其次才用内部生成的文案/描述 ID */
  const resolvedAriaDescribedby =
    ariaDescribedby ??
    (hasDescription && (hasContent || Boolean(ariaLabel) || Boolean(ariaLabelledby))
      ? descriptionId
      : undefined);
  const resolvedAriaLabelledby =
    ariaLabelledby ??
    (!ariaLabel && hasContent
      ? labelTextId
      : !ariaLabel && !hasContent && hasDescription
        ? descriptionId
        : undefined);

  const classes = classNames(
    prefixCls,
    `${prefixCls}-${size}`,
    {
      [`${prefixCls}-checked`]: checked,
      [`${prefixCls}-indeterminate`]: showIndeterminate,
      [`${prefixCls}-disabled`]: disabled,
      [`${prefixCls}-with-content`]: hasContent || hasDescription,
    },
    className,
    rootClassName,
  );

  const domValue = valueProp === undefined || valueProp === null ? undefined : String(valueProp);

  const tokenStyle = useMemo(
    () => ({
      ...getYakitTokenVariables(config.token),
      '--yakit-checkbox-size-md': checkboxToken?.sizeMD,
      '--yakit-checkbox-size-lg': checkboxToken?.sizeLG,
      '--yakit-checkbox-border-radius': checkboxToken?.borderRadius,
      '--yakit-checkbox-gap': checkboxToken?.gap,
      '--yakit-checkbox-font-size-md': checkboxToken?.fontSizeMD,
      '--yakit-checkbox-font-size-lg': checkboxToken?.fontSizeLG,
      '--yakit-checkbox-line-height-md': checkboxToken?.lineHeightMD,
      '--yakit-checkbox-line-height-lg': checkboxToken?.lineHeightLG,
      '--yakit-checkbox-description-font-size': checkboxToken?.descriptionFontSize,
      '--yakit-checkbox-description-line-height': checkboxToken?.descriptionLineHeight,
    }),
    [config.token, checkboxToken],
  );

  return (
    <label
      className={classes}
      data-theme={config.mode}
      dir={config.direction}
      htmlFor={inputId}
      title={title}
      style={{ ...tokenStyle, ...style } as YakitCSSProperties}
    >
      <span className={`${prefixCls}-box`}>
        <input
          {...rest}
          aria-checked={showIndeterminate ? 'mixed' : checked}
          aria-describedby={resolvedAriaDescribedby}
          aria-label={resolvedAriaLabel}
          aria-labelledby={resolvedAriaLabelledby}
          checked={checked}
          className={`${prefixCls}-input`}
          disabled={disabled}
          form={formAttr}
          id={inputId}
          name={name}
          onChange={handleChange}
          onClick={onClick}
          ref={inputRef}
          type="checkbox"
          value={domValue}
        />
        <span className={`${prefixCls}-inner`} aria-hidden="true">
          {checked ? (
            <CheckOutlined
              className={`${prefixCls}-icon`}
              color="currentColor"
              size={iconSizeFor(size)}
            />
          ) : null}
          {showIndeterminate ? <IndeterminateIcon /> : null}
        </span>
      </span>
      {(hasContent || hasDescription) && (
        <span className={`${prefixCls}-content`}>
          {hasContent ? (
            <span className={`${prefixCls}-label`} id={labelTextId}>
              {children}
            </span>
          ) : null}
          {hasDescription ? (
            <span className={`${prefixCls}-description`} id={descriptionId}>
              {description}
            </span>
          ) : null}
        </span>
      )}
    </label>
  );
});

export const Checkbox = memo(CheckboxInner);
Checkbox.displayName = 'Checkbox';
