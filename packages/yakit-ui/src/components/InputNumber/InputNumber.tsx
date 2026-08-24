import AntInputNumber from 'antd/es/input-number';
import type { InputNumberSemanticAllType } from 'antd/es/input-number';
import classNames from 'classnames';
import {
  forwardRef,
  type ElementType,
  type ForwardedRef,
  type ReactElement,
  type RefAttributes,
} from 'react';

import useComponentStyle from '../../hooks/useComponentStyle';

import chevronDownLarge from './assets/chevron-down-l.svg';
import chevronDownMedium from './assets/chevron-down-m.svg';
import chevronDownSmall from './assets/chevron-down-s.svg';
import chevronLeftLarge from './assets/chevron-left-l.svg';
import chevronRightLarge from './assets/chevron-right-l.svg';
import chevronRightSmall from './assets/chevron-right-s.svg';
import chevronUpLarge from './assets/chevron-up-l.svg';
import chevronUpMedium from './assets/chevron-up-m.svg';
import chevronUpSmall from './assets/chevron-up-s.svg';
import inputNumberStyle from './style';
import type {
  InputNumberControls,
  InputNumberProps,
  InputNumberRef,
  InputNumberSize,
  InputNumberValue,
} from './type';

const prefixCls = 'yakit-input-number';
type InputNumberSlotClassNames = InputNumberSemanticAllType['classNames'];

const AntInputNumberControl = AntInputNumber as unknown as ElementType;

const mergeInputNumberClassNames =
  (
    userClassNames: InputNumberProps['classNames'],
    rootClassName: string,
  ): InputNumberProps['classNames'] =>
  (info) => {
    const resolvedClassNames =
      typeof userClassNames === 'function' ? userClassNames(info) : userClassNames;

    return {
      ...resolvedClassNames,
      actions: classNames(`${prefixCls}-slot-actions`, resolvedClassNames?.actions),
      input: classNames(`${prefixCls}-slot-input`, resolvedClassNames?.input),
      prefix: classNames(`${prefixCls}-slot-prefix`, resolvedClassNames?.prefix),
      root: classNames(rootClassName, resolvedClassNames?.root),
      suffix: classNames(`${prefixCls}-slot-suffix`, resolvedClassNames?.suffix),
      // @rc-component/input-number exposes this slot and Ant Design forwards it.
      action: `${prefixCls}-slot-action`,
    } as InputNumberSlotClassNames;
  };

type CanonicalSize = Exclude<InputNumberSize, 'middle'>;

const normalizeSize = (size: InputNumberSize): CanonicalSize =>
  size === 'middle' ? 'medium' : size;

const getVerticalControls = (size: CanonicalSize) => ({
  downIcon: (
    <img
      alt=""
      src={
        size === 'small'
          ? chevronDownSmall
          : size === 'medium'
            ? chevronDownMedium
            : chevronDownLarge
      }
    />
  ),
  upIcon: (
    <img
      alt=""
      src={size === 'small' ? chevronUpSmall : size === 'medium' ? chevronUpMedium : chevronUpLarge}
    />
  ),
});

const getHorizontalControls = (size: CanonicalSize) => ({
  downIcon: <img alt="" src={chevronLeftLarge} />,
  upIcon: <img alt="" src={size === 'small' ? chevronRightSmall : chevronRightLarge} />,
});

const resolveControls = (controls: InputNumberControls | undefined, size: CanonicalSize) => {
  if (controls === false) return false;
  if (controls === 'horizontal') return getHorizontalControls(size);
  if (controls === undefined || controls === 'vertical') return getVerticalControls(size);
  return controls;
};

const InternalInputNumber = <T extends InputNumberValue = InputNumberValue>(
  {
    size = 'huge',
    controls,
    mode,
    error,
    status,
    className,
    classNames: semanticClassNames,
    rootClassName,
    styles,
    disabled,
    ...props
  }: InputNumberProps<T>,
  ref: ForwardedRef<InputNumberRef>,
) => {
  const { wrapSSR, hashId } = useComponentStyle(prefixCls, inputNumberStyle);
  const canonicalSize = normalizeSize(size);
  const legacyMode =
    controls === 'horizontal' ? 'spinner' : controls === 'vertical' ? 'input' : mode;
  const mergedStatus = status ?? (error ? 'error' : undefined);

  return wrapSSR(
    <AntInputNumberControl
      {...props}
      ref={ref}
      className={className}
      classNames={mergeInputNumberClassNames(
        semanticClassNames,
        classNames(
          prefixCls,
          hashId,
          `${prefixCls}-${canonicalSize}`,
          `${prefixCls}-controls-${controls === 'horizontal' ? 'horizontal' : 'vertical'}`,
          {
            [`${prefixCls}-disabled`]: disabled,
            [`${prefixCls}-error`]: mergedStatus === 'error',
          },
        ),
      )}
      controls={resolveControls(controls, canonicalSize)}
      disabled={disabled}
      mode={legacyMode}
      prefixCls={prefixCls}
      rootClassName={rootClassName}
      size={canonicalSize === 'huge' ? 'large' : canonicalSize}
      status={mergedStatus}
      styles={styles}
    />,
  );
};

type InputNumberComponent = {
  <T extends InputNumberValue = InputNumberValue>(
    props: InputNumberProps<T> & RefAttributes<InputNumberRef>,
  ): ReactElement;
  displayName?: string;
};

export const InputNumber = forwardRef(InternalInputNumber) as InputNumberComponent;

InputNumber.displayName = 'InputNumber';
