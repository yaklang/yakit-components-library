import type { InputNumberProps as AntInputNumberProps } from 'antd/es/input-number';

export type InputNumberValue = string | number;
export type InputNumberSize = 'small' | 'medium' | 'middle' | 'large' | 'huge';

export interface InputNumberFocusOptions {
  cursor?: 'start' | 'end' | 'all';
  preventScroll?: boolean;
}

/** Public ref methods forwarded by Ant Design's numeric input. */
export interface InputNumberRef extends HTMLInputElement {
  blur: () => void;
  focus: (options?: InputNumberFocusOptions) => void;
  nativeElement: HTMLElement;
}

export type InputNumberControls =
  | 'vertical'
  | 'horizontal'
  | NonNullable<AntInputNumberProps<InputNumberValue>['controls']>;

export interface InputNumberProps<T extends InputNumberValue = InputNumberValue>
  extends Omit<
    AntInputNumberProps<T>,
    'addonAfter' | 'addonBefore' | 'bordered' | 'controls' | 'prefixCls' | 'size' | 'status'
  > {
  /** Yakit sizes. `middle` remains as an Ant Design 6 compatibility alias for `medium`. */
  size?: InputNumberSize;
  /** Legacy layout names map to Ant Design's input and spinner modes. */
  controls?: InputNumberControls;
  /** Compatibility alias for `status="error"`. Explicit `status` wins. */
  error?: boolean;
  status?: AntInputNumberProps<T>['status'];
}
