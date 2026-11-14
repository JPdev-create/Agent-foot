/* Logique du jeu (aucun accès au DOM ici) */
'use strict';

const SAVE_KEY = 'agentfoot_save_v1';
let S = null; // état courant

const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ---------- Formules ---------- */
const baseValue = (ovr) => 20000 * Math.pow(1.18, ovr - 40);

function playerValue(p) {
  let f;
  if (p.age <= 21) f = 1.3; else if (p.age <= 25) f = 1.15; else if (p.age <= 28) f = 1;
  else if (p.age <= 31) f = 0.7; else f = 0.4;
  const potF = p.age <= 23 ? 1 + Math.max(0, p.pot - p.ovr) * 0.035 : 1;
  return Math.round(baseValue(p.ovr) * f * potF * (p.intl ? 1.12 : 1) / 100) * 100;
}

function fairSalary(p, club) {
  return Math.max(50, Math.round(baseValue(p.ovr) / 260 * (0.6 + club.rep / 100) / 10) * 10);
}

function playProb(p) {
  const c = CLUBS[p.club];
  return clamp(0.5 + (p.ovr - (c.rep - 12)) / 16, 0.05, 0.97);
}

/* Intérêt d'un club pour un joueur : 0..1 */
function clubInterest(p, club) {
  if (club.id === p.club) return 0;
  const d = p.ovr - (club.rep - 14);
  let i = d >= -2 ? clamp(0.3 + d / 12, 0, 0.95) : 0;
  if (p.age <= 21 && p.pot >= club.rep - 3 && p.ovr >= club.rep - 22) {
    i = Math.max(i, clamp(0.25 + (p.pot - club.rep + 3) / 30, 0, 0.9));
  }
  return i;
}
/* Un joueur qui ne joue pas accepte de redescendre pour avoir du temps de jeu */
const playerAccepts = (p, club) => club.rep >= CLUBS[p.club].rep - (playProb(p) < 0.3 ? 15 : 4);

function signChance(p, bonusLevel) {
  const req = (p.ovr - 42) * 1.6 + Math.max(0, p.pot - 70) * 0.8 + (p.nat !== 'BE' ? 10 : 0);
  return clamp(0.5 + (S.rep - req) / 40 + [0, 0.15, 0.3][bonusLevel], 0.03, 0.95);
}
function signBonusCost(p, level) {
  const v = playerValue(p);
  return [0, Math.max(500, Math.round(v * 0.02 / 100) * 100), Math.max(2000, Math.round(v * 0.06 / 100) * 100)][level];
}

const COMMISSION_SALARY = 0.07;
const commissionTransfer = () => 0.10;

/* ---------- Génération ---------- */
function genName(country) {
  const n = NAMES[country];
  return pick(n.first) + ' ' + pick(n.last);
}

function genPlayer(country, ageMin, ageMax) {
  const lg = country === 'BE' ? pick(['BE1', 'BE1', 'BE2', 'BE2', 'BE3', 'BE3', 'BE3']) : COUNTRY_LEAGUES[country][0];
  const club = pick(clubsOf(lg));
  const age = rint(ageMin, ageMax);
  const off = country === 'BE' ? 15 : 21;
  const ovr = clamp(club.rep - off + (age - 16) * 1.5 + rnd(-4, 4), 36, 80);
  let gap = rnd(2, 12);
  if (Math.random() < 0.25) gap += rnd(5, 15);
  if (Math.random() < 0.06) gap += rnd(5, 12);
  gap *= clamp((25 - age) / 8, 0.3, 1.1);
  const pot = Math.round(clamp(ovr + gap, ovr + 1, 95));
  const r = Math.random();
  const pos = r < 0.1 ? 'GB' : r < 0.42 ? 'DEF' : r < 0.74 ? 'MIL' : 'ATT';
  const p = {
    id: S.nextId++, n: genName(country), nat: country, age, pos, ovr, pot,
    club: club.id, sal: 0, cy: rint(1, 3), mine: false, mandate: 0, morale: 70, inj: 0,
    sc: 0, potLo: 0, potHi: 0, cd: 0, rej: {}, m: 0, g: 0, a: 0, rs: 0, cs: 0, log: [], sh: [], hist: [], fav: false, loan: null, o0: ovr, tr: Math.random() < 0.6 ? pick(TRAIT_KEYS) : '', intl: false, aw: [],
  };
  p.sal = fairSalary(p, club);
  return p;
}

const MARKET_SIZE = { BE: 130, FR: 28, EN: 28, ES: 28, IT: 28, DE: 28 };

function newGame(name, city) {
  S = {
    v: 1, agency: { name: name || 'Mon Agence', city: city || 'Liège' },
    cash: 20000, rep: 5, week: 1, season: 2026, t: 0, office: 0,
    staff: { scout: false, nego: false, coach: false },
    actions: OFFICES[0].actions, players: [], nextId: 1, offers: [], news: [],
    stats: { transfers: 0, bestFee: 0, earned: 0 }, goals: {}, over: false,
  };
  migrate();
  for (const c in MARKET_SIZE) for (let i = 0; i < MARKET_SIZE[c]; i++) S.players.push(genPlayer(c, 16, 21));
  news('🏁', `Bienvenue chez ${S.agency.name} ! Vous démarrez à ${S.agency.city} avec ${fmt(S.cash)}. Observez de jeunes Belges sur le marché et signez vos premiers clients.`);
  save();
}

