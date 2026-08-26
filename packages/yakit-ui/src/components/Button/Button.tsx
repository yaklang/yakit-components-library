import classNames from 'classnames';
import { useMemo, type FC } from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import Loading from '../../icons/loading';
import { getYakitTokenVariables } from '../../styles/tokenVariables';
import type { YakitCSSProperties } from '../../styles/tokenVariables';
import { returnOrFalse } from '../../utils';
import Wave from '../Animation/Wave';

import { usePressed } from './hooks/usePressed';
import './style/index.css';
import type { ButtonProps } from './type';

const prefixCls = 'yakit-btn';

export const Button: FC<ButtonProps> = ({
  type = 'primary',
  size: sizeProp,
  shape = 'default',
  animation = 'wave',
  color = 'primary',
  error = false,
  htmlType = 'button',
  iconPosition = 'start',
  loading,
  'aria-label': ariaLabel,
  style,
  icon,
  disabled: disabledProp,
  children,
  className,
  rootClassName,
  onClick,
}) => {
  const config = useYakitConfig();
  const size = sizeProp ?? config.componentSize ?? 'medium';
  const disabled = disabledProp ?? config.componentDisabled;
  const buttonToken = config.token.YakitButton;

  const { pressed, bind } = usePressed();
  const buttonColor = error ? 'error' : color;

  const classes = classNames(
    prefixCls,
    {
      [`${prefixCls}-${type}`]: type,
      [`${prefixCls}-${size}`]: size,
      [`${prefixCls}-${shape}`]: returnOrFalse(shape),
      [`${prefixCls}-disabled`]: disabled,
      [`${prefixCls}-${type}-pressed`]: pressed,
      [`${prefixCls}-icon-only`]: icon && !children,
      [`${prefixCls}-color-${buttonColor}`]: buttonColor,
      [`${prefixCls}-icon-end`]: iconPosition === 'end',
      [`${prefixCls}-loading`]: loading,
    },
    className,
    rootClassName,
  );

  const childrenDom = useMemo(() => {
    let content;
    if (typeof children === 'string') {
      content = <span>{children}</span>;
    } else {
      content = children;
    }
    if (loading) {
      return (
        <>
          <Loading spin />
          {content}
        </>
      );
    }
    return (
      <>
        {icon && <span className={`${prefixCls}-icon`}>{icon}</span>}
        {content}
      </>
    );
  }, [children, icon, loading]);

  return (
    <Wave animation={animation}>
      <button
        data-theme={config.mode}
        style={
          {
            ...getYakitTokenVariables(config.token),
            '--yakit-btn-border-radius': buttonToken?.borderRadius,
            '--yakit-btn-font-size-lg': buttonToken?.fontSizeLG,
            '--yakit-btn-font-size-md': buttonToken?.fontSizeMD,
            '--yakit-btn-font-size-sm': buttonToken?.fontSizeSM,
            '--yakit-btn-font-size-xl': buttonToken?.fontSizeXL,
            '--yakit-btn-icon-gap': buttonToken?.iconGap,
            '--yakit-btn-padding-lg': buttonToken?.paddingLG,
            '--yakit-btn-padding-md': buttonToken?.paddingMD,
            '--yakit-btn-padding-sm': buttonToken?.paddingSM,
            '--yakit-btn-padding-xl': buttonToken?.paddingXL,
            ...style,
          } as YakitCSSProperties
        }
        type={htmlType}
        dir={config.direction}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-label={ariaLabel}
        onClick={(e) => {
          if (disabled || loading) return;
          onClick?.(e);
        }}
        className={classes}
        {...bind}
      >
        {childrenDom}
      </button>
    </Wave>
  );
};
