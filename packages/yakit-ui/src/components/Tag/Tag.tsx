import classNames from 'classnames';
import type { FC, ReactNode, MouseEvent } from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import { getYakitTokenVariables } from '../../styles/tokenVariables';
import type { YakitCSSProperties } from '../../styles/tokenVariables';
import type { BaseProps } from '../../types/common';

import './style/index.css';

export interface TagProps extends BaseProps {
  children?: ReactNode;
  icon?: ReactNode;
  bordered?: boolean;
  closeIcon?: ReactNode | boolean;
  size?: 'small' | 'middle' | 'large';
  color?:
    | 'default'
    | 'primary'
    | 'success'
    | 'warning'
    | 'error'
    | 'purple'
    | 'magenta'
    | 'blue'
    | 'lake-blue'
    | 'cyan'
    | 'orange'
    | 'neutral'
    | 'yellow';
  onClose?: (e: MouseEvent<HTMLSpanElement>) => void;
}

const prefixCls = 'yakit-tag';

export const Tag: FC<TagProps> = ({
  bordered = true,
  size = 'middle',
  color = 'default',
  children,
  rootClassName,
  className,
  style,
}) => {
  const config = useYakitConfig();
  const tagToken = config.token.YakitTag;

  const classes = classNames(prefixCls, className, rootClassName, {
    [`${prefixCls}-bordered`]: !bordered,
    [`${prefixCls}-${size}`]: size,
    [`${prefixCls}-${color}`]: color,
  });

  return (
    <span
      className={classes}
      data-theme={config.mode}
      dir={config.direction}
      style={
        {
          ...getYakitTokenVariables(config.token),
          '--yakit-tag-border-radius-lg': tagToken?.borderRadiusLG,
          '--yakit-tag-border-radius-md': tagToken?.borderRadiusMD,
          '--yakit-tag-border-radius-sm': tagToken?.borderRadiusSM,
          '--yakit-tag-padding-lg': tagToken?.paddingLG,
          '--yakit-tag-padding-md': tagToken?.paddingMD,
          '--yakit-tag-padding-sm': tagToken?.paddingSM,
          ...style,
        } as YakitCSSProperties
      }
    >
      {children}
    </span>
  );
};
