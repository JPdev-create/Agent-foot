/* Relations avec les clubs, académie de jeunes, succès */
'use strict';

/* ---------- Relations avec les clubs (0 à 100) ---------- */
const rel = (id) => (S.rel && S.rel[id]) || 0;
function addRel(id, x) {
  if (!S.rel) S.rel = {};
  S.rel[id] = clamp(rel(id) + x, 0, 100);
}
const relBoost = (id) => 1 + rel(id) / 120;
const relLabel = (v) => (v >= 60 ? 'Partenaire privilégié' : v >= 30 ? 'Bonne relation' : v >= 10 ? 'Contact établi' : '');

/* ---------- Académie de jeunes ---------- */
const ACADEMY = [
  { name: 'Aucune académie', cost: 0, weekly: 0, kids: 0 },
  { name: 'Centre de formation local', cost: 150000, weekly: 1200, kids: 1 },
  { name: 'Académie régionale', cost: 600000, weekly: 3500, kids: 2 },
  { name: 'Académie d\'élite', cost: 2500000, weekly: 9000, kids: 3 },
];
function buyAcademy() {
  const next = ACADEMY[S.acad + 1];
  if (!next) return { ok: false, msg: 'Académie au niveau maximum.' };
  if (S.office < 1) return { ok: false, msg: 'Il faut d\'abord un vrai bureau (niveau 2).' };
  if (S.cash < next.cost) return { ok: false, msg: 'Pas assez de liquidités.' };
  S.cash -= next.cost; S.acad++; addRep(1);
  news('🏫', `Votre ${next.name.toLowerCase()} ouvre ses portes : ${next.kids} jeune(s) formé(s) rejoindront l'agence chaque été.`);
  save();
  return { ok: true, msg: `${next.name} construite !` };
}
/* En début de saison, les jeunes formés rejoignent l'agence (ou le marché, en favoris, si l'agence est pleine) */
function academyIntake() {
  const lv = S.acad || 0;
  for (let i = 0; i < ACADEMY[lv].kids; i++) {
    const p = genPlayer('BE', 16, 16, 12 + lv * 6);
    p.sc = 2; setEstimate(p);
    if (clients().length < office().maxClients) {
      p.mine = true; p.mandate = 4; p.morale = 85; p.vh = [{ v: playerValue(p) }]; p.dream = newDream(p); p.tr = p.tr || 'loy';
      news('🏫', `${p.n} (16 ans, ${p.pos}, potentiel ${p.potLo}–${p.potHi}) sort de votre académie et signe son premier mandat.`);
    } else {
      p.fav = true;
      news('🏫', `${p.n} sort de votre académie, mais l'agence est pleine : il attend sur le marché (suivi ⭐).`);
    }
    S.players.push(p);
  }
}

/* ---------- Succès ---------- */
const ACH = [
  { id: 'hat', i: '🎩', l: 'Coup du chapeau', d: 'Un client marque 3 buts dans un match', t: () => S.flags.hat },
  { id: 'tr10', i: '🤝', l: 'Négociateur', d: 'Réaliser 10 transferts', t: () => S.stats.transfers >= 10 },
  { id: 'tr50', i: '🏗️', l: 'Bâtisseur', d: 'Réaliser 50 transferts', t: () => S.stats.transfers >= 50 },
  { id: 'f10', i: '💶', l: 'Gros poisson', d: 'Un transfert à 10 M€', t: () => S.stats.bestFee >= 1e7 },
  { id: 'f50', i: '💰', l: 'Coup du siècle', d: 'Un transfert à 50 M€', t: () => S.stats.bestFee >= 5e7 },
  { id: 'f100', i: '🤑', l: 'Cent millions', d: 'Un transfert à 100 M€', t: () => S.stats.bestFee >= 1e8 },
  { id: 'free', i: '🆓', l: 'Joker libre', d: 'Placer un joueur libre', t: () => S.flags.free },
  { id: 'cash1', i: '🏦', l: 'Millionnaire', d: 'Avoir 1 M€ en caisse', t: () => S.cash >= 1e6 },
  { id: 'cash10', i: '💎', l: 'Empire financier', d: 'Avoir 10 M€ en caisse', t: () => S.cash >= 1e7 },
  { id: 'cl10', i: '👥', l: 'Grande écurie', d: 'Gérer 10 clients en même temps', t: () => clients().length >= 10 },
  { id: 'intl3', i: '🌍', l: 'Fournisseur de sélections', d: '3 clients internationaux en même temps', t: () => clients().filter((p) => p.intl).length >= 3 },
  { id: 'sp5', i: '👟', l: 'Roi du marketing', d: '5 contrats de sponsoring actifs', t: () => clients().filter((p) => p.sp).length >= 5 },
  { id: 'fol1m', i: '📱', l: 'Influenceur', d: 'Un client à 1 M d\'abonnés', t: () => clients().some((p) => (p.fol || 0) >= 1e6) },
  { id: 'gem', i: '💠', l: 'Pépite rare', d: 'Signer un joueur au potentiel 88+', t: () => S.flags.gem },
  { id: 'c1', i: '🏆', l: 'Roi d\'Europe', d: 'Un client gagne la Ligue des champions', t: () => S.flags.c1 },
  { id: 'wc', i: '🌐', l: 'Champion du monde', d: 'Un client remporte la Coupe du monde ou l\'Euro', t: () => S.flags.wc },
  { id: 'bdo', i: '⭐', l: 'Ballon d\'Or', d: 'Un client remporte le Ballon d\'Or', t: () => S.flags.bdo },
  { id: 'acad', i: '🏫', l: 'Formateur', d: 'Construire une académie', t: () => S.acad >= 1 },
  { id: 'rel', i: '❤️', l: 'Ami des clubs', d: 'Devenir partenaire privilégié d\'un club', t: () => Object.values(S.rel || {}).some((v) => v >= 60) },
  { id: 'hof5', i: '🏛️', l: 'Légendes', d: '5 joueurs au panthéon', t: () => (S.hof || []).length >= 5 },
  { id: 'n1', i: '👑', l: 'Numéro un', d: 'Être l\'agence n°1', t: () => agencyRank() === 1 },
  { id: 'rep100', i: '💯', l: 'Légende des agents', d: 'Atteindre 100 de réputation', t: () => S.rep >= 99.5 },
  { id: 's10', i: '📅', l: 'Fidèle au poste', d: 'Jouer 10 saisons', t: () => S.season >= 2036 },
];
function checkAch() {
  if (!S.ach) S.ach = {};
  ACH.forEach((a) => {
    if (S.ach[a.id] || !a.t()) return;
    S.ach[a.id] = `${S.season}/${(S.season + 1) % 100}`; addRep(0.3);
    news('🏅', `Succès débloqué : ${a.i} ${a.l} — ${a.d}.`);
  });
}
