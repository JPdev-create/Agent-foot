/* Fin de saison : cérémonie des trophées, tournoi international, missions, panthéon */
'use strict';

const seasonLabel = () => `${S.season}/${(S.season + 1) % 100}`;
const fmtFol = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' k' : String(Math.round(n)));

/* ---------- Missions de la saison ---------- */
const MISSIONS = {
  tr: { t: (n) => `Réaliser ${n} transferts`, n: (o) => 2 + Math.floor(o / 2), prog: () => S.stats.transfers - S.ss.tr0 },
  sign: { t: (n) => `Signer ${n} nouveaux clients`, n: (o) => 2 + (o >= 3 ? 1 : 0), prog: () => S.ss.sign || 0 },
  goals: { t: (n) => `Vos clients marquent ${n} buts`, n: (o) => 8 + o * 10, prog: () => clients().reduce((s, p) => s + p.g + (p.eg || 0), 0) },
  earn: { t: (n) => `Encaisser ${fmt(n)} de revenus`, n: (o) => [25000, 100000, 500000, 2500000, 10000000][o], prog: () => Math.round(S.ss.inc), money: true },
  club: { t: (n) => `Placer un joueur dans un club de prestige ${n}+`, n: (o) => 62 + o * 7, prog: () => S.ss.maxRep || 0 },
  spons: { t: (n) => `Signer ${n} contrat(s) de sponsoring`, n: (o) => 1 + Math.floor(o / 2), prog: () => S.ss.spons || 0, min: 1 },
  rep: { t: (n) => `Gagner ${n} points de réputation`, n: (o) => 4 + o, prog: () => Math.max(0, Math.floor(S.rep - S.ss.rep0)) },
};
const missionReward = () => [5000, 20000, 100000, 400000, 1500000][S.office];

function newMissions() {
  const keys = Object.keys(MISSIONS).filter((k) => !(MISSIONS[k].min > S.office) && !(k === 'rep' && S.rep > 88)).sort(() => Math.random() - 0.5).slice(0, 3);
  S.mis = keys.map((k) => ({ k, n: MISSIONS[k].n(S.office), r: missionReward(), done: false }));
}

function checkMissions() {
  if (!S.mis) return;
  S.mis.forEach((m) => {
    if (m.done || MISSIONS[m.k].prog() < m.n) return;
    m.done = true; S.cash += m.r; addRep(0.5); ledger('🎯', `Mission : ${MISSIONS[m.k].t(m.n)}`, m.r);
    news('🎯', `Mission accomplie : ${MISSIONS[m.k].t(m.n)}. Prime : ${fmt(m.r)}.`);
  });
}

/* ---------- Panthéon de l'agence ---------- */
function toHof(p, why) {
  if (!S.hof) S.hof = [];
  if (!(p.aw.length || p.hist.length >= 2 || p.ovr >= 72)) return;
  S.hof.unshift({
    n: p.n, pos: p.pos, nat: p.nat, ovr: Math.floor(p.ovr), club: CLUBS[p.club].name,
    aw: p.aw.length, tr: p.hist.length, s: seasonLabel(), why, top: p.aw.slice(0, 3),
  });
  if (S.hof.length > 30) S.hof.length = 30;
}

/* ---------- Tournoi international (Coupe du monde / Euro, une saison sur deux) ---------- */
const NATIONS = {
  FR: ['France', '🇫🇷', 90], ES: ['Espagne', '🇪🇸', 89], EN: ['Angleterre', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 88], DE: ['Allemagne', '🇩🇪', 87],
  BE: ['Belgique', '🇧🇪', 84], IT: ['Italie', '🇮🇹', 85], PT: ['Portugal', '🇵🇹', 86], NL: ['Pays-Bas', '🇳🇱', 85],
  BR: ['Brésil', '🇧🇷', 90], AR: ['Argentine', '🇦🇷', 90], HR: ['Croatie', '🇭🇷', 84], MA: ['Maroc', '🇲🇦', 82],
  UY: ['Uruguay', '🇺🇾', 82], CO: ['Colombie', '🇨🇴', 81], JP: ['Japon', '🇯🇵', 79], US: ['États-Unis', '🇺🇸', 79],
  CH: ['Suisse', '🇨🇭', 81], DK: ['Danemark', '🇩🇰', 81], AT: ['Autriche', '🇦🇹', 80], TR: ['Turquie', '🇹🇷', 79],
  PL: ['Pologne', '🇵🇱', 78], RS: ['Serbie', '🇷🇸', 78], SC: ['Écosse', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 76],
};
const TOUR_TEAMS = {
  'Coupe du monde': ['FR', 'ES', 'EN', 'DE', 'BE', 'IT', 'PT', 'NL', 'BR', 'AR', 'HR', 'MA', 'UY', 'CO', 'JP', 'US'],
  Euro: ['FR', 'ES', 'EN', 'DE', 'BE', 'IT', 'PT', 'NL', 'HR', 'CH', 'DK', 'AT', 'TR', 'PL', 'RS', 'SC'],
};
const TOUR_ROUNDS = ['8es de finale', 'Quarts de finale', 'Demi-finales', 'Finale'];
const tourName = (season) => (season % 4 === 2 ? 'Coupe du monde' : season % 4 === 0 ? 'Euro' : null);

