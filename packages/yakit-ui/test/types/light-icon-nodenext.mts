import React from 'react';
import { renderToString } from 'react-dom/server';

import { HomeOutlined, type IconProps } from '@yakit-libs/yakit-ui/icons';
import { AcademicCapOutlined } from '@yakit-libs/yakit-ui/icons/outline';
import * as ColorfulIcons from '@yakit-libs/yakit-ui/icons/colorful';
import { HomeSolid } from '@yakit-libs/yakit-ui/icons/solid';
import { iconRegistry } from '@yakit-libs/yakit-ui/icons/registry';

const props: IconProps = { 'aria-label': 'home', size: 16 };
const ColorfulIcon = Object.values(ColorfulIcons)[0]!;

export const markup = renderToString(
  React.createElement(
    React.Fragment,
    null,
    React.createElement(HomeOutlined, props),
    React.createElement(AcademicCapOutlined),
    React.createElement(HomeSolid),
    React.createElement(ColorfulIcon),
  ),
);

export const registeredIconCount = iconRegistry.length;
