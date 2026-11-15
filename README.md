# Agent Foot ⚽

Jeu de gestion : vous dirigez une agence de joueurs belge. Vous dénichez de jeunes talents
dans les clubs belges, vous les faites grandir et vous les placez dans les 5 grands
championnats européens (Premier League, La Liga, Serie A, Bundesliga, Ligue 1).

## Jouer

Ouvrez `index.html` dans un navigateur (aucune installation, aucun build).
La partie est sauvegardée automatiquement dans le navigateur.

## Principe

- Chaque semaine, vous disposez de quelques **actions** : observer un joueur, lui proposer
  un mandat, le proposer à un club, renégocier son salaire, discuter avec lui.
- Vous touchez **7 %** du salaire de vos clients et **10 %** des indemnités de transfert.
- Les transferts ne sont possibles que pendant le **mercato** (semaines 1–6 et 20–23).
- Un jeune qui ne joue pas progresse moins vite : choisissez bien ses clubs.
- Agrandissez le bureau pour gérer plus de clients, puis recruter à l'étranger.
- **Prêtez** un jeune qui ne joue pas dans un club plus modeste jusqu'à la fin de la saison.
- Des **événements** vous demandent de trancher (agent rival, presse, mal du pays...).
- Grimpez au **classement des agences** face à 8 concurrents.
- Chaque semaine, **tous les championnats jouent** : classements et résultats dans l'onglet Compét.,
  matchs, buts, passes décisives et notes de vos joueurs sur leur fiche.

- Chaque joueur a un **caractère** (travailleur, ambitieux, loyal, leader, fêtard, fragile).
- **Prolongations** de contrat, **récompenses** de fin de saison, sélections nationales.
- **Montées et descentes** entre les trois divisions belges ; le prestige des clubs évolue.

- **Coupes d'Europe** (Ligue des champions et Ligue Europa) et **classement des buteurs**.

- **Joueurs libres** en fin de contrat (prime à la signature), **enchères**, **voyages de détection**,
  **rêves de carrière**, courbe de valeur, historique de l'agence et **export/import de la sauvegarde**.

- **Agences rivales** qui signent les pépites du marché, **sponsoring**, **Ballon d'Or**,
  **3 niveaux de difficulté** et **compte rendu de match** (buteurs, minutes, passeurs).

- **Cérémonie des trophées** télévisée à chaque fin de saison : révélation de l'agence, Golden Boy,
  Soulier d'or, Ballon d'Or, transfert et agent de l'année, avec enveloppes, confettis et fanfare.
- **Coupe du monde / Euro** une saison sur deux, **missions de saison**, **plans d'entraînement**,
  **abonnés** (popularité), **personnel à 3 niveaux**, **négociation à paliers**, **panthéon** et sons.

- **Relations avec les clubs**, **académie de jeunes**, **23 succès** à débloquer, **graphiques** de l'agence,
  **recherche** de joueurs, **matchs à revivre en direct**, nouveaux événements et **logo/couleur** de l'agence.

- **Commission négociable** (5, 7 ou 10 %), **Coupe de Belgique**, **investissements** (campagne, gala, partenariats de clubs),
  **tournoi des espoirs**, **jour de clôture du mercato**, **records de l'agence**, attributs des joueurs et pages de clubs.

- **Thème clair / sombre / auto**, **3 emplacements de sauvegarde**, **clubs recommandés** pour chaque transfert,
  bouton **« jusqu'au mercato »**, **paliers de l'agence**, forme récente des joueurs, bonnes affaires et vibrations.

## Installer l'application

Le jeu est une application web installable (PWA). Ouvrez le site sur le téléphone puis :

- Android (Chrome) : menu ⋮ → « Installer l'application » ;
- iPhone (Safari) : Partager → « Sur l'écran d'accueil ».

L'appli récupère la dernière version à chaque ouverture et reste jouable hors ligne.

## Structure

- `js/data.js` — championnats, clubs, noms, bureaux, objectifs
- `js/game.js` — règles et simulation
- `js/season.js` — cérémonie, tournois internationaux, missions, panthéon
- `js/extra.js` — relations avec les clubs, académie, succès
- `js/ui.js` — interface
- `sw.js`, `manifest.webmanifest`, `icons/` — application installable