function playTournament() {
  const name = tourName(S.season);
  if (!name) return null;
  const teams = TOUR_TEAMS[name].slice().sort(() => Math.random() - 0.5), year0 = S.season + 1;
  let alive = teams.slice();
  const rounds = [];
  while (alive.length > 1) {
    const next = [], ties = [];
    for (let i = 0; i < alive.length; i += 2) {
      const a = alive[i], b = alive[i + 1], [ga, gb, pen] = intlMatch(a, b, `${name} ${year0}`, true);
      const w = ga > gb || pen === 1 ? a : b;
      ties.push([a, b, ga, gb, pen]); next.push(w);
    }
    rounds.push(ties); alive = next;
  }
  const champ = alive[0], year = S.season + 1, label = `${name} ${year}`;
  const final = rounds[rounds.length - 1][0];
  news('🌍', `${label} : ${NATIONS[final[0]][0]} ${final[2]}-${final[3]} ${NATIONS[final[1]][0]}${final[4] ? ' (t.a.b.)' : ''}. ${NATIONS[champ][1]} ${NATIONS[champ][0]} est sacrée !`);
  const heroes = [];
  clients().filter((p) => p.intl && teams.includes(p.nat)).forEach((p) => {
    if (p.nat === champ) {
      p.aw.unshift(`Vainqueur de la ${label}`); addRep(4); S.stats.troph++; p.morale = 100;
      p.fol = Math.round((p.fol || 0) * 1.5 + 50000);
      heroes.push(p.n);
      news('🏆', `${p.n} remporte la ${label} avec ${NATIONS[champ][0]} !`);
    } else {
      p.aw.unshift(`Participation à la ${label}`);
    }
  });
  if (!S.intl) S.intl = { nl: null, last: null };
  S.intl.last = { label, champ, rounds, kind: name, season: S.season };
  return { label, champ, rounds, heroes };
}

/* ---------- Cérémonie des trophées ---------- */
function nominees(list, n) {
  return list.sort((a, b) => b.v - a.v).slice(0, n || 5);
}

