import { pathToFileURL } from "node:url";
import { validatePersona } from "./lib/persona.js";
import * as T from "../template/persona.js";
const f = process.argv[2];
try {
  const m = await import(pathToFileURL(f).href);
  const d = m.default;
  const tpl = T.default;
  const errs = validatePersona(d, tpl);
  const pub =
    d && typeof d === "object"
      ? { name: d.name, avatar: d.avatar, welcomeMessage: d.welcomeMessage }
      : {};
  console.log(JSON.stringify({ errors: errs, persona: pub }));
  process.exit(errs && errs.length ? 1 : 0);
} catch (e) {
  console.log(
    JSON.stringify({
      errors: [
        {
          field: "persona",
          message: `Erreur de lecture : ${e && e.message ? e.message : e}`,
        },
      ],
    }),
  );
  process.exit(1);
}
