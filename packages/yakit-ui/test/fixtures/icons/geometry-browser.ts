import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

const requirePlaywright = createRequire(
  createRequire(import.meta.url).resolve('playwright/package.json'),
);
const browsersPath = resolve(
  dirname(requirePlaywright.resolve('playwright-core/package.json')),
  'browsers.json',
);
const pinnedChromium = JSON.parse(readFileSync(browsersPath, 'utf8')).browsers.find(
  (browser: { name: string }) => browser.name === 'chromium-headless-shell',
);
export const bundledGeometryRenderer = {
  playwrightVersion: JSON.parse(
    readFileSync(createRequire(import.meta.url).resolve('playwright/package.json'), 'utf8'),
  ).version as string,
  browserName: pinnedChromium?.name as string,
  revision: pinnedChromium?.revision as string,
  browserVersion: pinnedChromium?.browserVersion as string,
};

// Geometry compares both SVGs in the same renderer. Frozen pixel review tests
// keep their separate exact-Chrome provenance contract.
export async function launchGeometryBrowser(review: { browserVersion: string }) {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const expectedVersion = executablePath ? review.browserVersion : pinnedChromium?.browserVersion;
  if (!expectedVersion) throw new Error('Pinned geometry renderer version is missing');
  const browser = await chromium.launch({ executablePath, headless: true });
  if (browser.version() !== expectedVersion) {
    const actualVersion = browser.version();
    await browser.close();
    throw new Error(
      `Geometry renderer version mismatch: expected ${expectedVersion}, got ${actualVersion}`,
    );
  }
  return browser;
}