function buildCeremony(champs, label, cl) {
  const slides = [], mine = [];
  const award = (o) => { slides.push(Object.assign({ k: 'award', win: 0 }, o)); };
  const prize = (x) => Math.round(x / 100) * 100;

  slides.push({ k: 'intro', title: `Cérémonie des trophées ${label}`, icon: '🎬',
    sub: `En direct du Palais des Sports. ${cl.length} client(s) de ${S.agency.name} sont dans la salle…` });

  // Palmarès des compétitions
  const rows = ['BE1', 'NED', 'POR', 'ENG', 'ESP', 'ITA', 'GER', 'FRA'].map((lg) => {
    const id = Object.keys(champs).find((c) => champs[c] === lg);
    return { i: LEAGUES[lg].flag, l: LEAGUES[lg].name, v: (isMyClub(id) ? '🏛️ ' : '') + CLUBS[id].name, mine: cl.some((p) => p.club === id) || isMyClub(id) };
  });
  if (S.intl && S.intl.nl && S.intl.nl.season === S.season && S.intl.nl.champ) rows.push({ i: NATIONS[S.intl.nl.champ][1], l: 'Ligue des nations', v: NATIONS[S.intl.nl.champ][0], mine: cl.some((p) => p.intl && p.nat === S.intl.nl.champ) });
  ['C1', 'C3', 'BC'].forEach((k) => { if (S.eu[k].champ) rows.push({ i: EU[k].icon, l: EU[k].name, v: CLUBS[S.eu[k].champ].name, mine: cl.some((p) => p.club === S.eu[k].champ) }); });
  slides.push({ k: 'list', title: 'Le palmarès de la saison', icon: '🏟️', rows });

  // Révélation de l'année (progression de vos clients)
  const prog = cl.filter((p) => p.ovr - p.o0 >= 1).map((p) => ({ n: p.n, club: CLUBS[p.club].name, v: p.ovr - p.o0, txt: `+${Math.floor(p.ovr - p.o0)} de niveau`, mine: true, pid: p.id }));
  if (prog.length >= 2) {
    const noms = nominees(prog, 4), w = getP(noms[0].pid);
    w.aw.unshift(`${label} : révélation de l'agence`); w.morale = clamp(w.morale + 10, 0, 100);
    mine.push(`🚀 ${w.n} — révélation de l'agence`);
    award({ title: 'Révélation de l\'agence', icon: '🚀', sub: 'Le client qui a le plus progressé cette saison', noms });
  }

  // Golden Boy : meilleur joueur de 21 ans ou moins
  const young = S.players.filter((p) => p.age <= 21 && p.m >= 10).map((p) => {
    const big = LEAGUES[CLUBS[p.club].league].big;
    return { n: p.n, club: CLUBS[p.club].name, v: p.ovr + (p.rs / p.m - 6.5) * 8 + p.g * 0.8 + p.a * 0.4 + (big ? 4 : 0), txt: `${p.g} b · ${p.a} pd · note ${(p.rs / p.m).toFixed(1)}`, mine: p.mine, pid: p.id };
  });
  for (let i = 0; i < 4; i++) {
    const c = pick(['ENG', 'ESP', 'ITA', 'GER', 'FRA'].flatMap((lg) => clubsOf(lg).filter((x) => x.rep >= 84)));
    const g = rint(4, 18);
    young.push({ n: genericYoung(c.id), club: c.name, v: rnd(80, 92) + g * 0.8, txt: `${g} buts · 20 ans` });
  }
  const gb = nominees(young, 5);
  if (gb[0].mine) {
    const p = getP(gb[0].pid), cash = prize(baseValue(p.ovr) * 0.01);
    p.aw.unshift(`${label} : GOLDEN BOY`); addRep(3); S.stats.troph++; earn(cash); ledger('🌟', `Golden Boy : ${p.n}`, cash); p.fol = Math.round(p.fol * 1.3 + 20000);
    mine.push(`🌟 ${p.n} — Golden Boy (+${fmt(cash)})`);
  } else gb.filter((x) => x.mine).forEach((x) => { const p = getP(x.pid); p.aw.unshift(`${label} : nommé au Golden Boy`); addRep(0.8); });
  award({ title: 'Golden Boy', icon: '🌟', sub: 'Meilleur joueur de 21 ans ou moins', noms: gb });

  // Soulier d'or : meilleur buteur d'Europe (buts ×2 dans les 5 grands, ×1,5 ailleurs)
  const sc = [];
  CLUB_IDS.forEach((id) => {
    const f = LEAGUES[CLUBS[id].league].big ? 2 : 1.5;
    S.gs[id].forEach((g, i) => { if (g > 0) sc.push({ n: starName(id, i), club: CLUBS[id].name, v: g * f, txt: `${g} buts · ${g * f} pts` }); });
  });
  S.players.forEach((p) => {
    if (p.g <= 0) return;
    const f = LEAGUES[CLUBS[p.club].league].big ? 2 : 1.5;
    sc.push({ n: p.n, club: CLUBS[p.club].name, v: p.g * f, txt: `${p.g} buts · ${p.g * f} pts`, mine: p.mine, pid: p.id });
  });
  const so = nominees(sc, 5);
  if (so[0].mine) {
    const p = getP(so[0].pid);
    p.aw.unshift(`${label} : SOULIER D'OR`); addRep(3); S.stats.troph++; p.fol = Math.round(p.fol * 1.3 + 20000);
    mine.push(`👟 ${p.n} — Soulier d'or`);
  }
  award({ title: 'Soulier d\'or', icon: '👟', sub: 'Meilleur buteur d\'Europe (buts ×2 dans les 5 grands championnats)', noms: so });

  // Ballon d'Or (calculé par ballonDor)
  if (S.bdo) {
    const noms = S.bdo.top.slice(0, 5).map((x, i) => ({ n: x.n, club: x.club, v: 10 - i, txt: '', mine: x.mine, pid: x.pid }));
    if (noms[0].mine) mine.push(`🏆 ${noms[0].n} — Ballon d'Or`);
    award({ title: 'Ballon d\'Or', icon: '🏆', sub: 'Le meilleur joueur du monde', noms, gold: true });
  }

  // Transfert de l'année
  const trs = [];
  if (S.ss.bestTr) trs.push({ n: S.ss.bestTr.n, club: `${S.ss.bestTr.from} → ${S.ss.bestTr.to}`, v: S.ss.bestTr.fee, txt: fmt(S.ss.bestTr.fee), mine: true });
  for (let i = 0; i < 3; i++) {
    const a = pick(CLUB_IDS.filter((id) => LEAGUES[CLUBS[id].league].big && CLUBS[id].rep >= 80)), b = pick(CLUB_IDS.filter((id) => CLUBS[id].rep >= 88 && id !== a));
    const fee = Math.round(rnd(35, 140)) * 1e6;
    trs.push({ n: starName(a, rint(0, 2)), club: `${CLUBS[a].name} → ${CLUBS[b].name}`, v: fee, txt: `${fmt(fee)} · ${pick(S.rivals).n}` });
  }
  const tn = nominees(trs, 4);
  if (tn[0].mine) { addRep(2); S.stats.troph++; mine.push(`💸 Transfert de l'année : ${tn[0].n}`); }
  award({ title: 'Transfert de l\'année', icon: '💸', sub: 'Le plus gros transfert de la saison', noms: tn });

  // Agent de l'année
  const gain = S.rep - S.ss.rep0;
  const ag = [{ n: S.agency.name, club: `${S.stats.transfers - S.ss.tr0} transfert(s) · +${gain.toFixed(1)} rép.`, v: S.rep + gain * 2.5 + (S.stats.transfers - S.ss.tr0) * 0.5, mine: true, txt: '' }]
    .concat(S.rivals.map((r) => ({ n: r.n, club: `Réputation ${Math.floor(r.rep)}`, v: r.rep + rnd(-2, 8), txt: '' })));
  const an = nominees(ag, 4);
  if (an[0].mine) {
    const cash = missionReward() * 2;
    addRep(2); S.stats.troph++; S.cash += cash; ledger('🕴️', 'Prix de l\'agent de l\'année', cash); mine.push(`🕴️ Agent de l'année (+${fmt(cash)})`);
  }
  award({ title: 'Agent de l\'année', icon: '🕴️', sub: 'La meilleure agence de joueurs de la saison', noms: an.map((x) => Object.assign(x, { txt: x.club, club: '' })) });

  // Tournoi international
  const tour = playTournament();
  if (tour) {
    const f = tour.rounds[tour.rounds.length - 1][0];
    slides.push({ k: 'list', title: tour.label, icon: '🌍', rows: [
      { i: NATIONS[tour.champ][1], l: 'Vainqueur', v: NATIONS[tour.champ][0], mine: tour.heroes.length > 0 },
      { i: '🏟️', l: 'Finale', v: `${NATIONS[f[0]][0]} ${f[2]}-${f[3]} ${NATIONS[f[1]][0]}${f[4] ? ' (t.a.b.)' : ''}` },
      ...tour.rounds[tour.rounds.length - 2].map((t) => ({ i: '⚔️', l: 'Demi-finale', v: `${NATIONS[t[0]][0]} ${t[2]}-${t[3]} ${NATIONS[t[1]][0]}${t[4] ? ' (t.a.b.)' : ''}` })),
      ...tour.heroes.map((n) => ({ i: '🥇', l: 'Champion du monde/d\'Europe', v: n, mine: true })),
    ] });
    if (tour.heroes.length) mine.push(`🌍 ${tour.label} : ${tour.heroes.join(', ')}`);
  }

  slides.push({ k: 'outro', title: 'Merci et à la saison prochaine !', icon: '🎉', rows: mine });
  S.cer = { label, slides };
}

function genericYoung(id) {
  const n = NAMES[LEAGUES[CLUB_DEFAULT[id].league].country];
  return pick(n.first) + ' ' + pick(n.last);
}
