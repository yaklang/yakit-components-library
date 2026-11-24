import classNames from 'classnames';
import type { ReactNode } from 'react';

import Button, { type ButtonType } from '../Button';

import { Dropdown } from './Dropdown';
import type { DropdownButtonProps, DropdownButtonType } from './type';

const yakitPrefix = 'yakit-dropdown-button';

const mapButtonType = (type: DropdownButtonType | undefined): { type?: ButtonType } => {
  switch (type) {
    case 'primary':
      return { type: 'primary' };
    case 'dashed':
    case 'default':
      return { type: 'outline1' };
    case 'link':
      return { type: 'link1' };
    case 'text':
    case 'text1':
      return { type: 'text' };
    case 'text2':
      return { type: 'text2' };
    case 'secondary1':
      return { type: 'secondary1' };
    case 'secondary2':
      return { type: 'secondary2' };
    case 'outline1':
      return { type: 'outline1' };
    case 'outline2':
      return { type: 'outline2' };
    default:
      return { type: 'outline1' };
  }
};

/**
 * 对齐 antd Dropdown.Button：左侧主按钮 + 右侧展开。
 * 视觉用库内 Button，避免引入 antd Button 标记。
 */
export function DropdownButton({
  type = 'default',
  danger,
  disabled,
  loading,
  icon,
  children,
  onClick,
  buttonsRender,
  className,
  rootClassName,
  style,
  ...dropdownProps
}: DropdownButtonProps) {
  const mapped = mapButtonType(type);
  const left = (
    <Button
      type={mapped.type}
      danger={danger}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
    >
      {children}
    </Button>
  );
  const right = (
    <Button
      type={mapped.type}
      danger={danger}
      disabled={disabled}
      aria-label="more"
      icon={icon ?? <span className={`${yakitPrefix}-ellipsis`}>⋯</span>}
    />
  );

  const [leftBtn, rightBtn] = buttonsRender ? buttonsRender([left, right]) : [left, right];

  return (
    <div className={classNames(yakitPrefix, className, rootClassName)} style={style}>
      {leftBtn}
      <Dropdown disabled={disabled} {...dropdownProps}>
        <span className={`${yakitPrefix}-trigger`}>{rightBtn as ReactNode}</span>
      </Dropdown>
    </div>
  );
}

DropdownButton.displayName = 'DropdownButton';

export default DropdownButton;
