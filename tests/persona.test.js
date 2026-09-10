import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePersona } from "../scripts/lib/persona.js";

const seg = new Intl.Segmenter("fr", { granularity: "grapheme" });
const len = (s) => [...seg.segment(s)].length;

function valide() {
  return {
    name: "Nova",
    avatar: "🤖",
    systemPrompt:
      "Tu es Nova, une guide patiente qui explique les sciences avec des exemples simples, des encouragements positifs et des questions adaptées.",
    welcomeMessage: "Salut ! Je suis Nova, ravie de te voir !",
  };
}
function gabarit() {
  return {
    name: "Atlas",
    avatar: "🦊",
    systemPrompt:
      "Tu es Atlas, un explorateur curieux qui raconte des histoires de voyages lointains avec des détails vivants, des cartes imaginaires et des amis.",
    welcomeMessage: "Bonjour ! Je suis Atlas, prêt pour partir ?",
  };
}
function champsErreurs(errs) {
  assert.ok(Array.isArray(errs));
  for (const e of errs) {
    assert.equal(typeof e.field, "string");
    assert.equal(typeof e.message, "string");
  }
  return errs.map((e) => e.field);
}

test("persona valide ne retourne aucune erreur", () => {
  assert.deepEqual(validatePersona(valide(), gabarit()), []);
});

test("nom trop court est rejeté", () => {
  const p = { ...valide(), welcomeMessage: "Salut ! Je suis A !" };
  p.name = "A";
  const f = champsErreurs(validatePersona(p, gabarit()));
  assert.ok(f.includes("name"));
});

test("nom trop long est rejeté", () => {
  const p = { ...valide(), name: "A".repeat(21) };
  assert.equal(len(p.name), 21);
  const f = champsErreurs(validatePersona(p, gabarit()));
  assert.ok(f.includes("name"));
});

test("message de bienvenue sans le nom est rejeté", () => {
  const p = { ...valide(), welcomeMessage: "Salut, bienvenue ici !" };
  const f = champsErreurs(validatePersona(p, gabarit()));
  assert.ok(f.includes("welcomeMessage"));
});

test("prompt système trop court est rejeté", () => {
  const p = { ...valide(), systemPrompt: "Trop court." };
  assert.ok(len(p.systemPrompt) < 80);
  const f = champsErreurs(validatePersona(p, gabarit()));
  assert.ok(f.includes("systemPrompt"));
});

test("avatar lettre ou deux émojis est rejeté", () => {
  for (const avatar of ["A", "😀😀"]) {
    const f = champsErreurs(
      validatePersona({ ...valide(), avatar }, gabarit()),
    );
    assert.ok(f.includes("avatar"));
  }
});

test("avatars famille drapeau teinte et keycap acceptés", () => {
  for (const avatar of ["👨‍👩‍👧‍👦", "🇫🇷", "👍🏽", "1️⃣"]) {
    assert.equal(len(avatar), 1);
    const f = champsErreurs(
      validatePersona({ ...valide(), avatar }, gabarit()),
    );
    assert.ok(!f.includes("avatar"));
  }
});

test("types malformés sont rejetés", () => {
  const f = champsErreurs(
    validatePersona(
      { name: 42, avatar: null, systemPrompt: {}, welcomeMessage: 7 },
      gabarit(),
    ),
  );
  assert.ok(f.includes("name"));
  assert.ok(f.includes("avatar"));
  assert.ok(f.includes("systemPrompt"));
  assert.ok(f.includes("welcomeMessage"));
});

test("persona identique au gabarit est rejetée", () => {
  const g = gabarit();
  const f = champsErreurs(validatePersona({ ...g }, { ...g }));
  assert.ok(f.length > 0);
});
