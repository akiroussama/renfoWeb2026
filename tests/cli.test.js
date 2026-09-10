import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
const CLI = process.cwd() + "/scripts/test-personas.js";
const VALID = `export default {name:'Nova',avatar:'🤖',systemPrompt:'x'.repeat(80),welcomeMessage:'Bonjour Nova'};`;
const INVALID = `export default {name:'',avatar:'',systemPrompt:'',welcomeMessage:''};`;
function makeRoot(files = {}) {
  const r = fs.mkdtempSync(os.tmpdir() + "/cp0-");
  fs.writeFileSync(r + "/package.json", '{"type":"module"}');
  for (const [login, code] of Object.entries(files)) {
    fs.mkdirSync(r + "/" + login, { recursive: true });
    if (code !== null) fs.writeFileSync(r + "/" + login + "/persona.js", code);
  }
  return r;
}
function run(rootDir, args = []) {
  return spawnSync(process.execPath, [CLI, ...args], {
    timeout: 10000,
    encoding: "utf8",
    env: { ...process.env, CP0_STUDENTS_ROOT: rootDir },
  });
}
function out(res) {
  return (res.stdout || "") + (res.stderr || "");
}
test("racine vide ou manquante réussit", () => {
  const r = makeRoot();
  assert.equal(run(r).status, 0);
  assert.equal(run(r + "/introuvable").status, 0);
});
test("persona valide réussit", () => {
  assert.equal(run(makeRoot({ alice: VALID })).status, 0);
});
test("persona invalide avec quatre champs vides échoue", () => {
  assert.notEqual(run(makeRoot({ alice: INVALID })).status, 0);
});
test("ciblage valide réussit même si un autre étudiant invalide fait échouer tout", () => {
  const r = makeRoot({ alice: VALID, bob: INVALID });
  assert.equal(run(r, ["--student=alice"]).status, 0);
  assert.notEqual(run(r).status, 0);
});
test("dossier demandé manquant et dossier sans persona échouent avec login dans la sortie", () => {
  const r1 = makeRoot({ alice: VALID });
  const m1 = run(r1, ["--student=bob"]);
  assert.notEqual(m1.status, 0);
  assert.match(out(m1), /bob/);
  const r2 = makeRoot({ alice: null });
  const m2 = run(r2, ["--student=alice"]);
  assert.notEqual(m2.status, 0);
  assert.match(out(m2), /alice/);
});
test("option --student=../escape dangereuse et option inconnue échouent", () => {
  const r = makeRoot({ alice: VALID });
  assert.notEqual(run(r, ["--student=../escape"]).status, 0);
  assert.notEqual(run(r, ["--inconnu"]).status, 0);
});
