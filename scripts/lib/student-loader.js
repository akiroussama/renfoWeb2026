import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const LIB = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.resolve(LIB, "..");
const REPO = path.resolve(SCRIPTS, "..");
const DEF = path.join(REPO, "students");
const WORKER = path.join(SCRIPTS, "read-persona.js");
const RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export function isValidLogin(s) {
  return typeof s === "string" && RE.test(s) && !s.includes("--");
}

function minEnv() {
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
}

function syntaxDiagnostic(login, stderr) {
  const lines = String(stderr || "").split(/\r?\n/);
  let lineNo = null;
  let src = "";
  let msg = "";
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/:(\d+)(?::\d+)?\s*$/);
    if (m && lineNo === null) {
      lineNo = m[1];
      if (lines[i + 1] !== undefined) src = lines[i + 1].trim();
    }
    const s = lines[i].match(/SyntaxError:\s*(.*)/);
    if (s && !msg) msg = s[1].trim();
  }
  const rel = `students/${login}/persona.js`;
  if (lineNo)
    return `Échec ${login} : ${rel} ligne ${lineNo} : ${msg || "erreur de syntaxe"}\n${src}`;
  return `Échec ${login} : ${rel} erreur de syntaxe${msg ? ` : ${msg}` : ""}`;
}
function checkSyntax(login, file) {
  const c = spawnSync(process.execPath, ["--check", file], {
    timeout: 3000,
    maxBuffer: 1024 * 1024,
    encoding: "utf8",
    env: minEnv(),
  });
  if (c.error)
    throw new Error(`Échec ${login} : délai dépassé (${c.error.message})`);
  if (c.status === 0) return;
  throw new Error(syntaxDiagnostic(login, c.stderr));
}
export default function loadPersona(login, dir, file) {
  checkSyntax(login, file);
  const ROOT = process.env.CP0_STUDENTS_ROOT || DEF;
  const flags = [
    "--permission",
    `--allow-fs-read=${SCRIPTS}`,
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
    env: minEnv(),
  });
  if (r.error)
    throw new Error(`Échec ${login} : délai dépassé (${r.error.message})`);
  let j = null;
  try {
    j = JSON.parse(r.stdout);
  } catch {
    throw new Error(`Échec ${login} : sortie illisible`);
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
    throw new Error(`Échec ${login} : résultat illisible`);
  }
  if (r.status !== 0 || j.errors.length)
    return { errors: j.errors, persona: null };
  if (
    !j.persona ||
    typeof j.persona !== "object" ||
    typeof j.persona.name !== "string" ||
    typeof j.persona.avatar !== "string" ||
    typeof j.persona.welcomeMessage !== "string"
  ) {
    throw new Error(`Échec ${login} : résultat illisible`);
  }
  return { errors: [], persona: j.persona };
}
