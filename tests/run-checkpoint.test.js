import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseRunArgs, runCheckpoint } from '../scripts/run-checkpoint.js';

let tmpRoots = [];
function makeRootWithSuites(levels) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-run-'));
  tmpRoots.push(root);
  for (const n of levels) {
    const dir = path.join(root, 'checkpoints', `cp${n}`, 'tests');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'dummy.test.js'), "import test from 'node:test'; test('d',()=>{});");
  }
  const studentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-stud-'));
  tmpRoots.push(studentDir);
  return { root, studentDir };
}
afterEach(() => {
  for (const d of tmpRoots) fs.rmSync(d, { recursive: true, force: true });
  tmpRoots = [];
});

describe('run-checkpoint - arguments', () => {
  it('accepte --branch et --author', () => {
    const r = parseRunArgs(['--branch=cp2/alice', '--author=alice']);
    assert.equal(r.branch, 'cp2/alice');
    assert.equal(r.author, 'alice');
  });

  it('accepte ordre inverse', () => {
    const r = parseRunArgs(['--author=bob', '--branch=cp1/bob']);
    assert.equal(r.branch, 'cp1/bob');
    assert.equal(r.author, 'bob');
  });

  it('refuse arguments inconnus', () => {
    assert.throws(() => parseRunArgs(['--branch=cp1/alice', '--author=alice', '--foo=bar']));
    assert.throws(() => parseRunArgs(['--branch=cp1/alice', '--author=alice', 'extra']));
  });

  it('refuse arguments incomplets', () => {
    assert.throws(() => parseRunArgs(['--branch=cp1/alice']));
    assert.throws(() => parseRunArgs(['--author=alice']));
    assert.throws(() => parseRunArgs([]));
    assert.throws(() => parseRunArgs(['--branch=', '--author=alice']));
    assert.throws(() => parseRunArgs(['--branch=cp1/alice', '--author=']));
  });
});

describe('run-checkpoint - execution avec fonction injectable', () => {
  it('execute persona dabord puis suites cp1..cpN avec node --test et env', async () => {
    const { root, studentDir } = makeRootWithSuites([1, 2]);
    const calls = [];
    async function fakeExec(file, args, opts) {
      calls.push({ file, args, opts });
      return { status: 0 };
    }
    await runCheckpoint({ branch: 'cp2/alice', author: 'alice', rootDir: root, studentDir, exec: fakeExec });
    assert.ok(calls.length >= 3);
    const flat = JSON.stringify(calls).toLowerCase();
    assert.ok(flat.includes('persona'));
    assert.ok(flat.includes('--test'));
    assert.ok(JSON.stringify(calls).includes('alice'));
    const first = JSON.stringify(calls[0]).toLowerCase();
    assert.ok(first.includes('persona'));
    const all = JSON.stringify(calls).split(path.sep.repeat(2)).join('/');
    assert.ok(all.includes('STUDENT_LOGIN'));
    assert.ok(all.includes('STUDENT_DIR'));
    assert.ok(all.includes(path.join('checkpoints', 'cp1')) || all.includes('checkpoints/cp1'));
    assert.ok(all.includes(path.join('checkpoints', 'cp2')) || all.includes('checkpoints/cp2'));
  });

  it('pour N=0 execute seulement le controle persona', async () => {
    const { root, studentDir } = makeRootWithSuites([]);
    const calls = [];
    async function fakeExec(file, args, opts) {
      calls.push({ file, args, opts });
      return { status: 0 };
    }
    await runCheckpoint({ branch: 'cp0/alice', author: 'alice', rootDir: root, studentDir, exec: fakeExec });
    assert.equal(calls.length, 1);
    assert.ok(JSON.stringify(calls[0]).toLowerCase().includes('persona'));
  });

  it('propage echec et nempeche pas les suites suivantes (pas de masquage)', async () => {
    const { root, studentDir } = makeRootWithSuites([1, 2]);
    const seen = [];
    async function flaky(file, args, opts) {
      const s = JSON.stringify({ file, args });
      seen.push(s);
      if (s.includes('cp1')) return { status: 1 };
      return { status: 0 };
    }
    await assert.rejects(() => runCheckpoint({ branch: 'cp2/alice', author: 'alice', rootDir: root, studentDir, exec: flaky }));
    const joined = seen.join('\n');
    assert.ok(joined.includes('cp1'));
    assert.ok(joined.includes('cp2'));
  });

  it('refuse login different avant tout appel', async () => {
    const { root, studentDir } = makeRootWithSuites([1]);
    let called = 0;
    async function fakeExec() { called++; return { status: 0 }; }
    await assert.rejects(() => runCheckpoint({ branch: 'cp1/alice', author: 'bob', rootDir: root, studentDir, exec: fakeExec }));
    assert.equal(called, 0);
  });

  it('construit le plan depuis la racine injectee sans dependre denonces futurs', async () => {
    const { root, studentDir } = makeRootWithSuites([1]);
    const calls = [];
    async function fakeExec(file, args, opts) { calls.push({ file, args, opts }); return { status: 0 }; }
    await runCheckpoint({ branch: 'cp1/zorro', author: 'zorro', rootDir: root, studentDir, exec: fakeExec });
    const all = JSON.stringify(calls).split(path.sep.repeat(2)).join('/');
    assert.ok(all.includes('zorro'));
    assert.ok(all.includes(path.resolve(root).split(path.sep).join('/')));
  });
});
