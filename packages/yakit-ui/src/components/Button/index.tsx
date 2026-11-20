import { Button as InternalButton } from './Button'
import { Group } from './Group'
import type {
  ButtonColors,
  ButtonGroupProps,
  ButtonHTMLType,
  ButtonLoading,
  ButtonProps,
  ButtonShape,
  ButtonSize,
  ButtonType,
} from './type'

type CompoundedButton = typeof InternalButton & {
  Group: typeof Group
}

const Button = InternalButton as CompoundedButton
Button.Group = Group

export type {
  ButtonColors,
  ButtonGroupProps,
  ButtonHTMLType,
  ButtonLoading,
  ButtonProps,
  ButtonShape,
  ButtonSize,
  ButtonType,
}
export default Button
