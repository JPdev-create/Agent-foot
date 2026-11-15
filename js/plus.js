/* Niveau d'agent et talents, demandes des clubs, clauses de transfert, événements supplémentaires */
'use strict';

/* ---------- Niveau d'agent et talents ---------- */
const TALENTS = {
  oeil: { i: '👁️', n: 'Œil de lynx', d: '1 observation gratuite par semaine et par rang.', max: 3 },
  charme: { i: '😎', n: 'Charisme', d: '+6 % de chances de signer un joueur par rang.', max: 3 },
  requin: { i: '🦈', n: 'Requin', d: '+4 % sur les indemnités par rang et négociations plus sûres.', max: 3 },
  reseau: { i: '📇', n: 'Carnet d\'adresses', d: 'Les clubs répondent plus souvent à vos propositions (+10 % par rang).', max: 3 },
  mentor: { i: '🧑‍🏫', n: 'Mentor', d: '+5 % de progression par rang pour vos clients, et un meilleur moral.', max: 3 },
  image: { i: '📸', n: 'Droits d\'image', d: 'Nouveaux contrats de sponsoring : +20 % de revenus et plus de chances par rang.', max: 3 },
  gestion: { i: '🧮', n: 'Gestionnaire', d: '−8 % de frais hebdomadaires par rang.', max: 3 },
  energie: { i: '⚡', n: 'Hyperactif', d: '+1 action par semaine par rang.', max: 2, req: [5, 12] },
};
const MAX_LVL = 20;
const AGENT_TITLES = ['Débutant', 'Apprenti', 'Agent licencié', 'Agent confirmé', 'Fin négociateur', 'Agent réputé', 'Faiseur de carrières', 'Super-agent', 'Agent star', 'Légende du métier'];
const agentTitle = () => AGENT_TITLES[Math.min(AGENT_TITLES.length - 1, Math.floor((S.ag.lvl - 1) / 2))];
const tal = (k) => (S && S.ag && S.ag.t[k]) || 0;
const xpNeed = (l) => Math.round(60 * Math.pow(l, 1.4) / 10) * 10;
const maxActions = () => office().actions + tal('energie');

function addXp(x) {
  const a = S.ag;
  if (!a || a.lvl >= MAX_LVL) return;
  a.xp += Math.round(x);
  while (a.lvl < MAX_LVL && a.xp >= xpNeed(a.lvl)) {
    a.xp -= xpNeed(a.lvl); a.lvl++; a.pts++; a.up = true;
    news('🎓', `Vous passez agent de niveau ${a.lvl} (${agentTitle()}) : 1 point de talent à dépenser dans Agence → Agent.`);
  }
  if (a.lvl >= MAX_LVL) a.xp = 0;
}

const talentLock = (k) => {
  const T = TALENTS[k], r = tal(k);
  if (r >= T.max) return 'Maximum atteint';
  if (T.req && S.ag.lvl < T.req[r]) return `Niveau ${T.req[r]} requis`;
  return '';
};
function learnTalent(k) {
  const T = TALENTS[k];
  if (!T) return { ok: false, msg: 'Talent inconnu.' };
  if (S.ag.pts < 1) return { ok: false, msg: 'Aucun point de talent disponible.' };
  const lock = talentLock(k);
  if (lock) return { ok: false, msg: lock + '.' };
  S.ag.pts--; S.ag.t[k] = tal(k) + 1;
  if (k === 'energie') S.actions++;
  if (k === 'oeil') S.ag.fs++;
  save();
  return { ok: true, msg: `${T.i} ${T.n} : rang ${S.ag.t[k]}/${T.max}.` };
}

