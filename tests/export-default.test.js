import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const CLI = fileURLToPath(
  new URL("../scripts/test-personas.js", import.meta.url),
);
function fixture(code) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cp0-"));
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ type: "module" }),
  );
  fs.mkdirSync(path.join(dir, "alice"));
  fs.writeFileSync(path.join(dir, "alice", "persona.js"), code);
  return dir;
}
function run(dir) {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [CLI, "--student=alice"],
      {
        cwd: dir,
        env: { ...process.env, CP0_STUDENTS_ROOT: dir },
        timeout: 10000,
      },
      (error, stdout, stderr) => {
        resolve({
          status: error?.code ?? 0,
          output: String(stdout) + String(stderr),
        });
      },
    );
  });
}
function compte(out) {
  return out.split("export default").length - 1;
}
async function attendErreurExport(code) {
  const { status, output: out } = await run(fixture(code));
  assert.equal(status, 1, out);
  assert.equal(compte(out), 1, out);
  assert.ok(!out.includes("Le nom"), out);
  assert.ok(!out.includes("prompt système"), out);
}
test("export manquant rejeté avec aide", async () => {
  await attendErreurExport("export const x = 1;");
});
test("export null rejeté avec aide", async () => {
  await attendErreurExport("export default null;");
});
test("export tableau rejeté avec aide", async () => {
  await attendErreurExport("export default [];");
});
test("export chaîne rejeté avec aide", async () => {
  await attendErreurExport('export default "bonjour";');
});
test("export nombre rejeté avec aide", async () => {
  await attendErreurExport("export default 42;");
});
test("export fonction rejeté avec aide", async () => {
  await attendErreurExport("export default function () {};");
});
test("objet valide accepté sans aide export", async () => {
  const { status, output: out } = await run(
    fixture(
      'export default { name: "Ada", avatar: "🌙", systemPrompt: "x".repeat(80), welcomeMessage: "Bonjour Ada" };',
    ),
  );
  assert.equal(status, 0, out);
  assert.equal(compte(out), 0, out);
});
