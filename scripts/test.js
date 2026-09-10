import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const CLI = path.join(HERE, "test-personas.js");
const args = process.argv.slice(2);
if (args.length) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    stdio: "inherit",
    cwd: REPO,
  });
  process.exit(r.status ?? 1);
}
let files = [];
try {
  files = fs
    .readdirSync(path.join(REPO, "tests"))
    .filter((f) => f.endsWith(".test.js"))
    .sort()
    .map((f) => path.join(REPO, "tests", f));
} catch {
  console.error("Tests introuvables");
  process.exit(1);
}
if (!files.length) {
  console.error("Aucun test trouvé");
  process.exit(1);
}
let code = 0;
{
  const a = spawnSync(process.execPath, ["--test", ...files], {
    stdio: "inherit",
    cwd: REPO,
  });
  if ((a.status ?? 1) !== 0) code = 1;
}
const b = spawnSync(process.execPath, [CLI], { stdio: "inherit", cwd: REPO });
if ((b.status ?? 1) !== 0) code = 1;
process.exit(code);
