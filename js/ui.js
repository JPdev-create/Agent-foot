/* Interface */
'use strict';

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
    <label>Ville<select id="in-city">${['Liège', 'Bruxelles', 'Charleroi', 'Namur', 'Anvers', 'Gand', 'Marche-en-Famenne', 'Mons'].map((c) => `<option>${c}</option>`).join('')}</select></label>
    <button class="btn big" data-act="start">Créer mon agence</button>
  </div>`;
}

function header() {
  const o = office(), win = inWindow(S.week);
  let pips = '';
  for (let i = 0; i < o.actions; i++) pips += `<i class="${i < S.actions ? 'on' : ''}"></i>`;
  return `<header>
    <div class="h1"><b>${esc(S.agency.name)}</b><span class="win ${win ? 'open' : ''}">${win ? 'Mercato ouvert' : 'Mercato fermé'}</span></div>
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
      <div><small>Indemnité</small><b>${fmt(o.fee)}</b></div>
      <div><small>Votre commission</small><b class="pos">${fmt(o.fee * commissionTransfer())}</b></div>
      <div><small>Salaire/sem.</small><b>${fmt(o.sal)}</b></div>
    </div>
    <small>Prestige du club : ${c.rep} · expire dans ${o.exp - S.t} sem.</small>
    <div class="btns">
      <button class="btn" data-act="accept" data-id="${o.id}">Accepter</button>
      <button class="btn alt" data-act="nego" data-id="${o.id}" ${o.nego ? 'disabled' : ''}>Négocier</button>
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

function viewBureau() {
  const inc = weeklyIncome(), costs = weeklyCosts();
  return `
    ${S.over ? '<div class="card over"><b>Faillite !</b><p>Votre agence a coulé.</p><button class="btn" data-act="reset">Recommencer</button></div>'
    : S.event ? eventCard()
    : `<div class="weekbtns"><button class="btn big" data-act="week">▶ Semaine suivante</button><button class="btn big alt" data-act="fast" title="Avancer de 4 semaines">⏩ ×4</button></div>`}
    ${S.recap ? recapCard() : ''}
    <div class="card grid3">
      <div><small>Revenus/sem.</small><b class="pos">+${fmt(inc)}</b></div>
      <div><small>Frais/sem.</small><b class="neg">-${fmt(costs)}</b></div>
      <div><small>Clients</small><b>${clients().length}/${office().maxClients}</b></div>
    </div>
    ${S.offers.length ? `<h2>Offres sur la table</h2>${S.offers.map(offerCard).join('')}` : ''}
    ${S.wk.length ? `<h2>Matchs de mes joueurs</h2><div class="card mlist">${S.wk.map((x) => { const p = getP(x.pid); return p ? `<div data-act="open" data-id="${p.id}">
      <i class="${resClass(x)}"></i><p><b>${esc(p.n)}</b><small>${scoreTxt(x)}</small></p>
      ${x.out ? `<span class="mut">${x.out}</span>` : `<span>${x.g ? '⚽'.repeat(x.g) : ''}${x.a ? '🅰️'.repeat(x.a) : ''} <b class="${noteClass(x.n)}">${x.n.toFixed(1)}</b></span>`}</div>` : ''; }).join('')}</div>` : ''}
    <h2>Actualités</h2>
    <div class="card news">${S.news.slice(0, 30).map((n) => `<div><span>${n.i}</span><p>${esc(n.x)}<small>S${n.w} · ${n.s}/${(n.s + 1) % 100}</small></p></div>`).join('')}</div>`;
}

function playerRow(p, mine) {
  const o = ovrOf(p);
  return `<div class="prow" data-act="open" data-id="${p.id}">
    <span class="ovr ${ovrClass(o)}">${o}</span>
    <div class="pmain"><b>${p.fav && !mine ? '⭐ ' : ''}${esc(p.n)}${p.intl ? ' 🌍' : ''}${p.inj > 0 ? ' 🚑' : ''}${p.loan ? ' 🔁' : ''}</b><small>${p.pos} · ${p.age} ans · ${clubTxt(p)}</small></div>
    <div class="pside">${mine
    ? `<b>${p.m} m · ${p.g} b · ${p.a} pd</b><small>Note ${avgNote(p)} · Moral ${Math.round(p.morale)}</small>`
    : `<b>Pot. ${potTxt(p)}</b><small>${fmt(playerValue(p))}</small>`}</div></div>`;
}

