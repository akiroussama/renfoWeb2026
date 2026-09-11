import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCheckpointBranch } from '../scripts/lib/checkpoints.js';

describe('checkpoints - analyse stricte de branche cpN/<login>', () => {
  it('accepte cp0/<login> quand auteur correspond', () => {
    const r = parseCheckpointBranch('cp0/alice', 'alice');
    assert.equal(r.level, 0);
    assert.equal(r.login, 'alice');
  });

  it('accepte cp7 avec login complexe', () => {
    const r = parseCheckpointBranch('cp7/octocat123', 'octocat123');
    assert.equal(r.level, 7);
    assert.equal(r.login, 'octocat123');
  });

  it('accepte tous les niveaux 0..7', () => {
    for (let n = 0; n <= 7; n++) {
      const r = parseCheckpointBranch(`cp${n}/bob`, 'bob');
      assert.equal(r.level, n);
      assert.equal(r.login, 'bob');
    }
  });

  it('conserve le login canonique de la branche en comparant auteur sans casse', () => {
    const a = parseCheckpointBranch('cp2/Alice', 'alice');
    assert.equal(a.level, 2);
    assert.equal(a.login, 'Alice');
    const b = parseCheckpointBranch('cp2/alice', 'ALICE');
    assert.equal(b.level, 2);
    assert.equal(b.login, 'alice');
  });

  it('refuse build/* et verify/*', () => {
    assert.throws(() => parseCheckpointBranch('build/cp1/alice', 'alice'));
    assert.throws(() => parseCheckpointBranch('verify/cp1/alice', 'alice'));
    assert.throws(() => parseCheckpointBranch('build/alice', 'alice'));
    assert.throws(() => parseCheckpointBranch('verify/alice', 'alice'));
  });

  it('refuse cp8 et hors borne', () => {
    assert.throws(() => parseCheckpointBranch('cp8/alice', 'alice'));
    assert.throws(() => parseCheckpointBranch('cp9/alice', 'alice'));
    assert.throws(() => parseCheckpointBranch('cp10/alice', 'alice'));
    assert.throws(() => parseCheckpointBranch('cp-1/alice', 'alice'));
  });

  it('refuse variantes ambigues', () => {
    assert.throws(() => parseCheckpointBranch('CP1/alice', 'alice'));
    assert.throws(() => parseCheckpointBranch('Cp1/alice', 'alice'));
    assert.throws(() => parseCheckpointBranch('cp01/alice', 'alice'));
    assert.throws(() => parseCheckpointBranch('cp1', 'alice'));
    assert.throws(() => parseCheckpointBranch('cp1/', 'alice'));
    assert.throws(() => parseCheckpointBranch('cp1//alice', 'alice'));
  });

  it('refuse chemin supplementaire', () => {
    assert.throws(() => parseCheckpointBranch('cp1/alice/extra', 'alice'));
    assert.throws(() => parseCheckpointBranch('cp1/alice/tests', 'alice'));
    assert.throws(() => parseCheckpointBranch('cp1/alice/', 'alice'));
  });

  it('refuse login different de auteur', () => {
    assert.throws(() => parseCheckpointBranch('cp1/alice', 'bob'));
    assert.throws(() => parseCheckpointBranch('cp1/Alice', 'BOB'));
  });

  it('refuse login GitHub invalide', () => {
    assert.throws(() => parseCheckpointBranch('cp1/-alice', '-alice'));
    assert.throws(() => parseCheckpointBranch('cp1/alice-', 'alice-'));
    assert.throws(() => parseCheckpointBranch('cp1/alice_bob', 'alice_bob'));
    assert.throws(() => parseCheckpointBranch('cp1/alice!bob', 'alice!bob'));
    assert.throws(() => parseCheckpointBranch('cp1/', ''));
    assert.throws(() => parseCheckpointBranch('cp1/a'.replace('cp1/a', 'cp1/'), 'x'));
    const tropLong = 'a'.repeat(40);
    assert.throws(() => parseCheckpointBranch(`cp1/${tropLong}`, tropLong));
  });

  it('refuse branches non conformes et entrees vides', () => {
    assert.throws(() => parseCheckpointBranch('main', 'alice'));
    assert.throws(() => parseCheckpointBranch('', 'alice'));
    assert.throws(() => parseCheckpointBranch('cp1/alice', ''));
    assert.throws(() => parseCheckpointBranch('cp1/alice', undefined));
    assert.throws(() => parseCheckpointBranch(undefined, 'alice'));
    assert.throws(() => parseCheckpointBranch('/cp1/alice', 'alice'));
    assert.throws(() => parseCheckpointBranch(' cp1/alice', 'alice'));
    assert.throws(() => parseCheckpointBranch('cp1/alice ', 'alice'));
  });

  it('est pure et synchrone sans acces disque', () => {
    const r1 = parseCheckpointBranch('cp3/carol', 'CAROL');
    const r2 = parseCheckpointBranch('cp3/carol', 'carol');
    assert.deepEqual(r1, r2);
    assert.equal(r1.login, 'carol');
  });
});
