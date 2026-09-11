import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import loadPersona from "../scripts/lib/student-loader.js";

describe("chargeur en mode acceptance", () => {
  let racine, dossier, fichier, ancienne, avaitCle;
  before(() => {
    avaitCle = Object.prototype.hasOwnProperty.call(process.env, "CP0_STUDENTS_ROOT");
    ancienne = process.env.CP0_STUDENTS_ROOT;
    racine = fs.mkdtempSync(path.join(os.tmpdir(), "cp0-acceptance-"));
    dossier = path.join(racine, "alice");
    fs.mkdirSync(dossier, { recursive: true });
    fs.writeFileSync(path.join(racine, "package.json"), JSON.stringify({ type: "module" }));
    fichier = path.join(dossier, "persona.js");
    process.env.CP0_STUDENTS_ROOT = racine;
  });
  after(() => {
    if (avaitCle) process.env.CP0_STUDENTS_ROOT = ancienne;
    else delete process.env.CP0_STUDENTS_ROOT;
  });
  it("persona valide : le défaut masque le prompt et acceptance retourne le prompt de 40k", () => {
    const prompt = "Bonjour ".repeat(5000);
    const valide = { name: "Alice", avatar: "🦊", systemPrompt: prompt, welcomeMessage: "Bonjour, je suis Alice !" };
    fs.writeFileSync(fichier, `export default ${JSON.stringify(valide)};`);
    const defaut = loadPersona("alice", dossier, fichier);
    assert.equal(defaut.errors.length, 0);
    assert.ok(!( "systemPrompt" in defaut.persona));
    assert.deepEqual(Object.keys(defaut.persona).sort(), ["avatar", "name", "welcomeMessage"]);
    const acceptance = loadPersona("alice", dossier, fichier, { forAcceptance: true });
    assert.equal(acceptance.errors.length, 0);
    assert.equal(acceptance.persona.systemPrompt.length, 40000);
    assert.equal(acceptance.persona.systemPrompt, prompt);
  });
  it("nom d’un seul caractère : le défaut signale l’erreur mais acceptance retourne la donnée brute", () => {
    const invalide = { name: "A", avatar: "🦊", systemPrompt: "Bonjour ".repeat(100), welcomeMessage: "Bonjour !" };
    fs.writeFileSync(fichier, `export default ${JSON.stringify(invalide)};`);
    const defaut = loadPersona("alice", dossier, fichier);
    assert.ok(defaut.errors.length > 0);
    assert.equal(defaut.persona, null);
    const acceptance = loadPersona("alice", dossier, fichier, { forAcceptance: true });
    assert.equal(acceptance.errors.length, 0);
    assert.equal(acceptance.persona.name, "A");
  });
  it("export défaut manquant : les deux modes échouent", () => {
    fs.writeFileSync(fichier, "export const rien = 1;");
    assert.ok(loadPersona("alice", dossier, fichier).errors.length > 0);
    assert.ok(loadPersona("alice", dossier, fichier, { forAcceptance: true }).errors.length > 0);
  });
  it("export défaut non objet : les deux modes échouent", () => {
    fs.writeFileSync(fichier, 'export default "oops";');
    assert.ok(loadPersona("alice", dossier, fichier).errors.length > 0);
    assert.ok(loadPersona("alice", dossier, fichier, { forAcceptance: true }).errors.length > 0);
  });
});
