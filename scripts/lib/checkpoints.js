import fs from "node:fs";
import path from "node:path";

const LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

function requireLevel(level) {
  if (!Number.isInteger(level) || level < 0 || level > 7) {
    throw new Error("Checkpoint invalide : entier de 0 à 7 requis.");
  }
}

export function parseCheckpointBranch(branch, author) {
  if (typeof branch !== "string" || typeof author !== "string") {
    throw new Error("Branche et auteur requis.");
  }
  const match = /^cp([0-7])\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)$/.exec(branch);
  if (!match || !LOGIN_RE.test(author)) {
    throw new Error("Branche attendue : cpN/<login>, avec N de 0 à 7.");
  }
  const login = match[2];
  if (login.toLowerCase() !== author.toLowerCase()) {
    throw new Error(`Le login de la branche (${login}) diffère de l'auteur (${author}).`);
  }
  return { level: Number(match[1]), login };
}

function requireDirectory(directory, label) {
  let stat;
  try {
    stat = fs.lstatSync(directory);
  } catch {
    throw new Error(`${label} absent.`);
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`${label} invalide.`);
  }
}

export function buildCheckpointPlan(rootDir, targetLevel) {
  requireLevel(targetLevel);
  const root = path.resolve(rootDir);
  const plan = [{ level: 0, kind: "persona", file: path.join(root, "scripts", "test-personas.js") }];
  for (let level = 1; level <= targetLevel; level += 1) {
    const testsDir = path.join(root, "checkpoints", `cp${level}`, "tests");
    requireDirectory(testsDir, `Suite CP${level}`);
    const files = fs.readdirSync(testsDir).sort().filter((name) => name.endsWith(".test.js"));
    if (!files.length) throw new Error(`Suite CP${level} vide.`);
    const verified = files.map((name) => {
      const file = path.join(testsDir, name);
      const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink() || !stat.isFile()) {
        throw new Error(`Fichier de test CP${level} invalide : ${name}.`);
      }
      const resolved = path.resolve(file);
      if (!resolved.startsWith(root + path.sep)) {
        throw new Error(`Fichier de test CP${level} hors du dépôt.`);
      }
      return resolved;
    });
    plan.push({ level, kind: "suite", files: verified });
  }
  return plan;
}

export async function readProgression(rootDir, login) {
  if (!LOGIN_RE.test(login)) throw new Error("Login invalide.");
  const file = path.join(path.resolve(rootDir), "students", login, "progression.json");
  let text;
  try {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("progression.json invalide.");
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("progression.json n'est pas un JSON valide.");
  }
  requireLevel(data?.checkpoint);
  return data.checkpoint;
}

export async function resolveEffectiveCheckpoint({ fileValue, validated = [], personaValid = false } = {}) {
  const levels = [...new Set(validated)].sort((a, b) => a - b);
  for (let index = 0; index < levels.length; index += 1) {
    if (levels[index] !== index) throw new Error("Les checkpoints validés ne sont pas contigus.");
  }
  if (fileValue === null || fileValue === undefined) {
    if (personaValid && levels.includes(0)) return 0;
    return null;
  }
  requireLevel(fileValue);
  for (let level = 0; level <= fileValue; level += 1) {
    if (!levels.includes(level)) throw new Error(`CP${level} n'est pas validé.`);
  }
  return fileValue;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderProgressGrid({ login, effectiveCheckpoint, validatedLevels = [], nextTarget } = {}) {
  requireLevel(effectiveCheckpoint);
  const valid = new Set(validatedLevels);
  if (!valid.has(effectiveCheckpoint)) throw new Error(`CP${effectiveCheckpoint} non validé.`);
  let next = "";
  if (Number.isInteger(nextTarget) && nextTarget === effectiveCheckpoint + 1 && nextTarget <= 7) {
    next = `<a href="cp${nextTarget}.html">Voir le prochain checkpoint CP${nextTarget}</a>`;
  }
  return `<div class="progression" data-login="${escapeHtml(login)}"><p>CP${effectiveCheckpoint} validé</p>${next}</div>`;
}