function viewMarche() {
  const f = UI.mk, locked = f.country !== 'BE' && S.office < INTL_OFFICE;
  let list = S.players.filter((p) => !p.mine && p.nat === f.country && (!f.pos || p.pos === f.pos) && (!f.fav || p.fav));
  const sorters = {
    ovr: (a, b) => b.ovr - a.ovr, age: (a, b) => a.age - b.age || b.ovr - a.ovr,
    pot: (a, b) => (b.sc ? b.potHi : 0) - (a.sc ? a.potHi : 0) || b.ovr - a.ovr,
    val: (a, b) => playerValue(a) - playerValue(b),
  };
  list.sort(sorters[f.sort]);
  const sel = (k, opts) => `<select data-filter="${k}">${opts.map(([v, l]) => `<option value="${v}" ${f[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  return `<div class="filters">
      ${sel('country', Object.keys(COUNTRY_LABEL).map((c) => [c, COUNTRY_LABEL[c]]))}
      ${sel('pos', [['', 'Tous postes'], ...Object.keys(POSITIONS).map((k) => [k, POSITIONS[k]])])}
      ${sel('sort', [['ovr', 'Tri : niveau'], ['pot', 'Tri : potentiel'], ['age', 'Tri : âge'], ['val', 'Tri : moins chers']])}
      <button class="chip ${f.fav ? 'on' : ''}" data-act="favFilter" title="Joueurs suivis">⭐</button>
    </div>
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
    ${Object.keys(EU).map((k) => `<button class="chip ${UI.clg === k ? 'on' : ''}" data-act="clg" data-id="${k}">${EU[k].icon} ${EU[k].name}</button>`).join('')}</div>`;
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

function viewAgence() {
  const o = office(), next = OFFICES[S.office + 1];
  return `<h2>Bureau</h2>
    <div class="card"><div class="row"><b>${o.name}</b><span class="tag">Niveau ${S.office + 1}/${OFFICES.length}</span></div>
      <small>${o.maxClients} clients max · ${o.actions} actions/sem. · ${fmt(o.weekly)}/sem.</small>
      ${next ? `<div class="up"><div><b>→ ${next.name}</b><small>${next.maxClients} clients · ${next.actions} actions · ${fmt(next.weekly)}/sem.${S.office + 1 === INTL_OFFICE ? ' · recrutement à l\'étranger' : ''}</small></div>
      <button class="btn" data-act="office" ${S.cash < next.cost ? 'disabled' : ''}>${fmt(next.cost)}</button></div>` : '<small>Niveau maximum atteint.</small>'}
    </div>
    <h2>Équipe</h2>
    ${Object.keys(STAFF).map((k) => { const s = STAFF[k]; return `<div class="card up"><div><b>${s.name}${S.staff[k] ? ' ✅' : ''}</b><small>${s.desc} ${fmt(s.weekly)}/sem.</small></div>
      <button class="btn ${S.staff[k] ? 'ghost' : ''}" data-act="staff" data-id="${k}" ${!S.staff[k] && S.cash < s.cost ? 'disabled' : ''}>${S.staff[k] ? 'Licencier' : fmt(s.cost)}</button></div>`; }).join('')}
    <h2>Classement des agences</h2>
    <div class="card rank">${[{ n: S.agency.name, rep: S.rep, me: true }, ...S.rivals].sort((a, b) => b.rep - a.rep)
    .map((a, i) => `<div class="${a.me ? 'me' : ''}"><span>${i + 1}</span><p>${esc(a.n)}</p><b>${Math.floor(a.rep)}</b></div>`).join('')}</div>
    <h2>Objectifs</h2>
    <div class="card goals">${GOALS.map((g) => `<div class="${S.goals[g.id] ? 'done' : ''}"><span>${S.goals[g.id] ? '✅' : '⬜'}</span><p>${g.label}<small>Prime : ${fmt(g.reward)}</small></p></div>`).join('')}</div>
    <h2>Statistiques</h2>
    <div class="card grid3">
      <div><small>Transferts</small><b>${S.stats.transfers}</b></div>
      <div><small>Record</small><b>${fmt(S.stats.bestFee)}</b></div>
      <div><small>Gains totaux</small><b>${fmt(S.stats.earned)}</b></div>
    </div>
    <h2>Application</h2>
    <div class="card">${UI.standalone ? '<small>✅ Application installée. Elle se met à jour toute seule à chaque ouverture (connexion nécessaire).</small>'
    : UI.installEvt ? '<button class="btn" data-act="install" style="margin-top:0">📲 Installer l\'application</button><small>Ajoute Agent Foot à votre écran d\'accueil. Mises à jour automatiques.</small>'
    : '<small><b>Installer sur le téléphone</b><br>Android (Chrome) : menu ⋮ → « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».<br>iPhone (Safari) : bouton Partager → « Sur l\'écran d\'accueil ».<br>L\'appli se met ensuite à jour toute seule à chaque ouverture.</small>'}</div>
    <button class="btn alt" data-act="help">❓ Comment jouer</button>
    <button class="btn ghost danger" data-act="reset">Effacer la sauvegarde et recommencer</button>`;
}

/* ---------- Fenêtres ---------- */
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
    ${p.inj > 0 ? `<p class="warn">🚑 Blessé encore ${p.inj} semaine(s).</p>` : ''}`;
  if (!p.mine) {
    const cd = p.cd > S.t, can = canRecruit(p);
    return `${info}
      <button class="btn ghost" data-act="fav" data-id="${p.id}">${p.fav ? '⭐ Suivi — retirer' : '☆ Suivre ce joueur'}</button>
      <button class="btn alt" data-act="scout" data-id="${p.id}" ${p.sc >= 2 ? 'disabled' : ''}>🔎 Observer (1 action)${p.sc >= 2 ? ' — rapport complet' : ''}</button>
      <h4>Proposer un mandat (1 action)</h4>
      ${cd ? `<p class="warn">Il refuse de discuter encore ${p.cd - S.t} semaine(s).</p>` : ''}
      ${!can ? `<p class="warn">🔒 Recrutement à l'étranger non débloqué.</p>` : ''}
      ${['Simple poignée de main', 'Avec prime à la signature', 'Avec grosse prime'].map((l, i) => `<button class="btn line" data-act="sign" data-id="${p.id}" data-lv="${i}" ${cd || !can ? 'disabled' : ''}>
        <span>${l}<small>${i ? 'Coût : ' + fmt(signBonusCost(p, i)) : 'Gratuit'}</small></span><b>${pct(signChance(p, i))}</b></button>`).join('')}`;
  }
  return `${info}
    <div class="grid3">
      <div><small>Moral</small><b>${Math.round(p.morale)}</b></div>
      <div><small>Mandat</small><b>${p.mandate} saison(s)</b></div>
      <div><small>Pour vous</small><b class="pos">${fmt(p.sal * COMMISSION_SALARY)}/s</b></div>
    </div>
    <button class="btn" data-act="propose" data-id="${p.id}" ${inWindow(S.week) && !p.loan ? '' : 'disabled'}>📣 Transfert ou prêt${p.loan ? ' — en prêt cette saison' : inWindow(S.week) ? ' (1 action)' : ' — mercato fermé'}</button>
    <button class="btn alt" data-act="raise" data-id="${p.id}">💶 Demander une revalorisation (1 action)</button>
    ${p.cy <= 1 ? `<button class="btn alt" data-act="renew" data-id="${p.id}" ${p.loan ? 'disabled' : ''}>📝 Négocier une prolongation (1 action)</button>
    <small>Dernière année de contrat : les clubs acheteurs paieront 40 % de moins. Une prolongation vous rapporte 6 semaines de son salaire.</small>` : ''}
    <button class="btn alt" data-act="talk" data-id="${p.id}">💬 Discuter avec lui (1 action)</button>
    <h4>Saison en cours</h4>
    <div class="grid3">
      <div><small>Matchs</small><b>${p.m}</b></div><div><small>Buts</small><b>${p.g}</b></div><div><small>Passes déc.</small><b>${p.a}</b></div>
      <div><small>Note moyenne</small><b>${avgNote(p)}</b></div><div><small>${p.pos === 'GB' || p.pos === 'DEF' ? 'Clean sheets' : 'Buts/match'}</small><b>${p.pos === 'GB' || p.pos === 'DEF' ? p.cs : p.m ? (p.g / p.m).toFixed(2).replace('.', ',') : '–'}</b></div>
      <div><small>Progression</small><b class="pos">+${Math.max(0, Math.floor(p.ovr) - Math.floor(p.o0))}</b></div>
    </div>
    ${p.em ? `<small>Coupe d'Europe : ${p.em} match(s), ${p.eg} but(s)</small>` : ''}
    ${p.log.length ? `<h4>Derniers matchs</h4><div class="mlist">${p.log.map((x) => `<div><i class="${resClass(x)}"></i><p><small>Sem. ${x.w} · ${scoreTxt(x)}</small></p>
      <span>${x.g ? '⚽'.repeat(x.g) : ''}${x.a ? '🅰️'.repeat(x.a) : ''} <b class="${noteClass(x.n)}">${x.n.toFixed(1)}</b></span></div>`).join('')}</div>` : ''}
    ${p.sh.length ? `<h4>Saisons précédentes</h4><table class="tbl"><tr><th>Saison</th><th>Club</th><th>M</th><th>B</th><th>PD</th><th>Note</th></tr>
      ${p.sh.map((h) => `<tr><td>${h.s}</td><td>${esc(h.club)}</td><td>${h.m}</td><td>${h.g}</td><td>${h.a}</td><td>${h.m ? h.avg.toFixed(1) : '–'}</td></tr>`).join('')}</table>` : ''}
    ${p.aw.length ? `<h4>Palmarès</h4>${p.aw.map((a) => `<small>🏅 ${esc(a)}</small>`).join('')}` : ''}
    ${p.hist.length ? `<h4>Transferts</h4>${p.hist.map((h) => `<small>${h.s} : ${esc(h.from)} → ${esc(h.to)} (${fmt(h.fee)})</small>`).join('')}` : ''}
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
      sub = c.rep > cur.rep ? 'Club plus prestigieux' : 'Niveau équivalent';
    }
    return `<div class="prow"><span class="ovr ${ovrClass(c.rep - 10)}">${c.rep}</span>
        <div class="pmain"><b>${esc(c.name)}</b><small>${why || sub}</small></div>
        <button class="btn sm" data-act="${loan ? 'doLoan' : 'doPropose'}" data-id="${p.id}" data-club="${esc(c.id)}" ${why ? 'disabled' : ''}>${loan ? 'Prêter' : 'Proposer'}</button></div>`;
  }).join('')}</div>
    <button class="btn ghost" data-act="open" data-id="${p.id}">← Retour</button>`;
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
    <p><b>5. Grandissez.</b> Agrandissez le bureau (plus de clients et d'actions), engagez du personnel et grimpez au classement des agences jusqu'aux 5 grands championnats.</p>
    <p><b>Attention</b> au moral de vos joueurs (un joueur frustré peut partir) et à votre caisse : faillite à -25 k€.</p>
    </div><button class="btn" data-act="close">C'est parti</button>`;
}

