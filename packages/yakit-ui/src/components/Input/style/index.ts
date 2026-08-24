import type { CSSInterpolation } from '@ant-design/cssinjs';

import type { GlobalToken } from '../../../types/token';

const inputStyle = (prefixCls: string, token: GlobalToken): CSSInterpolation => ({
  [`.${prefixCls}`]: {
    borderColor: token.colorNeutralBorder,
    borderRadius: '4px',
    boxShadow: 'none',
    boxSizing: 'border-box',
    color: token.colorTextTitle,
    fontFamily: 'PingFang SC',
    minWidth: 0,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    width: '100%',

    // Keep Figma tokens authoritative over Ant Design's outlined status selectors.
    '&&': {
      borderColor: token.colorNeutralBorder,

      [`&:hover:not(.${prefixCls}-disabled):not(.${prefixCls}-error)`]: {
        borderColor: token.colorPrimary,
      },
      [`&.${prefixCls}-focused:not(.${prefixCls}-disabled):not(.${prefixCls}-error), &:focus:not(.${prefixCls}-disabled):not(.${prefixCls}-error), &:focus-within:not(.${prefixCls}-disabled):not(.${prefixCls}-error)`]:
        {
          borderColor: `${token.colorPrimary} !important`,
          boxShadow: `0 0 0 2px ${token.colorPrimaryFocus} !important`,
        },
      [`&.${prefixCls}-error`]: { borderColor: token.colorErrorBorder },
      [`&.${prefixCls}-error:hover`]: { borderColor: token.colorError },
      [`&.${prefixCls}-error:focus, &.${prefixCls}-error:focus-within`]: {
        borderColor: token.colorError,
        boxShadow: `0 0 0 2px ${token.colorErrorFocus}`,
      },
      [`&.${prefixCls}-disabled`]: {
        backgroundColor: token.colorNeutralBgHover,
        borderColor: token.colorNeutralBorder,
        color: token.colorNeutralDisable,
        cursor: 'not-allowed',
      },
    },
    [`&.${prefixCls}-small`]: {
      fontSize: '12px',
      height: '24px',
      lineHeight: '16px',
      paddingBlock: '3px',
      paddingInline: '8px',
    },
    [`&.${prefixCls}-medium`]: {
      fontSize: '12px',
      height: '28px',
      lineHeight: '16px',
      paddingBlock: '5px',
      paddingInline: '12px',
    },
    [`&.${prefixCls}-large`]: {
      fontSize: '14px',
      height: '32px',
      lineHeight: '20px',
      paddingBlock: '5px',
      paddingInline: '12px',
    },
    [`.${prefixCls}-slot-input`]: {
      color: 'inherit',
      fontFamily: 'inherit',
      '&::placeholder': { color: token.colorNeutralDisable, opacity: 1 },
    },
    [`.${prefixCls}-slot-root .${prefixCls}-slot-input`]: {
      border: 0,
      boxShadow: 'none',
      height: '100%',
      padding: 0,
    },
    [`.${prefixCls}-slot-prefix, .${prefixCls}-slot-suffix`]: {
      alignItems: 'center',
      color: token.colorTextSecondary,
      display: 'inline-flex',
    },
    [`&.${prefixCls}-slot-root:has(.${prefixCls}-select)`]: {
      paddingInline: 0,
      [`.${prefixCls}-slot-input`]: { paddingInline: '12px' },
      [`.${prefixCls}-slot-prefix, .${prefixCls}-slot-suffix`]: {
        alignSelf: 'stretch',
        height: '100%',
        marginInline: 0,
      },
    },
    [`.${prefixCls}-select`]: {
      alignItems: 'center',
      alignSelf: 'stretch',
      backgroundColor: '#F8F9FA',
      border: 0,
      boxShadow: 'none',
      color: token.colorTextTitle,
      cursor: 'pointer',
      display: 'inline-flex',
      font: 'inherit',
      gap: '8px',
      justifyContent: 'center',
      lineHeight: '20px',
      paddingInline: '12px',
      whiteSpace: 'nowrap',
      '&:disabled': {
        color: token.colorNeutralDisable,
        cursor: 'not-allowed',
      },
      '&:focus-visible': {
        boxShadow: `inset 0 0 0 2px ${token.colorPrimaryFocus}`,
        outline: `1px solid ${token.colorPrimary}`,
        outlineOffset: '-1px',
      },
    },
    [`.${prefixCls}-select-icon`]: {
      display: 'block',
      flex: '0 0 auto',
      height: '4.5px',
      width: '8px',
    },
    [`.${prefixCls}-slot-prefix .${prefixCls}-select`]: {
      borderRadius: '3px 0 0 3px',
      borderRight: `1px solid ${token.colorNeutralBorder}`,
    },
    [`.${prefixCls}-slot-suffix .${prefixCls}-select`]: {
      borderLeft: `1px solid ${token.colorNeutralBorder}`,
      borderRadius: '0 3px 3px 0',
    },
  },
  [`.${prefixCls}-textarea`]: { height: 'auto', minHeight: '32px', resize: 'vertical' },
  [`.${prefixCls}-textarea.${prefixCls}-small`]: { minHeight: '24px' },
  [`.${prefixCls}-textarea.${prefixCls}-medium`]: { minHeight: '28px' },
  [`.${prefixCls}.${prefixCls}-focused:not(.${prefixCls}-error)`]: {
    borderColor: `${token.colorPrimary} !important`,
    boxShadow: `0 0 0 2px ${token.colorPrimaryFocus} !important`,
  },
  [`.${prefixCls}-slot-textarea`]: {
    fontFamily: 'inherit',
    resize: 'vertical',
    '&::placeholder': { color: token.colorNeutralDisable, opacity: 1 },
  },
  [`.${prefixCls}-otp`]: {
    [`&.${prefixCls}-small .${prefixCls}-otp-slot-input`]: { height: '24px' },
    [`&.${prefixCls}-medium .${prefixCls}-otp-slot-input`]: { height: '28px' },
    [`&.${prefixCls}-large .${prefixCls}-otp-slot-input`]: { height: '32px' },
    [`.${prefixCls}-otp-slot-input`]: {
      borderColor: token.colorNeutralBorder,
      borderRadius: '4px',
      boxShadow: 'none',
      '&:hover': { borderColor: token.colorPrimary },
      '&:focus': {
        borderColor: token.colorPrimary,
        boxShadow: `0 0 0 2px ${token.colorPrimaryFocus}`,
      },
    },
  },
});

export default inputStyle;
