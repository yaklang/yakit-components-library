import type { CSSInterpolation } from '@ant-design/cssinjs';

import type { GlobalToken } from '../../../types/token';
import type { YakitTagToken } from '../../../types/token/YakitTag';

const defaultTag: YakitTagToken = {
  paddingSM: '2px 6px',
  paddingMD: '2px 8px',
  paddingLG: '4px 8px',
  borderRadiusSM: '2px',
  borderRadiusMD: '4px',
  borderRadiusLG: '4px',
};

const genSizeVars = (btnToken: YakitTagToken) => ({
  [`&-small`]: {
    padding: btnToken.paddingSM,
    borderRadius: btnToken.borderRadiusSM,
    fontSize: '11px',
    height: '16px',
  },
  [`&-middle`]: {
    padding: btnToken.paddingMD,
    borderRadius: btnToken.borderRadiusMD,
    fontSize: '12px',
    height: '20px',
  },
  [`&-large`]: {
    padding: btnToken.paddingLG,
    borderRadius: btnToken.borderRadiusLG,
    fontSize: '12px',
    height: '24px',
  },
});

const genColorVars = (token: GlobalToken) => ({
  ['&-default']: {
    backgroundColor: token.colorBorder,
    color: token.colorTextSecondary,
    borderColor: token.colorNeutralBorder,
  },
  ['&-primary']: {
    backgroundColor: token.colorPrimaryFocus,
    color: token.colorPrimary,
    borderColor: token.colorPrimaryBorder,
  },
  ['&-success']: {
    backgroundColor: token.colorSuccessFocus,
    color: token.colorSuccess,
    borderColor: token.colorSuccessBorder,
  },
  ['&-warning']: {
    backgroundColor: token.colorWarningFocus,
    color: token.colorWarning,
    borderColor: token.colorWarningBorder,
  },
  ['&-error']: {
    backgroundColor: token.colorErrorFocus,
    color: token.colorError,
    borderColor: token.colorErrorBorder,
  },
  ['&-purple']: {
    backgroundColor: token.colorPurpleBg,
    color: token.colorPurple,
    borderColor: token.colorPurpleBorder,
  },
  ['&-magenta']: {
    backgroundColor: token.colorMagentaBg,
    color: token.colorMagenta,
    borderColor: token.colorMagentaBorder,
  },
  ['&-blue']: {
    backgroundColor: token.colorBlueBg,
    color: token.colorBlue,
    borderColor: token.colorBlueBorder,
  },
  ['&-lake-blue']: {
    backgroundColor: token.colorLakeBlueBg,
    color: token.colorLakeBlue,
    borderColor: token.colorLakeBlueBorder,
  },
  ['&-cyan']: {
    backgroundColor: token.colorCyanBg,
    color: token.colorCyan,
    borderColor: token.colorCyanBorder,
  },
  ['&-orange']: {
    backgroundColor: token.colorOrangeBg,
    color: token.colorOrange,
    borderColor: token.colorOrangeBorder,
  },
  ['&-neutral']: {
    backgroundColor: token.colorNeutralBorder,
    color: token.colorText,
    borderColor: token.colorNeutralBorder,
  },
  ['&-yellow']: {
    backgroundColor: token.colorYellowBg,
    color: token.colorYellow,
    borderColor: token.colorYellowBorder,
  },
});

const tagStyle = (prefixCls: string, token: GlobalToken): CSSInterpolation => {
  const tagToken = {
    ...defaultTag,
    ...token?.YakitTag,
  };
  return {
    [`.${prefixCls}`]: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      border: '1px solid transparent',

      [`&.${prefixCls}-bordered`]: {
        borderColor: 'transparent',
      },

      ...genSizeVars(tagToken),
      ...genColorVars(token),
    },
  };
};

export default tagStyle;
