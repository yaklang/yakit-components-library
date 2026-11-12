import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderImportedSvg } from '../../scripts/update-icons.mjs';

const rawSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><path d="M1 1H20V20Z" fill="white" stroke="#FFFFFF" stroke-width="2"/></svg>';

test('Colorful named white and hex white both use the explicit background binding', () => {
  const background = 'var(--Colors-Use-Basic-Background, #FFFFFF)';
  const svg = renderImportedSvg(
    {
      nodeId: '999999:22',
      rawSvg,
      production: { paintReplacements: { '#FFFFFF': background } },
    },
    'colorful',
  );
  assert.ok(svg.includes(`fill="${background}"`));
  assert.ok(svg.includes(`stroke="${background}"`));
  assert.ok(svg.includes('stroke-width="2"'));
});

test('Colorful white remains fixed when no explicit background binding exists', () => {
  const svg = renderImportedSvg({ nodeId: '999999:22', rawSvg }, 'colorful');
  assert.ok(svg.includes('fill="#FFFFFF"'));
  assert.ok(svg.includes('stroke="#FFFFFF"'));
  assert.ok(!svg.includes('var('));
});

test('Colorful gradient white stays literal and retains stop opacity', () => {
  const svg = renderImportedSvg(
    {
      nodeId: '999999:23',
      rawSvg:
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M0 0H32V32Z" fill="url(#gradient)"/><defs><linearGradient id="gradient"><stop stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="#066AF3"/></linearGradient></defs></svg>',
    },
    'colorful',
  );
  assert.ok(svg.includes('stop-color="#FFFFFF" stop-opacity="0"'));
  assert.ok(svg.includes('stop-color="#066AF3"'));
  assert.ok(!svg.includes('var('));
});

test('Colorful gradient bindings preserve offsets, opacity and literal clip paint', () => {
  const color = 'var(--yakit-colors-Lake-blue-80, #1B8E9D)';
  const svg = renderImportedSvg(
    {
      nodeId: '999999:24',
      rawSvg:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0H24V24Z" fill="url(#gradient)" clip-path="url(#clip)"/><defs><linearGradient id="gradient"><stop offset="0.25" stop-color="#1B8E9D" stop-opacity="0.5"/><stop offset="1" stop-color="#FFCE1E"/></linearGradient><clipPath id="clip"><rect width="24" height="24" fill="white"/></clipPath></defs></svg>',
      production: { paintReplacements: { '#1B8E9D': color } },
    },
    'colorful',
  );
  assert.ok(svg.includes(`offset="0.25" stop-color="${color}" stop-opacity="0.5"`));
  assert.ok(svg.includes('offset="1" stop-color="#FFCE1E"'));
  assert.ok(svg.includes('<rect width="24" height="24" fill="#FFFFFF"/>'));
});