/* ---------- Demandes des clubs (à chaque mercato) ---------- */
function newBriefs() {
  const out = [], seen = {}, cl = clients().filter((p) => !p.loan && !p.free);
  const n = 3 + Math.min(3, S.office);
  const add = (c, pos, age, ovr) => {
    if (seen[c.id] || out.length >= n) return;
    seen[c.id] = 1;
    out.push({ id: S.nextId++, club: c.id, pos, age, ovr });
  };
  // Une partie des demandes vise le profil de vos clients…
  cl.slice().sort(() => Math.random() - 0.5).slice(0, Math.ceil(n / 2)).forEach((p) => {
    const r0 = CLUBS[p.club].rep;
    const cands = CLUB_IDS.map((id) => CLUBS[id]).filter((c) => c.rep >= r0 + 2 && c.rep <= r0 + 14 && p.ovr >= c.rep - 17 && !isMyClub(c.id));
    if (cands.length) add(pick(cands), p.pos, p.age + rint(0, 2), Math.floor(p.ovr) - rint(0, 2));
  });
  // … les autres sont des besoins du marché : à vous de trouver le bon profil
  const top = clamp(56 + S.rep * 0.42, 56, 96);
  const pool = CLUB_IDS.map((id) => CLUBS[id]).filter((c) => c.rep >= 44 && c.rep <= top && !isMyClub(c.id));
  for (let i = 0; i < 30 && out.length < n; i++) {
    const c = pick(pool), r = Math.random();
    add(c, r < 0.1 ? 'GB' : r < 0.4 ? 'DEF' : r < 0.7 ? 'MIL' : 'ATT', rint(19, 24), c.rep - rint(13, 17));
  }
  S.briefs = out;
  if (out.length) news('📋', `${out.length} clubs publient leurs besoins pour ce mercato : consultez les demandes des clubs sur l'accueil.`);
}
const briefFits = (b, p) => p.mine && !p.loan && p.inj === 0 && p.pos === b.pos && p.age <= b.age && Math.floor(p.ovr) >= b.ovr
  && p.club !== b.club && playerAccepts(p, CLUBS[b.club]) && !S.offers.some((o) => o.pid === p.id && o.club === b.club);
const briefFor = (p, clubId) => (S.briefs || []).find((b) => b.club === clubId && briefFits(b, p));
const briefTxt = (b) => `${POSITIONS[b.pos]} · ${b.age} ans max · niveau ${b.ovr}+`;
function briefDone(o, p) {
  const b = (S.briefs || []).find((x) => x.id === o.brief);
  if (!b) return;
  S.briefs = S.briefs.filter((x) => x !== b);
  S.stats.briefs = (S.stats.briefs || 0) + 1;
  addRel(o.club, 10); addRep(0.5); addXp(50);
  news('📋', `Demande honorée : ${CLUBS[o.club].name} cherchait un ${POSITIONS[b.pos].toLowerCase()}, vous lui apportez ${p.n}. Le club s'en souviendra.`);
}

/* ---------- Clauses de transfert ---------- */
const DEALS = {
  cash: { i: '💶', n: 'Comptant', d: 'Toute la commission tout de suite.' },
  so: { i: '📈', n: 'Revente', d: 'Commission −25 % aujourd\'hui, mais 15 % au lieu de 10 % sur son prochain transfert (valable 3 saisons).' },
  perf: { i: '🎯', n: 'Primes', d: 'Commission −25 % aujourd\'hui, mais une prime à chaque match joué (doublée s\'il marque) pendant 2 saisons.' },
};
const SO_RATE = 0.15;
const hasSellOn = (p) => !!(p.so && p.so > S.season);
const offerRate = (p) => (hasSellOn(p) ? SO_RATE : commissionTransfer());
/* Commission touchée immédiatement selon la formule choisie */
function offerCom(o, p) {
  if (o.free) return o.bonus;
  const full = Math.round(o.fee * offerRate(p));
  return o.deal && o.deal !== 'cash' ? Math.round(full * 0.75) : full;
}
const perfPrime = (o, p) => Math.max(10, Math.round(o.fee * offerRate(p) * 0.01 / 10) * 10);
function setDeal(oid, k) {
  const o = S.offers.find((x) => x.id === oid);
  if (o && !o.free && DEALS[k]) { o.deal = k; save(); }
}
/* Appelé à la conclusion d'un transfert, après le calcul de la commission */
function applyDeal(o, p) {
  const pr = perfPrime(o, p);
  p.so = 0;
  if (o.free || !o.deal || o.deal === 'cash') return;
  S.flags.clause = 1;
  if (o.deal === 'so') p.so = S.season + 3;
  else p.pf = { a: pr, end: S.season + 2, s: 0 };
}
/* Prime de performance versée après un match joué */
function perfBonus(p, g) {
  if (!p.pf || !p.mine) return;
  const x = p.pf.a * (g > 0 ? 2 : 1);
  earn(x); p.pf.s += x;
}
function perfSeasonEnd(p) {
  if (!p.pf) return;
  if (p.mine && p.pf.s > 0) { ledger('🎯', `Primes de performance : ${p.n}`, p.pf.s); news('🎯', `Primes de performance de ${p.n} cette saison : ${fmt(p.pf.s)}.`); }
  p.pf.s = 0;
  if (S.season + 1 >= p.pf.end || !p.mine) p.pf = null;
}

