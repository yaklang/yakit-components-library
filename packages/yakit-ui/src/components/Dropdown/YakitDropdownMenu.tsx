import classNames from 'classnames';
import { memo, type ReactNode } from 'react';

import { Dropdown } from './Dropdown';
import type { YakitDropdownMenuProps } from './type';

const yakitPrefix = 'yakit-dropdown';

/**
 * 主项目同名封装：dropdown 配置 + menu 配置。
 * 对齐 yakit/YakitDropdownMenu（antd Dropdown + YakitMenu）。
 * 必须把 menu 交给 Dropdown，再在 popupRender 里包一层 origin，
 * 否则菜单项拿不到 onItemClick，点击后不会关闭。
 */
export const YakitDropdownMenu = memo(function YakitDropdownMenu(props: YakitDropdownMenuProps) {
  const { dropdown = {}, menu, children } = props;
  const { dropdownRender, ...dropdownProps } = dropdown;
  const { menuWrapperClassName, ...resetMenu } = menu;

  return (
    <Dropdown
      {...dropdownProps}
      menu={resetMenu}
      rootClassName={classNames(`${yakitPrefix}-menu-root`, dropdown.rootClassName)}
      popupRender={(origin) => (
        <div className={classNames(`${yakitPrefix}-menu-wrapper`, menuWrapperClassName)}>
          {dropdownRender ? dropdownRender(origin) : origin}
        </div>
      )}
    >
      {children as ReactNode}
    </Dropdown>
  );
});

YakitDropdownMenu.displayName = 'YakitDropdownMenu';

export default YakitDropdownMenu;
