import classNames from 'classnames';
import {
  forwardRef,
  type ForwardedRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import { getYakitTokenVariables } from '../../styles/tokenVariables';
import type { YakitCSSProperties } from '../../styles/tokenVariables';

import chevronDownLarge from './assets/chevron-down-l.svg';
import chevronDownMedium from './assets/chevron-down-m.svg';
import chevronDownSmall from './assets/chevron-down-s.svg';
import chevronLeftLarge from './assets/chevron-left-l.svg';
import chevronRightLarge from './assets/chevron-right-l.svg';
import chevronRightSmall from './assets/chevron-right-s.svg';
import chevronUpLarge from './assets/chevron-up-l.svg';
import chevronUpMedium from './assets/chevron-up-m.svg';
import chevronUpSmall from './assets/chevron-up-s.svg';
import {
  addDecimal,
  clampDecimal,
  compareDecimal,
  decimalToString,
  divideDecimalByTen,
  multiplyDecimal,
  parseDecimal,
  roundDecimal,
  type Decimal,
} from './decimal';
import './style/index.css';
import type {
  InputNumberControlIcons,
  InputNumberControls,
  InputNumberProps,
  InputNumberRef,
  InputNumberSize,
  InputNumberStepInfo,
  InputNumberValue,
} from './type';

const prefixCls = 'yakit-input-number';
type CanonicalSize = Exclude<InputNumberSize, 'middle'>;
type StepDirection = 'down' | 'up';
const ZERO_DECIMAL: Decimal = { coefficient: 0n, negativeZero: false, scale: 0 };

const normalizeSize = (size: InputNumberSize): CanonicalSize =>
  size === 'middle' ? 'medium' : size;

const getVerticalControls = (size: CanonicalSize): Required<InputNumberControlIcons> => ({
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

const getHorizontalControls = (size: CanonicalSize): Required<InputNumberControlIcons> => ({
  downIcon: <img alt="" src={chevronLeftLarge} />,
  upIcon: <img alt="" src={size === 'small' ? chevronRightSmall : chevronRightLarge} />,
});

const resolveControlIcons = (
  controls: InputNumberControls | undefined,
  size: CanonicalSize,
): Required<InputNumberControlIcons> => {
  if (controls === 'horizontal') return getHorizontalControls(size);
  if (controls && typeof controls === 'object') {
    const defaults = getVerticalControls(size);
    return {
      downIcon: controls.downIcon === undefined ? defaults.downIcon : controls.downIcon,
      upIcon: controls.upIcon === undefined ? defaults.upIcon : controls.upIcon,
    };
  }
  return getVerticalControls(size);
};

const toDecimal = (value: InputNumberValue | null | undefined) =>
  value === null || value === undefined ? null : parseDecimal(value);

const InternalInputNumber = <T extends InputNumberValue = InputNumberValue>(
  allProps: InputNumberProps<T>,
  ref: ForwardedRef<InputNumberRef>,
) => {
  const {
    className,
    classNames: semanticClassNames,
    controls,
    defaultValue = null,
    disabled: disabledProp,
    error,
    formatter,
    keyboard = true,
    max,
    min,
    onBlur,
    onChange,
    onCompositionEnd,
    onCompositionStart,
    onFocus,
    onKeyDown,
    onStep,
    parser,
    precision,
    prefix,
    readOnly,
    rootClassName,
    size: sizeProp,
    status,
    step = 1,
    stringMode = false,
    style,
    styles: semanticStyles,
    suffix,
    value,
    ...inputProps
  } = allProps;

  const config = useYakitConfig();
  const disabled = disabledProp ?? config.componentDisabled;
  const size = sizeProp ?? config.componentSize ?? 'huge';

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const repeatDelayRef = useRef<number>();
  const repeatIntervalRef = useRef<number>();
  const [innerValue, setInnerValue] = useState<T | null>(defaultValue);
  const [editing, setEditing] = useState(false);
  const [inputText, setInputText] = useState('');
  const controlled = value !== undefined;
  const committedValue = controlled ? value : innerValue;
  const committedValueRef = useRef<T | null | undefined>(committedValue);
  committedValueRef.current = committedValue;
  const canonicalSize = normalizeSize(size);
  const horizontal = controls === 'horizontal';
  const controlsVisible = controls !== false;
  const mergedStatus = status ?? (error ? 'error' : undefined);
  const info = useMemo(() => ({ props: allProps as Readonly<InputNumberProps<T>> }), [allProps]);
  const resolvedClassNames =
    typeof semanticClassNames === 'function'
      ? semanticClassNames(info)
      : (semanticClassNames ?? {});
  const resolvedStyles =
    typeof semanticStyles === 'function' ? semanticStyles(info) : (semanticStyles ?? {});
  const icons = resolveControlIcons(controls, canonicalSize);
  const minDecimal = toDecimal(min);
  const maxDecimal = toDecimal(max);

  const formatValue = useCallback(
    (nextValue: T | null | undefined, userTyping: boolean, rawInput: string) => {
      if (nextValue === null || nextValue === undefined) return '';
      if (formatter) return formatter(nextValue, { input: rawInput, userTyping });
      return String(nextValue);
    },
    [formatter],
  );

  const formatEditingText = useCallback(
    (rawInput: string) => {
      if (!formatter) return rawInput;
      const parsed = parser ? parser(rawInput) : rawInput;
      return formatter(parsed, { input: rawInput, userTyping: true });
    },
    [formatter, parser],
  );

  const displayValue = editing
    ? inputText
    : formatValue(committedValue, false, committedValue == null ? '' : String(committedValue));

  const publishValue = useCallback(
    (decimal: Decimal): T => {
      const output = decimalToString(decimal);
      return (stringMode ? output : Number(output)) as T;
    },
    [stringMode],
  );

  const normalizeDecimal = useCallback(
    (decimal: Decimal) => {
      const rounded = precision === undefined ? decimal : roundDecimal(decimal, precision);
      return clampDecimal(rounded, minDecimal, maxDecimal);
    },
    [maxDecimal, minDecimal, precision],
  );

  const updateValue = useCallback(
    (nextValue: T | null) => {
      if (!controlled) {
        committedValueRef.current = nextValue;
        setInnerValue(nextValue);
      }
      onChange?.(nextValue);
    },
    [controlled, onChange],
  );

  const parseDisplay = useCallback(
    (rawInput: string): Decimal | null => {
      const parsed = parser ? parser(rawInput) : rawInput;
      if (
        parsed === null ||
        parsed === undefined ||
        (typeof parsed === 'number' && !Number.isFinite(parsed))
      ) {
        return null;
      }
      return parseDecimal(parsed);
    },
    [parser],
  );

  const commit = useCallback(() => {
    if (!editing || composingRef.current) return;
    const rawInput = inputText.trim();
    setEditing(false);
    if (rawInput === '') {
      updateValue(null);
      return;
    }

    const parsed = parseDisplay(rawInput);
    if (!parsed) return;
    updateValue(publishValue(normalizeDecimal(parsed)));
  }, [editing, inputText, normalizeDecimal, parseDisplay, publishValue, updateValue]);

  const currentDecimal = useCallback(() => {
    if (editing) {
      const parsed = parseDisplay(inputText.trim());
      if (parsed) return parsed;
    }
    return toDecimal(committedValueRef.current) ?? ZERO_DECIMAL;
  }, [editing, inputText, parseDisplay]);

  const changeByStep = useCallback(
    (
      direction: StepDirection,
      multiplier: 0.1 | 1 | 10,
      emitter: InputNumberStepInfo['emitter'],
    ) => {
      if (disabled || readOnly) return;
      const parsedStep = parseDecimal(step);
      if (!parsedStep) return;

      const baseDecimal = currentDecimal();
      const magnitude =
        multiplier === 0.1
          ? divideDecimalByTen(parsedStep)
          : multiplyDecimal(parsedStep, multiplier);
      const offsetDecimal = direction === 'up' ? magnitude : multiplyDecimal(magnitude, -1);
      const nextDecimal = normalizeDecimal(addDecimal(baseDecimal, offsetDecimal));
      if (compareDecimal(baseDecimal, nextDecimal) === 0) return;
      const nextValue = publishValue(nextDecimal);
      const offset = decimalToString(magnitude);

      setEditing(false);
      updateValue(nextValue);
      onStep?.(nextValue, { emitter, offset, type: direction });
    },
    [currentDecimal, disabled, normalizeDecimal, onStep, publishValue, readOnly, step, updateValue],
  );

  const stopRepeat = useCallback(() => {
    if (repeatDelayRef.current !== undefined) window.clearTimeout(repeatDelayRef.current);
    if (repeatIntervalRef.current !== undefined) window.clearInterval(repeatIntervalRef.current);
    repeatDelayRef.current = undefined;
    repeatIntervalRef.current = undefined;
  }, []);

  useEffect(() => stopRepeat, [stopRepeat]);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form || controlled) return;
    const reset = () => {
      committedValueRef.current = defaultValue;
      setInnerValue(defaultValue);
      setEditing(false);
      setInputText('');
    };
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, [controlled, defaultValue, inputProps.form]);

  useImperativeHandle(
    ref,
    () => ({
      blur: () => inputRef.current?.blur(),
      focus: (options) => {
        const input = inputRef.current;
        if (!input) return;
        input.focus({ preventScroll: options?.preventScroll });
        if (options?.cursor) {
          const position = options.cursor === 'start' ? 0 : input.value.length;
          input.setSelectionRange(
            options.cursor === 'all' ? 0 : position,
            options.cursor === 'all' ? input.value.length : position,
          );
        }
      },
      get nativeElement() {
        return rootRef.current as HTMLElement;
      },
    }),
    [],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || composingRef.current || event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      commit();
      return;
    }
    if (!keyboard || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const multiplier = event.shiftKey ? 10 : event.ctrlKey || event.metaKey ? 0.1 : 1;
    changeByStep(event.key === 'ArrowUp' ? 'up' : 'down', multiplier, 'keyboard');
  };

  const startControlStep = (event: MouseEvent<HTMLButtonElement>, direction: StepDirection) => {
    event.preventDefault();
    inputRef.current?.focus();
    changeByStep(direction, 1, 'handler');
    if (disabled || readOnly) return;
    repeatDelayRef.current = window.setTimeout(() => {
      repeatIntervalRef.current = window.setInterval(
        () => changeByStep(direction, 1, 'handler'),
        150,
      );
    }, 500);
  };

  const current = toDecimal(committedValue);
  const decreaseDisabled =
    disabled ||
    readOnly ||
    Boolean(current && minDecimal && compareDecimal(current, minDecimal) <= 0);
  const increaseDisabled =
    disabled ||
    readOnly ||
    Boolean(current && maxDecimal && compareDecimal(current, maxDecimal) >= 0);
  const incrementLabel = config.locale.InputNumber?.increment ?? 'Increase Value';
  const decrementLabel = config.locale.InputNumber?.decrement ?? 'Decrease Value';
  const spinbuttonAria: Record<string, string | undefined> = {
    'aria-valuemax': max === undefined ? undefined : String(max),
    'aria-valuemin': min === undefined ? undefined : String(min),
    'aria-valuenow':
      committedValue === null || committedValue === undefined ? undefined : String(committedValue),
  };

  const renderAction = (direction: StepDirection, icon: ReactNode, actionDisabled: boolean) => (
    <button
      aria-label={direction === 'up' ? incrementLabel : decrementLabel}
      className={classNames(
        `${prefixCls}-slot-action`,
        `${prefixCls}-action`,
        `${prefixCls}-action-${direction}`,
        resolvedClassNames.action,
      )}
      disabled={actionDisabled}
      onClick={(event) => {
        if (event.detail === 0) changeByStep(direction, 1, 'handler');
      }}
      onMouseDown={(event) => startControlStep(event, direction)}
      onMouseLeave={stopRepeat}
      onMouseUp={stopRepeat}
      style={resolvedStyles.action}
      tabIndex={-1}
      type="button"
    >
      {icon}
    </button>
  );

  const input = (
    <input
      {...inputProps}
      {...spinbuttonAria}
      aria-invalid={inputProps['aria-invalid'] ?? (mergedStatus === 'error' || undefined)}
      aria-valuetext={inputProps['aria-valuetext'] ?? (displayValue || undefined)}
      className={classNames(`${prefixCls}-slot-input`, resolvedClassNames.input)}
      disabled={disabled}
      inputMode="decimal"
      onBlur={(event) => {
        commit();
        onBlur?.(event);
      }}
      onChange={(event) => {
        setInputText(formatEditingText(event.target.value));
        setEditing(true);
      }}
      onCompositionEnd={(event) => {
        composingRef.current = false;
        onCompositionEnd?.(event);
      }}
      onCompositionStart={(event) => {
        composingRef.current = true;
        onCompositionStart?.(event);
      }}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      readOnly={readOnly}
      ref={inputRef}
      role="spinbutton"
      style={resolvedStyles.input}
      type="text"
      value={displayValue}
    />
  );

  const downAction = renderAction('down', icons.downIcon, decreaseDisabled);
  const upAction = renderAction('up', icons.upIcon, increaseDisabled);

  return (
    <div
      className={classNames(
        prefixCls,
        `${prefixCls}-${canonicalSize}`,
        `${prefixCls}-controls-${horizontal ? 'horizontal' : 'vertical'}`,
        {
          [`${prefixCls}-disabled`]: disabled,
          [`${prefixCls}-error`]: mergedStatus === 'error',
          [`${prefixCls}-mode-spinner`]: horizontal,
        },
        className,
        rootClassName,
        resolvedClassNames.root,
      )}
      data-theme={config.mode}
      dir={config.direction}
      ref={rootRef}
      style={
        {
          ...getYakitTokenVariables(config.token),
          ...resolvedStyles.root,
          ...style,
        } as YakitCSSProperties
      }
    >
      {horizontal && controlsVisible ? downAction : null}
      {prefix ? (
        <span
          className={classNames(`${prefixCls}-slot-prefix`, resolvedClassNames.prefix)}
          style={resolvedStyles.prefix}
        >
          {prefix}
        </span>
      ) : null}
      {input}
      {suffix ? (
        <span
          className={classNames(`${prefixCls}-slot-suffix`, resolvedClassNames.suffix)}
          style={resolvedStyles.suffix}
        >
          {suffix}
        </span>
      ) : null}
      {!horizontal && controlsVisible ? (
        <span
          className={classNames(`${prefixCls}-slot-actions`, resolvedClassNames.actions)}
          style={resolvedStyles.actions}
        >
          {upAction}
          {downAction}
        </span>
      ) : null}
      {horizontal && controlsVisible ? upAction : null}
    </div>
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
