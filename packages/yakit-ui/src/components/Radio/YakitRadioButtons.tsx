import type { FC } from 'react'

import Group from './Group'
import type { YakitRadioButtonsProps } from './type'

/**
 * 按钮单选框 — 对齐主项目 YakitRadioButtons API，可直接替换 import。
 * 内部强制 optionType="button"；视觉见 buttonStyle solid/outline + size。
 */
export const YakitRadioButtons: FC<YakitRadioButtonsProps> = (props) => {
  const { className, size = 'middle', wrapClassName, buttonStyle, ...restProps } = props
  return (
    <Group
      {...restProps}
      optionType="button"
      buttonStyle={buttonStyle}
      size={size}
      className={className}
      wrapClassName={wrapClassName}
    />
  )
}

YakitRadioButtons.displayName = 'YakitRadioButtons'

export default YakitRadioButtons