/* ---------- Utilitaires d'état ---------- */
function fmt(n) {
  const s = n < 0 ? '-' : ''; n = Math.abs(n);
  const f = (x, d) => x.toFixed(d).replace('.', ',').replace(/,0+$/, '');
  if (n >= 1e6) return s + f(n / 1e6, 2) + ' M€';
  if (n >= 1e4) return s + f(n / 1e3, 1) + ' k€';
  return s + Math.round(n).toLocaleString('fr-FR') + ' €';
}
function news(icon, text) {
  S.news.unshift({ i: icon, x: text, w: S.week, s: S.season });
  if (S.news.length > 60) S.news.length = 60;
}
const getP = (id) => S.players.find((p) => p.id === id);
const clients = () => S.players.filter((p) => p.mine);
const office = () => OFFICES[S.office];
const weeklyCosts = () => office().weekly + Object.keys(STAFF).reduce((s, k) => s + (S.staff[k] ? STAFF[k].weekly : 0), 0);
const weeklyIncome = () => Math.round(clients().reduce((s, p) => s + p.sal * COMMISSION_SALARY, 0));
const canRecruit = (p) => p.nat === 'BE' || S.office >= INTL_OFFICE;
/* Plus l'agence est réputée, plus il est difficile de gagner encore en réputation */
function addRep(x) { S.rep = clamp(S.rep + (x > 0 ? x * clamp((115 - S.rep) / 100, 0.15, 1) : x), 0, 100); }
function earn(x) { S.cash += x; S.stats.earned += x; S.ss.inc += x; }

const RIVALS = [['Stellar Football Group', 92], ['Gestifoot International', 84], ['Mundial Sports Agency', 75],
  ['Rhein Sport Consulting', 64], ['Lions Management', 52], ['Benelux Talents', 40],
  ['Ardennes Foot Conseil', 27], ['Scheldt Sports', 16]];
const agencyRank = () => 1 + S.rivals.filter((r) => r.rep > S.rep).length;
const newSeasonStats = () => ({ inc: 0, costs: 0, tr0: S.stats.transfers, rep0: S.rep });

/* Applique aux clubs le prestige et la division qui ont évolué au fil des saisons */
function applyClubs() {
  CLUB_IDS.forEach((id) => { Object.assign(CLUBS[id], CLUB_DEFAULT[id], S.cs[id] || {}); });
}
function setClub(id, rep, league) {
  S.cs[id] = { rep: clamp(Math.round(rep), 38, 96), league: league || CLUBS[id].league };
  Object.assign(CLUBS[id], S.cs[id]);
}

/* Complète un état (nouvelle partie ou ancienne sauvegarde) avec les champs récents */
function migrate() {
  if (!S.rivals) S.rivals = RIVALS.map(([n, rep]) => ({ n, rep }));
  if (!S.ss) { S.ss = { inc: 0, costs: 0, tr0: 0, rep0: 0 }; S.ss = newSeasonStats(); }
  if (S.event === undefined) S.event = null;
  if (S.recap === undefined) S.recap = null;
  if (!S.cs) S.cs = {};
  applyClubs();
  if (!S.tab) newTables();
  if (!S.res) S.res = {};
  if (!S.wk) S.wk = [];
  S.players.forEach((p) => {
    if (p.a === undefined) { p.a = 0; p.rs = 0; p.cs = 0; p.log = []; p.sh = []; }
    if (p.tr === undefined) { p.tr = Math.random() < 0.6 ? pick(TRAIT_KEYS) : ''; p.intl = false; p.aw = []; }
    if (p.fav === undefined) p.fav = false;
    if (p.loan === undefined) p.loan = null;
    if (p.o0 === undefined) p.o0 = p.ovr;
  });
}

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* stockage indisponible */ } }
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1) return false;
    S = d; migrate(); return true;
  } catch (e) { return false; }
}
function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* rien */ } S = { cs: {} }; applyClubs(); S = null; }

function checkGoals() {
  const cl = clients();
  const done = {
    sign1: cl.length >= 1 || S.stats.transfers > 0, sign3: cl.length >= 3,
    tr1: S.stats.transfers >= 1, be1: !!S.flagBE1, big5: !!S.flagBig5,
    earn1m: S.stats.earned >= 1e6, ovr80: cl.some((p) => p.ovr >= 80),
    top90: !!S.flagTop90, rep75: S.rep >= 75, top1: agencyRank() === 1,
  };
  GOALS.forEach((g) => {
    if (done[g.id] && !S.goals[g.id]) {
      S.goals[g.id] = true; S.cash += g.reward; addRep(1);
      news('🏆', `Objectif atteint : ${g.label} — prime de ${fmt(g.reward)}.`);
    }
  });
}

/* ---------- Actions du joueur ---------- */
function useAction() {
  if (S.actions <= 0) return false;
  S.actions--; return true;
}

function actScout(id) {
  const p = getP(id);
  if (p.sc >= 2) return { ok: false, msg: 'Ce joueur est déjà parfaitement connu.' };
  if (!useAction()) return { ok: false, msg: "Plus d'action cette semaine." };
  p.sc = S.staff.scout ? 2 : p.sc + 1;
  setEstimate(p);
  save();
  return { ok: true, msg: `Rapport reçu : potentiel estimé ${p.potLo}–${p.potHi}.` };
}
function setEstimate(p) {
  const w = p.sc >= 2 ? 2 : 5;
  const c = p.pot + rint(-(w - 1), w - 1);
  p.potLo = Math.max(Math.floor(p.ovr), c - w); p.potHi = Math.min(99, c + w);
}

