import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const CLI = fileURLToPath(
  new URL("../scripts/test-personas.js", import.meta.url),
);
function makeRoot() {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), "cp0-"));
  fs.writeFileSync(path.join(r, "package.json"), '{"type":"module"}');
  fs.mkdirSync(path.join(r, "alice"), { recursive: true });
  return r;
}
function fixture(js) {
  const r = makeRoot();
  fs.writeFileSync(path.join(r, "alice", "persona.js"), js);
  return r;
}
function run(root) {
  return spawnSync(process.execPath, [CLI, "--student=alice"], {
    env: { ...process.env, CP0_STUDENTS_ROOT: root },
    encoding: "utf8",
    timeout: 10000,
  });
}
function out(r) {
  return `${r.stdout || ""}\n${r.stderr || ""}`;
}
test("syntaxe invalide et export manquant échouent avec le login", () => {
  for (const js of ["export default { broken(((", "export const x=1;"]) {
    const r = run(fixture(js));
    assert.notEqual(r.status, 0);
    assert.match(out(r).toLowerCase(), /alice/);
  }
});
test("une boucle infinie échoue avant le délai du parent", () => {
  const r = run(fixture("while(true){}"));
  assert.notEqual(r.status, 0);
  assert.equal(r.error, undefined);
  assert.match(out(r).toLowerCase(), /délai|timeout/);
});
test("un persona lié symboliquement est refusé", (testContext) => {
  const r0 = makeRoot();
  const t = path.join(r0, "real.js");
  fs.writeFileSync(
    t,
    `export default {name:'Nova',avatar:'🤖',systemPrompt:'x'.repeat(80),welcomeMessage:'Bonjour Nova'};`,
  );
  const l = path.join(r0, "alice", "persona.js");
  try {
    fs.symlinkSync(t, l, "file");
  } catch (e) {
    if (e?.code === "EPERM" && process.platform === "win32")
      return testContext.skip(
        "Création de lien symbolique non autorisée sur Windows",
      );
    throw e;
  }
  const r = run(r0);
  assert.notEqual(r.status, 0);
  assert.match(out(r).toLowerCase(), /symbolique|lien/);
});
