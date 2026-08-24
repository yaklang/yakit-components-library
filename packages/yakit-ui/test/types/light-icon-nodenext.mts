import React from 'react';
import { renderToString } from 'react-dom/server';

import { HomeOutlined, type IconProps } from '@yakit-libs/yakit-ui/icons';
import { AcademicCapOutlined } from '@yakit-libs/yakit-ui/icons/outline';
import { HomeFilled } from '@yakit-libs/yakit-ui/icons/solid';
import { iconRegistry } from '@yakit-libs/yakit-ui/icons/registry';

const props: IconProps = { 'aria-label': 'home', size: 16 };

export const markup = renderToString(
  React.createElement(
    React.Fragment,
    null,
    React.createElement(HomeOutlined, props),
    React.createElement(AcademicCapOutlined),
    React.createElement(HomeFilled),
  ),
);

export const registeredIconCount = iconRegistry.length;
