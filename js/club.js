/* Clubs rachetés (groupe multi-clubs) : achat, finances, entraîneur, infrastructures, supporters, objectifs */
'use strict';

const STADIUM_CAP = [8000, 15000, 25000, 40000, 60000];
const INFRA = {
  stadium: { name: 'Stade', icon: '🏟️', cost: [1.5e6, 4e6, 10e6, 25e6], desc: (l) => `${STADIUM_CAP[l - 1].toLocaleString('fr-FR')} places · plus de billetterie et de prestige` },
  training: { name: 'Centre d\'entraînement', icon: '🏋️', cost: [1e6, 3e6, 8e6, 20e6], desc: (l) => `+${(l - 1) * 5} % de progression pour les joueurs du club · meilleurs résultats` },
  academy: { name: 'Centre de formation', icon: '🎓', cost: [0.8e6, 2.5e6, 6e6, 15e6], desc: (l) => (l > 1 ? `${l - 1} jeune(s) formé(s) chaque été, plus faciles à signer pour vous` : 'Aucun jeune formé pour l\'instant') },
};
const COACH_SAL = [2000, 4000, 8000, 14000, 22000];
const TICKETS = { low: ['Bas', 0.75, 0.3], mid: ['Normal', 1, 0], high: ['Élevé', 1.35, -0.4] };
const BE_LEAGUES = ['BE1', 'BE2', 'BE3'];
const OWN_TIER = 4;       // « Puissance mondiale » pour un club belge
const OWN_TIER_FOREIGN = 5; // « Empire du football » pour un club étranger
const MAX_CLUBS = 2;      // un club belge + un club étranger

/* ---------- Accès aux clubs possédés ---------- */
const cms = () => S.cms || [];
const cmOf = (id) => cms().find((c) => c.id === id) || null;
const isMyClub = (id) => !!cmOf(id);
let CM_SEL = 0; // club affiché dans l'onglet « Club » (non sauvegardé)
const curCm = () => { const a = cms(); return a[Math.min(CM_SEL, a.length - 1)] || null; };
/* Plus le club est prestigieux, plus il est dur de progresser encore */
const growthFactor = (rep) => clamp((95 - rep) / 30, 0.15, 1);
const clubPos = (cm) => { cm = cm || curCm(); return standings(CLUBS[cm.id].league).findIndex((x) => x.c.id === cm.id) + 1; };
function genCoach(lvl) { const n = NAMES[pick(['BE', 'FR', 'ES', 'IT', 'DE', 'EN', 'NL', 'PT'])]; return { n: pick(n.first) + ' ' + pick(n.last), lvl, sal: COACH_SAL[lvl - 1] }; }