function renderModal() {
  const m = UI.modal;
  if (!m) { $('#modal').innerHTML = ''; return; }
  const p = m.type === 'help' ? null : getP(m.id);
  if (!p && m.type !== 'help') { UI.modal = null; $('#modal').innerHTML = ''; return; }
  const sc = $('#modal .sheet') ? $('#modal .sheet').scrollTop : 0;
  $('#modal').innerHTML = `<div class="backdrop" data-act="close"></div><div class="sheet">
    <button class="x" data-act="close">✕</button>${m.type === 'help' ? modalHelp() : m.type === 'propose' ? modalPropose(p) : modalPlayer(p)}</div>`;
  if (m.keep) $('#modal .sheet').scrollTop = sc;
}

function render() {
  const app = $('#app');
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
  start() { newGame($('#in-name').value.trim(), $('#in-city').value); UI.modal = { type: 'help' }; },
  week() { nextWeek(); },
  fast() {
    for (let i = 0; i < 4; i++) {
      nextWeek();
      if (S.over || S.event || S.offers.length || S.recap || S.week === 20) break;
    }
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
  renew(d) { toast(actRenew(+d.id)); },
  jv(d) { UI.jv = d.id; },
  release(d) { if (confirm('Rompre le mandat de ce joueur ?')) { actRelease(+d.id); UI.modal = null; } },
  accept(d) { toast(actAccept(+d.id)); },
  nego(d) { toast(actNegotiate(+d.id)); },
  refuse(d) { actRefuse(+d.id); },
  office() { toast(buyOffice()); },
  staff(d) { toast(hireStaff(d.id)); },
  reset() { if (confirm('Effacer définitivement la partie ?')) { wipe(); UI.tab = 'bureau'; UI.modal = null; } },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { fn(el.dataset); render(); }
});
document.addEventListener('change', (e) => {
  const k = e.target.dataset && e.target.dataset.filter;
  if (k) { UI.mk[k] = e.target.value; render(); }
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
