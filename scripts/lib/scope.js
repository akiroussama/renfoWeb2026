export function evaluateScope(input = {}) {
  const DEFAULT_OWNER = "akiroussama";
  const violations = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { allowed: false, violations: ["entrée invalide : objet attendu"] };
  }
  const { author, owner = DEFAULT_OWNER, files } = input;
  const loginRe = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  const isLogin = (v) => typeof v === "string" && loginRe.test(v);
  if (!isLogin(author)) violations.push("auteur invalide ou manquant");
  const isOwner =
    isLogin(author) &&
    isLogin(owner) &&
    author.toLowerCase() === owner.toLowerCase();
  if (!Array.isArray(files) || files.length === 0) {
    violations.push("liste de fichiers vide ou invalide");
    return { allowed: false, violations };
  }
  const prefix = isLogin(author) ? `students/${author}/` : null;
  const estMalforme = (p) => {
    if (typeof p !== "string" || p.length === 0) return true;
    if (p[0] === "/") return true;
    for (let i = 0; i < p.length; i++) {
      if (p.charCodeAt(i) === 92) return true;
    }
    if (
      p.length > 2 &&
      p[1] === ":" &&
      (p[2] === "/" || p.charCodeAt(2) === 92)
    )
      return true;
    const parts = p.split("/");
    for (const seg of parts) {
      if (seg === "" || seg === "." || seg === "..") return true;
    }
    return false;
  };
  const estPrive = (p) => {
    const segs = p.split("/").map((s) => s.toLowerCase());
    for (const s of segs) {
      if (s.startsWith(".env")) return true;
    }
    return false;
  };
  files.forEach((rec, idx) => {
    if (
      !rec ||
      typeof rec !== "object" ||
      Array.isArray(rec) ||
      typeof rec.filename !== "string"
    ) {
      violations.push(`fichier #${idx} invalide : enregistrement malformé`);
      return;
    }
    const chemins = [rec.filename];
    if (rec.status === "renamed") {
      if (
        typeof rec.previous_filename !== "string" ||
        rec.previous_filename.length === 0
      ) {
        violations.push(`renommage sans chemin précédent : ${rec.filename}`);
      } else {
        chemins.push(rec.previous_filename);
      }
    } else if (rec.previous_filename !== undefined) {
      if (
        typeof rec.previous_filename !== "string" ||
        rec.previous_filename.length === 0
      ) {
        violations.push(`chemin précédent malformé : ${rec.filename}`);
      } else {
        chemins.push(rec.previous_filename);
      }
    }
    for (const p of chemins) {
      if (estMalforme(p)) {
        violations.push(
          `chemin malformé interdit : ${p === "" ? "(vide)" : p}`,
        );
        continue;
      }
      if (estPrive(p)) {
        violations.push(`chemin privé interdit : ${p}`);
        continue;
      }
      if (prefix && p.startsWith(prefix) && p.length > prefix.length) continue;
      if (isOwner) continue;
      violations.push(
        `fichier hors périmètre : ${p} (attendu : students/${author}/)`,
      );
    }
  });
  return { allowed: violations.length === 0, violations };
}