/* ---------- Achat ---------- */
const isForeign = (c) => !BE_LEAGUES.includes(CLUB_DEFAULT[c.id].league);
const clubPrice = (c) => Math.round(20e6 * Math.pow(c.rep / 60, 4) * (isForeign(c) ? (LEAGUES[c.league].big ? 4 : 2) : 1) / 1e6) * 1e6;
const clubInvestCost = (c) => Math.round(3e6 * Math.pow(c.rep / 60, 3) / 1e5) * 1e5;
const canOwn = () => true;
/* Raison pour laquelle on ne peut pas acheter (ou chaîne vide) */
function buyBlock(c) {
  if (S.owned.includes(c.id)) return 'Ce club vous appartient déjà.';
  if (S.owned.length >= MAX_CLUBS) return `Vous possédez déjà ${MAX_CLUBS} clubs.`;
  const foreign = isForeign(c), hasF = S.owned.some((id) => isForeign(CLUBS[id])), hasB = S.owned.some((id) => !isForeign(CLUBS[id]));
  if (foreign && hasF) return 'Vous possédez déjà un club étranger.';
  if (!foreign && hasB) return 'Vous possédez déjà un club belge.';
  if (foreign && tierIdx(S.rep) < OWN_TIER_FOREIGN) return `Statut « ${TIERS[OWN_TIER_FOREIGN][2]} » requis pour un club étranger.`;
  if (!foreign && tierIdx(S.rep) < OWN_TIER) return `Statut « ${TIERS[OWN_TIER][2]} » requis.`;
  if (foreign && !hasBranch(c.league)) return `Ouvrez d'abord une filiale à ${BRANCHES[c.league] ? BRANCHES[c.league].city : 'l\'étranger'}.`;
  return '';
}
function buyClub(id) {
  const c = CLUBS[id], price = clubPrice(c), why = buyBlock(c);
  if (why) return { ok: false, msg: why };
  if (S.cash < price) return { ok: false, msg: 'Pas assez de liquidités.' };
  ledger('🏛️', `Rachat de ${c.name}`, -price);
  S.cash -= price; S.ss.costs += price; S.owned.push(id); addRel(id, 100); addRep(3); newClubMgmt(id);
  CM_SEL = cms().length - 1;
  news('🏛️', `HISTORIQUE : ${S.agency.name} rachète ${c.name} pour ${fmt(price)} !`);
  save(); return { ok: true, msg: `Vous êtes le nouveau propriétaire de ${c.name} !` };
}
function investClub(id) {
  const c = CLUBS[id], cost = clubInvestCost(c);
  if (!S.owned.includes(id)) return { ok: false, msg: 'Ce club ne vous appartient pas.' };
  if (S.inv.own[id] === S.season) return { ok: false, msg: 'Un seul recrutement de renforts par saison.' };
  if (S.cash < cost) return { ok: false, msg: 'Pas assez de liquidités.' };
  S.cash -= cost; S.ss.costs += cost; S.inv.own[id] = S.season; setClub(id, c.rep + 2 * growthFactor(c.rep)); ledger('✍️', `Renforts : ${c.name}`, -cost);
  news('✍️', `${c.name} recrute des renforts de poids : prestige ${CLUBS[id].rep}.`);
  save(); return { ok: true, msg: `Renforts arrivés : ${c.name} passe à ${CLUBS[id].rep} de prestige.` };
}
/* Chaque été, vos clubs restent vos meilleurs partenaires */
function ownedClubsSeason() { (S.owned || []).forEach((id) => { S.rel[id] = 100; }); }

function newClubMgmt(id) {
  const c = CLUBS[id];
  if (!S.cms) S.cms = [];
  const cm = { id, stadium: c.rep >= 82 ? 4 : c.rep >= 70 ? 3 : c.rep >= 58 ? 2 : 1, training: c.rep >= 82 ? 3 : 1, academy: c.rep >= 82 ? 2 : 1,
    coach: genCoach(clamp(Math.round((c.rep - 45) / 10), 1, 5)), fans: 60, ticket: 'mid', obj: null, hist: [], res: [], cands: null, since: S.season };
  S.cms.push(cm);
  setObjective(cm);
  return cm;
}

/* Bonus de force en match : entraîneur, centre d'entraînement et ambiance du stade */
function clubBonus(id) {
  const cm = cmOf(id);
  if (!cm) return 0;
  return cm.coach.lvl * 0.7 + (cm.training - 1) * 0.5 + (cm.fans - 50) / 60;
}

/* Finances hebdomadaires d'un club (consolidées avec celles de l'agence) */
function clubFinance(cm) {
  cm = cm || curCm();
  if (!cm) return null;
  const c = CLUBS[cm.id], t = TICKETS[cm.ticket];
  const fill = clamp(0.35 + cm.fans / 150 + (c.rep - 50) / 100, 0.2, 1);
  const tickets = Math.round(STADIUM_CAP[cm.stadium - 1] * (15 + c.rep * 0.3) * t[1] * fill / 40);
  const tv = { BE1: 25000, BE2: 6000, BE3: 1500, NED: 35000, POR: 35000 }[c.league] || 120000;
  const eu = S.eu.C1.alive.includes(cm.id) ? 40000 : S.eu.C3.alive.includes(cm.id) ? 15000 : 0;
  const spons = Math.round(c.rep * 120 * (0.7 + cm.fans / 200) * (LEAGUES[c.league].big ? 2 : 1));
  const wages = Math.round(c.rep * c.rep * 4 * (LEAGUES[c.league].big ? 1.8 : 1)), coach = cm.coach.sal, upkeep = (cm.stadium + cm.training + cm.academy - 3) * 1500;
  const inc = tickets + tv + eu + spons, exp = wages + coach + upkeep;
  return { fill, tickets, tv, eu, spons, wages, coach, upkeep, inc, exp, net: inc - exp };
}
function ownedIncome() { return cms().reduce((s, cm) => s + clubFinance(cm).net, 0); }

