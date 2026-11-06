import { createHash } from 'node:crypto';

import geometryReviews from '../../../scripts/outline-geometry-overrides.json';

export type JsonRecord = Record<string, unknown>;

type ReadArtifact = (path: string) => Buffer;

const sha256Pattern = /^[a-f0-9]{64}$/;
const authorizedReviewer = 'weight_regression-test-engineer';
const independentReviewPaths = new Map<string, string>([
  ['1-2249.svg', 'review-evidence/qrcode-independent-review.json'],
  ['45035-1908.svg', 'review-evidence/data-compare-independent-review.json'],
  ...['1-2107.svg', '1-2231.svg', '1-2273.svg', '1-2407.svg', '1-2519.svg', '17117-250680.svg'].map(
    (file) => [file, 'review-evidence/simple-independent-review.json'] as const,
  ),
  ...[
    '1-2523.svg',
    '14203-193637.svg',
    '14203-193724.svg',
    '39330-10456.svg',
    '39338-10493.svg',
  ].map((file) => [file, 'review-evidence/complex-independent-review.json'] as const),
]);
const digest = (contents: string | Buffer) => createHash('sha256').update(contents).digest('hex');
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const requireRecord = (value: unknown, code: string) => {
  if (!isRecord(value)) throw new Error(code);
  return value;
};
const requireString = (record: JsonRecord, field: string, code: string) => {
  const value = record[field];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${code}:${field}`);
  return value;
};
const requireSha = (record: JsonRecord, field: string, code: string) => {
  const value = requireString(record, field, code);
  if (!sha256Pattern.test(value)) throw new Error(`${code}:${field}`);
  return value;
};
const requireNonEmptyRecord = (record: JsonRecord, field: string, code: string) => {
  const value = requireRecord(record[field], `${code}:${field}`);
  if (Object.keys(value).length === 0) throw new Error(`${code}:${field}`);
  return value;
};
const requireNonEmptyArray = (record: JsonRecord, field: string, code: string) => {
  const value = record[field];
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${code}:${field}`);
  return value;
};
const requireNumericTopology = (record: JsonRecord, field: string) => {
  const topology = requireNonEmptyRecord(record, field, 'ICON_VISUAL_WEIGHT_MISSING');
  if (
    !Number.isInteger(topology.components) ||
    Number(topology.components) < 0 ||
    !Number.isInteger(topology.holes) ||
    Number(topology.holes) < 0
  ) {
    throw new Error(`ICON_VISUAL_WEIGHT_INVALID_TOPOLOGY:${field}`);
  }
};

const validateArtifact = (
  review: JsonRecord,
  field: string,
  expectedPath: string,
  readArtifact: ReadArtifact,
) => {
  const artifact = requireRecord(review[field], `ICON_VISUAL_WEIGHT_MISSING:${field}`);
  const path = requireString(artifact, 'path', 'ICON_VISUAL_WEIGHT_MISSING');
  const sha256 = requireSha(artifact, 'sha256', 'ICON_VISUAL_WEIGHT_MISSING');
  if (path !== expectedPath) throw new Error('ICON_VISUAL_WEIGHT_ARTIFACT_PATH_DRIFT');
  const contents = readArtifact(path);
  if (digest(contents) !== sha256) throw new Error('ICON_VISUAL_WEIGHT_ARTIFACT_DRIFT');
  return { ...artifact, path, sha256, contents };
};

