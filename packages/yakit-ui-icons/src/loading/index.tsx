import { forwardRef, type ComponentType, type SVGProps } from 'react'

import { DEFAULT_ICON_COLOR } from '../createIcon.js'
import { IconBase } from '../IconBase.js'
import LoadingOutlinedSvg from '../outline/5237-120699.svg?react'
import type { IconProps as BaseIconProps } from '../types.js'

export interface LoadingProps extends BaseIconProps {
  spin?: boolean
  spinSpeed?: number
}

/** @deprecated Use LoadingProps. */
export type IconProps = LoadingProps

const LOADING_KEYFRAME = 'yakitIconLoadingSpin_b1a35c158267'

type SvgIcon = ComponentType<SVGProps<SVGSVGElement>>
// SVG 模块由 vite-plugin-svgr 提供类型，这里收成 IconBase 需要的 Svg 类型。
const LoadingSvg = LoadingOutlinedSvg as SvgIcon

/** 图形与 `LoadingOutlined` 相同，复用 Figma Outline/loading 的 SVG。 */
const Loading = forwardRef<HTMLSpanElement, LoadingProps>(
  ({ size = 24, spin = false, spinSpeed = 1, svgProps, ...rootProps }, ref) => {
    const animation = spin ? `${LOADING_KEYFRAME} ${spinSpeed}s linear infinite` : undefined
    const innerClassName = ['yakit-icon-loading-svg', svgProps?.className].filter(Boolean).join(' ')

    return (
      <IconBase
        {...rootProps}
        ref={ref}
        Svg={LoadingSvg}
        defaultColor={DEFAULT_ICON_COLOR}
        size={size}
        svgProps={{
          ...svgProps,
          className: innerClassName,
          style: {
            animation,
            ...svgProps?.style,
          },
        }}
      />
    )
  },
)

Loading.displayName = 'Loading'
;(Loading as typeof Loading & { isYakitIcon?: boolean }).isYakitIcon = true

export default Loading
