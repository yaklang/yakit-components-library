import Group from './Group'
import { Radio as InternalRadio } from './Radio'
import { RadioButton } from './RadioButton'
import { YakitRadioButtons } from './YakitRadioButtons'

export type {
  RadioButtonsSize,
  RadioChangeEvent,
  RadioChangeEventTarget,
  RadioGroupButtonStyle,
  RadioGroupOption,
  RadioGroupOptionType,
  RadioGroupOrientation,
  RadioGroupProps,
  RadioOptionType,
  RadioProps,
  RadioRef,
  RadioSize,
  RadioValue,
  YakitRadioButtonsProps,
} from './type'

export type { RadioButtonProps } from './RadioButton'

export { RadioButton, YakitRadioButtons }

type CompoundedRadio = typeof InternalRadio & {
  Group: typeof Group
  Button: typeof RadioButton
}

const Radio = InternalRadio as CompoundedRadio
Radio.Group = Group
Radio.Button = RadioButton

export default Radio
