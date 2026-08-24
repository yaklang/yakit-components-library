import { Input as AntInput } from 'antd';
import type { InputSearchSemanticAllType } from 'antd/es/input/Search';
import classNames from 'classnames';
import { forwardRef, type ElementType } from 'react';
import type React from 'react';

import useComponentStyle from '../../hooks/useComponentStyle';
import chevronDown from '../SearchInput/assets/chevron-down.svg';
import searchDefault from '../SearchInput/assets/search-default.svg';
import searchDisabled from '../SearchInput/assets/search-disabled.svg';
import searchWhite from '../SearchInput/assets/search-white.svg';
import searchInputStyle from '../SearchInput/style';

import type { InputRef, SearchInputSize, SearchProps, SearchTriggerProps } from './type';

const prefixCls = 'yakit-search-input';
type SearchSlotClassNames = InputSearchSemanticAllType['classNames'];

const AntSearchControl = AntInput.Search as unknown as ElementType;

const mergeSearchClassNames =
  (userClassNames: SearchProps['classNames']): SearchProps['classNames'] =>
  (info) => {
    const resolvedClassNames =
      typeof userClassNames === 'function' ? userClassNames(info) : userClassNames;

    return {
      ...resolvedClassNames,
      button: {
        ...resolvedClassNames?.button,
        root: classNames(`${prefixCls}-slot-button`, resolvedClassNames?.button?.root),
      },
      clear: classNames(`${prefixCls}-slot-clear`, resolvedClassNames?.clear),
      count: classNames(`${prefixCls}-slot-count`, resolvedClassNames?.count),
      input: classNames(`${prefixCls}-slot-field`, resolvedClassNames?.input),
      prefix: classNames(`${prefixCls}-slot-prefix`, resolvedClassNames?.prefix),
      root: classNames(`${prefixCls}-slot-control`, resolvedClassNames?.root),
      suffix: classNames(`${prefixCls}-slot-suffix`, resolvedClassNames?.suffix),
    } satisfies SearchSlotClassNames;
  };

const normalizeSearchSize = (size: SearchInputSize | undefined) => {
  const visualSize = size === 'middle' ? 'medium' : (size ?? 'medium');
  const antdSize = visualSize === 'huge' ? 'large' : visualSize;
  return { antdSize, visualSize } as const;
};

const renderIcon = (icon: React.ReactNode) =>
  typeof icon === 'string' ? <img alt="" src={icon} /> : icon;

export const Search = forwardRef<InputRef, SearchProps>(
  (
    {
      size,
      variant = 'box',
      iconPosition,
      icon,
      prefix,
      suffix,
      selector,
      dropdownLabel = '关键词',
      error,
      status,
      disabled,
      className,
      classNames: semanticClassNames,
      rootClassName,
      style,
      styles,
      enterButton,
      searchIcon,
      ...props
    },
    ref,
  ) => {
    const { wrapSSR, hashId } = useComponentStyle(prefixCls, searchInputStyle);
    const { antdSize, visualSize } = normalizeSearchSize(size);
    const normalizedVariant =
      variant === 'default' ? 'box' : variant === 'primary' ? 'main-bg' : variant;
    const isComposition = normalizedVariant === 'main-bg' || normalizedVariant === 'dropdown';
    const resolvedIconPosition =
      iconPosition ??
      (normalizedVariant === 'main-bg' || normalizedVariant === 'dropdown' ? 'back' : 'front');
    const antdVariant =
      normalizedVariant === 'box' || isComposition ? 'outlined' : normalizedVariant;
    const defaultIcon = disabled ? searchDisabled : searchDefault;
    const resolvedIcon = icon === false ? false : (icon ?? defaultIcon);
    const leadingIcon =
      resolvedIconPosition === 'front' || resolvedIconPosition === 'both' ? (
        <>
          {renderIcon(resolvedIcon)}
          {prefix}
        </>
      ) : (
        prefix
      );
    const trailingIcon =
      resolvedIconPosition === 'back' || resolvedIconPosition === 'both' ? resolvedIcon : false;
    const actionContent =
      enterButton ??
      (isComposition ? (
        <button aria-label="搜索" className={`${prefixCls}-slot-button`} type="button">
          <img alt="" src={searchWhite} />
        </button>
      ) : undefined);
    const hasAction =
      isComposition || enterButton !== undefined || Boolean(searchIcon ?? trailingIcon);
    const selectorDisabled = disabled || selector?.disabled;

    return wrapSSR(
      <span
        className={classNames(
          prefixCls,
          hashId,
          `${prefixCls}-${visualSize}`,
          `${prefixCls}-${normalizedVariant}`,
          {
            [`${prefixCls}-disabled`]: disabled,
            [`${prefixCls}-error`]: status === 'error' || (!status && error),
            [`${prefixCls}-has-action`]: hasAction,
          },
          className,
          rootClassName,
        )}
        style={style}
      >
        {normalizedVariant === 'dropdown' &&
          (selector ? (
            <span className={`${prefixCls}-selector-wrap`}>
              <select
                aria-label={selector['aria-label'] ?? '搜索范围'}
                className={`${prefixCls}-selector`}
                defaultValue={selector.defaultValue}
                disabled={selectorDisabled}
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
        <AntSearchControl
          {...props}
          classNames={mergeSearchClassNames(semanticClassNames)}
          disabled={disabled}
          enterButton={actionContent}
          inputPrefixCls={`${prefixCls}-field`}
          prefix={leadingIcon}
          prefixCls={`${prefixCls}-search`}
          ref={ref}
          searchIcon={searchIcon ?? renderIcon(trailingIcon)}
          size={antdSize}
          status={status ?? (error ? 'error' : undefined)}
          suffix={suffix}
          styles={styles}
          variant={antdVariant}
        />
      </span>,
    );
  },
);

export const SearchTrigger = forwardRef<HTMLButtonElement, SearchTriggerProps>(
  ({ size, icon = searchDefault, onPress, onClick, className, disabled, ...props }, ref) => {
    const { wrapSSR, hashId } = useComponentStyle(prefixCls, searchInputStyle);
    const { visualSize } = normalizeSearchSize(size);

    return wrapSSR(
      <button
        {...props}
        aria-label={props['aria-label'] ?? '搜索'}
        className={classNames(
          prefixCls,
          hashId,
          `${prefixCls}-${visualSize}`,
          `${prefixCls}-icon-only`,
          { [`${prefixCls}-disabled`]: disabled },
          className,
        )}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) onPress?.(event);
        }}
        ref={ref}
        type="button"
      >
        <span className={`${prefixCls}-icon`}>{renderIcon(disabled ? searchDisabled : icon)}</span>
      </button>,
    );
  },
);

Search.displayName = 'Input.Search';
SearchTrigger.displayName = 'Input.SearchTrigger';
