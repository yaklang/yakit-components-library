/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import { createRoot } from 'react-dom/client'

import '../../../icon.css'
import { DataComparisonOutlined, RocketLaunchOffOutlined, StarOffOutlined } from '../../../src'

const BackgroundCase = ({
  background,
  children,
  testId,
}: {
  background: string
  children: React.ReactNode
  testId: string
}) => (
  <div data-testid={`${testId}-parent`} style={{ background: '#191e28', color: '#f3f4f6' }}>
    <div data-testid={testId} style={{ background }}>
      {children}
    </div>
  </div>
)

const Fixture = () => (
  <>
    <BackgroundCase background="#111827" testId="star-dark">
      <StarOffOutlined color="inherit" />
    </BackgroundCase>
    <BackgroundCase background="transparent" testId="star-transparent">
      <StarOffOutlined color="inherit" />
    </BackgroundCase>
    <BackgroundCase background="#111827" testId="rocket-dark">
      <RocketLaunchOffOutlined color="inherit" />
    </BackgroundCase>
    <BackgroundCase background="transparent" testId="rocket-transparent">
      <RocketLaunchOffOutlined color="inherit" />
    </BackgroundCase>

    <DataComparisonOutlined data-testid="data-compare-default" />
    <DataComparisonOutlined color="#123456" data-testid="data-compare-custom" />
    <span style={{ color: '#0a0a0a' }}>
      <DataComparisonOutlined color="inherit" data-testid="data-compare-inherit" />
    </span>
  </>
)

createRoot(document.querySelector('#root')!).render(<Fixture />)