/* Après chaque journée : résultats, supporters */
function clubWeek(results) {
  cms().forEach((cm) => {
    const res = results[cm.id];
    if (res) {
      const r = res.gf > res.ga ? 1 : res.gf < res.ga ? -1 : 0;
      cm.fans = clamp(cm.fans + (r > 0 ? 0.8 : r < 0 ? -1.2 : -0.1) + TICKETS[cm.ticket][2] + (55 - cm.fans) * 0.03, 0, 100);
      cm.res.unshift({ w: S.week, opp: res.opp, home: res.home, gf: res.gf, ga: res.ga });
      if (cm.res.length > 8) cm.res.length = 8;
      news(r < 0 ? '😬' : '🏛️', `Votre club : ${res.home ? CLUBS[cm.id].name : CLUBS[res.opp].name} ${res.home ? res.gf : res.ga}-${res.home ? res.ga : res.gf} ${res.home ? CLUBS[res.opp].name : CLUBS[cm.id].name}.`);
    } else cm.fans = clamp(cm.fans + TICKETS[cm.ticket][2] / 2 + (55 - cm.fans) * 0.02, 0, 100);
    if (cm.fans < 20 && Math.random() < 0.1) news('📢', `Les supporters de ${CLUBS[cm.id].name} manifestent leur colère. Il faut des résultats… ou des billets moins chers.`);
  });
}

/* Objectif fixé par les supporters pour la saison */
function setObjective(cm) {
  if (!cm) { cms().forEach(setObjective); return; }
  const c = CLUBS[cm.id], lg = c.league, big = LEAGUES[lg].big;
  const exp = clubsOf(lg).sort((a, b) => b.rep - a.rep).findIndex((x) => x.id === cm.id) + 1;
  let o;
  if (lg === 'BE2' || lg === 'BE3') o = { target: 2, label: `Monter en ${LEAGUES[lg === 'BE3' ? 'BE2' : 'BE1'].name} (top 2)` };
  else if (exp <= 1) o = { target: 1, label: `Être champion (${LEAGUES[lg].name})` };
  else if (exp <= 4 && big) o = { target: 4, label: 'Finir dans le top 4 (Ligue des champions)' };
  else if (exp <= 3) o = { target: 3, label: 'Finir sur le podium (top 3)' };
  else o = { target: Math.max(3, exp - 1), label: `Finir dans le top ${Math.max(3, exp - 1)}` };
  o.season = S.season; cm.obj = o;
}

/* Fin de saison (avant les montées/descentes) */
function clubSeasonEnd(label) {
  cms().forEach((cm) => {
    const c = CLUBS[cm.id], pos = clubPos(cm), ok = !!cm.obj && pos <= cm.obj.target;
    const gain = (ok ? 1.5 : -1) + (cm.stadium - 1) * 0.2 + (cm.academy - 1) * 0.1;
    setClub(cm.id, c.rep + (gain > 0 ? gain * growthFactor(c.rep) : gain));
    cm.fans = clamp(cm.fans + (ok ? 8 : -10), 0, 100);
    cm.hist.unshift({ s: label, lg: c.league, pos, obj: cm.obj ? cm.obj.label : '', ok });
    if (cm.hist.length > 30) cm.hist.length = 30;
    if (ok) addRep(1);
    if (pos === 1 && c.league === 'BE1') S.flags.ownChamp = 1;
    if (pos === 1 && LEAGUES[c.league].big) S.flags.ownBigChamp = 1;
    news(ok ? '🏛️' : '😞', ok ? `${c.name} atteint son objectif (${cm.obj.label}) en finissant ${pos}ᵉ : les supporters exultent !`
      : `${c.name} manque son objectif (${cm.obj ? cm.obj.label : '—'}) en finissant ${pos}ᵉ. Les supporters grondent.`);
    const nat = LEAGUES[c.league].country;
    for (let i = 0; i < cm.academy - 1; i++) {
      const p = genPlayer(MARKET_SIZE[nat] ? nat : 'BE', 16, 16, 10 + cm.academy * 4);
      p.club = cm.id; p.sal = fairSalary(p, c); p.sc = 2; setEstimate(p); p.fav = true; p.hg = cm.id;
      S.players.push(p);
      news('🎓', `${p.n} (16 ans, ${p.pos}, pot. ${p.potLo}–${p.potHi}) sort du centre de formation de ${c.name}. Il signera plus facilement chez vous.`);
    }
    cm.cands = null;
  });
  if (cms().length >= 2) S.flags.twoClubs = 1;
}

