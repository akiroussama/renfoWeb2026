import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(REPO, "scripts", "test-personas.js");
function run(source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cp0-cli-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ type: "module" }));
  fs.mkdirSync(path.join(root, "alice"));
  fs.writeFileSync(path.join(root, "alice", "persona.js"), source);
  return spawnSync(process.execPath, [CLI, "--student=alice"], {
    cwd: REPO,
    env: { ...process.env, CP0_STUDENTS_ROOT: root },
    encoding: "utf8",
    timeout: 10000,
  });
}
function output(r) {
  return `${r.stdout || ""}\n${r.stderr || ""}`;
}
test("la commande étudiante exécute la spec d’acceptation", () => {
  const r = run("export default {name:'Nova',avatar:'🧭',systemPrompt:'x'.repeat(80),welcomeMessage:'Bonjour Nova'};");
  assert.equal(r.status, 0, output(r));
  assert.match(output(r), /acceptation CP0/);
});
test("la spec affiche la valeur actuelle d’un nom trop court", () => {
  const r = run("export default {name:'A',avatar:'🧭',systemPrompt:'x'.repeat(80),welcomeMessage:'Bonjour A'};");
  assert.notEqual(r.status, 0);
  assert.match(output(r), /Ton nom fait 1 caractère/);
});
test("un prompt de 40k passe par le chargeur et stdin", () => {
  const r = run("export default {name:'Nova',avatar:'🧭',systemPrompt:'x'.repeat(40000),welcomeMessage:'Bonjour Nova'};");
  assert.equal(r.status, 0, output(r));
});
