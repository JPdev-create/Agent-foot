/* Relations avec les clubs, académie de jeunes, succès */
'use strict';

/* ---------- Relations avec les clubs (0 à 100) ---------- */
const rel = (id) => (S.rel && S.rel[id]) || 0;
function addRel(id, x) {
  if (!S.rel) S.rel = {};
  S.rel[id] = clamp(rel(id) + x, 0, 100);
}
const relBoost = (id) => (1 + rel(id) / 120) * (typeof hasBranch === 'function' && hasBranch(CLUBS[id].league) ? 1.25 : 1);
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
  S.cash -= next.cost; S.acad++; addRep(1); ledger('🏫', next.name, -next.cost);
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
    if (clients().length < maxClients()) {
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
  { id: 's20', i: '🗓️', l: 'Une vie d\'agent', d: 'Jouer 20 saisons', t: () => S.season >= 2046 },
  { id: 'tr100', i: '🏭', l: 'Usine à transferts', d: 'Réaliser 100 transferts', t: () => S.stats.transfers >= 100 },
  { id: 'troph25', i: '🏆', l: 'Collectionneur', d: '25 trophées pour vos clients', t: () => S.stats.troph >= 25 },
  { id: 'earn100', i: '🏦', l: 'Cent millions', d: 'Encaisser 100 M€ au total', t: () => S.stats.earned >= 1e8 },
  { id: 'bdo3', i: '🌟', l: 'Faiseur de Ballons d\'Or', d: '3 Ballons d\'Or pour vos clients', t: () => (S.flags.bdoN || 0) >= 3 },
  { id: 'n1x5', i: '👑', l: 'Dynastie', d: 'Finir 5 saisons n°1 du classement', t: () => S.hist.filter((h) => h.rank === 1).length >= 5 },
  { id: 'acad3', i: '🎓', l: 'Centre d\'élite', d: 'Académie au niveau maximum', t: () => S.acad >= 3 },
  { id: 'owner', i: '🏛️', l: 'Président', d: 'Racheter un club belge', t: () => (S.owned || []).length >= 1 },
  { id: 'ownEu', i: '🚀', l: 'De la Belgique à l\'Europe', d: 'Votre club dispute la Ligue des champions', t: () => (S.owned || []).some((id) => S.eu.C1.alive.includes(id) || S.eu.C1.rounds.some((r) => r.some((x) => x[0] === id || x[1] === id))) },
  { id: 'stad5', i: '🏟️', l: 'Bâtisseur de stade', d: 'Stade de votre club au niveau maximum', t: () => cms().some((c) => c.stadium >= 5) },
  { id: 'twoClubs', i: '🏢', l: 'Groupe multi-clubs', d: 'Posséder un club belge et un club étranger', t: () => cms().length >= 2 },
  { id: 'ownBig', i: '🦁', l: 'Roi d\'Europe du Nord au Sud', d: 'Votre club est champion d\'un des 5 grands championnats', t: () => S.flags.ownBigChamp },
  { id: 'br7', i: '🌐', l: 'Multinationale', d: 'Ouvrir les 7 filiales', t: () => (S.br || []).length >= 7 },
  { id: 'acq3', i: '🦈', l: 'Prédateur', d: 'Racheter 3 agences rivales', t: () => (S.acq || []).length >= 3 },
  { id: 'fdn5', i: '💚', l: 'Philanthrope', d: 'Fondation légendaire', t: () => (S.fdn || 0) >= 5 },
  { id: 'ownChamp', i: '🏛️', l: 'Président champion', d: 'Votre club est champion de Belgique', t: () => S.flags.ownChamp },
  { id: 'cl25', i: '🏟️', l: 'Empire complet', d: 'Gérer 25 clients en même temps', t: () => clients().length >= 25 },
];
function checkAch() {
  if (!S.ach) S.ach = {};
  ACH.forEach((a) => {
    if (S.ach[a.id] || !a.t()) return;
    S.ach[a.id] = `${S.season}/${(S.season + 1) % 100}`; addRep(0.3);
    news('🏅', `Succès débloqué : ${a.i} ${a.l} — ${a.d}.`);
  });
}