function actSign(id, bonusLevel) {
  const p = getP(id);
  if (p.mine) return { ok: false, msg: 'Déjà client.' };
  if (!canRecruit(p)) return { ok: false, msg: `Il faut le bureau « ${OFFICES[INTL_OFFICE].name} » pour recruter hors de Belgique.` };
  if (clients().length >= office().maxClients) return { ok: false, msg: 'Nombre maximum de clients atteint. Agrandissez votre bureau.' };
  if (p.cd > S.t) return { ok: false, msg: `Il ne veut plus vous parler pour l'instant (encore ${p.cd - S.t} sem.).` };
  const cost = signBonusCost(p, bonusLevel);
  if (cost > S.cash) return { ok: false, msg: 'Pas assez de liquidités pour cette prime.' };
  if (!useAction()) return { ok: false, msg: "Plus d'action cette semaine." };
  const ok = Math.random() < signChance(p, bonusLevel);
  if (ok) {
    S.cash -= cost; p.mine = true; p.mandate = 3; p.morale = 75; p.o0 = p.ovr;
    if (p.sc < 1) { p.sc = 1; setEstimate(p); }
    news('✍️', `${p.n} (${p.age} ans, ${p.pos}) signe un mandat de 3 saisons avec l'agence.`);
    addRep(0.3); checkGoals(); save();
    return { ok: true, msg: `${p.n} rejoint l'agence !` };
  }
  p.cd = S.t + 8; save();
  return { ok: false, msg: `${p.n} décline votre proposition. Il ne veut plus en entendre parler pendant 8 semaines.` };
}

function makeOffer(p, club, boost) {
  const nego = S.staff.nego ? 1.1 : 1;
  const fee = Math.round(playerValue(p) * rnd(0.85, 1.25) * (0.9 + club.rep / 400) * nego * (boost || 1) * (p.cy <= 1 ? 0.6 : 1) / 1000) * 1000;
  return { id: S.nextId++, pid: p.id, club: club.id, fee, sal: Math.max(fairSalary(p, club), Math.round(p.sal * 1.1)), exp: S.t + 3, nego: false };
}

function actPropose(id, clubId) {
  const p = getP(id), club = CLUBS[clubId];
  if (!inWindow(S.week)) return { ok: false, msg: 'Le mercato est fermé.' };
  if (p.loan) return { ok: false, msg: 'Il est en prêt jusqu\'à la fin de la saison.' };
  if (p.inj > 0) return { ok: false, msg: 'Joueur blessé : aucun club ne bougera.' };
  if (p.rej[clubId] && p.rej[clubId] > S.t) return { ok: false, msg: 'Ce club a déjà dit non récemment.' };
  if (S.offers.some((o) => o.pid === id && o.club === clubId)) return { ok: false, msg: 'Une offre de ce club est déjà sur la table.' };
  if (!playerAccepts(p, club)) return { ok: false, msg: `${p.n} refuse de descendre à ce niveau.` };
  if (!useAction()) return { ok: false, msg: "Plus d'action cette semaine." };
  const chance = clubInterest(p, club) * (1 + S.rep / 250);
  if (Math.random() < chance) {
    const o = makeOffer(p, club);
    S.offers.push(o); save();
    return { ok: true, msg: `${club.name} est intéressé et propose ${fmt(o.fee)} !` };
  }
  p.rej[clubId] = S.t + 10; save();
  return { ok: false, msg: `${club.name} n'est pas intéressé par ${p.n}.` };
}

/* Prêt : le joueur part dans un club plus modeste jusqu'à la fin de la saison pour jouer */
const loanOk = (p, club) => !p.loan && club.id !== p.club && club.rep < CLUBS[p.club].rep
  && club.rep >= CLUBS[p.club].rep - 25 && p.ovr >= club.rep - 14;

function actLoan(id, clubId) {
  const p = getP(id), club = CLUBS[clubId];
  if (!inWindow(S.week)) return { ok: false, msg: 'Le mercato est fermé.' };
  if (p.inj > 0) return { ok: false, msg: 'Joueur blessé : aucun club ne bougera.' };
  if (!loanOk(p, club)) return { ok: false, msg: 'Ce prêt n\'est pas possible.' };
  if (p.rej[clubId] && p.rej[clubId] > S.t) return { ok: false, msg: 'Ce club a déjà dit non récemment.' };
  if (!useAction()) return { ok: false, msg: "Plus d'action cette semaine." };
  if (Math.random() < 0.8) {
    const from = CLUBS[p.club];
    p.loan = { back: p.club }; p.club = clubId; p.morale = clamp(p.morale + 8, 0, 100);
    S.offers = S.offers.filter((o) => o.pid !== id);
    news('🔁', `PRÊT : ${p.n} est prêté par ${from.name} à ${club.name} jusqu'à la fin de la saison.`);
    save();
    return { ok: true, msg: `${p.n} est prêté à ${club.name}. Temps de jeu estimé : ${Math.round(playProb(p) * 100)} %.` };
  }
  p.rej[clubId] = S.t + 10; save();
  return { ok: false, msg: `${club.name} ne souhaite pas ce prêt.` };
}

function actFav(id) { const p = getP(id); p.fav = !p.fav; save(); }

/* ---------- Événements à choix ---------- */
function maybeEvent() {
  const cl = clients().filter((p) => p.inj === 0);
  if (S.event || !cl.length || Math.random() > 0.07) return;
  const p = pick(cl);
  const types = ['rival', 'ecart', 'stage', 'presse'];
  if (p.tr === 'fet') types.push('ecart', 'ecart', 'ecart');
  if (LEAGUES[CLUBS[p.club].league].country !== p.nat) types.push('mal');
  S.event = { k: pick(types), pid: p.id, c: Math.max(300, Math.round(playerValue(p) * 0.01 / 100) * 100) };
}

