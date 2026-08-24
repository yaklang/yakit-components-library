import React from 'react';
import { renderToString } from 'react-dom/server';

import { HomeOutlined, type IconProps } from 'yakit-ui/icons';
import { AcademicCapOutlined } from 'yakit-ui/icons/outline';
import { HomeFilled } from 'yakit-ui/icons/solid';
import { iconRegistry } from 'yakit-ui/icons/registry';

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
