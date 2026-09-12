// tests/prepare-reprise.test.js
// Outil public générique de reprise de formation — tests TDD.
// Pédagogie en français, exemples simples et exécutables.
// Lancer avec : node --test
// Ces tests décrivent le contrat avant le code (rouge réel avant code).
// Aucune opération vers une forge en ligne, aucun réseau.
// Les dossiers éphémères sont créés dans os.tmpdir et conservés après le test.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs, prepareReprise } from '../scripts/prepare-reprise.js';

// Vocabulaire attendu pour les messages d'erreur en français.
const MESSAGE_FR = /jour|cible|dossier|source|option|inconnu|manquant|invalide|existe|obligatoire|vide|branche|clone|aide|utilisation|tiret|saut|ligne/i;
const SOURCE_DEFAUT = 'https://github.com/akiroussama/renfoWeb2026.git';

function brancheAttendue(jour) {
  if (jour === 1) return 'atelier/j1-depart';
  return `reprise/j${jour}`;
}

let compteurCible = 0;

function creerDossierEphemere(prefixe) {
  // Hors espace de travail, conservé après le test, sans suppression.
  return fs.mkdtempSync(path.join(os.tmpdir(), prefixe));
}

function cibleInexistante(base, ...segments) {
  compteurCible += 1;
  return path.join(base, ...segments, `nouvelle-cible-${process.pid}-${Date.now()}-${compteurCible}`);
}

function creerEspionSucces() {
  const appels = [];
  async function espion(args, options) {
    appels[appels.length] = { args: [...args], cwd: options?.cwd };
    return { stdout: 'clone simulé' };
  }
  espion.appels = appels;
  return espion;
}

function creerEspionEchec() {
  const appels = [];
  async function espion(args, options) {
    appels[appels.length] = { args: [...args], cwd: options?.cwd };
    throw new Error('simulated git failure: branch not found');
  }
  espion.appels = appels;
  return espion;
}

