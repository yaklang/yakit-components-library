import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseSvg } from '../../scripts/audit-icons.mjs';

import { type JsonRecord, validateVisualWeightReviews } from './helpers/icon-visual-weight-reviews';
import { readReviewCandidate } from './helpers/review-candidate-source';

const packageRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(packageRoot, 'test/fixtures/icons/reference/visual-weight-v2');
const expectedIcons = [
  ['AddPayloadOutlined', '17117-250680.svg'],
  ['ClipboardCheckOutlined', '1-2273.svg'],
  ['CurrencyDollarOutlined', '1-2107.svg'],
  ['FigmaIcon450351908Outlined', '45035-1908.svg'],
  ['PresentationChartLineOutlined', '1-2519.svg'],
  ['QrcodeOutlined', '1-2249.svg'],
  ['RocketLaunchOffOutlined', '14203-193724.svg'],
  ['RocketOffOutlined', '14203-193637.svg'],
  ['SpeechToText2Outlined', '39338-10493.svg'],
  ['SpeechToTextOutlined', '39330-10456.svg'],
  ['StatusOfflineOutlined', '1-2523.svg'],
  ['SupportOutlined', '1-2407.svg'],
  ['TagOutlined', '1-2231.svg'],
] as const;
const expectedFiles = expectedIcons.map(([, file]) => file).sort();
const expectedNames = new Map(expectedIcons.map(([name, file]) => [file, name]));
const expectedSemanticFillFiles = ['1-2231.svg', '14203-193637.svg'];
const digest = (contents: string | Buffer) => createHash('sha256').update(contents).digest('hex');
const artifact = Buffer.from('artifact');
const oldSource = Buffer.from('old source');
const candidate = Buffer.from('<svg><path d="M4 12H20" stroke="black" stroke-width="1"/></svg>');
const visualMatrix = Buffer.from('visual matrix');

const validIndependentReview = (file = 'fixture.svg'): JsonRecord => ({
  candidateSourceSha256: digest(candidate),
  file,
  geometryVerdict: 'pass',
  metricsSha256: digest(artifact),
  reviewer: 'weight_regression-test-engineer',
  schemaVersion: 'icon-visual-weight-independent-review-v1',
  status: 'visual-reviewed',
  visualMatrixSha256: digest(visualMatrix),
  visualVerdict: 'pass',
});

const validReview = (file = 'fixture.svg'): JsonRecord => {
  const id = file.replace(/\.svg$/, '');
  const independentReview = Buffer.from(JSON.stringify(validIndependentReview(file)));
  return {
    candidateSourceSha256: digest(candidate),
    exportName: 'FixtureOutlined',
    file,
    geometryEvidence: { path: `geometry/${id}.json`, sha256: digest(artifact) },
    independentReview: {
      path: `review-evidence/${id}-independent-review.json`,
      sha256: digest(independentReview),
    },
    nodeRoles: [{ locator: [0], oldWidth: 2, role: 'primary-line' }],
    oldEvidence: { path: `original/${file}`, sha256: digest(oldSource) },
    oldSourceSha256: digest(oldSource),
    renderer: { rasterSize: 96 },
    reviewer: 'weight_regression-test-engineer',
    reviewVerdict: 'pass',
    sampleSegments: [{ axis: 'x', at: 1, expected: 1, from: 0, to: 2 }],
    serializedSvg: '<svg><path stroke="currentColor" stroke-width="1"/></svg>',
    status: 'promoted',
    targetPng: { path: `targets/${id}.png`, sha256: digest(artifact) },
    targetWidth: 1,
    thresholds: { thicknessTolerance: 0.1 },
    topologyAtDefault: { components: 1, holes: 0 },
    topologyAtOldWidth: { components: 1, holes: 0 },
    visualMatrix: {
      path: `review-evidence/${id}-matrix.png`,
      sha256: digest(visualMatrix),
    },
    rgbaSha256: '1'.repeat(64),
  };
};
const validManifest = () => ({
  approvedFiles: ['fixture.svg'],
  reviews: [validReview()],
  schemaVersion: 'icon-visual-weight-reviews-v2',
});
const validateFixture = (manifest: unknown, candidateSource = candidate) =>
  validateVisualWeightReviews(manifest, {
    expectedFiles: ['fixture.svg'],
    readArtifact: (path) => {
      if (path.startsWith('original/')) return oldSource;
      if (path.endsWith('-matrix.png')) return visualMatrix;
      if (path.endsWith('-independent-review.json')) {
        return Buffer.from(JSON.stringify(validIndependentReview()));
      }
      return artifact;
    },
    readCandidate: () => candidateSource,
  });
