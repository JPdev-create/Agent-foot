/* Interface */
'use strict';

/* ---------- Sons (WebAudio, aucun fichier) ---------- */
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
const CITIES = ['Liège', 'Bruxelles', 'Charleroi', 'Namur', 'Anvers', 'Gand', 'Marche-en-Famenne', 'Mons'];
const POS_SHORT = { GB: 'GB', DEF: 'DEF', MIL: 'MIL', ATT: 'ATT' };

const UI = {
  tab: 'home', modal: null, toast: null, newsAll: false,
  mk: { country: 'BE', pos: '', sort: 'ovr', fav: false, q: '' },
  cs: 'ovr', jv: 'list', lg: 'BE1', mode: 'transfer',
  cmode: 'lg', clg: 'BE1', cview: 'table', eu: 'C1', av: 'dev',
  nw: { name: 'JP Sport Management', logo: '⚽', color: '#35d07f', diff: 1, city: 'Liège' },
};

/* ---------- Petits utilitaires d'affichage ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ovrOf = (p) => Math.floor(p.ovr);
const potTxt = (p) => (p.sc === 0 ? '??' : `${p.potLo}–${p.potHi}`);
const ovrClass = (o) => (o >= 80 ? 'r5' : o >= 70 ? 'r4' : o >= 60 ? 'r3' : o >= 50 ? 'r2' : 'r1');
const clubTxt = (p) => `${LEAGUES[CLUBS[p.club].league].flag} ${esc(CLUBS[p.club].name)}`;
const pct = (x) => Math.round(x * 100) + ' %';
const avgNote = (p) => (p.m ? (p.rs / p.m).toFixed(1) : '–');
const noteClass = (n) => (n >= 7.5 ? 'pos' : n < 5.5 ? 'neg' : '');
const scoreTxt = (x) => `${x.cup ? EU[x.cup].icon + ' ' + EU[x.cup].short : x.home ? 'Dom.' : 'Ext.'} ${esc(CLUBS[x.opp].name)} ${x.gf}-${x.ga}`;
const resClass = (x) => (x.gf > x.ga ? 'w' : x.gf < x.ga ? 'l' : 'd');
const forYou = (p) => p.sal * COMMISSION_SALARY + (p.sp ? p.sp.w : 0);
const moralCls = (m) => (m < 35 ? 'bad' : m < 60 ? 'mid' : '');
const seasonTxt = (s) => `${s}/${(s + 1) % 100}`;

const rt = (o, size) => `<span class="rt ${size || ''} ${ovrClass(o)}">${o}</span>`;
const tag = (t, cls) => `<span class="tag ${cls || ''}">${t}</span>`;
const cost = (n) => `<span class="cost">${n} action${n > 1 ? 's' : ''}</span>`;
const stat = (l, v, cls) => `<div class="stat"><small>${l}</small><b class="${cls || ''}">${v}</b></div>`;
const bar = (w, cls) => `<div class="bar"><i class="${cls || ''}" style="width:${Math.max(0, Math.min(100, w))}%"></i></div>`;
const sec = (title, body, link) => `<section class="sec"><div class="sec-h"><h2>${title}</h2>${link || ''}</div>${body}</section>`;
const seg = (act, cur, items) => `<div class="seg">${items.map(([k, l]) => `<button class="${cur === k ? 'on' : ''}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
const pills = (act, cur, items) => `<div class="pills">${items.map(([k, l]) => `<button class="pill ${cur === k ? 'on' : ''}" data-act="${act}" data-id="${esc(k)}">${l}</button>`).join('')}</div>`;
const actBtn = (act, id, ic, title, sub, n, opt) => `<button class="act ${opt && opt.primary ? 'primary' : ''}" data-act="${act}" data-id="${id}" ${opt && opt.disabled ? 'disabled' : ''}>
  <span class="ic">${ic}</span><span class="tx"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${n ? cost(n) : ''}</button>`;
const nextWindowTxt = () => (S.week < 20 ? `le mercato d'hiver ouvre dans ${20 - S.week} sem.` : `le mercato d'été rouvre en début de saison`);

function toast(r) {
  if (!r || !r.msg) return;
  UI.toast = { msg: r.msg, ok: r.ok };
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { UI.toast = null; renderToast(); }, 3600);
}
function renderToast() {
  $('#toast').innerHTML = UI.toast ? `<div class="toast-wrap"><div class="toast ${UI.toast.ok ? 'ok' : ''}"><span>${UI.toast.ok ? '✅' : '⚠️'}</span><span>${esc(UI.toast.msg)}</span></div></div>` : '';
}

/* ============ Écran d'accueil (nouvelle partie) ============ */
function viewStart() {
  const n = UI.nw;
  return `<div class="hero" style="--acc:${n.color}"><div class="logo">${n.logo}</div><h1>Agent Foot</h1>
      <p>Fondez votre agence de joueurs en Belgique, dénichez des pépites dans les petits clubs et emmenez-les jusqu'aux 5 grands championnats européens.</p></div>
    <div class="start" style="--acc:${n.color}">
      <div class="card">
        <label class="field"><span>Nom de l'agence</span><input id="in-name" maxlength="24" value="${esc(n.name)}"></label>
        <div class="field"><span>Logo</span><div class="logos">${LOGOS.map((l) => `<button class="lg-pick ${n.logo === l ? 'on' : ''}" data-act="nwLogo" data-id="${l}">${l}</button>`).join('')}</div></div>
        <div class="field"><span>Couleur</span><div class="swatches">${COLORS.map(([c, nm]) => `<button class="sw ${n.color === c ? 'on' : ''}" style="background:${c}" data-act="nwColor" data-id="${c}" aria-label="${nm}"></button>`).join('')}</div></div>
        <div class="field"><span>Difficulté</span><div class="diffs">${DIFFS.map((d, i) => `<button class="${n.diff === i ? 'on' : ''}" data-act="nwDiff" data-id="${i}"><b>${d.name}</b><small>${fmt(d.cash)}</small></button>`).join('')}</div></div>
        <label class="field"><span>Ville du siège</span><select id="in-city">${CITIES.map((c) => `<option ${n.city === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <button class="btn lg" data-act="start">Créer mon agence</button>
      </div>
      <label class="btn ghost file">📥 Reprendre une sauvegarde<input type="file" id="imp" accept=".json,application/json" hidden></label>
    </div>`;
}

/* ============ Barre du haut et navigation ============ */
function topbar() {
  const o = office(), win = inWindow(S.week);
  const dots = Array.from({ length: o.actions }, (_, i) => `<i class="${i < S.actions ? 'on' : ''}"></i>`).join('');
  return `<header class="top">
    <div class="top-row">
      <div class="brand"><span class="logo">${esc(S.agency.logo || '⚽')}</span><div style="min-width:0"><b>${esc(S.agency.name)}</b><small>Saison ${seasonTxt(S.season)} · semaine ${S.week}/${SEASON_WEEKS}</small></div></div>
      <span class="mk ${win ? 'open' : ''}"><i></i>${win ? 'Mercato ouvert' : 'Mercato fermé'}</span>
    </div>
    <div class="kpis">
      <div class="kpi"><small>Caisse</small><b class="${S.cash < 0 ? 'neg' : ''}">${fmt(S.cash)}</b></div>
      <div class="kpi"><small>Réputation</small><b>${Math.floor(S.rep)}</b><div class="mini"><i style="width:${S.rep}%"></i></div></div>
      <div class="kpi"><small>Rang</small><b>${agencyRank()}<span class="mut" style="font-weight:500;font-size:12px">/${S.rivals.length + 1}</span></b></div>
      <div class="kpi"><small>Actions</small><div class="adots">${dots}</div></div>
    </div>
    <div class="season-bar"><i style="width:${(S.week - 1) / SEASON_WEEKS * 100}%"></i></div>
  </header>`;
}

const alertsOf = (p) => (p.inj > 0 ? 1 : 0) + (p.free ? 1 : 0) + (p.morale < 35 ? 1 : 0);
function navbar() {
  const tabs = [['home', '🏠', 'Accueil', S.offers.length + (S.event ? 1 : 0)], ['clients', '👥', 'Joueurs', clients().filter(alertsOf).length],
    ['scout', '🔎', 'Recrutement', 0], ['compet', '🏆', 'Compétitions', 0], ['agence', '🏢', 'Agence', 0]];
  return `<nav class="tabs">${tabs.map(([k, i, l, n]) => `<button class="${UI.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}"><span>${i}</span>${l}${n ? `<em>${n}</em>` : ''}</button>`).join('')}</nav>`;
}

/* ============ Accueil ============ */
function offerCard(o) {
  const p = getP(o.pid), c = CLUBS[o.club];
  return `<div class="card hl">
    <div class="card-h"><div><span class="kicker">Offre pour ${esc(p.n)}</span><b>${LEAGUES[c.league].flag} ${esc(c.name)}</b><small>${LEAGUES[c.league].name} · prestige ${c.rep}</small></div>
      ${tag(`⏳ ${o.exp - S.t} sem.`, o.exp - S.t <= 1 ? 'bad' : 'warn')}</div>
    <div class="stats">
      ${stat('Indemnité', o.free ? 'Libre' : fmt(o.fee))}
      ${stat(o.free ? 'Votre prime' : 'Votre commission', fmt(o.free ? o.bonus : o.fee * commissionTransfer()), 'pos')}
      ${stat('Salaire / sem.', fmt(o.sal))}
    </div>
    ${dreamMatch(p.dream, c) ? '<div class="note warn">🌟 Ce club réaliserait son rêve de carrière.</div>' : ''}
    <div class="btns">
      <button class="btn" data-act="accept" data-id="${o.id}">✔ Accepter</button>
      <button class="btn sec" data-act="negoOpen" data-id="${o.id}" ${o.nego ? 'disabled' : ''}>Négocier</button>
      <button class="btn ghost" data-act="refuse" data-id="${o.id}">Refuser</button>
    </div></div>`;
}

function eventCard() {
  const v = eventView(), p = getP(S.event.pid);
  return `<div class="card warnc"><span class="kicker">⚡ Décision à prendre${p ? ` · ${esc(p.n)}` : ''}</span><h3>${esc(v.title)}</h3><p>${esc(v.text)}</p>
    ${v.choices.map((c, i) => `<button class="btn ${i ? 'sec' : ''}" data-act="event" data-id="${i}">${esc(c)}</button>`).join('')}</div>`;
}

function recapCard() {
  const r = S.recap, net = r.inc - r.costs;
  return `<div class="card goldc"><div class="card-h"><div><span class="kicker">Fin de saison</span><b>🎉 Bilan ${r.label}</b></div><button class="btn sm sec" data-act="recap">Fermer</button></div>
    <div class="stats">
      ${stat('Gains', fmt(r.inc), 'pos')}${stat('Frais', fmt(r.costs), 'neg')}${stat('Résultat', fmt(net), net < 0 ? 'neg' : 'pos')}
    </div><div class="stats">
      ${stat('Transferts', r.tr)}${stat('Réputation', `${Math.floor(r.rep0)} → ${Math.floor(r.rep1)}`)}${stat('Classement', `${r.rank}ᵉ`)}
    </div>${r.best ? `<small style="margin-top:8px">📈 Meilleure progression : ${esc(r.best)}</small>` : ''}</div>`;
}

function missionsBlock() {
  if (!S.mis || !S.mis.length) return '';
  const done = S.mis.filter((m) => m.done).length;
  return sec(`🎯 Missions de la saison`, `<div class="list">${S.mis.map((m) => {
    const M = MISSIONS[m.k], pr = Math.min(m.n, M.prog()), w = m.done ? 100 : Math.round(pr / m.n * 100);
    return `<div class="row"><span class="ico">${m.done ? '✅' : '🎯'}</span><div class="main"><b style="white-space:normal">${esc(M.t(m.n))}</b>
      <div style="display:flex;align-items:center;gap:8px;margin-top:6px"><div style="flex:1">${bar(w, m.done ? '' : 'gold')}</div><small>${m.done ? 'Accomplie' : M.money ? `${fmt(pr)} / ${fmt(m.n)}` : `${pr} / ${m.n}`}</small></div></div>
      <div class="side"><b class="${m.done ? 'mut' : 'gold'}">${fmt(m.r)}</b></div></div>`;
  }).join('')}</div>`, `<small>${done}/${S.mis.length}</small>`);
}

function agendaBlock() {
  const w = S.week, out = [];
  if (w <= 6) out.push(['🔓', 'Fin du mercato d\'été', 7 - w]);
  else if (w < 20) out.push(['📅', 'Ouverture du mercato d\'hiver', 20 - w]);
  else if (w <= 23) out.push(['🔓', 'Fin du mercato d\'hiver', 24 - w]);
  const r = EU_WEEKS.findIndex((x) => x > w);
  if (r >= 0) out.push(['🏆', `${EU_ROUNDS[r]} européens`, EU_WEEKS[r] - w]);
  const t = tourName(S.season);
  out.push(['🎬', `Cérémonie des trophées${t ? ` + ${t} ${S.season + 1}` : ''}`, SEASON_WEEKS + 1 - w]);
  return sec('📆 À venir', `<div class="list">${out.map(([i, x, n]) => `<div class="row"><span class="ico">${i}</span><div class="main"><b style="font-weight:550">${x}</b></div><div class="side">${tag(`dans ${n} sem.`)}</div></div>`).join('')}</div>`);
}

function weekMatches() {
  if (!S.wk.length) return '';
  return sec('⚽ Matchs de mes joueurs', `<div class="list">${S.wk.map((x, i) => { const p = getP(x.pid); return p ? `<div class="row" data-act="match" data-id="${p.id}" data-src="wk" data-i="${i}">
    <span class="res ${resClass(x)}"></span><div class="main"><b>${esc(p.n)}</b><small>${scoreTxt(x)}</small></div>
    <div class="side">${x.out ? `<small>${x.out}</small>` : `<b>${x.g ? '⚽'.repeat(x.g) : ''}${x.a ? '🅰️'.repeat(x.a) : ''} <span class="${noteClass(x.n)}">${x.n.toFixed(1)}</span></b>`}</div><span class="chev">›</span></div>` : ''; }).join('')}</div>`);
}

function viewHome() {
  const inc = weeklyIncome(), costs = weeklyCosts(), net = inc - costs;
  let h = '';
  if (S.over) h += `<div class="card badc"><span class="kicker">Partie terminée</span><h3>💀 Faillite</h3><p>Les dettes de l'agence ont dépassé ${fmt(DIFFS[S.diff].bank)}.</p><button class="btn" data-act="reset">Recommencer une partie</button></div>`;
  if (S.event) h += eventCard();
  if (S.offers.length) h += sec(`📨 Offres sur la table (${S.offers.length})`, S.offers.map(offerCard).join(''));
  if (S.cer && S.week <= 6) h += `<div class="card goldc cer-cta" data-act="cer"><span>🎬</span><div><b>Cérémonie des trophées ${S.cer.label}</b><small>Golden Boy, Soulier d'or, Ballon d'Or… Revoir la soirée</small></div><b class="gold">▶</b></div>`;
  if (S.recap) h += recapCard();
  h += sec('💼 Cette semaine', `<div class="card"><div class="stats">
      ${stat('Revenus', '+' + fmt(inc), 'pos')}${stat('Frais', '-' + fmt(costs), 'neg')}${stat('Solde', (net >= 0 ? '+' : '') + fmt(net), net < 0 ? 'neg' : 'pos')}
    </div><div class="split" style="margin-top:10px"><small>👥 ${clients().length}/${office().maxClients} clients</small><small>⚡ ${S.actions} action(s) restante(s)</small></div></div>`);
  h += weekMatches();
  h += missionsBlock();
  h += agendaBlock();
  const news = S.news.slice(0, UI.newsAll ? 60 : 8);
  h += sec('📰 Actualités', `<div class="list">${news.map((n) => `<div class="row" style="align-items:flex-start"><span class="ico" style="font-size:18px">${n.i}</span><div class="main"><span style="font-size:13.5px;display:block">${esc(n.x)}</span><small>Semaine ${n.w} · ${seasonTxt(n.s)}</small></div></div>`).join('')}</div>`,
    S.news.length > 8 ? `<button class="link" data-act="newsAll">${UI.newsAll ? 'Réduire' : 'Tout voir'}</button>` : '');
  return h;
}

function dock() {
  if (UI.tab !== 'home' || S.over) return '';
  const block = !!S.event;
  return `<div class="dock"><button class="btn lg" data-act="week" ${block ? 'disabled' : ''}>${block ? '⚡ Décision en attente' : '▶ Semaine suivante'}</button>
    <button class="btn lg sec icon" data-act="fast" ${block ? 'disabled' : ''} title="Avancer de 4 semaines">⏩ ×4</button></div>`;
}

/* ============ Mes joueurs ============ */
function clientRow(p) {
  const t = [];
  if (p.inj > 0) t.push(tag(`🚑 ${p.inj} sem.`, 'bad'));
  if (p.free) t.push(tag('🆓 Libre', 'warn')); else if (p.cy <= 1) t.push(tag('📝 Fin de contrat', 'warn'));
  if (p.morale < 35) t.push(tag('😠 Moral bas', 'bad'));
  if (p.loan) t.push(tag('🔁 En prêt', 'info'));
  if (p.promise) t.push(tag('🤞 Promesse', 'warn'));
  if (p.intl) t.push(tag('🌍 International', 'ok'));
  return `<button class="row" data-act="open" data-id="${p.id}">${rt(ovrOf(p))}
    <div class="main"><b>${esc(p.n)}</b><small>${POS_SHORT[p.pos]} · ${p.age} ans · ${clubTxt(p)}</small>${t.length ? `<div class="tags">${t.join('')}</div>` : ''}</div>
    <div class="side"><b class="pos">${fmt(forYou(p))}<span class="mut" style="font-weight:500">/s</span></b><small>${p.m} m · ${p.g} b · ${avgNote(p)}</small><div class="mor"><i class="${moralCls(p.morale)}" style="width:${p.morale}%"></i></div></div>
    <span class="chev">›</span></button>`;
}

function viewClients() {
  const cl = clients();
  if (!cl.length) {
    return `<div class="card"><p class="empty"><span class="big">🧑‍💼</span>Aucun client pour l'instant.<br>Repérez de jeunes talents et proposez-leur un mandat.</p>
      <button class="btn" data-act="tab" data-id="scout">🔎 Aller au recrutement</button></div>`;
  }
  const sorters = { ovr: (a, b) => b.ovr - a.ovr, val: (a, b) => playerValue(b) - playerValue(a), inc: (a, b) => forYou(b) - forYou(a), mor: (a, b) => a.morale - b.morale, age: (a, b) => a.age - b.age };
  cl.sort(sorters[UI.cs]);
  const total = cl.reduce((s, p) => s + playerValue(p), 0);
  let h = `<div class="card"><div class="stats">${stat('Clients', `${cl.length}/${office().maxClients}`)}${stat('Revenus / sem.', fmt(cl.reduce((s, p) => s + forYou(p), 0)), 'pos')}${stat('Valeur totale', fmt(total))}</div></div>`;
  h += seg('jv', UI.jv, [['list', '👥 Effectif'], ['stats', '📊 Statistiques']]);
  if (UI.jv === 'stats') {
    const by = cl.slice().sort((a, b) => (b.m ? b.rs / b.m : 0) - (a.m ? a.rs / a.m : 0));
    return h + `<div class="card flush"><table class="tbl"><tr><th></th><th class="l">Joueur</th><th>M</th><th>B</th><th>PD</th><th>Note</th></tr>
      ${by.map((p) => `<tr data-act="open" data-id="${p.id}"><td>${rt(ovrOf(p), 'sm')}</td><td class="l">${esc(p.n)}<small>${POS_SHORT[p.pos]} · ${esc(CLUBS[p.club].name)}</small></td><td>${p.m}</td><td>${p.g}</td><td>${p.a}</td><td><b class="${p.m ? noteClass(p.rs / p.m) : ''}">${avgNote(p)}</b></td></tr>`).join('')}
      <tr><td></td><td class="l"><b>Total</b></td><td><b>${cl.reduce((s, p) => s + p.m, 0)}</b></td><td><b>${cl.reduce((s, p) => s + p.g, 0)}</b></td><td><b>${cl.reduce((s, p) => s + p.a, 0)}</b></td><td></td></tr></table></div>`;
  }
  h += pills('cs', UI.cs, [['ovr', 'Niveau'], ['inc', 'Revenus'], ['val', 'Valeur'], ['mor', 'Moral bas'], ['age', 'Âge']]);
  return h + `<div class="list">${cl.map(clientRow).join('')}</div>
    <p class="hint">Vous touchez ${pct(COMMISSION_SALARY)} du salaire de vos clients chaque semaine et ${pct(commissionTransfer())} de chaque transfert.</p>`;
}

/* ============ Recrutement ============ */
function marketRow(p) {
  const t = [];
  if (p.cov) t.push(tag('👀 Convoité', 'bad'));
  if (p.sc >= 2) t.push(tag('📋 Rapport complet', 'ok')); else if (p.sc === 1) t.push(tag('🔎 Observé', 'info'));
  if (!canRecruit(p)) t.push(tag('🔒'));
  return `<button class="row" data-act="open" data-id="${p.id}">${rt(ovrOf(p))}
    <div class="main"><b>${p.fav ? '⭐ ' : ''}${esc(p.n)}</b><small>${POS_SHORT[p.pos]} · ${p.age} ans · ${clubTxt(p)}</small>${t.length ? `<div class="tags">${t.join('')}</div>` : ''}</div>
    <div class="side"><b>Pot. ${potTxt(p)}</b><small>${fmt(playerValue(p))}</small></div><span class="chev">›</span></button>`;
}

function viewScout() {
  const f = UI.mk, q = norm((f.q || '').trim()), locked = f.country !== 'BE' && S.office < INTL_OFFICE;
  let list = q ? S.players.filter((p) => !p.mine && norm(p.n).includes(q))
    : S.players.filter((p) => !p.mine && p.nat === f.country && (!f.pos || p.pos === f.pos) && (!f.fav || p.fav));
  const sorters = {
    ovr: (a, b) => b.ovr - a.ovr, age: (a, b) => a.age - b.age || b.ovr - a.ovr,
    pot: (a, b) => (b.sc ? b.potHi : 0) - (a.sc ? a.potHi : 0) || b.ovr - a.ovr, val: (a, b) => playerValue(a) - playerValue(b),
  };
  list.sort(sorters[f.sort]);
  const sel = (k, opts) => `<select data-filter="${k}">${opts.map(([v, l]) => `<option value="${v}" ${f[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  return `<div class="search"><input id="mkq" type="search" placeholder="Rechercher un joueur (tous pays)" value="${esc(f.q || '')}" autocomplete="off"></div>
    ${q ? '' : pills('country', f.country, Object.keys(COUNTRY_LABEL).map((c) => [c, COUNTRY_LABEL[c]]))}
    ${q ? '' : `<div class="filters">
      ${sel('pos', [['', 'Tous les postes'], ...Object.keys(POSITIONS).map((k) => [k, POSITIONS[k]])])}
      ${sel('sort', [['ovr', 'Trier : niveau'], ['pot', 'Trier : potentiel'], ['age', 'Trier : âge'], ['val', 'Trier : moins chers']])}
      <button class="toggle ${f.fav ? 'on' : ''}" data-act="favFilter" title="Joueurs suivis">⭐</button></div>
    <div class="card" style="display:flex;align-items:center;gap:12px"><span style="font-size:26px">✈️</span><div style="flex:1"><b>Voyage de détection</b><small>Révèle 3 jeunes à fort potentiel en ${COUNTRY_LABEL[f.country].split(' ').slice(1).join(' ')}.</small></div>
      <button class="btn sm" data-act="trip" data-id="${f.country}" ${S.cash < tripCost(f.country) ? 'disabled' : ''}>${fmt(tripCost(f.country))}<small>· 1 action</small></button></div>
    ${locked ? `<div class="note warn">🔒 Recrutement à l'étranger débloqué avec le bureau « ${OFFICES[INTL_OFFICE].name} ». Vous pouvez déjà observer.</div>` : ''}`}
    <div class="sec-h" style="margin-top:4px"><h2>${q ? `Résultats pour « ${esc(f.q)} »` : f.fav ? '⭐ Joueurs suivis' : 'Jeunes joueurs'}</h2><small>${list.length} joueur(s)</small></div>
    <div class="list">${list.slice(0, 80).map(marketRow).join('') || `<p class="empty">${f.fav ? 'Aucun joueur suivi. Ouvrez une fiche et touchez « Suivre ».' : 'Aucun joueur trouvé.'}</p>`}</div>`;
}

/* ============ Compétitions ============ */
function zoneOf(lg, i, n) {
  if (LEAGUES[lg].big) return i < 3 ? 'z-c1' : i < 6 ? 'z-c3' : '';
  if (lg === 'BE1') return i === 0 ? 'z-c1' : i === 1 ? 'z-c3' : i >= n - 2 ? 'z-down' : '';
  if (lg === 'BE2') return i < 2 ? 'z-up' : i >= n - 2 ? 'z-down' : '';
  return i < 2 ? 'z-up' : '';
}

function viewLeague(lg, mine) {
  const st = standings(lg), played = st[0].t[0], total = leagueRounds(lg);
  let body = '';
  if (UI.cview === 'table') {
    body = `<div class="card flush"><table class="tbl"><tr><th>#</th><th class="l">Club</th><th>J</th><th>G</th><th>N</th><th>P</th><th>+/-</th><th>Pts</th></tr>
      ${st.map((x, i) => `<tr class="${mine[x.c.id] ? 'me' : ''} ${zoneOf(lg, i, st.length)}"><td class="pos-n">${i + 1}</td><td class="l">${esc(x.c.name)}${mine[x.c.id] ? ` 👤${mine[x.c.id] > 1 ? mine[x.c.id] : ''}` : ''}</td>
        <td>${x.t[0]}</td><td>${x.t[1]}</td><td>${x.t[2]}</td><td>${x.t[3]}</td><td>${x.t[4] - x.t[5] > 0 ? '+' : ''}${x.t[4] - x.t[5]}</td><td class="pts">${pts(x.t)}</td></tr>`).join('')}</table>
      <div class="legend" style="padding:0 0 10px">${LEAGUES[lg].big || lg === 'BE1' ? '<span><i style="background:var(--gold)"></i>Ligue des champions</span><span><i style="background:var(--info)"></i>Ligue Europa</span>' : ''}
        ${lg === 'BE2' || lg === 'BE3' ? '<span><i style="background:var(--acc)"></i>Montée</span>' : ''}${lg === 'BE1' || lg === 'BE2' ? '<span><i style="background:var(--bad)"></i>Relégation</span>' : ''}<span>👤 vos clients</span></div></div>`;
  } else if (UI.cview === 'res') {
    const res = S.res[lg];
    body = res ? `<div class="card fixtures">${res.map(([h, a, gh, ga]) => `<div class="fx ${mine[h] || mine[a] ? 'me' : ''}"><span class="h ${gh > ga ? 'w' : ''}">${esc(CLUBS[h].name)}</span><span class="sc">${gh} - ${ga}</span><span class="${ga > gh ? 'w' : ''}">${esc(CLUBS[a].name)}</span></div>`).join('')}</div>`
      : `<div class="card"><p class="empty">${played >= total ? 'Championnat terminé.' : 'La saison n\'a pas encore commencé.'}</p></div>`;
  } else {
    const sc = topScorers(lg, 15);
    body = sc.length ? `<div class="list">${sc.map((x, i) => `<div class="row ${x.mine ? 'me' : ''}" ${x.pid && getP(x.pid) ? `data-act="open" data-id="${x.pid}"` : ''}><span class="ico" style="font-weight:800;color:var(--mut);font-size:14px">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
      <div class="main"><b>${esc(x.n)}${x.mine ? ' 👤' : ''}</b><small>${esc(x.club)}</small></div><div class="side"><b style="font-size:16px">${x.g}</b><small>buts</small></div></div>`).join('')}</div>`
      : '<div class="card"><p class="empty">Aucun but pour l\'instant.</p></div>';
  }
  return `${pills('clg', lg, Object.keys(LEAGUES).map((l) => [l, `${LEAGUES[l].flag} ${LEAGUES[l].name}`]))}
    <div class="split" style="margin:0 2px 10px"><small>Journée ${played}/${total}</small><small>${clubsOf(lg).length} clubs</small></div>
    ${seg('cview', UI.cview, [['table', 'Classement'], ['res', 'Résultats'], ['scor', 'Buteurs']])}${body}`;
}

function viewEurope(k, mine) {
  const cup = S.eu[k], r = cup.rounds.length;
  const fx = ([h, a, gh, ga, pen]) => `<div class="fx ${mine[h] || mine[a] ? 'me' : ''}"><span class="h ${gh > ga || pen === 1 ? 'w' : ''}">${esc(CLUBS[h].name)}</span><span class="sc">${gh} - ${ga}${pen ? '<small>t.a.b.</small>' : ''}</span><span class="${ga > gh || pen === 2 ? 'w' : ''}">${esc(CLUBS[a].name)}</span></div>`;
  let h = pills('eu', k, Object.keys(EU).map((x) => [x, `${EU[x].icon} ${EU[x].name}`]));
  if (cup.champ) h += `<div class="card goldc" style="text-align:center"><div style="font-size:42px">${EU[k].icon}</div><b style="font-size:19px">${esc(CLUBS[cup.champ].name)}</b><small>Vainqueur de la ${EU[k].name}</small></div>`;
  else {
    const pairs = [];
    for (let i = 0; i < cup.alive.length; i += 2) pairs.push([cup.alive[i], cup.alive[i + 1]]);
    h += sec(`${EU_ROUNDS[r]} · semaine ${EU_WEEKS[r]}`, `<div class="card fixtures">${pairs.map(([a, b]) => `<div class="fx ${mine[a] || mine[b] ? 'me' : ''}"><span class="h">${esc(CLUBS[a].name)}</span><span class="sc">vs</span><span>${esc(CLUBS[b].name)}</span></div>`).join('')}</div>`);
  }
  h += cup.rounds.map((ties, i) => sec(EU_ROUNDS[i], `<div class="card fixtures">${ties.map(fx).join('')}</div>`)).reverse().join('');
  return h + '<p class="hint">16 clubs qualifiés par les classements de la saison précédente · élimination directe sur un match.</p>';
}

function viewBdo() {
  if (!S.bdo) return '<div class="card"><p class="empty"><span class="big">⭐</span>Le Ballon d\'Or est décerné lors de la cérémonie de fin de saison.</p></div>';
  return `<div class="sec-h"><h2>⭐ Ballon d'Or ${S.bdo.label}</h2></div><div class="list">${S.bdo.top.map((x, i) => `<div class="row ${x.mine ? 'me' : ''}" ${x.pid && getP(x.pid) ? `data-act="open" data-id="${x.pid}"` : ''}>
    <span class="ico" style="font-weight:800;color:var(--mut);font-size:14px">${i === 0 ? '🏆' : i < 3 ? ['', '🥈', '🥉'][i] : i + 1}</span><div class="main"><b>${esc(x.n)}${x.mine ? ' 👤' : ''}</b><small>${esc(x.club)}</small></div></div>`).join('')}</div>
    <p class="hint">Buts, passes, notes et titres dans les 5 grands championnats. Vos clients doivent avoir joué au moins 15 matchs.</p>`;
}

function viewCompet() {
  const mine = {};
  clients().forEach((p) => { mine[p.club] = (mine[p.club] || 0) + 1; });
  const top = seg('cmode', UI.cmode, [['lg', '🏟️ Championnats'], ['eu', '🏆 Europe'], ['bdo', '⭐ Ballon d\'Or']]);
  if (UI.cmode === 'eu') return top + viewEurope(UI.eu, mine);
  if (UI.cmode === 'bdo') return top + viewBdo();
  return top + viewLeague(UI.clg, mine);
}

/* ============ Agence ============ */
function agencyCharts() {
  const h = S.hist.slice().reverse();
  if (h.length < 2) return '';
  const W = 300, H = 84, n = h.length, x = (i) => (i / (n - 1)) * (W - 12) + 6;
  const rep = h.map((s, i) => `${x(i).toFixed(1)},${(H - 6 - s.rep1 / 100 * (H - 12)).toFixed(1)}`).join(' ');
  const res = h.map((s) => s.inc - s.costs), mx = Math.max(1, ...res.map(Math.abs)), bw = Math.max(3, (W - 12) / n - 4);
  const bars = res.map((v, i) => { const hh = Math.abs(v) / mx * (H / 2 - 4); return `<rect rx="2" x="${(x(i) - bw / 2).toFixed(1)}" y="${(v >= 0 ? H / 2 - hh : H / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, hh).toFixed(1)}" class="${v >= 0 ? 'p' : 'n'}"/>`; }).join('');
  return sec('📈 Évolution', `<div class="card chart"><small>Réputation (0 à 100)</small><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${rep}"/></svg>
    <small>Résultat net par saison · record ${fmt(Math.max(...res))}</small><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/>${bars}</svg>
    <div class="split"><small>${h[0].label}</small><small>${h[n - 1].label}</small></div></div>`);
}

function upgradeCard(icon, title, levelTxt, desc, next, act, id) {
  return `<div class="card"><div class="card-h"><div style="display:flex;gap:12px;align-items:center"><span style="font-size:26px">${icon}</span><div><b>${title}</b><small>${desc}</small></div></div>${tag(levelTxt)}</div>
    ${next ? `<div class="note" style="display:flex;align-items:center;gap:10px;margin-bottom:0"><div style="flex:1"><b style="color:var(--txt);font-size:13.5px">→ ${next.title}</b><small>${next.desc}</small></div>
      <button class="btn sm" data-act="${act}" ${id ? `data-id="${id}"` : ''} ${next.disabled ? 'disabled' : ''}>${next.price}</button></div>` : '<small>✅ Niveau maximum atteint.</small>'}</div>`;
}

function agencyDev() {
  const o = office(), nx = OFFICES[S.office + 1], cl = clients();
  const salCom = cl.reduce((s, p) => s + p.sal * COMMISSION_SALARY, 0), spons = cl.reduce((s, p) => s + (p.sp ? p.sp.w : 0), 0);
  const staffC = Object.keys(STAFF).reduce((s, k) => s + STAFF[k].weekly * S.stl[k], 0), planC = cl.reduce((s, p) => s + planCost(p), 0), acadC = ACADEMY[S.acad].weekly;
  const line = (l, v, cls) => `<div class="row" style="padding:8px 13px"><div class="main"><span style="font-size:13.5px">${l}</span></div><div class="side"><b class="${cls}">${v}</b></div></div>`;
  let h = sec('💶 Finances hebdomadaires', `<div class="list">
    ${line('Commissions sur salaires', '+' + fmt(salCom), 'pos')}${spons ? line('Contrats de sponsoring', '+' + fmt(spons), 'pos') : ''}
    ${line('Loyer du bureau', '-' + fmt(o.weekly), 'neg')}${staffC ? line('Personnel', '-' + fmt(staffC), 'neg') : ''}${planC ? line('Entraînements intensifs', '-' + fmt(planC), 'neg') : ''}${acadC ? line('Académie', '-' + fmt(acadC), 'neg') : ''}
    ${line('<b>Solde</b>', fmt(weeklyIncome() - weeklyCosts()), weeklyIncome() - weeklyCosts() < 0 ? 'neg' : 'pos')}</div>`);
  h += sec('🏢 Locaux', upgradeCard('🏢', o.name, `Niv. ${S.office + 1}/${OFFICES.length}`, `${o.maxClients} clients · ${o.actions} actions/sem. · ${fmt(o.weekly)}/sem.`,
    nx && { title: nx.name, desc: `${nx.maxClients} clients · ${nx.actions} actions · ${fmt(nx.weekly)}/sem.${S.office + 1 === INTL_OFFICE ? ' · recrutement à l\'étranger' : ''}`, price: fmt(nx.cost), disabled: S.cash < nx.cost }, 'office'));
  h += sec('🧑‍💼 Personnel', Object.keys(STAFF).map((k) => {
    const s = STAFF[k], lv = S.stl[k];
    return `<div class="card"><div class="card-h"><div><b>${s.name}</b><small>${s.desc}</small></div><span class="gold" style="white-space:nowrap;letter-spacing:1px">${'★'.repeat(lv)}${'☆'.repeat(3 - lv)}</span></div>
      <div style="display:flex;gap:8px;align-items:center"><small style="flex:1">${lv ? `Niveau ${lv} · ${fmt(s.weekly * lv)}/sem.` : `${fmt(s.weekly)}/sem. par niveau`}</small>
      ${lv ? '<button class="btn sm ghost" data-act="fire" data-id="' + k + '">Licencier</button>' : ''}
      ${lv < 3 ? `<button class="btn sm" data-act="staff" data-id="${k}" ${S.cash < staffCost(k) ? 'disabled' : ''}>${lv ? `Niveau ${lv + 1}` : 'Engager'} · ${fmt(staffCost(k))}</button>` : tag('Max', 'gold')}</div></div>`;
  }).join(''));
  const an = ACADEMY[S.acad + 1];
  h += sec('🏫 Académie de jeunes', upgradeCard('🏫', ACADEMY[S.acad].name, `Niv. ${S.acad}/3`,
    S.acad ? `${ACADEMY[S.acad].kids} jeune(s) de 16 ans par été · ${fmt(ACADEMY[S.acad].weekly)}/sem.` : 'Formez vos propres pépites : elles signent chez vous chaque été.',
    an && { title: an.name, desc: `${an.kids} jeune(s)/saison · ${fmt(an.weekly)}/sem.${S.office < 1 ? ' · bureau niveau 2 requis' : ''}`, price: fmt(an.cost), disabled: S.cash < an.cost || S.office < 1 }, 'acad'));
  return h;
}

function agencyNet() {
  const all = [{ n: S.agency.name, rep: S.rep, me: true }, ...S.rivals].sort((a, b) => b.rep - a.rep);
  let h = sec('🏆 Classement des agences', `<div class="list">${all.map((a, i) => `<div class="row ${a.me ? 'me' : ''}"><span class="ico" style="font-weight:800;color:var(--mut);font-size:14px">${i + 1}</span>
    <div class="main rankbar"><b>${a.me ? esc(S.agency.logo) + ' ' : ''}${esc(a.n)}</b>${bar(a.rep, a.me ? '' : 'dim')}</div><div class="side"><b>${Math.floor(a.rep)}</b></div></div>`).join('')}</div>`);
  const part = Object.keys(S.rel).filter((id) => S.rel[id] >= 10).sort((a, b) => S.rel[b] - S.rel[a]);
  h += sec('🤝 Clubs partenaires', part.length ? `<div class="list">${part.slice(0, 10).map((id) => `<div class="row"><span class="ico">${LEAGUES[CLUBS[id].league].flag}</span><div class="main"><b>${esc(CLUBS[id].name)}</b><small>${relLabel(S.rel[id])}</small></div>
    <div class="side" style="width:90px"><b>❤️ ${S.rel[id]}</b>${bar(S.rel[id])}</div></div>`).join('')}</div><p class="hint">Plus la relation est forte, plus vos propositions aboutissent dans ce club.</p>`
    : '<div class="card"><p class="empty">Réalisez des transferts et des prêts pour tisser des liens avec les clubs.</p></div>');
  return h;
}

function agencyPal() {
  let h = sec('📊 Chiffres clés', `<div class="card"><div class="stats">${stat('Transferts', S.stats.transfers)}${stat('Record', fmt(S.stats.bestFee))}${stat('Gains totaux', fmt(S.stats.earned))}</div>
    <div class="stats">${stat('Trophées clients', S.stats.troph, 'gold')}${stat('Succès', `${Object.keys(S.ach).length}/${ACH.length}`)}${stat('Saison', S.season - 2025)}</div>
    ${S.stats.bestName ? `<small style="margin-top:8px">💸 Plus gros transfert : ${esc(S.stats.bestName)}</small>` : ''}</div>`);
  h += sec(`🏅 Succès`, `<div class="card"><div class="ach">${ACH.map((a) => `<button class="${S.ach[a.id] ? 'on' : ''}" data-act="achInfo" data-id="${a.id}"><span>${a.i}</span><small>${a.l}</small></button>`).join('')}</div></div>`, `<small>${Object.keys(S.ach).length}/${ACH.length}</small>`);
  h += agencyCharts();
  h += sec('🎯 Objectifs de carrière', `<div class="list">${GOALS.map((g) => `<div class="row"><span class="ico">${S.goals[g.id] ? '✅' : '⬜'}</span><div class="main"><b style="white-space:normal;font-weight:550;${S.goals[g.id] ? 'color:var(--mut)' : ''}">${g.label}</b></div><div class="side"><small>${fmt(g.reward)}</small></div></div>`).join('')}</div>`);
  if (S.hist.length) h += sec('🗓️ Historique', `<div class="card flush"><table class="tbl"><tr><th class="l">Saison</th><th>Rang</th><th>Rép.</th><th>Transf.</th><th>Résultat</th></tr>
    ${S.hist.map((x) => `<tr><td class="l">${x.label}</td><td>${x.rank}ᵉ</td><td>${Math.floor(x.rep1)}</td><td>${x.tr}</td><td class="${x.inc - x.costs < 0 ? 'neg' : 'pos'}">${fmt(x.inc - x.costs)}</td></tr>`).join('')}</table></div>`);
  if (S.hof.length) h += sec('🏛️ Panthéon', `<div class="list">${S.hof.map((x) => `<div class="row">${rt(x.ovr, 'sm')}<div class="main"><b>${esc(x.n)}</b><small>${x.pos} · ${esc(x.club)} · ${x.why} (${x.s})</small>${x.top.length ? `<small>🏅 ${x.top.map(esc).join(' · ')}</small>` : ''}</div><div class="side"><small>${x.aw} 🏅 · ${x.tr} 🤝</small></div></div>`).join('')}</div>`);
  return h;
}

function agencySet() {
  let h = sec('🎨 Identité', `<div class="card"><div class="field"><span>Logo</span><div class="logos">${LOGOS.map((l) => `<button class="lg-pick ${S.agency.logo === l ? 'on' : ''}" data-act="logo" data-id="${l}">${l}</button>`).join('')}</div></div>
    <div class="field" style="margin:0"><span>Couleur</span><div class="swatches">${COLORS.map(([c, n]) => `<button class="sw ${S.agency.color === c ? 'on' : ''}" style="background:${c}" data-act="color" data-id="${c}" aria-label="${n}"></button>`).join('')}</div></div></div>`);
  h += sec('⚙️ Préférences', `<div class="list"><button class="row" data-act="sound"><span class="ico">${SND.on ? '🔊' : '🔇'}</span><div class="main"><b>Sons</b><small>Fanfare, carillons et buts en direct</small></div><div class="side">${tag(SND.on ? 'Activés' : 'Coupés', SND.on ? 'ok' : '')}</div></button>
    <button class="row" data-act="help"><span class="ico">❓</span><div class="main"><b>Comment jouer</b><small>Les règles en 2 minutes</small></div><span class="chev">›</span></button></div>`);
  h += sec('📲 Application', `<div class="card">${UI.standalone ? '<p style="margin:0">✅ Application installée. Elle se met à jour toute seule à chaque ouverture (connexion nécessaire).</p>'
    : UI.installEvt ? '<button class="btn" data-act="install" style="margin-top:0">📲 Installer l\'application</button><small style="margin-top:8px">Ajoute Agent Foot à votre écran d\'accueil, avec mises à jour automatiques.</small>'
    : '<small><b style="color:var(--txt)">Installer sur le téléphone</b><br>Android (Chrome) : menu ⋮ → « Installer l\'application ».<br>iPhone (Safari) : Partager → « Sur l\'écran d\'accueil ».<br>L\'appli se met ensuite à jour toute seule.</small>'}</div>`);
  h += sec('💾 Sauvegarde', `<div class="card"><small>La partie est enregistrée automatiquement sur cet appareil. Exportez-la pour la garder en sécurité ou la continuer ailleurs.</small>
    <button class="btn sec" data-act="export">📤 Exporter la sauvegarde</button>
    <label class="btn sec file">📥 Importer une sauvegarde<input type="file" id="imp" accept=".json,application/json" hidden></label>
    <button class="btn danger" data-act="reset">🗑️ Effacer et recommencer</button></div>`);
  return h;
}

function viewAgence() {
  const tabs = { dev: agencyDev, net: agencyNet, pal: agencyPal, set: agencySet };
  return seg('av', UI.av, [['dev', 'Développement'], ['net', 'Réseau'], ['pal', 'Palmarès'], ['set', 'Réglages']]) + tabs[UI.av]();
}

/* ============ Fiche joueur ============ */
function sparkline(p) {
  const vs = (p.vh || []).map((x) => x.v).concat([playerValue(p)]);
  if (vs.length < 2) return '';
  const max = Math.max(...vs), min = Math.min(...vs), W = 300, H = 60;
  const xy = vs.map((v, i) => `${(i / (vs.length - 1) * W).toFixed(1)},${(H - 5 - (max === min ? 0.5 : (v - min) / (max - min)) * (H - 10)).toFixed(1)}`);
  return `<h4>Évolution de la valeur</h4><div class="card" style="padding:10px 12px"><svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${xy.join(' ')}"/></svg>
    <div class="split"><small>Signature : ${fmt(vs[0])}</small><small>Aujourd'hui : <b style="color:var(--txt)">${fmt(vs[vs.length - 1])}</b></small></div></div>`;
}

function playerHead(p) {
  const c = CLUBS[p.club], t = [];
  if (p.mine) t.push(tag('👤 Client', 'ok'));
  if (p.intl) t.push(tag('🌍 International', 'ok'));
  if (p.free) t.push(tag('🆓 Libre', 'warn'));
  if (p.inj > 0) t.push(tag(`🚑 ${p.inj} sem.`, 'bad'));
  if (p.loan) t.push(tag(`🔁 Prêté par ${esc(CLUBS[p.loan.back].name)}`, 'info'));
  if (p.cov && !p.mine) t.push(tag('👀 Convoité', 'bad'));
  if (p.fav && !p.mine) t.push(tag('⭐ Suivi', 'gold'));
  return `<div class="ph">${rt(ovrOf(p), 'xl')}<div style="min-width:0"><h3>${esc(p.n)}</h3><small>${POSITIONS[p.pos]} · ${p.age} ans · ${COUNTRY_LABEL[p.nat]}</small>
    <small>${clubTxt(p)} · prestige ${c.rep}</small>${t.length ? `<div class="tags">${t.join('')}</div>` : ''}</div></div>`;
}

function traitLine(p) {
  if (p.tr && (p.mine || p.sc >= 1)) return `<div><span>${TRAITS[p.tr].icon}</span><p><b>${TRAITS[p.tr].name}</b> — ${TRAITS[p.tr].desc}</p></div>`;
  if (p.tr) return '<div><span>❔</span><p class="mut">Caractère inconnu : observez-le pour le découvrir.</p></div>';
  return '<div><span>😐</span><p class="mut">Pas de trait de caractère marqué.</p></div>';
}

function marketSheet(p) {
  const cd = p.cd > S.t, can = canRecruit(p);
  return `${playerHead(p)}
    <div class="stats">${stat('Potentiel', potTxt(p), 'gold')}${stat('Valeur', fmt(playerValue(p)))}${stat('Salaire / sem.', fmt(p.sal))}</div>
    <div class="stats" style="margin-top:8px">${stat('Temps de jeu', pct(playProb(p)))}${stat('Saison', `${p.m} m · ${p.g} b`)}${stat('Contrat club', `${p.cy} an(s)`, p.cy <= 1 ? 'neg' : '')}</div>
    <div class="info" style="margin-top:10px">${traitLine(p)}</div>
    ${p.cov ? `<div class="note bad">👀 <b>${esc(p.cov.by)}</b> veut le signer : il sera parti dans ${Math.max(1, p.cov.t - S.t)} semaine(s) !</div>` : ''}
    <div class="stats two" style="margin-top:10px">
      <button class="btn sec" style="margin:0" data-act="fav" data-id="${p.id}">${p.fav ? '⭐ Suivi' : '☆ Suivre'}</button>
      <button class="btn sec" style="margin:0" data-act="scout" data-id="${p.id}" ${p.sc >= 2 ? 'disabled' : ''}>🔎 ${p.sc >= 2 ? 'Rapport complet' : `Observer ${cost(1)}`}</button></div>
    <h4>Proposer un mandat · 1 action</h4>
    ${cd ? `<div class="note warn">Il refuse de discuter encore ${p.cd - S.t} semaine(s).</div>` : ''}
    ${!can ? `<div class="note warn">🔒 Recrutement à l'étranger non débloqué (bureau « ${OFFICES[INTL_OFFICE].name} »).</div>` : ''}
    ${['🤝 Simple poignée de main', '💶 Avec prime à la signature', '💰 Avec grosse prime'].map((l, i) => {
    const ch = signChance(p, i);
    return `<button class="choice" data-act="sign" data-id="${p.id}" data-lv="${i}" ${cd || !can ? 'disabled' : ''}><div class="top2"><b>${l}</b><b>${pct(ch)}</b></div>
      <small>${i ? 'Coût : ' + fmt(signBonusCost(p, i)) : 'Gratuit'}</small>${bar(ch * 100, ch < 0.35 ? 'bad' : ch < 0.6 ? 'mid' : '')}</button>`;
  }).join('')}`;
}

function clientOverview(p) {
  const prog = Math.max(0, Math.floor(p.ovr) - Math.floor(p.o0));
  return `<div class="stats">${stat('Valeur', fmt(playerValue(p)))}${stat('Potentiel', potTxt(p), 'gold')}${stat('Pour vous', fmt(forYou(p)) + '/s', 'pos')}</div>
    <div class="stats" style="margin-top:8px">${stat('Temps de jeu', pct(playProb(p)), playProb(p) < 0.35 ? 'neg' : '')}${stat('Contrat club', `${p.cy} an(s)`, p.cy <= 1 ? 'neg' : '')}${stat('Mandat', `${p.mandate} saison(s)`)}</div>
    <div class="stats" style="margin-top:8px">${stat('Salaire / sem.', fmt(p.sal))}${stat('Abonnés', fmtFol(p.fol || 0))}${stat('Progression', '+' + prog, 'pos')}</div>
    <div class="moral"><small style="width:52px">Moral</small>${bar(p.morale, moralCls(p.morale))}<b>${Math.round(p.morale)}</b></div>
    ${p.free ? '<div class="note warn">🆓 <b>Libre</b> : placez-le avant la fin du mercato d\'été (semaine 6). Pas d\'indemnité, mais une prime à la signature pour vous. Sinon il re-signera à la baisse.</div>' : ''}
    ${!p.free && p.cy <= 1 ? '<div class="note warn">📝 Dernière année de contrat : les acheteurs paieront 40 % de moins. Prolongez-le ou laissez-le partir libre l\'été prochain.</div>' : ''}
    ${p.promise ? `<div class="note warn">🤞 Vous lui avez promis un transfert : encore ${Math.max(0, p.promise - S.t)} semaine(s).</div>` : ''}
    ${p.inj > 0 ? `<div class="note bad">🚑 Blessé encore ${p.inj} semaine(s).</div>` : ''}
    <div class="info">${traitLine(p)}
      ${p.dream ? `<div><span>🌟</span><p><b>Rêve :</b> ${esc(dreamText(p.dream))}${p.dream.done ? ' ✅' : ''}</p></div>` : ''}
      <div><span>${PLANS[p.plan || 'std'].icon}</span><p><b>Entraînement :</b> ${PLANS[p.plan || 'std'].name}</p></div>
      ${p.sp ? `<div><span>👟</span><p><b>Sponsor ${esc(p.sp.b)}</b> — ${fmt(p.sp.w)}/sem. jusqu'en ${seasonTxt(p.sp.end - 1)}</p></div>` : ''}
    </div>
    ${sparkline(p)}`;
}

function clientActions(p) {
  const win = inWindow(S.week), canMove = win && !p.loan;
  return `<div class="note" style="display:flex;justify-content:space-between;align-items:center"><span>⚡ Actions restantes cette semaine</span><b style="color:var(--gold)">${S.actions}</b></div>
    <h4>Mercato</h4>
    ${!win ? `<div class="note">🔒 Mercato fermé : ${nextWindowTxt()}.</div>` : p.loan ? '<div class="note">🔁 En prêt jusqu\'à la fin de la saison.</div>' : ''}
    ${actBtn('propose', p.id, '📣', 'Transfert ou prêt', 'Choisir un club et lui proposer votre joueur', 1, { primary: canMove, disabled: !canMove })}
    ${actBtn('auction', p.id, '🔨', 'Mettre aux enchères', 'Plusieurs clubs font une offre d\'un coup', 2, { disabled: !canMove })}
    <h4>Contrat</h4>
    ${p.cy <= 1 ? actBtn('renew', p.id, '📝', p.free ? 'Re-signer avec son ancien club' : 'Négocier une prolongation', 'Prime d\'agent : 6 semaines de salaire', 1, { disabled: !!p.loan }) : ''}
    ${actBtn('raise', p.id, '💶', 'Demander une revalorisation', `Salaire juste estimé : ${fmt(fairSalary(p, CLUBS[p.club]))}/sem.`, 1, { disabled: p.free })}
    <h4>Image</h4>
    ${p.sp ? `<div class="info"><div><span>👟</span><p><b>Sponsor ${esc(p.sp.b)}</b> — ${fmt(p.sp.w)}/sem. pour vous</p></div></div>`
    : actBtn('sponsor', p.id, '👟', 'Chercher un sponsor', p.ovr >= 58 ? `${pct(sponsorChance(p))} de chances · ${fmt(sponsorValue(p))}/sem. pour vous` : 'Niveau 58 requis', 1, { disabled: p.ovr < 58 })}
    <h4>Suivi</h4>
    ${actBtn('talk', p.id, '💬', 'Discuter avec lui', 'Remonte son moral', 1)}
    <div class="card" style="padding:12px"><b style="font-size:14px">Plan d'entraînement</b><small>${PLANS[p.plan || 'std'].desc}${p.plan === 'int' ? ` (${fmt(planCost(p))}/sem.)` : ''}</small>
      <div class="seg" style="margin:10px 0 0;position:static;box-shadow:none">${Object.keys(PLANS).map((k) => `<button class="${(p.plan || 'std') === k ? 'on' : ''}" data-act="plan" data-id="${p.id}" data-k="${k}">${PLANS[k].icon} ${PLANS[k].name}</button>`).join('')}</div></div>
    <div class="danger-zone"><button class="btn danger" data-act="release" data-id="${p.id}">Rompre le mandat</button></div>`;
}

function clientStats(p) {
  const def = p.pos === 'GB' || p.pos === 'DEF';
  return `<h4>Saison ${seasonTxt(S.season)}</h4>
    <div class="stats">${stat('Matchs', p.m)}${stat('Buts', p.g)}${stat('Passes déc.', p.a)}</div>
    <div class="stats" style="margin-top:8px">${stat('Note moyenne', avgNote(p), p.m ? noteClass(p.rs / p.m) : '')}${stat(def ? 'Clean sheets' : 'Buts / match', def ? p.cs : p.m ? (p.g / p.m).toFixed(2).replace('.', ',') : '–')}${stat('Europe', `${p.em || 0} m · ${p.eg || 0} b`)}</div>
    <h4>Derniers matchs</h4>
    ${p.log.length ? `<div class="list">${p.log.map((x, i) => `<div class="row" data-act="match" data-id="${p.id}" data-src="log" data-i="${i}"><span class="res ${resClass(x)}"></span>
      <div class="main"><b style="font-weight:550;font-size:13.5px">${scoreTxt(x)}</b><small>Semaine ${x.w}</small></div><div class="side"><b>${x.g ? '⚽'.repeat(x.g) : ''}${x.a ? '🅰️'.repeat(x.a) : ''} <span class="${noteClass(x.n)}">${x.n.toFixed(1)}</span></b></div><span class="chev">›</span></div>`).join('')}</div>`
    : '<div class="card"><p class="empty">Pas encore de match joué cette saison.</p></div>'}`;
}

function clientCareer(p) {
  return `${p.aw.length ? `<h4>Palmarès</h4><div class="list">${p.aw.map((a) => `<div class="row" style="padding:9px 13px"><span class="ico" style="font-size:16px">🏅</span><div class="main"><span style="font-size:13.5px">${esc(a)}</span></div></div>`).join('')}</div>` : ''}
    <h4>Saisons précédentes</h4>
    ${p.sh.length ? `<div class="card flush"><table class="tbl"><tr><th class="l">Saison</th><th class="l">Club</th><th>M</th><th>B</th><th>PD</th><th>Note</th></tr>
      ${p.sh.map((x) => `<tr><td class="l">${x.s}</td><td class="l">${esc(x.club)}</td><td>${x.m}</td><td>${x.g}</td><td>${x.a}</td><td>${x.m ? x.avg.toFixed(1) : '–'}</td></tr>`).join('')}</table></div>` : '<div class="card"><p class="empty">Première saison avec l\'agence.</p></div>'}
    ${p.hist.length ? `<h4>Transferts</h4><div class="list">${p.hist.map((x) => `<div class="row" style="padding:9px 13px"><span class="ico" style="font-size:16px">🤝</span><div class="main"><b style="font-weight:550;font-size:13.5px">${esc(x.from)} → ${esc(x.to)}</b><small>${x.s}</small></div><div class="side"><b>${x.free ? 'Libre' : fmt(x.fee)}</b></div></div>`).join('')}</div>` : ''}`;
}

function modalPlayer(p, m) {
  if (!p.mine) return marketSheet(p);
  const t = m.ptab || 'ov';
  const body = { ov: clientOverview, act: clientActions, st: clientStats, car: clientCareer }[t](p);
  return `${playerHead(p)}${seg('ptab', t, [['ov', 'Aperçu'], ['act', 'Actions'], ['st', 'Stats'], ['car', 'Carrière']])}${body}`;
}

/* ============ Autres fenêtres ============ */
function modalPropose(p) {
  const cur = CLUBS[p.club], loan = UI.mode === 'loan';
  const list = clubsOf(UI.lg).sort((a, b) => b.rep - a.rep);
  return `<div class="ph" style="margin-bottom:10px">${rt(ovrOf(p))}<div><h3>${loan ? 'Prêter' : 'Transférer'} ${esc(p.n)}</h3><small>${clubTxt(p)} · valeur ${fmt(playerValue(p))}</small></div></div>
    ${seg('mode', UI.mode, [['transfer', '🤝 Transfert'], ['loan', '🔁 Prêt']])}
    <div class="note">${loan ? `Prêt jusqu'à la fin de la saison dans un club plus modeste, pour jouer et progresser. Temps de jeu actuel : <b>${pct(playProb(p))}</b>. Aucune commission.`
    : `Un club regarde le niveau actuel (${ovrOf(p)}), ou le potentiel (${potTxt(p)}) pour les jeunes. Une proposition coûte 1 action.`}</div>
    ${pills('lg', UI.lg, Object.keys(LEAGUES).map((l) => [l, `${LEAGUES[l].flag} ${LEAGUES[l].name}`]))}
    <div class="list">${list.map((c) => {
    const same = c.id === p.club, rej = p.rej[c.id] > S.t;
    let why = same ? 'Club actuel' : rej ? 'A déjà refusé récemment' : '', sub, extra = '';
    if (loan) {
      if (!why && !loanOk(p, c)) why = c.rep >= cur.rep ? 'Pas plus modeste que son club' : p.ovr < c.rep - 14 ? 'Il n\'y jouerait pas' : 'Niveau trop faible pour lui';
      sub = `Temps de jeu estimé : ${pct(clamp(0.5 + (p.ovr - (c.rep - 12)) / 16, 0.05, 0.97))}`;
    } else {
      if (!why && !playerAccepts(p, c)) why = 'Trop petit pour lui';
      sub = c.rep > cur.rep ? 'Club plus prestigieux' : 'Niveau équivalent';
      if (dreamMatch(p.dream, c)) extra += tag('🌟 Son rêve', 'gold');
      if (rel(c.id) >= 10) extra += tag(`🤝 ${relLabel(rel(c.id))}`, 'ok');
    }
    return `<div class="row">${rt(c.rep, 'sm')}<div class="main"><b>${esc(c.name)}</b><small>${why || sub}</small>${extra && !why ? `<div class="tags">${extra}</div>` : ''}</div>
      <button class="btn sm" data-act="${loan ? 'doLoan' : 'doPropose'}" data-id="${p.id}" data-club="${esc(c.id)}" ${why ? 'disabled' : ''}>${loan ? 'Prêter' : 'Proposer'}</button></div>`;
  }).join('')}</div>
    <button class="btn ghost" data-act="open" data-id="${p.id}">← Retour à la fiche</button>`;
}

/* Compte rendu d'un match (buteurs et minutes générés de façon stable à partir du match) */
function genericName(club, rand) {
  const n = NAMES[LEAGUES[CLUB_DEFAULT[club].league].country];
  return n.first[Math.floor(rand() * n.first.length)] + ' ' + n.last[Math.floor(rand() * n.last.length)];
}
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
  const left = x.home ? my : x.opp, right = x.home ? x.opp : my, lSide = x.home ? 'me' : 'opp';
  const gl = shown.filter((e) => e.side === lSide).length, gr = shown.length - gl;
  return `<span class="kicker">${x.cup ? EU[x.cup].icon + ' ' + EU[x.cup].name : LEAGUES[CLUBS[my].league].name} · semaine ${x.w || S.week}</span>
    <div class="score"><div>${esc(CLUBS[left].name)}</div><b>${gl} - ${gr}</b><div>${esc(CLUBS[right].name)}</div></div>
    ${m.live ? `<div class="live"><span>${done ? 'Terminé' : `🔴 ${minute}'`}</span>${bar(minute / 90 * 100, done ? '' : 'bad')}</div>` : ''}
    <div class="events">${shown.length ? shown.map((e) => `<div class="${(e.side === 'me') === x.home ? 'l' : 'r'} ${e.sc === p.n || e.as === p.n ? 'hl' : ''}">
      <span>${e.min}'</span><p>⚽ <b>${esc(e.sc)}</b>${e.as ? `<small>passe : ${esc(e.as)}</small>` : ''}</p></div>`).join('') : `<p class="empty">${done ? 'Aucun but.' : 'Le match est en cours…'}</p>`}</div>
    ${!done ? '<button class="btn sec" data-act="liveSkip">⏩ Voir le score final</button>' : `${!m.live ? '<button class="btn" data-act="live">📺 Revivre le match en direct</button>' : ''}
    <div class="card" style="margin-top:10px"><div class="card-h" style="margin:0"><b>${esc(p.n)}</b>${x.out ? tag(x.out) : `<b class="${noteClass(x.n)}">Note ${x.n.toFixed(1)}</b>`}</div>
      ${x.out ? '' : `<small style="margin-top:4px">${x.g ? x.g + ' but(s)' : 'Pas de but'} · ${x.a ? x.a + ' passe(s) décisive(s)' : 'pas de passe décisive'}</small>`}</div>
    <button class="btn sec" data-act="open" data-id="${p.id}">Voir la fiche de ${esc(p.n)}</button>`}`;
}

function modalNego(p, m) {
  const o = S.offers.find((x) => x.id === m.oid);
  if (!o) return '<p class="empty">Offre expirée.</p>';
  const c = CLUBS[o.club], base = o.free ? o.bonus : o.fee;
  return `<h3>Négocier avec ${esc(c.name)}</h3>
    <div class="note">Offre actuelle pour ${esc(p.n)} : <b>${o.free ? 'prime de ' + fmt(o.bonus) : fmt(o.fee)}</b>. Une seule tentative.${S.stl.nego ? ` Votre négociateur (niv. ${S.stl.nego}) améliore vos chances.` : ''}</div>
    ${NEGO.map((n, i) => `<button class="choice" data-act="nego" data-id="${o.id}" data-lv="${i}"><div class="top2"><b>${['🙂 Demande raisonnable', '😤 Demande ferme', '🎲 Coup de poker'][i]} · +${Math.round(n.up * 100)} %</b><b>${pct(negoOk(i))}</b></div>
      <small>≈ ${fmt(base * (1 + n.up))} · en cas de refus, ${pct(negoWalk(i))} de risque qu'il retire son offre</small>${bar(negoOk(i) * 100, negoOk(i) < 0.35 ? 'bad' : negoOk(i) < 0.6 ? 'mid' : '')}</button>`).join('')}
    <button class="btn ghost" data-act="close">Garder l'offre actuelle</button>`;
}

function modalHelp() {
  return `<h3>Comment jouer</h3><div class="card steps">
    <div><p><b>Repérez.</b> Dans Recrutement, ouvrez la fiche d'un jeune et observez-le pour découvrir son potentiel et son caractère. Suivez (⭐) ceux qui vous plaisent.</p></div>
    <div><p><b>Signez.</b> Proposez-lui un mandat. Plus votre réputation est haute, plus les bons joueurs acceptent. Une prime augmente vos chances.</p></div>
    <div><p><b>Faites-le jouer.</b> Un jeune progresse surtout s'il joue : surveillez son temps de jeu et prêtez-le si besoin. Choisissez son plan d'entraînement.</p></div>
    <div><p><b>Transférez.</b> Pendant le mercato (semaines 1–6 et 20–23), proposez vos clients à de plus grands clubs ou mettez-les aux enchères. Vous touchez 10 % de l'indemnité puis 7 % du salaire chaque semaine.</p></div>
    <div><p><b>Développez l'agence.</b> Bureau, personnel, académie, sponsors, relations avec les clubs : grimpez au classement des agences.</p></div>
    <div><p><b>Chaque saison.</b> Remplissez les missions 🎯 et assistez à la cérémonie des trophées. Une saison sur deux : Coupe du monde ou Euro.</p></div>
  </div><div class="note warn">Attention au moral de vos joueurs et à votre caisse : faillite si les dettes dépassent ${fmt(DIFFS[S ? S.diff : 1].bank)}.</div>
  <button class="btn" data-act="close">C'est parti !</button>`;
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
      <button class="btn lg gold" data-act="cerNext">Que la cérémonie commence !</button>`;
  } else if (sl.k === 'list' || sl.k === 'outro') {
    const rows = sl.k === 'outro' ? (sl.rows.length ? sl.rows.map((x) => ({ i: '🏅', l: '', v: x, mine: true })) : [{ i: '🙂', l: '', v: 'Pas de trophée pour vos clients cette année. La prochaine sera la bonne !' }]) : sl.rows;
    body = `<div class="cer-icon">${sl.icon}</div><h2 class="cer-title">${esc(sl.title)}</h2>
      ${sl.k === 'outro' ? '<p class="cer-sub">Le bilan de votre agence ce soir :</p>' : ''}
      <div class="cer-list">${rows.map((r) => `<div class="${r.mine ? 'me' : ''}"><span>${r.i}</span><p>${r.l ? `<small>${esc(r.l)}</small>` : ''}<b>${esc(r.v)}</b></p></div>`).join('')}</div>
      <button class="btn lg gold" data-act="cerNext">${last ? 'Terminer la soirée' : 'Suivant'}</button>`;
  } else {
    const w = sl.noms[sl.win];
    body = `<div class="cer-icon ${m.open ? 'spin' : ''}">${sl.icon}</div><h2 class="cer-title">${esc(sl.title)}</h2><p class="cer-sub">${esc(sl.sub)}</p>
      ${m.open ? `<div class="winner ${w.mine ? 'me' : ''}"><small>Le lauréat est…</small><b>${esc(w.n)}</b><small>${esc(w.club || '')}${w.txt ? ` · ${esc(w.txt)}` : ''}</small>${w.mine ? '<em>👤 Votre client !</em>' : ''}</div>${confetti()}` : '<p class="cer-sub nom">Les nommés sont…</p>'}
      <div class="cer-list noms">${sl.noms.map((x, i) => `<div class="${x.mine ? 'me' : ''} ${m.open && i === sl.win ? 'win' : m.open ? 'lose' : ''}"><span>${m.open && i === sl.win ? '🏆' : '🎟️'}</span><p><b>${esc(x.n)}${x.mine ? ' 👤' : ''}</b><small>${esc(x.club || '')}${x.txt && x.club ? ' · ' : ''}${esc(x.txt || '')}</small></p></div>`).join('')}</div>
      <button class="btn lg gold" data-act="cerNext">${m.open ? (last ? 'Terminer' : 'Suivant') : '🎤 Ouvrir l\'enveloppe'}</button>`;
  }
  return `${top}${dots}<div class="cer-body">${body}</div>`;
}

function startLive() {
  clearInterval(UI.lt);
  UI.lt = setInterval(() => {
    const m = UI.modal;
    if (!m || m.type !== 'match' || !m.live) { clearInterval(UI.lt); return; }
    m.keep = true; renderModal();
    if (Date.now() - m.live >= 90 * 110) clearInterval(UI.lt);
  }, 220);
}

/* ============ Rendu ============ */
function renderModal() {
  const m = UI.modal, el = $('#modal');
  if (!m) { el.innerHTML = ''; return; }
  if (m.type === 'cer') { el.innerHTML = `<div class="stage">${viewCer()}</div>`; return; }
  const p = m.type === 'help' ? null : getP(m.id);
  if (!p && m.type !== 'help') { UI.modal = null; el.innerHTML = ''; return; }
  const old = $('#modal .sheet'), sc = old ? old.scrollTop : 0, key = m.type + (m.id || ''), same = old && old.dataset.key === key;
  const content = m.type === 'help' ? modalHelp() : m.type === 'match' ? modalMatch(p, m) : m.type === 'nego' ? modalNego(p, m) : m.type === 'propose' ? modalPropose(p) : modalPlayer(p, m);
  el.innerHTML = `<div class="backdrop" data-act="close"></div><div class="sheet ${m.type === 'player' && p.mine ? 'tall' : ''}" data-key="${key}" style="${same ? 'animation:none' : ''}">
    <div class="grab"></div><button class="x" data-act="close" aria-label="Fermer">✕</button>${content}</div>`;
  if (m.keep && same) $('#modal .sheet').scrollTop = sc;
  m.keep = false;
}

function render() {
  const app = $('#app');
  document.documentElement.style.setProperty('--acc', (S && S.agency.color) || UI.nw.color);
  if (!S) { app.className = ''; app.innerHTML = viewStart(); renderModal(); renderToast(); return; }
  const views = { home: viewHome, clients: viewClients, scout: viewScout, compet: viewCompet, agence: viewAgence };
  const y = window.scrollY, same = app.dataset.tab === UI.tab;
  app.className = UI.tab === 'home' && !S.over ? 'has-dock' : '';
  app.innerHTML = `${topbar()}<main>${views[UI.tab]()}</main>${dock()}${navbar()}`;
  app.dataset.tab = UI.tab;
  window.scrollTo(0, same ? y : 0);
  renderModal(); renderToast();
}

/* ============ Actions ============ */
const keep = () => { if (UI.modal) UI.modal.keep = true; };
const ACTIONS = {
  // Nouvelle partie
  nwLogo(d) { UI.nw.logo = d.id; }, nwColor(d) { UI.nw.color = d.id; }, nwDiff(d) { UI.nw.diff = +d.id; },
  start() {
    const n = UI.nw;
    newGame(($('#in-name').value || '').trim() || n.name, $('#in-city').value, n.diff);
    S.agency.logo = n.logo; S.agency.color = n.color; save();
    UI.tab = 'home'; UI.modal = { type: 'help' };
  },
  // Navigation
  tab(d) { UI.tab = d.id; UI.modal = null; },
  close() { UI.modal = null; },
  help() { UI.modal = { type: 'help' }; },
  newsAll() { UI.newsAll = !UI.newsAll; },
  // Semaine
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
  // Offres
  accept(d) { const r = actAccept(+d.id); toast(r); if (r.ok) play(CHIME); },
  negoOpen(d) { const o = S.offers.find((x) => x.id === +d.id); if (o) UI.modal = { type: 'nego', id: o.pid, oid: o.id }; },
  nego(d) { const r = actNegotiate(+d.id, +d.lv); toast(r); UI.modal = null; if (r.ok) play(CHIME); },
  refuse(d) { actRefuse(+d.id); },
  // Listes et filtres
  jv(d) { UI.jv = d.id; }, cs(d) { UI.cs = d.id; },
  country(d) { UI.mk.country = d.id; }, favFilter() { UI.mk.fav = !UI.mk.fav; },
  cmode(d) { UI.cmode = d.id; }, clg(d) { UI.clg = d.id; }, cview(d) { UI.cview = d.id; }, eu(d) { UI.eu = d.id; },
  av(d) { UI.av = d.id; },
  // Fiche joueur
  open(d) { const prev = UI.modal; UI.modal = { type: 'player', id: +d.id, ptab: prev && prev.type === 'propose' ? 'act' : 'ov' }; },
  ptab(d) { UI.modal.ptab = d.id; },
  fav(d) { actFav(+d.id); keep(); },
  scout(d) { toast(actScout(+d.id)); keep(); },
  sign(d) { const r = actSign(+d.id, +d.lv); toast(r); if (r.ok) { UI.modal = { type: 'player', id: +d.id, ptab: 'ov' }; play(CHIME); } else keep(); },
  propose(d) { UI.modal = { type: 'propose', id: +d.id }; UI.lg = CLUBS[getP(+d.id).club].league; },
  mode(d) { UI.mode = d.id; },
  lg(d) { UI.lg = d.id; keep(); },
  doPropose(d) { const r = actPropose(+d.id, d.club); toast(r); if (r.ok) { UI.modal = null; UI.tab = 'home'; } else keep(); },
  doLoan(d) { const r = actLoan(+d.id, d.club); toast(r); if (r.ok) UI.modal = { type: 'player', id: +d.id, ptab: 'ov' }; else keep(); },
  auction(d) { const r = actAuction(+d.id); toast(r); if (r.ok) { UI.modal = null; UI.tab = 'home'; } else keep(); },
  raise(d) { toast(actRaise(+d.id)); keep(); },
  renew(d) { toast(actRenew(+d.id)); keep(); },
  talk(d) { toast(actTalk(+d.id)); keep(); },
  sponsor(d) { toast(actSponsor(+d.id)); keep(); },
  plan(d) { getP(+d.id).plan = d.k; save(); keep(); },
  release(d) { if (confirm('Rompre le mandat de ce joueur ?')) { actRelease(+d.id); UI.modal = null; } },
  trip(d) { const r = actTrip(d.id); toast(r); if (r.ok) UI.mk.fav = true; },
  // Matchs
  match(d) { UI.modal = { type: 'match', id: +d.id, src: d.src, i: +d.i }; },
  live() { UI.modal.live = Date.now(); UI.modal.seen = 0; keep(); startLive(); },
  liveSkip() { UI.modal.live = 1; keep(); },
  // Agence
  office() { toast(buyOffice()); },
  staff(d) { toast(hireStaff(d.id)); },
  fire(d) { if (confirm('Licencier ce membre du personnel ?')) toast(fireStaff(d.id)); },
  acad() { toast(buyAcademy()); },
  achInfo(d) { const a = ACH.find((x) => x.id === d.id); toast({ ok: !!S.ach[a.id], msg: `${a.i} ${a.l} : ${a.d}${S.ach[a.id] ? ` (débloqué en ${S.ach[a.id]})` : ' — pas encore débloqué'}` }); },
  logo(d) { S.agency.logo = d.id; save(); },
  color(d) { S.agency.color = d.id; save(); },
  sound() { SND.on = !SND.on; try { localStorage.setItem('agentfoot_sound', SND.on ? '1' : '0'); } catch (e) { /* rien */ } if (SND.on) play(CHIME); },
  install() { const e = UI.installEvt; UI.installEvt = null; if (e) e.prompt(); },
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
  reset() { if (confirm('Effacer définitivement la partie ?')) { wipe(); UI.tab = 'home'; UI.modal = null; } },
  // Cérémonie
  cer() { UI.modal = { type: 'cer', i: 0, open: false }; },
  cerNext() { cerNext(); },
  cerClose() { UI.modal = null; },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { fn(el.dataset); render(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'in-name') { UI.nw.name = e.target.value; return; }
  if (e.target.id !== 'mkq') return;
  UI.mk.q = e.target.value; render();
  const el = $('#mkq'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'in-city') { UI.nw.city = e.target.value; return; }
  const k = e.target.dataset && e.target.dataset.filter;
  if (k) { UI.mk[k] = e.target.value; render(); }
  if (e.target.id === 'imp' && e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    if (S && !confirm('Remplacer la partie en cours par cette sauvegarde ?')) return;
    file.text().then((t) => { toast(importSave(t)); UI.tab = 'home'; UI.modal = null; render(); });
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && UI.modal && UI.modal.type !== 'cer') { UI.modal = null; render(); } });

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
