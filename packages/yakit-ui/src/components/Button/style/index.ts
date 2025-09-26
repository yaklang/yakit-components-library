import type { CSSInterpolation } from '@ant-design/cssinjs';

import type { GlobalToken } from '../../../types/token';
import type { YakitButtonToken } from '../../../types/token/YakitButton';
import type { ButtonProps } from '../type';

const defaultButton: YakitButtonToken = {
  paddingSM: '3px 6px',
  paddingMD: '4px 8px',
  paddingLG: '4px 12px',
  paddingXL: '6px 12px',
  borderRadius: '4px',
  fontSizeSM: '11px',
  fontSizeMD: '12px',
  fontSizeLG: '14px',
  fontSizeXL: '14px',
  iconGap: '4px',
};

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const genColorVars = (color: NonNullable<ButtonProps['color']>, token: GlobalToken) => {
  const cap = capitalize(color);
  return {
    [`&-color-${color}`]: {
      '--yakit-btn-color-base': token[`color${cap}` as keyof GlobalToken],
      '--yakit-btn-color-text': token[`color${cap}Text` as keyof GlobalToken],
      '--yakit-btn-color-pressed': token[`color${cap}Pressed` as keyof GlobalToken],
      '--yakit-btn-color-hover': token[`color${cap}Hover` as keyof GlobalToken],
      '--yakit-btn-color-focus': token[`color${cap}Focus` as keyof GlobalToken],
      '--yakit-btn-color-bg': token[`color${cap}Bg` as keyof GlobalToken],
      '--yakit-btn-color-bg-hover': token[`color${cap}BgHover` as keyof GlobalToken],
    },
  };
};

// 尺寸
const genSizeVars = (btnToken: YakitButtonToken, prefixCls: string) => ({
  [`&-small`]: {
    padding: btnToken.paddingSM,
    fontSize: btnToken.fontSizeSM,
    letterSpacing: '0.5px',
    lineHeight: '14px',
    height: '20px',
    svg: {
      width: '12px',
      height: '12px',
    },
    [`&.${prefixCls}-icon-only`]: {
      padding: '4px',
    },
  },
  [`&-medium`]: {
    padding: btnToken.paddingMD,
    fontSize: btnToken.fontSizeMD,
    letterSpacing: '0.5px',
    lineHeight: '16px',
    height: '24px',
    svg: {
      width: '16px',
      height: '16px',
    },
    [`&.${prefixCls}-icon-only`]: {
      padding: '4px',
    },
  },
  [`&-large`]: {
    padding: btnToken.paddingLG,
    fontSize: btnToken.fontSizeLG,
    letterSpacing: '0.1px',
    lineHeight: '20px',
    height: '28px',
    svg: {
      width: '20px',
      height: '20px',
    },
    [`&.${prefixCls}-icon-only`]: {
      padding: '4px',
    },
  },
  [`&-huge`]: {
    padding: btnToken.paddingXL,
    fontSize: btnToken.fontSizeXL,
    letterSpacing: '0.1px',
    lineHeight: '20px',
    height: '32px',
    svg: {
      width: '20px',
      height: '20px',
    },
    [`&.${prefixCls}-icon-only`]: {
      padding: '6px',
    },
  },
});