const validateFixtureWithIndependentReview = (
  manifest: ReturnType<typeof validManifest>,
  independentReview: JsonRecord,
) => {
  const contents = Buffer.from(JSON.stringify(independentReview));
  (manifest.reviews[0].independentReview as JsonRecord).sha256 = digest(contents);
  return validateVisualWeightReviews(manifest, {
    expectedFiles: ['fixture.svg'],
    readArtifact: (path) => {
      if (path.startsWith('original/')) return oldSource;
      if (path.endsWith('-matrix.png')) return visualMatrix;
      if (path.endsWith('-independent-review.json')) return contents;
      return artifact;
    },
    readCandidate: () => candidate,
  });
};

describe('visual weight review admission', () => {
  it('accepts a complete independently reviewed fixture', () => {
    expect(validateFixture(validManifest())).toHaveLength(1);
  });

  it('accepts the default-width migration against the immutable width-one review', () => {
    const migratedCandidate = Buffer.from(
      candidate.toString('utf8').replace('stroke-width="1"', 'stroke-width="1.5"'),
    );
    expect(validateFixture(validManifest(), migratedCandidate)).toHaveLength(1);
  });

  it.each([
    ['geometry', 'd="M4 12H20"', 'd="M4 12H21"'],
    ['unapproved width', 'stroke-width="1"', 'stroke-width="2"'],
  ])('rejects %s drift after the default-width migration', (_label, before, after) => {
    const changedCandidate = Buffer.from(
      candidate
        .toString('utf8')
        .replace(before, after)
        .replace('stroke-width="1"', 'stroke-width="1.5"'),
    );
    expect(() => validateFixture(validManifest(), changedCandidate)).toThrow(
      /ICON_VISUAL_WEIGHT_CANDIDATE_SOURCE_DRIFT/,
    );
  });

  it('rejects a review with missing evidence', () => {
    const manifest = validManifest();
    delete manifest.reviews[0].oldEvidence;
    expect(() => validateFixture(manifest)).toThrow(/ICON_VISUAL_WEIGHT_MISSING:oldEvidence/);
  });

  it('rejects an extra approved file', () => {
    const manifest = validManifest();
    manifest.approvedFiles.push('extra.svg');
    expect(() => validateFixture(manifest)).toThrow(/ICON_VISUAL_WEIGHT_APPROVED_SET_DRIFT/);
  });

  it('rejects candidate source SHA drift', () => {
    const manifest = validManifest();
    manifest.reviews[0].candidateSourceSha256 = '0'.repeat(64);
    expect(() => validateFixture(manifest)).toThrow(/ICON_VISUAL_WEIGHT_CANDIDATE_SOURCE_DRIFT/);
  });

  it('rejects old source SHA drift', () => {
    const manifest = validManifest();
    manifest.reviews[0].oldSourceSha256 = '0'.repeat(64);
    expect(() => validateFixture(manifest)).toThrow(/ICON_VISUAL_WEIGHT_OLD_SOURCE_DRIFT/);
  });

  it('rejects target image SHA drift', () => {
    const manifest = validManifest();
    (manifest.reviews[0].targetPng as JsonRecord).sha256 = '0'.repeat(64);
    expect(() => validateFixture(manifest)).toThrow(/ICON_VISUAL_WEIGHT_ARTIFACT_DRIFT/);
  });

  it('rejects a missing independent review artifact', () => {
    const manifest = validManifest();
    delete manifest.reviews[0].independentReview;
    expect(() => validateFixture(manifest)).toThrow(/ICON_VISUAL_WEIGHT_MISSING:independentReview/);
  });

  it('rejects independent review artifact SHA drift', () => {
    const manifest = validManifest();
    (manifest.reviews[0].independentReview as JsonRecord).sha256 = '0'.repeat(64);
    expect(() => validateFixture(manifest)).toThrow(/ICON_VISUAL_WEIGHT_ARTIFACT_DRIFT/);
  });

  it('rejects independent review artifact path drift', () => {
    const manifest = validManifest();
    (manifest.reviews[0].independentReview as JsonRecord).path =
      'review-evidence/substitute-independent-review.json';
    expect(() => validateFixture(manifest)).toThrow(/ICON_VISUAL_WEIGHT_ARTIFACT_PATH_DRIFT/);
  });

  it('rejects a missing visual matrix artifact', () => {
    const manifest = validManifest();
    delete manifest.reviews[0].visualMatrix;
    expect(() => validateFixture(manifest)).toThrow(/ICON_VISUAL_WEIGHT_MISSING:visualMatrix/);
  });

  it('rejects visual matrix artifact SHA drift', () => {
    const manifest = validManifest();
    (manifest.reviews[0].visualMatrix as JsonRecord).sha256 = '0'.repeat(64);
    expect(() => validateFixture(manifest)).toThrow(/ICON_VISUAL_WEIGHT_ARTIFACT_DRIFT/);
  });

  it('rejects visual matrix artifact path drift', () => {
    const manifest = validManifest();
    (manifest.reviews[0].visualMatrix as JsonRecord).path = 'review-evidence/substitute-matrix.png';
    expect(() => validateFixture(manifest)).toThrow(/ICON_VISUAL_WEIGHT_ARTIFACT_PATH_DRIFT/);
  });

  it('accepts an independent review document with a reviews array', () => {
    const manifest = validManifest();
    const independentReview = validIndependentReview();
    expect(() =>
      validateFixtureWithIndependentReview(manifest, {
        reviewer: independentReview.reviewer,
        reviews: [
          {
            candidateSourceSha256: independentReview.candidateSourceSha256,
            file: independentReview.file,
            geometryVerdict: independentReview.geometryVerdict,
            metricsSha256: independentReview.metricsSha256,
            visualMatrixSha256: independentReview.visualMatrixSha256,
            visualVerdict: independentReview.visualVerdict,
          },
        ],
        schemaVersion: independentReview.schemaVersion,
        status: independentReview.status,
      }),
    ).not.toThrow();
  });

  it('rejects an independent review for a different file', () => {
    const manifest = validManifest();
    const independentReview = validIndependentReview('other.svg');
    expect(() => validateFixtureWithIndependentReview(manifest, independentReview)).toThrow(
      /ICON_VISUAL_WEIGHT_INDEPENDENT_REVIEW_FILE_MISMATCH/,
    );
  });

  it('rejects an independent review for a different candidate', () => {
    const manifest = validManifest();
    const independentReview = validIndependentReview();
    independentReview.candidateSourceSha256 = '0'.repeat(64);
    expect(() => validateFixtureWithIndependentReview(manifest, independentReview)).toThrow(
      /ICON_VISUAL_WEIGHT_INDEPENDENT_REVIEW_MISMATCH:candidateSourceSha256/,
    );
  });

  it.each(['geometryVerdict', 'visualVerdict'])('rejects a non-pass independent %s', (field) => {
    const manifest = validManifest();
    const independentReview = validIndependentReview();
    independentReview[field] = 'fail';
    expect(() => validateFixtureWithIndependentReview(manifest, independentReview)).toThrow(
      /ICON_VISUAL_WEIGHT_INDEPENDENT_REVIEW_UNAPPROVED/,
    );
  });

  it.each(['specification-frozen', 'geometry-verified'])(
    'rejects independent review status %s',
    (status) => {
      const manifest = validManifest();
      const independentReview = validIndependentReview();
      independentReview.status = status;
      expect(() => validateFixtureWithIndependentReview(manifest, independentReview)).toThrow(
        /ICON_VISUAL_WEIGHT_INDEPENDENT_REVIEW_STATUS/,
      );
    },
  );

  it('rejects an unauthorized reviewer even when the manifest matches it', () => {
    const manifest = validManifest();
    manifest.reviews[0].reviewer = 'self-appointed-reviewer';
    const independentReview = validIndependentReview();
    independentReview.reviewer = 'self-appointed-reviewer';
    expect(() => validateFixtureWithIndependentReview(manifest, independentReview)).toThrow(
      /ICON_VISUAL_WEIGHT_UNAUTHORIZED_REVIEWER/,
    );
  });

  it('rejects a manifest reviewer that differs from the independent review', () => {
    const manifest = validManifest();
    manifest.reviews[0].reviewer = 'different-reviewer';
    expect(() => validateFixtureWithIndependentReview(manifest, validIndependentReview())).toThrow(
      /ICON_VISUAL_WEIGHT_INDEPENDENT_REVIEWER_MISMATCH/,
    );
  });

  it('rejects a review that has not been promoted', () => {
    const manifest = validManifest();
    manifest.reviews[0].status = 'visual-reviewed';
    expect(() => validateFixture(manifest)).toThrow(/ICON_VISUAL_WEIGHT_NOT_PROMOTED/);
  });
});

