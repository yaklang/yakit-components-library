import type { CSSInterpolation } from '@ant-design/cssinjs';

import type { GlobalToken } from '../../../types/token';

const inputStyle = (prefixCls: string, token: GlobalToken): CSSInterpolation => ({
  [`.${prefixCls}`]: {
    alignItems: 'center',
    backgroundColor: token.colorBasicBackground,
    borderRadius: '4px',
    boxSizing: 'border-box',
    color: token.colorTextTitle,
    display: 'inline-flex',
    fontFamily: 'PingFang SC',
    fontStyle: 'normal',
    gap: 0,
    height: '32px',
    minWidth: 0,
    overflow: 'hidden',
    padding: '6px 12px',
    transition: 'box-shadow 0.2s ease',
    width: '400px',
    boxShadow: `inset 0 0 0 1px ${token.colorNeutralBorder}`,

    [`&:hover:not(.${prefixCls}-disabled)`]: {
      boxShadow: `inset 0 0 0 1px ${token.colorPrimary}`,
    },

    [`&:focus-within:not(.${prefixCls}-disabled)`]: {
      boxShadow: `inset 0 0 0 1px ${token.colorPrimary}, 0 0 0 2px ${token.colorPrimaryFocus}`,
    },

    [`&.${prefixCls}-error`]: {
      boxShadow: `inset 0 0 0 1px ${token.colorErrorBorder}`,

      [`&:hover:not(.${prefixCls}-disabled)`]: {
        boxShadow: `inset 0 0 0 1px ${token.colorError}`,
      },

      [`&:focus-within:not(.${prefixCls}-disabled)`]: {
        boxShadow: `inset 0 0 0 1px ${token.colorError}, 0 0 0 2px ${token.colorErrorFocus}`,
      },
    },

    [`&.${prefixCls}-disabled`]: {
      backgroundColor: token.colorNeutralBgHover,
      boxShadow: `inset 0 0 0 1px ${token.colorNeutralBorder}`,
      color: token.colorNeutralDisable,
      cursor: 'not-allowed',
    },

    [`&-small`]: {
      height: '24px',
      padding: '4px 8px',

      [`.${prefixCls}-element`]: {
        fontSize: '12px',
        letterSpacing: '0.5px',
        lineHeight: '16px',
      },

      [`.${prefixCls}-prefix, .${prefixCls}-suffix`]: {
        fontSize: '12px',
        lineHeight: '12px',
        svg: { height: '12px', width: '12px' },
      },
    },

    [`&-medium`]: {
      height: '28px',
      padding: '6px 12px',

      [`.${prefixCls}-element`]: {
        fontSize: '12px',
        letterSpacing: '0.5px',
        lineHeight: '16px',
      },

      [`.${prefixCls}-prefix, .${prefixCls}-suffix`]: {
        fontSize: '14px',
        lineHeight: '14px',
        svg: { height: '14px', width: '14px' },
      },
    },

    [`&-large`]: {
      height: '32px',
      padding: '6px 12px',

      [`.${prefixCls}-element`]: {
        fontSize: '14px',
        letterSpacing: '0.1px',
        lineHeight: '20px',
      },

      [`.${prefixCls}-prefix, .${prefixCls}-suffix`]: {
        fontSize: '16px',
        lineHeight: '16px',
        svg: { height: '16px', width: '16px' },
      },
    },

    [`&-element`]: {
      background: 'transparent',
      border: 0,
      color: 'inherit',
      flex: 1,
      fontFamily: 'inherit',
      fontStyle: 'normal',
      fontWeight: 400,
      minWidth: 0,
      outline: 0,
      padding: 0,

      '&::placeholder': {
        color: token.colorNeutralDisable,
        opacity: 1,
      },

      '&:disabled': {
        color: token.colorNeutralDisable,
        cursor: 'not-allowed',
      },
    },

    [`&.${prefixCls}-with-prefix, &.${prefixCls}-with-suffix`]: {
      gap: '4px',
    },

    [`&-prefix, &-suffix`]: {
      alignItems: 'center',
      color: token.colorTextSecondary,
      display: 'inline-flex',
      flex: 'none',
    },
  },
});

export default inputStyle;
