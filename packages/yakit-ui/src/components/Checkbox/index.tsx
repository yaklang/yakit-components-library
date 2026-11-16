import { Checkbox as BaseCheckbox } from './Checkbox';
import { CheckboxGroup } from './Group';
import type {
  CheckboxChangeEvent,
  CheckboxGroupProps,
  CheckboxOptionType,
  CheckboxProps,
  CheckboxRef,
  CheckboxSize,
  CheckboxValueType,
} from './type';

type CompoundedCheckbox = typeof BaseCheckbox & {
  Group: typeof CheckboxGroup;
};

const Checkbox = BaseCheckbox as CompoundedCheckbox;
Checkbox.Group = CheckboxGroup;

export type {
  CheckboxChangeEvent,
  CheckboxGroupProps,
  CheckboxOptionType,
  CheckboxProps,
  CheckboxRef,
  CheckboxSize,
  CheckboxValueType,
};
export { CheckboxGroup };
export default Checkbox;