/* ---------- Attributs détaillés (dérivés du niveau, du poste et du joueur) ---------- */
const ATTR_NAMES = { GB: ['Plongeon', 'Réflexes', 'Placement', 'Jeu au pied', 'Mental', 'Physique'], X: ['Vitesse', 'Tir', 'Passe', 'Dribble', 'Défense', 'Physique'] };
const ATTR_W = { GB: [4, 5, 3, -8, 1, -1], DEF: [-1, -13, -2, -7, 11, 7], MIL: [0, -3, 9, 5, -4, -3], ATT: [6, 9, -1, 5, -16, -2] };
function attrs(p) {
  const w = ATTR_W[p.pos], h = hashStr('attr' + p.id + p.n);
  return w.map((x, i) => clamp(Math.round(p.ovr + x + (((h >>> (i * 4)) & 15) - 7.5) * 0.9), 20, 99));
}
const attrNames = (p) => ATTR_NAMES[p.pos === 'GB' ? 'GB' : 'X'];
function scoutBlurb(p) {
  const a = attrs(p), n = attrNames(p), idx = a.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0]);
  const best = idx.slice(0, 2).map(([, i]) => n[i].toLowerCase()), worst = n[idx[5][1]].toLowerCase();
  const pot = p.sc ? (p.potHi >= 88 ? 'un talent rare, capable de devenir une star mondiale' : p.potHi >= 80 ? 'un futur titulaire d\'un grand club' : p.potHi >= 70 ? 'un bon joueur de première division' : 'un joueur au plafond limité') : null;
  return `Points forts : ${best.join(' et ')}. Point faible : ${worst}.${pot ? ` Notre avis : ${pot}.` : ''}`;
}

/* ---------- Prochain match d'un joueur ---------- */
function nextMatch(p) {
  const w = S.week + 1, out = [];
  const lg = CLUBS[p.club].league, md = w - 2;
  if (md >= 0 && md < leagueRounds(lg)) {
    const f = fixtures(lg, md).find(([h, a]) => h === p.club || a === p.club);
    if (f) out.push({ w, home: f[0] === p.club, opp: f[0] === p.club ? f[1] : f[0], comp: LEAGUES[lg].name });
  }
  const r = EU_WEEKS.indexOf(w);
  if (r >= 0) {
    for (const k in EU) {
      const cup = S.eu[k];
      if (cup.rounds.length !== r) continue;
      const i = cup.alive.indexOf(p.club);
      if (i >= 0) { const j = i % 2 ? i - 1 : i + 1; out.push({ w, home: i % 2 === 0, opp: cup.alive[j], comp: EU[k].name, cup: k }); }
    }
  }
  return out;
}

