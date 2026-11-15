/* Sélections nationales : Ligue des nations, matchs internationaux des clients */
'use strict';

const NL_WEEKS = [9, 13, 29];      // trois journées de groupe (trêves internationales)
const NL_FF = [35, 36];            // Final Four : demi-finales puis finale
const NL_TEAMS = ['FR', 'ES', 'EN', 'DE', 'BE', 'IT', 'PT', 'NL'];
const FRIENDLY_WEEKS = [4, 22, 33]; // matchs amicaux des sélections
const NL_PAIRS = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
const natName = (t) => `${NATIONS[t][1]} ${NATIONS[t][0]}`;
const intlThreshold = (nat) => (NATIONS[nat] ? NATIONS[nat][2] - 12 : 76);

function nationPower(t) {
  const stars = clients().filter((p) => p.intl && p.nat === t).length;
  return NATIONS[t][2] + stars * 0.8 + rnd(-2, 2);
}

/* Un match international ; les clients sélectionnés y jouent (sélections, buts) */
function intlMatch(a, b, comp, ko) {
  const d = nationPower(a) - nationPower(b);
  const ga = poisson(clamp(1.2 * Math.exp(d / 18), 0.3, 3)), gb = poisson(clamp(1.2 * Math.exp(-d / 18), 0.3, 3));
  const pen = ko && ga === gb ? (Math.random() < 0.5 + d / 80 ? 1 : 2) : 0;
  [[a, ga], [b, gb]].forEach(([t, gf]) => {
    clients().filter((p) => p.intl && p.nat === t && p.inj === 0).forEach((p) => {
      if (Math.random() > 0.85) return; // pas aligné cette fois
      let g = 0;
      for (let i = 0; i < gf; i++) if (Math.random() < { GB: 0, DEF: 0.06, MIL: 0.15, ATT: 0.3 }[p.pos]) g++;
      p.caps = (p.caps || 0) + 1; p.ig = (p.ig || 0) + g; p.fol = (p.fol || 0) + 400 + g * 2500;
      if (g) news('⚽', `${p.n} marque ${g > 1 ? g + ' buts' : 'un but'} avec ${NATIONS[t][0]} (${comp}).`);
    });
  });
  return [ga, gb, pen];
}

/* ---------- Ligue des nations ---------- */
function newNL() {
  const teams = NL_TEAMS.slice().sort(() => Math.random() - 0.5), tab = {};
  teams.forEach((t) => { tab[t] = [0, 0, 0, 0, 0, 0]; });
  S.intl.nl = { season: S.season, groups: [teams.slice(0, 4), teams.slice(4)], tab, days: [], ff: null, champ: null };
}
function nlStand(g) {
  const t = S.intl.nl.tab, P = (x) => x[1] * 3 + x[2];
  return g.slice().sort((a, b) => P(t[b]) - P(t[a]) || (t[b][4] - t[b][5]) - (t[a][4] - t[a][5]) || t[b][4] - t[a][4] || NATIONS[b][2] - NATIONS[a][2]);
}
function playNLDay(d) {
  const nl = S.intl.nl, res = [];
  nl.groups.forEach((g) => NL_PAIRS[d].forEach(([i, j]) => {
    const a = g[i], b = g[j], [ga, gb] = intlMatch(a, b, 'Ligue des nations'), ta = nl.tab[a], tb = nl.tab[b];
    ta[0]++; tb[0]++; ta[4] += ga; ta[5] += gb; tb[4] += gb; tb[5] += ga;
    if (ga > gb) { ta[1]++; tb[3]++; } else if (gb > ga) { tb[1]++; ta[3]++; } else { ta[2]++; tb[2]++; }
    res.push([a, b, ga, gb, 0]);
  }));
  nl.days.push(res);
  const be = res.find((r) => r[0] === 'BE' || r[1] === 'BE');
  if (be) news('🌍', `Ligue des nations : ${NATIONS[be[0]][0]} ${be[2]}-${be[3]} ${NATIONS[be[1]][0]}.`);
}
function playNLSemis() {
  const nl = S.intl.nl, A = nlStand(nl.groups[0]), B = nlStand(nl.groups[1]);
  const semis = [[A[0], B[1]], [B[0], A[1]]].map(([a, b]) => { const [ga, gb, pen] = intlMatch(a, b, 'Ligue des nations', true); return [a, b, ga, gb, pen]; });
  nl.ff = { semis, final: null };
  news('🌍', `Final Four de la Ligue des nations : ${semis.map((s) => `${NATIONS[s[0]][0]} ${s[2]}-${s[3]} ${NATIONS[s[1]][0]}${s[4] ? ' (t.a.b.)' : ''}`).join(' · ')}.`);
}
function playNLFinal() {
  const nl = S.intl.nl, w = nl.ff.semis.map((s) => (s[2] > s[3] || s[4] === 1 ? s[0] : s[1]));
  const [ga, gb, pen] = intlMatch(w[0], w[1], 'Ligue des nations', true);
  nl.ff.final = [w[0], w[1], ga, gb, pen];
  nl.champ = ga > gb || pen === 1 ? w[0] : w[1];
  const label = `Ligue des nations ${S.season}/${(S.season + 1) % 100}`;
  news('🏆', `${label} : ${NATIONS[w[0]][0]} ${ga}-${gb} ${NATIONS[w[1]][0]}${pen ? ' (t.a.b.)' : ''}. ${natName(nl.champ)} remporte le trophée !`);
  clients().filter((p) => p.intl && p.nat === nl.champ).forEach((p) => {
    p.aw.unshift(`Vainqueur de la ${label}`); addRep(1.5); S.stats.troph++; p.morale = clamp(p.morale + 12, 0, 100);
    news('🥇', `${p.n} remporte la Ligue des nations avec ${NATIONS[nl.champ][0]} !`);
  });
}

/* Appelé chaque semaine (après les matchs de clubs) */
function intlWeek() {
  if (!S.intl) S.intl = { nl: null, last: null };
  if (!S.intl.nl || S.intl.nl.season !== S.season) newNL();
  const nl = S.intl.nl;
  // Rattrapage silencieux si la partie a été chargée en cours de saison
  NL_WEEKS.forEach((w, d) => { if (w < S.week && nl.days.length === d) playNLDay(d); });
  const d = NL_WEEKS.indexOf(S.week);
  if (d >= 0 && nl.days.length === d) {
    const called = clients().filter((p) => p.intl && NL_TEAMS.includes(p.nat));
    if (called.length) news('📋', `Trêve internationale : ${called.map((p) => `${p.n} (${NATIONS[p.nat][0]})`).join(', ')} rejoignent leur sélection.`);
    playNLDay(d);
  }
  if (FRIENDLY_WEEKS.includes(S.week)) {
    const nats = [...new Set(clients().filter((p) => p.intl && NATIONS[p.nat]).map((p) => p.nat))];
    nats.forEach((t) => {
      const opp = pick(Object.keys(NATIONS).filter((x) => x !== t)), [ga, gb] = intlMatch(t, opp, 'match amical');
      news('🤝', `Match amical : ${NATIONS[t][0]} ${ga}-${gb} ${NATIONS[opp][0]}.`);
    });
  }
  if (S.week >= NL_FF[0] && nl.days.length === 3 && !nl.ff) playNLSemis();
  if (S.week >= NL_FF[1] && nl.ff && !nl.ff.final) playNLFinal();
}
