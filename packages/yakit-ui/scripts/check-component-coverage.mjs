import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const componentsRoot = join(packageRoot, 'src', 'components');
const coverageReportPath = resolve(
  packageRoot,
  process.argv[2] ?? 'coverage/components/coverage-final.json',
);

const approvedExcludedFiles = new Set([
  'src/components/index.tsx',
  'src/components/Button/index.tsx',
  'src/components/ConfigProvider/index.tsx',
  'src/components/InputNumber/index.tsx',
  'src/components/SearchInput/index.tsx',
  'src/components/Tag/index.tsx',
  'src/components/Animation/Wave/index.tsx',
]);

const requiredCoverageFiles = [
  'src/components/Input/index.tsx',
  'src/components/InputNumber/decimal.ts',
];

function toPosixPath(filePath) {
  return filePath.split(sep).join('/');
}

function toPackageRelativePath(filePath) {
  const withoutQuery = filePath.replace(/[?#].*$/, '');
  const decodedPath = withoutQuery.startsWith('file:') ? fileURLToPath(withoutQuery) : withoutQuery;
  const absolutePath = isAbsolute(decodedPath) ? decodedPath : resolve(packageRoot, decodedPath);
  const canonicalPath = existsSync(absolutePath) ? realpathSync(absolutePath) : absolutePath;

  return toPosixPath(relative(packageRoot, canonicalPath));
}

function isApprovedExclude(packageRelativePath) {
  const segments = packageRelativePath.split('/');
  const filename = segments.at(-1);

  return (
    approvedExcludedFiles.has(packageRelativePath) ||
    segments.includes('assets') ||
    segments.includes('style') ||
    filename === 'type.ts' ||
    packageRelativePath.endsWith('.d.ts')
  );
}

function collectComponentSources(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectComponentSources(absolutePath));
      continue;
    }

    if (!entry.isFile() || !['.ts', '.tsx'].includes(extname(entry.name))) {
      continue;
    }

    const packageRelativePath = toPackageRelativePath(absolutePath);
    if (!isApprovedExclude(packageRelativePath)) {
      files.push(packageRelativePath);
    }
  }

  return files;
}

if (!existsSync(coverageReportPath)) {
  console.error(`Component coverage report not found: ${coverageReportPath}`);
  process.exit(1);
}

const expectedFiles = new Set(collectComponentSources(componentsRoot));
const coverageReport = JSON.parse(readFileSync(coverageReportPath, 'utf8'));
const reportedFiles = new Set(Object.keys(coverageReport).map(toPackageRelativePath));

const expectedOnly = [...expectedFiles].filter((file) => !reportedFiles.has(file)).sort();
const reportOnly = [...reportedFiles].filter((file) => !expectedFiles.has(file)).sort();
const missingRequired = requiredCoverageFiles.filter(
  (file) => !expectedFiles.has(file) || !reportedFiles.has(file),
);

if (expectedOnly.length || reportOnly.length || missingRequired.length) {
  if (expectedOnly.length) {
    console.error('Component source files missing from coverage report:');
    expectedOnly.forEach((file) => console.error(`  - ${file}`));
  }

  if (reportOnly.length) {
    console.error('Unexpected files present in component coverage report:');
    reportOnly.forEach((file) => console.error(`  - ${file}`));
  }

  if (missingRequired.length) {
    console.error('Required runtime files are not covered by the inventory:');
    missingRequired.forEach((file) => console.error(`  - ${file}`));
  }

  process.exit(1);
}

console.log(`Component coverage inventory verified (${expectedFiles.size} source files).`);
