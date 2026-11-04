import type { CSSProperties, ReactNode } from 'react';

import type { BaseProps } from '../../types/common';
import type { ButtonProps } from '../Button/type';

/** S / M。两者的差异是 header、状态条、内容区和 footer 的垂直间距。 */
export type ModalSize = 'small' | 'medium';

/**
 * basic：Modal/01 Style 01，header / footer 带灰底和分割线。
 * banner：Modal/01 Style 02，标题下可放状态条，header / footer 更松、无分割线。
 */
export type ModalVariant = 'basic' | 'banner';

/** dialog：通用对话框。alert：左侧图标的状态 / 业务对话框。 */
export type ModalLayout = 'dialog' | 'alert';

/** alert 布局的预设图标。传入 icon 时以 icon 为准。 */
export type ModalStatus = 'info' | 'success' | 'warning' | 'error';

export interface ModalProps extends BaseProps {
  /**
   * 是否打开。传入后变为受控，关闭时需要在 onCancel / onOk 里自行更新。
   */
  open?: boolean;
  /**
   * 非受控时的初始打开状态。
   * @default false
   */
  defaultOpen?: boolean;
  /**
   * dialog 为 Modal/01，alert 为 Modal/02。
   * @default dialog
   */
  layout?: ModalLayout;
  /**
   * 仅 dialog 使用。banner 对应带状态条的 Style 02。
   * @default basic
   */
  variant?: ModalVariant;
  /**
   * dialog 的间距尺寸。alert 固定为设计稿中的单尺寸。
   * @default small
   */
  size?: ModalSize;
  /** alert 的预设状态图标。 */
  status?: ModalStatus;
  /** 标题。 */
  title?: ReactNode;
  /** 标题旁的灰色辅助说明，例如「这里是辅助性内容」。 */
  subTitle?: ReactNode;
  /** banner 的状态条内容，例如系统代理状态。 */
  statusBar?: ReactNode;
  /** alert 左侧图标。不传时使用 status 对应的默认图标。 */
  icon?: ReactNode;
  children?: ReactNode;
  /**
   * 底部操作区。不传则渲染取消 / 确认按钮；传 null 隐藏整个 footer。
   */
  footer?: ReactNode | null;
  /** footer 左侧插槽，例如 Switch 或 Checkbox。 */
  footerExtra?: ReactNode;
  /**
   * 确认按钮文案。
   * @default 确定
   */
  okText?: ReactNode;
  /**
   * 取消按钮文案。
   * @default 取消
   */
  cancelText?: ReactNode;
  /**
   * 是否显示确认按钮。
   * @default true
   */
  showOk?: boolean;
  /**
   * 是否显示取消按钮。
   * @default true
   */
  showCancel?: boolean;
  /** 确认按钮的加载态。加载中按钮不可点击。 */
  confirmLoading?: boolean;
  okButtonProps?: Partial<Pick<ButtonProps, 'disabled' | 'loading'>>;
  cancelButtonProps?: Partial<Pick<ButtonProps, 'disabled' | 'loading'>>;
  /**
   * 是否显示右上角关闭按钮。dialog 默认显示，alert 默认不显示。
   */
  closable?: boolean;
  /**
   * 关闭按钮的无障碍名称。
   * @default 关闭
   */
  closeLabel?: string;
  /**
   * 是否显示遮罩。
   * @default true
   */
  mask?: boolean;
  /**
   * 点击遮罩是否关闭。
   * @default true
   */
  maskClosable?: boolean;
  /**
   * 是否允许 Esc 关闭。
   * @default true
   */
  keyboard?: boolean;
  /**
   * 挂载节点。false 时就地渲染面板，不使用遮罩，方便画廊和测试。
   * @default document.body
   */
  getContainer?: HTMLElement | (() => HTMLElement) | false;
  /** 面板宽度。dialog 默认 560，alert 默认 448。 */
  width?: number | string;
  /**
   * 遮罩层层级。
   * @default 1000
   */
  zIndex?: number;
  /**
   * alert 左下角的帮助按钮。alert 默认显示。
   */
  showHelp?: boolean;
  /**
   * 帮助按钮的无障碍名称。
   * @default 帮助
   */
  helpLabel?: string;
  onHelp?: () => void;
  /** 点击确认时触发。非受控模式下会同时关闭。 */
  onOk?: () => void;
  /** 点击取消、关闭、遮罩或 Esc 时触发。非受控模式下会同时关闭。 */
  onCancel?: () => void;
  /** 内容区样式。 */
  bodyStyle?: CSSProperties;
}
