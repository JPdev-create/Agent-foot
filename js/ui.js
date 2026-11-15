/* Interface */
'use strict';

/* Sons (WebAudio, aucun fichier) */
const SND = { on: (() => { try { return localStorage.getItem('agentfoot_sound') !== '0'; } catch (e) { return true; } })() };
function play(notes, type) {
  if (!SND.on) return;
  try {
    const ctx = SND.ctx || (SND.ctx = new (window.AudioContext || window.webkitAudioContext)());
    let t = ctx.currentTime;
    notes.forEach(([f, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d + 0.05); t += d * 0.85;
    });
  } catch (e) { /* audio indisponible */ }
}
const FANFARE = [[523, 0.16], [659, 0.16], [784, 0.16], [1047, 0.32], [784, 0.14], [1047, 0.6]];
const DRUM = [[110, 0.07], [110, 0.07], [110, 0.07], [110, 0.07], [110, 0.07], [110, 0.07], [110, 0.07], [110, 0.07]];
const CHIME = [[880, 0.12], [1175, 0.3]];

const LOGOS = ['⚽', '🦁', '🦅', '🐺', '👑', '🔥', '💎', '⭐', '🛡️', '🚀'];
const COLORS = [['#35d07f', 'Vert'], ['#f2c14e', 'Or'], ['#5aa9ff', 'Bleu'], ['#ff8a5c', 'Corail'], ['#b48cff', 'Violet']];
const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const UI = { tab: 'bureau', modal: null, toast: null, mk: { country: 'BE', pos: '', sort: 'ovr', fav: false }, lg: 'BE1', mode: 'transfer', clg: 'BE1', jv: 'list' };
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ovrOf = (p) => Math.floor(p.ovr);
const potTxt = (p) => (p.sc === 0 ? '??' : `${p.potLo}–${p.potHi}`);
const ovrClass = (o) => (o >= 80 ? 'r5' : o >= 70 ? 'r4' : o >= 60 ? 'r3' : o >= 50 ? 'r2' : 'r1');
const clubTxt = (p) => `${LEAGUES[CLUBS[p.club].league].flag} ${esc(CLUBS[p.club].name)}`;
const pct = (x) => Math.round(x * 100) + ' %';
const avgNote = (p) => (p.m ? (p.rs / p.m).toFixed(1) : '–');
const noteClass = (n) => (n >= 7.5 ? 'pos' : n < 5.5 ? 'neg' : '');
const scoreTxt = (x) => `${x.cup ? EU[x.cup].icon + ' ' + EU[x.cup].short : x.home ? 'Dom.' : 'Ext.'} ${esc(CLUBS[x.opp].name)} ${x.gf}-${x.ga}`;
const resClass = (x) => (x.gf > x.ga ? 'w' : x.gf < x.ga ? 'l' : 'd');

function toast(r) {
  if (!r || !r.msg) return;
  UI.toast = { msg: r.msg, ok: r.ok };
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { UI.toast = null; renderToast(); }, 3500);
}
function renderToast() {
  $('#toast').innerHTML = UI.toast ? `<div class="toast ${UI.toast.ok ? 'ok' : 'ko'}">${esc(UI.toast.msg)}</div>` : '';
}

/* ---------- Écrans ---------- */
function viewStart() {
  return `<div class="start">
    <div class="logo">⚽</div><h1>Agent Foot</h1>
    <p>Fondez votre agence de joueurs en Belgique. Dénichez de jeunes talents dans les petits clubs,
    faites-les grandir et placez-les dans les 5 grands championnats européens.</p>
    <label>Nom de l'agence<input id="in-name" maxlength="24" value="JP Sport Management"></label>
    <div class="two"><label>Logo<select id="in-logo">${LOGOS.map((l) => `<option>${l}</option>`).join('')}</select></label>
    <label>Couleur<select id="in-color">${COLORS.map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</select></label></div>
    <label>Difficulté<select id="in-diff">${DIFFS.map((d, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${d.name} — ${fmt(d.cash)} au départ</option>`).join('')}</select></label>
    <label>Ville<select id="in-city">${['Liège', 'Bruxelles', 'Charleroi', 'Namur', 'Anvers', 'Gand', 'Marche-en-Famenne', 'Mons'].map((c) => `<option>${c}</option>`).join('')}</select></label>
    <button class="btn big" data-act="start">Créer mon agence</button>
    <label class="btn ghost file">📥 Reprendre une sauvegarde<input type="file" id="imp" accept=".json,application/json" hidden></label>
  </div>`;
}

function header() {
  const o = office(), win = inWindow(S.week);
  let pips = '';
  for (let i = 0; i < o.actions; i++) pips += `<i class="${i < S.actions ? 'on' : ''}"></i>`;
  return `<header>
    <div class="h1"><b>${esc(S.agency.logo || '')} ${esc(S.agency.name)}</b><span class="win ${win ? 'open' : ''}">${win ? 'Mercato ouvert' : 'Mercato fermé'}</span></div>
    <div class="h2">
      <div><small>Caisse</small><b class="${S.cash < 0 ? 'neg' : ''}">${fmt(S.cash)}</b></div>
      <div><small>Réputation</small><b>${Math.floor(S.rep)}/100</b></div>
      <div><small>${S.season}/${(S.season + 1) % 100}</small><b>Sem. ${S.week}/${SEASON_WEEKS}</b></div>
      <div><small>Actions</small><span class="pips">${pips}</span></div>
    </div></header>`;
}

function offerCard(o) {
  const p = getP(o.pid), c = CLUBS[o.club];
  return `<div class="card offer">
    <div class="row"><b>${esc(p.n)}</b><span class="tag">${LEAGUES[c.league].flag} ${esc(c.name)}</span></div>
    <div class="grid3">
      <div><small>Indemnité</small><b>${o.free ? 'Libre' : fmt(o.fee)}</b></div>
      <div><small>${o.free ? 'Votre prime' : 'Votre commission'}</small><b class="pos">${fmt(o.free ? o.bonus : o.fee * commissionTransfer())}</b></div>
      <div><small>Salaire/sem.</small><b>${fmt(o.sal)}</b></div>
    </div>
    <small>Prestige du club : ${c.rep} · expire dans ${o.exp - S.t} sem.${dreamMatch(p.dream, c) ? ' · 🌟 son rêve' : ''}</small>
    <div class="btns">
      <button class="btn" data-act="accept" data-id="${o.id}">Accepter</button>
      <button class="btn alt" data-act="negoOpen" data-id="${o.id}" ${o.nego ? 'disabled' : ''}>Négocier</button>
      <button class="btn ghost" data-act="refuse" data-id="${o.id}">Refuser</button>
    </div></div>`;
}

function eventCard() {
  const v = eventView();
  return `<div class="card event"><small>Décision à prendre</small><h3>${esc(v.title)}</h3><p>${esc(v.text)}</p>
    ${v.choices.map((c, i) => `<button class="btn ${i ? 'alt' : ''}" data-act="event" data-id="${i}">${esc(c)}</button>`).join('')}</div>`;
}

function recapCard() {
  const r = S.recap, net = r.inc - r.costs;
  return `<div class="card recap"><div class="row"><b>🎉 Bilan de la saison ${r.label}</b><button class="btn sm ghost" data-act="recap">OK</button></div>
    <div class="grid3">
      <div><small>Gains</small><b class="pos">${fmt(r.inc)}</b></div>
      <div><small>Frais</small><b class="neg">${fmt(r.costs)}</b></div>
      <div><small>Résultat</small><b class="${net < 0 ? 'neg' : 'pos'}">${fmt(net)}</b></div>
      <div><small>Transferts</small><b>${r.tr}</b></div>
      <div><small>Réputation</small><b>${Math.floor(r.rep0)} → ${Math.floor(r.rep1)}</b></div>
      <div><small>Classement</small><b>${r.rank}ᵉ / ${S.rivals.length + 1}</b></div>
    </div>
    ${r.best ? `<small>Meilleure progression : ${esc(r.best)}</small>` : ''}</div>`;
}

function missionsCard() {
  if (!S.mis || !S.mis.length) return '';
  return `<h2>🎯 Missions de la saison</h2><div class="card mis">${S.mis.map((m) => {
    const M = MISSIONS[m.k], pr = Math.min(m.n, M.prog()), w = Math.round(pr / m.n * 100);
    return `<div class="${m.done ? 'done' : ''}"><div class="row"><span>${m.done ? '✅' : '🎯'} ${esc(M.t(m.n))}</span><small>${fmt(m.r)}</small></div>
      <div class="bar"><i style="width:${m.done ? 100 : w}%"></i></div><small>${m.done ? 'Accomplie' : M.money ? `${fmt(pr)} / ${fmt(m.n)}` : `${pr} / ${m.n}`}</small></div>`;
  }).join('')}</div>`;
}

function agendaCard() {
  const w = S.week, out = [];
  if (w <= 6) out.push(['🔓', `Fin du mercato d'été dans ${7 - w} sem.`]);
  else if (w < 20) out.push(['📅', `Ouverture du mercato d'hiver dans ${20 - w} sem.`]);
  else if (w <= 23) out.push(['🔓', `Fin du mercato d'hiver dans ${24 - w} sem.`]);
  const r = EU_WEEKS.findIndex((x) => x > w);
  if (r >= 0) out.push(['🏆', `${EU_ROUNDS[r]} européens dans ${EU_WEEKS[r] - w} sem.`]);
  const t = tourName(S.season);
  out.push(['🎬', `Cérémonie des trophées${t ? ` et ${t} ${S.season + 1}` : ''} dans ${SEASON_WEEKS + 1 - w} sem.`]);
  return `<h2>📆 À venir</h2><div class="card agenda">${out.map(([i, x]) => `<div><span>${i}</span><p>${x}</p></div>`).join('')}</div>`;
}

