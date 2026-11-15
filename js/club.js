/* Gestion du club racheté : finances, entraîneur, infrastructures, supporters, objectifs */
'use strict';

const STADIUM_CAP = [8000, 15000, 25000, 40000, 60000];
const INFRA = {
  stadium: { name: 'Stade', icon: '🏟️', cost: [1.5e6, 4e6, 10e6, 25e6], desc: (l) => `${STADIUM_CAP[l - 1].toLocaleString('fr-FR')} places · plus de billetterie et de prestige` },
  training: { name: 'Centre d\'entraînement', icon: '🏋️', cost: [1e6, 3e6, 8e6, 20e6], desc: (l) => `+${(l - 1) * 5} % de progression pour les joueurs du club · meilleurs résultats` },
  academy: { name: 'Centre de formation', icon: '🎓', cost: [0.8e6, 2.5e6, 6e6, 15e6], desc: (l) => (l > 1 ? `${l - 1} jeune(s) formé(s) chaque été, plus faciles à signer pour vous` : 'Aucun jeune formé pour l\'instant') },
};
const COACH_SAL = [2000, 4000, 8000, 14000, 22000];
const TICKETS = { low: ['Bas', 0.75, 0.3], mid: ['Normal', 1, 0], high: ['Élevé', 1.35, -0.4] };

const isMyClub = (id) => !!(S.cm && S.cm.id === id);
/* Plus le club est prestigieux, plus il est dur de progresser encore */
const growthFactor = (rep) => clamp((95 - rep) / 30, 0.15, 1);
const clubPos = () => standings(CLUBS[S.cm.id].league).findIndex((x) => x.c.id === S.cm.id) + 1;
function genCoach(lvl) { const n = NAMES[pick(['BE', 'FR', 'ES', 'IT', 'DE', 'EN'])]; return { n: pick(n.first) + ' ' + pick(n.last), lvl, sal: COACH_SAL[lvl - 1] }; }

function newClubMgmt(id) {
  const c = CLUBS[id];
  S.cm = { id, stadium: c.rep >= 70 ? 3 : c.rep >= 58 ? 2 : 1, training: 1, academy: 1, coach: genCoach(clamp(Math.round((c.rep - 45) / 10), 1, 4)),
    fans: 60, ticket: 'mid', obj: null, hist: [], res: [], cands: null, since: S.season };
  setObjective();
}

/* Bonus de force en match : entraîneur, centre d'entraînement et ambiance du stade */
function clubBonus(id) {
  if (!isMyClub(id)) return 0;
  const cm = S.cm;
  return cm.coach.lvl * 0.7 + (cm.training - 1) * 0.5 + (cm.fans - 50) / 60;
}

/* Finances hebdomadaires du club (consolidées avec celles de l'agence) */
function clubFinance() {
  if (!S.cm) return null;
  const cm = S.cm, c = CLUBS[cm.id], t = TICKETS[cm.ticket];
  const fill = clamp(0.35 + cm.fans / 150 + (c.rep - 50) / 100, 0.2, 1);
  const tickets = Math.round(STADIUM_CAP[cm.stadium - 1] * (15 + c.rep * 0.3) * t[1] * fill / 40);
  const tv = { BE1: 25000, BE2: 6000, BE3: 1500 }[c.league] || 25000;
  const eu = S.eu.C1.alive.includes(cm.id) ? 40000 : S.eu.C3.alive.includes(cm.id) ? 15000 : 0;
  const spons = Math.round(c.rep * 120 * (0.7 + cm.fans / 200));
  const wages = Math.round(c.rep * c.rep * 4), coach = cm.coach.sal, upkeep = (cm.stadium + cm.training + cm.academy - 3) * 1500;
  const inc = tickets + tv + eu + spons, exp = wages + coach + upkeep;
  return { fill, tickets, tv, eu, spons, wages, coach, upkeep, inc, exp, net: inc - exp };
}
function ownedIncome() { const f = clubFinance(); return f ? f.net : 0; }

/* Après chaque journée : résultat, supporters */
function clubWeek(results) {
  if (!S.cm) return;
  const cm = S.cm, res = results[cm.id];
  if (res) {
    const r = res.gf > res.ga ? 1 : res.gf < res.ga ? -1 : 0;
    cm.fans = clamp(cm.fans + (r > 0 ? 0.8 : r < 0 ? -1.2 : -0.1) + TICKETS[cm.ticket][2] + (55 - cm.fans) * 0.03, 0, 100);
    cm.res.unshift({ w: S.week, opp: res.opp, home: res.home, gf: res.gf, ga: res.ga });
    if (cm.res.length > 8) cm.res.length = 8;
    news(r > 0 ? '🏛️' : r < 0 ? '😬' : '🏛️', `Votre club : ${res.home ? CLUBS[cm.id].name : CLUBS[res.opp].name} ${res.home ? res.gf : res.ga}-${res.home ? res.ga : res.gf} ${res.home ? CLUBS[res.opp].name : CLUBS[cm.id].name}.`);
  } else cm.fans = clamp(cm.fans + TICKETS[cm.ticket][2] / 2 + (55 - cm.fans) * 0.02, 0, 100);
  if (cm.fans < 20 && Math.random() < 0.1) news('📢', `Les supporters de ${CLUBS[cm.id].name} manifestent leur colère. Il faut des résultats… ou des billets moins chers.`);
}

