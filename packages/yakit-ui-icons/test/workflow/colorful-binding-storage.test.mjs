import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { planSourceImport } from '../../scripts/import-icon-sources.mjs';
import { applyChanges, jsonText, packageRoot } from '../../scripts/update-icons.mjs';

const sourcePath = 'config/icon-sources/colorful.json';
const bindings = [
  {
    token: '--Colors-Use-Main-Primary',
    fallbackHex: '#F28C45',
    figmaVariableId: 'VariableID:test',
    sourceNodeIds: ['999999:1'],
  },
];

async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'yakit-binding-storage-'));
  try {
    await cp(
      path.join(packageRoot, 'config/icon-sources'),
      path.join(root, 'config/icon-sources'),
      {
        recursive: true,
      },
    );
    const source = JSON.parse(await readFile(path.join(root, sourcePath), 'utf8'));
    const record = source.records.find((row) => row.nodeId === '37150:32094');
    const svgPath = path.join(root, 'input.svg');
    await writeFile(svgPath, record.rawSvg);
    const icon = {
      url: record.sourceUrl,
      name: record.figmaName,
      nodeType: 'COMPONENT',
      width: record.width,
      height: record.height,
      svgPath,
    };
    const save = () => writeFile(path.join(root, sourcePath), jsonText(source));
    const importedRecord = (plan) =>
      JSON.parse(plan.changes.get(sourcePath).after).records.find(
        (row) => row.nodeId === record.nodeId,
      );
    const plan = () => planSourceImport({ schemaVersion: 1, icons: [icon] }, root);
    await run({ root, record, icon, save, importedRecord, plan });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('Colorful stores imported bindings once and repeat imports do not refresh timestamps', () =>
  fixture(async ({ root, icon, importedRecord, plan }) => {
    icon.evidence = { themePaintBindings: bindings, component: { nodeType: 'COMPONENT' } };
    const first = await plan();
    const record = importedRecord(first);
    assert.deepEqual(record.themePaintBindings, bindings);
    assert.deepEqual(record.evidence, { component: { nodeType: 'COMPONENT' } });
    await applyChanges(root, first.changes);
    const repeated = await plan();
    assert.equal(repeated.changes.size, 0);
    assert.equal(repeated.report[0].status, 'unchanged');

    icon.evidence.themePaintBindings = [{ ...bindings[0], sourceNodeIds: ['999999:2'] }];
    const updated = await plan();
    assert.equal(updated.report[0].status, 'updated');
    assert.deepEqual(importedRecord(updated).themePaintBindings, icon.evidence.themePaintBindings);
  }));

test('Colorful removes legacy duplicate bindings while preserving other evidence', () =>
  fixture(async ({ root, record, save, importedRecord, plan }) => {
    record.themePaintBindings = bindings;
    record.evidence = { themePaintBindings: bindings, component: { nodeType: 'COMPONENT' } };
    await save();
    const first = await plan();
    assert.deepEqual(importedRecord(first).themePaintBindings, bindings);
    assert.deepEqual(importedRecord(first).evidence, { component: { nodeType: 'COMPONENT' } });
    await applyChanges(root, first.changes);
    assert.equal((await plan()).changes.size, 0);
  }));

test('Colorful migrates nested-only bindings and omits empty evidence', () =>
  fixture(async ({ root, record, save, importedRecord, plan }) => {
    delete record.themePaintBindings;
    record.evidence = { themePaintBindings: bindings };
    await save();
    const first = await plan();
    assert.deepEqual(importedRecord(first).themePaintBindings, bindings);
    assert.equal(Object.hasOwn(importedRecord(first), 'evidence'), false);
    await applyChanges(root, first.changes);
    assert.equal((await plan()).changes.size, 0);
  }));
