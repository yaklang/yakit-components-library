import type {
  ButtonHTMLAttributes,
  ChangeEvent,
  CSSProperties,
  FocusEvent,
  InputHTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';

export type InputSize = 'small' | 'medium' | 'large' | 'middle';
export type InputStatus = 'error' | 'warning';
export type InputVariant = 'outlined' | 'borderless' | 'filled' | 'underlined';
type NativeFocusOptions = Parameters<HTMLElement['focus']>[0];

export interface InputSemanticInfo {
  focused: boolean;
  disabled: boolean;
  value: string;
}

export interface InputSemanticClassNames {
  clear?: string;
  count?: string;
  input?: string;
  prefix?: string;
  root?: string;
  suffix?: string;
}

export interface InputSemanticStyles {
  clear?: CSSProperties;
  count?: CSSProperties;
  input?: CSSProperties;
  prefix?: CSSProperties;
  root?: CSSProperties;
  suffix?: CSSProperties;
}

type SemanticValue<T> = T | ((info: InputSemanticInfo) => T);

export interface InputRef {
  input: HTMLInputElement | null;
  nativeElement: HTMLElement | null;
  focus: (options?: NativeFocusOptions) => void;
  blur: () => void;
  select: () => void;
  setSelectionRange: HTMLInputElement['setSelectionRange'];
}

export interface TextAreaRef {
  resizableTextArea: { textArea: HTMLTextAreaElement | null };
  nativeElement: HTMLTextAreaElement | null;
  focus: (options?: NativeFocusOptions) => void;
  blur: () => void;
}

export interface OTPRef {
  nativeElement: HTMLDivElement | null;
  focus: (index?: number) => void;
  blur: () => void;
}

interface ErrorCompatibilityProps {
  /** @deprecated 请使用 `status="error"`。显式 status 的优先级更高。 */
  error?: boolean;
}

interface YakitSizeProps {
  /** `middle` 是兼容别名，视觉上等同 `medium`。 */
  size?: InputSize;
}

interface SharedInputProps extends ErrorCompatibilityProps, YakitSizeProps {
  allowClear?: boolean | { clearIcon?: ReactNode };
  classNames?: SemanticValue<InputSemanticClassNames>;
  count?: {
    formatter?: (info: { value: string; count: number; maxLength?: number }) => ReactNode;
    max?: number;
    strategy?: (value: string) => number;
  };
  onClear?: () => void;
  prefix?: ReactNode;
  rootClassName?: string;
  showCount?:
    | boolean
    | { formatter?: (info: { value: string; count: number; maxLength?: number }) => ReactNode };
  status?: InputStatus;
  styles?: SemanticValue<InputSemanticStyles>;
  suffix?: ReactNode;
  variant?: InputVariant;
}

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'prefix' | 'size' | 'style'
>;

export interface InputProps extends NativeInputProps, SharedInputProps {
  className?: string;
  onPressEnter?: (event: KeyboardEvent<HTMLInputElement>) => void;
  style?: CSSProperties;
}

export interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'size' | 'style'>,
    ErrorCompatibilityProps,
    YakitSizeProps {
  allowClear?: boolean | { clearIcon?: ReactNode };
  autoSize?: boolean | { minRows?: number; maxRows?: number };
  className?: string;
  classNames?: SemanticValue<
    Pick<InputSemanticClassNames, 'clear' | 'count' | 'root'> & { textarea?: string }
  >;
  count?: SharedInputProps['count'];
  onClear?: () => void;
  rootClassName?: string;
  showCount?: SharedInputProps['showCount'];
  status?: InputStatus;
  style?: CSSProperties;
  styles?: SemanticValue<
    Pick<InputSemanticStyles, 'clear' | 'count' | 'root'> & { textarea?: CSSProperties }
  >;
  variant?: InputVariant;
}

export interface PasswordVisibilityToggle {
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  tabIndex?: number;
}

export interface PasswordProps extends InputProps {
  iconRender?: (visible: boolean) => ReactNode;
  visibilityToggle?: boolean | PasswordVisibilityToggle;
}

export interface OTPSemanticInfo {
  disabled: boolean;
  value: string;
}

export interface OTPProps
  extends Omit<
      InputHTMLAttributes<HTMLInputElement>,
      | 'className'
      | 'defaultValue'
      | 'maxLength'
      | 'onChange'
      | 'onInput'
      | 'size'
      | 'style'
      | 'value'
    >,
    ErrorCompatibilityProps,
    YakitSizeProps {
  className?: string;
  classNames?:
    | { input?: string; root?: string; separator?: string }
    | ((info: OTPSemanticInfo) => { input?: string; root?: string; separator?: string });
  defaultValue?: string;
  formatter?: (value: string) => string;
  length?: number;
  mask?: boolean;
  onChange?: (value: string) => void;
  onInput?: (value: string[]) => void;
  rootClassName?: string;
  separator?: ReactNode | ((index: number) => ReactNode);
  status?: InputStatus;
  style?: CSSProperties;
  styles?:
    | { input?: CSSProperties; root?: CSSProperties; separator?: CSSProperties }
    | ((info: OTPSemanticInfo) => {
        input?: CSSProperties;
        root?: CSSProperties;
        separator?: CSSProperties;
      });
  value?: string;
}

export type SearchInputSize = InputSize | 'huge';
export type SearchInputVariant =
  | 'box'
  | 'main-bg'
  | 'dropdown'
  | 'default'
  | 'primary'
  | InputVariant;
export type SearchIconPosition = 'front' | 'back' | 'both';
export type SearchSource = 'clear' | 'input';

export interface SearchSelectorOption {
  disabled?: boolean;
  label: ReactNode;
  value: string;
}

export interface SearchSelectorProps {
  'aria-label'?: string;
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (value: string, event: ChangeEvent<HTMLSelectElement>) => void;
  options: SearchSelectorOption[];
  value?: string;
}

export interface SearchSemanticClassNames extends InputSemanticClassNames {
  button?: { icon?: string; root?: string };
}

export interface SearchSemanticStyles extends InputSemanticStyles {
  button?: { icon?: CSSProperties; root?: CSSProperties };
}

export interface SearchEnterButtonProps {
  'aria-disabled'?: boolean | 'false' | 'true';
  'aria-label'?: string;
  className?: string;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  style?: CSSProperties;
  tabIndex?: number;
  type?: string;
}

export type SearchEnterButton = boolean | string | ReactElement<SearchEnterButtonProps>;

export interface SearchProps
  extends Omit<
    InputProps,
    'classNames' | 'onPressEnter' | 'prefix' | 'size' | 'styles' | 'suffix' | 'variant'
  > {
  classNames?: SearchSemanticClassNames | ((info: InputSemanticInfo) => SearchSemanticClassNames);
  dropdownLabel?: ReactNode;
  enterButton?: SearchEnterButton;
  icon?: ReactNode | false;
  iconPosition?: SearchIconPosition;
  onPressEnter?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSearch?: (
    value: string,
    event?:
      | ChangeEvent<HTMLInputElement>
      | KeyboardEvent<HTMLInputElement>
      | MouseEvent<HTMLElement>,
    info?: { source: SearchSource },
  ) => void;
  prefix?: ReactNode;
  searchIcon?: ReactNode;
  selector?: SearchSelectorProps;
  size?: SearchInputSize;
  styles?: SearchSemanticStyles | ((info: InputSemanticInfo) => SearchSemanticStyles);
  suffix?: ReactNode;
  variant?: SearchInputVariant;
}

export interface SearchTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon?: ReactNode;
  onPress?: (event: MouseEvent<HTMLButtonElement>) => void;
  size?: SearchInputSize;
}

export interface InputSelectProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  children: ReactNode;
}

export type InputChangeEvent = ChangeEvent<HTMLInputElement>;
export type InputFocusEvent = FocusEvent<HTMLInputElement>;
