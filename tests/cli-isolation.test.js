import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const CLI = fileURLToPath(
  new URL("../scripts/test-personas.js", import.meta.url),
);

test("un persona valide passe : contrôle positif du lanceur", () => {
  const r = run(makeRoot(`export default ${VALID};`));
  assert.equal(r.status, 0);
  assert.ok((String(r.stdout) + String(r.stderr)).length > 0);
});
const VALID = `{name:'Nova',avatar:'🤖',systemPrompt:'x'.repeat(80),welcomeMessage:'Bonjour Nova'}`;
function makeRoot(code) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cp0-"));
  fs.writeFileSync(path.join(root, "package.json"), '{"type":"module"}');
  fs.mkdirSync(path.join(root, "alice"), { recursive: true });
  fs.writeFileSync(path.join(root, "alice", "persona.js"), code);
  return root;
}
function run(root) {
  return spawnSync(process.execPath, [CLI], {
    env: { ...process.env, CP0_STUDENTS_ROOT: root },
    timeout: 10000,
    encoding: "utf8",
  });
}
test("export nommé seul est rejeté", () => {
  const r = run(makeRoot(`export const persona=${VALID};`));
  assert.notEqual(r.status, 0, `stdout:${r.stdout} stderr:${r.stderr}`);
});
test("stdout JSON puis exit 0 est rejeté", () => {
  const r = run(
    makeRoot(`console.log('{}');process.exit(0);export default ${VALID};`),
  );
  assert.notEqual(r.status, 0, `stdout:${r.stdout} stderr:${r.stderr}`);
});
test("lecture sentinel hors bac est refusée sans réessai", () => {
  const root = makeRoot(
    `import fs from 'node:fs';fs.readFileSync(new URL('../sentinel.txt',import.meta.url));export default ${VALID};`,
  );
  fs.writeFileSync(path.join(root, "sentinel.txt"), "dummy");
  const r = run(root);
  assert.notEqual(r.status, 0, `stdout:${r.stdout} stderr:${r.stderr}`);
});
test("dossier au nom invalide fait échouer le balayage", () => {
  const root = makeRoot(`export default ${VALID};`);
  fs.mkdirSync(path.join(root, "invalid_name"));
  const r = run(root);
  assert.notEqual(r.status, 0, `stdout:${r.stdout} stderr:${r.stderr}`);
});
test("racine fichier ordinaire échoue, seul inexistant amorce", () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cp0-")), "f");
  fs.writeFileSync(f, "x");
  const r = run(f);
  assert.notEqual(r.status, 0, `stdout:${r.stdout} stderr:${r.stderr}`);
});
