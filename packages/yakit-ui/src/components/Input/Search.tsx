import classNames from 'classnames';
import {
  cloneElement,
  Fragment,
  forwardRef,
  isValidElement,
  useImperativeHandle,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import { getYakitTokenVariables, type YakitCSSProperties } from '../../styles/tokenVariables';
import chevronDown from '../SearchInput/assets/chevron-down.svg';
import searchDefault from '../SearchInput/assets/search-default.svg';
import searchDisabled from '../SearchInput/assets/search-disabled.svg';
import searchWhite from '../SearchInput/assets/search-white.svg';
import './search.css';

import type {
  InputRef,
  InputSemanticInfo,
  SearchEnterButtonProps,
  SearchInputSize,
  SearchProps,
  SearchSemanticClassNames,
  SearchSemanticStyles,
  SearchTriggerProps,
} from './type';

const prefixCls = 'yakit-search-input';

const normalizeSearchSize = (size: SearchInputSize | undefined) => {
  const resolved = size ?? 'medium';
  return resolved === 'middle' ? 'medium' : resolved;
};

const renderIcon = (icon: ReactNode) =>
  typeof icon === 'string' ? <img alt="" src={icon} /> : icon;

const setNativeValue = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const interactiveActionElements = new Set([
  'a',
  'button',
  'input',
  'select',
  'summary',
  'textarea',
]);

export const Search = forwardRef<InputRef, SearchProps>(
  (
    {
      allowClear,
      className,
      classNames: semanticClassNames,
      defaultValue,
      disabled: disabledProp,
      dropdownLabel = '关键词',
      enterButton,
      error,
      icon,
      iconPosition,
      onBlur,
      onChange,
      onClear,
      onCompositionEnd,
      onCompositionStart,
      onFocus,
      onKeyDown,
      onPressEnter,
      onSearch,
      prefix,
      readOnly,
      rootClassName,
      searchIcon,
      selector,
      size: sizeProp,
      status,
      style,
      styles: semanticStyles,
      suffix,
      value,
      variant = 'box',
      ...nativeProps
    },
    ref,
  ) => {
    const config = useYakitConfig();
    const disabled = disabledProp ?? config.componentDisabled;
    const size = sizeProp ?? config.componentSize;
    const inputRef = useRef<HTMLInputElement>(null);
    const rootRef = useRef<HTMLSpanElement>(null);
    const composingRef = useRef(false);
    const controlled = value !== undefined;
    const [innerValue, setInnerValue] = useState(() => String(defaultValue ?? ''));
    const [focused, setFocused] = useState(false);
    const currentValue = controlled ? String(value ?? '') : innerValue;
    const visualSize = normalizeSearchSize(size);
    const normalizedVariant =
      variant === 'default' ? 'box' : variant === 'primary' ? 'main-bg' : variant;
    const compositionVariant = normalizedVariant === 'main-bg' || normalizedVariant === 'dropdown';
    const resolvedIconPosition = iconPosition ?? (compositionVariant ? 'back' : 'front');
    const defaultIcon = disabled ? searchDisabled : searchDefault;
    const resolvedIcon = icon === false ? null : (icon ?? defaultIcon);
    const leadingIcon = resolvedIconPosition === 'front' || resolvedIconPosition === 'both';
    const trailingIcon = resolvedIconPosition === 'back' || resolvedIconPosition === 'both';
    const hasAction =
      compositionVariant ||
      (enterButton !== undefined && enterButton !== false) ||
      searchIcon !== undefined ||
      trailingIcon;
    const mergedStatus = status ?? (error ? 'error' : undefined);
    const semanticInfo: InputSemanticInfo = {
      disabled: Boolean(disabled),
      focused,
      value: currentValue,
    };
    const slotClasses: SearchSemanticClassNames | undefined =
      typeof semanticClassNames === 'function'
        ? semanticClassNames(semanticInfo)
        : semanticClassNames;
    const slotStyles: SearchSemanticStyles | undefined =
      typeof semanticStyles === 'function' ? semanticStyles(semanticInfo) : semanticStyles;

    useEffect(() => {
      const form = inputRef.current?.form;
      if (!form || controlled) return;
      const reset = () => setInnerValue(String(defaultValue ?? ''));
      form.addEventListener('reset', reset);
      return () => form.removeEventListener('reset', reset);
    }, [controlled, defaultValue, nativeProps.form]);

    useImperativeHandle(ref, () => ({
      input: inputRef.current,
      nativeElement: rootRef.current,
      focus: (options) => inputRef.current?.focus(options),
      blur: () => inputRef.current?.blur(),
      select: () => inputRef.current?.select(),
      setSelectionRange: (...args) => inputRef.current?.setSelectionRange(...args),
    }));

    const emitSearch = (
      event: Parameters<NonNullable<SearchProps['onSearch']>>[1],
      source: 'clear' | 'input',
    ) => {
      onSearch?.(source === 'clear' ? '' : currentValue, event, { source });
    };

    const handleAction = (event: MouseEvent<HTMLElement>) => emitSearch(event, 'input');

    const actionClassName = classNames(
      `${prefixCls}-search-btn`,
      `${prefixCls}-slot-button`,
      slotClasses?.button?.root,
    );
    const customAction =
      isValidElement<SearchEnterButtonProps>(enterButton) &&
      ((typeof enterButton.type === 'string' && interactiveActionElements.has(enterButton.type)) ||
        (typeof enterButton.type !== 'string' && enterButton.type !== Fragment))
        ? (enterButton as ReactElement<SearchEnterButtonProps>)
        : null;
    const customActionDisabled = Boolean(disabled || customAction?.props.disabled);
    const action = customAction ? (
      cloneElement(customAction, {
        'aria-disabled':
          customAction.type === 'a' || customAction.type === 'summary'
            ? customActionDisabled
            : customAction.props['aria-disabled'],
        'aria-label': customAction.props['aria-label'] ?? config.locale.Search?.search ?? '搜索',
        className: classNames(actionClassName, customAction.props.className),
        disabled:
          customAction.type === 'a' || customAction.type === 'summary'
            ? undefined
            : customActionDisabled,
        onClick: (event) => {
          if (customActionDisabled) {
            event.preventDefault();
            return;
          }
          customAction.props.onClick?.(event);
          if (!event.defaultPrevented) handleAction(event);
        },
        style: { ...slotStyles?.button?.root, ...customAction.props.style },
        tabIndex:
          customActionDisabled && (customAction.type === 'a' || customAction.type === 'summary')
            ? -1
            : customAction.props.tabIndex,
        ...(customAction.type === 'button'
          ? { type: (customAction.props.type ?? 'button') as 'button' | 'reset' | 'submit' }
          : undefined),
      })
    ) : (
      <button
        aria-label={
          typeof enterButton === 'string' ? undefined : (config.locale.Search?.search ?? '搜索')
        }
        className={actionClassName}
        disabled={disabled}
        onClick={handleAction}
        style={slotStyles?.button?.root}
        type="button"
      >
        <span className={slotClasses?.button?.icon} style={slotStyles?.button?.icon}>
          {enterButton === true
            ? renderIcon(searchIcon ?? (compositionVariant ? searchWhite : resolvedIcon))
            : typeof enterButton === 'string'
              ? enterButton
              : renderIcon(
                  searchIcon ??
                    (compositionVariant ? searchWhite : trailingIcon ? resolvedIcon : null),
                )}
        </span>
      </button>
    );

    return (
      <span
        className={classNames(
          prefixCls,
          `${prefixCls}-${visualSize}`,
          `${prefixCls}-${normalizedVariant}`,
          mergedStatus && `${prefixCls}-status-${mergedStatus}`,
          {
            [`${prefixCls}-disabled`]: disabled,
            [`${prefixCls}-error`]: mergedStatus === 'error',
            [`${prefixCls}-focused`]: focused,
            [`${prefixCls}-has-action`]: hasAction,
          },
          slotClasses?.root,
          className,
          rootClassName,
        )}
        data-theme={config.mode}
        dir={config.direction}
        ref={rootRef}
        style={
          {
            ...getYakitTokenVariables(config.token),
            ...slotStyles?.root,
            ...style,
          } as YakitCSSProperties
        }
      >
        {normalizedVariant === 'dropdown' &&
          (selector ? (
            <span className={`${prefixCls}-selector-wrap`}>
              <select
                aria-label={selector['aria-label'] ?? config.locale.Search?.scope ?? '搜索范围'}
                className={`${prefixCls}-selector`}
                defaultValue={selector.defaultValue}
                disabled={disabled || selector.disabled}
                onChange={(event) => selector.onChange?.(event.target.value, event)}
                value={selector.value}
              >
                {selector.options.map((option) => (
                  <option disabled={option.disabled} key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <img alt="" className={`${prefixCls}-selector-icon`} src={chevronDown} />
            </span>
          ) : (
            <span className={`${prefixCls}-selector ${prefixCls}-selector-static`}>
              <span>{dropdownLabel}</span>
              <img alt="" className={`${prefixCls}-selector-icon`} src={chevronDown} />
            </span>
          ))}

        <span className={`${prefixCls}-slot-control`}>
          {(leadingIcon || prefix) && (
            <span
              className={classNames(`${prefixCls}-slot-prefix`, slotClasses?.prefix)}
              style={slotStyles?.prefix}
            >
              {leadingIcon && renderIcon(resolvedIcon)}
              {prefix}
            </span>
          )}
          <input
            {...nativeProps}
            aria-invalid={nativeProps['aria-invalid'] ?? (mergedStatus === 'error' || undefined)}
            className={classNames(`${prefixCls}-slot-field`, slotClasses?.input)}
            disabled={disabled}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              if (!controlled) setInnerValue(event.target.value);
              onChange?.(event);
            }}
            onCompositionEnd={(event) => {
              composingRef.current = false;
              onCompositionEnd?.(event);
            }}
            onCompositionStart={(event) => {
              composingRef.current = true;
              onCompositionStart?.(event);
            }}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onKeyDown={(event) => {
              onKeyDown?.(event);
              if (
                !event.defaultPrevented &&
                event.key === 'Enter' &&
                !composingRef.current &&
                !event.nativeEvent.isComposing
              ) {
                onPressEnter?.(event);
                if (!event.defaultPrevented) emitSearch(event, 'input');
              }
            }}
            readOnly={readOnly}
            ref={inputRef}
            style={slotStyles?.input}
            value={currentValue}
          />
          {allowClear && currentValue && !disabled && !readOnly && (
            <button
              aria-label={config.locale.Input?.clear ?? '清除'}
              className={classNames(
                `${prefixCls}-field-clear-icon`,
                `${prefixCls}-slot-clear`,
                slotClasses?.clear,
              )}
              onClick={(event) => {
                if (inputRef.current) setNativeValue(inputRef.current, '');
                onClear?.();
                onSearch?.('', event, { source: 'clear' });
                inputRef.current?.focus();
              }}
              style={slotStyles?.clear}
              type="button"
            >
              {typeof allowClear === 'object' ? (allowClear.clearIcon ?? '×') : '×'}
            </button>
          )}
          {suffix && (
            <span
              className={classNames(`${prefixCls}-slot-suffix`, slotClasses?.suffix)}
              style={slotStyles?.suffix}
            >
              {suffix}
            </span>
          )}
          {hasAction && action}
        </span>
      </span>
    );
  },
);

export const SearchTrigger = forwardRef<HTMLButtonElement, SearchTriggerProps>(
  (
    {
      size: sizeProp,
      icon = searchDefault,
      onPress,
      onClick,
      className,
      disabled: disabledProp,
      style,
      ...props
    },
    ref,
  ) => {
    const config = useYakitConfig();
    const size = sizeProp ?? config.componentSize;
    const disabled = disabledProp ?? config.componentDisabled;
    const visualSize = normalizeSearchSize(size);

    return (
      <button
        {...props}
        aria-label={props['aria-label'] ?? config.locale.Search?.search ?? '搜索'}
        className={classNames(
          prefixCls,
          `${prefixCls}-${visualSize}`,
          `${prefixCls}-icon-only`,
          { [`${prefixCls}-disabled`]: disabled },
          className,
        )}
        disabled={disabled}
        data-theme={config.mode}
        dir={config.direction}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) onPress?.(event);
        }}
        ref={ref}
        style={{ ...getYakitTokenVariables(config.token), ...style }}
        type="button"
      >
        <span className={`${prefixCls}-icon`}>{renderIcon(disabled ? searchDisabled : icon)}</span>
      </button>
    );
  },
);

Search.displayName = 'Input.Search';
SearchTrigger.displayName = 'Input.SearchTrigger';
