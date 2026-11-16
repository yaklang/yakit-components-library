import type { ThemeConfig } from 'antd';
import type { CSSProperties } from 'react';

import type { YakitSelectToken } from '../../types/token/YakitSelect';
import { defined } from '../../utils';

import type { SelectSize } from './type';

type VisualSize = SelectSize;

const color = {
  text: 'var(--Colors-Use-Neutral-Text-1-Title)',
  bg: 'var(--Colors-Use-Basic-Background)',
  bgHover: 'var(--Colors-Use-Neutral-Bg-Hover)',
  main: 'var(--Colors-Use-Main-Primary)',
  mainBg: 'var(--Colors-Use-Main-Bg)',
  mainFocus: 'var(--Colors-Use-Main-Focus)',
};

/** 选中后再悬浮的背景不走组件 token，用户覆盖 `optionSelectedBg` 时改用这个变量。 */
export const selectPopupVars = (overrides?: YakitSelectToken): CSSProperties | undefined => {
  const background = defined(overrides).optionSelectedBg;
  if (background === undefined) return undefined;
  return { '--yakit-select-option-selected-bg': String(background) } as CSSProperties;
};

/** `checkbox` 为 true 时选中项不铺主色，改由左侧勾选框表达。用户传入的组件 token 覆盖同名默认值。 */
export const createSelectTheme = (
  size: VisualSize,
  checkbox: boolean,
  overrides?: YakitSelectToken,
): ThemeConfig => ({
  components: {
    Select: {
      selectorBg: color.bg,
      hoverBorderColor: color.main,
      activeBorderColor: color.main,
      activeOutlineColor: color.mainFocus,
      optionSelectedColor: checkbox ? color.text : color.main,
      optionSelectedBg: checkbox ? 'transparent' : color.mainBg,
      optionSelectedFontWeight: 400,
      optionActiveBg: color.bgHover,
      optionFontSize: size === 'large' ? 14 : 12,
      optionLineHeight: size === 'large' ? 20 / 14 : 16 / 12,
      optionHeight: size === 'large' ? 32 : 28,
      optionPadding: '0 8px',
      showArrowPaddingInlineEnd: 16,
      ...defined(overrides),
    },
  },
});
