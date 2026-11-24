import { Dropdown as InternalDropdown } from './Dropdown';
import DropdownButton from './DropdownButton';
import { YakitDropdownMenu } from './YakitDropdownMenu';

export type {
  DropdownButtonProps,
  DropdownButtonType,
  DropdownMenuDivider,
  DropdownMenuGroup,
  DropdownMenuInfo,
  DropdownMenuItem,
  DropdownMenuItemType,
  DropdownMenuItemTypeUnion,
  DropdownMenuProps,
  DropdownMenuSize,
  DropdownMenuType,
  DropdownPlacement,
  DropdownProps,
  DropdownSemanticClassNames,
  DropdownSemanticInfo,
  DropdownSemanticStyles,
  DropdownTrigger,
  YakitDropdownMenuProps,
} from './type';

export { DropdownMenuPanel } from './DropdownMenu';
export { YakitDropdownMenu };
export { DropdownButton };

type CompoundedDropdown = typeof InternalDropdown & {
  Button: typeof DropdownButton;
};

const Dropdown = InternalDropdown as CompoundedDropdown;
Dropdown.Button = DropdownButton;

export { Dropdown };
export default Dropdown;
