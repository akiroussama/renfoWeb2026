import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCheckpointPlan, parseCheckpointBranch } from "./lib/checkpoints.js";
import { ensureRuntime } from "./lib/runtime.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

export function parseRunArgs(args = []) {
  const result = { branch: null, author: null };
  for (const arg of args) {
    if (typeof arg !== "string") throw new Error("Argument invalide.");
    if (arg.startsWith("--branch=")) result.branch = arg.slice(9);
    else if (arg.startsWith("--author=")) result.author = arg.slice(9);
    else throw new Error(`Argument inconnu : ${arg}`);
  }
  if (!result.branch || !result.author) throw new Error("--branch et --author sont requis.");
  return result;
}

async function defaultExec(file, args, options) {
  return spawnSync(file, args, options);
}

export async function runCheckpoint({ branch, author, rootDir = REPO, studentDir, exec = defaultExec } = {}) {
  const target = parseCheckpointBranch(branch, author);
  const root = path.resolve(rootDir);
  const directory = studentDir ? path.resolve(studentDir) : path.join(root, "students", target.login);
  const plan = buildCheckpointPlan(root, target.level);
  const calls = [{
    file: process.execPath,
    args: [path.join(root, "scripts", "test-personas.js"), `--student=${target.login}`],
  }];
  for (const step of plan.slice(1)) {
    calls.push({
      file: process.execPath,
      args: ["--test", "--test-reporter=spec", ...step.files],
    });
  }
  let failed = false;
  for (const call of calls) {
    const result = await exec(call.file, call.args, {
      cwd: root,
      stdio: "inherit",
      timeout: 120000,
      env: { ...process.env, STUDENT_LOGIN: target.login, STUDENT_DIR: directory },
    });
    if ((result?.status ?? 1) !== 0) failed = true;
  }
  if (failed) throw new Error(`Le contrôle cumulatif CP0 à CP${target.level} a échoué.`);
  return { login: target.login, level: target.level };
}

async function main() {
  ensureRuntime();
  try {
    const args = parseRunArgs(process.argv.slice(2));
    await runCheckpoint(args);
  } catch (error) {
    console.error(error?.message || String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