const buttonStyle = (prefixCls: string, token: GlobalToken): CSSInterpolation => {
  const buttonToken = {
    ...defaultButton,
    ...token.YakitButton,
  };

  const colorKeys: NonNullable<ButtonProps['color']>[] = ['primary', 'success', 'warning', 'error'];

  const colorClasses = colorKeys.reduce(
    (acc, color) => ({ ...acc, ...genColorVars(color, token) }),
    {},
  );

  return {
    [`.${prefixCls}`]: {
      position: 'relative',
      cursor: 'pointer',
      borderRadius: buttonToken.borderRadius,
      transition: 'all 0.3s ease',
      border: '1px solid transparent',
      fontFamily: 'PingFang SC',
      fontStyle: 'normal',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      gap: buttonToken.iconGap,

      // 颜色变量
      '--yakit-btn-color-base': token.colorPrimary,
      '--yakit-btn-color-text': token.colorPrimaryText,
      '--yakit-btn-color-pressed': token.colorPrimaryPressed,
      '--yakit-btn-color-hover': token.colorPrimaryHover,
      '--yakit-btn-color-focus': token.colorPrimaryFocus,
      '--yakit-btn-color-bg': token.colorPrimaryBg,
      '--yakit-btn-color-bg-hover': token.colorPrimaryBgHover,

      '--wave-color': 'var(--yakit-btn-color-focus)',
      '--yakit-btn-disabled-color': token.colorBasicBackground,
      '--yakit-btn-disabled-bg': 'var(--yakit-btn-color-bg)',

      [`&:not(:disabled):focus-visible`]: {
        outline: `2px solid var(--yakit-btn-color-focus)`,
        outlineOffset: '1px',
        transition: ' outlineOffset 0s, outline 0s',
      },
      /**
       * 按钮类型
       */
      [`&-primary`]: {
        backgroundColor: 'var(--yakit-btn-color-base)',
        color: 'var(--yakit-btn-color-text)',
        borderColor: 'transparent',

        // 设置变量
        '--wave-color': 'var(--yakit-btn-color-focus)',
        '--yakit-btn-disabled-color': token.colorBasicBackground,
        '--yakit-btn-disabled-bg': token.colorBorder,

        ['&-pressed']: {
          backgroundColor: 'var(--yakit-btn-color-pressed)',
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: 'var(--yakit-btn-color-hover)',
          color: token.colorBasicBackground,
        },
      },

      [`&-secondary1`]: {
        backgroundColor: 'var(--yakit-btn-color-bg)',
        color: 'var(--yakit-btn-color-base)',
        borderColor: 'transparent',

        // 设置变量
        '--wave-color': 'var(--yakit-btn-color-focus)',
        '--yakit-btn-disabled-color': token.colorBorder,
        '--yakit-btn-disabled-bg': 'var(--yakit-btn-color-bg)',

        ['&-pressed']: {
          backgroundColor: 'var(--yakit-btn-color-bg-hover)',
          color: 'var(--yakit-btn-color-pressed)',
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: 'var(--yakit-btn-color-bg-hover)',
          color: 'var(--yakit-btn-color-base)',
        },
      },

      ['&-secondary2']: {
        backgroundColor: token.colorNeutralBgHover,
        color: token.colorTextTitle,
        borderColor: 'transparent',

        // 设置变量
        '--wave-color': 'var(--yakit-btn-color-focus)',
        '--yakit-btn-disabled-color': token.colorNeutralDisable,
        '--yakit-btn-disabled-bg': token.colorNeutralBgHover,

        ['&-pressed']: {
          color: 'var(--yakit-btn-color-pressed)',
          backgroundColor: 'var(--yakit-btn-color-bg-hover)',
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: 'var(--yakit-btn-color-bg)',
          color: 'var(--yakit-btn-color-base)',
        },
      },

      ['&-outline1']: {
        borderColor: token.colorBorder,
        color: 'var(--yakit-btn-color-base)',
        backgroundColor: token.colorBasicBackground,

        '--wave-color': 'var(--yakit-btn-color-focus)',
        '--yakit-btn-disabled-color': token.colorBorder,
        '--yakit-btn-disabled-bg': token.colorBasicBackground,

        ['&-pressed']: {
          backgroundColor: 'var(--yakit-btn-color-bg)',
          color: 'var(--yakit-btn-color-pressed)',
          borderColor: 'var(--yakit-btn-color-pressed)',
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: 'var(--yakit-btn-color-bg)',
          color: 'var(--yakit-btn-color-base)',
          borderColor: 'var(--yakit-btn-color-base)',
        },
      },

      ['&-outline2']: {
        borderColor: token.colorNeutralBorder,
        color: token.colorText,
        backgroundColor: token.colorBasicBackground,

        '--wave-color': 'var(--yakit-btn-color-focus)',
        '--yakit-btn-disabled-color': token.colorNeutralDisable,
        '--yakit-btn-disabled-bg': token.colorNeutralBgHover,

        ['&-pressed']: {
          backgroundColor: token.colorBasicBackground,
          color: 'var(--yakit-btn-color-pressed)',
          borderColor: 'var(--yakit-btn-color-pressed)',
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: token.colorBasicBackground,
          color: 'var(--yakit-btn-color-base)',
          borderColor: 'var(--yakit-btn-color-base)',
        },
      },

      ['&-text1']: {
        borderColor: 'transparent',
        color: 'var(--yakit-btn-color-base)',
        backgroundColor: 'transparent',

        '--wave-color': 'transparent',
        '--yakit-btn-disabled-color': token.colorBorder,
        '--yakit-btn-disabled-bg': 'transparent',

        ['&-pressed']: {
          backgroundColor: 'var(--yakit-btn-color-bg-hover)',
          color: 'var(--yakit-btn-color-pressed)',
          borderColor: 'transparent',
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: 'var(--yakit-btn-color-bg)',
          color: 'var(--yakit-btn-color-base)',
          borderColor: 'transparent',
        },
      },

      ['&-text2']: {
        borderColor: 'transparent',
        color: token.colorTextTitle,
        backgroundColor: 'transparent',

        '--wave-color': 'transparent',
        '--yakit-btn-disabled-color': token.colorNeutralDisable,
        '--yakit-btn-disabled-bg': 'transparent',

        ['&-pressed']: {
          backgroundColor: token.colorNeutralBgHover,
          color: 'var(--yakit-btn-color-base)',
          borderColor: 'transparent',
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: token.colorNeutralBgHover,
          color: token.colorTextTitle,
          borderColor: 'transparent',
        },
      },

      ['&-link1']: {
        borderColor: 'transparent',
        color: 'var(--yakit-btn-color-base)',
        backgroundColor: 'transparent',

        '--wave-color': 'transparent',
        '--yakit-btn-disabled-color': token.colorNeutralDisable,
        '--yakit-btn-disabled-bg': 'transparent',

        ['&-pressed']: {
          backgroundColor: 'transparent',
          color: 'var(--yakit-btn-color-pressed)',
          borderColor: 'transparent',
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: 'transparent',
          color: 'var(--yakit-btn-color-hover)',
          borderColor: 'transparent',
        },
      },

      ['&-link2']: {
        borderColor: 'transparent',
        color: token.colorTextSecondary,
        backgroundColor: 'transparent',

        '--wave-color': 'transparent',
        '--yakit-btn-disabled-color': token.colorNeutralDisable,
        '--yakit-btn-disabled-bg': 'transparent',

        ['&-pressed']: {
          backgroundColor: 'transparent',
          color: 'var(--yakit-btn-color-pressed)',
          borderColor: 'transparent',
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: 'transparent',
          color: 'var(--yakit-btn-color-base)',
          borderColor: 'transparent',
        },
      },
      /**
       * 按钮尺寸
       */
      ...genSizeVars(buttonToken, prefixCls),

      /**
       * 按钮形状
       */
      [`&-circle`]: {
        borderRadius: '50%',
      },
      /**
       * 状态
       */
      [`&-disabled`]: {
        cursor: 'not-allowed',
        backgroundColor: 'var(--yakit-btn-disabled-bg)',
        color: 'var(--yakit-btn-disabled-color)',
      },
      /**
       * 颜色
       */
      ...colorClasses,

      /**
       * 字体
       */
      [`& span`]: {
        // 不换行
        whiteSpace: 'nowrap',
      },

      /**
       * 按钮图标位置
       */
      [`.${prefixCls}-icon`]: {
        width: '100%',
        height: '100%',
      },
      ['&-icon-end']: {
        flexDirection: 'row-reverse',
      },
    },
  };
};

export default buttonStyle;
