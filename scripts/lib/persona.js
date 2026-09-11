export function validatePersona(persona, templatePersona) {
  const errors = [];
  const segmenter = new Intl.Segmenter("fr", { granularity: "grapheme" });
  const count = (s) => [...segmenter.segment(s)].length;
  const p = persona && typeof persona === "object" ? persona : {};
  const t =
    templatePersona && typeof templatePersona === "object"
      ? templatePersona
      : null;
  if (typeof p.name !== "string" || p.name.trim() === "") {
    errors.push({
      field: "name",
      message: "Le nom est requis et doit être une chaîne non vide.",
    });
  } else {
    const n = p.name.trim();
    const l = count(n);
    if (l < 2 || l > 20)
      errors.push({
        field: "name",
        message: "Le nom doit contenir entre 2 et 20 caractères.",
      });
  }
  if (typeof p.avatar !== "string" || p.avatar === "") {
    errors.push({
      field: "avatar",
      message: "L'avatar est requis et doit être un emoji unique.",
    });
  } else {
    let ok = false;
    try {
      ok = /^\p{RGI_Emoji}$/v.test(p.avatar) && count(p.avatar) === 1;
    } catch {
      ok = false;
    }
    if (!ok)
      errors.push({
        field: "avatar",
        message: "L'avatar doit être un seul emoji sans espace autour.",
      });
  }
  if (typeof p.systemPrompt !== "string" || p.systemPrompt.trim() === "") {
    errors.push({
      field: "systemPrompt",
      message: "Le prompt système est requis.",
    });
  } else if (count(p.systemPrompt.trim()) < 80) {
    errors.push({
      field: "systemPrompt",
      message: "Le prompt système doit contenir au moins 80 caractères.",
    });
  }
  if (typeof p.welcomeMessage !== "string" || p.welcomeMessage.trim() === "") {
    errors.push({
      field: "welcomeMessage",
      message: "Le message de bienvenue est requis.",
    });
  } else if (
    typeof p.name === "string" &&
    p.name.trim() !== "" &&
    !p.welcomeMessage.includes(p.name.trim())
  ) {
    errors.push({
      field: "welcomeMessage",
      message: "Le message de bienvenue doit contenir le nom.",
    });
  }
  if (
    t &&
    p.name === t.name &&
    p.avatar === t.avatar &&
    p.systemPrompt === t.systemPrompt &&
    p.welcomeMessage === t.welcomeMessage
  ) {
    errors.push({
      field: "persona",
      message: "La persona doit être différente du gabarit.",
    });
  }
  return errors;
}
