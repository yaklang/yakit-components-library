import classNames from 'classnames';
import {
  forwardRef,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type Ref,
} from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import { Loading } from '@yakit-libs/yakit-ui-icons';
import { getYakitTokenVariables, type YakitCSSProperties } from '../../styles/tokenVariables';
import Wave from '../Animation/Wave';

import { ButtonGroupContext } from './ButtonGroupContext';
import './style/index.css';
import type { ButtonColors, ButtonLoading, ButtonProps, ButtonSize } from './type';

const prefixCls = 'yakit-btn';
const iconSizeMap: Record<ButtonSize, number> = {
  small: 12,
  medium: 16,
  large: 18,
  huge: 20,
};
const textTypes = new Set<ButtonProps['type']>(['text', 'text2', 'link1', 'link2']);

const resolvePalette = (
  colors: ButtonColors | undefined,
  danger: boolean,
): Exclude<ButtonColors, 'primary'> | undefined => {
  if (!colors && danger) return 'danger';
  if (colors === 'success' || colors === 'danger' || colors === 'infoBlue') return colors;
  return undefined;
};

const resolveRadius = (radius: ButtonProps['radius']) => {
  if (radius === true) return '8px';
  if (typeof radius === 'number') return `${radius}px`;
  if (typeof radius === 'string' && radius) return radius;
  return undefined;
};

const getLoadingConfig = (loading: ButtonProps['loading']) => {
  if (loading && typeof loading === 'object') {
    return { loading: true, delay: loading.delay ?? 0, icon: loading.icon };
  }
  return { loading: !!loading, delay: 0, icon: undefined as ButtonLoading['icon'] };
};

// 渲染为 <a> 时需要剔除的 button-only 属性。前 10 个取自
// ButtonHTMLAttributes 相对 HTMLAttributes 的差集；popoverTarget /
// popoverTargetAction 虽然类型上属于 HTMLAttributes（React 类型允许传给 <a>），
// 但 HTML 规范中 popovertarget 只对 button/input 生效，<a> 上无效，一并剔除。
// React 的属性名是 camelCase（formEncType 大写 T），运行时比较必须按 camelCase 匹配。
// 'disabled' / 'type' 均在解构阶段已被取走，列出仅为与差集对齐，不会被命中。
const buttonOnlyProps = [
  'disabled',
  'form',
  'formAction',
  'formEncType',
  'formMethod',
  'formNoValidate',
  'formTarget',
  'name',
  'popoverTarget',
  'popoverTargetAction',
  'type',
  'value',
] as const;

const omitButtonOnlyProps = (props: Record<string, unknown>) => {
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!(buttonOnlyProps as readonly string[]).includes(key)) rest[key] = value;
  }
  return rest;
};

// 内部保留属性的运行时剔除。data-theme 由 ConfigProvider 的主题模式控制
// （类型上不暴露给调用方）；tabIndex 由两个分支各自显式设置（anchor 分支
// 额外合并 disabled 语义，button 分支靠原生 disabled），这里剔掉、
// 单独展开会被后面的显式值覆盖，保证单一出口。
const internalStateProps = ['data-theme', 'tabIndex'] as const;

