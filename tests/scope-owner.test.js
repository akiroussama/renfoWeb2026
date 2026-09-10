import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateScope } from "../scripts/lib/scope.js";

test("Oussama est exempt du périmètre étudiant, y compris entre dossiers", () => {
  const result = evaluateScope({
    author: "akiroussama",
    files: [
      { filename: "students/alice/persona.js", status: "modified" },
      {
        filename: "students/bob/a.js",
        status: "renamed",
        previous_filename: "students/alice/a.js",
      },
    ],
  });
  assert.equal(result.allowed, true);
});

test("l'exemption ne permet pas un fichier privé", () => {
  const result = evaluateScope({
    author: "akiroussama",
    files: [{ filename: "students/alice/.env", status: "added" }],
  });
  assert.equal(result.allowed, false);
});
