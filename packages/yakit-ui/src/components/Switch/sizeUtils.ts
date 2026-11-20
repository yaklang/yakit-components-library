import type { SwitchSize } from './type';

/** 解析为样式 class 后缀 */
export type ResolvedSwitchSize = 'small' | 'middle' | 'large' | 'max-large';

/**
 * 尺寸映射：
 * - small → sm-12（20×12）
 * - middle / medium / default → md-16（28×16）
 * - large → lg-20（36×20）
 * - maxLarge → 44×22（主项目）
 */
export const resolveSwitchSize = (size?: SwitchSize): ResolvedSwitchSize => {
  switch (size) {
    case 'small':
      return 'small';
    case 'large':
      return 'large';
    case 'maxLarge':
      return 'max-large';
    case 'medium':
    case 'middle':
    case 'default':
    default:
      return 'middle';
  }
};

/** 主项目 showInnerText / showInnerIcon 仅 large、middle 生效（medium 映射为 middle） */
export const supportsInnerExtra = (size: ResolvedSwitchSize) =>
  size === 'large' || size === 'middle';
