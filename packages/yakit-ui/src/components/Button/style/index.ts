import type { CSSInterpolation } from '@ant-design/cssinjs';

import type { GlobalToken } from '../../../types/token';
import type { YakitButtonToken } from '../../../types/token/YakitButton';

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
};

const buttonStyle = (prefixCls: string, token: GlobalToken): CSSInterpolation => {
  const buttonToken = {
    ...defaultButton,
    ...token.YakitButton,
  };

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

      '--wave-color': token.colorPrimaryFocus,
      '--yakit-btn-disabled-color': token.colorBasicBackground,
      '--yakit-btn-disabled-bg': token.colorPrimaryBg,

      [`&:not(:disabled):focus-visible`]: {
        outline: `2px solid ${token.colorPrimaryFocus}`,
        outlineOffset: '1px',
        transition: ' outlineOffset 0s, outline 0s',
      },
      /**
       * 按钮类型
       */
      [`&-primary`]: {
        backgroundColor: token.colorPrimary,
        color: token.colorPrimaryText,
        borderColor: 'transparent',

        // 设置变量
        '--wave-color': token.colorPrimaryFocus,
        '--yakit-btn-disabled-color': token.colorBasicBackground,
        '--yakit-btn-disabled-bg': token.colorPrimaryBorder,

        ['&-pressed']: {
          backgroundColor: token.colorPrimaryPressed,
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: token.colorPrimaryHover,
          color: token.colorBasicBackground,
        },
      },

      [`&-secondary1`]: {
        backgroundColor: token.colorPrimaryBg,
        color: token.colorPrimary,
        borderColor: 'transparent',

        // 设置变量
        '--wave-color': token.colorPrimaryFocus,
        '--yakit-btn-disabled-color': token.colorPrimaryBorder,
        '--yakit-btn-disabled-bg': token.colorPrimaryBg,

        ['&-pressed']: {
          backgroundColor: token.colorPrimaryBgHover,
          color: token.colorPrimaryPressed,
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: token.colorPrimaryBgHover,
          color: token.colorPrimary,
        },
      },

      ['&-secondary2']: {
        backgroundColor: token.colorNeutralBgHover,
        color: token.colorTextTitle,
        borderColor: 'transparent',

        // 设置变量
        '--wave-color': token.colorPrimaryFocus,
        '--yakit-btn-disabled-color': token.colorNeutralDisable,
        '--yakit-btn-disabled-bg': token.colorNeutralBgHover,

        ['&-pressed']: {
          color: token.colorPrimaryPressed,
          backgroundColor: token.colorPrimaryBgHover,
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: token.colorPrimaryBg,
          color: token.colorPrimary,
        },
      },

      ['&-outline1']: {
        borderColor: token.colorPrimaryBorder,
        color: token.colorPrimary,
        backgroundColor: token.colorBasicBackground,

        '--wave-color': token.colorPrimaryFocus,
        '--yakit-btn-disabled-color': token.colorPrimaryBorder,
        '--yakit-btn-disabled-bg': token.colorBasicBackground,

        ['&-pressed']: {
          backgroundColor: token.colorPrimaryBg,
          color: token.colorPrimaryPressed,
          borderColor: token.colorPrimaryPressed,
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: token.colorPrimaryBg,
          color: token.colorPrimary,
          borderColor: token.colorPrimary,
        },
      },

      ['&-outline2']: {
        borderColor: token.colorNeutralBorder,
        color: token.colorText,
        backgroundColor: token.colorBasicBackground,

        '--wave-color': token.colorPrimaryFocus,
        '--yakit-btn-disabled-color': token.colorNeutralDisable,
        '--yakit-btn-disabled-bg': token.colorNeutralBgHover,

        ['&-pressed']: {
          backgroundColor: token.colorBasicBackground,
          color: token.colorPrimaryPressed,
          borderColor: token.colorPrimaryPressed,
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: token.colorBasicBackground,
          color: token.colorPrimary,
          borderColor: token.colorPrimary,
        },
      },

      ['&-text1']: {
        borderColor: 'transparent',
        color: token.colorPrimary,
        backgroundColor: 'transparent',

        '--wave-color': 'transparent',
        '--yakit-btn-disabled-color': token.colorPrimaryBorder,
        '--yakit-btn-disabled-bg': 'transparent',

        ['&-pressed']: {
          backgroundColor: token.colorPrimaryBgHover,
          color: token.colorPrimaryPressed,
          borderColor: 'transparent',
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: token.colorPrimaryBg,
          color: token.colorPrimary,
          borderColor: 'transparent',
        },
      },
      /**
       * 按钮尺寸
       */
      [`&-small`]: {
        padding: buttonToken.paddingSM,
        fontSize: buttonToken.fontSizeSM,
        letterSpacing: '0.5px',
        lineHeight: '14px',
      },
      [`&-medium`]: {
        padding: buttonToken.paddingMD,
        fontSize: buttonToken.fontSizeMD,
        letterSpacing: '0.5px',
        lineHeight: '16px',
      },
      [`&-large`]: {
        padding: buttonToken.paddingLG,
        fontSize: buttonToken.fontSizeLG,
        letterSpacing: '0.1px',
        lineHeight: '20px',
      },
      [`&-huge`]: {
        padding: buttonToken.paddingXL,
        fontSize: buttonToken.fontSizeXL,
        letterSpacing: '0.1px',
        lineHeight: '20px',
      },

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
    },
  };
};

export default buttonStyle;