/* Objectif fixé par les supporters pour la saison */
function setObjective() {
  const cm = S.cm, c = CLUBS[cm.id], lg = c.league;
  const exp = clubsOf(lg).sort((a, b) => b.rep - a.rep).findIndex((x) => x.id === cm.id) + 1;
  let o;
  if (lg !== 'BE1') o = { target: 2, label: `Monter en ${LEAGUES[lg === 'BE3' ? 'BE2' : 'BE1'].name} (top 2)` };
  else if (exp <= 1) o = { target: 1, label: 'Être champion de Belgique' };
  else if (exp <= 3) o = { target: 3, label: 'Finir sur le podium (top 3)' };
  else o = { target: Math.max(3, exp - 1), label: `Finir dans le top ${Math.max(3, exp - 1)}` };
  o.season = S.season; cm.obj = o;
}

/* Fin de saison (avant les montées/descentes) */
function clubSeasonEnd(label) {
  if (!S.cm) return;
  const cm = S.cm, c = CLUBS[cm.id], pos = clubPos(), ok = !!cm.obj && pos <= cm.obj.target;
  const gain = (ok ? 1.5 : -1) + (cm.stadium - 1) * 0.2 + (cm.academy - 1) * 0.1;
  setClub(cm.id, c.rep + (gain > 0 ? gain * growthFactor(c.rep) : gain));
  cm.fans = clamp(cm.fans + (ok ? 8 : -10), 0, 100);
  cm.hist.unshift({ s: label, lg: c.league, pos, obj: cm.obj ? cm.obj.label : '', ok });
  if (cm.hist.length > 30) cm.hist.length = 30;
  if (ok) addRep(1);
  if (pos === 1 && c.league === 'BE1') S.flags.ownChamp = 1;
  news(ok ? '🏛️' : '😞', ok ? `${c.name} atteint son objectif (${cm.obj.label}) en finissant ${pos}ᵉ : les supporters exultent !`
    : `${c.name} manque son objectif (${cm.obj ? cm.obj.label : '—'}) en finissant ${pos}ᵉ. Les supporters grondent.`);
  for (let i = 0; i < cm.academy - 1; i++) {
    const p = genPlayer('BE', 16, 16, 10 + cm.academy * 4);
    p.club = cm.id; p.sal = fairSalary(p, c); p.sc = 2; setEstimate(p); p.fav = true; p.hg = cm.id;
    S.players.push(p);
    news('🎓', `${p.n} (16 ans, ${p.pos}, pot. ${p.potLo}–${p.potHi}) sort du centre de formation de ${c.name}. Il signera plus facilement chez vous.`);
  }
  cm.cands = null;
}

/* ---------- Décisions du président ---------- */
function coachCands() {
  if (!S.cm.cands) { const b = S.cm.coach.lvl; S.cm.cands = [Math.max(1, b - 1), Math.min(5, b + 1), Math.min(5, b + 2)].map(genCoach); }
  return S.cm.cands;
}
const coachFee = (c) => c.sal * 20;
function hireCoach(i) {
  const c = coachCands()[i], fee = coachFee(c);
  if (!c) return { ok: false, msg: 'Candidat introuvable.' };
  if (S.cash < fee) return { ok: false, msg: 'Pas assez de liquidités.' };
  S.cash -= fee; S.ss.costs += fee; ledger('🧥', `Entraîneur ${c.n} (${c.lvl}★)`, -fee);
  const old = S.cm.coach; S.cm.coach = c; S.cm.cands = null;
  news('🧥', `${CLUBS[S.cm.id].name} remplace ${old.n} par ${c.n} (${'★'.repeat(c.lvl)}) sur le banc.`);
  save(); return { ok: true, msg: `${c.n} est le nouvel entraîneur de ${CLUBS[S.cm.id].name}.` };
}
function upgradeInfra(k) {
  const lvl = S.cm[k];
  if (lvl >= 5) return { ok: false, msg: 'Niveau maximum atteint.' };
  const cost = INFRA[k].cost[lvl - 1];
  if (S.cash < cost) return { ok: false, msg: 'Pas assez de liquidités.' };
  S.cash -= cost; S.ss.costs += cost; S.cm[k]++; ledger(INFRA[k].icon, `${INFRA[k].name} niveau ${S.cm[k]}`, -cost);
  if (k === 'stadium') { addRep(0.5); S.cm.fans = clamp(S.cm.fans + 5, 0, 100); }
  news(INFRA[k].icon, `${CLUBS[S.cm.id].name} inaugure son nouveau ${INFRA[k].name.toLowerCase()} (niveau ${S.cm[k]}).`);
  save(); return { ok: true, msg: `${INFRA[k].name} passe au niveau ${S.cm[k]} !` };
}
function setTicket(k) { S.cm.ticket = k; save(); return { ok: true, msg: `Prix des billets : ${TICKETS[k][0].toLowerCase()}.` }; }
function clubSaleValue() {
  const cm = S.cm, infra = Object.keys(INFRA).reduce((s, k) => s + INFRA[k].cost.slice(0, cm[k] - 1).reduce((a, b) => a + b, 0), 0);
  return Math.round((clubPrice(CLUBS[cm.id]) * (0.8 + cm.fans / 250) + infra * 0.5) / 1e5) * 1e5;
}
function sellClub() {
  const cm = S.cm, c = CLUBS[cm.id], v = clubSaleValue();
  S.cash += v; ledger('💼', `Revente de ${c.name}`, v);
  S.owned = S.owned.filter((x) => x !== cm.id); S.cm = null;
  news('💼', `${S.agency.name} revend ${c.name} pour ${fmt(v)}.`);
  save(); return { ok: true, msg: `${c.name} vendu pour ${fmt(v)}.` };
}
