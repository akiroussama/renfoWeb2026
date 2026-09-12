# Infrastructure des checkpoints

Le runner déduit le niveau et le login d'une branche `cpN/<login>`, puis exécute cumulativement le contrôle CP0 et les suites CP1 à CPN.

Pour publier un checkpoint `cpN`, ajouter uniquement :

- `checkpoints/cpN/enonce.html` : énoncé autonome destiné à Pages ;
- `checkpoints/cpN/tests/*.test.js` : suite Node native lisant `STUDENT_LOGIN` et `STUDENT_DIR`.

Le workflow CI reste commun à tous les niveaux. Il refuse un niveau manquant, une suite vide et une branche dont le login diffère de l'auteur.

Après validation et merge d'un checkpoint, `students/<login>/progression.json` peut porter `{"checkpoint": N}`. Le build de la grille refuse les valeurs hors de 0 à 7 et les sauts de niveau ; il n'affiche un lien que si la cible suivante est publiée.

Ce dossier ne contient encore aucun énoncé futur.
