import classNames from 'classnames';
import { forwardRef, useMemo } from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import { getYakitTokenVariables, type YakitCSSProperties } from '../../styles/tokenVariables';

import { ButtonGroupContext } from './ButtonGroupContext';
import type { ButtonGroupProps } from './type';

const prefixCls = 'yakit-btn-group';

export const Group = forwardRef<HTMLDivElement, ButtonGroupProps>((props, ref) => {
  const { size, shape = 'default', className, rootClassName, style, children, ...rest } = props;
  const config = useYakitConfig();

  // 与 ConfigProvider 一致：缓存 context 值，避免 Group 因 className 等无关
  // props 重渲染时，通过 context 扇出导致所有子按钮跟着重渲染。
  const contextValue = useMemo(() => ({ size }), [size]);

  return (
    <ButtonGroupContext.Provider value={contextValue}>
      <div
        {...rest}
        ref={ref}
        role="group"
        data-theme={config.mode}
        dir={config.direction}
        className={classNames(
          prefixCls,
          {
            [`${prefixCls}-${size}`]: size,
            [`${prefixCls}-round`]: shape === 'round',
          },
          className,
          rootClassName,
        )}
        style={{ ...getYakitTokenVariables(config.token), ...style } as YakitCSSProperties}
      >
        {children}
      </div>
    </ButtonGroupContext.Provider>
  );
});

Group.displayName = 'Button.Group';
