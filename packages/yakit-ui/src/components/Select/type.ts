import type {
  DefaultOptionType,
  RefSelectProps,
  SelectProps as AntSelectProps,
} from 'antd/es/select';

export type SelectSize = 'small' | 'medium' | 'large';

export type SelectRef = RefSelectProps;

export interface SelectProps<
  ValueType = unknown,
  OptionType extends DefaultOptionType = DefaultOptionType,
> extends Omit<AntSelectProps<ValueType, OptionType>, 'size'> {
  /**
   * 选择框尺寸。不传且没有 ConfigProvider 尺寸时为 `medium`。
   * @default medium
   */
  size?: SelectSize;
  /**
   * 下拉项改用左侧勾选框，并去掉右侧对勾。
   * 只在 `mode` 为 `multiple` 或 `tags` 时生效，不传 `mode` 时忽略。
   * 勾选框使用组件库的 Checkbox，只展示状态，点击仍由选项处理。
   * @default false
   */
  checkbox?: boolean;
  /**
   * 传入后，未选中且未禁用的下拉项在悬浮或键盘高亮时出现垃圾桶。
   * 点击，或在该项高亮且搜索框为空时按 Delete，只回调这一项，不改选中值，也不改 `options`。
   * 当前是原生 button，后续换成组件库的 Button。
   */
  onOptionDelete?: (option: OptionType) => void;
}
