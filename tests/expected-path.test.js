import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { evaluateScope } from "../scripts/lib/scope.js";

describe("chemin attendu sensible à la casse", () => {
  it("refuse un chemin avec une casse différente en rappelant le chemin attendu", () => {
    const res = evaluateScope({
      author: "Marie-Dupont",
      owner: "akiroussama",
      files: [
        { filename: "students/marie-dupont/persona.js", status: "modified" },
      ],
    });
    assert.equal(res.allowed, false);
    const msg = (res.violations || []).join("\n");
    assert.ok(msg.includes("students/marie-dupont/persona.js"));
    assert.ok(msg.includes("students/Marie-Dupont/"));
  });
  it("signale le dossier attendu quand le dossier étudiant est manquant", () => {
    const script = fileURLToPath(
      new URL("../scripts/test-personas.js", import.meta.url),
    );
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cp0-"));
    const r = spawnSync(process.execPath, [script, "--student=Marie-Dupont"], {
      encoding: "utf8",
      env: { ...process.env, CP0_STUDENTS_ROOT: root },
    });
    assert.equal(r.status, 1);
    const out = (r.stdout || "") + (r.stderr || "");
    assert.ok(out.includes("students/Marie-Dupont/"));
  });
  it("conserve l’exemption du propriétaire", () => {
    const res = evaluateScope({
      author: "akiroussama",
      owner: "akiroussama",
      files: [
        { filename: "students/marie-dupont/persona.js", status: "modified" },
      ],
    });
    assert.equal(res.allowed, true);
  });
});
