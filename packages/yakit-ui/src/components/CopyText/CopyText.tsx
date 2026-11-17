import classNames from 'classnames';
import { forwardRef, memo, useMemo } from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import { getYakitTokenVariables } from '../../styles/tokenVariables';
import type { YakitCSSProperties } from '../../styles/tokenVariables';
import { TagCopy } from '../Tag';

import './style/index.css';
import type { CopyTextProps, CopyTextRef } from './type';

const prefixCls = 'yakit-copy-text';

export const CopyText = memo(
  forwardRef<CopyTextRef, CopyTextProps>(function CopyText(
    {
      showText,
      copyText,
      onAfterCopy,
      iconColor,
      wrapStyle,
      disabled,
      size,
      className,
      rootClassName,
      style,
    },
    ref,
  ) {
    const config = useYakitConfig();
    const payload = copyText || showText;

    const rootStyle = useMemo(
      (): YakitCSSProperties => ({
        ...getYakitTokenVariables(config.token),
        ...wrapStyle,
        ...style,
      }),
      [config.token, wrapStyle, style],
    );

    return (
      <div
        ref={ref}
        data-theme={config.mode}
        className={classNames(prefixCls, className, rootClassName)}
        style={rootStyle}
      >
        <span className={`${prefixCls}-content`}>{showText}</span>
        <TagCopy
          copyText={payload}
          color={iconColor}
          size={size}
          disabled={disabled}
          onCopy={onAfterCopy}
        />
      </div>
    );
  }),
);

CopyText.displayName = 'CopyText';