function eventView() {
  const e = S.event, p = getP(e.pid), c = e.c;
  switch (e.k) {
    case 'rival': return { title: 'Un concurrent rôde', text: `Un agent rival drague ${p.n} et lui promet monts et merveilles.`,
      choices: [`Prime de fidélité (${fmt(c * 2)})`, 'Compter sur sa loyauté'] };
    case 'ecart': return { title: 'Écart de conduite', text: `${p.n} a été photographié en soirée la veille d'un match. La presse s'en mêle.`,
      choices: [`Payer un communicant (${fmt(c)})`, 'Le recadrer fermement', 'Laisser couler'] };
    case 'stage': return { title: 'Stage individuel', text: `${p.n} voudrait suivre un stage avec un préparateur réputé pour franchir un cap.`,
      choices: [`Financer le stage (${fmt(c * 3)})`, 'Refuser'] };
    case 'presse': return { title: 'Demande d\'interview', text: `Un journaliste propose un grand portrait de ${p.n}. Bon coup de pub... ou dérapage.`,
      choices: ['Accepter l\'interview', 'Refuser, il reste concentré'] };
    default: return { title: 'Mal du pays', text: `${p.n} vit mal l'éloignement à ${CLUBS[p.club].name}.`,
      choices: [`Faire venir sa famille (${fmt(c)})`, 'Lui dire de serrer les dents'] };
  }
}

function resolveEvent(i) {
  const e = S.event, p = getP(e.pid);
  const pay = (x) => { if (S.cash < x) return false; S.cash -= x; return true; };
  const mor = (x) => { p.morale = clamp(p.morale + x, 0, 100); };
  const broke = { ok: false, msg: 'Pas assez de liquidités pour ce choix.' };
  let r;
  if (e.k === 'rival') {
    if (i === 0) { if (!pay(e.c * 2)) return broke; mor(10); r = { ok: true, msg: `${p.n} apprécie le geste et reste fidèle.` }; }
    else if (p.tr === 'loy' || Math.random() < p.morale / 100 + 0.1) { mor(3); r = { ok: true, msg: `${p.n} envoie balader le concurrent.` }; }
    else {
      p.mine = false; p.mandate = 0; p.cd = S.t + 40; S.offers = S.offers.filter((o) => o.pid !== p.id);
      news('💔', `${p.n} cède aux sirènes d'un agent rival et quitte l'agence.`);
      r = { ok: false, msg: `${p.n} signe chez le concurrent...` };
    }
  } else if (e.k === 'ecart') {
    if (i === 0) { if (!pay(e.c)) return broke; r = { ok: true, msg: 'L\'affaire est étouffée.' }; }
    else if (i === 1) { mor(-10); addRep(0.2); r = { ok: true, msg: `${p.n} fait la tête, mais le message est passé.` }; }
    else { mor(3); addRep(-1.5); r = { ok: false, msg: 'La presse se régale : votre réputation en prend un coup.' }; }
  } else if (e.k === 'stage') {
    if (i === 0) {
      if (!pay(e.c * 3)) return broke;
      const g = Math.min(p.pot - p.ovr, rnd(0.8, 1.6)); p.ovr += g; mor(8);
      r = { ok: true, msg: g > 0.3 ? `Stage réussi : ${p.n} a progressé.` : `${p.n} est déjà proche de son plafond, mais il est ravi.` };
    } else { mor(-4); r = { ok: true, msg: `${p.n} est un peu déçu.` }; }
  } else if (e.k === 'presse') {
    if (i === 1) r = { ok: true, msg: 'Pas de vagues.' };
    else if (Math.random() < 0.65) { addRep(1); mor(5); r = { ok: true, msg: 'Très bel article : l\'agence gagne en notoriété.' }; }
    else { addRep(-0.5); mor(-8); r = { ok: false, msg: `${p.n} dérape en interview. Son club est furieux.` }; }
  } else if (i === 0) { if (!pay(e.c)) return broke; mor(15); r = { ok: true, msg: `${p.n} retrouve le sourire.` }; }
  else { mor(-12); r = { ok: false, msg: `${p.n} broie du noir.` }; }
  S.event = null; save();
  return r;
}

function actNegotiate(oid) {
  const o = S.offers.find((x) => x.id === oid);
  if (!o || o.nego) return { ok: false, msg: 'Négociation impossible.' };
  o.nego = true;
  const r = Math.random(), safe = S.staff.nego ? 0.12 : 0.25;
  if (r < safe) {
    S.offers = S.offers.filter((x) => x.id !== oid); save();
    return { ok: false, msg: `${CLUBS[o.club].name} claque la porte et retire son offre.` };
  }
  if (r < safe + 0.3) { save(); return { ok: false, msg: "Le club refuse d'aller plus haut. L'offre reste valable." }; }
  o.fee = Math.round(o.fee * rnd(1.08, 1.25) / 1000) * 1000; o.sal = Math.round(o.sal * rnd(1.05, 1.2) / 10) * 10; save();
  return { ok: true, msg: `Bien joué ! Nouvelle offre : ${fmt(o.fee)}.` };
}

