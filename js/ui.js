/* Interface */
'use strict';

const UI = { tab: 'bureau', modal: null, toast: null, mk: { country: 'BE', pos: '', sort: 'ovr' }, lg: 'BE1' };
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ovrOf = (p) => Math.floor(p.ovr);
const potTxt = (p) => (p.sc === 0 ? '??' : `${p.potLo}–${p.potHi}`);
const ovrClass = (o) => (o >= 80 ? 'r5' : o >= 70 ? 'r4' : o >= 60 ? 'r3' : o >= 50 ? 'r2' : 'r1');
const clubTxt = (p) => `${LEAGUES[CLUBS[p.club].league].flag} ${esc(CLUBS[p.club].name)}`;
const pct = (x) => Math.round(x * 100) + ' %';

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

function viewBureau() {
  const inc = weeklyIncome(), costs = weeklyCosts();
  return `
    ${S.over ? '<div class="card over"><b>Faillite !</b><p>Votre agence a coulé.</p><button class="btn" data-act="reset">Recommencer</button></div>'
    : `<button class="btn big" data-act="week">▶ Semaine suivante</button>`}
    <div class="card grid3">
      <div><small>Revenus/sem.</small><b class="pos">+${fmt(inc)}</b></div>
      <div><small>Frais/sem.</small><b class="neg">-${fmt(costs)}</b></div>
      <div><small>Clients</small><b>${clients().length}/${office().maxClients}</b></div>
    </div>
    ${S.offers.length ? `<h2>Offres sur la table</h2>${S.offers.map(offerCard).join('')}` : ''}
    <h2>Actualités</h2>
    <div class="card news">${S.news.slice(0, 30).map((n) => `<div><span>${n.i}</span><p>${esc(n.x)}<small>S${n.w} · ${n.s}/${(n.s + 1) % 100}</small></p></div>`).join('')}</div>`;
}

function playerRow(p, mine) {
  const o = ovrOf(p);
  return `<div class="prow" data-act="open" data-id="${p.id}">
    <span class="ovr ${ovrClass(o)}">${o}</span>
    <div class="pmain"><b>${esc(p.n)}${p.inj > 0 ? ' 🚑' : ''}</b><small>${p.pos} · ${p.age} ans · ${clubTxt(p)}</small></div>
    <div class="pside">${mine
    ? `<b>${fmt(p.sal * COMMISSION_SALARY)}/s</b><small>Moral ${Math.round(p.morale)}</small>`
    : `<b>Pot. ${potTxt(p)}</b><small>${fmt(playerValue(p))}</small>`}</div></div>`;
}

