import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { readIconSources } from '../../scripts/icon-source-data.mjs';
import { readIconInputSync } from '../../scripts/icon-source-documents.mjs';
import { joinIconSource } from '../../scripts/icon-source-model.mjs';

const svgFile = 'svg/TestFile/123-456.svg';
const evidenceFile = 'evidence/TestFile/123-456.json';
const rawSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="#123456"/></svg>\n';
const binding = {
  figmaVariableId: 'VariableID:test',
  sourceNodeIds: ['123:457'],
  fallbackHex: '#123456',
  targets: [{ locator: [0], attribute: 'fill', expectedValue: '#123456' }],
};

function fixture() {
  return {
    document: {
      schemaVersion: 2,
      family: 'outline',
      fileKey: 'TestFile',
      groups: [{ nodeId: '123:0', name: 'outline' }],
      records: [
        {
          nodeId: '123:456',
          name: 'Outline/example',
          groupNodeId: '123:0',
          svgFile,
          evidenceFile,
          colorBindings: { status: 'unknown', bindings: [] },
        },
      ],
    },
    project: {
      schemaVersion: 1,
      records: { '123:456': { exportName: 'ExampleOutlined', file: 'outline/123-456.svg' } },
    },
    rawFiles: { [svgFile]: rawSvg },
    evidenceFiles: { [evidenceFile]: { captured: { nodeType: 'COMPONENT' } } },
  };
}
const join = ({ document, project, rawFiles, evidenceFiles }) =>
  joinIconSource(document, project, rawFiles, evidenceFiles);
const rejects = (run, message) => assert.throws(run, { message });

describe('source model validation', () => {
  for (const status of ['unknown', 'none', 'captured']) {
    test(`accepts valid ${status} bindings and preserves the original SVG`, () => {
      const input = fixture();
      const bindings = status === 'captured' ? [structuredClone(binding)] : [];
      input.document.records[0].colorBindings = { status, bindings };
      input.project.records['123:456'].variableTokens = { 'VariableID:test': '--Example-Color' };
      const record = join(input).records[0];
      assert.equal(record.raw.svg, rawSvg);
      assert.equal(record.exportName, 'ExampleOutlined');
      assert.deepEqual(record.colorBindings, { status, bindings });
      assert.deepEqual(
        record.themePaintBindings,
        bindings.map((b) => ({ ...b, token: '--Example-Color' })),
      );
      assert.deepEqual(record.evidence, input.evidenceFiles[evidenceFile]);
    });
  }

  for (const wrongPath of [
    'svg/TestFile/123-789.svg',
    'svg/OtherFile/123-456.svg',
    'svg/TestFile/123:456.svg',
  ]) {
    test(`rejects an original SVG belonging to another identity: ${wrongPath}`, () => {
      const input = fixture();
      input.document.records[0].svgFile = wrongPath;
      // The file exists: rejection must concern identity, not missing file contents.
      input.rawFiles[wrongPath] = rawSvg;
      rejects(() => join(input), 'ICON_RAW_PATH_INVALID: 123:456');
    });
  }

  test('rejects a source record with no project mapping', () => {
    const input = fixture();
    delete input.project.records['123:456'];
    rejects(() => join(input), 'ICON_EXPORT_MAPPING_MISSING: 123:456');
  });

  test('rejects a project mapping left behind after its source record was removed', () => {
    const input = fixture();
    input.project.records['123:789'] = {
      exportName: 'OrphanOutlined',
      file: 'outline/123-789.svg',
    };
    rejects(() => join(input), 'ICON_EXPORT_MAPPING_ORPHAN: 123:789');
  });

  test('rejects declared evidence missing from the loaded evidence collection', () => {
    const input = fixture();
    delete input.evidenceFiles[evidenceFile];
    rejects(() => join(input), 'ICON_EVIDENCE_MISSING: 123:456');
  });

  test('allows a record with no evidence reference', () => {
    const input = fixture();
    delete input.document.records[0].evidenceFile;
    input.evidenceFiles = {};
    assert.equal(join(input).records[0].evidence, undefined);
  });

  for (const [label, value] of [
    ['missing object', undefined],
    ['null object', null],
    ['missing status', { bindings: [] }],
    ['unknown status name', { status: 'confirmed', bindings: [] }],
    ['missing bindings list', { status: 'captured' }],
    ['null bindings list', { status: 'captured', bindings: null }],
    ['non-array bindings', { status: 'captured', bindings: {} }],
    ['unknown status with bindings', { status: 'unknown', bindings: [binding] }],
    ['none status with bindings', { status: 'none', bindings: [binding] }],
  ]) {
    test(`rejects invalid color bindings: ${label}`, () => {
      const input = fixture();
      input.document.records[0].colorBindings = value;
      rejects(() => join(input), 'ICON_BINDINGS_INVALID: 123:456');
    });
  }
});

function diskFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'icon-source-validation-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, 'config/icon-sources');
  const write = (relative, contents) => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, typeof contents === 'string' ? contents : JSON.stringify(contents));
  };
  const input = fixture();
  write('config/icon-display.json', { schemaVersion: 1, families: {} });
  write('config/icon-sources/loading.json', { schemaVersion: 1, family: 'loading', records: [] });
  for (const family of ['outline', 'solid', 'colorful']) {
    write(`config/icon-sources/${family}.json`, {
      ...input.document,
      family,
      records: family === 'outline' ? input.document.records : [],
    });
    write(`config/icon-project/${family}.json`, {
      schemaVersion: 1,
      records: family === 'outline' ? input.project.records : {},
    });
  }
  write(`config/icon-sources/${svgFile}`, rawSvg);
  write(`config/icon-sources/${evidenceFile}`, input.evidenceFiles[evidenceFile]);
  return { directory, input, write };
}

const readers = {
  loader: (directory) => readIconSources(directory),
  projection: (directory) => readIconInputSync(path.join(directory, 'outline.json#raw'), 'utf8'),
};

describe('source file loading and document projection', () => {
  test('reads valid split files using either a path or a file URL', (t) => {
    const { directory } = diskFixture(t);
    for (const root of [directory, pathToFileURL(`${directory}/`)]) {
      assert.equal(readIconSources(root).outline.records[0].raw.svg, rawSvg);
    }
    const raw = JSON.parse(readers.projection(directory));
    assert.equal(raw.components[0].svg, rawSvg);
    assert.equal(raw.components[0].nodeId, '123:456');
  });

  for (const field of ['svgFile', 'evidenceFile']) {
    for (const [label, invalidPath] of [
      ['parent traversal', '../outside.json'],
      ['absolute path', path.resolve(tmpdir(), 'outside.json')],
      ['Windows path', 'C:\\outside.json'],
      ['backslash traversal', '..\\outside.json'],
      ['URL-encoded traversal', '%2e%2e/outside.json'],
    ]) {
      test(`rejects ${field} ${label} before attempting to read it`, (t) => {
        const { directory, input, write } = diskFixture(t);
        input.document.records[0][field] = invalidPath;
        write('config/icon-sources/outline.json', input.document);
        for (const read of Object.values(readers))
          rejects(() => read(directory), `ICON_PATH_INVALID: ${invalidPath}`);
      });
    }
  }

  test('reports the actual missing evidence file through both public readers', (t) => {
    const { directory } = diskFixture(t);
    const missing = path.join(directory, evidenceFile);
    rmSync(missing);
    for (const read of Object.values(readers)) {
      assert.throws(
        () => read(directory),
        (error) => {
          assert.equal(error.code, 'ENOENT');
          assert.equal(error.path, missing);
          return true;
        },
      );
    }
  });
});