function viewBureau() {
  const inc = weeklyIncome(), costs = weeklyCosts();
  return `
    ${S.over ? '<div class="card over"><b>Faillite !</b><p>Votre agence a coulé.</p><button class="btn" data-act="reset">Recommencer</button></div>'
    : S.event ? eventCard()
    : `<div class="weekbtns"><button class="btn big" data-act="week">▶ Semaine suivante</button><button class="btn big alt" data-act="fast" title="Avancer de 4 semaines">⏩ ×4</button></div>`}
    ${S.cer && S.week <= 6 ? `<div class="card cerbtn" data-act="cer"><span>🎬</span><div><b>Cérémonie des trophées ${S.cer.label}</b><small>Golden Boy, Soulier d'or, Ballon d'Or… Revoir la soirée</small></div><b>▶</b></div>` : ''}
    ${S.recap ? recapCard() : ''}
    ${missionsCard()}
    ${agendaCard()}
    <div class="card grid3">
      <div><small>Revenus/sem.</small><b class="pos">+${fmt(inc)}</b></div>
      <div><small>Frais/sem.</small><b class="neg">-${fmt(costs)}</b></div>
      <div><small>Clients</small><b>${clients().length}/${office().maxClients}</b></div>
    </div>
    ${S.offers.length ? `<h2>Offres sur la table</h2>${S.offers.map(offerCard).join('')}` : ''}
    ${S.wk.length ? `<h2>Matchs de mes joueurs</h2><div class="card mlist">${S.wk.map((x, i) => { const p = getP(x.pid); return p ? `<div data-act="match" data-id="${p.id}" data-src="wk" data-i="${i}">
      <i class="${resClass(x)}"></i><p><b>${esc(p.n)}</b><small>${scoreTxt(x)}</small></p>
      ${x.out ? `<span class="mut">${x.out}</span>` : `<span>${x.g ? '⚽'.repeat(x.g) : ''}${x.a ? '🅰️'.repeat(x.a) : ''} <b class="${noteClass(x.n)}">${x.n.toFixed(1)}</b></span>`}</div>` : ''; }).join('')}</div>` : ''}
    <h2>Actualités</h2>
    <div class="card news">${S.news.slice(0, 30).map((n) => `<div><span>${n.i}</span><p>${esc(n.x)}<small>S${n.w} · ${n.s}/${(n.s + 1) % 100}</small></p></div>`).join('')}</div>`;
}

function playerRow(p, mine) {
  const o = ovrOf(p);
  return `<div class="prow" data-act="open" data-id="${p.id}">
    <span class="ovr ${ovrClass(o)}">${o}</span>
    <div class="pmain"><b>${p.fav && !mine ? '⭐ ' : ''}${esc(p.n)}${p.intl ? ' 🌍' : ''}${p.free ? ' 🆓' : ''}${p.inj > 0 ? ' 🚑' : ''}${p.loan ? ' 🔁' : ''}</b><small>${p.pos} · ${p.age} ans · ${clubTxt(p)}</small></div>
    <div class="pside">${mine
    ? `<b>${p.m} m · ${p.g} b · ${p.a} pd</b><small>Note ${avgNote(p)} · Moral ${Math.round(p.morale)}</small>`
    : `<b>Pot. ${potTxt(p)}</b><small>${p.cov ? '👀 convoité' : fmt(playerValue(p))}</small>`}</div></div>`;
}

