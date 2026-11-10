import { readFileSync } from 'node:fs';

import outline from '../../../config/icon-sources/outline.json';

// Native Figma synchronization supersedes reconstructed production artwork.
// Keep checking the original candidate against its already frozen review hashes.
export function readReviewCandidate(file: string): Buffer {
  const native = outline.records.some(
    (record) =>
      record.file === file &&
      'production' in record &&
      record.production !== undefined &&
      'geometry' in record.production &&
      record.production.geometry === 'source',
  );
  return readFileSync(
    new URL(
      native
        ? `../../fixtures/icons/reference/visual-weight-v2/source-before-native-sync/${file}`
        : `../../../src/outline/${file}`,
      import.meta.url,
    ),
  );
}
