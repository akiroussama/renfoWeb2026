import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import loadPersona from "../scripts/lib/student-loader.js";

describe("diagnostic de syntaxe", () => {
  it("indique le fichier, la ligne et la source sans exécuter", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cp0-syntaxe-"));
    const avatarLine = '  avatar: "🧭",';
    const source = `export default {\n  name: "Alice"\n${avatarLine}\n  welcomeMessage: "Bonjour Alice"\n};\n`;
    fs.writeFileSync(path.join(dir, "package.json"), '{"type":"module"}');
    const file = path.join(dir, "persona.js");
    fs.writeFileSync(file, source, "utf8");
    let erreur = null;
    try {
      loadPersona("alice", dir, file);
    } catch (e) {
      erreur = e;
    }
    assert.ok(erreur, "devrait échouer sur la syntaxe");
    const message = String(erreur.message);
    assert.ok(message.includes("students/alice/persona.js"));
    assert.ok(message.includes("ligne 3"));
    assert.ok(message.includes(avatarLine.trim()));
    assert.ok(message.includes("Unexpected identifier"));
  });

  it("contrôle valide : n’exécute pas et conserve l’isolation", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cp0-valide-"));
    const marker = path.join(dir, "must-not-exist.txt");
    const source = `import { writeFileSync } from "node:fs";\ntry { writeFileSync(${JSON.stringify(marker)}, "unsafe"); } catch (e) { if (e.code !== "ERR_ACCESS_DENIED") throw e; }\nif (process.env.CP0_OUTSIDE_SECRET) throw new Error("exécuté");\nexport default {\n  name: "Alice",\n  avatar: "🧭",\n  systemPrompt: "x".repeat(80),\n  welcomeMessage: "Bonjour Alice"\n};\n`;
    fs.writeFileSync(path.join(dir, "package.json"), '{"type":"module"}');
    const file = path.join(dir, "persona.js");
    fs.writeFileSync(file, source, "utf8");
    process.env.CP0_OUTSIDE_SECRET = "1";
    try {
      const resultat = loadPersona("alice", dir, file);
      assert.equal(resultat.errors.length, 0);
      assert.equal(
        fs.existsSync(marker),
        false,
        "le contrôle de syntaxe ne doit jamais exécuter le module",
      );
      assert.equal(resultat.persona.name, "Alice");
      assert.equal(resultat.persona.avatar, "🧭");
      assert.equal(resultat.persona.welcomeMessage, "Bonjour Alice");
    } finally {
      delete process.env.CP0_OUTSIDE_SECRET;
    }
  });
});
