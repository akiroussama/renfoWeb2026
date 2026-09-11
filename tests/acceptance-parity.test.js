import { describe, it } from "node:test";
import assert from "node:assert";
import { spawnSync } from "node:child_process";
import fs from "node:fs";

import { validatePersona } from "../scripts/lib/persona.js";

const GABARIT_VIDE = {
  name: "",
  avatar: "",
  systemPrompt: "",
  welcomeMessage: "",
};

function lancerSpec(persona, template) {
  const entree = JSON.stringify({ persona, template });
  // node --test --test-reporter=spec --test-isolation=none tests/cp0-acceptation.spec.js
  const res = spawnSync(
    process.execPath,
    [
      "--test",
      "--test-reporter=spec",
      "--test-isolation=none",
      "tests/cp0-acceptation.spec.js",
    ],
    { input: entree, encoding: "utf8", timeout: 10000, maxBuffer: 512000 },
  );
  const stdout = typeof res.stdout === "string" ? res.stdout : "";
  const stderr = typeof res.stderr === "string" ? res.stderr : "";
  const combine = (stdout + "\n" + stderr).slice(0, 20000);
  return { status: res.status, stdout, stderr, combine };
}

function verifierParite(persona, template) {
  const erreurs = validatePersona(persona, template);
  const res = lancerSpec(persona, template);
  const succesSpec = res.status === 0;
  const succesRef = erreurs.length === 0;
  assert.strictEqual(
    succesSpec,
    succesRef,
    "parité " +
      res.status +
      " " +
      JSON.stringify(erreurs) +
      " " +
      res.combine.slice(0, 2000),
  );
  return res;
}

function base(surcharge = {}) {
  return {
    name: "Nova",
    avatar: "🧭",
    systemPrompt: "x".repeat(80),
    welcomeMessage: "Bonjour Nova",
    ...surcharge,
  };
}

describe("parité acceptation", () => {
  it("témoin valide passe", () => {
    verifierParite(base(), GABARIT_VIDE);
  });
  it("nom 1 caractère échoue", () => {
    const p = base({ name: "A", welcomeMessage: "Bonjour A" });
    assert.ok(validatePersona(p, GABARIT_VIDE).length > 0);
    verifierParite(p, GABARIT_VIDE);
  });
  it("nom 2 caractères passe", () => {
    verifierParite(
      base({ name: "Al", welcomeMessage: "Bonjour Al" }),
      GABARIT_VIDE,
    );
  });
  it("nom 20 caractères passe", () => {
    const nom20 = "A".repeat(20);
    verifierParite(
      base({ name: nom20, welcomeMessage: "Bonjour " + nom20 }),
      GABARIT_VIDE,
    );
  });
  it("nom 21 caractères échoue", () => {
    const nom21 = "B".repeat(21);
    verifierParite(
      base({ name: nom21, welcomeMessage: "Bonjour " + nom21 }),
      GABARIT_VIDE,
    );
  });
  it("prompt 79 échoue et 80 passe", () => {
    verifierParite(base({ systemPrompt: "x".repeat(79) }), GABARIT_VIDE);
    verifierParite(base({ systemPrompt: "x".repeat(80) }), GABARIT_VIDE);
  });
  it("avatar ZWJ passe", () => {
    verifierParite(base({ avatar: "👩‍💻" }), GABARIT_VIDE);
  });
  it("deux emojis échouent", () => {
    verifierParite(base({ avatar: "😀😀" }), GABARIT_VIDE);
  });
  it("accueil sans nom échoue", () => {
    verifierParite(base({ welcomeMessage: "Bonjour !" }), GABARIT_VIDE);
  });
  it("gabarit vide passe et identique échoue", () => {
    verifierParite(base(), {});
    verifierParite(base(), GABARIT_VIDE);
    const p = base();
    verifierParite(p, { ...p });
  });
  it("champ non chaîne échoue", () => {
    verifierParite(base({ name: 123 }), GABARIT_VIDE);
    verifierParite(base({ avatar: 123 }), GABARIT_VIDE);
    verifierParite(base({ systemPrompt: null }), GABARIT_VIDE);
    verifierParite(base({ welcomeMessage: [] }), GABARIT_VIDE);
  });
  it("nom e accent combinant 20 passe", () => {
    const nom = "e\u0301".repeat(20);
    verifierParite(
      base({ name: nom, welcomeMessage: "Bonjour " + nom }),
      GABARIT_VIDE,
    );
  });
  it("spec fait 40 lignes ou moins", () => {
    const contenu = fs.readFileSync("tests/cp0-acceptation.spec.js", "utf8");
    const lignes = contenu.split("\n");
    const nb = contenu.endsWith("\n") ? lignes.length - 1 : lignes.length;
    assert.ok(nb <= 40, "spec a " + nb + " lignes");
  });
  it("nom 1 signale Ton nom fait 1 caractère", () => {
    const p = base({ name: "A", welcomeMessage: "Bonjour A" });
    const res = lancerSpec(p, GABARIT_VIDE);
    assert.notStrictEqual(res.status, 0);
    assert.ok(
      res.combine.includes("Ton nom fait 1 caractère"),
      "manque message " + res.combine.slice(0, 2000),
    );
  });
  it("messages sans graphème", () => {
    const p = base({ name: "A", welcomeMessage: "Bonjour A" });
    const res = lancerSpec(p, GABARIT_VIDE);
    assert.ok(
      !res.combine.toLowerCase().includes("graphème") &&
        !res.combine.toLowerCase().includes("grapheme"),
    );
    const spec = fs.readFileSync("tests/cp0-acceptation.spec.js", "utf8");
    assert.ok(
      !spec.includes("graphème") && !spec.toLowerCase().includes("grapheme"),
    );
  });
});
