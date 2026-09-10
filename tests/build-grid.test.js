import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(here, "../scripts/build-grid.js");
function base() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "cp0-"));
  return d;
}
function run(s, o) {
  return spawnSync(process.execPath, [cli], {
    env: { ...process.env, CP0_STUDENTS_ROOT: s, CP0_SITE_DIR: o },
    timeout: 15000,
    encoding: "utf8",
  });
}
function valide(s) {
  fs.mkdirSync(path.join(s, "alice"), { recursive: true });
  fs.writeFileSync(
    path.join(s, "package.json"),
    JSON.stringify({ type: "module" }),
  );
  fs.writeFileSync(
    path.join(s, "alice", "persona.js"),
    'export default { name: "Nova", avatar: "🤖", systemPrompt: "s".repeat(80), welcomeMessage: "Bonjour Nova" };',
  );
}
test("racine vide : build reussit et publie index.html, styles.css, cp1.html", () => {
  const b = base();
  const s = path.join(b, "students");
  const o = path.join(b, "site");
  fs.mkdirSync(s, { recursive: true });
  const r = run(s, o);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(o, "index.html")));
  assert.ok(fs.existsSync(path.join(o, "styles.css")));
  assert.ok(fs.existsSync(path.join(o, "cp1.html")));
});
test("etudiante valide : index affiche Nova et CP0 valide, cp1 placeholder, systemPrompt jamais rendu", () => {
  const b = base();
  const s = path.join(b, "students");
  const o = path.join(b, "site");
  fs.mkdirSync(s, { recursive: true });
  valide(s);
  const r = run(s, o);
  assert.equal(r.status, 0, r.stderr);
  const index = fs.readFileSync(path.join(o, "index.html"), "utf8");
  assert.ok(index.includes("Nova"));
  assert.ok(index.includes("CP0 validé"));
  const cp1 = fs.readFileSync(path.join(o, "cp1.html"), "utf8");
  assert.ok(cp1.length > 0);
  assert.ok(!index.includes("s".repeat(80)));
  assert.ok(!cp1.includes("s".repeat(80)));
});
test("persona vide invalide : build echoue sans index.html dans outdir initialement vide", () => {
  const b = base();
  const s = path.join(b, "students");
  const o = path.join(b, "site");
  fs.mkdirSync(path.join(s, "alice"), { recursive: true });
  fs.mkdirSync(o, { recursive: true });
  fs.writeFileSync(
    path.join(s, "package.json"),
    JSON.stringify({ type: "module" }),
  );
  fs.writeFileSync(path.join(s, "alice", "persona.js"), "export default {};");
  const r = run(s, o);
  assert.notEqual(r.status, 0);
  assert.ok(!fs.existsSync(path.join(o, "index.html")));
});
