// scripts/prepare-reprise.js
// Outil public générique de reprise de formation.
// Pédagogie en français : code simple et lisible pour apprendre.
// Exemple depuis la racine du dépôt :
//   node scripts/prepare-reprise.js --day 2 --target ../renfo-j2
// Cet outil ne touche jamais au travail de la veille.
// Il ne fait aucun reset, clean, suppression ou écrasement.

import fs from 'node:fs/promises';
import { resolve, dirname, join, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const SOURCE_DEFAUT = 'https://github.com/akiroussama/renfoWeb2026.git';
const execFileAsync = promisify(execFile);

function branchePourJour(jour) {
  if (jour === 1) return 'atelier/j1-depart';
  return `reprise/j${jour}`;
}

function contientUserinfo(source) {
  // Refuse les URL avec identifiants pour éviter les secrets dans l’URL.
  // Exemple refusé : https://utilisateur:motdepasse@hote/depot.git
  if (typeof source !== 'string') return false;
  const marqueur = '://';
  const pos = source.indexOf(marqueur);
  if (pos === -1) return false;
  const apres = source.slice(pos + marqueur.length);
  const avantSlash = apres.split('/')[0];
  return avantSlash.includes('@');
}

function validerCible(target) {
  if (typeof target !== 'string' || target.trim() === '') {
    throw new Error('cible obligatoire : option --target manquante ou vide');
  }
  if (/[\x00-\x1F\x7F]/.test(target)) {
    throw new Error('cible invalide : saut de ligne ou caractère de contrôle interdit dans --target');
  }
}

function validerSource(source) {
  if (typeof source !== 'string' || source.trim() === '') {
    throw new Error('source invalide : option --source vide ou manquante');
  }
  if (source.trim().startsWith('-')) {
    throw new Error('source invalide : option --source ne doit pas commencer par un tiret');
  }
  if (/[\x00-\x1F\x7F]/.test(source)) {
    throw new Error('source invalide : saut de ligne ou caractère de contrôle interdit dans --source');
  }
  if (contientUserinfo(source)) {
    throw new Error('source invalide : URL avec identifiants interdite dans --source (userinfo à éviter)');
  }
}

export function parseArgs(argv) {
  if (!Array.isArray(argv)) {
    throw new Error('option invalide : liste d’arguments attendue (aide : --help pour utilisation)');
  }
  if (argv.includes('--help')) {
    return { help: true };
  }
  const autorisees = new Set(['--day', '--target', '--source']);
  const vues = new Set();
  const valeurs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const cle = argv[i];
    if (!autorisees.has(cle)) {
      throw new Error(`option inconnue : ${String(cle)} (aide : voir --help pour utilisation)`);
    }
    if (vues.has(cle)) {
      throw new Error(`option répétée : ${cle} ne doit être fournie qu’une fois`);
    }
    vues.add(cle);
    const valeur = argv[i + 1];
    if (valeur === undefined) {
      throw new Error(`option ${cle} manquante : valeur obligatoire manquante (aide : --help)`);
    }
    valeurs[cle] = valeur;
    i += 1;
  }
  if (!('--day' in valeurs)) {
    throw new Error('option --day manquante : jour obligatoire 1..4 (aide : --help)');
  }
  if (!('--target' in valeurs)) {
    throw new Error('option --target manquante : cible obligatoire (aide : --help)');
  }
  const texteJour = String(valeurs['--day']).trim();
  if (!/^[1-4]$/.test(texteJour)) {
    throw new Error(`jour invalide : option --day attend un entier 1..4 (reçu ${texteJour})`);
  }
  const day = Number(texteJour);
  const target = valeurs['--target'];
  validerCible(target);
  if ('--source' in valeurs) {
    validerSource(valeurs['--source']);
    return { day, target, source: valeurs['--source'] };
  }
  return { day, target };
}

async function runGitParDefaut(args, options) {
  // Clone sans shell, arguments passés en tableau.
  const { stdout } = await execFileAsync('git', args, { cwd: options?.cwd });
  return { stdout };
}