function gitLocal(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

test('parseArgs : jour et cible minimaux', () => {
  const resultat = parseArgs(['--day', '2', '--target', '../essai']);
  assert.deepStrictEqual(resultat, { day: 2, target: '../essai' });
});

test('parseArgs : source optionnelle conservée', () => {
  const resultat = parseArgs(['--day', '1', '--target', '/tmp/essai', '--source', '/tmp/bundle-local']);
  assert.deepStrictEqual(resultat, { day: 1, target: '/tmp/essai', source: '/tmp/bundle-local' });
});

test('parseArgs : --help retourne {help:true} seul', () => {
  const resultat = parseArgs(['--help']);
  assert.deepStrictEqual(resultat, { help: true });
});

test('parseArgs : option inconnue rejetée en français', () => {
  assert.throws(() => parseArgs(['--day', '2', '--target', 'x', '--inconnu', 'y']), MESSAGE_FR);
});

test('parseArgs : option répétée rejetée en français', () => {
  assert.throws(() => parseArgs(['--day', '2', '--day', '3', '--target', 'x']), MESSAGE_FR);
  assert.throws(() => parseArgs(['--day', '2', '--target', 'a', '--target', 'b']), MESSAGE_FR);
});

test('parseArgs : options manquantes et jour invalide rejetés en français', () => {
  assert.throws(() => parseArgs(['--day', '2']), MESSAGE_FR);
  assert.throws(() => parseArgs(['--target', 'x']), MESSAGE_FR);
  assert.throws(() => parseArgs(['--day', '0', '--target', 'x']), MESSAGE_FR);
  assert.throws(() => parseArgs(['--day', '5', '--target', 'x']), MESSAGE_FR);
  assert.throws(() => parseArgs(['--day', 'abc', '--target', 'x']), MESSAGE_FR);
  assert.throws(() => parseArgs(['--day', '2.5', '--target', 'x']), MESSAGE_FR);
});

test('prepareReprise : validation complète avant tout appel git', async () => {
  const base = creerDossierEphemere('reprise-validation-');
  const espion = creerEspionSucces();
  let erreur = null;
  try {
    await prepareReprise({ day: 0, target: cibleInexistante(base, 'cas-jour'), runGit: espion });
  } catch (e) {
    erreur = e;
  }
  assert.ok(erreur instanceof Error);
  assert.match(erreur.message, MESSAGE_FR);
  erreur = null;
  try {
    await prepareReprise({ day: 2, target: '', runGit: espion });
  } catch (e) {
    erreur = e;
  }
  assert.ok(erreur instanceof Error);
  assert.match(erreur.message, MESSAGE_FR);
  assert.strictEqual(espion.appels.length, 0);
});

test('prepareReprise : source invalide rejetée avant appel git', async () => {
  const base = creerDossierEphemere('reprise-source-invalide-');
  const espion = creerEspionSucces();
  const cas = ['', '-mauvais-depot', 'depot\nnom'];
  for (const source of cas) {
    let erreur = null;
    try {
      await prepareReprise({ day: 2, target: cibleInexistante(base, 'cas-source'), source, runGit: espion });
    } catch (e) {
      erreur = e;
    }
    assert.ok(erreur instanceof Error);
    assert.match(erreur.message, MESSAGE_FR);
  }
  assert.strictEqual(espion.appels.length, 0);
});

test('prepareReprise : cible existante refusée sans écraser ni appeler git', async () => {
  const base = creerDossierEphemere('reprise-existant-');
  const espion = creerEspionSucces();
  const sourceValide = path.join(base, 'repetition-fictive');
  const cheminFichier = path.join(base, 'travail-precieux.txt');
  fs.writeFileSync(cheminFichier, 'travail précieux à conserver', 'utf8');
  const cheminDossier = path.join(base, 'dossier-travail');
  fs.mkdirSync(cheminDossier, { recursive: true });
  fs.writeFileSync(path.join(cheminDossier, 'note.txt'), 'contenu à conserver', 'utf8');
  const cheminLien = path.join(base, 'lien-valide');
  fs.symlinkSync(cheminFichier, cheminLien);
  const cheminAbsent = path.join(base, 'absent-vise');
  const cheminLienMort = path.join(base, 'lien-mort');
  fs.symlinkSync(cheminAbsent, cheminLienMort);
  assert.ok(fs.lstatSync(cheminLienMort).isSymbolicLink());
  assert.throws(() => fs.statSync(cheminLienMort));
  const cibles = [cheminFichier, cheminDossier, cheminLien, cheminLienMort];
  for (const cible of cibles) {
    let erreur = null;
    try {
      await prepareReprise({ day: 2, target: cible, source: sourceValide, runGit: espion });
    } catch (e) {
      erreur = e;
    }
    assert.ok(erreur instanceof Error);
    assert.match(erreur.message, MESSAGE_FR);
  }
  assert.strictEqual(espion.appels.length, 0);
  assert.strictEqual(fs.readFileSync(cheminFichier, 'utf8'), 'travail précieux à conserver');
  assert.strictEqual(fs.readFileSync(path.join(cheminDossier, 'note.txt'), 'utf8'), 'contenu à conserver');
  assert.ok(fs.lstatSync(cheminLien).isSymbolicLink());
  assert.ok(fs.lstatSync(cheminLienMort).isSymbolicLink());
});

test('prepareReprise : branches et arguments de clonage avec source par défaut', async () => {
  const base = creerDossierEphemere('reprise-branches-');
  const attentes = new Map([
    [1, 'atelier/j1-depart'],
    [2, 'reprise/j2'],
    [3, 'reprise/j3'],
    [4, 'reprise/j4'],
  ]);
  for (const [jour, branche] of attentes) {
    const espion = creerEspionSucces();
    const cible = cibleInexistante(base, `parent-j${jour}`, 'sous');
    const absolue = path.resolve(cible);
    const parentAbsolu = path.dirname(absolue);
    assert.throws(() => fs.lstatSync(cible), /ENOENT/);
    const resultat = await prepareReprise({ day: jour, target: cible, runGit: espion });
    assert.strictEqual(resultat.day, jour);
    assert.strictEqual(resultat.branch, branche);
    assert.strictEqual(resultat.branch, brancheAttendue(jour));
    assert.ok(path.isAbsolute(resultat.directory));
    assert.strictEqual(resultat.directory, absolue);
    assert.strictEqual(espion.appels.length, 1);
    const appel = espion.appels[0];
    assert.deepStrictEqual(appel.args, ['clone', '--single-branch', '--branch', branche, '--', SOURCE_DEFAUT, absolue]);
    assert.strictEqual(appel.cwd, parentAbsolu);
    assert.ok(!appel.args.includes('reset'));
    assert.ok(!appel.args.includes('clean'));
    assert.ok(!appel.args.includes('checkout'));
    assert.ok(fs.lstatSync(parentAbsolu).isDirectory());
    assert.throws(() => fs.lstatSync(absolue), /ENOENT/);
  }
});

test('prepareReprise : échec git propagé en français sans suppression', async () => {
  const base = creerDossierEphemere('reprise-echec-');
  const temoin = path.join(base, 'temoin-precieux.txt');
  fs.writeFileSync(temoin, 'à conserver', 'utf8');
  const cible = path.join(base, 'nouveau-parent', `copie-manquee-${process.pid}-${Date.now()}`);
  const absolue = path.resolve(cible);
  const parentAbsolu = path.dirname(absolue);
  const espion = creerEspionEchec();
  let erreur = null;
  try {
    await prepareReprise({ day: 2, target: cible, source: path.join(base, 'repetition-fictive'), runGit: espion });
  } catch (e) {
    erreur = e;
  }
  assert.ok(erreur instanceof Error);
  assert.match(erreur.message, MESSAGE_FR);
  assert.strictEqual(espion.appels.length, 1);
  assert.strictEqual(fs.readFileSync(temoin, 'utf8'), 'à conserver');
  assert.ok(fs.lstatSync(base).isDirectory());
  assert.ok(fs.lstatSync(parentAbsolu).isDirectory());
});

test('prepareReprise : mode injection sans exigence .git', async () => {
  const base = creerDossierEphemere('reprise-injection-');
  const cible = cibleInexistante(base, 'cas-injection');
  const absolue = path.resolve(cible);
  let vueAuMomentAppel = 'inconnu';
  const appels = [];
  async function espion(args, options) {
    appels[appels.length] = { args: [...args], cwd: options?.cwd };
    try {
      fs.lstatSync(absolue);
      vueAuMomentAppel = 'existe';
    } catch {
      vueAuMomentAppel = 'absente';
    }
    return { stdout: 'ok espion' };
  }
  const resultat = await prepareReprise({ day: 3, target: cible, source: '/tmp/repetition-locale', runGit: espion });
  assert.strictEqual(resultat.day, 3);
  assert.strictEqual(resultat.branch, 'reprise/j3');
  assert.strictEqual(resultat.directory, absolue);
  assert.ok(path.isAbsolute(resultat.directory));
  assert.strictEqual(appels.length, 1);
  assert.deepStrictEqual(appels[0].args, ['clone', '--single-branch', '--branch', 'reprise/j3', '--', '/tmp/repetition-locale', absolue]);
  assert.strictEqual(vueAuMomentAppel, 'absente');
  assert.throws(() => fs.lstatSync(absolue), /ENOENT/);
});

test('prepareReprise : intégration clone réel d’un dépôt local de répétition', async () => {
  const parentSource = creerDossierEphemere('reprise-src-');
  const sourceDir = path.join(parentSource, 'depot');
  fs.mkdirSync(sourceDir, { recursive: true });
  gitLocal(['init'], sourceDir);
  gitLocal(['config', 'user.name', 'Fixture'], sourceDir);
  gitLocal(['config', 'user.email', 'fixture@example.invalid'], sourceDir);
  const contenu = 'contenu de répétition pour essai';
  fs.writeFileSync(path.join(sourceDir, 'note.txt'), contenu, 'utf8');
  gitLocal(['add', 'note.txt'], sourceDir);
  gitLocal(['-c', 'commit.gpgsign=false', 'commit', '-m', 'ajout note'], sourceDir);
  gitLocal(['branch', 'reprise/j2'], sourceDir);
  const revAvant = gitLocal(['rev-parse', 'HEAD'], sourceDir).trim();
  const contenuAvant = fs.readFileSync(path.join(sourceDir, 'note.txt'), 'utf8');
  const parentDest = creerDossierEphemere('reprise-dest-');
  const dest = path.join(parentDest, 'copie-essai');
  assert.throws(() => fs.lstatSync(dest), /ENOENT/);
  const resultat = await prepareReprise({ day: 2, target: dest, source: sourceDir });
  assert.strictEqual(resultat.day, 2);
  assert.strictEqual(resultat.branch, 'reprise/j2');
  assert.strictEqual(resultat.directory, path.resolve(dest));
  assert.ok(path.isAbsolute(resultat.directory));
  assert.strictEqual(fs.readFileSync(path.join(dest, 'note.txt'), 'utf8'), contenuAvant);
  const revApres = gitLocal(['rev-parse', 'HEAD'], sourceDir).trim();
  assert.strictEqual(revApres, revAvant);
  assert.strictEqual(fs.readFileSync(path.join(sourceDir, 'note.txt'), 'utf8'), contenuAvant);
  assert.ok(sourceDir.startsWith(os.tmpdir()));
  assert.ok(dest.startsWith(os.tmpdir()));
  assert.ok(fs.lstatSync(sourceDir).isDirectory());
  assert.ok(fs.lstatSync(dest).isDirectory());

  // La CLI change le cwd de Git : une source relative doit rester relative
  // au dossier depuis lequel l'étudiant lance la commande.
  const deuxiemeDest = path.join(parentDest, 'copie-cli');
  const script = path.resolve(import.meta.dirname, '../scripts/prepare-reprise.js');
  const sortieCLI = execFileSync(process.execPath, [script, '--day', '2', '--source', 'depot', '--target', deuxiemeDest], {
    cwd: parentSource, encoding: 'utf8'
  });
  assert.strictEqual(fs.readFileSync(path.join(deuxiemeDest, 'note.txt'), 'utf8'), contenuAvant);
  assert.ok(sortieCLI.includes(path.join(deuxiemeDest, 'atelier')), 'la commande affichée entre dans atelier');
});
