/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { createRoot } from 'react-dom/client';

import '../../../../yakit-ui-icons/icon.css';
import {
  EarOutlined,
  DataComparisonOutlined,
  RocketLaunchOffOutlined,
  StarOffOutlined,
  SunOutlined,
} from '../../../src/icons';

const BackgroundCase = ({
  background,
  children,
  testId,
}: {
  background: string;
  children: React.ReactNode;
  testId: string;
}) => (
  <div data-testid={`${testId}-parent`} style={{ background: '#191e28', color: '#f3f4f6' }}>
    <div data-testid={testId} style={{ background }}>
      {children}
    </div>
  </div>
);

const Fixture = () => (
  <>
    <SunOutlined data-testid="sun-default" />
    <SunOutlined color="#123456" data-testid="sun-custom" />
    <SunOutlined color="#123456" data-testid="sun-style" style={{ color: '#654321' }} />
    <span style={{ color: '#0c2238' }}>
      <SunOutlined color="inherit" data-testid="sun-inherit" />
    </span>

    <EarOutlined data-testid="ear-default" />
    <EarOutlined color="#123456" data-testid="ear-custom" />
    <EarOutlined color="#123456" data-testid="ear-style" style={{ color: '#654321' }} />
    <span style={{ color: '#0c2238' }}>
      <EarOutlined color="inherit" data-testid="ear-inherit" />
    </span>

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
    <RocketLaunchOffOutlined
      color="#123456"
      data-testid="rocket-style"
      style={{ color: '#654321' }}
    />

    <DataComparisonOutlined data-testid="data-compare-default" />
    <DataComparisonOutlined color="#123456" data-testid="data-compare-custom" />
    <span style={{ color: '#0a0a0a' }}>
      <DataComparisonOutlined color="inherit" data-testid="data-compare-inherit" />
    </span>
  </>
);

createRoot(document.querySelector('#root')!).render(<Fixture />);
