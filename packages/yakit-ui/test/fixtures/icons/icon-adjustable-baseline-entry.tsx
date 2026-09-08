/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { createRoot } from 'react-dom/client';

import * as ColorfulIcons from '../../../src/icons/colorful';
import Loading from '../../../src/icons/loading';
import * as OldIcons from '../../../src/icons/oldicon';
import * as OutlineIcons from '../../../src/icons/outline';
import * as SolidIcons from '../../../src/icons/solid';

type IconFamily = 'colorful' | 'loading' | 'oldicon' | 'outline' | 'solid';

interface BaselineIcon {
  Component: React.ComponentType<{ size?: number }>;
  family: IconFamily;
  name: string;
}

const componentEntries = (family: IconFamily, module: Record<string, unknown>): BaselineIcon[] =>
  Object.entries(module)
    .filter(
      (entry): entry is [string, React.ComponentType<{ size?: number }>] =>
        typeof entry[1] === 'function' ||
        (typeof entry[1] === 'object' && entry[1] !== null && '$$typeof' in entry[1]),
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, Component]) => ({ Component, family, name }));

const icons = [
  ...componentEntries('outline', OutlineIcons),
  ...componentEntries('solid', SolidIcons),
  ...componentEntries('colorful', ColorfulIcons),
  { Component: Loading, family: 'loading' as const, name: 'Loading' },
  ...componentEntries('oldicon', OldIcons),
];

const CELL_SIZE = 32;
const COLUMN_COUNT = 40;

const App = () => (
  <main
    id="atlas"
    data-cell-size={CELL_SIZE}
    data-column-count={COLUMN_COUNT}
    style={{
      background: '#F8F9FA',
      display: 'grid',
      gridAutoRows: CELL_SIZE,
      gridTemplateColumns: `repeat(${COLUMN_COUNT}, ${CELL_SIZE}px)`,
      width: COLUMN_COUNT * CELL_SIZE,
    }}
  >
    {icons.map(({ Component, family, name }) => (
      <div
        data-family={family}
        data-icon-name={name}
        key={`${family}:${name}`}
        style={{
          alignItems: 'center',
          color: '#353639',
          display: 'flex',
          height: CELL_SIZE,
          justifyContent: 'center',
          overflow: 'hidden',
          width: CELL_SIZE,
        }}
      >
        <Component size={24} />
      </div>
    ))}
  </main>
);

document.documentElement.style.background = '#F8F9FA';
document.body.style.margin = '0';
createRoot(document.getElementById('root')!).render(<App />);

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('icon-adjustable-baseline-ready'));
    document.documentElement.dataset.baselineReady = 'true';
  });
});
