import type { YakitTheme } from '../types/theme';

const yakitTheme = Object.freeze({
  /**
   * 主题色
   */
  colorPrimary: 'var(--Colors-Use-Main-Primary)',
  colorPrimaryPressed: 'var(--Colors-Use-Main-Pressed)',
  colorPrimaryBg: 'var(--Colors-Use-Main-Bg)',
  colorPrimaryBgHover: 'var(--Colors-Use-Main-Bg-Hover)',
  colorPrimaryFocus: 'var(--Colors-Use-Main-Focus)',
  colorPrimaryBorder: 'var(--Colors-Use-Main-Border)',
  colorPrimaryHover: 'var(--Colors-Use-Main-Hover)',
  colorPrimaryText: 'var(--Colors-Use-Main-On-Primary)',
  colorPrimaryTextActive: 'var(--Colors-Use-Main-On-Primary)',
  colorPrimaryTextHover: 'var(--Colors-Use-Main-On-Primary)',

  /**
   * 错误色
   */
  colorError: 'var(--Colors-Use-Error-Primary)',
  colorErrorPressed: 'var(--Colors-Use-Error-Pressed)',
  colorErrorBg: 'var(--Colors-Use-Error-Bg)',
  colorErrorBgHover: 'var(--Colors-Use-Error-Bg-Hover)',
  colorErrorFocus: 'var(--Colors-Use-Error-Focus)',
  colorErrorBorder: 'var(--Colors-Use-Error-Border)',
  colorErrorHover: 'var(--Colors-Use-Error-Hover)',
  colorErrorText: 'var(--Colors-Use-Error-On-Primary)',
  colorErrorTextActive: 'var(--Colors-Use-Error-On-Primary)',
  colorErrorTextHover: 'var(--Colors-Use-Error-On-Primary)',

  /**
   * 成功色
   */
  colorSuccess: 'var(--Colors-Use-Success-Primary)',
  colorSuccessPressed: 'var(--Colors-Use-Success-Pressed)',
  colorSuccessBg: 'var(--Colors-Use-Success-Bg)',
  colorSuccessBgHover: 'var(--Colors-Use-Success-Bg-Hover)',
  colorSuccessFocus: 'var(--Colors-Use-Success-Focus)',
  colorSuccessBorder: 'var(--Colors-Use-Success-Border)',
  colorSuccessHover: 'var(--Colors-Use-Success-Hover)',
  colorSuccessText: 'var(--Colors-Use-Success-On-Primary)',
  colorSuccessTextActive: 'var(--Colors-Use-Success-On-Primary)',
  colorSuccessTextHover: 'var(--Colors-Use-Success-On-Primary)',

  /**
   * 警告色
   */
  colorWarning: 'var(--Colors-Use-Warning-Primary)',
  colorWarningPressed: 'var(--Colors-Use-Warning-Pressed)',
  colorWarningBg: 'var(--Colors-Use-Warning-Background)',
  colorWarningBgHover: 'var(--Colors-Use-Warning-Background-Hover)',
  colorWarningBorder: 'var(--Colors-Use-Warning-Border)',
  colorWarningFocus: 'var(--Colors-Use-Warning-Focus)',
  colorWarningHover: 'var(--Colors-Use-Warning-Hover)',
  colorWarningText: 'var(--Colors-Use-Warning-On-Primary)',
  colorWarningTextActive: 'var(--Colors-Use-Warning-On-Primary)',
  colorWarningTextHover: 'var(--Colors-Use-Warning-On-Primary)',

  /**
   * 本文颜色
   */
  colorTextTitle: 'var(--Colors-Use-Neutral-Text-1-Title)',
  colorTextPrimary: 'var(--Colors-Use-Neutral-Text-2-Primary)',
  colorTextSecondary: 'var(--Colors-Use-Neutral-Text-3-Secondary)',
  colorTextHelp: 'var(--Colors-Use-Neutral-Text-4-Help-text)',
  colorTextBase: 'var(--Colors-Use-Basic-Background)',

  /**
   * 背景颜色
   */
  colorBasicBackground: 'var(--Colors-Use-Basic-Background)',
  colorNeutralBgHover: 'var(--Colors-Use-Neutral-Bg-Hover)',
  colorNeutralDisable: 'var(--Colors-Use-Neutral-Disable)',

  /**
   * 边框颜色
   */
  colorBorder: 'var(--Colors-Use-Neutral-Border)',
} as YakitTheme);

export default yakitTheme;
