import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateScope } from "../scripts/lib/scope.js";

const ALICE = "alice";
const OWNER = "akiroussama";
const f = (filename, status = "modified", previous_filename) =>
  previous_filename
    ? { filename, status, previous_filename }
    : { filename, status };

describe("evaluateScope - portee", () => {
  it("accepte fichiers valides du dossier eleve", () => {
    const r = evaluateScope({
      author: ALICE,
      files: [f("students/alice/exo.md"), f("students/alice/a.png", "added")],
    });
    assert.equal(r.allowed, true);
    assert.deepEqual(r.violations, []);
  });
  it("accepte renommage interne au dossier eleve", () => {
    const r = evaluateScope({
      author: ALICE,
      files: [f("students/alice/b.md", "renamed", "students/alice/a.md")],
    });
    assert.equal(r.allowed, true);
    assert.deepEqual(r.violations, []);
  });
  it("refuse chemin hors perimetre, prefixe frere et casse", () => {
    for (const filename of [
      "students/bob/exo.md",
      "students/alice2/exo.md",
      "students/Alice/exo.md",
      "docs/exo.md",
    ]) {
      const r = evaluateScope({ author: ALICE, files: [f(filename)] });
      assert.equal(r.allowed, false);
      assert.ok(
        r.violations.length > 0 &&
          r.violations.every((v) => typeof v === "string"),
      );
    }
  });
  it("refuse renommage entrant et sortant du perimetre", () => {
    const entrant = evaluateScope({
      author: ALICE,
      files: [f("students/alice/b.md", "renamed", "docs/a.md")],
    });
    const sortant = evaluateScope({
      author: ALICE,
      files: [f("docs/b.md", "renamed", "students/alice/a.md")],
    });
    assert.equal(entrant.allowed, false);
    assert.equal(sortant.allowed, false);
    assert.ok(entrant.violations.length > 0 && sortant.violations.length > 0);
  });
  it("autorise le proprietaire sur chemins ordinaires du kit", () => {
    const r = evaluateScope({
      author: OWNER,
      owner: OWNER,
      files: [f("docs/guide.md"), f("scripts/outil.js")],
    });
    assert.equal(r.allowed, true);
    assert.deepEqual(r.violations, []);
  });
  it("interdit chemins prives meme au proprietaire", () => {
    for (const filename of [
      ".env",
      ".env.local",
      "prep/notes.md",
      "prompt_astra.md",
      "synthese-preparation.md",
      "CLAUDE.md",
      "decisions-module.md",
      "cp0-mise-en-piste.md",
    ]) {
      for (const author of [ALICE, OWNER]) {
        const r = evaluateScope({ author, owner: OWNER, files: [f(filename)] });
        assert.equal(r.allowed, false);
      }
    }
  });
  it("refuse traversee, antislash et chemin absolu factices", () => {
    for (const filename of [
      "students/alice/../bob/x.md",
      "students\\alice\\x.md",
      "/students/alice/x.md",
      "",
      "students/alice/",
    ]) {
      const r = evaluateScope({ author: ALICE, files: [f(filename)] });
      assert.equal(r.allowed, false);
    }
  });
  it("echoue ferme sur fichiers vides et entrees malformees", () => {
    assert.equal(evaluateScope({ author: ALICE, files: [] }).allowed, false);
    assert.equal(
      evaluateScope({ author: "", files: [f("students/alice/a.md")] }).allowed,
      false,
    );
    assert.equal(
      evaluateScope({ author: ALICE, files: "oops" }).allowed,
      false,
    );
    assert.equal(evaluateScope({}).allowed, false);
    assert.equal(evaluateScope({ author: ALICE }).allowed, false);
  });
});
