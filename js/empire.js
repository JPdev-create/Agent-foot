/* Empire de fin de partie : filiales, rachat d'agences rivales, fondation, héritage */
'use strict';

/* ---------- Capacité de l'agence ---------- */
const maxClients = () => office().maxClients + (S.br || []).length * 3 + (S.acq || []).length * 3 + (S.perk && S.perk.slots ? S.perk.slots * 2 : 0);
const maxActions = () => office().actions + Math.floor((S.br || []).length / 2) + (S.perk && S.perk.act ? S.perk.act : 0);

/* ---------- Filiales à l'étranger ---------- */
const BRANCHES = {
  ENG: { city: 'Londres', cost: 80e6, weekly: 120000 },
  ESP: { city: 'Madrid', cost: 60e6, weekly: 90000 },
  ITA: { city: 'Milan', cost: 50e6, weekly: 80000 },
  GER: { city: 'Munich', cost: 50e6, weekly: 80000 },
  FRA: { city: 'Paris', cost: 50e6, weekly: 80000 },
  NED: { city: 'Amsterdam', cost: 20e6, weekly: 35000 },
  POR: { city: 'Lisbonne', cost: 20e6, weekly: 35000 },
};
const EMPIRE_OFFICE = 4; // il faut le bureau « Empire du football »
const hasBranch = (lg) => (S.br || []).includes(lg);
const branchCosts = () => (S.br || []).reduce((s, lg) => s + BRANCHES[lg].weekly, 0);
function openBranch(lg) {
  const b = BRANCHES[lg];
  if (S.office < EMPIRE_OFFICE) return { ok: false, msg: `Il faut d'abord le bureau « ${OFFICES[EMPIRE_OFFICE].name} ».` };
  if (hasBranch(lg)) return { ok: false, msg: 'Filiale déjà ouverte.' };
  if (S.cash < b.cost) return { ok: false, msg: 'Pas assez de liquidités.' };
  S.cash -= b.cost; S.ss.costs += b.cost; S.br.push(lg); addRep(1); ledger('🌐', `Filiale de ${b.city}`, -b.cost);
  clubsOf(lg).sort((a, c) => c.rep - a.rep).slice(0, 6).forEach((c) => addRel(c.id, 15));
  news('🌐', `${S.agency.name} ouvre une filiale à ${b.city} : +3 clients, influence accrue en ${LEAGUES[lg].name}.`);
  save(); return { ok: true, msg: `Filiale de ${b.city} ouverte !` };
}
/* Chaque saison, les filiales entretiennent les relations avec les grands clubs locaux */
function branchesSeason() {
  (S.br || []).forEach((lg) => clubsOf(lg).sort((a, c) => c.rep - a.rep).slice(0, 6).forEach((c) => addRel(c.id, 8)));
}

