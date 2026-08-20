import type { InputRef } from 'antd';
import type {
  InputProps as AntInputProps,
  PasswordProps as AntPasswordProps,
  SearchProps as AntSearchProps,
  TextAreaProps as AntTextAreaProps,
} from 'antd/es/input';
import type { OTPProps as AntOTPProps, OTPRef } from 'antd/es/input/OTP';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import type {
  ButtonHTMLAttributes,
  ChangeEvent,
  CSSProperties,
  MouseEvent,
  ReactNode,
} from 'react';

export type InputSize = 'small' | 'medium' | 'large' | 'middle';
export type InputStatus = AntInputProps['status'];

interface ErrorCompatibilityProps {
  /** @deprecated 请使用 `status="error"`。显式 status 的优先级更高。 */
  error?: boolean;
}

interface YakitSizeProps {
  /** `middle` 是 Ant Design 6.5 兼容别名，视觉上等同 `medium`。 */
  size?: InputSize;
}

type RemovedInputProps = 'addonBefore' | 'addonAfter' | 'bordered' | 'size';

export interface InputProps
  extends Omit<AntInputProps, RemovedInputProps>,
    ErrorCompatibilityProps,
    YakitSizeProps {}

export interface TextAreaProps
  extends Omit<AntTextAreaProps, 'bordered' | 'size'>,
    ErrorCompatibilityProps,
    YakitSizeProps {}

export interface PasswordProps
  extends Omit<AntPasswordProps, RemovedInputProps>,
    ErrorCompatibilityProps,
    YakitSizeProps {}

export interface OTPProps
  extends Omit<AntOTPProps, 'size'>,
    ErrorCompatibilityProps,
    YakitSizeProps {}

export type SearchInputSize = InputSize | 'huge';
export type SearchInputVariant =
  | 'box'
  | 'main-bg'
  | 'dropdown'
  | 'default'
  | 'primary'
  | NonNullable<AntSearchProps['variant']>;
export type SearchIconPosition = 'front' | 'back' | 'both';

export interface SearchSelectorOption {
  disabled?: boolean;
  label: ReactNode;
  value: string;
}

export interface SearchSelectorProps {
  /** 无障碍名称；未提供时使用“搜索范围”。 */
  'aria-label'?: string;
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (value: string, event: ChangeEvent<HTMLSelectElement>) => void;
  options: SearchSelectorOption[];
  value?: string;
}

export interface SearchProps
  extends Omit<
      AntSearchProps,
      | RemovedInputProps
      | 'size'
      | 'prefix'
      | 'suffix'
      | 'onSearch'
      | 'className'
      | 'style'
      | 'variant'
    >,
    ErrorCompatibilityProps {
  className?: string;
  style?: CSSProperties;
  /** 默认保持当前 Yakit 的 medium 尺寸。 */
  size?: SearchInputSize;
  variant?: SearchInputVariant;
  iconPosition?: SearchIconPosition;
  /** 自定义搜索图标；false 表示不显示。 */
  icon?: ReactNode | false;
  prefix?: ReactNode;
  suffix?: ReactNode;
  /** Dropdown 的受控/非受控选择器。改变选择项不会触发 onSearch。 */
  selector?: SearchSelectorProps;
  /** @deprecated 静态只读 Dropdown 标签；新代码请使用 selector。 */
  dropdownLabel?: ReactNode;
  onSearch?: AntSearchProps['onSearch'];
}

export interface SearchTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon?: ReactNode;
  onPress?: (event: MouseEvent<HTMLButtonElement>) => void;
  size?: SearchInputSize;
}

export interface InputSelectProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Visible selection label; it also provides the button's accessible name when text. */
  children: ReactNode;
}

export type { InputRef, OTPRef, TextAreaRef };
