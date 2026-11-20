import type { RadioButtonsSize, RadioSize } from './type';

/** 圆形 Radio：middle → medium；其余非 large 一律 medium */
export const resolveCircularSize = (size?: RadioSize | RadioButtonsSize): 'medium' | 'large' => {
  if (size === 'large' || size === 'maxLarge') return 'large';
  return 'medium';
};

/**
 * 按钮组尺寸 class 后缀，对齐主项目 YakitRadioButtons
 * small | middle(default) | large | max-large
 */
export const resolveButtonSizeClass = (
  size?: RadioSize | RadioButtonsSize,
): 'small' | 'middle' | 'large' | 'max-large' => {
  switch (size) {
    case 'small':
      return 'small';
    case 'large':
      return 'large';
    case 'maxLarge':
      return 'max-large';
    case 'medium':
    case 'middle':
    default:
      return 'middle';
  }
};
