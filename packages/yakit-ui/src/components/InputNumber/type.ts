import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react';

export type InputNumberValue = string | number;
export type InputNumberSize = 'small' | 'medium' | 'middle' | 'large' | 'huge';
export type InputNumberStatus = 'error' | 'warning';

export interface InputNumberFocusOptions {
  cursor?: 'start' | 'end' | 'all';
  preventScroll?: boolean;
}

export interface InputNumberRef {
  blur: () => void;
  focus: (options?: InputNumberFocusOptions) => void;
  nativeElement: HTMLElement;
}

export interface InputNumberControlIcons {
  downIcon?: ReactNode;
  upIcon?: ReactNode;
}

export type InputNumberControls = 'vertical' | 'horizontal' | false | InputNumberControlIcons;

export interface InputNumberSemanticInfo<T extends InputNumberValue = InputNumberValue> {
  props: Readonly<InputNumberProps<T>>;
}

export interface InputNumberSemanticClassNames {
  action?: string;
  actions?: string;
  input?: string;
  prefix?: string;
  root?: string;
  suffix?: string;
}

export interface InputNumberSemanticStyles {
  action?: CSSProperties;
  actions?: CSSProperties;
  input?: CSSProperties;
  prefix?: CSSProperties;
  root?: CSSProperties;
  suffix?: CSSProperties;
}

export interface InputNumberStepInfo {
  emitter: 'handler' | 'keyboard';
  offset: string;
  type: 'down' | 'up';
}

export interface InputNumberFormatterInfo {
  input: string;
  userTyping: boolean;
}

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | 'children'
  | 'className'
  | 'defaultValue'
  | 'inputMode'
  | 'onChange'
  | 'prefix'
  | 'size'
  | 'style'
  | 'suffix'
  | 'type'
  | 'value'
>;

export interface InputNumberProps<T extends InputNumberValue = InputNumberValue>
  extends NativeInputProps {
  className?: string;
  classNames?:
    | InputNumberSemanticClassNames
    | ((info: InputNumberSemanticInfo<T>) => InputNumberSemanticClassNames);
  controls?: InputNumberControls;
  defaultValue?: T | null;
  error?: boolean;
  formatter?: (value: T | string | number | undefined, info: InputNumberFormatterInfo) => string;
  keyboard?: boolean;
  max?: T | number;
  min?: T | number;
  onChange?: (value: T | null) => void;
  onStep?: (value: T, info: InputNumberStepInfo) => void;
  parser?: (displayValue: string | undefined) => InputNumberValue;
  precision?: number;
  prefix?: ReactNode;
  rootClassName?: string;
  size?: InputNumberSize;
  status?: InputNumberStatus;
  step?: string | number;
  stringMode?: boolean;
  style?: CSSProperties;
  styles?:
    | InputNumberSemanticStyles
    | ((info: InputNumberSemanticInfo<T>) => InputNumberSemanticStyles);
  suffix?: ReactNode;
  value?: T | null;
}