function viewMarche() {
  const f = UI.mk, locked = f.country !== 'BE' && S.office < INTL_OFFICE;
  const q = norm((f.q || '').trim());
  let list = q ? S.players.filter((p) => !p.mine && norm(p.n).includes(q))
    : S.players.filter((p) => !p.mine && p.nat === f.country && (!f.pos || p.pos === f.pos) && (!f.fav || p.fav));
  const sorters = {
    ovr: (a, b) => b.ovr - a.ovr, age: (a, b) => a.age - b.age || b.ovr - a.ovr,
    pot: (a, b) => (b.sc ? b.potHi : 0) - (a.sc ? a.potHi : 0) || b.ovr - a.ovr,
    val: (a, b) => playerValue(a) - playerValue(b),
  };
  list.sort(sorters[f.sort]);
  const sel = (k, opts) => `<select data-filter="${k}">${opts.map(([v, l]) => `<option value="${v}" ${f[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  return `<input id="mkq" class="search" type="search" placeholder="🔍 Rechercher un joueur par son nom (tous pays)" value="${esc(f.q || '')}" autocomplete="off">
    <div class="filters">
      ${sel('country', Object.keys(COUNTRY_LABEL).map((c) => [c, COUNTRY_LABEL[c]]))}
      ${sel('pos', [['', 'Tous postes'], ...Object.keys(POSITIONS).map((k) => [k, POSITIONS[k]])])}
      ${sel('sort', [['ovr', 'Tri : niveau'], ['pot', 'Tri : potentiel'], ['age', 'Tri : âge'], ['val', 'Tri : moins chers']])}
      <button class="chip ${f.fav ? 'on' : ''}" data-act="favFilter" title="Joueurs suivis">⭐</button>
    </div>
    <button class="btn alt trip" data-act="trip" data-id="${f.country}" ${S.cash < tripCost(f.country) ? 'disabled' : ''}>✈️ Voyage de détection — ${fmt(tripCost(f.country))} · 1 action<small>Révèle 3 jeunes à fort potentiel</small></button>
    ${locked ? `<div class="card warn">🔒 Recrutement à l'étranger débloqué avec le bureau « ${OFFICES[INTL_OFFICE].name} ». Vous pouvez déjà observer.</div>` : ''}
    <div class="card list">${list.slice(0, 80).map((p) => playerRow(p, false)).join('') || `<p class="empty">${f.fav ? 'Aucun joueur suivi. Ouvrez une fiche et touchez ☆ Suivre.' : 'Aucun joueur.'}</p>`}</div>`;
}

function viewJoueurs() {
  const cl = clients().sort((a, b) => b.ovr - a.ovr);
  if (!cl.length) return `<div class="card empty"><p>Aucun client pour l'instant.</p><p>Allez sur le <b>Marché</b>, observez de jeunes Belges et proposez-leur un mandat.</p></div>`;
  const chips = `<div class="chips"><button class="chip ${UI.jv === 'list' ? 'on' : ''}" data-act="jv" data-id="list">👥 Liste</button>
    <button class="chip ${UI.jv === 'stats' ? 'on' : ''}" data-act="jv" data-id="stats">📊 Statistiques</button></div>`;
  if (UI.jv === 'stats') {
    const by = cl.slice().sort((a, b) => (b.m ? b.rs / b.m : 0) - (a.m ? a.rs / a.m : 0));
    return `${chips}<div class="card"><table class="tbl pstats"><tr><th>Niv</th><th>Joueur</th><th>M</th><th>B</th><th>PD</th><th>Note</th></tr>
      ${by.map((p) => `<tr data-act="open" data-id="${p.id}"><td><span class="ovr sm ${ovrClass(ovrOf(p))}">${ovrOf(p)}</span></td>
        <td>${esc(p.n)}<small>${p.pos} · ${esc(CLUBS[p.club].name)}</small></td><td>${p.m}</td><td>${p.g}</td><td>${p.a}</td><td><b class="${p.m ? noteClass(p.rs / p.m) : ''}">${avgNote(p)}</b></td></tr>`).join('')}
      <tr class="tot"><td></td><td>Total agence</td><td>${cl.reduce((s, p) => s + p.m, 0)}</td><td>${cl.reduce((s, p) => s + p.g, 0)}</td><td>${cl.reduce((s, p) => s + p.a, 0)}</td><td></td></tr></table></div>`;
  }
  return `${chips}<div class="card list">${cl.map((p) => playerRow(p, true)).join('')}</div>
    <p class="hint">Vous touchez ${pct(COMMISSION_SALARY)} du salaire de vos clients chaque semaine et ${pct(commissionTransfer())} de chaque transfert.</p>`;
}

function competChips() {
  return `<div class="chips">${Object.keys(LEAGUES).map((l) => `<button class="chip ${UI.clg === l ? 'on' : ''}" data-act="clg" data-id="${l}">${LEAGUES[l].flag} ${LEAGUES[l].name}</button>`).join('')}
    ${Object.keys(EU).map((k) => `<button class="chip ${UI.clg === k ? 'on' : ''}" data-act="clg" data-id="${k}">${EU[k].icon} ${EU[k].name}</button>`).join('')}
    <button class="chip ${UI.clg === 'BDO' ? 'on' : ''}" data-act="clg" data-id="BDO">⭐ Ballon d'Or</button></div>`;
}

function viewEurope(k, mine) {
  const cup = S.eu[k], r = cup.rounds.length;
  const row = ([h, a, gh, ga, pen]) => `<tr class="${mine[h] || mine[a] ? 'me' : ''}"><td>${pen === 1 ? '✓ ' : ''}${esc(CLUBS[h].name)}</td><td><b>${gh} - ${ga}</b>${pen ? '<small>t.a.b.</small>' : ''}</td><td>${esc(CLUBS[a].name)}${pen === 2 ? ' ✓' : ''}</td></tr>`;
  return `${competChips()}
    ${cup.champ ? `<div class="card champ">${EU[k].icon}<b>${esc(CLUBS[cup.champ].name)}</b><small>Vainqueur de la ${EU[k].name}</small></div>`
    : `<h2>${EU_ROUNDS[r]} · semaine ${EU_WEEKS[r]}</h2><div class="card list">${cup.alive.map((id, i) => `${i % 2 === 0 && i ? '<hr>' : ''}<div class="prow tie ${mine[id] ? 'me' : ''}"><span class="ovr sm ${ovrClass(CLUBS[id].rep - 10)}">${CLUBS[id].rep}</span>
      <div class="pmain"><b>${esc(CLUBS[id].name)}${mine[id] ? ` ${mine[id]}👤` : ''}</b><small>${LEAGUES[CLUBS[id].league].flag} ${LEAGUES[CLUBS[id].league].name}</small></div></div>`).join('')}</div>`}
    ${cup.rounds.map((ties, i) => `<h2>${EU_ROUNDS[i]}</h2><div class="card"><table class="tbl resu">${ties.map(row).join('')}</table></div>`).reverse().join('')}
    <p class="hint">16 clubs qualifiés selon les classements de la saison précédente. Élimination directe sur un match.</p>`;
}

function viewCompet() {
  const mine = {};
  clients().forEach((p) => { mine[p.club] = (mine[p.club] || 0) + 1; });
  if (EU[UI.clg]) return viewEurope(UI.clg, mine);
  if (UI.clg === 'BDO') {
    return `${competChips()}<h2>Ballon d'Or${S.bdo ? ' ' + S.bdo.label : ''}</h2>
      <div class="card">${S.bdo ? `<table class="tbl scor"><tr><th>#</th><th>Joueur</th><th></th></tr>${S.bdo.top.map((x, i) => `<tr class="${x.mine ? 'me' : ''}" ${x.pid && getP(x.pid) ? `data-act="open" data-id="${x.pid}"` : ''}>
        <td>${i + 1}</td><td>${esc(x.n)}${x.mine ? ' 👤' : ''}<small>${esc(x.club)}</small></td><td>${i === 0 ? '🏆' : ''}</td></tr>`).join('')}</table>`
    : '<p class="empty">Décerné à la fin de la saison.</p>'}</div>
      <p class="hint">Basé sur les buts, les passes, les notes et les titres (championnat, Ligue des champions) dans les 5 grands championnats. Vos clients doivent avoir joué au moins 15 matchs.</p>`;
  }
  const lg = UI.clg, st = standings(lg), scorers = topScorers(lg, 10);
  const played = st[0].t[0], total = leagueRounds(lg), res = S.res[lg];
  return `${competChips()}
    <h2>Classement · journée ${played}/${total}</h2>
    <div class="card"><table class="tbl stand"><tr><th>#</th><th>Club</th><th>J</th><th>G</th><th>N</th><th>P</th><th>Diff</th><th>Pts</th></tr>
    ${st.map((x, i) => `<tr class="${mine[x.c.id] ? 'me' : ''} ${i === 0 ? 'top' : ''}"><td>${i + 1}</td><td>${esc(x.c.name)}${mine[x.c.id] ? ` <em>${mine[x.c.id]}👤</em>` : ''}</td>
      <td>${x.t[0]}</td><td>${x.t[1]}</td><td>${x.t[2]}</td><td>${x.t[3]}</td><td>${x.t[4] - x.t[5] > 0 ? '+' : ''}${x.t[4] - x.t[5]}</td><td><b>${pts(x.t)}</b></td></tr>`).join('')}</table>
    <small>👤 = clubs où jouent vos clients.</small></div>
    <h2>Derniers résultats</h2>
    <div class="card">${res ? `<table class="tbl resu">${res.map(([h, a, gh, ga]) => `<tr class="${mine[h] || mine[a] ? 'me' : ''}"><td>${esc(CLUBS[h].name)}</td><td><b>${gh} - ${ga}</b></td><td>${esc(CLUBS[a].name)}</td></tr>`).join('')}</table>`
    : `<p class="empty">${played >= total ? 'Championnat terminé.' : 'La saison n\'a pas encore commencé.'}</p>`}</div>
    <h2>Meilleurs buteurs</h2>
    <div class="card">${scorers.length ? `<table class="tbl scor"><tr><th>#</th><th>Joueur</th><th>Buts</th></tr>
      ${scorers.map((x, i) => `<tr class="${x.mine ? 'me' : ''}" ${x.pid ? `data-act="open" data-id="${x.pid}"` : ''}><td>${i + 1}</td><td>${esc(x.n)}${x.mine ? ' 👤' : ''}<small>${esc(x.club)}</small></td><td><b>${x.g}</b></td></tr>`).join('')}</table>`
    : '<p class="empty">Aucun but pour l\'instant.</p>'}</div>`;
}

function agencyCharts() {
  const h = S.hist.slice().reverse();
  if (h.length < 2) return '';
  const W = 300, H = 80, n = h.length, x = (i) => (i / (n - 1)) * (W - 12) + 6;
  const rep = h.map((s, i) => `${x(i).toFixed(1)},${(H - 6 - s.rep1 / 100 * (H - 12)).toFixed(1)}`).join(' ');
  const res = h.map((s) => s.inc - s.costs), mx = Math.max(1, ...res.map(Math.abs)), bw = Math.max(3, (W - 12) / n - 4);
  const bars = res.map((v, i) => { const hh = Math.abs(v) / mx * (H / 2 - 4); return `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${(v >= 0 ? H / 2 - hh : H / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, hh).toFixed(1)}" class="${v >= 0 ? 'p' : 'n'}"/>`; }).join('');
  return `<h2>📈 Évolution de l'agence</h2><div class="card chart"><small>Réputation (0 à 100)</small><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${rep}"/></svg>
    <small>Résultat net par saison (meilleure : ${fmt(Math.max(...res))})</small><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/>${bars}</svg>
    <div class="row"><small>${h[0].label}</small><small>${h[n - 1].label}</small></div></div>`;
}

function viewAgence() {
  const o = office(), next = OFFICES[S.office + 1];
  return `<h2>Bureau</h2>
    <div class="card"><div class="row"><b>${o.name}</b><span class="tag">Niveau ${S.office + 1}/${OFFICES.length}</span></div>
      <small>${o.maxClients} clients max · ${o.actions} actions/sem. · ${fmt(o.weekly)}/sem.</small>
      ${next ? `<div class="up"><div><b>→ ${next.name}</b><small>${next.maxClients} clients · ${next.actions} actions · ${fmt(next.weekly)}/sem.${S.office + 1 === INTL_OFFICE ? ' · recrutement à l\'étranger' : ''}</small></div>
      <button class="btn" data-act="office" ${S.cash < next.cost ? 'disabled' : ''}>${fmt(next.cost)}</button></div>` : '<small>Niveau maximum atteint.</small>'}
    </div>
    <h2>Équipe</h2>
    ${Object.keys(STAFF).map((k) => { const s = STAFF[k], lv = S.stl[k]; return `<div class="card up"><div><b>${s.name} <span class="stars">${'★'.repeat(lv)}${'☆'.repeat(3 - lv)}</span></b><small>${s.desc}</small><small>${lv ? `Niveau ${lv} · ${fmt(s.weekly * lv)}/sem.` : `${fmt(s.weekly)}/sem. par niveau`}</small></div>
      <div class="col">${lv < 3 ? `<button class="btn" data-act="staff" data-id="${k}" ${S.cash < staffCost(k) ? 'disabled' : ''}>${lv ? `Niv. ${lv + 1}` : 'Engager'}<small>${fmt(staffCost(k))}</small></button>` : '<span class="tag">Max</span>'}
      ${lv ? `<button class="btn ghost sm" data-act="fire" data-id="${k}">Licencier</button>` : ''}</div></div>`; }).join('')}
    <h2>🏫 Académie de jeunes</h2>
    <div class="card"><div class="row"><b>${ACADEMY[S.acad].name}</b><span class="tag">Niveau ${S.acad}/3</span></div>
      <small>${S.acad ? `${ACADEMY[S.acad].kids} jeune(s) de 16 ans formé(s) rejoignent l'agence chaque été · ${fmt(ACADEMY[S.acad].weekly)}/sem.` : 'Formez vos propres pépites : chaque été, des jeunes de 16 ans sortent de votre académie et signent directement chez vous.'}</small>
      ${ACADEMY[S.acad + 1] ? `<div class="up"><div><b>→ ${ACADEMY[S.acad + 1].name}</b><small>${ACADEMY[S.acad + 1].kids} jeune(s)/saison · ${fmt(ACADEMY[S.acad + 1].weekly)}/sem.${S.office < 1 ? ' · bureau niveau 2 requis' : ''}</small></div>
      <button class="btn" data-act="acad" ${S.cash < ACADEMY[S.acad + 1].cost || S.office < 1 ? 'disabled' : ''}>${fmt(ACADEMY[S.acad + 1].cost)}</button></div>` : ''}</div>
    ${Object.keys(S.rel).some((id) => S.rel[id] >= 10) ? `<h2>🤝 Clubs partenaires</h2><div class="card hof">${Object.keys(S.rel).filter((id) => S.rel[id] >= 10).sort((a, b) => S.rel[b] - S.rel[a]).slice(0, 6)
      .map((id) => `<div><span>${LEAGUES[CLUBS[id].league].flag}</span><p><b>${esc(CLUBS[id].name)}</b><small>${relLabel(S.rel[id])} — plus de chances que vos propositions aboutissent</small></p><em>❤️ ${S.rel[id]}</em></div>`).join('')}</div>` : ''}
    <h2>Classement des agences</h2>
    <div class="card rank">${[{ n: S.agency.name, rep: S.rep, me: true }, ...S.rivals].sort((a, b) => b.rep - a.rep)
    .map((a, i) => `<div class="${a.me ? 'me' : ''}"><span>${i + 1}</span><p>${esc(a.n)}</p><b>${Math.floor(a.rep)}</b></div>`).join('')}</div>
    <h2>🏅 Succès (${Object.keys(S.ach).length}/${ACH.length})</h2>
    <div class="card ach">${ACH.map((a) => `<button class="${S.ach[a.id] ? 'on' : ''}" data-act="achInfo" data-id="${a.id}"><span>${a.i}</span><small>${a.l}</small></button>`).join('')}</div>
    ${agencyCharts()}
    <h2>Objectifs</h2>
    <div class="card goals">${GOALS.map((g) => `<div class="${S.goals[g.id] ? 'done' : ''}"><span>${S.goals[g.id] ? '✅' : '⬜'}</span><p>${g.label}<small>Prime : ${fmt(g.reward)}</small></p></div>`).join('')}</div>
    <h2>Statistiques</h2>
    <div class="card grid3">
      <div><small>Transferts</small><b>${S.stats.transfers}</b></div>
      <div><small>Record</small><b>${fmt(S.stats.bestFee)}</b></div>
      <div><small>Gains totaux</small><b>${fmt(S.stats.earned)}</b></div>
    </div>
    <div class="card grid3">
      <div><small>Trophées clients</small><b>${S.stats.troph}</b></div>
      <div style="grid-column: span 2"><small>Plus gros transfert</small><b>${S.stats.bestName ? esc(S.stats.bestName) : '–'}</b></div>
    </div>
    ${S.hist.length ? `<h2>Historique de l'agence</h2><div class="card"><table class="tbl hist"><tr><th>Saison</th><th>Rang</th><th>Rép.</th><th>Transf.</th><th>Résultat</th></tr>
      ${S.hist.map((h) => `<tr><td>${h.label}</td><td>${h.rank}ᵉ</td><td>${Math.floor(h.rep1)}</td><td>${h.tr}</td><td class="${h.inc - h.costs < 0 ? 'neg' : 'pos'}">${fmt(h.inc - h.costs)}</td></tr>`).join('')}</table></div>` : ''}
    ${S.hof.length ? `<h2>🏛️ Panthéon de l'agence</h2><div class="card hof">${S.hof.map((h) => `<div><span class="ovr sm ${ovrClass(h.ovr)}">${h.ovr}</span><p><b>${esc(h.n)}</b>
      <small>${h.pos} · ${esc(h.club)} · ${h.why} (${h.s})</small>${h.top.length ? `<small>🏅 ${h.top.map(esc).join(' · ')}</small>` : ''}</p><em>${h.aw}🏅 ${h.tr}🤝</em></div>`).join('')}</div>` : ''}
    <h2>🎨 Identité de l'agence</h2>
    <div class="card"><small>Logo</small><div class="chips">${LOGOS.map((l) => `<button class="chip ${S.agency.logo === l ? 'on' : ''}" data-act="logo" data-id="${l}">${l}</button>`).join('')}</div>
      <small>Couleur</small><div class="chips">${COLORS.map(([c, n]) => `<button class="chip swatch ${S.agency.color === c ? 'on' : ''}" data-act="color" data-id="${c}"><i style="background:${c}"></i>${n}</button>`).join('')}</div></div>
    <h2>Sauvegarde</h2>
    <div class="card"><small>Votre partie est enregistrée sur cet appareil. Exportez-la pour la garder en sécurité ou la continuer ailleurs (ex. passer du navigateur à l'appli installée).</small>
      <button class="btn alt" data-act="export">📤 Exporter la sauvegarde</button>
      <label class="btn alt file">📥 Importer une sauvegarde<input type="file" id="imp" accept=".json,application/json" hidden></label></div>
    <h2>Application</h2>
    <div class="card">${UI.standalone ? '<small>✅ Application installée. Elle se met à jour toute seule à chaque ouverture (connexion nécessaire).</small>'
    : UI.installEvt ? '<button class="btn" data-act="install" style="margin-top:0">📲 Installer l\'application</button><small>Ajoute Agent Foot à votre écran d\'accueil. Mises à jour automatiques.</small>'
    : '<small><b>Installer sur le téléphone</b><br>Android (Chrome) : menu ⋮ → « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».<br>iPhone (Safari) : bouton Partager → « Sur l\'écran d\'accueil ».<br>L\'appli se met ensuite à jour toute seule à chaque ouverture.</small>'}</div>
    <button class="btn alt" data-act="sound">${SND.on ? '🔊 Sons activés' : '🔇 Sons coupés'}</button>
    <button class="btn alt" data-act="help">❓ Comment jouer</button>
    <button class="btn ghost danger" data-act="reset">Effacer la sauvegarde et recommencer</button>`;
}

/* ---------- Fenêtres ---------- */
function sparkline(p) {
  const pts = (p.vh || []).concat([{ v: playerValue(p) }]);
  if (pts.length < 2) return '';
  const vs = pts.map((x) => x.v), max = Math.max(...vs), min = Math.min(...vs), W = 300, H = 56;
  const xy = vs.map((v, i) => `${(i / (vs.length - 1) * W).toFixed(1)},${(H - 4 - (max === min ? 0.5 : (v - min) / (max - min)) * (H - 8)).toFixed(1)}`);
  return `<h4>Évolution de la valeur</h4><svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${xy.join(' ')}"/></svg>
    <div class="row"><small>À la signature : ${fmt(vs[0])}</small><small>Aujourd'hui : ${fmt(vs[vs.length - 1])}</small></div>`;
}

function modalPlayer(p) {
  const o = ovrOf(p), c = CLUBS[p.club];
  const info = `<div class="mhead"><span class="ovr big ${ovrClass(o)}">${o}</span>
      <div><h3>${esc(p.n)}</h3><small>${POSITIONS[p.pos]} · ${p.age} ans · ${COUNTRY_LABEL[p.nat]}</small><small>${clubTxt(p)} (prestige ${c.rep})${p.loan ? ` · prêté par ${esc(CLUBS[p.loan.back].name)}` : ''}</small></div></div>
    <div class="grid3">
      <div><small>Potentiel</small><b>${potTxt(p)}</b></div>
      <div><small>Valeur</small><b>${fmt(playerValue(p))}</b></div>
      <div><small>Salaire/sem.</small><b>${fmt(p.sal)}</b></div>
      <div><small>Temps de jeu</small><b>${pct(playProb(p))}</b></div>
      <div><small>Saison</small><b>${p.m} m · ${p.g} b · ${p.a} pd</b></div>
      <div><small>Contrat club</small><b class="${p.cy <= 1 ? 'neg' : ''}">${p.cy} an(s)</b></div>
    </div>
    ${p.tr && (p.mine || p.sc >= 1) ? `<p class="trait">${TRAITS[p.tr].icon} <b>${TRAITS[p.tr].name}</b> — ${TRAITS[p.tr].desc}</p>` : !p.tr || p.mine ? '' : '<p class="trait mut">Caractère inconnu : observez-le.</p>'}
    ${p.intl ? '<p class="trait">🌍 <b>International</b> — valeur +12 %.</p>' : ''}
    ${p.inj > 0 ? `<p class="warn">🚑 Blessé encore ${p.inj} semaine(s).</p>` : ''}
    ${p.free ? `<p class="warn">🆓 <b>Libre</b> — sans contrat. Placez-le avant la fin du mercato d'été (semaine 6) : pas d'indemnité, mais une prime à la signature pour vous. Sinon il re-signera à la baisse.</p>` : ''}
    ${p.mine && p.dream ? `<p class="trait">🌟 <b>Rêve :</b> ${esc(dreamText(p.dream))}${p.dream.done ? ' ✅' : ''}</p>` : ''}`;
  if (!p.mine) {
    const cd = p.cd > S.t, can = canRecruit(p);
    return `${info}
      <button class="btn ghost" data-act="fav" data-id="${p.id}">${p.fav ? '⭐ Suivi — retirer' : '☆ Suivre ce joueur'}</button>
      <button class="btn alt" data-act="scout" data-id="${p.id}" ${p.sc >= 2 ? 'disabled' : ''}>🔎 Observer (1 action)${p.sc >= 2 ? ' — rapport complet' : ''}</button>
      <h4>Proposer un mandat (1 action)</h4>
      ${p.cov ? `<p class="warn">👀 ${esc(p.cov.by)} veut le signer : il sera parti dans ${Math.max(1, p.cov.t - S.t)} semaine(s) !</p>` : ''}
      ${cd ? `<p class="warn">Il refuse de discuter encore ${p.cd - S.t} semaine(s).</p>` : ''}
      ${!can ? `<p class="warn">🔒 Recrutement à l'étranger non débloqué.</p>` : ''}
      ${['Simple poignée de main', 'Avec prime à la signature', 'Avec grosse prime'].map((l, i) => `<button class="btn line" data-act="sign" data-id="${p.id}" data-lv="${i}" ${cd || !can ? 'disabled' : ''}>
        <span>${l}<small>${i ? 'Coût : ' + fmt(signBonusCost(p, i)) : 'Gratuit'}</small></span><b>${pct(signChance(p, i))}</b></button>`).join('')}`;
  }
  return `${info}
    <div class="grid3">
      <div><small>Moral</small><b>${Math.round(p.morale)}</b></div>
      <div><small>Mandat</small><b>${p.mandate} saison(s)</b></div>
      <div><small>Pour vous</small><b class="pos">${fmt(p.sal * COMMISSION_SALARY + (p.sp ? p.sp.w : 0))}/s</b></div>
    </div>
    <p class="trait">📱 <b>${fmtFol(p.fol || 0)} abonnés</b> — sa popularité augmente la valeur de ses sponsors.</p>
    <h4>Plan d'entraînement</h4>
    <div class="chips plans">${Object.keys(PLANS).map((k) => `<button class="chip ${(p.plan || 'std') === k ? 'on' : ''}" data-act="plan" data-id="${p.id}" data-k="${k}">${PLANS[k].icon} ${PLANS[k].name}</button>`).join('')}</div>
    <small>${PLANS[p.plan || 'std'].desc}${p.plan === 'int' ? ` (${fmt(planCost(p))}/sem.)` : ''}</small>
    <button class="btn" data-act="propose" data-id="${p.id}" ${inWindow(S.week) && !p.loan ? '' : 'disabled'}>📣 Transfert ou prêt${p.loan ? ' — en prêt cette saison' : inWindow(S.week) ? ' (1 action)' : ' — mercato fermé'}</button>
    <button class="btn alt" data-act="auction" data-id="${p.id}" ${inWindow(S.week) && !p.loan ? '' : 'disabled'}>🔨 Mettre aux enchères (2 actions)</button>
    <button class="btn alt" data-act="raise" data-id="${p.id}" ${p.free ? 'disabled' : ''}>💶 Demander une revalorisation (1 action)</button>
    ${p.cy <= 1 ? `<button class="btn alt" data-act="renew" data-id="${p.id}" ${p.loan ? 'disabled' : ''}>📝 ${p.free ? 'Re-signer avec son ancien club' : 'Négocier une prolongation'} (1 action)</button>
    <small>${p.free ? 'Prime d\'agent : 6 semaines de salaire.' : 'Dernière année de contrat : les clubs acheteurs paieront 40 % de moins. Une prolongation vous rapporte 6 semaines de son salaire. Sinon, il sera libre l\'été prochain (grosse prime si vous le placez).'}</small>` : ''}
    ${p.sp ? `<p class="trait">👟 <b>Sponsor ${esc(p.sp.b)}</b> — ${fmt(p.sp.w)}/sem. pour vous, jusqu'à la fin de la saison ${p.sp.end - 1}/${p.sp.end % 100}.</p>`
    : `<button class="btn alt" data-act="sponsor" data-id="${p.id}" ${p.ovr < 58 ? 'disabled' : ''}>👟 Chercher un sponsor (1 action)${p.ovr >= 58 ? ` — ${pct(sponsorChance(p))} · ${fmt(sponsorValue(p))}/sem.` : ' — niveau 58 requis'}</button>`}
    <button class="btn alt" data-act="talk" data-id="${p.id}">💬 Discuter avec lui (1 action)</button>
    <h4>Saison en cours</h4>
    <div class="grid3">
      <div><small>Matchs</small><b>${p.m}</b></div><div><small>Buts</small><b>${p.g}</b></div><div><small>Passes déc.</small><b>${p.a}</b></div>
      <div><small>Note moyenne</small><b>${avgNote(p)}</b></div><div><small>${p.pos === 'GB' || p.pos === 'DEF' ? 'Clean sheets' : 'Buts/match'}</small><b>${p.pos === 'GB' || p.pos === 'DEF' ? p.cs : p.m ? (p.g / p.m).toFixed(2).replace('.', ',') : '–'}</b></div>
      <div><small>Progression</small><b class="pos">+${Math.max(0, Math.floor(p.ovr) - Math.floor(p.o0))}</b></div>
    </div>
    ${sparkline(p)}
    ${p.em ? `<small>Coupe d'Europe : ${p.em} match(s), ${p.eg} but(s)</small>` : ''}
    ${p.log.length ? `<h4>Derniers matchs</h4><div class="mlist">${p.log.map((x, i) => `<div data-act="match" data-id="${p.id}" data-src="log" data-i="${i}"><i class="${resClass(x)}"></i><p><small>Sem. ${x.w} · ${scoreTxt(x)}</small></p>
      <span>${x.g ? '⚽'.repeat(x.g) : ''}${x.a ? '🅰️'.repeat(x.a) : ''} <b class="${noteClass(x.n)}">${x.n.toFixed(1)}</b></span></div>`).join('')}</div>` : ''}
    ${p.sh.length ? `<h4>Saisons précédentes</h4><table class="tbl"><tr><th>Saison</th><th>Club</th><th>M</th><th>B</th><th>PD</th><th>Note</th></tr>
      ${p.sh.map((h) => `<tr><td>${h.s}</td><td>${esc(h.club)}</td><td>${h.m}</td><td>${h.g}</td><td>${h.a}</td><td>${h.m ? h.avg.toFixed(1) : '–'}</td></tr>`).join('')}</table>` : ''}
    ${p.aw.length ? `<h4>Palmarès</h4>${p.aw.map((a) => `<small>🏅 ${esc(a)}</small>`).join('')}` : ''}
    ${p.hist.length ? `<h4>Transferts</h4>${p.hist.map((h) => `<small>${h.s} : ${esc(h.from)} → ${esc(h.to)} (${h.free ? 'libre' : fmt(h.fee)})</small>`).join('')}` : ''}
    <button class="btn ghost danger" data-act="release" data-id="${p.id}">Rompre le mandat</button>`;
}

function modalPropose(p) {
  const cur = CLUBS[p.club], loan = UI.mode === 'loan';
  const list = clubsOf(UI.lg).sort((a, b) => b.rep - a.rep);
  return `<h3>${loan ? 'Prêter' : 'Transférer'} ${esc(p.n)}</h3>
    <div class="chips"><button class="chip ${loan ? '' : 'on'}" data-act="mode" data-id="transfer">🤝 Transfert</button>
      <button class="chip ${loan ? 'on' : ''}" data-act="mode" data-id="loan">🔁 Prêt</button></div>
    <small>${loan
    ? `Prêt jusqu'à la fin de la saison dans un club plus modeste, pour jouer et progresser. Temps de jeu actuel : ${pct(playProb(p))}. Aucune commission.`
    : `Niveau ${ovrOf(p)} · potentiel ${potTxt(p)} · valeur ${fmt(playerValue(p))}. Un club regarde le niveau actuel, ou le potentiel pour les jeunes.`}</small>
    <div class="chips">${Object.keys(LEAGUES).map((l) => `<button class="chip ${UI.lg === l ? 'on' : ''}" data-act="lg" data-id="${l}">${LEAGUES[l].flag} ${LEAGUES[l].name}</button>`).join('')}</div>
    <div class="list">${list.map((c) => {
    const same = c.id === p.club, rej = p.rej[c.id] > S.t;
    let why = same ? 'Club actuel' : rej ? 'A déjà refusé' : '', sub;
    if (loan) {
      if (!why && !loanOk(p, c)) why = c.rep >= cur.rep ? 'Pas plus modeste que son club' : p.ovr < c.rep - 14 ? 'Il n\'y jouerait pas' : 'Niveau trop faible pour lui';
      sub = `Temps de jeu estimé : ${pct(clamp(0.5 + (p.ovr - (c.rep - 12)) / 16, 0.05, 0.97))}`;
    } else {
      if (!why && !playerAccepts(p, c)) why = 'Trop petit pour lui';
      sub = (dreamMatch(p.dream, c) ? '🌟 Son rêve · ' : '') + (c.rep > cur.rep ? 'Club plus prestigieux' : 'Niveau équivalent') + (rel(c.id) >= 10 ? ` · 🤝 ${relLabel(rel(c.id))}` : '');
    }
    return `<div class="prow"><span class="ovr ${ovrClass(c.rep - 10)}">${c.rep}</span>
        <div class="pmain"><b>${esc(c.name)}</b><small>${why || sub}</small></div>
        <button class="btn sm" data-act="${loan ? 'doLoan' : 'doPropose'}" data-id="${p.id}" data-club="${esc(c.id)}" ${why ? 'disabled' : ''}>${loan ? 'Prêter' : 'Proposer'}</button></div>`;
  }).join('')}</div>
    <button class="btn ghost" data-act="open" data-id="${p.id}">← Retour</button>`;
}

/* Compte rendu d'un match (buteurs et minutes générés de façon stable à partir du match) */
function modalMatch(p, m) {
  const x = m.src === 'wk' ? S.wk[m.i] : p.log[m.i];
  if (!x) return '<p class="empty">Match introuvable.</p>';
  const my = x.club || p.club;
  let seed = hashStr(`${x.pid}-${x.w}-${x.opp}-${x.gf}${x.ga}`);
  const rand = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  const who = (club) => { const r = rand(); return r < 0.4 ? starName(club, 0) : r < 0.65 ? starName(club, 1) : r < 0.8 ? starName(club, 2) : genericName(club, rand); };
  const ev = [], mine = [];
  for (let i = 0; i < x.gf; i++) mine.push({ side: 'me' });
  for (let i = 0; i < (x.g || 0); i++) mine[i].sc = p.n;
  for (let i = x.g || 0; i < x.gf; i++) { mine[i].sc = who(my); if (i - (x.g || 0) < (x.a || 0)) mine[i].as = p.n; else if (rand() < 0.6) mine[i].as = who(my); }
  ev.push(...mine);
  for (let i = 0; i < x.ga; i++) ev.push({ side: 'opp', sc: who(x.opp), as: rand() < 0.6 ? who(x.opp) : null });
  ev.forEach((e) => { e.min = 1 + Math.floor(rand() * 90); if (e.as === e.sc) e.as = null; });
  ev.sort((a, b) => a.min - b.min);
  const minute = m.live ? Math.min(90, Math.floor((Date.now() - m.live) / 110)) : 90, done = minute >= 90;
  const shown = ev.filter((e) => e.min <= minute);
  if (m.live && shown.length > (m.seen || 0)) { m.seen = shown.length; play(shown[shown.length - 1].side === 'me' ? CHIME : [[220, 0.25]]); }
  const left = x.home ? my : x.opp, right = x.home ? x.opp : my;
  const lSide = x.home ? 'me' : 'opp';
  const gl = shown.filter((e) => e.side === lSide).length, gr = shown.length - gl;
  return `<small>${x.cup ? EU[x.cup].icon + ' ' + EU[x.cup].name : LEAGUES[CLUBS[my].league].name} · semaine ${x.w}</small>
    <div class="score"><div>${esc(CLUBS[left].name)}</div><b>${gl} - ${gr}</b><div>${esc(CLUBS[right].name)}</div></div>
    ${m.live ? `<div class="live"><span>${done ? 'Terminé' : `🔴 ${minute}'`}</span><div class="bar"><i style="width:${minute / 90 * 100}%"></i></div></div>` : ''}
    <div class="events">${shown.length ? shown.map((e) => `<div class="${(e.side === 'me') === x.home ? 'l' : 'r'} ${e.sc === p.n || e.as === p.n ? 'hl' : ''}">
      <span>${e.min}'</span><p>⚽ <b>${esc(e.sc)}</b>${e.as ? `<small>passe : ${esc(e.as)}</small>` : ''}</p></div>`).join('') : (done ? '<p class="empty">Aucun but.</p>' : '<p class="empty">Le match est en cours…</p>')}</div>
    ${!done ? '<button class="btn alt" data-act="liveSkip">⏩ Voir le score final</button>' : `${!m.live ? '<button class="btn" data-act="live">📺 Revivre le match en direct</button>' : ''}
    <div class="card"><div class="row"><b>${esc(p.n)}</b>${x.out ? `<span class="tag">${x.out}</span>` : `<b class="${noteClass(x.n)}">Note ${x.n.toFixed(1)}</b>`}</div>
      ${x.out ? '' : `<small>${x.g ? x.g + ' but(s)' : 'Pas de but'} · ${x.a ? x.a + ' passe(s) décisive(s)' : 'pas de passe décisive'}</small>`}</div>
    <button class="btn alt" data-act="open" data-id="${p.id}">Voir la fiche de ${esc(p.n)}</button>`}`;
}
function genericName(club, rand) {
  const n = NAMES[LEAGUES[CLUB_DEFAULT[club].league].country];
  return n.first[Math.floor(rand() * n.first.length)] + ' ' + n.last[Math.floor(rand() * n.last.length)];
}

function modalNego(p, m) {
  const o = S.offers.find((x) => x.id === m.oid);
  if (!o) return '<p class="empty">Offre expirée.</p>';
  const c = CLUBS[o.club], base = o.free ? o.bonus : o.fee;
  return `<h3>Négocier avec ${esc(c.name)}</h3>
    <small>Offre actuelle pour ${esc(p.n)} : ${o.free ? 'prime de ' + fmt(o.bonus) : fmt(o.fee)}. Une seule tentative possible.${S.stl.nego ? ` Votre négociateur (niv. ${S.stl.nego}) améliore vos chances.` : ''}</small>
    ${NEGO.map((n, i) => `<button class="btn line" data-act="nego" data-id="${o.id}" data-lv="${i}">
      <span>${['Demande raisonnable', 'Demande ferme', 'Coup de poker'][i]} (+${Math.round(n.up * 100)} %)<small>≈ ${fmt(base * (1 + n.up))} · s'il refuse : ${pct(negoWalk(i))} de risque qu'il parte</small></span><b>${pct(negoOk(i))}</b></button>`).join('')}
    <button class="btn ghost" data-act="close">Garder l'offre actuelle</button>`;
}

/* ---------- Cérémonie des trophées ---------- */
function autoCer() {
  if (S.cer && UI.cerSeen !== S.cer.label && S.week === 1) { UI.cerSeen = S.cer.label; UI.modal = { type: 'cer', i: 0, open: false }; play(FANFARE); }
}
function cerNext() {
  const m = UI.modal, sl = S.cer.slides[m.i];
  if (sl.k === 'award' && !m.open) { m.open = true; play(DRUM, 'square'); setTimeout(() => play(FANFARE), 650); return; }
  if (m.i >= S.cer.slides.length - 1) { UI.modal = null; return; }
  m.i++; m.open = false;
}
function confetti() {
  const cols = ['#f2c14e', '#35d07f', '#ff6b6b', '#5aa9ff', '#ffffff'];
  let h = '';
  for (let i = 0; i < 46; i++) h += `<i style="left:${Math.random() * 100}%;background:${cols[i % 5]};animation-delay:${(0.6 + Math.random() * 0.8).toFixed(2)}s;animation-duration:${(2 + Math.random() * 1.8).toFixed(2)}s;transform:rotate(${Math.floor(Math.random() * 360)}deg)"></i>`;
  return `<div class="confetti">${h}</div>`;
}
function viewCer() {
  const c = S.cer, m = UI.modal, sl = c.slides[m.i], n = c.slides.length, last = m.i === n - 1;
  const top = `<div class="cer-top"><small>🎬 ${esc(c.label)} · ${m.i + 1}/${n}</small><button class="x" data-act="cerClose">✕</button></div>`;
  const dots = `<div class="dots">${c.slides.map((_, i) => `<i class="${i === m.i ? 'on' : i < m.i ? 'past' : ''}"></i>`).join('')}</div>`;
  let body = '';
  if (sl.k === 'intro') {
    body = `<div class="cer-icon big">${sl.icon}</div><h2 class="cer-title">${esc(sl.title)}</h2><p class="cer-sub">${esc(sl.sub)}</p>
      <button class="btn big gold" data-act="cerNext">Que la cérémonie commence !</button>`;
  } else if (sl.k === 'list' || sl.k === 'outro') {
    const rows = sl.k === 'outro' ? (sl.rows.length ? sl.rows.map((x) => ({ i: '🏅', l: '', v: x, mine: true })) : [{ i: '🙂', l: '', v: 'Pas de trophée pour vos clients cette année. La prochaine sera la bonne !' }]) : sl.rows;
    body = `<div class="cer-icon">${sl.icon}</div><h2 class="cer-title">${esc(sl.title)}</h2>
      ${sl.k === 'outro' ? '<p class="cer-sub">Le bilan de votre agence ce soir :</p>' : ''}
      <div class="cer-list">${rows.map((r) => `<div class="${r.mine ? 'me' : ''}"><span>${r.i}</span><p>${r.l ? `<small>${esc(r.l)}</small>` : ''}<b>${esc(r.v)}</b></p></div>`).join('')}</div>
      <button class="btn big gold" data-act="cerNext">${last ? 'Terminer la soirée' : 'Suivant'}</button>`;
  } else {
    const w = sl.noms[sl.win];
    body = `<div class="cer-icon ${m.open ? 'spin' : ''}">${sl.icon}</div><h2 class="cer-title">${esc(sl.title)}</h2><p class="cer-sub">${esc(sl.sub)}</p>
      ${m.open ? `<div class="winner ${w.mine ? 'me' : ''}"><small>Le lauréat est…</small><b>${esc(w.n)}</b><small>${esc(w.club || '')}${w.txt ? ` · ${esc(w.txt)}` : ''}</small>${w.mine ? '<em>👤 Votre client !</em>' : ''}</div>${confetti()}` : '<p class="cer-sub nom">Les nommés sont…</p>'}
      <div class="cer-list noms">${sl.noms.map((x, i) => `<div class="${x.mine ? 'me' : ''} ${m.open && i === sl.win ? 'win' : m.open ? 'lose' : ''}"><span>${m.open && i === sl.win ? '🏆' : '🎟️'}</span><p><b>${esc(x.n)}${x.mine ? ' 👤' : ''}</b><small>${esc(x.club || '')}${x.txt && x.club ? ' · ' : ''}${esc(x.txt || '')}</small></p></div>`).join('')}</div>
      <button class="btn big gold" data-act="cerNext">${m.open ? (last ? 'Terminer' : 'Suivant') : '🎤 Ouvrir l\'enveloppe'}</button>`;
  }
  return `${top}${dots}<div class="cer-body" key="${m.i}-${m.open}">${body}</div>`;
}

function startLive() {
  clearInterval(UI.lt);
  UI.lt = setInterval(() => {
    const m = UI.modal;
    if (!m || m.type !== 'match' || !m.live) { clearInterval(UI.lt); return; }
    renderModal();
    if (Date.now() - m.live >= 90 * 110) clearInterval(UI.lt);
  }, 220);
}

function modalHelp() {
  return `<h3>Comment jouer</h3>
    <div class="help">
    <p><b>1. Observez.</b> Sur le Marché, ouvrez la fiche d'un jeune et observez-le pour découvrir son potentiel. Suivez (⭐) ceux qui vous plaisent.</p>
    <p><b>2. Signez.</b> Proposez-lui un mandat. Plus votre réputation est haute, plus les bons joueurs acceptent. Une prime augmente vos chances.</p>
    <p><b>3. Faites-le jouer.</b> Un jeune progresse surtout s'il joue. Regardez son « temps de jeu » : s'il est faible, prêtez-le dans un club plus modeste.</p>
    <p><b>4. Transférez.</b> Pendant le mercato (semaines 1–6 et 20–23), proposez vos clients à des clubs plus prestigieux. Vous touchez 10 % de l'indemnité, puis 7 % de son salaire chaque semaine.</p>
    <p><b>Suivez les matchs.</b> Chaque semaine, tous les championnats jouent : résultats de vos joueurs sur le Bureau, classements dans l'onglet Compét.</p>
    <p><b>Caractère et contrats.</b> Chaque joueur a un caractère (visible après observation). En dernière année de contrat, négociez une prolongation ou vendez vite.</p>
    <p><b>Astuces d'agent.</b> Mettez un joueur aux enchères pour faire monter les prix, partez en voyage de détection pour dénicher des pépites, et réalisez le rêve de carrière de vos clients. Un joueur en fin de contrat devient libre : placez-le pour une grosse prime.</p>
    <p><b>Concurrence.</b> Les agences rivales repèrent aussi les pépites (👀 convoité) : signez-les avant elles. Négociez des contrats de sponsoring pour vos clients connus et visez le Ballon d'Or.</p>
    <p><b>Chaque saison.</b> Remplissez les missions 🎯, choisissez le plan d'entraînement de vos clients et assistez à la cérémonie des trophées (Golden Boy, Soulier d'or, Ballon d'Or…). Une saison sur deux : Coupe du monde ou Euro.</p>
    <p><b>Réseau.</b> Chaque transfert renforce votre relation avec les clubs (🤝) : vos propositions y aboutissent plus souvent. Construisez une académie pour former vos propres pépites et débloquez les succès 🏅.</p>
    <p><b>5. Grandissez.</b> Agrandissez le bureau (plus de clients et d'actions), engagez du personnel et grimpez au classement des agences jusqu'aux 5 grands championnats.</p>
    <p><b>Attention</b> au moral de vos joueurs (un joueur frustré peut partir) et à votre caisse : faillite si les dettes dépassent ${fmt(DIFFS[S ? S.diff : 1].bank)}.</p>
    </div><button class="btn" data-act="close">C'est parti</button>`;
}

function renderModal() {
  const m = UI.modal;
  if (!m) { $('#modal').innerHTML = ''; return; }
  if (m.type === 'cer') { $('#modal').innerHTML = `<div class="stage">${viewCer()}</div>`; return; }
  const p = m.type === 'help' ? null : getP(m.id);
  if (!p && m.type !== 'help') { UI.modal = null; $('#modal').innerHTML = ''; return; }
  const sc = $('#modal .sheet') ? $('#modal .sheet').scrollTop : 0;
  $('#modal').innerHTML = `<div class="backdrop" data-act="close"></div><div class="sheet">
    <button class="x" data-act="close">✕</button>${m.type === 'help' ? modalHelp() : m.type === 'match' ? modalMatch(p, m) : m.type === 'nego' ? modalNego(p, m) : m.type === 'propose' ? modalPropose(p) : modalPlayer(p)}</div>`;
  if (m.keep) $('#modal .sheet').scrollTop = sc;
}

function render() {
  const app = $('#app');
  document.documentElement.style.setProperty('--acc', (S && S.agency.color) || '#35d07f');
  if (!S) { app.innerHTML = viewStart(); $('#modal').innerHTML = ''; renderToast(); return; }
  const views = { bureau: viewBureau, marche: viewMarche, joueurs: viewJoueurs, compet: viewCompet, agence: viewAgence };
  const tabs = [['bureau', '🏠', 'Bureau'], ['marche', '🔎', 'Marché'], ['joueurs', '👥', 'Joueurs'], ['compet', '🏆', 'Compét.'], ['agence', '🏢', 'Agence']];
  const y = window.scrollY, same = app.dataset.tab === UI.tab;
  app.innerHTML = `${header()}<main>${views[UI.tab]()}</main>
    <nav>${tabs.map(([k, i, l]) => `<button class="${UI.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}"><span>${i}</span>${l}${k === 'bureau' && S.offers.length ? `<em>${S.offers.length}</em>` : ''}</button>`).join('')}</nav>`;
  app.dataset.tab = UI.tab;
  window.scrollTo(0, same ? y : 0);
  renderModal(); renderToast();
}

/* ---------- Événements ---------- */
const ACTIONS = {
  start() { newGame($('#in-name').value.trim(), $('#in-city').value, +$('#in-diff').value); S.agency.logo = $('#in-logo').value; S.agency.color = $('#in-color').value; save(); UI.modal = { type: 'help' }; },
  week() { nextWeek(); autoCer(); },
  fast() {
    for (let i = 0; i < 4; i++) {
      nextWeek();
      if (S.over || S.event || S.offers.length || S.recap || S.week === 20) break;
    }
    autoCer();
  },
  event(d) { toast(resolveEvent(+d.id)); },
  recap() { S.recap = null; save(); },
  fav(d) { actFav(+d.id); },
  favFilter() { UI.mk.fav = !UI.mk.fav; },
  help() { UI.modal = { type: 'help' }; },
  mode(d) { UI.mode = d.id; UI.modal.keep = false; },
  doLoan(d) {
    const r = actLoan(+d.id, d.club); toast(r);
    if (r.ok) UI.modal = { type: 'player', id: +d.id }; else UI.modal.keep = true;
  },
  tab(d) { UI.tab = d.id; },
  clg(d) { UI.clg = d.id; },
  open(d) { UI.modal = { type: 'player', id: +d.id }; },
  close() { UI.modal = null; },
  scout(d) { toast(actScout(+d.id)); },
  sign(d) { const r = actSign(+d.id, +d.lv); toast(r); if (r.ok) UI.modal = null; },
  propose(d) { UI.modal = { type: 'propose', id: +d.id }; UI.lg = CLUBS[getP(+d.id).club].league; },
  lg(d) { UI.lg = d.id; UI.modal.keep = false; },
  doPropose(d) {
    const r = actPropose(+d.id, d.club); toast(r);
    if (r.ok) { UI.modal = null; UI.tab = 'bureau'; } else UI.modal.keep = true;
  },
  raise(d) { toast(actRaise(+d.id)); },
  talk(d) { toast(actTalk(+d.id)); },
  install() { const e = UI.installEvt; UI.installEvt = null; if (e) e.prompt(); },
  auction(d) { const r = actAuction(+d.id); toast(r); if (r.ok) { UI.modal = null; UI.tab = 'bureau'; } },
  trip(d) { const r = actTrip(d.id); toast(r); if (r.ok) UI.mk.fav = true; },
  export() {
    try {
      const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `agent-foot-${S.season}-sem${S.week}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      toast({ ok: true, msg: 'Sauvegarde exportée.' });
    } catch (e) { toast({ ok: false, msg: 'Export impossible sur cet appareil.' }); }
  },
  match(d) { UI.modal = { type: 'match', id: +d.id, src: d.src, i: +d.i }; },
  plan(d) { getP(+d.id).plan = d.k; save(); UI.modal.keep = true; },
  sound() { SND.on = !SND.on; try { localStorage.setItem('agentfoot_sound', SND.on ? '1' : '0'); } catch (e) { /* rien */ } if (SND.on) play(CHIME); },
  cer() { UI.modal = { type: 'cer', i: 0, open: false }; },
  cerNext() { cerNext(); },
  cerClose() { UI.modal = null; },
  acad() { toast(buyAcademy()); },
  achInfo(d) { const a = ACH.find((x) => x.id === d.id); toast({ ok: !!S.ach[a.id], msg: `${a.i} ${a.l} : ${a.d}${S.ach[a.id] ? ` (débloqué en ${S.ach[a.id]})` : ' — pas encore débloqué'}` }); },
  logo(d) { S.agency.logo = d.id; save(); },
  color(d) { S.agency.color = d.id; save(); },
  live() { UI.modal.live = Date.now(); UI.modal.seen = 0; UI.modal.keep = true; startLive(); },
  liveSkip() { UI.modal.live = 1; },
  sponsor(d) { toast(actSponsor(+d.id)); },
  renew(d) { toast(actRenew(+d.id)); },
  jv(d) { UI.jv = d.id; },
  release(d) { if (confirm('Rompre le mandat de ce joueur ?')) { actRelease(+d.id); UI.modal = null; } },
  accept(d) { const r = actAccept(+d.id); toast(r); if (r.ok) play(CHIME); },
  negoOpen(d) { const o = S.offers.find((x) => x.id === +d.id); if (o) UI.modal = { type: 'nego', id: o.pid, oid: o.id }; },
  nego(d) { const r = actNegotiate(+d.id, +d.lv); toast(r); UI.modal = null; if (r.ok) play(CHIME); },
  refuse(d) { actRefuse(+d.id); },
  office() { toast(buyOffice()); },
  staff(d) { toast(hireStaff(d.id)); },
  fire(d) { if (confirm('Licencier ce membre du personnel ?')) toast(fireStaff(d.id)); },
  reset() { if (confirm('Effacer définitivement la partie ?')) { wipe(); UI.tab = 'bureau'; UI.modal = null; } },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { fn(el.dataset); render(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'mkq') return;
  UI.mk.q = e.target.value; render();
  const el = $('#mkq'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
});
document.addEventListener('change', (e) => {
  const k = e.target.dataset && e.target.dataset.filter;
  if (k) { UI.mk[k] = e.target.value; render(); }
  if (e.target.id === 'imp' && e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    if (S && !confirm('Remplacer la partie en cours par cette sauvegarde ?')) return;
    file.text().then((t) => { toast(importSave(t)); UI.tab = 'bureau'; UI.modal = null; render(); });
  }
});

/* ---------- Application installable (PWA) ---------- */
UI.standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); UI.installEvt = e; render(); });
window.addEventListener('appinstalled', () => { UI.installEvt = null; UI.standalone = true; render(); });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    // Vérifie les mises à jour à chaque retour sur l'appli
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update(); });
  }).catch(() => { /* hors ligne ou non supporté */ });
}

load();
render();
