import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const storiesRoot = resolve(packageRoot, '.storybook/stories');

describe('Icon Storybook contract', () => {
  it('keeps one combined Icon group without audit-only groups', () => {
    const iconStory = readFileSync(resolve(storiesRoot, 'Icon.stories.tsx'), 'utf8');

    expect(iconStory).toContain("title: 'YakitUi/通用/Icon'");
    expect(existsSync(resolve(storiesRoot, 'IconAudit.stories.tsx'))).toBe(false);
    expect(existsSync(resolve(storiesRoot, 'SolidIconAudit.stories.tsx'))).toBe(false);
  });
});