/* ---------- Assistant : conseils de la semaine ---------- */
function assistantTips() {
  const cl = clients(), win = inWindow(S.week), t = [];
  const add = (pr, i, txt, act, id) => t.push({ pr, i, txt, act, id });
  if (!cl.length) add(10, '🔎', 'Commencez par observer de jeunes Belges dans Recrutement, puis proposez-leur un mandat.', 'tab', 'scout');
  else if (cl.length < 3 && cl.length < maxClients() && S.actions > 0) add(4, '✍️', `Il vous reste de la place : signez d'autres jeunes (${cl.length}/${maxClients()} clients).`, 'tab', 'scout');
  if (cl.length && S.stats.transfers === 0) {
    const best = cl.slice().sort((a, b) => b.ovr - a.ovr)[0];
    if (win) add(6, '📣', `Le mercato est ouvert : proposez ${best.n} à un club (fiche du joueur → Actions).`, 'open', best.id);
    else add(3, '⏭', `Vos joueurs progressent en jouant. Le mercato rouvre bientôt : le bouton « ⏭ Mercato » vous y emmène directement.`, 'tab', 'home');
  }
  if (S.cash < 0) add(9, '🚨', `Caisse dans le rouge : faillite si les dettes dépassent ${fmt(DIFFS[S.diff].bank)}. Réduisez vos frais ou vendez.`, 'tab', 'agence');
  if (win && (S.week === 6 || S.week === 23)) add(8, '⏰', 'Jour de clôture du mercato : les clubs font deux fois plus d\'offres, c\'est le moment de placer vos joueurs !', 'tab', 'clients');
  if (S.week >= 15 && S.week <= 17 && S.players.some((p) => p.u19 === S.season && !p.mine)) add(5, '🏟️', 'Des pépites se sont révélées au tournoi des espoirs : allez les voir dans Recrutement (filtre 🏟️).', 'u19', '1');
  cl.forEach((p) => {
    if (p.free) add(9, '🆓', `${p.n} est libre : placez-le avant la fin du mercato d'été.`, 'open', p.id);
    else if (p.cy <= 1) add(6, '📝', `Le contrat de ${p.n} se termine : prolongez-le ou vendez-le.`, 'open', p.id);
    if (p.morale < 35) add(7, '😠', `${p.n} a le moral à zéro : discutez avec lui ou trouvez-lui un club.`, 'open', p.id);
    if (!p.loan && playProb(p) < 0.3 && p.age <= 23) add(win ? 6 : 3, '🪑', `${p.n} joue très peu (${Math.round(playProb(p) * 100)} %) : un prêt l'aiderait à progresser.`, 'open', p.id);
    if (p.promise && p.promise - S.t <= 6) add(8, '🤞', `Promesse à tenir : ${p.n} attend son transfert.`, 'open', p.id);
    if (!p.sp && p.ovr >= 60 && !(p.spT > S.t)) add(2, '👟', `${p.n} est assez connu pour décrocher un sponsor.`, 'open', p.id);
  });
  S.players.filter((p) => !p.mine && p.cov && (p.fav || p.sc)).forEach((p) => add(7, '👀', `${p.cov.by} va signer ${p.n} dans ${Math.max(1, p.cov.t - S.t)} sem. : à vous de jouer !`, 'open', p.id));
  cms().forEach((cm) => {
    if (cm.fans < 30) add(6, '📢', `Les supporters de ${CLUBS[cm.id].name} sont mécontents (${Math.round(cm.fans)}/100) : baissez le prix des billets ou renforcez l'équipe.`, 'myclub', cm.id);
    if (S.week >= 20 && cm.obj && clubPos(cm) > cm.obj.target + 2) add(5, '🎯', `${CLUBS[cm.id].name} est ${clubPos(cm)}ᵉ, loin de son objectif (${cm.obj.label}). Un meilleur entraîneur ?`, 'myclub', cm.id);
  });
  if (cl.length >= maxClients() && OFFICES[S.office + 1]) add(5, '🏢', 'Votre agence est pleine : agrandissez le bureau pour signer plus de joueurs.', 'tab', 'agence');
  if (S.office >= EMPIRE_OFFICE && S.cash > 100e6 && (S.br.length < 7 || S.rivals.some((r) => !r.fresh))) add(3, '👑', `${fmt(S.cash)} en caisse : ouvrez des filiales, rachetez des agences rivales ou un club étranger (Agence → Empire).`, 'empire', '1');
  if (S.actions > 0 && cl.length && !t.length) add(1, '⚡', `Il vous reste ${S.actions} action(s) cette semaine.`, 'tab', 'clients');
  return t.sort((a, b) => b.pr - a.pr).slice(0, 4);
}