/* ---------- Rachat d'agences rivales ---------- */
const STARTUPS = ['Nova Sports', 'Apex Talents', 'Horizon Football', 'Next Gen Agency', 'Prime Players', 'Atlas Sports Group', 'Vortex Management', 'Crown Talents', 'Summit Football', 'Blue Line Agency', 'Pulse Sport Partners', 'Elite Pitch'];
const rivalPrice = (r) => Math.max(10e6, Math.round(r.rep * r.rep * 60000 / 1e6) * 1e6);
function buyRival(name) {
  const r = S.rivals.find((x) => x.n === name);
  if (!r) return { ok: false, msg: 'Agence introuvable.' };
  if (S.office < EMPIRE_OFFICE) return { ok: false, msg: `Il faut d'abord le bureau « ${OFFICES[EMPIRE_OFFICE].name} ».` };
  const price = rivalPrice(r);
  if (S.cash < price) return { ok: false, msg: 'Pas assez de liquidités.' };
  S.cash -= price; S.ss.costs += price; ledger('🦈', `Rachat de ${r.n}`, -price);
  S.acq.push({ n: r.n, rep: Math.floor(r.rep), s: `${S.season}/${(S.season + 1) % 100}` });
  addRep(Math.max(1, r.rep / 20));
  // Les meilleurs joueurs de l'agence rachetée rejoignent la vôtre
  const k = clamp(Math.round(r.rep / 25), 1, 4), got = [];
  for (let i = 0; i < k; i++) {
    const nat = pick(['BE', 'FR', 'EN', 'ES', 'IT', 'DE', 'NL', 'PT']);
    const p = genPlayer(nat, 21, 27);
    p.ovr = clamp(58 + r.rep / 4 + rnd(-4, 4), 55, 88); p.pot = Math.min(95, Math.round(p.ovr + rnd(1, 5)));
    const fit = CLUB_IDS.map((id) => CLUBS[id]).filter((c) => Math.abs(c.rep - (p.ovr + 8)) <= 5);
    if (fit.length) p.club = pick(fit).id;
    p.sal = fairSalary(p, CLUBS[p.club]); p.sc = 2; setEstimate(p); p.fol = Math.round(baseValue(p.ovr) / 200);
    if (clients().length < maxClients()) {
      p.mine = true; p.mandate = 3; p.morale = 70; p.com = 0.07; p.o0 = p.ovr; p.vh = [{ v: playerValue(p) }]; p.dream = newDream(p);
      got.push(p.n);
    } else p.fav = true;
    S.players.push(p);
  }
  const fresh = STARTUPS.filter((n) => !S.rivals.some((x) => x.n === n));
  r.n = fresh.length ? pick(fresh) : `Agence ${rint(100, 999)}`; r.rep = rnd(10, 25); r.fresh = true;
  news('🦈', `${S.agency.name} rachète son concurrent pour ${fmt(price)}${got.length ? ` : ${got.join(', ')} rejoignent l'agence` : ''}. Une nouvelle agence, ${r.n}, se lance sur le marché.`);
  save(); return { ok: true, msg: `Rachat conclu${got.length ? ` : ${got.length} joueur(s) récupéré(s)` : ''} !` };
}

/* ---------- Fondation de l'agence ---------- */
const FDN = [
  { name: 'Aucune fondation', cost: 0, weekly: 0 },
  { name: 'Fondation locale', cost: 5e6, weekly: 20000 },
  { name: 'Fondation nationale', cost: 20e6, weekly: 50000 },
  { name: 'Fondation européenne', cost: 60e6, weekly: 120000 },
  { name: 'Fondation mondiale', cost: 150e6, weekly: 250000 },
  { name: 'Fondation légendaire', cost: 400e6, weekly: 500000 },
];
const fdnLevel = () => S.fdn || 0;
const fdnCosts = () => FDN[fdnLevel()].weekly;
function upFoundation() {
  const n = FDN[fdnLevel() + 1];
  if (!n) return { ok: false, msg: 'Fondation au niveau maximum.' };
  if (S.cash < n.cost) return { ok: false, msg: 'Pas assez de liquidités.' };
  S.cash -= n.cost; S.ss.costs += n.cost; S.fdn = fdnLevel() + 1; addRep(2); ledger('💚', n.name, -n.cost);
  clients().forEach((p) => { p.morale = clamp(p.morale + 5, 0, 100); p.fol = Math.round((p.fol || 0) * 1.05); });
  news('💚', `${n.name} : l'agence finance écoles de foot, hôpitaux et terrains dans les quartiers. Son image rayonne.`);
  save(); return { ok: true, msg: `${n.name} créée !` };
}
/* Réduction de l'usure de réputation au sommet (15 % par niveau) */
const fdnShield = () => 1 - 0.15 * fdnLevel();

/* ---------- Héritage (nouvelle partie+) ---------- */
const LEGACY_KEY = 'agentfoot_legacy';
const PERKS = {
  cash: { name: 'Capital de départ', icon: '💶', max: 5, cost: (l) => 10 + l * 10, desc: (l) => `+${fmt(50000 * l)} au départ` },
  rep: { name: 'Nom connu', icon: '⭐', max: 4, cost: (l) => 15 + l * 15, desc: (l) => `+${5 * l} de réputation au départ` },
  off: { name: 'Locaux hérités', icon: '🏢', max: 2, cost: (l) => 30 + l * 30, desc: (l) => `Commence au bureau niveau ${l + 1}` },
  act: { name: 'Réseau personnel', icon: '⚡', max: 2, cost: (l) => 40 + l * 40, desc: (l) => `+${l} action par semaine, pour toujours` },
  slots: { name: 'Carnet d\'adresses', icon: '👥', max: 3, cost: (l) => 20 + l * 20, desc: (l) => `+${2 * l} places de clients` },
  scout: { name: 'Œil d\'expert', icon: '🔎', max: 1, cost: () => 25, desc: () => 'Commence avec un scout' },
};
function legacy() {
  try { const d = JSON.parse(localStorage.getItem(LEGACY_KEY)); if (d && typeof d.pts === 'number') { d.lv = d.lv || {}; d.careers = d.careers || []; return d; } } catch (e) { /* rien */ }
  return { pts: 0, lv: {}, careers: [] };
}
function saveLegacy(d) { try { localStorage.setItem(LEGACY_KEY, JSON.stringify(d)); } catch (e) { /* rien */ } }
const careerSeasons = () => S.season - 2026 + (S.week > 1 ? 1 : 0);
function legacyPoints() {
  return Math.floor(S.stats.troph * 2 + Object.keys(S.ach || {}).length * 3 + S.stats.transfers / 5 + careerSeasons() * 2 + Math.min(100, S.stats.earned / 2e7)
    + (S.hof || []).length * 2 + (S.owned || []).length * 10 + (S.acq || []).length * 5);
}
const canPassOn = () => !S.legacyDone && careerSeasons() >= 10;
function passOn() {
  if (!canPassOn()) return { ok: false, msg: 'Il faut au moins 10 saisons de carrière (et une seule transmission par partie).' };
  const d = legacy(), pts = legacyPoints();
  d.pts += pts; d.careers.unshift({ n: S.agency.name, logo: S.agency.logo, seasons: careerSeasons(), troph: S.stats.troph, pts, end: `${S.season}/${(S.season + 1) % 100}` });
  if (d.careers.length > 10) d.careers.length = 10;
  saveLegacy(d); S.legacyDone = true;
  news('👑', `${S.agency.name} entre dans la légende : ${pts} points d'héritage pour vos prochaines carrières.`);
  save(); return { ok: true, msg: `${pts} points d'héritage gagnés ! Dépensez-les en créant une nouvelle carrière.` };
}
function buyPerk(k) {
  const d = legacy(), P = PERKS[k], l = d.lv[k] || 0;
  if (l >= P.max) return { ok: false, msg: 'Niveau maximum.' };
  const c = P.cost(l);
  if (d.pts < c) return { ok: false, msg: 'Pas assez de points d\'héritage.' };
  d.pts -= c; d.lv[k] = l + 1; saveLegacy(d);
  return { ok: true, msg: `${P.name} : niveau ${l + 1} !` };
}
/* Appliqué à la création d'une nouvelle partie */
function applyLegacy() {
  const lv = legacy().lv;
  S.perk = { act: lv.act || 0, slots: lv.slots || 0 };
  if (lv.cash) S.cash += 50000 * lv.cash;
  if (lv.rep) S.rep += 5 * lv.rep;
  if (lv.off) { S.office = lv.off; }
  if (lv.scout) { S.stl.scout = Math.max(1, S.stl.scout); S.staff.scout = true; }
  S.actions = maxActions();
}
