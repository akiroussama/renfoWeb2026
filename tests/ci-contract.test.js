import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const yml = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
const deb = yml.indexOf('name: Persona CP0');
const fin = yml.indexOf('name: Tests du kit', deb);
const bloc = yml.slice(deb, fin === -1 ? undefined : fin);
describe('Contrat CI Persona CP0', () => {
  it('ordonne setup-node avant et job cp0-tests stable', () => {
    assert.ok(deb >= 0 && fin > deb);
    assert.ok(yml.indexOf('setup-node') !== -1 && yml.indexOf('setup-node') < deb);
    assert.ok(yml.includes('cp0-tests:'));
  });
  it('run lit $CP0_STUDENT_LOGIN sans interpolation et env auteur PR', () => {
    const run = bloc.match(/run:\s*(.+)/)?.[1];
    assert.ok(run && run.includes('$CP0_STUDENT_LOGIN'));
    assert.ok(!run.includes('${{'));
    assert.ok(bloc.includes('github.event.pull_request.user.login'));
  });
  it('condition vraie seulement PR auteur externe', () => {
    const m = bloc.match(/if:\s*(.+)/);
    assert.ok(m, 'condition if absente');
    const f = new Function('github', 'return (' + m[1].trim() + ')');
    const cas = (g) => f(g);
    assert.equal(cas({ event_name: 'push', event: {}, repository_owner: 'o' }), false);
    assert.equal(cas({ event_name: 'pull_request', event: { pull_request: { user: { type: 'User', login: 'o' } } }, repository_owner: 'o' }), false);
    assert.equal(cas({ event_name: 'pull_request', event: { pull_request: { user: { type: 'Bot', login: 'x' } } }, repository_owner: 'o' }), false);
    assert.equal(cas({ event_name: 'pull_request', event: { pull_request: { user: { type: 'User', login: 'alice' } } }, repository_owner: 'o' }), true);
  });
});
function exec(args, status = 7) {
  const f = path.resolve('scripts/test.js');
  let b = fs.readFileSync(f, 'utf8').replace(/^import .*;$/gm, '').replace(/import\.meta\.url/g, JSON.stringify(pathToFileURL(f).href));
  const calls = [], order = [], sent = { c: null };
  const fakeFs = { readdirSync: () => ['fixture.test.js'] };
  const run = new Function('spawnSync', 'fs', 'path', 'fileURLToPath', 'ensureRuntime', 'process', 'console', b);
  const fakeP = { argv: ['node', 'scripts/test.js', ...args], execPath: 'node', env: {}, exit: (c) => { throw Object.assign(sent, { c }); } };
  let code = null;
  try { run((...a) => { order.push('spawn'); calls.push(a); return { status }; }, fakeFs, path, fileURLToPath, () => order.push('guard'), fakeP, console); }
  catch (e) { if (e === sent) code = e.c; else throw e; }
  const portable = calls.map(a => [a[0], a[1].map(v => v.replaceAll(path.sep, '/')), a[2]]);
  return { calls: portable, order, code, flat: JSON.stringify(portable) };
}
describe('Contrat runner test.js', () => {
  it('kit-only lance un seul enfant unit spec et propage statut', () => {
    const r = exec(['--kit-only'], 5);
    assert.equal(r.calls.length, 1);
    assert.ok(r.flat.includes('--test') && r.flat.includes('--test-reporter=spec') && !r.flat.includes('scripts/test-personas.js'));
    assert.equal(r.code, 5);
    assert.equal(r.order[0], 'guard');
  });
  it('sans args lance unit puis CLI personas globale', () => {
    const r = exec([], 0);
    assert.equal(r.calls.length, 2);
    assert.ok(JSON.stringify(r.calls[0]).includes('--test'));
    assert.ok(JSON.stringify(r.calls[1]).includes('scripts/test-personas.js'));
    assert.equal(r.order[0], 'guard');
  });
  it('ciblé --student=alice transmis une fois sans unit', () => {
    const r = exec(['--student=alice'], 3);
    assert.equal(r.calls.length, 1);
    assert.ok(r.flat.includes('scripts/test-personas.js') && r.flat.includes('alice'));
    assert.ok(!r.flat.includes('--test-reporter=spec'));
    assert.equal(r.code, 3);
    assert.equal(r.order[0], 'guard');
  });
  it('mixte kit-only inconnu transmis au CLI non confondu unit', () => {
    const r = exec(['--kit-only', '--unknown'], 0);
    assert.ok(r.flat.includes('scripts/test-personas.js'));
    assert.ok(r.flat.includes('--unknown'));
    assert.equal(r.order[0], 'guard');
  });
});
