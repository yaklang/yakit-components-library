import classNames from 'classnames'
import type { CSSProperties, FC, ReactNode } from 'react'

import useYakitConfig from '../../hooks/useYakitConfig'
import { getYakitTokenVariables } from '../../styles/tokenVariables'
import type { YakitCSSProperties } from '../../styles/tokenVariables'

import './style/index.css'
import type { CardProps } from './type'

const prefixCls = 'yakit-card'

const hasContent = (content: ReactNode) => content !== null && content !== undefined && typeof content !== 'boolean'

const resolveBordered = (bordered: boolean | undefined, variant: CardProps['variant']) => {
  if (variant === 'borderless') return false
  if (variant === 'outlined') return true
  return bordered !== false
}

export const Card: FC<CardProps> = ({
  title,
  extra,
  bordered = true,
  size = 'default',
  hoverable = false,
  loading = false,
  headStyle,
  bodyStyle,
  styles,
  headClassName,
  bodyClassName,
  children,
  className,
  rootClassName,
  style,
  variant,
  ...rest
}) => {
  const config = useYakitConfig()
  const cardToken = config.token.YakitCard
  const hasHeader = hasContent(title) || hasContent(extra)
  const showBorder = resolveBordered(bordered, variant)

  const mergedHeadStyle: CSSProperties | undefined =
    headStyle || styles?.header ? { ...headStyle, ...styles?.header } : undefined
  const mergedBodyStyle: CSSProperties | undefined =
    bodyStyle || styles?.body ? { ...bodyStyle, ...styles?.body } : undefined

  const classes = classNames(
    prefixCls,
    {
      [`${prefixCls}-bordered-hidden`]: !showBorder,
      [`${prefixCls}-size-${size}`]: size && size !== 'default',
      [`${prefixCls}-hoverable`]: hoverable,
      [`${prefixCls}-loading`]: loading,
    },
    className,
    rootClassName,
  )

  return (
    <div
      {...rest}
      className={classes}
      data-theme={config.mode}
      dir={config.direction}
      style={
        {
          ...getYakitTokenVariables(config.token),
          '--yakit-card-border-radius': cardToken?.borderRadius,
          '--yakit-card-header-height': cardToken?.headerHeight,
          '--yakit-card-header-padding': cardToken?.headerPadding,
          '--yakit-card-body-padding': cardToken?.bodyPadding,
          '--yakit-card-title-font-size': cardToken?.titleFontSize,
          '--yakit-card-title-line-height': cardToken?.titleLineHeight,
          '--yakit-card-icon-size': cardToken?.iconSize,
          '--yakit-card-icon-gap': cardToken?.iconGap,
          ...style,
        } as YakitCSSProperties
      }
    >
      {hasHeader && (
        <div className={classNames(`${prefixCls}-header`, headClassName)} style={mergedHeadStyle}>
          {hasContent(title) && <div className={`${prefixCls}-header-title`}>{title}</div>}
          {hasContent(extra) && <div className={`${prefixCls}-header-extra`}>{extra}</div>}
        </div>
      )}
      <div
        className={classNames(`${prefixCls}-body`, bodyClassName)}
        style={mergedBodyStyle}
        aria-busy={loading || undefined}
      >
        {loading && (
          <div className={`${prefixCls}-loading-mask`} role="status">
            <span className={`${prefixCls}-spin`} aria-hidden="true" />
            <span className={`${prefixCls}-sr-only`}>加载中</span>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

Card.displayName = 'Card'

/** 主项目同名导出，便于迁移 */
export const YakitCard = Card

export default Card