function actAccept(oid) {
  const o = S.offers.find((x) => x.id === oid);
  if (!o) return { ok: false, msg: 'Offre expirée.' };
  const p = getP(o.pid), club = CLUBS[o.club], from = CLUBS[p.club];
  const com = Math.round(o.fee * commissionTransfer());
  p.hist.push({ s: S.season, from: from.name, to: club.name, fee: o.fee });
  p.club = club.id; p.sal = o.sal; p.cy = rint(3, 5); p.morale = clamp(p.morale + 20, 0, 100); p.rej = {};
  earn(com); S.stats.transfers++; S.stats.bestFee = Math.max(S.stats.bestFee, o.fee);
  addRep(Math.max(0.3, (club.rep - 52) / 9) + 0.5 * Math.log10(Math.max(1, o.fee / 1e5)));
  if (club.league === 'BE1') S.flagBE1 = true;
  if (LEAGUES[club.league].big) S.flagBig5 = true;
  if (club.rep >= 90) S.flagTop90 = true;
  S.offers = S.offers.filter((x) => x.pid !== p.id);
  news('🤝', `TRANSFERT : ${p.n} quitte ${from.name} pour ${club.name} (${LEAGUES[club.league].name}) contre ${fmt(o.fee)}. Commission : ${fmt(com)}.`);
  checkGoals(); save();
  return { ok: true, msg: `Transfert conclu ! Vous touchez ${fmt(com)}.` };
}

function actRefuse(oid) { S.offers = S.offers.filter((x) => x.id !== oid); save(); }

function actRaise(id) {
  const p = getP(id), fair = fairSalary(p, CLUBS[p.club]);
  if (p.raiseT && p.raiseT > S.t) return { ok: false, msg: 'Vous avez déjà négocié récemment avec ce club.' };
  if (!useAction()) return { ok: false, msg: "Plus d'action cette semaine." };
  p.raiseT = S.t + 12;
  if (fair > p.sal * 1.08 && Math.random() < 0.75) {
    p.sal = fair; p.morale = clamp(p.morale + 10, 0, 100); save();
    return { ok: true, msg: `${CLUBS[p.club].name} accepte : nouveau salaire ${fmt(p.sal)}/sem.` };
  }
  save();
  return { ok: false, msg: `${CLUBS[p.club].name} estime que le salaire actuel est déjà correct.` };
}

/* Prolongation de contrat avec le club actuel (dernière année de contrat) */
function actRenew(id) {
  const p = getP(id), club = CLUBS[p.club];
  if (p.cy > 1) return { ok: false, msg: 'Son contrat court encore plusieurs saisons.' };
  if (p.loan) return { ok: false, msg: 'Impossible pendant un prêt.' };
  if (p.raiseT && p.raiseT > S.t) return { ok: false, msg: 'Vous avez déjà négocié récemment avec ce club.' };
  if (!useAction()) return { ok: false, msg: "Plus d'action cette semaine." };
  p.raiseT = S.t + 8;
  if (Math.random() < 0.85) {
    p.sal = Math.round(Math.max(p.sal * 1.1, fairSalary(p, club) * 1.05) / 10) * 10;
    p.cy = rint(3, 4); p.morale = clamp(p.morale + 8, 0, 100);
    const com = p.sal * 6; earn(com);
    news('📝', `${p.n} prolonge à ${club.name} : ${fmt(p.sal)}/sem. Prime d'agent : ${fmt(com)}.`);
    save();
    return { ok: true, msg: `Prolongation signée ! Prime d'agent : ${fmt(com)}.` };
  }
  save();
  return { ok: false, msg: `${club.name} ne veut pas prolonger pour l'instant.` };
}

function actTalk(id) {
  const p = getP(id);
  if (!useAction()) return { ok: false, msg: "Plus d'action cette semaine." };
  p.morale = clamp(p.morale + 12, 0, 100); save();
  return { ok: true, msg: `${p.n} apprécie votre suivi. Moral en hausse.` };
}

function actRelease(id) {
  const p = getP(id);
  p.mine = false; p.mandate = 0; p.cd = S.t + 30;
  S.offers = S.offers.filter((x) => x.pid !== id);
  news('👋', `Vous mettez fin au mandat de ${p.n}.`); save();
}

function buyOffice() {
  const next = OFFICES[S.office + 1];
  if (!next) return { ok: false, msg: 'Niveau maximum atteint.' };
  if (S.cash < next.cost) return { ok: false, msg: 'Pas assez de liquidités.' };
  S.cash -= next.cost; S.office++; S.actions += next.actions - OFFICES[S.office - 1].actions; addRep(2);
  news('🏢', `L'agence déménage : ${next.name}. ${next.maxClients} clients max, ${next.actions} actions par semaine.`);
  save();
  return { ok: true, msg: `Bienvenue dans vos nouveaux locaux : ${next.name} !` };
}

function hireStaff(k) {
  const st = STAFF[k];
  if (S.staff[k]) { S.staff[k] = false; save(); return { ok: true, msg: `${st.name} licencié.` }; }
  if (S.cash < st.cost) return { ok: false, msg: 'Pas assez de liquidités.' };
  S.cash -= st.cost; S.staff[k] = true; save();
  return { ok: true, msg: `${st.name} engagé !` };
}

/* ---------- Simulation hebdomadaire ---------- */
const GROWTH_K = { 15: 0.34, 16: 0.34, 17: 0.34, 18: 0.32, 19: 0.28, 20: 0.24, 21: 0.2, 22: 0.15, 23: 0.11, 24: 0.08, 25: 0.04, 26: 0.04, 27: 0.04 };

