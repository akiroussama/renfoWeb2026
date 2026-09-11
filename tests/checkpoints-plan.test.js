import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildCheckpointPlan } from '../scripts/lib/checkpoints.js';

let tmpRoots = [];
function makeRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-plan-'));
  tmpRoots.push(dir);
  return dir;
}
function writeSuite(root, level, name, body = "import test from 'node:test'; import assert from 'node:assert/strict'; test('dummy', () => assert.equal(1,1));") {
  const dir = path.join(root, 'checkpoints', `cp${level}`, 'tests');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), body);
  return dir;
}
afterEach(() => {
  for (const d of tmpRoots) fs.rmSync(d, { recursive: true, force: true });
  tmpRoots = [];
});

describe('checkpoints - plan cumulatif cp0..cpN', () => {
  it('plan cp0 seul sans dossier checkpoints', () => {
    const root = makeRoot();
    const plan = buildCheckpointPlan(root, 0);
    assert.equal(plan.length, 1);
    assert.equal(plan[0].level, 0);
    assert.match(JSON.stringify(plan[0]).toLowerCase(), /persona/);
  });

  it('produit plan cumulatif ordonne cp0..cpN', () => {
    const root = makeRoot();
    writeSuite(root, 1, 'a.test.js');
    writeSuite(root, 2, 'a.test.js');
    const plan = buildCheckpointPlan(root, 2);
    assert.equal(plan.length, 3);
    assert.deepEqual(plan.map((s) => s.level), [0, 1, 2]);
  });

  it('decouverte deterministe triee', () => {
    const root = makeRoot();
    writeSuite(root, 1, 'b.test.js');
    writeSuite(root, 1, 'a.test.js');
    const p1 = buildCheckpointPlan(root, 1);
    const p2 = buildCheckpointPlan(root, 1);
    assert.deepEqual(p1, p2);
    const files1 = p1.find((s) => s.level === 1).files;
    assert.ok(files1[0].endsWith('a.test.js'));
    assert.ok(files1[1].endsWith('b.test.js'));
  });

  it('refuse trou quand niveau intermediaire absent', () => {
    const root = makeRoot();
    writeSuite(root, 2, 'a.test.js');
    assert.throws(() => buildCheckpointPlan(root, 2));
  });

  it('refuse dossier absent', () => {
    const root = makeRoot();
    assert.throws(() => buildCheckpointPlan(root, 1));
  });

  it('refuse suite absente : dossier vide ou sans .test.js', () => {
    const root = makeRoot();
    fs.mkdirSync(path.join(root, 'checkpoints', 'cp1', 'tests'), { recursive: true });
    assert.throws(() => buildCheckpointPlan(root, 1));
    fs.writeFileSync(path.join(root, 'checkpoints', 'cp1', 'tests', 'helper.js'), 'export const x=1;');
    assert.throws(() => buildCheckpointPlan(root, 1));
  });

  it('ignore fichiers non .test.js', () => {
    const root = makeRoot();
    writeSuite(root, 1, 'ok.test.js');
    fs.writeFileSync(path.join(root, 'checkpoints', 'cp1', 'tests', 'README.md'), '# dummy');
    fs.writeFileSync(path.join(root, 'checkpoints', 'cp1', 'tests', 'util.js'), 'export const y=2;');
    const plan = buildCheckpointPlan(root, 1);
    const files = plan.find((s) => s.level === 1).files;
    assert.equal(files.length, 1);
    assert.ok(files[0].endsWith('ok.test.js'));
  });

  it('refuse symlink hors racine', () => {
    const root = makeRoot();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-out-'));
    tmpRoots.push(outside);
    const evil = path.join(outside, 'evil.test.js');
    fs.writeFileSync(evil, "import test from 'node:test'; test('x',()=>{});");
    const dir = path.join(root, 'checkpoints', 'cp1', 'tests');
    fs.mkdirSync(dir, { recursive: true });
    fs.symlinkSync(evil, path.join(dir, 'link.test.js'));
    assert.throws(() => buildCheckpointPlan(root, 1));
  });

  it('accepte racine injectable et isole du cwd', () => {
    const r1 = makeRoot();
    const r2 = makeRoot();
    writeSuite(r1, 1, 'only-in-r1.test.js');
    writeSuite(r2, 1, 'only-in-r2.test.js');
    const p1 = buildCheckpointPlan(r1, 1);
    const p2 = buildCheckpointPlan(r2, 1);
    assert.match(p1.find((s) => s.level === 1).files[0], /only-in-r1/);
    assert.match(p2.find((s) => s.level === 1).files[0], /only-in-r2/);
  });

  it('retourne chemins contenus dans la racine', () => {
    const root = makeRoot();
    writeSuite(root, 1, 'a.test.js');
    const plan = buildCheckpointPlan(root, 1);
    for (const step of plan) {
      if (step.files) for (const f of step.files) assert.ok(path.resolve(f).startsWith(path.resolve(root)));
    }
  });

  it('refuse niveaux invalides', () => {
    const root = makeRoot();
    assert.throws(() => buildCheckpointPlan(root, 8));
    assert.throws(() => buildCheckpointPlan(root, -1));
    assert.throws(() => buildCheckpointPlan(root, 1.5));
    assert.throws(() => buildCheckpointPlan(root, '1'));
    assert.throws(() => buildCheckpointPlan(root, NaN));
  });
});
