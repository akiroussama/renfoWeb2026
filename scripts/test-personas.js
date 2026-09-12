import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import loadPersona, { isValidLogin as ok } from "./lib/student-loader.js";
import { ensureRuntime } from "./lib/runtime.js";
import * as T from "../template/persona.js";
import { spawnSync } from "node:child_process";
const HERE = path.dirname(fileURLToPath(import.meta.url));
ensureRuntime();
const REPO = path.resolve(HERE, "..");
const DEF = path.join(REPO, "students");
const ROOT = process.env.CP0_STUDENTS_ROOT || DEF;
let tgt = null;
for (const a of process.argv.slice(2)) {
  if (a.startsWith("--student=")) {
    const v = a.slice(10);
    if (tgt !== null || !ok(v)) {
      console.error(`Argument invalide : ${a}`);
      process.exit(1);
    }
    tgt = v;
  } else {
    console.error(`Option inconnue : ${a}`);
    process.exit(1);
  }
}
function runWorker(login, dir, file) {
  let res = null;
  try {
    res = loadPersona(login, dir, file, { forAcceptance: true });
  } catch (e) {
    console.error(
      e && e.message ? e.message : `Échec ${login} : résultat illisible`,
    );
    return 1;
  }
  if (!res || res.errors.length) {
    console.error(`Échec ${login} : persona invalide`);
    if (res && Array.isArray(res.errors))
      for (const e of res.errors)
        console.error(`- ${login} ${e.field} : ${e.message}`);
    return 1;
  }
  if (!res.persona || typeof res.persona !== "object") {
    console.error(`Échec ${login} : résultat illisible`);
    return 1;
  }
  const spec = path.join(REPO, "tests", "cp0-acceptation.spec.js");
  const run = spawnSync(
    process.execPath,
    ["--test", "--test-reporter=spec", "--test-isolation=none", spec],
    {
      input: JSON.stringify({ persona: res.persona, template: T.default }),
      encoding: "utf8",
      stdio: ["pipe", "inherit", "inherit"],
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    },
  );
  if (run.error) {
    console.error(`Échec ${login} : test d’acceptation interrompu`);
    return 1;
  }
  return run.status === 0 ? 0 : 1;
}
function nofollow(p) {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
}
function one(login) {
  const dir = path.join(ROOT, login);
  const st = nofollow(dir);
  if (!st) {
    console.error(
      `Échec ${login} : dossier étudiant introuvable (attendu : students/${login}/)`,
    );
    return 1;
  }
  if (st.isSymbolicLink()) {
    console.error(`Échec ${login} : dossier lien symbolique refusé`);
    return 1;
  }
  if (!st.isDirectory()) {
    console.error(`Échec ${login} : dossier étudiant invalide`);
    return 1;
  }
  const f = path.join(dir, "persona.js");
  const fp = nofollow(f);
  if (!fp) {
    console.error(`Échec ${login} : persona.js manquant`);
    return 1;
  }
  if (fp.isSymbolicLink()) {
    console.error(`Échec ${login} : persona.js lien symbolique refusé`);
    return 1;
  }
  if (!fp.isFile()) {
    console.error(`Échec ${login} : persona.js non régulier`);
    return 1;
  }
  return runWorker(login, dir, path.resolve(f));
}
if (tgt) process.exit(one(tgt));
let entries = null;
try {
  const s = fs.statSync(ROOT);
  if (!s.isDirectory()) {
    console.error("Échec : racine étudiants invalide");
    process.exit(1);
  }
  entries = fs.readdirSync(ROOT);
} catch (e) {
  if (e && e.code === "ENOENT") {
    console.log(
      "Aucun dossier students : initialisez votre persona pour commencer.",
    );
    process.exit(0);
  }
  console.error("Échec : racine étudiants illisible");
  process.exit(1);
}
entries.sort();
const dirs = [];
for (const e of entries) {
  const st = nofollow(path.join(ROOT, e));
  if (!st) continue;
  if (st.isSymbolicLink()) {
    console.error(`Échec ${e} : dossier lien symbolique refusé`);
    process.exit(1);
  }
  if (!st.isDirectory()) continue;
  if (!ok(e)) {
    console.error(`Échec ${e} : login invalide`);
    process.exit(1);
  }
  dirs.push(e);
}
if (!dirs.length) {
  console.log(
    "Aucun étudiant trouvé : ajoutez un dossier dans students pour commencer.",
  );
  process.exit(0);
}
let code = 0;
for (const d of dirs) if (one(d)) code = 1;
if (code) console.error("Validation échouée.");
else console.log("Toutes les personas sont valides.");
process.exit(code);