/* ---------- Investissements de l'agence ---------- */
const mkCost = () => [15000, 50000, 200000, 700000, 2500000][S.office];
const galaCost = () => [5000, 20000, 80000, 300000, 1000000][S.office];
const clubSponsorCost = (c) => Math.max(5000, Math.round(baseValue(c.rep - 15) * 0.05 / 1000) * 1000);
function invMarketing() {
  if (S.inv.mk === S.season) return { ok: false, msg: 'Une seule campagne par saison.' };
  if (S.cash < mkCost()) return { ok: false, msg: 'Pas assez de liquidités.' };
  ledger('📣', 'Campagne de communication', -mkCost());
  S.cash -= mkCost(); S.ss.costs += mkCost(); S.inv.mk = S.season; addRep(3);
  clients().forEach((p) => { p.fol = Math.round((p.fol || 0) * 1.08 + 500); });
  news('📣', 'Grande campagne de communication : l\'agence fait parler d\'elle partout en Europe.');
  save(); return { ok: true, msg: 'Campagne lancée : +3 de réputation et plus d\'abonnés pour vos clients.' };
}
function invGala() {
  if (S.inv.gala === S.season) return { ok: false, msg: 'Un seul gala par saison.' };
  if (!clients().length) return { ok: false, msg: 'Aucun client à inviter.' };
  if (S.cash < galaCost()) return { ok: false, msg: 'Pas assez de liquidités.' };
  ledger('🥂', 'Gala de l\'agence', -galaCost());
  S.cash -= galaCost(); S.ss.costs += galaCost(); S.inv.gala = S.season; addRep(1);
  clients().forEach((p) => { p.morale = clamp(p.morale + 15, 0, 100); });
  news('🥂', 'Soirée de gala de l\'agence : tous vos clients sont aux anges.');
  save(); return { ok: true, msg: 'Gala réussi : +15 de moral pour tous vos clients.' };
}
function invClub(id) {
  const c = CLUBS[id], cost = clubSponsorCost(c);
  if (S.inv.cl[id] === S.season) return { ok: false, msg: 'Déjà partenaire de ce club cette saison.' };
  if (S.cash < cost) return { ok: false, msg: 'Pas assez de liquidités.' };
  S.cash -= cost; S.ss.costs += cost; S.inv.cl[id] = S.season; addRel(id, 20); ledger('🤝', `Partenariat : ${c.name}`, -cost);
  news('🤝', `Partenariat signé avec ${c.name} : vos relations se renforcent.`);
  save(); return { ok: true, msg: `Partenariat avec ${c.name} : relation +20.` };
}

/* ---------- Tournoi des espoirs (semaine 15) ---------- */
function youthTournament() {
  const pool = S.players.filter((p) => !p.mine && p.age <= 19).sort((a, b) => b.pot - a.pot).slice(0, 25).sort(() => Math.random() - 0.5).slice(0, 5);
  pool.forEach((p) => { p.sc = Math.max(p.sc, 1); setEstimate(p); p.u19 = S.season; p.fol = (p.fol || 0) + 3000; });
  if (pool.length) news('🏟️', `Tournoi international des espoirs : ${pool.map((p) => `${p.n} (${COUNTRY_LABEL[p.nat].split(' ')[0]} ${p.pos}, pot. ${p.potLo}–${p.potHi})`).join(', ')} se révèlent !`);
}

/* ---------- Records de l'agence ---------- */
function updateRecords(p, label) {
  const set = (k, v, txt) => { if (!S.rec[k] || v > S.rec[k].v) S.rec[k] = { v, n: p.n, s: label, txt }; };
  if (p.g > 0) set('goals', p.g, `${p.g} but${p.g > 1 ? 's' : ''}`);
  if (p.a > 0) set('assists', p.a, `${p.a} passe${p.a > 1 ? 's' : ''} décisive${p.a > 1 ? 's' : ''}`);
  if (p.m >= 15) set('avg', Math.round(p.rs / p.m * 100) / 100, `note moyenne ${(p.rs / p.m).toFixed(2)}`);
  set('value', playerValue(p), fmt(playerValue(p)));
  set('ovr', Math.floor(p.ovr), `niveau ${Math.floor(p.ovr)}`);
  set('fol', p.fol || 0, `${fmtFol(p.fol || 0)} abonnés`);
}

/* ---------- Pourquoi ce moral ? ---------- */
function moraleFactors(p) {
  const f = [], pp = playProb(p);
  if (pp < 0.3) f.push(['🪑', p.tr === 'amb' ? 'Joue très peu (et il est ambitieux)' : 'Joue très peu', 'bad']);
  else if (pp > 0.6) f.push(['⚽', 'Titulaire régulier', 'ok']);
  if (p.plan === 'int') f.push(['🔥', 'Entraînement intensif fatigant', 'bad']);
  if (p.plan === 'rec') f.push(['🧘', 'Programme de récupération', 'ok']);
  if (p.promise) f.push(['🤞', 'Attend le transfert promis', 'warn']);
  if (p.dream && p.dream.done) f.push(['🌟', 'Rêve réalisé', 'ok']);
  if (p.inj > 0) f.push(['🚑', 'Blessé', 'bad']);
  if (p.tr === 'loy') f.push(['🤝', 'Loyal : ne partira pas', 'ok']);
  return f;
}

