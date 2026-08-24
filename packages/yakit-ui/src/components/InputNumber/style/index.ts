import type { CSSInterpolation } from '@ant-design/cssinjs';

import type { GlobalToken } from '../../../types/token';

const inputNumberStyle = (prefixCls: string, token: GlobalToken): CSSInterpolation => ({
  [`.${prefixCls}`]: {
    alignItems: 'center',
    backgroundColor: token.colorBasicBackground,
    border: `1px solid ${token.colorNeutralBorder}`,
    borderRadius: '4px',
    boxShadow: 'none',
    boxSizing: 'border-box',
    color: token.colorTextTitle,
    display: 'inline-flex',
    fontFamily: 'Roboto, PingFang SC, sans-serif',
    minWidth: 0,
    overflow: 'hidden',
    padding: 0,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    width: '96px',
    [`&:hover:not(.${prefixCls}-disabled):not(.${prefixCls}-error)`]: {
      borderColor: token.colorPrimary,
    },
    [`&:focus-within:not(.${prefixCls}-disabled)`]: {
      borderColor: token.colorPrimary,
      boxShadow: `0 0 0 2px ${token.colorPrimaryFocus}`,
    },
    [`&.${prefixCls}-error`]: { borderColor: token.colorErrorBorder },
    [`&.${prefixCls}-error:focus-within`]: {
      borderColor: token.colorError,
      boxShadow: `0 0 0 2px ${token.colorErrorFocus}`,
    },
    [`&.${prefixCls}-disabled`]: {
      backgroundColor: token.colorNeutralBgHover,
      color: token.colorNeutralDisable,
      cursor: 'not-allowed',
    },
    [`&.${prefixCls}-small`]: { height: '24px', width: '80px' },
    [`&.${prefixCls}-medium`]: { height: '28px', width: '88px' },
    [`&.${prefixCls}-large`]: { height: '32px', width: '88px' },
    [`&.${prefixCls}-huge`]: { height: '40px', width: '96px' },
    [`.${prefixCls}-slot-input`]: {
      appearance: 'textfield',
      background: 'transparent',
      border: 0,
      borderRadius: 0,
      boxSizing: 'border-box',
      color: 'inherit',
      flex: '1 1 0',
      fontFamily: 'inherit',
      fontSize: '14px',
      fontStyle: 'normal',
      fontWeight: 400,
      height: '100%',
      letterSpacing: '0.1px',
      lineHeight: '20px',
      minWidth: 0,
      outline: 0,
      padding: '2px 12px',
      textAlign: 'left',
      '&:disabled': { color: token.colorNeutralDisable, cursor: 'not-allowed' },
    },
    [`&.${prefixCls}-small .${prefixCls}-slot-input, &.${prefixCls}-medium .${prefixCls}-slot-input`]:
      { fontSize: '12px', letterSpacing: '0.5px', lineHeight: '16px' },
    [`.${prefixCls}-slot-prefix, .${prefixCls}-slot-suffix`]: {
      alignItems: 'center',
      color: token.colorTextSecondary,
      display: 'inline-flex',
      flex: 'none',
    },
    [`.${prefixCls}-slot-prefix`]: { paddingLeft: '12px' },
    [`.${prefixCls}-slot-suffix`]: { paddingRight: '12px' },
    [`.${prefixCls}-slot-actions`]: {
      alignSelf: 'stretch',
      borderLeft: `1px solid ${token.colorNeutralBorder}`,
      display: 'none',
      flex: 'none',
      flexDirection: 'column',
      width: '28px',
    },
    [`&.${prefixCls}-medium .${prefixCls}-slot-actions`]: { width: '24px' },
    [`&.${prefixCls}-small .${prefixCls}-slot-actions`]: { width: '20px' },
    [`&.${prefixCls}-controls-vertical:hover .${prefixCls}-slot-actions, &.${prefixCls}-controls-vertical:focus-within .${prefixCls}-slot-actions`]:
      { display: 'flex' },
    [`.${prefixCls}-slot-action`]: {
      alignItems: 'center',
      background: 'transparent',
      border: 0,
      color: token.colorTextSecondary,
      cursor: 'pointer',
      display: 'flex',
      flex: '1 1 0',
      justifyContent: 'center',
      minHeight: 0,
      padding: 0,
      img: {
        display: 'block',
        height: '12px',
        objectFit: 'contain',
        width: '12px',
      },
      '&[aria-disabled="true"]': { cursor: 'not-allowed', opacity: 0.45 },
    },
    [`&.${prefixCls}-small .${prefixCls}-slot-action img`]: { height: '8px', width: '8px' },
    [`&.${prefixCls}-medium .${prefixCls}-slot-action img`]: { height: '10px', width: '10px' },
    [`&.${prefixCls}-mode-spinner`]: {
      width: '112px',
      [`.${prefixCls}-slot-input`]: { textAlign: 'center' },
      [`> .${prefixCls}-slot-action`]: {
        alignSelf: 'stretch',
        backgroundColor: token.colorNeutralBgHover,
        flex: '0 0 24px',
      },
      [`> .${prefixCls}-slot-action:first-child`]: {
        borderRight: `1px solid ${token.colorNeutralBorder}`,
        order: 0,
      },
      [`> .${prefixCls}-slot-action:last-child`]: {
        borderLeft: `1px solid ${token.colorNeutralBorder}`,
        order: 2,
      },
    },
    [`&.${prefixCls}-mode-spinner.${prefixCls}-small > .${prefixCls}-slot-action`]: {
      flexBasis: '20px',
    },
    [`&.${prefixCls}-mode-spinner.${prefixCls}-huge`]: { width: '120px' },
    [`&.${prefixCls}-mode-spinner.${prefixCls}-disabled > .${prefixCls}-slot-action`]: {
      backgroundColor: 'transparent',
    },
  },
});

export default inputNumberStyle;
