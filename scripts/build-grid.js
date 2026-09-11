import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import loadPersona, { isValidLogin } from "./lib/student-loader.js";
import { renderGrid, renderPlaceholder } from "./lib/grid.js";
import {
  buildCheckpointPlan,
  readProgression,
  resolveEffectiveCheckpoint,
} from "./lib/checkpoints.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const DEF_STUDENTS = path.join(REPO, "students");
const DEF_SITE = path.join(REPO, "site");
const ROOT = process.env.CP0_STUDENTS_ROOT || DEF_STUDENTS;
const OUT = process.env.CP0_SITE_DIR || DEF_SITE;

function nofollow(p) {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
}

let dirs = [];
try {
  const s = fs.statSync(ROOT);
  if (!s.isDirectory()) {
    console.error("Échec : racine étudiants invalide");
    process.exit(1);
  }
  const all = fs.readdirSync(ROOT);
  all.sort();
  for (const e of all) {
    const st = nofollow(path.join(ROOT, e));
    if (!st) continue;
    if (st.isSymbolicLink()) {
      console.error(`Échec ${e} : dossier lien symbolique refusé`);
      process.exit(1);
    }
    if (!st.isDirectory()) continue;
    if (!isValidLogin(e)) {
      console.error(`Échec ${e} : login invalide`);
      process.exit(1);
    }
    dirs.push(e);
  }
} catch (e) {
  if (e && e.code === "ENOENT") {
    dirs = [];
  } else {
    console.error("Échec : racine étudiants illisible");
    process.exit(1);
  }
}

const entries = [];
let bad = false;
for (const login of dirs) {
  const dir = path.join(ROOT, login);
  const st = nofollow(dir);
  if (!st || st.isSymbolicLink() || !st.isDirectory()) {
    console.error(`Échec ${login} : dossier étudiant invalide`);
    bad = true;
    continue;
  }
  const f = path.join(dir, "persona.js");
  const fp = nofollow(f);
  if (!fp) {
    console.error(`Échec ${login} : persona.js manquant`);
    bad = true;
    continue;
  }
  if (fp.isSymbolicLink()) {
    console.error(`Échec ${login} : persona.js lien symbolique refusé`);
    bad = true;
    continue;
  }
  if (!fp.isFile()) {
    console.error(`Échec ${login} : persona.js non régulier`);
    bad = true;
    continue;
  }
  let res = null;
  try {
    res = loadPersona(login, dir, path.resolve(f));
  } catch (err) {
    console.error(
      err && err.message ? err.message : `Échec ${login} : résultat illisible`,
    );
    bad = true;
    continue;
  }
  if (!res || res.errors.length || !res.persona) {
    console.error(`Échec ${login} : persona invalide`);
    if (res && Array.isArray(res.errors)) {
      for (const x of res.errors)
        console.error(`- ${login} ${x.field} : ${x.message}`);
    }
    bad = true;
    continue;
  }
  let checkpoint = 0;
  try {
    const fileValue = await readProgression(path.dirname(ROOT), login);
    if (fileValue !== null) buildCheckpointPlan(REPO, fileValue);
    const target = fileValue === null ? 0 : fileValue;
    const validated = Array.from({ length: target + 1 }, (_, level) => level);
    checkpoint = await resolveEffectiveCheckpoint({
      fileValue,
      validated,
      personaValid: true,
    });
  } catch (error) {
    console.error(`Échec ${login} : ${error?.message || error}`);
    bad = true;
    continue;
  }
  const nextLevel = checkpoint + 1;
  const nextSource = path.join(REPO, "checkpoints", `cp${nextLevel}`, "enonce.html");
  const nextTarget = checkpoint === 0 || nofollow(nextSource)?.isFile() ? nextLevel : undefined;
  entries.push({
    login,
    persona: res.persona,
    checkpoint,
    nextTarget,
  });
}

if (bad) {
  console.error("Validation échouée.");
  process.exit(1);
}

let htmlIndex = "";
let htmlCp1 = "";
try {
  htmlIndex = renderGrid(entries);
  htmlCp1 = renderPlaceholder();
} catch (e) {
  console.error(`Échec : rendu impossible (${e && e.message ? e.message : e})`);
  process.exit(1);
}

try {
  fs.statSync(path.join(REPO, "web", "styles.css"));
} catch {
  console.error("Échec : styles.css introuvable");
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), htmlIndex, "utf8");
const cp1Source = path.join(REPO, "checkpoints", "cp1", "enonce.html");
if (nofollow(cp1Source)?.isFile()) fs.copyFileSync(cp1Source, path.join(OUT, "cp1.html"));
else fs.writeFileSync(path.join(OUT, "cp1.html"), htmlCp1, "utf8");
for (let level = 2; level <= 7; level += 1) {
  const source = path.join(REPO, "checkpoints", `cp${level}`, "enonce.html");
  const stat = nofollow(source);
  if (stat?.isSymbolicLink()) {
    console.error(`Échec : énoncé CP${level} lié symboliquement`);
    process.exit(1);
  }
  if (stat?.isFile()) fs.copyFileSync(source, path.join(OUT, `cp${level}.html`));
}
fs.copyFileSync(
  path.join(REPO, "web", "styles.css"),
  path.join(OUT, "styles.css"),
);
console.log(`Site généré : ${entries.length} étudiant(s).`);
