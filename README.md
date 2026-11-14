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

## Structure

- `js/data.js` — championnats, clubs, noms, bureaux, objectifs
- `js/game.js` — règles et simulation
- `js/ui.js` — interface
