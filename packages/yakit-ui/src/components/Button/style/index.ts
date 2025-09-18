import type { CSSInterpolation } from '@ant-design/cssinjs';

const buttonStyle = (prefixCls: string): CSSInterpolation => {
  return {
    [`.${prefixCls}`]: {
      backgroundColor: 'red',
    },
  };
};
export default buttonStyle;
