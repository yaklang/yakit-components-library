import React from 'react';
import { createRoot } from 'react-dom/client';

interface ConsumerEntry {
  names: string[];
  path: string;
  url: string;
}

declare global {
  interface Window {
    __adjustableEntries: ConsumerEntry[];
    __adjustableResult?: Array<{
      caseId: string;
      entry: string;
      name: string;
      widths: string[];
    }>;
  }
}

const entries = window.__adjustableEntries;
const modules = await Promise.all(entries.map(({ url }) => import(/* @vite-ignore */ url)));
const cases = [
  { id: 'zero', props: { strokeWidth: 0 } },
  { id: 'three', props: { strokeWidth: 3 } },
  { id: 'style', props: { strokeWidth: 1, style: { strokeWidth: 2 } } },
];

createRoot(document.getElementById('root')!).render(
  React.createElement(
    React.Fragment,
    null,
    ...entries.flatMap((entry, entryIndex) =>
      entry.names.flatMap((name) =>
        cases.map(({ id, props }) =>
          React.createElement(
            'div',
            {
              'data-case': id,
              'data-entry': entry.path,
              'data-name': name,
              key: entry.path + name + id,
            },
            React.createElement(modules[entryIndex][name], { svgProps: props }),
          ),
        ),
      ),
    ),
  ),
);

requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    window.__adjustableResult = [...document.querySelectorAll<HTMLElement>('[data-case]')].map(
      (container) => ({
        caseId: container.dataset.case ?? '',
        entry: container.dataset.entry ?? '',
        name: container.dataset.name ?? '',
        widths: [...container.querySelectorAll<SVGElement>('[stroke]')]
          .filter(
            (node) =>
              !node.closest('defs, mask, clipPath') && getComputedStyle(node).stroke !== 'none',
          )
          .map((node) => getComputedStyle(node).strokeWidth),
      }),
    );
  }),
);

export {};
