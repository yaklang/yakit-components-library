/**
 * 给 yakit 主应用用的薄适配层：把旧 YakitModal 常用别名映射到库 Modal。
 * Storybook / 库原生 API 仍用 Modal；这里默认 keyboard={false}，对齐 Electron 里旧行为。
 */
import type { CSSProperties, FC, ReactNode } from 'react';

import { Modal } from './Modal';
import type { ModalFooter, ModalProps, ModalSize, ModalVariant } from './type';

export type YakitModalCompatType = 'gray' | 'white';
/** 旧 yakit size：small / large → 库 small / medium */
export type YakitModalCompatSize = 'small' | 'large';

type LegacyButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  style?: CSSProperties;
  [key: string]: unknown;
};

export type YakitModalCompatProps = Omit<
  ModalProps,
  'size' | 'variant' | 'keyboard' | 'okButtonProps' | 'cancelButtonProps' | 'footer'
> & {
  /** gray→basic，white→banner */
  type?: YakitModalCompatType;
  size?: YakitModalCompatSize | ModalSize;
  /** 默认 false（yakit Electron 旧行为）；需要 Esc 关闭时显式传 true */
  keyboard?: boolean;
  variant?: ModalVariant;
  footer?: ModalFooter | ((nodes: ReactNode, ctx: { OkBtn: FC; CancelBtn: FC }) => ReactNode);
  okButtonProps?: LegacyButtonProps;
  cancelButtonProps?: LegacyButtonProps;
  /** 旧 yakit：隐藏整个 header（含标题与关闭按钮） */
  hiddenHeader?: boolean;
  /** 旧 yakit：仅右上角关闭按钮回调；不传则走 onCancel */
  onCloseX?: () => void;
  closeIcon?: ReactNode;
  headerStyle?: CSSProperties;
  footerStyle?: CSSProperties;
  okType?: string;
  /** 旧 antd/yakit：forceRender / 关闭保活。库侧关闭一律卸载（return null），仅吞掉类型，无保活 */
  forceRender?: boolean;
  /** 旧 antd：垂直居中，当前库未实现，仅吞掉类型 */
  centered?: boolean;
  /** 旧 antd 5 styles API，仅吞掉类型 */
  styles?: unknown;
  /** 偶发误传到 Modal 的点击，仅吞掉类型 */
  onClick?: unknown;
};

const mapVariant = (
  type: YakitModalCompatType | undefined,
  variant: ModalVariant | undefined,
): ModalVariant | undefined => {
  if (variant) return variant;
  if (type === 'white') return 'banner';
  if (type === 'gray') return 'basic';
  return undefined;
};

const mapSize = (size: YakitModalCompatProps['size']): ModalSize | undefined => {
  if (!size) return undefined;
  if (size === 'large') return 'medium';
  if (size === 'medium') return 'medium';
  return 'small';
};

const isDisplayNone = (style?: CSSProperties) =>
  style?.display === 'none' || String(style?.display).toLowerCase() === 'none';

const pickButtonProps = (props?: LegacyButtonProps) => {
  if (!props) return undefined;
  return {
    disabled: props.disabled,
    loading: props.loading,
  };
};

const adaptFooter = (footer: YakitModalCompatProps['footer']): ModalFooter | undefined => {
  if (footer === undefined) return undefined;
  if (footer === null || typeof footer !== 'function') return footer;
  // 旧签名 footer(nodes, { OkBtn, CancelBtn })；新签名 footer({ OkBtn, CancelBtn })
  if (footer.length >= 2) {
    return (ctx) => (footer as (nodes: ReactNode, c: typeof ctx) => ReactNode)(null, ctx);
  }
  return footer as ModalFooter;
};

export const YakitModalCompat: FC<YakitModalCompatProps> = (props) => {
  // Destructure inside body so optional props stay optional for checkers that fall back to impl signature
  const {
    type,
    size,
    variant,
    keyboard = false,
    hiddenHeader = false,
    onCloseX,
    closeIcon: _closeIcon,
    headerStyle: _headerStyle,
    footerStyle: _footerStyle,
    okType: _okType,
    forceRender: _forceRender,
    centered: _centered,
    styles: _styles,
    onClick: _onClick,
    footer,
    okButtonProps,
    cancelButtonProps,
    showOk,
    showCancel,
    title,
    subTitle,
    closable,
    onCancel,
    onClose,
    ...rest
  } = props;

  const resolvedShowOk = showOk ?? !isDisplayNone(okButtonProps?.style);
  const resolvedShowCancel = showCancel ?? !isDisplayNone(cancelButtonProps?.style);

  return (
    <Modal
      {...rest}
      title={hiddenHeader ? undefined : title}
      subTitle={hiddenHeader ? undefined : subTitle}
      closable={hiddenHeader ? false : closable}
      keyboard={keyboard}
      size={mapSize(size)}
      variant={mapVariant(type, variant)}
      footer={adaptFooter(footer)}
      okButtonProps={pickButtonProps(okButtonProps)}
      cancelButtonProps={pickButtonProps(cancelButtonProps)}
      showOk={resolvedShowOk}
      showCancel={resolvedShowCancel}
      onCancel={onCancel}
      onClose={onCloseX ?? onClose}
    />
  );
};

export default YakitModalCompat;
