import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePersona } from "../scripts/lib/persona.js";
import template from "../template/persona.js";
const base = () => ({
  name: "Nova",
  avatar: "🤖",
  systemPrompt: "x".repeat(80),
  welcomeMessage: "Bonjour Nova",
});
const errs = (v) => validatePersona(v);
test("nom valide : 2 et 20 caractères acceptés", () => {
  assert.deepStrictEqual(
    errs({ ...base(), name: "Al", welcomeMessage: "Bonjour Al" }),
    [],
  );
  assert.deepStrictEqual(
    errs({
      ...base(),
      name: "A".repeat(20),
      welcomeMessage: `Bonjour ${"A".repeat(20)}`,
    }),
    [],
  );
});
test("nom invalide : 1 et 21 caractères refusés", () => {
  for (const n of ["A", "A".repeat(21)]) {
    const e = errs({ ...base(), name: n, welcomeMessage: `Bonjour ${n}` });
    assert.ok(e.some((x) => x.field === "name" && x.message));
  }
});
test("nom décomposé e\u0301 compte les graphèmes", () => {
  assert.deepStrictEqual(
    errs({ ...base(), name: "e\u0301a", welcomeMessage: "Bonjour e\u0301a" }),
    [],
  );
  assert.ok(
    errs({
      ...base(),
      name: "e\u0301",
      welcomeMessage: "Bonjour e\u0301",
    }).some((x) => x.field === "name"),
  );
  assert.deepStrictEqual(
    errs({
      ...base(),
      name: "e\u0301".repeat(20),
      welcomeMessage: `Bonjour ${"e\u0301".repeat(20)}`,
    }),
    [],
  );
  assert.ok(
    errs({
      ...base(),
      name: "e\u0301".repeat(21),
      welcomeMessage: `Bonjour ${"e\u0301".repeat(21)}`,
    }).some((x) => x.field === "name"),
  );
});
test("prompt système : 79 refusé, 80 accepté", () => {
  assert.ok(errs({ ...base(), systemPrompt: "x".repeat(79) }).length > 0);
  assert.deepStrictEqual(errs({ ...base(), systemPrompt: "x".repeat(80) }), []);
});
test("prompt avec diacritiques et espaces rembourrés", () => {
  assert.deepStrictEqual(
    errs({ ...base(), systemPrompt: `  ${"e\u0301".repeat(80)}  ` }),
    [],
  );
  assert.ok(
    errs({ ...base(), systemPrompt: `  ${"e\u0301".repeat(79)}  ` }).length > 0,
  );
});
test("avatar avec espaces entourants rejeté", () => {
  const e = errs({ ...base(), avatar: " 🤖 " });
  assert.ok(e.length > 0 && e[0].field && e[0].message);
});
test("gabarit vide réel rejeté", () => {
  const e = errs(template);
  assert.ok(Array.isArray(e) && e.length > 0 && e[0].field && e[0].message);
});
test("entrées nulles rejetées sans lever", () => {
  for (const v of [null, undefined, []]) {
    let e;
    assert.doesNotThrow(() => {
      e = errs(v);
    });
    assert.ok(Array.isArray(e) && e.length > 0);
  }
});
