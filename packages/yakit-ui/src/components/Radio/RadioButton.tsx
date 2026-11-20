import { forwardRef } from 'react';

import { RadioOptionTypeContext } from './GroupContext';
import { Radio } from './Radio';
import type { RadioProps, RadioRef } from './type';

/** 与 antd Radio.Button 同义：RadioProps + ref */
export type RadioButtonProps = RadioProps;

/**
 * 按钮形态 Radio，对齐 antd Radio.Button。
 * 通过 RadioOptionTypeContext 告知内部渲染 ant-radio-button-* DOM；
 * 在 Radio.Group（任意 optionType）内均可使用，并吃到 Group 的 buttonStyle / size。
 */
export const RadioButton = forwardRef<RadioRef, RadioButtonProps>(function RadioButton(props, ref) {
  return (
    <RadioOptionTypeContext.Provider value="button">
      <Radio {...props} ref={ref} />
    </RadioOptionTypeContext.Provider>
  );
});

RadioButton.displayName = 'Radio.Button';

export default RadioButton;