/* ---------- Décisions du président ---------- */
function coachCands(cm) {
  cm = cm || curCm();
  if (!cm.cands) { const b = cm.coach.lvl; cm.cands = [Math.max(1, b - 1), Math.min(5, b + 1), Math.min(5, b + 2)].map(genCoach); }
  return cm.cands;
}
const coachFee = (c) => c.sal * 20;
function hireCoach(i, cm) {
  cm = cm || curCm();
  const c = coachCands(cm)[i];
  if (!c) return { ok: false, msg: 'Candidat introuvable.' };
  const fee = coachFee(c);
  if (S.cash < fee) return { ok: false, msg: 'Pas assez de liquidités.' };
  S.cash -= fee; S.ss.costs += fee; ledger('🧥', `Entraîneur ${c.n} (${c.lvl}★) · ${CLUBS[cm.id].name}`, -fee);
  const old = cm.coach; cm.coach = c; cm.cands = null;
  news('🧥', `${CLUBS[cm.id].name} remplace ${old.n} par ${c.n} (${'★'.repeat(c.lvl)}) sur le banc.`);
  save(); return { ok: true, msg: `${c.n} est le nouvel entraîneur de ${CLUBS[cm.id].name}.` };
}
function upgradeInfra(k, cm) {
  cm = cm || curCm();
  const lvl = cm[k];
  if (lvl >= 5) return { ok: false, msg: 'Niveau maximum atteint.' };
  const cost = INFRA[k].cost[lvl - 1];
  if (S.cash < cost) return { ok: false, msg: 'Pas assez de liquidités.' };
  S.cash -= cost; S.ss.costs += cost; cm[k]++; ledger(INFRA[k].icon, `${INFRA[k].name} niveau ${cm[k]} · ${CLUBS[cm.id].name}`, -cost);
  if (k === 'stadium') { addRep(0.5); cm.fans = clamp(cm.fans + 5, 0, 100); }
  news(INFRA[k].icon, `${CLUBS[cm.id].name} inaugure son nouveau ${INFRA[k].name.toLowerCase()} (niveau ${cm[k]}).`);
  save(); return { ok: true, msg: `${INFRA[k].name} passe au niveau ${cm[k]} !` };
}
function setTicket(k, cm) { cm = cm || curCm(); cm.ticket = k; save(); return { ok: true, msg: `Prix des billets : ${TICKETS[k][0].toLowerCase()}.` }; }
function clubSaleValue(cm) {
  cm = cm || curCm();
  const infra = Object.keys(INFRA).reduce((s, k) => s + INFRA[k].cost.slice(0, cm[k] - 1).reduce((a, b) => a + b, 0), 0);
  return Math.round((clubPrice(CLUBS[cm.id]) * (0.8 + cm.fans / 250) + infra * 0.5) / 1e5) * 1e5;
}
function sellClub(cm) {
  cm = cm || curCm();
  const c = CLUBS[cm.id], v = clubSaleValue(cm);
  S.cash += v; ledger('💼', `Revente de ${c.name}`, v);
  S.owned = S.owned.filter((x) => x !== cm.id); S.cms = S.cms.filter((x) => x !== cm); CM_SEL = 0;
  news('💼', `${S.agency.name} revend ${c.name} pour ${fmt(v)}.`);
  save(); return { ok: true, msg: `${c.name} vendu pour ${fmt(v)}.` };
}