/* ---------- Événements supplémentaires ---------- */
const hyped = (p) => p.hype > S.t;
const EVX = {
  docu: {
    ok: (p) => p.ovr >= 60,
    price: (e) => e.c * 3,
    view: (e, p) => ({ title: 'Un documentaire', text: `Une plateforme de streaming veut tourner un documentaire sur le quotidien de ${p.n} et de son agent.`,
      choices: [`Coproduire pour garder la main (${fmt(e.c * 3)})`, 'Laisser tourner librement', 'Refuser les caméras'] }),
    res: (e, p, i, h) => {
      if (i === 0) { if (!h.pay(e.c * 3)) return h.broke; addRep(2); p.fol = Math.round((p.fol || 0) * 1.3 + 20000); h.mor(5); return { ok: true, msg: 'Un film soigné : l\'agence et le joueur gagnent en notoriété.' }; }
      if (i === 2) return { ok: true, msg: 'Pas de caméras, pas de vagues.' };
      if (Math.random() < 0.6) { addRep(1); p.fol = Math.round((p.fol || 0) * 1.2 + 10000); return { ok: true, msg: 'Le documentaire plaît beaucoup au public.' }; }
      addRep(-0.8); h.mor(-8); return { ok: false, msg: `Le montage ridiculise ${p.n} : il est furieux.` };
    },
  },
  pub: {
    ok: (p) => p.ovr >= 62 && !p.loan,
    view: (e, p) => ({ title: 'Une publicité tapageuse', text: `Une marque de boissons énergisantes offre un gros chèque à ${p.n} pour une campagne provocante. Son club n'aimerait pas du tout.`,
      choices: [`Accepter le chèque (+${fmt(e.c * 5)})`, 'Refuser : l\'image avant tout'] }),
    res: (e, p, i, h) => {
      if (i === 1) { h.mor(-3); addRel(p.club, 4); return { ok: true, msg: 'Le club apprécie votre sérieux.' }; }
      earn(e.c * 5); ledger('🥤', `Campagne publicitaire : ${p.n}`, e.c * 5); addRel(p.club, -8);
      if (Math.random() < 0.35) { addRep(-1); return { ok: false, msg: `Chèque encaissé (${fmt(e.c * 5)}), mais la campagne fait scandale.` }; }
      return { ok: true, msg: `Chèque encaissé : ${fmt(e.c * 5)}. Le club grince des dents.` };
    },
  },
  parrain: {
    ok: (p) => p.age >= 27 && clients().some((q) => q.age <= 21 && q.id !== p.id && q.ovr < q.pot),
    init: (p) => ({ p2: pick(clients().filter((q) => q.age <= 21 && q.id !== p.id && q.ovr < q.pot)).id }),
    price: (e) => e.c,
    view: (e, p) => { const q = getP(e.p2) || p; return { title: 'Un parrain dans l\'écurie', text: `${p.n} propose de prendre ${q.n} sous son aile pendant la trêve : conseils, séances communes, hygiène de vie.`,
      choices: [`Organiser le stage commun (${fmt(e.c)})`, 'Pas le temps cette saison'] }; },
    res: (e, p, i, h) => {
      const q = getP(e.p2);
      if (i === 1 || !q) { h.mor(-2); return { ok: true, msg: 'Ce sera pour une autre fois.' }; }
      if (!h.pay(e.c)) return h.broke;
      q.ovr = Math.min(q.pot, q.ovr + rnd(0.5, 1.1)); q.morale = clamp(q.morale + 8, 0, 100); h.mor(8);
      return { ok: true, msg: `${q.n} progresse au contact de ${p.n}.` };
    },
  },
  transfuge: {
    ok: () => clients().length < office().maxClients && S.rep >= 12,
    init: () => {
      const nat = S.office >= INTL_OFFICE ? pick(Object.keys(MARKET_SIZE)) : 'BE';
      const q = genPlayer(nat, 18, 21, rnd(8, 16));
      q.sc = 1; setEstimate(q); S.players.push(q);
      return { p2: q.id };
    },
    price: (e) => { const q = getP(e.p2); return q ? signBonusCost(q, 2) : 0; },
    view: (e) => { const q = getP(e.p2); return { title: 'Un transfuge frappe à la porte', text: `${q.n} (${q.age} ans, ${POSITIONS[q.pos].toLowerCase()}, niveau ${Math.floor(q.ovr)}, potentiel ${q.potLo}–${q.potHi}, ${CLUBS[q.club].name}) est déçu par ${e.by} et veut rejoindre votre agence.`,
      choices: [`L'accueillir avec une prime (${fmt(signBonusCost(q, 2))})`, 'Décliner'] }; },
    res: (e, p, i, h) => {
      const q = getP(e.p2);
      if (i === 1 || !q) return { ok: true, msg: 'Vous déclinez poliment.' };
      if (clients().length >= office().maxClients) return { ok: false, msg: 'Agence pleine : impossible de l\'accueillir.', stay: true };
      const cost = signBonusCost(q, 2);
      if (S.cash < cost) return h.broke;
      S.cash -= cost; ledger('✍️', `Prime de signature : ${q.n}`, -cost);
      q.mine = true; q.mandate = 3; q.morale = 80; q.o0 = q.ovr; q.com = COMMISSION_SALARY; q.vh = [{ v: playerValue(q) }]; q.dream = newDream(q); q.cov = null;
      S.ss.sign = (S.ss.sign || 0) + 1; addRep(0.5); addXp(25);
      news('✍️', `${q.n} quitte ${e.by} et signe un mandat de 3 saisons avec l'agence.`);
      return { ok: true, msg: `${q.n} rejoint l'agence !` };
    },
  },
  fisc: {
    ok: () => S.ss.inc >= 20000,
    price: (e) => e.c * 2,
    view: (e) => ({ title: 'Contrôle fiscal', text: 'L\'administration épluche les comptes de l\'agence. Tout est sans doute en règle… sans doute.',
      choices: [`Engager un fiscaliste (${fmt(e.c * 2)})`, 'Gérer le contrôle vous-même'] }),
    res: (e, p, i, h) => {
      if (i === 0) { if (!h.pay(e.c * 2)) return h.broke; addRep(0.3); return { ok: true, msg: 'Contrôle bouclé sans la moindre remarque.' }; }
      if (Math.random() < 0.5) return { ok: true, msg: 'Rien à signaler : vous avez eu chaud.' };
      S.cash -= e.c * 6; ledger('🧾', 'Redressement fiscal', -e.c * 6); addRep(-1);
      return { ok: false, msg: `Redressement : ${fmt(e.c * 6)} d'amende et une mauvaise presse.` };
    },
  },
  rumeur: {
    ok: (p) => !p.loan && !p.free && !hyped(p) && p.ovr >= 55,
    view: (e, p) => ({ title: 'La rumeur enfle', text: `Un journaliste vous demande si de grands clubs suivent ${p.n}. Un mot de vous et la machine s'emballe.`,
      choices: ['Alimenter la rumeur', 'Démentir fermement'] }),
    res: (e, p, i, h) => {
      if (i === 1) { addRel(p.club, 5); return { ok: true, msg: `${CLUBS[p.club].name} apprécie votre discrétion.` }; }
      if (Math.random() < 0.55) { p.hype = S.t + 14; p.fol = Math.round((p.fol || 0) * 1.15 + 4000); h.mor(4); return { ok: true, msg: `${p.n} fait la une : sa cote grimpe pendant 14 semaines (clubs plus intéressés, offres plus hautes).` }; }
      addRel(p.club, -10); h.mor(-6); return { ok: false, msg: `Son club dément sèchement et ${p.n} est sifflé à l'entraînement.` };
    },
  },
};

