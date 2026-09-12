import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readProgression, resolveEffectiveCheckpoint, renderProgressGrid } from '../scripts/lib/checkpoints.js';

let tmpRoots = [];
function makeStudents() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-prog-'));
  tmpRoots.push(root);
  return root;
}
function writeProg(root, login, obj) {
  const dir = path.join(root, 'students', login);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'progression.json'), JSON.stringify(obj));
}
afterEach(() => {
  for (const d of tmpRoots) fs.rmSync(d, { recursive: true, force: true });
  tmpRoots = [];
});

describe('progression publique students/<login>/progression.json', () => {
  it('lit checkpoint entier 0..7', async () => {
    const root = makeStudents();
    writeProg(root, 'alice', { checkpoint: 2 });
    assert.equal(await readProgression(root, 'alice'), 2);
  });

  it('CP0 reste repli dune persona valide quand fichier absent', async () => {
    const root = makeStudents();
    const eff = await resolveEffectiveCheckpoint({ fileValue: null, validated: [0], personaValid: true });
    assert.equal(eff, 0);
  });

  it('refuse valeurs non entieres ou hors borne', async () => {
    const root = makeStudents();
    for (const bad of [{ checkpoint: 8 }, { checkpoint: -1 }, { checkpoint: 1.5 }, { checkpoint: '1' }, {}, { checkpoint: null }]) {
      writeProg(root, 'bob', bad);
      await assert.rejects(() => readProgression(root, 'bob'));
    }
    fs.mkdirSync(path.join(root, 'students', 'carol'), { recursive: true });
    fs.writeFileSync(path.join(root, 'students', 'carol', 'progression.json'), 'not-json');
    await assert.rejects(() => readProgression(root, 'carol'));
  });

  it('refuse saut par rapport aux marqueurs valides', async () => {
    await assert.rejects(() => resolveEffectiveCheckpoint({ fileValue: 2, validated: [0] }));
    await assert.rejects(() => resolveEffectiveCheckpoint({ fileValue: 3, validated: [0, 1] }));
    assert.equal(await resolveEffectiveCheckpoint({ fileValue: 1, validated: [0, 1] }), 1);
  });

  it('accepte progression coherente 0..N contigu', async () => {
    assert.equal(await resolveEffectiveCheckpoint({ fileValue: 0, validated: [0] }), 0);
    assert.equal(await resolveEffectiveCheckpoint({ fileValue: 2, validated: [0, 1, 2] }), 2);
  });
});

describe('grille publique - jamais de faux deblocage', () => {
  it('affiche CP atteint', () => {
    const html = renderProgressGrid({ login: 'alice', effectiveCheckpoint: 1, validatedLevels: [0, 1] });
    assert.ok(html.includes('CP1') || html.includes('CP 1'));
  });

  it('lien generique vers prochain uniquement si cible publiee fournie', () => {
    const withNext = renderProgressGrid({ login: 'alice', effectiveCheckpoint: 1, validatedLevels: [0, 1], nextTarget: 2 });
    assert.ok(withNext.toLowerCase().includes('cp2') || withNext.toLowerCase().includes('checkpoint'));
    const withoutNext = renderProgressGrid({ login: 'alice', effectiveCheckpoint: 1, validatedLevels: [0, 1] });
    assert.ok(!withoutNext.toLowerCase().includes('href') || !withoutNext.toLowerCase().includes('cp2'));
  });

  it('ne debloche jamais un CP non valide', () => {
    const html = renderProgressGrid({ login: 'alice', effectiveCheckpoint: 0, validatedLevels: [0] });
    assert.ok(!(html.includes('CP1') && html.toLowerCase().includes('valid')) || !html.toLowerCase().includes('cp1') || html.toLowerCase().includes('verrouill'));
    const eff0 = renderProgressGrid({ login: 'alice', effectiveCheckpoint: 0, validatedLevels: [0], nextTarget: 1 });
    assert.ok(!eff0.match(/CP\s*1[^<]*valid|valid[^<]*CP\s*1/i) || eff0.toLowerCase().includes('prochain'));
  });

  it('n exige aucun enonce futur et reste generique', () => {
    const html = renderProgressGrid({ login: 'zorro', effectiveCheckpoint: 0, validatedLevels: [0], nextTarget: 1 });
    assert.equal(typeof html, 'string');
    assert.ok(html.toLowerCase().includes('cp0') || html.toLowerCase().includes('cp 0'));
  });
});
