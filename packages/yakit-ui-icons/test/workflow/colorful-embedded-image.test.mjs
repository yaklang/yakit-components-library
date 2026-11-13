import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderImportedSvg } from '../../scripts/update-icons.mjs';

const raster =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6l8AAAAASUVORK5CYII=';
const render = (body, family = 'colorful') =>
  renderImportedSvg(
    {
      nodeId: '999999:24',
      rawSvg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="28" height="28" viewBox="0 0 28 28">${body}</svg>`,
    },
    family,
  );

test('Colorful preserves embedded raster bytes and normalizes pattern references', () => {
  const svg = render(
    `<path d="M0 0H28V28Z" fill="url(#pattern)"/><defs><pattern id="pattern" width="1" height="1"><use xlink:href="#photo"/></pattern><image id="photo" width="1" height="1" xlink:href="${raster}"/></defs>`,
  );
  assert.ok(svg.includes(`xlink:href="${raster}"`));
  assert.ok(svg.includes('fill="url(#icon_99999924__pattern_0)"'));
  assert.ok(svg.includes('xlink:href="#icon_99999924__semantic_0"'));
});

test('embedded raster support keeps remote, SVG and non-image references rejected', () => {
  for (const value of [
    'https://example.com/avatar.jpg',
    'data:image/svg+xml;base64,PHN2Zy8+',
    'data:image/png;base64,%%%',
  ]) {
    assert.throws(() => render(`<image href="${value}"/>`), /ICON_EXTERNAL_CONTENT_UNSUPPORTED/);
  }
  assert.throws(() => render(`<use href="${raster}"/>`), /ICON_EXTERNAL_CONTENT_UNSUPPORTED/);
  assert.throws(
    () => render(`<image href="${raster}"/>`, 'solid'),
    /ICON_EXTERNAL_CONTENT_UNSUPPORTED/,
  );
});

test('black and white mask paints retain their values and opacity', () => {
  const svg = render(
    '<mask id="mask" fill="black" style="mask-type:luminance"><rect width="28" height="28" fill="white" opacity="0.5"/></mask><path d="M0 0H28V28Z" fill="#F28C45" mask="url(#mask)"/>',
  );
  assert.ok(svg.includes('fill="#000000" style="mask-type:luminance"'));
  assert.ok(svg.includes('fill="#FFFFFF" opacity="0.5"'));
  assert.ok(!svg.includes('var('));
});