const validateIndependentReview = (
  review: JsonRecord,
  file: string,
  contents: Buffer,
  geometryEvidence: JsonRecord,
  visualMatrix: JsonRecord,
) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents.toString('utf8'));
  } catch {
    throw new Error('ICON_VISUAL_WEIGHT_INVALID_INDEPENDENT_REVIEW');
  }
  const document = requireRecord(parsed, 'ICON_VISUAL_WEIGHT_INVALID_INDEPENDENT_REVIEW');
  if (document.schemaVersion !== 'icon-visual-weight-independent-review-v1') {
    throw new Error('ICON_VISUAL_WEIGHT_INDEPENDENT_REVIEW_SCHEMA_DRIFT');
  }
  const documentReviewer = requireString(
    document,
    'reviewer',
    'ICON_VISUAL_WEIGHT_INVALID_INDEPENDENT_REVIEW',
  );
  const manifestReviewer = requireString(review, 'reviewer', 'ICON_VISUAL_WEIGHT_MISSING');
  if (documentReviewer !== manifestReviewer) {
    throw new Error('ICON_VISUAL_WEIGHT_INDEPENDENT_REVIEWER_MISMATCH');
  }
  if (documentReviewer !== authorizedReviewer) {
    throw new Error('ICON_VISUAL_WEIGHT_UNAUTHORIZED_REVIEWER');
  }
  if (document.status !== 'visual-reviewed') {
    throw new Error('ICON_VISUAL_WEIGHT_INDEPENDENT_REVIEW_STATUS');
  }

  let independentReview: JsonRecord;
  if (Array.isArray(document.reviews)) {
    const matches = document.reviews
      .map((entry) => requireRecord(entry, 'ICON_VISUAL_WEIGHT_INVALID_INDEPENDENT_REVIEW'))
      .filter((entry) => entry.file === file);
    if (matches.length !== 1) {
      throw new Error('ICON_VISUAL_WEIGHT_INDEPENDENT_REVIEW_FILE_MISMATCH');
    }
    independentReview = matches[0];
  } else {
    independentReview = document;
    if (independentReview.file !== file) {
      throw new Error('ICON_VISUAL_WEIGHT_INDEPENDENT_REVIEW_FILE_MISMATCH');
    }
  }

  if (independentReview.reviewer !== undefined && independentReview.reviewer !== documentReviewer) {
    throw new Error('ICON_VISUAL_WEIGHT_INDEPENDENT_REVIEWER_MISMATCH');
  }
  const expectedFields = {
    candidateSourceSha256: requireSha(
      review,
      'candidateSourceSha256',
      'ICON_VISUAL_WEIGHT_MISSING',
    ),
    metricsSha256: requireSha(geometryEvidence, 'sha256', 'ICON_VISUAL_WEIGHT_MISSING'),
    visualMatrixSha256: requireSha(visualMatrix, 'sha256', 'ICON_VISUAL_WEIGHT_MISSING'),
  };
  for (const [field, expected] of Object.entries(expectedFields)) {
    if (
      requireSha(independentReview, field, 'ICON_VISUAL_WEIGHT_INVALID_INDEPENDENT_REVIEW') !==
      expected
    ) {
      throw new Error(`ICON_VISUAL_WEIGHT_INDEPENDENT_REVIEW_MISMATCH:${field}`);
    }
  }
  if (independentReview.geometryVerdict !== 'pass' || independentReview.visualVerdict !== 'pass') {
    throw new Error('ICON_VISUAL_WEIGHT_INDEPENDENT_REVIEW_UNAPPROVED');
  }
};

