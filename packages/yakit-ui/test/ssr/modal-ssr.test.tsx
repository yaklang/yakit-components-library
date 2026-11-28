import React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import Modal from '../../src/components/Modal'

describe('Modal SSR', () => {
  it('renders the dialog without Ant Design modal markup', () => {
    expect(typeof document).toBe('undefined')

    const markup = renderToString(
      <Modal open subTitle="这里是辅助性内容" title="Title">
        内容区域
      </Modal>,
    )

    expect(markup).toContain('yakit-modal')
    expect(markup).toContain('Title')
    expect(markup).toContain('内容区域')
    expect(markup).not.toMatch(/ant-modal/)
  })
})
