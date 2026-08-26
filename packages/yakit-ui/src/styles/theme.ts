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
  colorWarningBg: 'var(--Colors-Use-Warning-Bg)',
  colorWarningBgHover: 'var(--Colors-Use-Warning-Bg-Hover)',
  colorWarningBorder: 'var(--Colors-Use-Warning-Border)',
  colorWarningFocus: 'var(--Colors-Use-Warning-Focus)',
  colorWarningHover: 'var(--Colors-Use-Warning-Hover)',
  colorWarningText: 'var(--Colors-Use-Warning-On-Primary)',
  colorWarningTextActive: 'var(--Colors-Use-Warning-On-Primary)',
  colorWarningTextHover: 'var(--Colors-Use-Warning-On-Primary)',

  /**
   * 文本颜色
   */
  colorTextTitle: 'var(--Colors-Use-Neutral-Text-1-Title)',
  colorTextPrimary: 'var(--Colors-Use-Neutral-Text-2-Primary)',
  colorTextSecondary: 'var(--Colors-Use-Neutral-Text-3-Secondary)',
  colorTextHelp: 'var(--Colors-Use-Neutral-Text-4-Help-text)',
  colorTextBase: 'var(--Colors-Use-Basic-Background)',
  colorText: 'var(--Colors-Use-Neutral-Text-1-Title)',

  /**
   * 颜色 Purple
   */
  colorPurple: 'var(--Colors-Use-Purple-Primary)',
  colorPurpleBg: 'var(--Colors-Use-Purple-Bg)',
  colorPurpleBgHover: 'var(--Colors-Use-Purple-Bg-Hover)',
  colorPurpleBorder: 'var(--Colors-Use-Purple-Border)',
  colorPurpleText: 'var(--Colors-Use-Purple-On-Primary)',

  /**
   * 颜色 Magenta
   */
  colorMagenta: 'var(--Colors-Use-Magenta-Primary)',
  colorMagentaBg: 'var(--Colors-Use-Magenta-Bg)',
  colorMagentaBgHover: 'var(--Colors-Use-Magenta-Bg-Hover)',
  colorMagentaBorder: 'var(--Colors-Use-Magenta-Border)',
  colorMagentaText: 'var(--Colors-Use-Magenta-On-Primary)',

  /**
   * 颜色 Blue
   */
  colorBlue: 'var(--Colors-Use-Blue-Primary)',
  colorBlueBg: 'var(--Colors-Use-Blue-Bg)',
  colorBlueBgHover: 'var(--Colors-Use-Blue-Bg-Hover)',
  colorBlueBorder: 'var(--Colors-Use-Blue-Border)',
  colorBlueText: 'var(--Colors-Use-Blue-On-Primary)',

  /**
   * 颜色 Lake Blue
   */
  colorLakeBlue: 'var(--Colors-Use-Lake-blue-Primary)',
  colorLakeBlueBg: 'var(--Colors-Use-Lake-blue-Bg)',
  colorLakeBlueBgHover: 'var(--Colors-Use-Lake-blue-Bg-Hover)',
  colorLakeBlueBorder: 'var(--Colors-Use-Lake-blue-Border)',
  colorLakeBlueText: 'var(--Colors-Use-Lake-blue-On-Primary)',

  /**
   * 颜色 Cyan
   */
  colorCyan: 'var(--Colors-Use-Cyan-Primary)',
  colorCyanBg: 'var(--Colors-Use-Cyan-Bg)',
  colorCyanBgHover: 'var(--Colors-Use-Cyan-Bg-Hover)',
  colorCyanBorder: 'var(--Colors-Use-Cyan-Border)',
  colorCyanText: 'var(--Colors-Use-Cyan-On-Primary)',

  /**
   * 颜色 Orange
   */
  colorOrange: 'var(--Colors-Use-Orange-Primary)',
  colorOrangeBg: 'var(--Colors-Use-Orange-Bg)',
  colorOrangeBgHover: 'var(--Colors-Use-Orange-Bg-Hover)',
  colorOrangeBorder: 'var(--Colors-Use-Orange-Border)',
  colorOrangeText: 'var(--Colors-Use-Orange-On-Primary)',

  /**
   * 颜色 Yellow
   */
  colorYellow: 'var(--Colors-Use-Yellow-Primary)',
  colorYellowBg: 'var(--Colors-Use-Yellow-Bg)',
  colorYellowBgHover: 'var(--Colors-Use-Yellow-Bg-Hover)',
  colorYellowBorder: 'var(--Colors-Use-Yellow-Border)',
  colorYellowText: 'var(--Colors-Use-Yellow-On-Primary)',

  /**
   * 背景颜色
   */
  colorBasicBackground: 'var(--Colors-Use-Basic-Background)',
  colorNeutralBgHover: 'var(--Colors-Use-Neutral-Bg-Hover)',
  colorNeutralDisable: 'var(--Colors-Use-Neutral-Disable)',
  colorNeutralBorder: 'var(--Colors-Use-Neutral-Border)',

  /**
   * 边框颜色
   */
  colorBorder: 'var(--Colors-Use-Neutral-Border)',
} as YakitTheme);

export default yakitTheme;