const omitInternalStateProps = (props: Record<string, unknown>) => {
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!(internalStateProps as readonly string[]).includes(key)) rest[key] = value;
  }
  return rest;
};

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      type: typeProp,
      size: sizeProp,
      shape = 'default',
      animation = 'wave',
      colors,
      danger = false,
      isHover = false,
      isActive = false,
      radius,
      htmlType = 'button',
      iconPosition = 'start',
      loading = false,
      block = false,
      href,
      target,
      rel,
      'aria-label': ariaLabel,
      style,
      icon,
      disabled: disabledProp,
      children,
      className,
      rootClassName,
      classNames: semanticClassNames,
      styles,
      onClick,
      // 内部状态由组件自身控制（aria-disabled / dir / aria-busy），先解构
      // 出来。aria-busy 与 antd 一致不设置也不透传，其余避免 {...rest}
      // 后展开时被同名 props 覆盖。
      'aria-busy': _ariaBusy,
      'aria-disabled': _ariaDisabled,
      dir: _dir,
      ...rest
    } = props;

    const config = useYakitConfig();
    const group = useContext(ButtonGroupContext);
    const inGroup = group != null;
    const size = sizeProp ?? group?.size ?? config.componentSize ?? 'medium';
    const disabled = disabledProp ?? config.componentDisabled;
    const buttonToken = config.token.YakitButton;
    const palette = resolvePalette(colors, danger);
    const radiusValue = resolveRadius(radius);
    const loadingConfig = getLoadingConfig(loading);
    const [innerLoading, setInnerLoading] = useState(
      () => loadingConfig.loading && loadingConfig.delay <= 0,
    );

    useEffect(() => {
      if (!loadingConfig.loading) {
        setInnerLoading(false);
        return;
      }
      if (loadingConfig.delay <= 0) {
        setInnerLoading(true);
        return;
      }
      const timer = window.setTimeout(() => setInnerLoading(true), loadingConfig.delay);
      return () => window.clearTimeout(timer);
    }, [loadingConfig.delay, loadingConfig.loading]);

    const type = typeProp ?? 'primary';
    const mergedDisabled = Boolean(disabled || innerLoading);
    // 语义对齐 antd：delay 只延迟 loading 图标的显示，期间不禁用按钮、
    // 点击仍触发 onClick；antd 的 Button 不设置 aria-busy，我们保持一致。
    const hasChildren = children !== undefined && children !== null && children !== false;
    const iconOnly = !hasChildren && Boolean(icon || innerLoading);
    // <button> 原生 disabled 会拦掉 mouseup/keyup；<a> 分支没有原生禁用，
    // Wave 仍会响应，所以按 mergedDisabled 一并关掉波纹。
    const showWave = animation === 'wave' && !textTypes.has(type) && !mergedDisabled;

    // 以下标记类没有对应的 CSS 规则，是给消费者和测试用的公共 API：
    // disabled / loading / icon-end 状态由 :disabled、[aria-disabled]、DOM 顺序承担，
    // in-group 供组内子按钮和消费方覆盖样式时定位。
    const classes = classNames(
      prefixCls,
      `${prefixCls}-${type}`,
      `${prefixCls}-${size}`,
      {
        [`${prefixCls}-color-${palette}`]: palette,
        [`${prefixCls}-hover`]: isHover,
        [`${prefixCls}-active`]: isActive,
        [`${prefixCls}-round`]: !inGroup && shape === 'round',
        [`${prefixCls}-disabled`]: mergedDisabled,
        [`${prefixCls}-icon-only`]: iconOnly,
        [`${prefixCls}-icon-end`]: iconPosition === 'end' && Boolean(icon || innerLoading),
        [`${prefixCls}-loading`]: innerLoading,
        [`${prefixCls}-block`]: block,
        [`${prefixCls}-in-group`]: inGroup,
      },
      className,
      rootClassName,
    );

    const iconNode = innerLoading ? (
      <span
        className={classNames(`${prefixCls}-icon`, semanticClassNames?.icon)}
        style={styles?.icon}
      >
        {loadingConfig.icon ?? <Loading color="currentColor" spin size={iconSizeMap[size]} />}
      </span>
    ) : icon ? (
      <span
        className={classNames(`${prefixCls}-icon`, semanticClassNames?.icon)}
        style={styles?.icon}
      >
        {icon}
      </span>
    ) : null;

    const content = hasChildren ? <span>{children}</span> : null;
    const childrenDom =
      iconPosition === 'end' ? (
        <>
          {content}
          {iconNode}
        </>
      ) : (
        <>
          {iconNode}
          {content}
        </>
      );

    const handleClick = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      if (mergedDisabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      onClick?.(event);
    };

    const sharedProps = {
      'aria-disabled': mergedDisabled || undefined,
      'aria-label': ariaLabel,
      className: classes,
      'data-theme': config.mode,
      dir: config.direction,
      onClick: handleClick,
      style: {
        ...getYakitTokenVariables(config.token),
        '--yakit-btn-border-radius': radiusValue ?? buttonToken?.borderRadius,
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
      } as YakitCSSProperties,
    };

    const anchorProps = omitInternalStateProps(
      omitButtonOnlyProps(rest as Record<string, unknown>),
    );
    const restTabIndex = (rest as { tabIndex?: number }).tabIndex;

    const node =
      href !== undefined ? (
        <a
          {...(sharedProps as AnchorHTMLAttributes<HTMLAnchorElement>)}
          {...anchorProps}
          href={mergedDisabled ? undefined : href}
          ref={ref as Ref<HTMLAnchorElement>}
          rel={rel}
          tabIndex={mergedDisabled ? -1 : restTabIndex}
          target={target}
        >
          {childrenDom}
        </a>
      ) : (
        <button
          {...sharedProps}
          {...omitInternalStateProps(rest as Record<string, unknown>)}
          tabIndex={restTabIndex}
          disabled={mergedDisabled}
          ref={ref as Ref<HTMLButtonElement>}
          type={htmlType}
        >
          {childrenDom}
        </button>
      );

    return <Wave animation={showWave ? 'wave' : false}>{node}</Wave>;
  },
);

Button.displayName = 'Button';