export async function prepareReprise(options = {}) {
  const day = options?.day;
  const target = options?.target;
  let source = options?.source;
  let runGit = options?.runGit;
  if (source === undefined) {
    source = SOURCE_DEFAUT;
  }
  if (runGit === undefined) {
    runGit = runGitParDefaut;
  }
  // Validation complète avant toute mutation.
  if (typeof day !== 'number' || !Number.isInteger(day) || day < 1 || day > 4) {
    throw new Error(`jour invalide : option --day attend un entier 1..4 (reçu ${String(day)})`);
  }
  validerCible(target);
  validerSource(source);
  // Un chemin local est résolu avant de lancer Git depuis le dossier cible.
  const sourceDistante = /^[a-z][a-z\d+.-]*:\/\//i.test(source) || /^[^/\\]+@[^/\\]+:/.test(source);
  if (!isAbsolute(source) && !sourceDistante) source = resolve(source);
  if (typeof runGit !== 'function') {
    throw new Error('option invalide : runGit doit être une fonction');
  }
  const cibleAbs = resolve(target);
  // La cible doit être obligatoirement inexistante, y compris lien symbolique mort.
  try {
    await fs.lstat(cibleAbs);
    throw new Error(`cible déjà existante : le dossier ${cibleAbs} existe déjà, choisissez une autre cible pour ne pas écraser le travail de la veille`);
  } catch (erreur) {
    if (erreur && typeof erreur.message === 'string' && erreur.message.startsWith('cible déjà existante')) {
      throw erreur;
    }
    if (!erreur || erreur.code !== 'ENOENT') {
      if (erreur && erreur.code) {
        throw new Error(`cible invalide : dossier parent inaccessible pour ${cibleAbs} (${erreur.code})`);
      }
      throw erreur;
    }
    // ENOENT : cible libre, on continue.
  }
  const parentAbs = dirname(cibleAbs);
  // Seule création permise : les dossiers parents.
  await fs.mkdir(parentAbs, { recursive: true });
  const branche = branchePourJour(day);
  const argsGit = ['clone', '--single-branch', '--branch', branche, '--', source, cibleAbs];
  try {
    await runGit(argsGit, { cwd: parentAbs });
  } catch (erreur) {
    throw new Error(`échec du clone de la branche ${branche} : référence non encore diffusée ou accès à vérifier (source ${source})`, { cause: erreur });
  }
  return { day, branch: branche, directory: cibleAbs };
}

async function wrapperCLI() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (erreur) {
    console.error(`Erreur : ${erreur.message}`);
    console.error('Utilisation : node scripts/prepare-reprise.js --day 1..4 --target <dossier> [--source <url-ou-chemin>]');
    process.exitCode = 1;
    return;
  }
  if (opts.help) {
    console.log('Prépare la reprise de formation (outil générique).');
    console.log('');
    console.log('Utilisation :');
    console.log('  node scripts/prepare-reprise.js --day 1..4 --target <dossier> [--source <url-ou-chemin>]');
    console.log('');
    console.log('Options :');
    console.log('  --day 1..4 : jour obligatoire (1 atelier/j1-depart, 2 reprise/j2, 3 reprise/j3, 4 reprise/j4)');
    console.log('  --target <dossier> : cible obligatoire, doit être inexistante pour ne pas écraser la veille');
    console.log('  --source <url-ou-chemin> : source git optionnelle');
    console.log('  --help : affiche cette aide');
    console.log('');
    console.log('Les références sont publiées par le formateur au début du jour.');
    return;
  }
  try {
    const resultat = await prepareReprise({ day: opts.day, target: opts.target, source: opts.source });
    console.log(`Reprise prête : ${resultat.directory}`);
    console.log(`Branche : ${resultat.branch}`);
    console.log('Lancez ensuite manuellement :');
    console.log(`  cd "${join(resultat.directory, 'atelier')}"`);
    console.log('  npm start');
  } catch (erreur) {
    console.error(`Erreur : ${erreur.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  wrapperCLI();
}