function viewMarche() {
  const f = UI.mk, locked = f.country !== 'BE' && S.office < INTL_OFFICE;
  let list = S.players.filter((p) => !p.mine && p.nat === f.country && (!f.pos || p.pos === f.pos));
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
    </div>
    ${locked ? `<div class="card warn">🔒 Recrutement à l'étranger débloqué avec le bureau « ${OFFICES[INTL_OFFICE].name} ». Vous pouvez déjà observer.</div>` : ''}
    <div class="card list">${list.slice(0, 80).map((p) => playerRow(p, false)).join('') || '<p class="empty">Aucun joueur.</p>'}</div>`;
}

function viewJoueurs() {
  const cl = clients().sort((a, b) => b.ovr - a.ovr);
  if (!cl.length) return `<div class="card empty"><p>Aucun client pour l'instant.</p><p>Allez sur le <b>Marché</b>, observez de jeunes Belges et proposez-leur un mandat.</p></div>`;
  return `<div class="card list">${cl.map((p) => playerRow(p, true)).join('')}</div>
    <p class="hint">Vous touchez ${pct(COMMISSION_SALARY)} du salaire de vos clients chaque semaine et ${pct(commissionTransfer())} de chaque transfert.</p>`;
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
    <h2>Objectifs</h2>
    <div class="card goals">${GOALS.map((g) => `<div class="${S.goals[g.id] ? 'done' : ''}"><span>${S.goals[g.id] ? '✅' : '⬜'}</span><p>${g.label}<small>Prime : ${fmt(g.reward)}</small></p></div>`).join('')}</div>
    <h2>Statistiques</h2>
    <div class="card grid3">
      <div><small>Transferts</small><b>${S.stats.transfers}</b></div>
      <div><small>Record</small><b>${fmt(S.stats.bestFee)}</b></div>
      <div><small>Gains totaux</small><b>${fmt(S.stats.earned)}</b></div>
    </div>
    <button class="btn ghost danger" data-act="reset">Effacer la sauvegarde et recommencer</button>`;
}

/* ---------- Fenêtres ---------- */
function modalPlayer(p) {
  const o = ovrOf(p), c = CLUBS[p.club];
  const info = `<div class="mhead"><span class="ovr big ${ovrClass(o)}">${o}</span>
      <div><h3>${esc(p.n)}</h3><small>${POSITIONS[p.pos]} · ${p.age} ans · ${COUNTRY_LABEL[p.nat]}</small><small>${clubTxt(p)} (prestige ${c.rep})</small></div></div>
    <div class="grid3">
      <div><small>Potentiel</small><b>${potTxt(p)}</b></div>
      <div><small>Valeur</small><b>${fmt(playerValue(p))}</b></div>
      <div><small>Salaire/sem.</small><b>${fmt(p.sal)}</b></div>
      <div><small>Temps de jeu</small><b>${pct(playProb(p))}</b></div>
      <div><small>Saison</small><b>${p.m} m. · ${p.g} b.</b></div>
      <div><small>Contrat club</small><b>${p.cy} an(s)</b></div>
    </div>
    ${p.inj > 0 ? `<p class="warn">🚑 Blessé encore ${p.inj} semaine(s).</p>` : ''}`;
  if (!p.mine) {
    const cd = p.cd > S.t, can = canRecruit(p);
    return `${info}
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
    <button class="btn" data-act="propose" data-id="${p.id}" ${inWindow(S.week) ? '' : 'disabled'}>📣 Proposer à un club${inWindow(S.week) ? ' (1 action)' : ' — mercato fermé'}</button>
    <button class="btn alt" data-act="raise" data-id="${p.id}">💶 Demander une revalorisation (1 action)</button>
    <button class="btn alt" data-act="talk" data-id="${p.id}">💬 Discuter avec lui (1 action)</button>
    ${p.hist.length ? `<h4>Transferts</h4>${p.hist.map((h) => `<small>${h.s} : ${esc(h.from)} → ${esc(h.to)} (${fmt(h.fee)})</small>`).join('')}` : ''}
    <button class="btn ghost danger" data-act="release" data-id="${p.id}">Rompre le mandat</button>`;
}

function modalPropose(p) {
  const cur = CLUBS[p.club];
  const list = clubsOf(UI.lg).sort((a, b) => b.rep - a.rep);
  return `<h3>Proposer ${esc(p.n)}</h3>
    <small>Niveau ${ovrOf(p)} · potentiel ${potTxt(p)} · valeur ${fmt(playerValue(p))}. Un club regarde le niveau actuel, ou le potentiel pour les jeunes.</small>
    <div class="chips">${Object.keys(LEAGUES).map((l) => `<button class="chip ${UI.lg === l ? 'on' : ''}" data-act="lg" data-id="${l}">${LEAGUES[l].flag} ${LEAGUES[l].name}</button>`).join('')}</div>
    <div class="list">${list.map((c) => {
    const same = c.id === p.club, low = !playerAccepts(p, c), rej = p.rej[c.id] > S.t;
    const why = same ? 'Club actuel' : low ? 'Trop petit pour lui' : rej ? 'A déjà refusé' : '';
    return `<div class="prow"><span class="ovr ${ovrClass(c.rep - 10)}">${c.rep}</span>
        <div class="pmain"><b>${esc(c.name)}</b><small>${why || (c.rep > cur.rep ? 'Club plus prestigieux' : 'Niveau équivalent')}</small></div>
        <button class="btn sm" data-act="doPropose" data-id="${p.id}" data-club="${esc(c.id)}" ${why ? 'disabled' : ''}>Proposer</button></div>`;
  }).join('')}</div>
    <button class="btn ghost" data-act="open" data-id="${p.id}">← Retour</button>`;
}

function renderModal() {
  const m = UI.modal;
  if (!m) { $('#modal').innerHTML = ''; return; }
  const p = getP(m.id);
  if (!p) { UI.modal = null; $('#modal').innerHTML = ''; return; }
  const sc = $('#modal .sheet') ? $('#modal .sheet').scrollTop : 0;
  $('#modal').innerHTML = `<div class="backdrop" data-act="close"></div><div class="sheet">
    <button class="x" data-act="close">✕</button>${m.type === 'propose' ? modalPropose(p) : modalPlayer(p)}</div>`;
  if (m.keep) $('#modal .sheet').scrollTop = sc;
}

function render() {
  const app = $('#app');
  if (!S) { app.innerHTML = viewStart(); $('#modal').innerHTML = ''; renderToast(); return; }
  const views = { bureau: viewBureau, marche: viewMarche, joueurs: viewJoueurs, agence: viewAgence };
  const tabs = [['bureau', '🏠', 'Bureau'], ['marche', '🔎', 'Marché'], ['joueurs', '👥', 'Joueurs'], ['agence', '🏢', 'Agence']];
  const y = window.scrollY, same = app.dataset.tab === UI.tab;
  app.innerHTML = `${header()}<main>${views[UI.tab]()}</main>
    <nav>${tabs.map(([k, i, l]) => `<button class="${UI.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}"><span>${i}</span>${l}${k === 'bureau' && S.offers.length ? `<em>${S.offers.length}</em>` : ''}</button>`).join('')}</nav>`;
  app.dataset.tab = UI.tab;
  window.scrollTo(0, same ? y : 0);
  renderModal(); renderToast();
}

/* ---------- Événements ---------- */
const ACTIONS = {
  start() { newGame($('#in-name').value.trim(), $('#in-city').value); },
  week() { nextWeek(); },
  tab(d) { UI.tab = d.id; },
  open(d) { UI.modal = { type: 'player', id: +d.id }; },
  close() { UI.modal = null; },
  scout(d) { toast(actScout(+d.id)); },
  sign(d) { const r = actSign(+d.id, +d.lv); toast(r); if (r.ok) UI.modal = null; },
  propose(d) { UI.modal = { type: 'propose', id: +d.id }; },
  lg(d) { UI.lg = d.id; UI.modal.keep = false; },
  doPropose(d) {
    const r = actPropose(+d.id, d.club); toast(r);
    if (r.ok) { UI.modal = null; UI.tab = 'bureau'; } else UI.modal.keep = true;
  },
  raise(d) { toast(actRaise(+d.id)); },
  talk(d) { toast(actTalk(+d.id)); },
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

load();
render();
