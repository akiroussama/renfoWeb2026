# Reprises de formation

Cet outil public prépare une base de reprise pour un jour de formation.

Les références sont publiées par le formateur au début du jour. Git ne cache pas les branches : inutile de chercher avant publication.

Si la référence n’est pas disponible, ne pas la contourner et ne pas écraser le travail de la veille. Attendre la diffusion.

Depuis la racine du dépôt :

```shell
node scripts/prepare-reprise.js --day 2 --target ../renfo-j2
```

Le code de référence arrive sous `atelier`. Ensuite, depuis le nouveau dossier :

```shell
cd ../renfo-j2/atelier
npm start
```

Dans un autre terminal, depuis `atelier`, lancer `npm test`.

Pour une répétition hors ligne, `--source ./jour-2.bundle` accepte le bundle fourni par le formateur. Le chemin est relatif au dossier où la commande est lancée. L'outil ne lance pas automatiquement le code cloné.

Chaque étudiant conserve son projet de la veille et choisit s’il reprend la base fournie ou continue son code.

Ce lot ne contient aucun énoncé ni correction des journées suivantes.
