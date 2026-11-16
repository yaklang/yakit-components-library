import type { ThemeConfig } from 'antd';

import type { YakitTreeToken } from '../../types/token/YakitTree';
import { defined } from '../../utils';

import type { TreeVariant } from './type';

const text = 'var(--Colors-Use-Neutral-Text-1-Title)';
const iconColor = 'var(--Colors-Use-Neutral-Text-3-Secondary)';
const background = 'var(--Colors-Use-Basic-Background)';
const neutralHover = 'var(--Colors-Use-Neutral-Bg-Hover)';
const neutralBg = 'var(--Colors-Use-Neutral-Bg)';
const mainBg = 'var(--Colors-Use-Main-Bg)';
const primary = 'var(--Colors-Use-Main-Primary)';
const onPrimary = 'var(--Colors-Use-Basic-White)';
const border = 'var(--Colors-Use-Neutral-Border)';
const disabled = 'var(--Colors-Use-Neutral-Disable)';

const aliasToken = {
  colorBgContainer: background,
  colorBorder: border,
  // 选中且禁用，或只禁勾选：不用 antd 发灰的 colorFill。
  controlItemBgActiveDisabled: neutralHover,
  colorIcon: iconColor,
  colorPrimary: primary,
  colorText: text,
  colorTextDisabled: disabled,
  colorTextQuaternary: iconColor,
  colorTextLightSolid: onPrimary,
};

const componentToken = (variant: TreeVariant, showLine: boolean): YakitTreeToken => {
  if (variant === 'website') {
    return {
      directoryNodeSelectedBg: primary,
      directoryNodeSelectedColor: onPrimary,
      indentSize: 10,
      nodeHoverBg: neutralBg,
      nodeHoverColor: text,
      nodeSelectedBg: primary,
      nodeSelectedColor: onPrimary,
      switcherSize: 20,
      titleHeight: 24,
    };
  }
  if (variant === 'file') {
    return {
      directoryNodeSelectedBg: mainBg,
      directoryNodeSelectedColor: text,
      // antd 目录树：有连接线时缩进和箭头列都是 24，竖线落在箭头列中线。
      indentSize: showLine ? 24 : 16,
      nodeHoverBg: 'transparent',
      nodeHoverColor: text,
      nodeSelectedBg: 'transparent',
      nodeSelectedColor: text,
      switcherSize: showLine ? 24 : 16,
      titleHeight: 22,
    };
  }
  return {
    // 对齐 YakitTree：选中是实心主色，悬停画在 content-wrapper 上。
    directoryNodeSelectedBg: primary,
    directoryNodeSelectedColor: onPrimary,
    nodeHoverBg: neutralHover,
    nodeHoverColor: text,
    nodeSelectedBg: primary,
    nodeSelectedColor: onPrimary,
  };
};

/** 当前皮肤的默认 token 在前，`YakitTree` 里写出的项覆盖同名默认值。 */
export const createTreeTheme = (
  variant: TreeVariant,
  showLine: boolean,
  overrides?: YakitTreeToken,
): ThemeConfig => ({
  token: aliasToken,
  components: {
    Tree: {
      ...componentToken(variant, showLine),
      ...defined(overrides),
    },
  },
});
