import classNames from 'classnames';
import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import { getYakitTokenVariables } from '../../styles/tokenVariables';
import type { YakitCSSProperties } from '../../styles/tokenVariables';

import { RadioGroupContext } from './GroupContext';
import Radio from './Radio';
import { resolveButtonSizeClass, resolveCircularSize } from './sizeUtils';
import type {
  RadioChangeEvent,
  RadioGroupOption,
  RadioGroupProps,
  RadioOptionType,
  RadioValue,
} from './type';

const yakitPrefix = 'yakit-radio-group';
const antGroup = 'ant-radio-group';

const normalizeOption = (option: RadioGroupOption): RadioOptionType => {
  if (typeof option === 'string' || typeof option === 'number') {
    return { label: option, value: option };
  }
  return option;
};

/**
 * 递归查找 Radio.Button：antd 允许按钮项被 Badge / div / 自定义组件包裹，
 * 只看直接子节点会漏掉，导致 group 拿不到 button 布局与选中样式。
 * 这里沿 props.children 向下找；不进入 Radio.Button 自身的 children。
 */
const containsRadioButton = (children: ReactNode): boolean =>
  Children.toArray(children).some((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return false;
    if ((child.type as { displayName?: string }).displayName === 'Radio.Button') return true;
    return containsRadioButton(child.props.children);
  });

const getOptionKey = (value: RadioValue): string => `${typeof value}:${String(value)}`;

/** 映射到 antd Radio.Group 仅有的 small | large（middle 无 class） */
const resolveAntGroupSizeClass = (
  buttonSize: 'small' | 'middle' | 'large' | 'max-large',
): 'small' | 'large' | undefined => {
  if (buttonSize === 'small') return 'small';
  if (buttonSize === 'large' || buttonSize === 'max-large') return 'large';
  return undefined;
};

export const Group = forwardRef<HTMLDivElement, RadioGroupProps>(function Group(
  {
    value: valueProp,
    defaultValue,
    disabled: disabledProp,
    name: nameProp,
    options,
    optionType = 'default',
    buttonStyle = 'outline',
    size: sizeProp,
    orientation,
    vertical,
    block,
    wrapClassName,
    children,
    onChange,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    className,
    rootClassName,
    style,
    id,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
  },
  ref,
) {
  const config = useYakitConfig();
  const radioToken = config.token.YakitRadio;
  const reactId = useId();

  // antd：写 Radio.Button 子节点时不必再传 optionType="button"；据此补 button 布局 class
  const hasButtonChild = useMemo(() => containsRadioButton(children), [children]);
  const isButton = optionType === 'button' || hasButtonChild;
  const circularSize = resolveCircularSize(
    sizeProp ?? (config.componentSize === 'large' ? 'large' : 'medium'),
  );
  const buttonSizeClass = isButton ? resolveButtonSizeClass(sizeProp ?? 'middle') : undefined;
  const antSizeClass = buttonSizeClass ? resolveAntGroupSizeClass(buttonSizeClass) : undefined;
  const disabled = disabledProp ?? config.componentDisabled ?? false;
  const name = nameProp ?? `${yakitPrefix}-${reactId}`;
  const isVertical = vertical === true || orientation === 'vertical';

  const controlled = valueProp !== undefined;
  const [innerValue, setInnerValue] = useState<RadioValue | undefined>(defaultValue);
  const value = controlled ? valueProp : innerValue;

  const handleChange = useCallback(
    (e: RadioChangeEvent) => {
      if (disabled) return;
      if (!controlled) {
        setInnerValue(e.target.value);
      }
      onChange?.(e);
    },
    [controlled, disabled, onChange],
  );

  const contextValue = useMemo(
    () => ({
      value,
      disabled,
      name,
      size: circularSize,
      optionType,
      block,
      onChange: handleChange,
    }),
    [value, disabled, name, circularSize, optionType, block, handleChange],
  );

  const classes = classNames(
    // antd 兼容：主项目 theme / 页面 :global(.ant-radio-group*) 与 YakitRadioButtons.module :global
    antGroup,
    isButton && `${antGroup}-${buttonStyle}`,
    {
      [`${antGroup}-${antSizeClass}`]: Boolean(antSizeClass),
      [`${antGroup}-vertical`]: isVertical,
      [`${antGroup}-block`]: block,
    },
    // yakit 自有
    yakitPrefix,
    `${yakitPrefix}-${circularSize}`,
    isButton && buttonSizeClass && `${yakitPrefix}-${buttonSizeClass}`,
    {
      [`${yakitPrefix}-disabled`]: disabled,
      [`${yakitPrefix}-button`]: isButton,
      [`${yakitPrefix}-button-solid`]: isButton && buttonStyle === 'solid',
      [`${yakitPrefix}-button-outline`]: isButton && buttonStyle !== 'solid',
      [`${yakitPrefix}-vertical`]: isVertical,
      [`${yakitPrefix}-horizontal`]: !isVertical,
      [`${yakitPrefix}-block`]: block,
    },
    className,
    rootClassName,
  );

  let childNodes = children;
  if (options && options.length > 0) {
    // 统一走 Radio：圆形 / 按钮 DOM + ant-* class 由 Radio 内部根据 optionType 决定
    childNodes = options.map((raw) => {
      const option = normalizeOption(raw);
      return (
        <Radio
          key={getOptionKey(option.value)}
          value={option.value}
          disabled={option.disabled}
          description={isButton ? undefined : option.description}
          className={option.className}
          style={option.style}
          title={option.title}
          id={option.id}
          required={option.required}
          onClick={option.onClick}
          onChange={option.onChange}
        >
          {option.label}
        </Radio>
      );
    });
  }

  // 无障碍：aria-label / aria-labelledby 优先；仅无 labelledby 时用显式 name 兜底；不硬编文案
  const groupAriaLabel = ariaLabel ?? (ariaLabelledby ? undefined : nameProp);

  const groupNode = (
    <div
      ref={ref}
      id={id}
      className={classes}
      role="radiogroup"
      aria-label={groupAriaLabel}
      aria-labelledby={ariaLabelledby}
      data-theme={config.mode}
      dir={config.direction}
      tabIndex={-1}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      style={
        {
          ...getYakitTokenVariables(config.token),
          '--yakit-radio-size-md': radioToken?.sizeMD,
          '--yakit-radio-size-lg': radioToken?.sizeLG,
          '--yakit-radio-gap': radioToken?.gap,
          '--yakit-radio-font-size-md': radioToken?.fontSizeMD,
          '--yakit-radio-font-size-lg': radioToken?.fontSizeLG,
          '--yakit-radio-line-height-md': radioToken?.lineHeightMD,
          '--yakit-radio-line-height-lg': radioToken?.lineHeightLG,
          '--yakit-radio-description-font-size': radioToken?.descriptionFontSize,
          '--yakit-radio-description-line-height': radioToken?.descriptionLineHeight,
          '--yakit-radio-button-border-radius': radioToken?.buttonBorderRadius,
          ...style,
        } as YakitCSSProperties
      }
    >
      {childNodes}
    </div>
  );

  // 仅有 wrapClassName 时才包外层，避免多一层空 div；Group 根仍挂 ant-radio-group
  return (
    <RadioGroupContext.Provider value={contextValue}>
      {wrapClassName ? <div className={wrapClassName}>{groupNode}</div> : groupNode}
    </RadioGroupContext.Provider>
  );
});

Group.displayName = 'Radio.Group';

export default Group;
