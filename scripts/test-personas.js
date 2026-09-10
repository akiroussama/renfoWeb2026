import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const DEF = path.join(REPO, "students");
const ROOT = process.env.CP0_STUDENTS_ROOT || DEF;
const WORKER = path.join(HERE, "read-persona.js");
const RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const ok = (s) => RE.test(s) && !s.includes("--");
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
const ENV = (() => {
  const K = [
    "PATH",
    "PATHEXT",
    "SYSTEMROOT",
    "SYSTEMDRIVE",
    "WINDIR",
    "COMSPEC",
    "TEMP",
    "TMP",
    "TMPDIR",
    "HOME",
    "USER",
    "LANG",
    "LC_ALL",
    "TZ",
    "OS",
  ];
  const e = {};
  for (const k of K) if (process.env[k] !== undefined) e[k] = process.env[k];
  return e;
})();
function runWorker(login, dir, file) {
  const flags = [
    "--permission",
    `--allow-fs-read=${HERE}`,
    `--allow-fs-read=${path.join(REPO, "template")}`,
    `--allow-fs-read=${path.join(REPO, "package.json")}`,
    `--allow-fs-read=${dir}`,
  ];
  if (ROOT !== DEF)
    flags.push(`--allow-fs-read=${path.join(ROOT, "package.json")}`);
  const r = spawnSync(process.execPath, [...flags, WORKER, file], {
    timeout: 3000,
    maxBuffer: 1024 * 1024,
    encoding: "utf8",
    env: ENV,
  });
  if (r.error) {
    console.error(`Échec ${login} : délai dépassé (${r.error.message})`);
    return 1;
  }
  let j = null;
  try {
    j = JSON.parse(r.stdout);
  } catch {
    console.error(`Échec ${login} : sortie illisible`);
    return 1;
  }
  if (
    !j ||
    typeof j !== "object" ||
    !Array.isArray(j.errors) ||
    !j.errors.every(
      (e) =>
        e &&
        typeof e === "object" &&
        typeof e.field === "string" &&
        typeof e.message === "string",
    )
  ) {
    console.error(`Échec ${login} : résultat illisible`);
    return 1;
  }
  if (r.status !== 0 || j.errors.length) {
    console.error(`Échec ${login} : persona invalide`);
    for (const e of j.errors)
      console.error(`- ${login} ${e.field} : ${e.message}`);
    return 1;
  }
  if (
    !j.persona ||
    typeof j.persona !== "object" ||
    typeof j.persona.name !== "string" ||
    typeof j.persona.avatar !== "string" ||
    typeof j.persona.welcomeMessage !== "string"
  ) {
    console.error(`Échec ${login} : résultat illisible`);
    return 1;
  }
  console.log(`OK ${login} : ${j.persona.name} ${j.persona.avatar}`);
  return 0;
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
    console.error(`Échec ${login} : dossier étudiant introuvable`);
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
