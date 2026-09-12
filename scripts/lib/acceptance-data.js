import fs from "node:fs";
import assert from "node:assert";

const EXEMPLE = "npm test -- --student=<login>";

function messageAide(prefixe) {
  return `${prefixe} : utilise la commande étudiante qui envoie {"persona":{...}, "template":{...}} en JSON sur stdin (${EXEMPLE}).`;
}

function lireJson() {
  let brut = "";
  try {
    brut = fs.readFileSync(0, "utf8");
  } catch {
    throw new Error(messageAide("Entrée illisible sur stdin"));
  }
  if (!brut || brut.trim() === "") {
    throw new Error(messageAide("Entrée JSON vide sur stdin"));
  }
  try {
    return JSON.parse(brut);
  } catch {
    throw new Error(messageAide("Entrée JSON invalide"));
  }
}

const donnees = lireJson();

if (
  !donnees ||
  typeof donnees !== "object" ||
  !donnees.persona ||
  typeof donnees.persona !== "object"
) {
  throw new Error(
    messageAide(
      'Objet JSON incomplet : il faut {"persona":{...}, "template":{...}}',
    ),
  );
}

export const persona = donnees.persona;
export const template = donnees.template ?? null;

export function texte(v) {
  return typeof v === "string" ? v : "";
}

const segmenteur = new Intl.Segmenter("fr", { granularity: "grapheme" });

export function caracteres(v) {
  const s = typeof v === "string" ? v : "";
  return [...segmenteur.segment(s)].length;
}

export function estEmoji(v) {
  if (typeof v !== "string") return false;
  try {
    return /^\p{RGI_Emoji}$/v.test(v);
  } catch {
    return false;
  }
}

export function verifier(condition, message) {
  if (!condition) {
    process.stderr.write(String(message) + "\n");
  }
  assert.ok(condition, message);
}
