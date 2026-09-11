# renfoWeb2026 — CP0 Mise en piste

Kit natif : HTML, CSS, JS en modules, Node 24, zéro dépendance.

Objectif : créer votre persona, ouvrir une PR, faire relire, merger, voir la grille Pages.

`votre-login` = votre login GitHub exact. Remplacez-le partout. Exemple : `marie-dupont`.

## 1 — Cloner

```bash
git clone https://github.com/akiroussama/renfoWeb2026.git
cd renfoWeb2026
```

## 2 — Créer sa branche

```bash
git checkout -b cp0/votre-login
```

Ne poussez jamais directement sur `main`.

## 3 — Copier le modèle

Copiez `template/` vers `students/votre-login/`. Les commandes créent les dossiers parents.

Bash (Linux / macOS / Git Bash) :

```bash
mkdir -p students/votre-login
cp -r template/* students/votre-login/
```

PowerShell (Windows) :

```powershell
New-Item -ItemType Directory -Force -Path students/votre-login
Copy-Item -Path template/* -Destination students/votre-login/ -Recurse -Force
```

Attendu : `students/votre-login/persona.js` existe.

## 4 — Tester, personnaliser, pousser

Sans étudiant, `npm test` est vert. Après copie, le modèle vide fait échouer le test : c'est voulu.

```bash
npm test -- --student=votre-login
```

Éditez `students/votre-login/persona.js` (gardez `export default`) :

- `name` : 2 à 20 caractères perçus ;
- `avatar` : un seul emoji, y compris s'il est composé ;
- `systemPrompt` : 80 caractères minimum, hors espaces aux extrémités ;
- `welcomeMessage` : doit contenir `name`.

Le persona complété doit être différent du modèle vide.

Jusqu'au vert local, puis :

```bash
git add students/votre-login
git commit -m "cp0(votre-login): ajoute persona"
git push -u origin cp0/votre-login
```

Ne modifiez que votre dossier. `tests/`, `template/` et le cœur du site sont réservés.

## 5 — Ouvrir la PR vers `main`

Poussez puis ouvrez la PR `cp0/votre-login` -> `main` sur GitHub.

Checklist :

- [ ] test ciblé vert en local ;
- [ ] seul `students/votre-login/` modifié ;
- [ ] pas de `.env`, pas de clé, pas de donnée personnelle publique ;
- [ ] pas de push sur `main`.

## 6 — Relire et répondre

Relisez les pairs assignés et expliquez votre code quand on vous relit.

- Un commentaire utile est exigé pour CHAQUE approbation ;
- Répondez à tous les commentaires reçus ;
- `Changes requested` bloque le merge ;
- Tout nouveau commit exige de nouvelles approbations.

S'il manque des relecteurs, appelez l'instructeur. Ne réduisez jamais la règle des 2 approbations.

## 7 — Merger et vérifier Pages

Merge si CI verte + 2 approbations commentées + conversations résolues.

Vérifiez ensuite :

[Ouvrir la grille de départ](https://akiroussama.github.io/renfoWeb2026/)

Votre carte affiche `CP0 validé`. `CP1` affiche seulement un emplacement réservé, sans exercice.

## 8 — Règles et dépannage

Travaillez sans IA, sauf blocage bref à signaler dans la PR.

- Node 24 manquant : installez Node 24, vérifiez `node -v` (v24.x).
- Export par défaut manquant : `persona.js` doit garder `export default`.
- Mauvais dossier : utilisez `students/votre-login/persona.js`, pas `students/persona.js`.
- Échec CI : lisez le log de l'étape en échec dans `Actions`, reproduisez avec le test ciblé.