export function validateVisualWeightReviews(
  value: unknown,
  {
    expectedFiles,
    readArtifact,
    readCandidate,
  }: {
    expectedFiles: readonly string[];
    readArtifact: ReadArtifact;
    readCandidate: (file: string) => Buffer;
  },
) {
  const manifest = requireRecord(value, 'ICON_VISUAL_WEIGHT_INVALID_MANIFEST');
  if (manifest.schemaVersion !== 'icon-visual-weight-reviews-v2') {
    throw new Error('ICON_VISUAL_WEIGHT_SCHEMA_DRIFT');
  }
  const approvedFiles = requireNonEmptyArray(
    manifest,
    'approvedFiles',
    'ICON_VISUAL_WEIGHT_MISSING_APPROVED_FILES',
  );
  if (approvedFiles.some((file) => typeof file !== 'string')) {
    throw new Error('ICON_VISUAL_WEIGHT_INVALID_APPROVED_FILE');
  }
  if (new Set(approvedFiles).size !== approvedFiles.length) {
    throw new Error('ICON_VISUAL_WEIGHT_DUPLICATE_APPROVED_FILE');
  }
  const reviews = requireNonEmptyArray(
    manifest,
    'reviews',
    'ICON_VISUAL_WEIGHT_MISSING_REVIEWS',
  ).map((review) => requireRecord(review, 'ICON_VISUAL_WEIGHT_INVALID_REVIEW'));
  const files = reviews.map((review) =>
    requireString(review, 'file', 'ICON_VISUAL_WEIGHT_MISSING'),
  );
  if (new Set(files).size !== files.length) throw new Error('ICON_VISUAL_WEIGHT_DUPLICATE_REVIEW');
  const sortedExpected = [...expectedFiles].sort();
  if (
    JSON.stringify([...approvedFiles].sort()) !== JSON.stringify(sortedExpected) ||
    JSON.stringify([...files].sort()) !== JSON.stringify(sortedExpected)
  ) {
    throw new Error('ICON_VISUAL_WEIGHT_APPROVED_SET_DRIFT');
  }

  for (const review of reviews) {
    const file = requireString(review, 'file', 'ICON_VISUAL_WEIGHT_MISSING');
    const id = file.replace(/\.svg$/, '');
    requireString(review, 'exportName', 'ICON_VISUAL_WEIGHT_MISSING');
    const oldSourceSha256 = requireSha(review, 'oldSourceSha256', 'ICON_VISUAL_WEIGHT_MISSING');
    const candidateSourceSha256 = requireSha(
      review,
      'candidateSourceSha256',
      'ICON_VISUAL_WEIGHT_MISSING',
    );
    const nodeRoles = requireNonEmptyArray(review, 'nodeRoles', 'ICON_VISUAL_WEIGHT_MISSING').map(
      (role) => requireRecord(role, 'ICON_VISUAL_WEIGHT_INVALID_NODE_ROLE'),
    );
    for (const role of nodeRoles) {
      const locator = role.locator;
      if (
        !Array.isArray(locator) ||
        locator.some((index) => !Number.isInteger(index) || index < 0)
      ) {
        throw new Error('ICON_VISUAL_WEIGHT_INVALID_LOCATOR');
      }
      if (!['primary-line', 'semantic-fill', 'coupled-cutout'].includes(String(role.role))) {
        throw new Error('ICON_VISUAL_WEIGHT_INVALID_ROLE');
      }
    }
    if (!nodeRoles.some(({ role }) => role === 'primary-line')) {
      throw new Error('ICON_VISUAL_WEIGHT_MISSING_PRIMARY_LINE');
    }
    if (review.targetWidth !== 1) throw new Error('ICON_VISUAL_WEIGHT_TARGET_WIDTH_DRIFT');
    requireNonEmptyArray(review, 'sampleSegments', 'ICON_VISUAL_WEIGHT_MISSING');
    requireNumericTopology(review, 'topologyAtOldWidth');
    requireNumericTopology(review, 'topologyAtDefault');
    requireNonEmptyRecord(review, 'renderer', 'ICON_VISUAL_WEIGHT_MISSING');
    requireNonEmptyRecord(review, 'thresholds', 'ICON_VISUAL_WEIGHT_MISSING');
    requireString(review, 'serializedSvg', 'ICON_VISUAL_WEIGHT_MISSING');
    requireSha(review, 'rgbaSha256', 'ICON_VISUAL_WEIGHT_MISSING');
    if (review.reviewVerdict !== 'pass') throw new Error('ICON_VISUAL_WEIGHT_UNREVIEWED');
    requireString(review, 'reviewer', 'ICON_VISUAL_WEIGHT_MISSING');
    if (review.status !== 'promoted') throw new Error('ICON_VISUAL_WEIGHT_NOT_PROMOTED');

    const oldEvidence = validateArtifact(review, 'oldEvidence', `original/${file}`, readArtifact);
    if (oldEvidence.sha256 !== oldSourceSha256) {
      throw new Error('ICON_VISUAL_WEIGHT_OLD_SOURCE_DRIFT');
    }
    // The immutable reviews certify width-one geometry before the default-width migration.
    // Restore only the approved 1.5 -> 1 change; all other source bytes remain hash-checked.
    let candidate = readCandidate(file).toString('utf8');
    const paintRevision = geometryReviews.paintRevisions.find(
      (revision) => revision.file === file && revision.localRawSvgSha256 === digest(candidate),
    );
    if (paintRevision) {
      candidate = candidate.replaceAll(
        'opacity="0.5"',
        'color="rgb(from currentColor calc(r + 139) calc(g + 144) calc(b + 152))"',
      );
      if (digest(candidate) !== paintRevision.previousLocalRawSvgSha256)
        throw new Error('ICON_PAINT_REVISION_GEOMETRY_DRIFT');
    }
    const reviewedCandidate = candidate.replaceAll('stroke-width="1.5"', 'stroke-width="1"');
    if (digest(reviewedCandidate) !== candidateSourceSha256) {
      throw new Error('ICON_VISUAL_WEIGHT_CANDIDATE_SOURCE_DRIFT');
    }
    validateArtifact(review, 'targetPng', `targets/${id}.png`, readArtifact);
    const geometryEvidence = validateArtifact(
      review,
      'geometryEvidence',
      `geometry/${id}.json`,
      readArtifact,
    );
    const visualMatrix = validateArtifact(
      review,
      'visualMatrix',
      `review-evidence/${id}-matrix.png`,
      readArtifact,
    );
    const independentReviewPath =
      independentReviewPaths.get(file) ?? `review-evidence/${id}-independent-review.json`;
    const independentReview = validateArtifact(
      review,
      'independentReview',
      independentReviewPath,
      readArtifact,
    );
    validateIndependentReview(
      review,
      file,
      independentReview.contents,
      geometryEvidence,
      visualMatrix,
    );
  }
  return reviews;
}
