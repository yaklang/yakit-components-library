import classNames from 'classnames';
import { type ChangeEvent, type FC, type ReactNode, useState } from 'react';

import useComponentStyle from '../../hooks/useComponentStyle';

import chevronDownLarge from './assets/chevron-down-l.svg';
import chevronDownMedium from './assets/chevron-down-m.svg';
import chevronDownSmall from './assets/chevron-down-s.svg';
import chevronLeftDisabledLarge from './assets/chevron-left-l-active.svg';
import chevronLeftLarge from './assets/chevron-left-l.svg';
import chevronLeftDisabledMedium from './assets/chevron-left-m.svg';
import chevronLeftDisabledSmall from './assets/chevron-left-s.svg';
import chevronRightDisabledLarge from './assets/chevron-right-l-active.svg';
import chevronRightLarge from './assets/chevron-right-l.svg';
import chevronRightDisabledMedium from './assets/chevron-right-m.svg';
import chevronRightDisabledSmall from './assets/chevron-right-s-active.svg';
import chevronRightSmall from './assets/chevron-right-s.svg';
import chevronUpLarge from './assets/chevron-up-l.svg';
import chevronUpMedium from './assets/chevron-up-m.svg';
import chevronUpSmall from './assets/chevron-up-s.svg';
import inputNumberStyle from './style';
import type { InputNumberProps, InputNumberSize } from './type';

const prefixCls = 'yakit-input-number';

const getVerticalIcon = (size: InputNumberSize, unavailable: boolean) => {
  const enabledIcon =
    size === 'small' ? chevronUpSmall : size === 'medium' ? chevronUpMedium : chevronUpLarge;
  const disabledIcon =
    size === 'small' ? chevronDownSmall : size === 'medium' ? chevronDownMedium : chevronDownLarge;

  return unavailable ? disabledIcon : enabledIcon;
};

const getHorizontalIcon = (
  direction: 'increase' | 'decrease',
  size: Exclude<InputNumberSize, 'huge'>,
  unavailable: boolean,
) => {
  if (direction === 'increase') {
    if (!unavailable) return size === 'small' ? chevronRightSmall : chevronRightLarge;
    if (size === 'small') return chevronRightDisabledSmall;
    if (size === 'medium') return chevronRightDisabledMedium;
    return chevronRightDisabledLarge;
  }

  if (!unavailable) return chevronLeftLarge;
  if (size === 'small') return chevronLeftDisabledSmall;
  if (size === 'medium') return chevronLeftDisabledMedium;
  return chevronLeftDisabledLarge;
};

interface ControlButtonProps {
  children: ReactNode;
  className: string;
  disabled: boolean;
  label: string;
  onClick: () => void;
}

const ControlButton: FC<ControlButtonProps> = ({
  children,
  className,
  disabled,
  label,
  onClick,
}) => (
  <button
    aria-label={label}
    className={className}
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
);

export const InputNumber: FC<InputNumberProps> = ({
  size = 'huge',
  value,
  defaultValue,
  min,
  max,
  step = 1,
  controls = 'vertical',
  onChange,
  className,
  rootClassName,
  style,
  disabled,
  ...inputProps
}) => {
  const { wrapSSR, hashId } = useComponentStyle(prefixCls, inputNumberStyle);
  const [innerValue, setInnerValue] = useState(
    defaultValue === undefined ? '' : String(defaultValue),
  );
  const isControlled = value !== undefined;
  const displayValue = isControlled ? (value ?? '') : innerValue;
  const numericValue = Number(displayValue);
  const currentValue = Number.isNaN(numericValue) ? 0 : numericValue;
  const cannotDecrease = disabled || (min !== undefined && currentValue <= min);
  const cannotIncrease = disabled || (max !== undefined && currentValue >= max);

  const emitChange = (nextValue: string) => {
    if (!isControlled) setInnerValue(nextValue);
    const parsed = Number(nextValue);
    onChange?.(nextValue === '' || Number.isNaN(parsed) ? null : parsed);
  };

  const updateBy = (amount: number) => {
    const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, currentValue + amount));
    emitChange(String(next));
  };

  const classes = classNames(prefixCls, hashId, className, rootClassName, {
    [`${prefixCls}-${size}`]: size,
    [`${prefixCls}-disabled`]: disabled,
    [`${prefixCls}-controls-${controls}`]: controls,
  });

  const verticalControls = controls === 'vertical' && (
    <span className={classNames(`${prefixCls}-vertical-controls`, hashId)}>
      <ControlButton
        className={classNames(`${prefixCls}-control`, `${prefixCls}-control-increase`, hashId)}
        disabled={cannotIncrease}
        label="增加"
        onClick={() => updateBy(step)}
      >
        <img alt="" src={getVerticalIcon(size, cannotIncrease)} />
      </ControlButton>
      <ControlButton
        className={classNames(`${prefixCls}-control`, `${prefixCls}-control-decrease`, hashId)}
        disabled={cannotDecrease}
        label="减少"
        onClick={() => updateBy(-step)}
      >
        <img alt="" src={getVerticalIcon(size, cannotDecrease)} />
      </ControlButton>
    </span>
  );

  const horizontalControls = controls === 'horizontal' && size !== 'huge' && (
    <>
      <ControlButton
        className={classNames(`${prefixCls}-control`, `${prefixCls}-control-decrease`, hashId)}
        disabled={cannotDecrease}
        label="减少"
        onClick={() => updateBy(-step)}
      >
        <img alt="" src={getHorizontalIcon('decrease', size, cannotDecrease)} />
      </ControlButton>
    </>
  );

  const horizontalIncreaseControl = controls === 'horizontal' && size !== 'huge' && (
    <ControlButton
      className={classNames(`${prefixCls}-control`, `${prefixCls}-control-increase`, hashId)}
      disabled={cannotIncrease}
      label="增加"
      onClick={() => updateBy(step)}
    >
      <img alt="" src={getHorizontalIcon('increase', size, cannotIncrease)} />
    </ControlButton>
  );

  return wrapSSR(
    <span className={classes} style={style}>
      {horizontalControls}
      <input
        {...inputProps}
        className={classNames(`${prefixCls}-element`, hashId)}
        disabled={disabled}
        inputMode="decimal"
        onChange={(event: ChangeEvent<HTMLInputElement>) => emitChange(event.target.value)}
        type="text"
        value={displayValue}
      />
      {verticalControls}
      {horizontalIncreaseControl}
    </span>,
  );
};
