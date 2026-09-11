import { pathToFileURL } from "node:url";
import { validatePersona } from "./lib/persona.js";
import * as T from "../template/persona.js";
const f = process.argv[2];
const forAcceptance = process.argv.slice(3).includes("--acceptance-data");
try {
  const m = await import(pathToFileURL(f).href);
  const d = m.default;
  if (!d || typeof d !== "object" || Array.isArray(d)) {
    console.log(
      JSON.stringify({
        errors: [
          {
            field: "persona",
            message:
              "persona.js doit exporter ta persona avec `export default { … }`",
          },
        ],
      }),
    );
    process.exit(1);
  }
  const tpl = T.default;
  const errs = forAcceptance ? [] : validatePersona(d, tpl);
  const pub = forAcceptance
    ? {
        name: d.name,
        avatar: d.avatar,
        systemPrompt: d.systemPrompt,
        welcomeMessage: d.welcomeMessage,
      }
    : { name: d.name, avatar: d.avatar, welcomeMessage: d.welcomeMessage };
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
