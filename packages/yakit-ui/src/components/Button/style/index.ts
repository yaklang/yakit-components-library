import type { CSSInterpolation } from '@ant-design/cssinjs';

import type { GlobalToken } from '../../../types/token';
import type { YakitButtonToken } from '../../../types/token/YakitButton';

const defaultButton: YakitButtonToken = {
  paddingSM: '3px 6px',
  paddingMD: '4px 8px',
  paddingLG: '4px 12px',
  paddingXL: '6px 12px',
  borderRadius: '4px',
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
      borderColor: 'transparent',
      fontFamily: 'PingFang SC',
      fontStyle: 'normal',

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

        ['&-pressed']: {
          backgroundColor: token.colorPrimaryPressed,
        },
        '&:active:not(:disabled)': {
          backgroundColor: token.colorPrimaryPressed,
        },
        [`&:hover:not(:disabled):not(&-pressed)`]: {
          backgroundColor: token.colorPrimaryHover,
          color: token.colorPrimaryText,
        },
      },
      [`&-secondary1`]: {
        backgroundColor: token.colorPrimaryBg,
        color: token.colorPrimary,

        [`&:hover:not(:disabled)`]: {
          backgroundColor: token.colorPrimaryBgHover,
        },
      },
      /**
       * 按钮尺寸
       */
      [`&-small`]: {
        padding: buttonToken.paddingSM,
      },
      [`&-medium`]: {
        padding: buttonToken.paddingMD,
      },
      [`&-large`]: {
        padding: buttonToken.paddingLG,
      },
      [`&-huge`]: {
        padding: buttonToken.paddingXL,
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
        backgroundColor: token.colorPrimaryBorder,
      },
    },
  };
};

export default buttonStyle;