/* ---------- Championnats : calendrier, matchs, classements ---------- */
function newTables() {
  S.tab = {}; S.form = {}; S.res = {}; S.wk = [];
  CLUB_IDS.forEach((id) => { S.tab[id] = [0, 0, 0, 0, 0, 0]; S.form[id] = rnd(-3, 3); }); // J G N P BP BC
}
const leagueRounds = (lg) => { const n = CLUB_LIST[lg].length; return (n >= 16 ? 2 : 3) * (n - 1); };

/* Journée r d'un championnat (méthode du cercle), sous forme de paires [domicile, extérieur] */
function fixtures(lg, r) {
  const ids = clubsOf(lg).map((c) => c.id), n = ids.length, base = r % (n - 1), leg = Math.floor(r / (n - 1));
  const list = [ids[0]];
  for (let i = 0; i < n - 1; i++) list.push(ids[1 + (i + base) % (n - 1)]);
  const out = [];
  for (let i = 0; i < n / 2; i++) {
    const a = list[i], b = list[n - 1 - i];
    out.push(((base + i + leg) % 2 === 0) ? [a, b] : [b, a]);
  }
  return out;
}
function poisson(l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }
const pts = (t) => t[1] * 3 + t[2];
function standings(lg) {
  return clubsOf(lg).map((c) => ({ c, t: S.tab[c.id] }))
    .sort((a, b) => pts(b.t) - pts(a.t) || (b.t[4] - b.t[5]) - (a.t[4] - a.t[5]) || b.t[4] - a.t[4] || b.c.rep - a.c.rep);
}

/* Joue la journée de la semaine dans tous les championnats ; renvoie le résultat par club */
function playMatchday() {
  const md = S.week - 2, byClub = {};
  for (const lg in LEAGUES) {
    if (md < 0 || md >= leagueRounds(lg)) { S.res[lg] = null; continue; }
    S.res[lg] = fixtures(lg, md).map(([h, a]) => {
      const d = (CLUBS[h].rep + S.form[h]) - (CLUBS[a].rep + S.form[a]);
      const gh = poisson(clamp(1.5 * Math.exp(d / 22), 0.3, 3.6)), ga = poisson(clamp(1.15 * Math.exp(-d / 22), 0.25, 3.2));
      const th = S.tab[h], ta = S.tab[a];
      th[0]++; ta[0]++; th[4] += gh; th[5] += ga; ta[4] += ga; ta[5] += gh;
      if (gh > ga) { th[1]++; ta[3]++; } else if (gh < ga) { ta[1]++; th[3]++; } else { th[2]++; ta[2]++; }
      byClub[h] = { opp: a, home: true, gf: gh, ga };
      byClub[a] = { opp: h, home: false, gf: ga, ga: gh };
      return [h, a, gh, ga];
    });
  }
  return byClub;
}

function simPlayer(p, res) {
  if (p.inj > 0) {
    p.inj--;
    if (res && p.mine) S.wk.push({ pid: p.id, out: 'Blessé', opp: res.opp, home: res.home, gf: res.gf, ga: res.ga });
    return;
  }
  const pp = playProb(p);
  const plays = res && Math.random() < pp;
  if (res && !plays) {
    if (p.mine) S.wk.push({ pid: p.id, out: 'Non utilisé', opp: res.opp, home: res.home, gf: res.gf, ga: res.ga });
  } else if (plays) {
    const lvl = clamp(p.ovr / CLUBS[p.club].rep, 0.6, 1.3), def = p.pos === 'GB' || p.pos === 'DEF';
    let g = 0, a = 0;
    for (let i = 0; i < res.gf; i++) {
      const r = Math.random();
      if (r < { GB: 0, DEF: 0.03, MIL: 0.08, ATT: 0.17 }[p.pos] * lvl) g++;
      else if (r > 1 - { GB: 0.005, DEF: 0.04, MIL: 0.12, ATT: 0.09 }[p.pos] * lvl) a++;
    }
    let n = (p.tr === 'lea' ? 6.55 : 6.3) + (p.ovr - (CLUBS[p.club].rep - 12)) / 25 + rnd(-0.9, 0.9) + g * 0.9 + a * 0.5
      + (res.gf > res.ga ? 0.3 : res.gf < res.ga ? -0.3 : 0);
    if (def) n += (res.ga === 0 ? 0.6 : 0) - Math.max(0, res.ga - 2) * 0.3;
    n = Math.round(clamp(n, 3, 10) * 10) / 10;
    p.m++; p.g += g; p.a += a; p.rs += n;
    if (def && res.ga === 0) p.cs++;
    if (p.mine) {
      const line = { pid: p.id, w: S.week, opp: res.opp, home: res.home, gf: res.gf, ga: res.ga, g, a, n };
      S.wk.push(line); p.log.unshift(line); if (p.log.length > 6) p.log.length = 6;
      p.morale = clamp(p.morale + (n >= 7.5 ? 0.4 : n < 5.5 ? -0.3 : 0), 0, 100);
      if (g >= 2 || n >= 9) news('⚽', `${p.n} brille avec ${CLUBS[p.club].name} contre ${CLUBS[res.opp].name} : ${g} but(s), ${a} passe(s), note ${n.toFixed(1)}.`);
    }
  }
  const k = GROWTH_K[p.age] || 0;
  if (k > 0 && p.ovr < p.pot) {
    const boost = (p.mine && S.staff.coach ? 1.15 : 1) * ({ pro: 1.15, amb: 1.08, fet: 0.9 }[p.tr] || 1);
    p.ovr = Math.min(p.pot, p.ovr + (p.pot - p.ovr) * k / 38 * (0.45 + 0.9 * pp) * rnd(0.4, 1.6) * boost);
  } else if (p.age >= 31) {
    p.ovr = Math.max(30, p.ovr - rnd(0.01, 0.08));
  }
}

