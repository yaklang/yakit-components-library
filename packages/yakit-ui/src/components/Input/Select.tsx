import classNames from 'classnames';
import { forwardRef } from 'react';

import chevronDown from '../SearchInput/assets/chevron-down.svg';

import type { InputSelectProps } from './type';

const prefixCls = 'yakit-input';

/**
 * A focusable compact selector for the leading or trailing segment of an Input.
 * It composes through `prefix` or `suffix`, so it does not revive the deprecated
 * Ant Design addon APIs.
 */
export const Select = forwardRef<HTMLButtonElement, InputSelectProps>(
  ({ children, className, disabled, ...props }, ref) => (
    <button
      {...props}
      className={classNames(`${prefixCls}-select`, className)}
      disabled={disabled}
      ref={ref}
      type="button"
    >
      <span className={`${prefixCls}-select-label`}>{children}</span>
      <img alt="" className={`${prefixCls}-select-icon`} src={chevronDown} />
    </button>
  ),
);

Select.displayName = 'Input.Select';
