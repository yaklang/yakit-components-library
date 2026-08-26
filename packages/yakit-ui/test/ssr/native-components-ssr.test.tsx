import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';

import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NativeComponentsFixture } from '../fixtures/native-components';

const markup = renderToString(<NativeComponentsFixture />);
const outputDirectory = resolve(cwd(), 'test-results/components');
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  resolve(outputDirectory, 'native-components-ssr.json'),
  `${JSON.stringify({ markup })}\n`,
);

describe('native component SSR', () => {
  it('renders every public component family without browser globals or AntD markup', () => {
    expect(markup).toContain('yakit-input');
    expect(markup).toContain('yakit-input-number');
    expect(markup).toContain('yakit-btn');
    expect(markup).not.toContain('<button type="button"><span><button');
    expect(markup).not.toMatch(/ant-(?:input|btn|otp)/);
  });
});
