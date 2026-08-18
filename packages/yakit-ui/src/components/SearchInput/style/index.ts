import type { CSSInterpolation } from '@ant-design/cssinjs';

import type { GlobalToken } from '../../../types/token';

const searchInputStyle = (prefixCls: string, token: GlobalToken): CSSInterpolation => ({
  [`.${prefixCls}`]: {
    alignItems: 'center',
    backgroundColor: token.colorBasicBackground,
    borderRadius: '4px',
    boxSizing: 'border-box',
    color: token.colorTextTitle,
    display: 'inline-flex',
    fontFamily: 'PingFang SC',
    fontStyle: 'normal',
    gap: '4px',
    minWidth: 0,
    overflow: 'hidden',
    transition: 'box-shadow 0.2s ease',
    width: '216px',
    boxShadow: `inset 0 0 0 1px ${token.colorNeutralBorder}`,

    [`&:hover:not(.${prefixCls}-disabled)`]: {
      boxShadow: `inset 0 0 0 1px ${token.colorPrimary}`,
    },

    [`&:focus-within:not(.${prefixCls}-disabled)`]: {
      boxShadow: `inset 0 0 0 1px ${token.colorPrimary}, 0 0 0 2px ${token.colorPrimaryFocus}`,
    },

    [`&.${prefixCls}-disabled`]: {
      backgroundColor: token.colorNeutralBgHover,
      boxShadow: `inset 0 0 0 1px ${token.colorNeutralBorder}`,
      color: token.colorNeutralDisable,
      cursor: 'not-allowed',
    },

    [`&-small`]: { height: '20px', padding: '2px 6px' },
    [`&-medium`]: { height: '24px', padding: '4px 8px' },
    [`&-large`]: { height: '28px', padding: '6px 8px' },
    [`&-huge`]: { height: '32px', padding: '6px 12px' },

    [`&-element`]: {
      background: 'transparent',
      border: 0,
      boxSizing: 'border-box',
      color: 'inherit',
      flex: '1 1 0',
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

    [`&-small .${prefixCls}-element`]: {
      fontSize: '11px',
      letterSpacing: '0.5px',
      lineHeight: '14px',
    },

    [`&-medium .${prefixCls}-element, &-large .${prefixCls}-element`]: {
      fontSize: '12px',
      letterSpacing: '0.5px',
      lineHeight: '16px',
    },

    [`&-huge .${prefixCls}-element`]: {
      fontSize: '14px',
      letterSpacing: '0.1px',
      lineHeight: '20px',
    },

    [`&-icon, &-suffix`]: {
      alignItems: 'center',
      display: 'inline-flex',
      flex: 'none',
    },

    [`&-icon img, &-suffix img`]: {
      display: 'block',
      height: '13px',
      width: '13px',
    },

    [`&-small .${prefixCls}-icon, &-small .${prefixCls}-suffix`]: {
      height: '12px',
      width: '12px',
    },

    [`&-medium .${prefixCls}-icon, &-medium .${prefixCls}-suffix, &-large .${prefixCls}-icon, &-large .${prefixCls}-suffix`]:
      {
        height: '16px',
        width: '16px',
      },

    [`&-huge .${prefixCls}-icon, &-huge .${prefixCls}-suffix`]: {
      height: '20px',
      width: '20px',
    },

    [`&-main-bg, &-dropdown`]: {
      gap: 0,
      overflow: 'visible',
      padding: 0,
      width: '216px',
      boxShadow: 'none',

      '&:hover:not(.${prefixCls}-disabled), &:focus-within:not(.${prefixCls}-disabled)': {
        boxShadow: 'none',
      },

      [`.${prefixCls}-input-area`]: {
        alignItems: 'center',
        borderBottom: `1px solid ${token.colorNeutralBorder}`,
        borderLeft: `1px solid ${token.colorNeutralBorder}`,
        borderRadius: '4px 0 0 4px',
        borderTop: `1px solid ${token.colorNeutralBorder}`,
        display: 'flex',
        flex: '1 1 0',
        height: '100%',
        minWidth: 0,
        padding: '0 8px',
      },

      [`.${prefixCls}-action`]: {
        alignItems: 'center',
        backgroundColor: token.colorPrimary,
        border: 0,
        borderRadius: '0 4px 4px 0',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'inline-flex',
        flex: 'none',
        height: '100%',
        justifyContent: 'center',
        outline: 0,
        padding: '4px',
        width: '24px',

        img: { display: 'block', height: '13px', width: '13px' },

        '&:disabled': {
          backgroundColor: token.colorNeutralBgHover,
          cursor: 'not-allowed',
        },
      },
    },

    [`&-main-bg.${prefixCls}-small .${prefixCls}-action, &-dropdown.${prefixCls}-small .${prefixCls}-action`]:
      {
        padding: '2px',
        width: '20px',
      },

    [`&-main-bg.${prefixCls}-large .${prefixCls}-action, &-dropdown.${prefixCls}-large .${prefixCls}-action`]:
      {
        padding: '6px',
        width: '28px',
      },

    [`&-main-bg.${prefixCls}-huge .${prefixCls}-action, &-dropdown.${prefixCls}-huge .${prefixCls}-action`]:
      {
        padding: '6px',
        width: '32px',
      },

    [`&-main-bg:hover:not(.${prefixCls}-disabled) .${prefixCls}-input-area, &-dropdown:hover:not(.${prefixCls}-disabled) .${prefixCls}-input-area`]:
      {
        borderColor: token.colorPrimary,
      },

    [`&-main-bg:focus-within:not(.${prefixCls}-disabled) .${prefixCls}-input-area, &-dropdown:focus-within:not(.${prefixCls}-disabled) .${prefixCls}-input-area`]:
      {
        borderColor: token.colorPrimary,
        boxShadow: `0 0 0 2px ${token.colorPrimaryFocus}`,
      },

    [`&-dropdown`]: {
      width: '304px',

      [`.${prefixCls}-dropdown-trigger`]: {
        alignItems: 'center',
        background: token.colorBasicBackground,
        borderBottom: `1px solid ${token.colorNeutralBorder}`,
        borderLeft: `1px solid ${token.colorNeutralBorder}`,
        borderRadius: '4px 0 0 4px',
        borderRight: 0,
        borderTop: `1px solid ${token.colorNeutralBorder}`,
        color: token.colorTextTitle,
        cursor: 'pointer',
        display: 'inline-flex',
        flex: 'none',
        fontFamily: 'inherit',
        fontSize: '12px',
        fontWeight: 400,
        gap: '4px',
        height: '100%',
        letterSpacing: '0.5px',
        lineHeight: '16px',
        outline: 0,
        padding: '4px 8px',

        img: { display: 'block', height: '12px', width: '12px' },

        '&:disabled': { cursor: 'not-allowed' },
      },

      [`.${prefixCls}-input-area`]: {
        borderLeft: `1px solid ${token.colorNeutralBorder}`,
        borderRadius: 0,
      },
    },

    [`&-icon-only`]: {
      background: 'transparent',
      border: 0,
      boxShadow: 'none',
      cursor: 'pointer',
      justifyContent: 'center',
      padding: '4px',
      width: '24px',

      '&:hover:not(.${prefixCls}-disabled)': {
        backgroundColor: token.colorNeutralBgHover,
        boxShadow: 'none',
      },

      '&:focus-visible:not(.${prefixCls}-disabled)': {
        boxShadow: `0 0 0 2px ${token.colorPrimaryFocus}`,
      },
    },

    [`&-icon-only.${prefixCls}-small`]: { padding: '2px', width: '20px' },
    [`&-icon-only.${prefixCls}-large`]: { padding: '6px', width: '28px' },
    [`&-icon-only.${prefixCls}-huge`]: { padding: '6px', width: '32px' },
  },
});

export default searchInputStyle;
