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
    [`@keyframes ${prefixCls}-ripple-shadow`]: {
      '0%': {
        boxShadow: `0 0 0 0 ${token.colorPrimary}40`, // 初始透明阴影
      },
      '100%': {
        boxShadow: `0 0 0 8px transparent`, // 阴影扩散到消失
      },
    },

    [`.${prefixCls}`]: {
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer',
      borderRadius: buttonToken.borderRadius,
      transition: 'all 0.3s ease',

      /**
       * 点击波纹阴影
       */
      '&:active': {
        animation: `${prefixCls}-ripple-shadow 0.4s ease-out`,
      },

      /**
       * 按钮类型
       */
      [`&-primary`]: {
        backgroundColor: token.colorPrimary,
        color: token.colorPrimaryText,
        borderColor: 'transparent',

        [`&:hover`]: {
          backgroundColor: token.colorPrimaryHover,
          color: token.colorPrimaryText,
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
    },
  };
};

export default buttonStyle;
