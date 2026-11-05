import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  CommandOutlined,
  DragSortSolid,
  LogoOutlined,
  NotebookOutlined,
  SpeechToText2Outlined,
  StarOffOutlined,
  outlineIconRegistry,
  solidIconRegistry,
} from '../../dist/index.js';

describe('Published icon dist consumer', () => {
  it('renders repeated fragment icons with unique owned IDs', () => {
    const markup = renderToString(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(LogoOutlined),
        React.createElement(LogoOutlined),
        React.createElement(StarOffOutlined),
      ),
    );
    const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const references = [...markup.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]);

    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(references.length).toBeGreaterThan(0);
    expect(references.every((reference) => ids.includes(reference))).toBe(true);
  });

  it('contains no consumer-time raw SVG imports', () => {
    const dist = readFileSync(resolve(process.cwd(), 'dist/index.js'), 'utf8');
    expect(dist).not.toMatch(/\.svg(?:\?react)?["']/);
  });

  it('preserves representative public exports while publishing exact Figma registry names', () => {
    const speech = outlineIconRegistry.find(
      ({ exportName }) => exportName === 'SpeechToText2Outlined',
    );
    const drag = solidIconRegistry.find(({ exportName }) => exportName === 'DragSortSolid');

    expect(speech).toMatchObject({
      Component: SpeechToText2Outlined,
      exportName: 'SpeechToText2Outlined',
      figmaName: 'Outline/Speech-to-text2',
      name: 'Outline/Speech-to-text2',
    });
    expect(drag).toMatchObject({
      Component: DragSortSolid,
      exportName: 'DragSortSolid',
      figmaName: 'Solid/Drag-sort',
      name: 'Solid/Drag-sort',
    });
    expect(CommandOutlined.displayName).toBe('CommandOutlined');
    expect(NotebookOutlined.displayName).toBe('NotebookOutlined');
    expect(SpeechToText2Outlined.displayName).toBe('SpeechToText2Outlined');
  });

  it('publishes the complete icon registry metadata declaration', () => {
    const compatibility = readFileSync(resolve(process.cwd(), 'dist/icons/registry.d.ts'), 'utf8');
    expect(compatibility).toContain("export * from '@yakit-libs/yakit-ui-icons/registry'");
    const declaration = readFileSync(
      resolve(process.cwd(), '../yakit-ui-icons/dist/registry.d.ts'),
      'utf8',
    );

    for (const field of [
      'Component:',
      'exportName:',
      'family:',
      'figmaName:',
      'name:',
      'sourceNodeId:',
      'sourceStatus:',
    ]) {
      expect(declaration, field).toContain(field);
    }
    expect(declaration).toContain("export type IconFamily = 'outline' | 'solid' | 'colorful';");
  });
});
