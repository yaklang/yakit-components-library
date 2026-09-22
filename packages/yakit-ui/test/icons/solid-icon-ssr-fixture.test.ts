import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  FloatingSolid,
  ParkBelowSolid,
  ParkRightSolid,
  ParkLeftSolid,
  PaintbrushSolid,
  PaperAirplaneSolid,
  PillSolid,
} from '../../src/icons';

const fragmentIcons = [
  PaperAirplaneSolid,
  PaintbrushSolid,
  PillSolid,
  FloatingSolid,
  ParkLeftSolid,
  ParkRightSolid,
  ParkBelowSolid,
];
const repeatedFragments = React.createElement(
  React.Fragment,
  null,
  ...fragmentIcons.flatMap((Component, index) => [
    React.createElement(Component, { key: `${index}-first` }),
    React.createElement(Component, { key: `${index}-second` }),
  ]),
);

const renderFixture = (identifierPrefix?: string) => {
  const markup = renderToString(
    repeatedFragments,
    identifierPrefix ? { identifierPrefix } : undefined,
  );
  const serverIds = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const references = [...markup.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]);
  return { identifierPrefix, markup, references, serverIds };
};

const fixtures = {
  custom: renderFixture('solid-audit-'),
  default: renderFixture(),
};
describe('Solid icon server rendering', () => {
  it.each([
    ['default identifiers', fixtures.default],
    ['matching custom identifierPrefix', fixtures.custom],
  ])('renders %s with unique owner-local fragment IDs', (_label, fixture) => {
    expect(fixture.serverIds).toHaveLength(16);
    expect(new Set(fixture.serverIds).size).toBe(fixture.serverIds.length);
    expect(fixture.references).toHaveLength(16);
    expect(fixture.references.every((reference) => fixture.serverIds.includes(reference))).toBe(
      true,
    );
    expect(fixture.markup).not.toMatch(/id="icon_[^"]+__(?:clip|mask)_\d+"/);
  });
});