/* ---------- Paliers de l'agence ---------- */
const TIERS = [[0, '🏠', 'Agence de quartier'], [15, '🏙️', 'Agence régionale'], [35, '🇧🇪', 'Agence nationale'], [55, '🇪🇺', 'Agence européenne'], [75, '🌍', 'Puissance mondiale'], [92, '👑', 'Empire du football']];
const tierIdx = (rep) => TIERS.reduce((k, t, i) => (rep >= t[0] ? i : k), 0);
function checkTier() {
  const i = tierIdx(S.rep);
  if (S.tier === undefined) { S.tier = i; return; }
  if (i > S.tier) { S.tier = i; addRepSilent(); news('🎖️', `Nouveau palier : votre agence devient « ${TIERS[i][2]} » ${TIERS[i][1]} !`); }
  else if (i < S.tier) S.tier = i;
}
function addRepSilent() { /* palier : pas de bonus de réputation, seulement la reconnaissance */ }

/* ---------- Clubs recommandés pour un transfert ou un prêt ---------- */
function recommendedClubs(p, loan) {
  const cur = CLUBS[p.club];
  const all = CLUB_IDS.map((id) => CLUBS[id]).filter((c) => c.id !== p.club && !(p.rej[c.id] > S.t));
  if (loan) {
    return all.filter((c) => loanOk(p, c)).map((c) => ({ c, s: clamp(0.5 + (p.ovr - (c.rep - 12)) / 16, 0.05, 0.97) }))
      .filter((x) => x.s >= 0.55).sort((a, b) => b.c.rep - a.c.rep).slice(0, 12).map((x) => x.c);
  }
  return all.filter((c) => playerAccepts(p, c) && c.rep >= cur.rep - 2 && clubInterest(p, c) > 0.25)
    .sort((a, b) => clubInterest(p, b) * relBoost(b.id) * (b.rep + 20) - clubInterest(p, a) * relBoost(a.id) * (a.rep + 20)).slice(0, 12);
}

/* ---------- Projection : niveau attendu dans un an ---------- */
function projectOvr(p) {
  const pot = p.mine || p.sc >= 1 ? (p.potLo + p.potHi) / 2 || p.pot : null;
  if (pot === null) return null;
  let o = p.ovr, age = p.age;
  const pp = playProb(p), boost = (p.mine ? (1 + 0.12 * S.stl.coach) * PLANS[p.plan || 'std'].g : 1) * ({ pro: 1.15, amb: 1.08, fet: 0.9 }[p.tr] || 1);
  for (let w = 0; w < SEASON_WEEKS; w++) {
    if (w === SEASON_WEEKS - S.week + 1) age++;
    const k = GROWTH_K[age] || 0;
    if (k > 0 && o < pot) o = Math.min(pot, o + (pot - o) * k / 38 * (0.45 + 0.9 * pp) * boost);
    else if (age >= 31) o -= 0.045;
  }
  return Math.floor(o);
}

/* ---------- Agences rivales : spécialités et actualité du mercato ---------- */
const RIVAL_STYLE = {
  'Stellar Football Group': 'Superstars et Premier League', 'Gestifoot International': 'Péninsule ibérique et Amérique du Sud',
  'Mundial Sports Agency': 'Gros transferts en Serie A', 'Rhein Sport Consulting': 'Bundesliga et jeunes Allemands',
  'Lions Management': 'Ligue 1 et talents francophones', 'Benelux Talents': 'Jeunes Belges et Néerlandais',
  'Ardennes Foot Conseil': 'Petits clubs wallons', 'Scheldt Sports': 'Flandre et Eredivisie',
};
function transferTicker() {
  const from = pick(CLUB_IDS.filter((id) => CLUBS[id].rep >= 70)), up = CLUB_IDS.filter((id) => CLUBS[id].rep > CLUBS[from].rep + 3);
  if (!up.length) return;
  const to = pick(up), fee = Math.round(rnd(4, 20) * (CLUBS[to].rep / 60) ** 3) * 1e6, r = pick(S.rivals);
  news('📰', `Mercato : ${starName(from, rint(0, 2))} quitte ${CLUBS[from].name} pour ${CLUBS[to].name} (${fmt(fee)}) · agent : ${r.n}.`);
}