function nextWeek() {
  if (S.over || S.event) return;
  S.t++; S.week++;
  S.wk = [];
  const results = playMatchday();
  S.players.forEach((p) => simPlayer(p, results[p.club]));

  const inc = weeklyIncome(), costs = weeklyCosts();
  earn(inc); S.cash -= costs; S.ss.costs += costs;

  S.offers = S.offers.filter((o) => {
    if (o.exp > S.t) return true;
    news('⌛', `L'offre de ${CLUBS[o.club].name} pour ${getP(o.pid).n} a expiré.`);
    return false;
  });

  const win = inWindow(S.week);
  clients().forEach((p) => {
    const pp = playProb(p);
    p.morale = clamp(p.morale + (pp < 0.3 ? (p.tr === 'amb' ? -2 : -1.2) : pp > 0.6 ? 0.5 : 0), 0, 100);

    if (p.inj === 0 && Math.random() < (S.staff.coach ? 0.006 : 0.012) * (p.tr === 'fra' ? 2 : 1)) {
      p.inj = rint(2, 10);
      news('🚑', `${p.n} se blesse : absent ${p.inj} semaines.`);
    }
    if (p.ovr >= 68 && Math.random() < 0.015) {
      const c = Math.round(baseValue(p.ovr) * 0.004 / 100) * 100;
      earn(c); news('👟', `${p.n} signe un contrat de sponsoring. Votre commission : ${fmt(c)}.`);
    }
    if (win && !p.loan && p.inj === 0 && Math.random() < 0.09 && !S.offers.some((o) => o.pid === p.id)) {
      const cands = CLUB_IDS.map((id) => CLUBS[id]).filter((c) => playerAccepts(p, c) && clubInterest(p, c) > 0.3 && !(p.rej[c.id] > S.t));
      if (cands.length) {
        const c = pick(cands), o = makeOffer(p, c, 0.95);
        S.offers.push(o);
        news('📨', `${c.name} fait une offre de ${fmt(o.fee)} pour ${p.n}.`);
      }
    }
    if (p.morale < 25 && p.tr !== 'loy' && Math.random() < 0.08) {
      p.mine = false; p.mandate = 0; p.cd = S.t + 40; addRep(-1);
      S.offers = S.offers.filter((o) => o.pid !== p.id);
      news('💔', `${p.n}, mécontent de sa situation, quitte l'agence pour un concurrent.`);
    } else if (p.morale < 30 && Math.random() < 0.2) {
      news('😠', `${p.n} est frustré (temps de jeu trop faible). Parlez-lui ou trouvez-lui un nouveau club.`);
    }
  });

  if (S.staff.scout && Math.random() < 0.3) {
    const c = S.players.filter((p) => !p.mine && canRecruit(p) && p.sc === 0 && p.pot >= 76);
    if (c.length) {
      const p = pick(c); p.sc = 1; setEstimate(p);
      news('🔎', `Votre scout recommande ${p.n} (${p.age} ans, ${p.pos}, ${CLUBS[p.club].name}) : potentiel estimé ${p.potLo}–${p.potHi}.`);
    }
  }

  if (S.week === 20) news('📅', 'Le mercato d\'hiver est ouvert (4 semaines).');
  if (S.week === 7 || S.week === 24) news('📅', 'Le mercato ferme ses portes.');

  if (S.week > SEASON_WEEKS) endSeason(); else maybeEvent();
  S.actions = office().actions;
  checkGoals();
  if (S.cash < -25000) {
    S.over = true;
    news('💀', 'FAILLITE : les dettes de l\'agence dépassent 25 000 €. La partie est terminée.');
  } else if (S.cash < 0) {
    news('⚠️', `Compte dans le rouge (${fmt(S.cash)}). Faillite à -25 k€ !`);
  }
  save();
}

/* Récompenses individuelles et sélections nationales de fin de saison */
function seasonAwards(cl) {
  const label = `${S.season}/${(S.season + 1) % 100}`, avg = (p) => (p.m ? p.rs / p.m : 0), bestYoung = {};
  cl.forEach((p) => {
    const lg = CLUBS[p.club].league, big = LEAGUES[lg].big;
    if (p.age <= 21 && p.m >= 15 && avg(p) >= 6.9 && (!bestYoung[lg] || avg(p) > avg(bestYoung[lg]))) bestYoung[lg] = p;
    if (p.g >= 14) {
      p.aw.unshift(`${label} : ${p.g} buts en ${LEAGUES[lg].name}`); addRep(big ? 1.5 : 0.6);
      news('👟', `${p.n} termine la saison avec ${p.g} buts en ${LEAGUES[lg].name}. Les recruteurs s'affolent.`);
    }
    if (!p.intl && p.ovr >= 76) {
      p.intl = true; p.morale = clamp(p.morale + 10, 0, 100); addRep(1);
      p.aw.unshift(`${label} : première sélection nationale`);
      news('🌍', `${p.n} est appelé pour la première fois en équipe nationale ! Sa valeur grimpe.`);
    }
  });
  for (const lg in bestYoung) {
    const p = bestYoung[lg], prize = Math.round(baseValue(p.ovr) * 0.003 / 100) * 100;
    p.aw.unshift(`${label} : meilleur espoir de ${LEAGUES[lg].name}`); addRep(LEAGUES[lg].big ? 1.5 : 0.6); earn(prize);
    news('🏅', `${p.n} est élu meilleur espoir de ${LEAGUES[lg].name} (note ${avg(p).toFixed(1)}). Prime : ${fmt(prize)}.`);
  }
}

