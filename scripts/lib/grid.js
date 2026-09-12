import { renderProgressGrid } from "./checkpoints.js";

// Grille des checkpoints — rendu HTML sûr, sans dépendance.
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderGrid(entries) {
  const copy = Array.isArray(entries) ? [...entries] : [];
  copy.sort((a, b) => {
    const al = String(a?.login ?? "");
    const bl = String(b?.login ?? "");
    if (al < bl) return -1;
    if (al > bl) return 1;
    return 0;
  });

  let inner = "";
  if (copy.length === 0) {
    inner =
      '<section><p class="empty">Aucun étudiant pour le moment.</p></section>';
  } else {
    const cards = copy.map((entry) => {
      const login = escapeHtml(entry?.login ?? "");
      const name = escapeHtml(entry?.persona?.name ?? "");
      const avatar = escapeHtml(entry?.persona?.avatar ?? "");
      const welcome = escapeHtml(entry?.persona?.welcomeMessage ?? "");
      const checkpoint = Number.isInteger(entry?.checkpoint) ? entry.checkpoint : 0;
      const validatedLevels = Array.from({ length: checkpoint + 1 }, (_, level) => level);
      const nextTarget = entry?.nextTarget === undefined && checkpoint === 0 ? 1 : entry?.nextTarget;
      const progression = renderProgressGrid({
        login: entry?.login ?? "",
        effectiveCheckpoint: checkpoint,
        validatedLevels,
        nextTarget,
      });
      return [
        `<article data-login="${login}">`,
        `<h2>${name}</h2>`,
        `<p class="login">${login}</p>`,
        `<p class="avatar" aria-hidden="true">${avatar}</p>`,
        `<p class="welcome">${welcome}</p>`,
        progression,
        `</article>`,
      ].join("\n");
    });
    inner = `<section class="grid">\n${cards.join("\n")}\n</section>`;
  }

  return [
    `<!DOCTYPE html>`,
    `<html lang="fr">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>Mise en piste</title>`,
    `<link rel="stylesheet" href="styles.css">`,
    `</head>`,
    `<body>`,
    `<header><h1>Mise en piste</h1></header>`,
    `<main>`,
    inner,
    `</main>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

export function renderPlaceholder() {
  return [
    `<!DOCTYPE html>`,
    `<html lang="fr">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>CP1 — Bientôt disponible</title>`,
    `<link rel="stylesheet" href="styles.css">`,
    `</head>`,
    `<body>`,
    `<main>`,
    `<h1>CP1 — Bientôt disponible</h1>`,
    `<p>L’exercice CP1 n’est pas encore publié. Revenez plus tard.</p>`,
    `<a href="index.html">Retour à l’accueil</a>`,
    `</main>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}
