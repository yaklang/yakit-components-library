import { Input as AntInput } from 'antd';
import type { InputSemanticAllType } from 'antd/es/input/Input';
import type { OTPSemanticAllType } from 'antd/es/input/OTP';
import type { TextAreaSemanticAllType } from 'antd/es/input/TextArea';
import classNames from 'classnames';
import { forwardRef, type ElementType, type FocusEvent, useState } from 'react';

import useComponentStyle from '../../hooks/useComponentStyle';

import inputStyle from './style';
import type {
  InputProps,
  InputRef,
  InputSize,
  OTPProps,
  OTPRef,
  PasswordProps,
  TextAreaProps,
  TextAreaRef,
} from './type';

const prefixCls = 'yakit-input';

type InputSlotClassNames = NonNullable<InputSemanticAllType['classNames']>;
type TextAreaSlotClassNames = NonNullable<TextAreaSemanticAllType['classNames']>;
type OTPSlotClassNames = NonNullable<OTPSemanticAllType['classNames']>;
type InputSemanticInfo = Parameters<InputSemanticAllType['classNamesFn']>[0];
type TextAreaSemanticInfo = Parameters<TextAreaSemanticAllType['classNamesFn']>[0];
type OTPSemanticInfo = Parameters<OTPSemanticAllType['classNamesFn']>[0];

// AntD's declarations resolve React 19 from another workspace package while this
// package deliberately publishes React 18 types. Keep that declaration mismatch
// at the adapter boundary; the wrapper's public props remain strongly typed.
const AntInputControl = AntInput as unknown as ElementType;
const AntPasswordControl = AntInput.Password as unknown as ElementType;
const AntTextAreaControl = AntInput.TextArea as unknown as ElementType;
const AntOTPControl = AntInput.OTP as unknown as ElementType;

const getRootClassName = (
  visualSize: Exclude<InputSize, 'middle'>,
  options: { disabled?: boolean; error?: boolean; focused?: boolean; kind?: string },
) =>
  classNames(prefixCls, `${prefixCls}-${visualSize}`, options.kind, {
    [`${prefixCls}-disabled`]: options.disabled,
    [`${prefixCls}-error`]: options.error,
    [`${prefixCls}-focused`]: options.focused,
  });

const normalizeSize = (size: InputSize | undefined, fallback: InputSize = 'large') => {
  const resolvedSize = size ?? fallback;
  return {
    antdSize: resolvedSize === 'middle' ? 'medium' : resolvedSize,
    visualSize: resolvedSize === 'middle' ? 'medium' : resolvedSize,
  } as const;
};

export const Input = forwardRef<InputRef, InputProps>(
  (
    {
      size,
      error,
      status,
      disabled,
      onBlur,
      onFocus,
      className,
      classNames: semanticClassNames,
      rootClassName,
      styles,
      ...props
    },
    ref,
  ) => {
    const { wrapSSR, hashId } = useComponentStyle(prefixCls, inputStyle);
    const { antdSize, visualSize } = normalizeSize(size);
    const [focused, setFocused] = useState(false);

    return wrapSSR(
      <AntInputControl
        {...props}
        className={classNames(
          getRootClassName(visualSize, {
            disabled,
            error: status === 'error' || (!status && error),
            focused,
          }),
          className,
        )}
        classNames={(info: InputSemanticInfo) => {
          const userClassNames =
            typeof semanticClassNames === 'function'
              ? semanticClassNames(info)
              : semanticClassNames;
          return {
            ...userClassNames,
            clear: classNames(`${prefixCls}-slot-clear`, userClassNames?.clear),
            count: classNames(`${prefixCls}-slot-count`, userClassNames?.count),
            input: classNames(`${prefixCls}-slot-input`, userClassNames?.input),
            prefix: classNames(`${prefixCls}-slot-prefix`, userClassNames?.prefix),
            root: classNames(`${prefixCls}-slot-root`, userClassNames?.root),
            suffix: classNames(`${prefixCls}-slot-suffix`, userClassNames?.suffix),
          } satisfies InputSlotClassNames;
        }}
        disabled={disabled}
        onBlur={(event: FocusEvent<HTMLInputElement>) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event: FocusEvent<HTMLInputElement>) => {
          setFocused(true);
          onFocus?.(event);
        }}
        prefixCls={`${prefixCls}-control`}
        ref={ref}
        rootClassName={classNames(hashId, rootClassName)}
        size={antdSize}
        status={status ?? (error ? 'error' : undefined)}
        styles={styles}
      />,
    );
  },
);

