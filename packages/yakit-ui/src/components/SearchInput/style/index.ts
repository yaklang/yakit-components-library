import type { CSSInterpolation } from '@ant-design/cssinjs';

import type { GlobalToken } from '../../../types/token';

const searchInputStyle = (prefixCls: string, token: GlobalToken): CSSInterpolation => ({
  [`.${prefixCls}`]: {
    alignItems: 'stretch',
    boxSizing: 'border-box',
    display: 'inline-flex',
    fontFamily: 'PingFang SC',
    minWidth: 0,
    width: '100%',
    [`.${prefixCls}-slot-control`]: {
      display: 'flex',
      flex: '1 1 0',
      minWidth: 0,
      padding: 0,
      width: '100%',
    },
    [`.${prefixCls}-slot-field`]: {
      background: token.colorBasicBackground,
      border: `1px solid ${token.colorNeutralBorder}`,
      borderRadius: '4px',
      boxSizing: 'border-box',
      color: token.colorTextTitle,
      flex: '1 1 0',
      fontFamily: 'inherit',
      height: '100%',
      minWidth: 0,
      padding: '4px 8px',
      '&::placeholder': { color: token.colorNeutralDisable, opacity: 1 },
    },
    [`.${prefixCls}-field-affix-wrapper`]: {
      alignItems: 'center',
      background: token.colorBasicBackground,
      border: `1px solid ${token.colorNeutralBorder}`,
      borderRadius: '4px',
      boxShadow: 'none',
      boxSizing: 'border-box',
      color: token.colorTextTitle,
      display: 'flex',
      flex: '1 1 0',
      fontFamily: 'inherit',
      height: '100%',
      minWidth: 0,
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    },
    [`.${prefixCls}-field-affix-wrapper .${prefixCls}-slot-field`]: {
      background: 'transparent',
      border: 0,
      borderRadius: 0,
      height: '100%',
      padding: 0,
    },
    [`.${prefixCls}-slot-prefix, .${prefixCls}-slot-suffix`]: {
      alignItems: 'center',
      display: 'inline-flex',
    },
    [`.${prefixCls}-slot-button`]: {
      alignItems: 'center',
      background: 'transparent',
      border: 0,
      borderRadius: '0 4px 4px 0',
      boxShadow: 'none',
      boxSizing: 'border-box',
      color: token.colorTextSecondary,
      display: 'inline-flex',
      flex: '0 0 auto',
      height: '100%',
      justifyContent: 'center',
      minWidth: 0,
      padding: '4px',
      width: '100%',
      img: { display: 'block' },
    },
    [`&.${prefixCls}-box`]: {
      borderRadius: '4px',
      [`&:hover:not(.${prefixCls}-disabled) .${prefixCls}-slot-field, &:hover:not(.${prefixCls}-disabled) .${prefixCls}-field-affix-wrapper`]:
        {
          borderColor: token.colorPrimary,
        },
      [`&:focus-within:not(.${prefixCls}-disabled) .${prefixCls}-slot-field, &:focus-within:not(.${prefixCls}-disabled) .${prefixCls}-field-affix-wrapper`]:
        {
          borderColor: token.colorPrimary,
          boxShadow: `0 0 0 2px ${token.colorPrimaryFocus}`,
        },
      [`&:not(.${prefixCls}-has-action) .${prefixCls}-slot-button`]: { display: 'none' },
    },
    [`&.${prefixCls}-error .${prefixCls}-slot-field, &.${prefixCls}-error .${prefixCls}-field-affix-wrapper`]:
      {
        borderColor: token.colorErrorBorder,
      },
    [`&.${prefixCls}-error:focus-within .${prefixCls}-slot-field, &.${prefixCls}-error:focus-within .${prefixCls}-field-affix-wrapper`]:
      {
        borderColor: token.colorError,
        boxShadow: `0 0 0 2px ${token.colorErrorFocus}`,
      },
    [`&.${prefixCls}-main-bg, &.${prefixCls}-dropdown`]: {
      [`.${prefixCls}-slot-field, .${prefixCls}-field-affix-wrapper`]: {
        borderRadius: '4px 0 0 4px',
        borderRight: 0,
      },
      [`.${prefixCls}-slot-button`]: {
        backgroundColor: token.colorPrimary,
        color: token.colorBasicBackground,
      },
    },
    [`&.${prefixCls}-dropdown`]: {
      [`.${prefixCls}-selector-wrap, .${prefixCls}-selector`]: {
        alignItems: 'center',
        background: token.colorBasicBackground,
        border: `1px solid ${token.colorNeutralBorder}`,
        borderRight: 0,
        borderRadius: '4px 0 0 4px',
        boxSizing: 'border-box',
        color: token.colorTextTitle,
        font: 'inherit',
        fontSize: '12px',
        height: '100%',
        maxWidth: '120px',
        minWidth: '72px',
        padding: '0 8px',
      },
      [`.${prefixCls}-selector-wrap`]: {
        display: 'inline-flex',
        flex: '0 0 auto',
        gap: '4px',
        '&:focus-within': {
          borderColor: token.colorPrimary,
          boxShadow: `0 0 0 2px ${token.colorPrimaryFocus}`,
          position: 'relative',
          zIndex: 1,
        },
      },
      [`.${prefixCls}-selector`]: {
        appearance: 'none',
        background: 'transparent',
        border: 0,
        flex: '1 1 auto',
        maxWidth: '100%',
        minWidth: 0,
        outline: 0,
        padding: 0,
      },
      [`.${prefixCls}-selector-icon`]: {
        display: 'block',
        flex: '0 0 auto',
        height: '4.5px',
        width: '8px',
      },
      [`.${prefixCls}-selector-static`]: {
        alignItems: 'center',
        display: 'inline-flex',
        gap: '4px',
      },
      [`.${prefixCls}-slot-field, .${prefixCls}-field-affix-wrapper`]: {
        borderLeft: 0,
        borderRadius: 0,
      },
    },
    [`&.${prefixCls}-disabled .${prefixCls}-slot-field, &.${prefixCls}-disabled .${prefixCls}-field-affix-wrapper`]:
      {
        backgroundColor: token.colorNeutralBgHover,
        borderColor: token.colorNeutralBorder,
        color: token.colorNeutralDisable,
        cursor: 'not-allowed',
      },
    [`&.${prefixCls}-small`]: { height: '20px', fontSize: '11px' },
    [`&.${prefixCls}-medium`]: { height: '24px', fontSize: '12px' },
    [`&.${prefixCls}-large`]: { height: '28px', fontSize: '12px' },
    [`&.${prefixCls}-huge`]: { height: '32px', fontSize: '14px' },
    [`&.${prefixCls}-small .${prefixCls}-slot-field, &.${prefixCls}-small .${prefixCls}-field-affix-wrapper`]:
      {
        fontSize: '11px',
        lineHeight: '16px',
        paddingInline: '6px',
      },
    [`&.${prefixCls}-medium .${prefixCls}-slot-field, &.${prefixCls}-medium .${prefixCls}-field-affix-wrapper, &.${prefixCls}-large .${prefixCls}-slot-field, &.${prefixCls}-large .${prefixCls}-field-affix-wrapper`]:
      {
        fontSize: '12px',
        lineHeight: '16px',
        paddingInline: '8px',
      },
    [`&.${prefixCls}-huge .${prefixCls}-slot-field, &.${prefixCls}-huge .${prefixCls}-field-affix-wrapper`]:
      {
        fontSize: '14px',
        lineHeight: '20px',
        paddingInline: '12px',
      },
    [`&.${prefixCls}-small .${prefixCls}-slot-button`]: { flexBasis: '20px', width: '20px' },
    [`&.${prefixCls}-medium .${prefixCls}-slot-button`]: { flexBasis: '24px', width: '24px' },
    [`&.${prefixCls}-large .${prefixCls}-slot-button`]: { flexBasis: '28px', width: '28px' },
    [`&.${prefixCls}-huge .${prefixCls}-slot-button`]: { flexBasis: '32px', width: '32px' },
    [`&.${prefixCls}-small .${prefixCls}-slot-prefix img, &.${prefixCls}-small .${prefixCls}-slot-suffix img, &.${prefixCls}-small .${prefixCls}-slot-button img`]:
      { height: '12px', width: '12px' },
    [`&.${prefixCls}-medium .${prefixCls}-slot-prefix img, &.${prefixCls}-medium .${prefixCls}-slot-suffix img, &.${prefixCls}-medium .${prefixCls}-slot-button img`]:
      { height: '16px', width: '16px' },
    [`&.${prefixCls}-large .${prefixCls}-slot-prefix img, &.${prefixCls}-large .${prefixCls}-slot-suffix img, &.${prefixCls}-large .${prefixCls}-slot-button img`]:
      { height: '20px', width: '20px' },
    [`&.${prefixCls}-huge .${prefixCls}-slot-prefix img, &.${prefixCls}-huge .${prefixCls}-slot-suffix img, &.${prefixCls}-huge .${prefixCls}-slot-button img`]:
      { height: '24px', width: '24px' },
    // In affix mode the wrapper owns Figma's horizontal padding. The native input
    // must not add a second 8px inset after a leading icon.
    [`&& .${prefixCls}-field-affix-wrapper .${prefixCls}-slot-field`]: { paddingInline: 0 },
    [`&.${prefixCls}-icon-only`]: {
      alignItems: 'center',
      background: 'transparent',
      border: 0,
      borderRadius: '4px',
      cursor: 'pointer',
      justifyContent: 'center',
      padding: '4px',
      width: '24px',
      '&:hover:not(:disabled)': { backgroundColor: token.colorNeutralBgHover },
      '&:focus-visible': { boxShadow: `0 0 0 2px ${token.colorPrimaryFocus}`, outline: 0 },
      '&:disabled': { cursor: 'not-allowed' },
    },
    [`&.${prefixCls}-icon-only.${prefixCls}-small`]: { padding: '2px', width: '20px' },
    [`&.${prefixCls}-icon-only.${prefixCls}-large`]: { padding: '6px', width: '28px' },
    [`&.${prefixCls}-icon-only.${prefixCls}-huge`]: { padding: '6px', width: '32px' },
    [`.${prefixCls}-icon`]: {
      alignItems: 'center',
      display: 'inline-flex',
      justifyContent: 'center',
      img: { display: 'block', height: '13px', width: '13px' },
    },
  },
});

export default searchInputStyle;
