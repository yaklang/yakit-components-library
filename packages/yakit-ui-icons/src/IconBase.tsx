import { forwardRef, type ComponentType, type CSSProperties, type SVGProps } from 'react'

import type { IconProps, IconSvgProps } from './types.js'

type SvgIcon = ComponentType<SVGProps<SVGSVGElement>>

type IconRootStyle = CSSProperties & {
  '--yakit-icon-default-color'?: string
}

interface IconBaseProps extends IconProps {
  defaultColor: string
  Svg: SvgIcon
}

const warnedSvgProps = new Set<string>()
const forbiddenSvgProps = new Set(['children', 'dangerouslysetinnerhtml', 'focusable', 'ref', 'role', 'tabindex'])

function isForbiddenSvgProp(key: string) {
  const normalizedKey = key.toLowerCase()
  return forbiddenSvgProps.has(normalizedKey) || normalizedKey.startsWith('aria-') || normalizedKey.startsWith('on')
}

function sanitizeSvgProps(svgProps: IconSvgProps | undefined): IconSvgProps {
  if (!svgProps) return {}

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(svgProps)) {
    const warningKey = key.toLowerCase()
    if (!isForbiddenSvgProp(key)) {
      sanitized[key] = value
      continue
    }
    if (import.meta.env.DEV && !warnedSvgProps.has(warningKey)) {
      warnedSvgProps.add(warningKey)
      console.warn(`Yakit icon ignored forbidden svgProps.${key}`)
    }
  }
  return sanitized as IconSvgProps
}

const joinClassNames = (...classNames: Array<string | undefined>) => classNames.filter(Boolean).join(' ')

export const IconBase = forwardRef<HTMLSpanElement, IconBaseProps>(
  (
    { Svg, className, color, defaultColor, onClick, role = 'img', size, style, spin, svgProps, tabIndex, ...rootProps },
    ref,
  ) => {
    const sanitizedSvgProps = sanitizeSvgProps(svgProps)
    const hasSvgColor = sanitizedSvgProps.color || sanitizedSvgProps.style?.color
    const resolvedSvgProps =
      style?.color && !hasSvgColor
        ? { ...sanitizedSvgProps, style: { color: 'inherit', ...sanitizedSvgProps.style } }
        : sanitizedSvgProps
    const sizeProps = size === undefined ? undefined : { height: size, width: size }
    const svgClassName =
      joinClassNames(resolvedSvgProps.className, spin ? 'yakit-icon-spinning' : undefined) || undefined
    const inheritsColor = color?.trim().toLowerCase() === 'currentcolor'
    const rootStyle: IconRootStyle = {
      '--yakit-icon-default-color': inheritsColor ? 'currentColor' : defaultColor,
      ...(color && !inheritsColor ? { color } : undefined),
      ...style,
    }

    return (
      <span
        {...rootProps}
        ref={ref}
        role={role}
        tabIndex={tabIndex ?? (onClick ? -1 : undefined)}
        className={joinClassNames('anticon', 'yakit-icon', className)}
        style={rootStyle}
        onClick={onClick}
      >
        <Svg {...sizeProps} {...resolvedSvgProps} className={svgClassName} aria-hidden="true" focusable="false" />
      </span>
    )
  },
)

IconBase.displayName = 'IconBase'
;(IconBase as typeof IconBase & { isYakitIcon?: boolean }).isYakitIcon = true