export const TextArea = forwardRef<TextAreaRef, TextAreaProps>(
  (
    {
      size,
      error,
      status,
      disabled,
      className,
      classNames: semanticClassNames,
      rootClassName,
      styles,
      ...props
    },
    ref,
  ) => {
    const { wrapSSR, hashId } = useComponentStyle(prefixCls, inputStyle);
    const { antdSize, visualSize } = normalizeSize(size);

    return wrapSSR(
      <AntTextAreaControl
        {...props}
        className={classNames(
          getRootClassName(visualSize, {
            disabled,
            error: status === 'error' || (!status && error),
            kind: `${prefixCls}-textarea`,
          }),
          className,
        )}
        classNames={(info: TextAreaSemanticInfo) => {
          const userClassNames =
            typeof semanticClassNames === 'function'
              ? semanticClassNames(info)
              : semanticClassNames;
          return {
            ...userClassNames,
            clear: classNames(`${prefixCls}-slot-clear`, userClassNames?.clear),
            count: classNames(`${prefixCls}-slot-count`, userClassNames?.count),
            root: classNames(`${prefixCls}-slot-root`, userClassNames?.root),
            textarea: classNames(`${prefixCls}-slot-textarea`, userClassNames?.textarea),
          } satisfies TextAreaSlotClassNames;
        }}
        disabled={disabled}
        prefixCls={`${prefixCls}-control`}
        ref={ref}
        rootClassName={classNames(hashId, rootClassName)}
        size={antdSize}
        status={status ?? (error ? 'error' : undefined)}
        styles={styles}
      />,
    );
  },
);

export const Password = forwardRef<InputRef, PasswordProps>(
  (
    {
      size,
      error,
      status,
      disabled,
      className,
      classNames: semanticClassNames,
      rootClassName,
      styles,
      ...props
    },
    ref,
  ) => {
    const { wrapSSR, hashId } = useComponentStyle(prefixCls, inputStyle);
    const { antdSize, visualSize } = normalizeSize(size);

    return wrapSSR(
      <AntPasswordControl
        {...props}
        className={classNames(
          getRootClassName(visualSize, {
            disabled,
            error: status === 'error' || (!status && error),
            kind: `${prefixCls}-password`,
          }),
          className,
        )}
        classNames={(info: InputSemanticInfo) => {
          const userClassNames =
            typeof semanticClassNames === 'function'
              ? semanticClassNames(info)
              : semanticClassNames;
          return {
            ...userClassNames,
            clear: classNames(`${prefixCls}-slot-clear`, userClassNames?.clear),
            count: classNames(`${prefixCls}-slot-count`, userClassNames?.count),
            input: classNames(`${prefixCls}-slot-input`, userClassNames?.input),
            prefix: classNames(`${prefixCls}-slot-prefix`, userClassNames?.prefix),
            root: classNames(`${prefixCls}-slot-root`, userClassNames?.root),
            suffix: classNames(`${prefixCls}-slot-suffix`, userClassNames?.suffix),
          } satisfies InputSlotClassNames;
        }}
        disabled={disabled}
        prefixCls={`${prefixCls}-control`}
        ref={ref}
        rootClassName={classNames(hashId, rootClassName)}
        size={antdSize}
        status={status ?? (error ? 'error' : undefined)}
        styles={styles}
      />,
    );
  },
);

export const OTP = forwardRef<OTPRef, OTPProps>(
  (
    {
      size,
      error,
      status,
      disabled,
      className,
      classNames: semanticClassNames,
      rootClassName,
      styles,
      ...props
    },
    ref,
  ) => {
    const { wrapSSR, hashId } = useComponentStyle(prefixCls, inputStyle);
    const { antdSize, visualSize } = normalizeSize(size);

    return wrapSSR(
      <AntOTPControl
        {...props}
        className={classNames(
          getRootClassName(visualSize, {
            disabled,
            error: status === 'error' || (!status && error),
            kind: `${prefixCls}-otp`,
          }),
          className,
        )}
        classNames={(info: OTPSemanticInfo) => {
          const userClassNames =
            typeof semanticClassNames === 'function'
              ? semanticClassNames(info)
              : semanticClassNames;
          return {
            ...userClassNames,
            input: classNames(`${prefixCls}-otp-slot-input`, userClassNames?.input),
            root: classNames(`${prefixCls}-slot-root`, userClassNames?.root),
            separator: classNames(`${prefixCls}-otp-slot-separator`, userClassNames?.separator),
          } satisfies OTPSlotClassNames;
        }}
        disabled={disabled}
        prefixCls={`${prefixCls}-otp-control`}
        ref={ref}
        rootClassName={classNames(hashId, rootClassName)}
        size={antdSize}
        status={status ?? (error ? 'error' : undefined)}
        styles={styles}
      />,
    );
  },
);

Input.displayName = 'Input';
TextArea.displayName = 'Input.TextArea';
Password.displayName = 'Input.Password';
OTP.displayName = 'Input.OTP';