/* ---------- Portrait d'un joueur (dessin vectoriel déterministe) ---------- */
const SKINS = ['#f6d3b3', '#eec39a', '#d9a273', '#b97d4f', '#8d5a36', '#5f3b24'];
const HAIRS = ['#1b1512', '#2e1f14', '#5a3a1e', '#8a5a2b', '#c99a4a', '#3a3a3a'];
function avatar(p) {
  const h = hashStr(p.n + '#' + p.nat), hc = hashStr(CLUB_DEFAULT[p.club] ? p.club : 'x');
  const skin = SKINS[h % SKINS.length], hair = HAIRS[(h >>> 4) % HAIRS.length], style = (h >>> 8) % 5;
  const hue = hc % 360, j1 = `hsl(${hue} 62% 46%)`, j2 = `hsl(${(hue + (hc >>> 9) % 60 + 150) % 360} 55% ${(hc >>> 5) % 2 ? 88 : 22}%)`;
  const hairs = [
    `<path d="M17 25c-1-12 7-17 15-17s16 5 15 17c-2-6-6-9-15-9s-13 3-15 9z" fill="${hair}"/>`,
    `<path d="M16 27c-2-15 7-20 16-20s18 5 16 20c-1-8-4-12-8-13-5 3-17 3-21 1-2 3-3 7-3 12z" fill="${hair}"/>`,
    `<path d="M18 22c0-9 6-13 14-13s14 4 14 13c-3-4-8-6-14-6s-11 2-14 6z" fill="${hair}" opacity=".55"/>`,
    `<path d="M15 26c-3-13 5-21 17-21s20 8 17 21c-1-5-3-8-5-10-1 2-3 3-5 2-2 2-5 2-7 0-2 2-5 2-7 0-2 1-4 0-5-2-2 2-4 5-5 10z" fill="${hair}"/>`,
    `<path d="M17 24c0-10 7-15 15-15s15 5 15 15c-2-4-4-6-6-7l-9-6-9 6c-2 1-4 3-6 7z" fill="${hair}"/><rect x="29" y="4" width="6" height="9" rx="3" fill="${hair}"/>`,
  ];
  const beard = (h >>> 12) % 4 === 0 && p.age >= 21 ? `<path d="M21 33c1 9 6 13 11 13s10-4 11-13c-3 5-7 7-11 7s-8-2-11-7z" fill="${hair}" opacity=".8"/>` : '';
  return `<svg class="avatar" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="18" fill="${j1}" opacity=".22"/>
    <path d="M8 64c1-12 10-17 24-17s23 5 24 17z" fill="${j1}"/><path d="M26 47h12l-6 8z" fill="${j2}"/><path d="M8 64c.4-5 2-9 5-11l3 11zM56 64c-.4-5-2-9-5-11l-3 11z" fill="${j2}" opacity=".8"/>
    <rect x="27" y="38" width="10" height="11" rx="4" fill="${skin}"/><ellipse cx="32" cy="27" rx="13" ry="15" fill="${skin}"/>
    <ellipse cx="18.5" cy="28" rx="2.4" ry="3.6" fill="${skin}"/><ellipse cx="45.5" cy="28" rx="2.4" ry="3.6" fill="${skin}"/>${beard}${hairs[style]}
    <circle cx="26.5" cy="27.5" r="1.7" fill="#1c1c1c"/><circle cx="37.5" cy="27.5" r="1.7" fill="#1c1c1c"/>
    <path d="M27 35q5 ${p.morale < 35 ? -3 : p.morale >= 60 ? 4 : 1} 10 0" stroke="#3a2218" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
}
