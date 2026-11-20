import { createRef, type ReactElement } from 'react'

import {
  Spin,
  type SpinGetContainer,
  type SpinIndicator,
  type SpinProps,
  type SpinRef,
  type SpinSize,
} from '../../src/components'

export const small: SpinSize = 'small'
export const medium: SpinSize = 'medium'
export const large: SpinSize = 'large'

// @ts-expect-error default is not a public Spin size.
export const invalidDefaultSize: SpinSize = 'default'

// @ts-expect-error middle is not a public Spin size.
export const invalidMiddleSize: SpinSize = 'middle'

export const customIndicator: SpinIndicator = <span className="custom-indicator" />
export const nullIndicator: SpinIndicator = null

export const spinRef = createRef<SpinRef>()

export const selectorContainer: SpinGetContainer = '#panel'
export const factoryContainer: SpinGetContainer = () => document.body

export const spinProps: SpinProps = {
  spinning: true,
  tip: '加载中...',
  size: 'small',
  delay: 200,
  className: 'extra',
  rootClassName: 'root',
  indicator: customIndicator,
  getContainer: selectorContainer,
}

export const spin = (
  <Spin ref={spinRef} {...spinProps}>
    content
  </Spin>
)

export const emptyIndicator: ReactElement = <></>
export const hiddenDots: SpinProps = { indicator: emptyIndicator }
export const hiddenByNull: SpinProps = { indicator: null }

export const invalidDescription: SpinProps = {
  // @ts-expect-error tip is the public hint prop; description is not accepted.
  description: '上传中...',
}

export const invalidFullscreen: SpinProps = {
  // @ts-expect-error fullscreen is not part of the public Spin API.
  fullscreen: true,
}

export const invalidWrapperClassName: SpinProps = {
  // @ts-expect-error wrapperClassName is not part of the public Spin API; use className or rootClassName.
  wrapperClassName: 'panel',
}

export const invalidPercent: SpinProps = {
  // @ts-expect-error percent is not part of the public Spin API.
  percent: 'auto',
}

export const invalidLegacySize: SpinProps = {
  // @ts-expect-error default is not a public Spin size.
  size: 'default',
}

// @ts-expect-error setDefaultIndicator is not part of the public Spin API.
export const invalidSetDefaultIndicator = Spin.setDefaultIndicator