/* Prestige des clubs selon leurs résultats, montées et descentes en Belgique */
function moveClubs(cl) {
  const st = {};
  for (const lg in LEAGUES) st[lg] = standings(lg).map((x) => x.c);
  for (const lg in LEAGUES) {
    const s = st[lg], n = s.length;
    setClub(s[0].id, s[0].rep + 1); setClub(s[n - 1].id, s[n - 1].rep - 1);
  }
  [['BE1', 'BE2'], ['BE2', 'BE3']].forEach(([hi, lo]) => {
    const down = st[hi].slice(-2), up = st[lo].slice(0, 2);
    down.forEach((c) => setClub(c.id, c.rep - 2, lo));
    up.forEach((c) => {
      setClub(c.id, c.rep + 2, hi);
      cl.filter((p) => p.club === c.id).forEach((p) => { p.aw.unshift(`Montée en ${LEAGUES[hi].name} avec ${c.name}`); p.morale = clamp(p.morale + 8, 0, 100); });
    });
    news('↕️', `${LEAGUES[hi].name} : ${up.map((c) => c.name).join(' et ')} montent, ${down.map((c) => c.name).join(' et ')} descendent.`);
  });
}

function endSeason() {
  const cl = clients();
  let repGain = 0;
  cl.forEach((p) => { repGain += p.ovr >= 85 ? 2 : p.ovr >= 75 ? 1 : p.ovr >= 65 ? 0.3 : 0; });
  repGain = Math.min(6, repGain);
  addRep(repGain);
  S.rivals.forEach((r) => { r.rep = clamp(r.rep + rnd(-1.5, 2), 10, 97); });
  const best = cl.slice().sort((a, b) => (b.ovr - b.o0) - (a.ovr - a.o0))[0];
  S.recap = {
    label: `${S.season}/${(S.season + 1) % 100}`, inc: S.ss.inc, costs: S.ss.costs,
    tr: S.stats.transfers - S.ss.tr0, rep0: S.ss.rep0, rep1: S.rep, rank: agencyRank(), clients: cl.length,
    best: best && best.ovr - best.o0 >= 1 ? `${best.n} (+${Math.floor(best.ovr - best.o0)})` : null,
  };
  news('🎉', `Fin de la saison ${S.season}/${(S.season + 1) % 100}. ${cl.length} client(s), réputation +${repGain.toFixed(1)}.`);

  // Champions et historique des saisons
  const label = `${S.season}/${(S.season + 1) % 100}`, champs = {};
  for (const lg in LEAGUES) champs[standings(lg)[0].c.id] = lg;
  news('🏆', 'Champions : ' + ['BE1', 'ENG', 'ESP', 'ITA', 'GER', 'FRA'].map((lg) => `${LEAGUES[lg].flag} ${standings(lg)[0].c.name}`).join(' · ') + '.');
  cl.forEach((p) => {
    p.sh.unshift({ s: label, club: CLUBS[p.club].name, m: p.m, g: p.g, a: p.a, avg: p.m ? p.rs / p.m : 0 });
    if (champs[p.club] && p.m >= 8) {
      addRep(LEAGUES[champs[p.club]].big ? 2 : 0.8);
      p.aw.unshift(`${label} : champion de ${LEAGUES[champs[p.club]].name}`);
      news('🥇', `${p.n} est champion avec ${CLUBS[p.club].name} (${LEAGUES[champs[p.club]].name}) !`);
    }
  });
  seasonAwards(cl);
  moveClubs(cl);
  newTables();

  S.players.forEach((p) => {
    p.age++; p.cy--; p.m = 0; p.g = 0; p.a = 0; p.rs = 0; p.cs = 0; p.log = []; p.o0 = p.ovr;
    if (p.loan) {
      p.club = p.loan.back; p.loan = null;
      if (p.mine) news('🔁', `${p.n} rentre de prêt à ${CLUBS[p.club].name}.`);
    }
    if (p.cy <= 0) {
      p.cy = rint(2, 3);
      const fair = fairSalary(p, CLUBS[p.club]);
      if (fair > p.sal) {
        p.sal = fair;
        if (p.mine) news('📝', `${p.n} prolonge à ${CLUBS[p.club].name} : ${fmt(p.sal)}/sem.`);
      }
    }
    if (p.mine) {
      p.mandate--;
      if (p.age >= 35) {
        p.mine = false; news('🎖️', `${p.n} prend sa retraite. Merci pour tout !`);
      } else if (p.mandate <= 0) {
        if (p.morale >= 40 || p.tr === 'loy') { p.mandate = 3; news('✍️', `${p.n} renouvelle son mandat avec l'agence pour 3 saisons.`); }
        else { p.mine = false; p.cd = S.t + 40; news('💔', `${p.n} ne renouvelle pas son mandat et quitte l'agence.`); }
      }
    }
  });

  // Renouvellement du marché des jeunes
  S.players = S.players.filter((p) => p.mine || p.age <= 22);
  for (const c in MARKET_SIZE) {
    const n = S.players.filter((p) => !p.mine && p.nat === c).length;
    for (let i = n; i < MARKET_SIZE[c]; i++) S.players.push(genPlayer(c, 16, 18));
  }
  S.season++; S.week = 1; S.ss = newSeasonStats();
  news('📅', `Début de la saison ${S.season}/${(S.season + 1) % 100}. Le mercato d'été est ouvert (6 semaines).`);
}