describe('retained visual weight review candidates', () => {
  const loadReviews = () =>
    validateVisualWeightReviews(
      JSON.parse(readFileSync(resolve(fixtureRoot, 'reviews.json'), 'utf8')),
      {
        expectedFiles,
        readArtifact: (path) => readFileSync(resolve(fixtureRoot, path)),
        readCandidate: (file) => readReviewCandidate(file),
      },
    );

  it('contains exactly the thirteen reviewed icon identities', () => {
    const reviews = loadReviews();
    expect(
      reviews
        .map(({ exportName, file }) => [exportName, file])
        .sort((left, right) => String(left[1]).localeCompare(String(right[1]))),
    ).toEqual(expectedFiles.map((file) => [expectedNames.get(file), file]));
  });

  it('declares exactly the two retained semantic fill icons', () => {
    const reviews = loadReviews();
    expect(
      reviews
        .filter(({ nodeRoles }) =>
          (nodeRoles as JsonRecord[]).some(({ role }) => role === 'semantic-fill'),
        )
        .map(({ file }) => file)
        .sort(),
    ).toEqual(expectedSemanticFillFiles);
  });

  it.each(expectedFiles)('%s keeps every primary line at the default width', (file) => {
    const reviews = loadReviews();
    const review = reviews.find((entry) => entry.file === file)!;
    const root = parseSvg(readReviewCandidate(file).toString('utf8'));
    const primaryRoles = (review.nodeRoles as JsonRecord[]).filter(
      ({ role }) => role === 'primary-line',
    );
    expect(primaryRoles.length).toBeGreaterThan(0);
    for (const { locator } of primaryRoles) {
      let node = root;
      for (const index of locator as number[]) node = node.children[index];
      const inherited = (attribute: string) => {
        for (
          let current: ReturnType<typeof parseSvg> | null = node;
          current;
          current = current.parent
        ) {
          const value = current.attributes.get(attribute);
          if (value !== undefined) return value;
        }
      };
      expect(inherited('stroke-width')).toBe('1.5');
      expect(inherited('stroke')).toBeTruthy();
    }
  });

  it.each(expectedFiles)('%s preserves each declared coupled cutout', (file) => {
    const reviews = loadReviews();
    const review = reviews.find((entry) => entry.file === file)!;
    const root = parseSvg(readReviewCandidate(file).toString('utf8'));
    const cutoutRoles = (review.nodeRoles as JsonRecord[]).filter(
      ({ role }) => role === 'coupled-cutout',
    );
    for (const { locator } of cutoutRoles) {
      let node = root;
      for (const index of locator as number[]) node = node.children[index];
      let stroke: string | undefined;
      let strokeWidth: string | undefined;
      let insideDefinition = false;
      for (
        let current: ReturnType<typeof parseSvg> | null = node;
        current;
        current = current.parent
      ) {
        stroke ??= current.attributes.get('stroke');
        strokeWidth ??= current.attributes.get('stroke-width');
        insideDefinition ||= ['clipPath', 'mask'].includes(current.name);
      }
      if (stroke) expect(strokeWidth).toBe('1.5');
      else {
        expect(insideDefinition).toBe(true);
        expect(node.attributes.get('d')).toBeTruthy();
      }
    }
  });

  it.each(expectedFiles)('%s preserves each declared semantic fill', (file) => {
    const reviews = loadReviews();
    const review = reviews.find((entry) => entry.file === file)!;
    const root = parseSvg(readReviewCandidate(file).toString('utf8'));
    const fillRoles = (review.nodeRoles as JsonRecord[]).filter(
      ({ role }) => role === 'semantic-fill',
    );
    for (const { locator } of fillRoles) {
      let node = root;
      for (const index of locator as number[]) node = node.children[index];
      expect(node.attributes.get('fill')).toBeTruthy();
      expect(node.attributes.get('fill')).not.toBe('none');
    }
  });
});
