import type { InputHTMLAttributes } from 'react';

import type { BaseProps } from '../../types/common';

export type InputNumberSize = 'small' | 'medium' | 'large' | 'huge';

export interface InputNumberProps
  extends BaseProps,
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      'defaultValue' | 'onChange' | 'size' | 'type' | 'value'
    > {
  size?: InputNumberSize;
  value?: number | null;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  controls?: 'vertical' | 'horizontal' | false;
  onChange?: (value: number | null) => void;
}
