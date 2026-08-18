import type { CSSInterpolation } from '@ant-design/cssinjs';

import type { GlobalToken } from '../../../types/token';

const inputNumberStyle = (prefixCls: string, token: GlobalToken): CSSInterpolation => ({
  [`.${prefixCls}`]: {
    alignItems: 'stretch',
    backgroundColor: token.colorBasicBackground,
    border: `1px solid ${token.colorNeutralBorder}`,
    borderRadius: '4px',
    boxSizing: 'border-box',
    color: token.colorTextTitle,
    display: 'inline-flex',
    fontFamily: 'Roboto, PingFang SC, sans-serif',
    minWidth: 0,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',

    [`&:hover:not(.${prefixCls}-disabled)`]: {
      borderColor: token.colorPrimary,
    },

    [`&:focus-within:not(.${prefixCls}-disabled)`]: {
      borderColor: token.colorPrimary,
      boxShadow: `0 0 0 2px ${token.colorPrimaryFocus}`,
    },

    [`&.${prefixCls}-disabled`]: {
      backgroundColor: token.colorNeutralBgHover,
      color: token.colorNeutralDisable,
      cursor: 'not-allowed',
    },

    [`&-small`]: { height: '24px', width: '80px' },
    [`&-medium`]: { height: '28px', width: '88px' },
    [`&-large`]: { height: '32px', width: '88px' },
    [`&-huge`]: { height: '40px', width: '96px' },

    [`&-element`]: {
      appearance: 'textfield',
      background: 'transparent',
      border: 0,
      boxSizing: 'border-box',
      color: 'inherit',
      flex: '1 1 0',
      fontFamily: 'inherit',
      fontSize: '14px',
      fontStyle: 'normal',
      fontWeight: 400,
      letterSpacing: '0.1px',
      lineHeight: '20px',
      minWidth: 0,
      outline: 0,
      padding: '2px 12px',

      '&:disabled': {
        color: token.colorNeutralDisable,
        cursor: 'not-allowed',
      },
    },

    [`&-small .${prefixCls}-element, &-medium .${prefixCls}-element`]: {
      fontSize: '12px',
      letterSpacing: '0.5px',
      lineHeight: '16px',
    },

    [`&-controls-vertical`]: {
      width: '96px',
    },

    [`&-controls-vertical.${prefixCls}-small`]: { width: '80px' },
    [`&-controls-vertical.${prefixCls}-medium, &-controls-vertical.${prefixCls}-large`]: {
      width: '88px',
    },

    [`&-vertical-controls`]: {
      borderLeft: `1px solid ${token.colorNeutralBorder}`,
      display: 'none',
      flex: 'none',
      flexDirection: 'column',
      width: '28px',
    },

    [`&-medium .${prefixCls}-vertical-controls`]: { width: '24px' },
    [`&-small .${prefixCls}-vertical-controls`]: { width: '20px' },

    [`&-controls-vertical:hover .${prefixCls}-vertical-controls, &-controls-vertical:focus-within .${prefixCls}-vertical-controls`]:
      {
        display: 'flex',
      },

    [`&-controls-horizontal`]: {
      overflow: 'hidden',
      width: '112px',

      [`.${prefixCls}-element`]: {
        textAlign: 'center',
      },
    },

    [`&-control`]: {
      alignItems: 'center',
      background: 'transparent',
      border: 0,
      color: token.colorTextSecondary,
      cursor: 'pointer',
      display: 'flex',
      flex: 'none',
      justifyContent: 'center',
      margin: 0,
      outline: 0,
      padding: 0,

      img: {
        display: 'block',
        height: '12px',
        objectFit: 'contain',
        transformOrigin: 'center',
        width: '12px',
      },

      '&:disabled': {
        cursor: 'not-allowed',
      },
    },

    [`&-vertical-controls .${prefixCls}-control`]: {
      flex: '1 1 0',
      minHeight: 0,
      width: '100%',
    },

    [`&-vertical-controls .${prefixCls}-control-decrease`]: {
      borderTop: `1px solid ${token.colorNeutralBorder}`,
    },

    [`&-vertical-controls .${prefixCls}-control-decrease:disabled`]: {
      backgroundColor: token.colorNeutralBgHover,
    },

    [`&-vertical-controls .${prefixCls}-control-increase img`]: {
      transform: 'rotate(180deg)',
    },

    [`&-controls-vertical.${prefixCls}-medium .${prefixCls}-control img`]: {
      height: '10px',
      width: '10px',
    },

    [`&-controls-vertical.${prefixCls}-small .${prefixCls}-control img`]: {
      height: '8px',
      width: '8px',
    },

    [`&-controls-horizontal .${prefixCls}-control`]: {
      backgroundColor: token.colorNeutralBgHover,
      height: '100%',
      width: '24px',
    },

    [`&-controls-horizontal .${prefixCls}-control-decrease`]: {
      borderRight: `1px solid ${token.colorNeutralBorder}`,
    },

    [`&-controls-horizontal .${prefixCls}-control-increase`]: {
      borderLeft: `1px solid ${token.colorNeutralBorder}`,
    },

    [`&-controls-horizontal .${prefixCls}-control-decrease img`]: {
      transform: 'rotate(90deg)',
    },

    [`&-controls-horizontal .${prefixCls}-control-increase img`]: {
      transform: 'rotate(-90deg)',
    },

    [`&-controls-horizontal.${prefixCls}-small .${prefixCls}-control`]: {
      width: '20px',
    },

    [`&-controls-horizontal.${prefixCls}-disabled .${prefixCls}-control`]: {
      backgroundColor: 'transparent',
    },
  },
});

export default inputNumberStyle;
