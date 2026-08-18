import classNames from 'classnames';
import { type FC, useRef } from 'react';

import useComponentStyle from '../../hooks/useComponentStyle';

import chevronDown from './assets/chevron-down.svg';
import searchDefault from './assets/search-default.svg';
import searchDisabled from './assets/search-disabled.svg';
import searchWhite from './assets/search-white.svg';
import searchInputStyle from './style';
import type { SearchInputProps } from './type';

const prefixCls = 'yakit-search-input';

export const SearchInput: FC<SearchInputProps> = ({
  size = 'medium',
  icon,
  iconPosition = 'front',
  suffix,
  variant = 'box',
  dropdownLabel = '关键词',
  onSearch,
  className,
  rootClassName,
  style,
  disabled,
  ...inputProps
}) => {
  const { wrapSSR, hashId } = useComponentStyle(prefixCls, searchInputStyle);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedVariant =
    variant === 'default' ? 'box' : variant === 'primary' ? 'main-bg' : variant;
  const searchIcon = icon === undefined ? searchDefault : icon;
  const iconElement = searchIcon && (
    <span className={classNames(`${prefixCls}-icon`, hashId)}>
      {typeof searchIcon === 'string' ? <img alt="" src={searchIcon} /> : searchIcon}
    </span>
  );
  const disabledIcon = <img alt="" src={searchDisabled} />;
  const classes = classNames(prefixCls, hashId, className, rootClassName, {
    [`${prefixCls}-${size}`]: size,
    [`${prefixCls}-${normalizedVariant}`]: normalizedVariant,
    [`${prefixCls}-disabled`]: disabled,
  });

  const triggerSearch = () => onSearch?.(inputRef.current?.value ?? '');

  if (normalizedVariant === 'icon-only' || iconPosition === 'only') {
    return wrapSSR(
      <button
        aria-label="搜索"
        className={classes}
        disabled={disabled}
        onClick={triggerSearch}
        style={style}
        type="button"
      >
        {disabled ? disabledIcon : iconElement}
      </button>,
    );
  }

  const input = (
    <input
      {...inputProps}
      className={classNames(`${prefixCls}-element`, hashId)}
      disabled={disabled}
      ref={inputRef}
    />
  );

  const searchAction = (
    <button
      aria-label="搜索"
      className={classNames(`${prefixCls}-action`, hashId)}
      disabled={disabled}
      onClick={triggerSearch}
      type="button"
    >
      <img alt="" src={searchWhite} />
    </button>
  );

  if (normalizedVariant === 'dropdown') {
    return wrapSSR(
      <span className={classes} style={style}>
        <button
          className={classNames(`${prefixCls}-dropdown-trigger`, hashId)}
          disabled={disabled}
          type="button"
        >
          <span>{dropdownLabel}</span>
          <img alt="" src={chevronDown} />
        </button>
        <span className={classNames(`${prefixCls}-input-area`, hashId)}>{input}</span>
        {searchAction}
      </span>,
    );
  }

  if (normalizedVariant === 'main-bg') {
    return wrapSSR(
      <span className={classes} style={style}>
        <span className={classNames(`${prefixCls}-input-area`, hashId)}>{input}</span>
        {searchAction}
      </span>,
    );
  }

  return wrapSSR(
    <span className={classes} style={style}>
      {(iconPosition === 'front' || iconPosition === 'both') &&
        (disabled ? disabledIcon : iconElement)}
      {input}
      {(iconPosition === 'back' || iconPosition === 'both') &&
        (disabled ? disabledIcon : iconElement)}
      {suffix && <span className={classNames(`${prefixCls}-suffix`, hashId)}>{suffix}</span>}
    </span>,
  );
};
