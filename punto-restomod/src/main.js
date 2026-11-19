import * as THREE from 'three';
import { Stage } from './stage.js';
import { CarBinder } from './carBinder.js';
import { buildPlaceholderCar, RIM_VARIANTS } from './placeholderCar.js';
import { DigitalScreens } from './screens.js';
import { CARBON_PARTS } from './nomenclature.js';
import {
  createMaterials, applyPaint, applyCarbonPattern, applyRimFinish, applySeat,
  PAINT_COLORS, PAINT_FINISHES, RIM_FINISHES, CALIPER_COLORS, SEAT_MATERIALS,
} from './materials.js';
import {
  loadConfig, saveConfig, loadVersions, saveVersions,
  storeModel, readStoredModel, clearStoredModel, loadGLB, bundledModelUrl,
} from './storage.js';

// =====================================================================
//  État de la configuration (sauvegardé automatiquement)
// =====================================================================
const DEFAULTS = {
  paintColor: '#b3121b', paintFinish: 'metallise',
  carbonPattern: 'forge', carbonPaint: false,
  carbonParts: Object.fromEntries(CARBON_PARTS.map((p) => [p.id, true])),
  rimVariant: 'Y5', rimFinish: 'noir_brillant', caliper: '#f2c200',
  rideHeight: -0.035,
  headlights: true, drl: true, smokedLights: true,
  ambientColor: '#00c8ff', ambientIntensity: 1, seat: 'alcantara', screensOn: true,
  night: false, autoRotate: true, quality: 'high', modelRotation: 0,
};
const state = loadConfig(structuredClone(DEFAULTS));
state.carbonParts = { ...DEFAULTS.carbonParts, ...state.carbonParts };

const AMBIENT_COLORS = ['#00c8ff', '#7a5cff', '#ff2bd6', '#ff1a2d', '#ff8a00', '#ffd400', '#2bff88', '#ffffff'];
const RIDE_PRESETS = [
  { id: 'pose', label: 'Posé (air)', v: -0.07 },
  { id: 'sport', label: 'Sport', v: -0.035 },
  { id: 'route', label: 'Route', v: 0 },
  { id: 'haut', label: 'Haut', v: 0.045 },
];

// =====================================================================
const $ = (s) => document.querySelector(s);
const stage = new Stage($('#viewport'));
const mat = createMaterials();
const screens = new DigitalScreens();
let binder = null;
let currentView = 'exterior';
let rideCurrent = state.rideHeight;
let modelSource = 'demo'; // 'demo' | 'bundled' | 'user'

function progress(p, text) {
  $('#loader-bar').style.width = `${Math.round(10 + p * 90)}%`;
  if (text) $('#loader-text').textContent = text;
}
function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}

// =====================================================================
//  Application de l'état -> matériaux / modèle
// =====================================================================
function applyAll() {
  applyPaint(mat.paint, state.paintColor, state.paintFinish);
  applyCarbonPattern(mat.carbon, state.carbonPattern);
  applyRimFinish(mat.rim, state.rimFinish);
  mat.caliper.color.set(state.caliper);
  applySeat(mat.seat, state.seat);
  mat.seatAccent.color.set(state.seat === 'cuir_rouge' ? '#111' : '#c8102e');
  screens.setAccent(state.ambientColor);
  if (binder) {
    binder.setCarbonUsesPaint(state.carbonPaint);
    for (const id of binder.carbonIds) binder.setCarbonVisible(id, state.carbonParts[id] !== false);
    binder.setRimVariant(state.rimVariant);
  }
  stage.setNight(state.night);
  document.body.classList.toggle('night', state.night);
  saveConfig(state);
}

// =====================================================================
//  Chargement du modèle
// =====================================================================
async function useModel(object3d, source, opts = {}) {
  binder = new CarBinder(object3d, mat, screens, opts);
  stage.attachCar(binder);
  modelSource = source;
  applyAll();
  renderReport();
  renderPanel();
  $('#model-status').textContent =
    source === 'demo' ? 'Voiture de démonstration (procédurale)' :
    source === 'bundled' ? 'Modèle embarqué : models/car.glb' : `Modèle importé : ${opts.fileName || 'fichier .glb'}`;
}

async function loadUserFile(file, { remember = true } = {}) {
  const url = URL.createObjectURL(file);
  try {
    toast('Chargement du modèle…', 10000);
    const scene = await loadGLB(url, stage.renderer);
    await useModel(scene, 'user', { normalize: true, rotationY: state.modelRotation, fileName: file.name });
    if (remember) await storeModel(file);
    const miss = binder.report.missing;
    toast(miss.length ? `Modèle chargé. Pièces non trouvées : ${miss.length} (voir rapport dans le menu)` : 'Modèle chargé : nomenclature complète ✔', 4200);
    stage.viewExterior();
  } catch (e) {
    console.error(e);
    toast('Impossible de lire ce fichier (.glb / .gltf attendu)');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadDemo() {
  const car = buildPlaceholderCar(mat);
  useModel(car, 'demo', { normalize: false });
}

async function boot() {
  progress(0.1, 'Création des matériaux PBR…');
  await new Promise((r) => setTimeout(r, 30));
  // 1) modèle importé mémorisé, 2) modèle embarqué dans l'APK, 3) démo
  const stored = await readStoredModel();
  if (stored?.blob) {
    progress(0.4, `Chargement de ${stored.name}…`);
    try {
      const url = URL.createObjectURL(stored.blob);
      const scene = await loadGLB(url, stage.renderer, (p) => progress(0.4 + p * 0.5));
      URL.revokeObjectURL(url);
      await useModel(scene, 'user', { normalize: true, rotationY: state.modelRotation, fileName: stored.name });
    } catch { loadDemo(); }
  } else {
    const bundled = await bundledModelUrl();
    if (bundled) {
      progress(0.4, 'Chargement du modèle 3D…');
      try {
        const scene = await loadGLB(bundled, stage.renderer, (p) => progress(0.4 + p * 0.5));
        await useModel(scene, 'bundled', { normalize: true, rotationY: state.modelRotation });
      } catch { loadDemo(); }
    } else {
      progress(0.6, 'Assemblage de la voiture…');
      loadDemo();
    }
  }
  progress(1, 'Prêt');
  stage.controls.autoRotate = state.autoRotate;
  // première image puis on retire l'écran de chargement
  requestAnimationFrame(() => setTimeout(() => $('#loader').classList.add('done'), 250));
  stage.camera.position.set(7.5, 2.6, 8.5);
  stage.viewExterior();
}

// =====================================================================
//  Boucle de rendu
// =====================================================================
function loop() {
  requestAnimationFrame(loop);
  // suspension pneumatique : la caisse descend/monte en douceur
  if (binder) {
    rideCurrent += (state.rideHeight - rideCurrent) * 0.08;
    binder.setRideHeight(rideCurrent);
  }
  stage.frame(state, mat, screens);
}

// =====================================================================
//  Interface : vues
// =====================================================================
function setView(v) {
  currentView = v;
  document.querySelectorAll('#views button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  if (v === 'exterior') stage.viewExterior();
  if (v === 'driver' || v === 'passenger') {
    stage.viewInterior(v);
    if (!['interior', 'lights'].includes(activeTab)) selectTab('interior');
  }
}
document.querySelectorAll('#views button').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.view === 'detail') { $('#detail-menu').classList.toggle('hidden'); return; }
  $('#detail-menu').classList.add('hidden');
  setView(b.dataset.view);
}));
document.querySelectorAll('#detail-menu button').forEach((b) => b.addEventListener('click', () => {
  $('#detail-menu').classList.add('hidden');
  currentView = 'detail';
  document.querySelectorAll('#views button').forEach((x) => x.classList.toggle('active', x.dataset.view === 'detail'));
  stage.viewDetail(b.dataset.detail);
  const tabFor = { wheel: 'wheels', front: 'lights', rear: 'carbon', spoiler: 'carbon' }[b.dataset.detail];
  if (tabFor) selectTab(tabFor);
}));
stage.onUserInteract = () => { $('#detail-menu').classList.add('hidden'); };

$('#btn-daynight').addEventListener('click', () => {
  state.night = !state.night;
  applyAll();
  toast(state.night ? 'Mode nuit : phares Matrix LED et ambiance allumés' : 'Mode jour', 1600);
});

// =====================================================================
//  Interface : atelier (onglets)
// =====================================================================
let activeTab = 'paint';
function selectTab(tab) {
  const ws = $('#workshop');
  if (tab === activeTab && !ws.classList.contains('collapsed')) { ws.classList.add('collapsed'); return; }
  ws.classList.remove('collapsed');
  activeTab = tab;
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  renderPanel();
}
document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));

// --- petits constructeurs d'UI ---------------------------------------
function group(title, value) {
  const g = document.createElement('div');
  g.className = 'group';
  g.innerHTML = `<div class="group-title"><span>${title}</span>${value ? `<em>${value}</em>` : ''}</div>`;
  return g;
}
function swatches(items, current, onPick) {
  const w = document.createElement('div'); w.className = 'swatches';
  for (const it of items) {
    const b = document.createElement('button');
    b.className = 'swatch' + (it.hex.toLowerCase() === current.toLowerCase() ? ' active' : '');
    b.style.background = it.hex;
    b.title = it.label || it.hex;
    b.addEventListener('click', () => onPick(it));
    w.appendChild(b);
  }
  return w;
}
function chips(items, isActive, onPick, toggle = false) {
  const w = document.createElement('div'); w.className = 'chips';
  for (const it of items) {
    const b = document.createElement('button');
    b.className = 'chip' + (toggle ? ' toggle' : '') + (isActive(it) ? ' active' : '');
    b.textContent = it.label;
    b.addEventListener('click', () => onPick(it));
    w.appendChild(b);
  }
  return w;
}
function slider(min, max, step, value, onInput, labels) {
  const f = document.createDocumentFragment();
  const r = document.createElement('input');
  Object.assign(r, { type: 'range', min, max, step, value });
  r.addEventListener('input', () => onInput(parseFloat(r.value)));
  f.appendChild(r);
  if (labels) {
    const l = document.createElement('div'); l.className = 'range-labels';
    l.innerHTML = labels.map((x) => `<span>${x}</span>`).join('');
    f.appendChild(l);
  }
  return f;
}
const update = (patch) => { Object.assign(state, patch); applyAll(); renderPanel(); };

function renderPanel() {
  const p = $('#panel');
  p.innerHTML = '';
  const add = (el) => p.appendChild(el);

  if (activeTab === 'paint') {
    const col = PAINT_COLORS.find((c) => c.hex === state.paintColor);
    const g1 = group('Teinte', col ? col.label : state.paintColor);
    g1.appendChild(swatches(PAINT_COLORS, state.paintColor, (c) => update({ paintColor: c.hex })));
    add(g1);
    const g2 = group('Finition', PAINT_FINISHES[state.paintFinish].label);
    g2.appendChild(chips(Object.entries(PAINT_FINISHES).map(([id, f]) => ({ id, label: f.label })), (i) => i.id === state.paintFinish, (i) => update({ paintFinish: i.id })));
    add(g2);
  }

  if (activeTab === 'carbon') {
    const g1 = group('Matière du kit');
    g1.appendChild(chips(
      [{ id: 'forge', label: 'Carbone forgé' }, { id: 'tresse', label: 'Carbone tressé' }, { id: 'paint', label: 'Couleur carrosserie' }],
      (i) => (i.id === 'paint' ? state.carbonPaint : !state.carbonPaint && state.carbonPattern === i.id),
      (i) => update(i.id === 'paint' ? { carbonPaint: true } : { carbonPaint: false, carbonPattern: i.id }),
    ));
    add(g1);
    const ids = binder ? binder.carbonIds : [];
    const parts = CARBON_PARTS.filter((c) => ids.includes(c.id));
    const g2 = group('Pièces montées', `${parts.filter((c) => state.carbonParts[c.id] !== false).length}/${parts.length}`);
    if (parts.length) {
      g2.appendChild(chips(parts, (c) => state.carbonParts[c.id] !== false, (c) => {
        state.carbonParts[c.id] = state.carbonParts[c.id] === false; update({});
      }, true));
    } else {
      g2.insertAdjacentHTML('beforeend', '<p class="muted">Aucune pièce Carbon_… dans ce modèle.</p>');
    }
    add(g2);
  }

  if (activeTab === 'wheels') {
    const variants = binder?.rimVariantIds.length ? binder.rimVariantIds : [];
    const g1 = group('Design de jante');
    if (variants.length) {
      const items = variants.map((id) => ({ id, label: RIM_VARIANTS.find((r) => r.id === id)?.label || id }));
      g1.appendChild(chips(items, (i) => i.id === state.rimVariant, (i) => update({ rimVariant: i.id })));
    } else g1.insertAdjacentHTML('beforeend', '<p class="muted">Une seule jante dans ce modèle (ajoute des Rim_Variant_… dans Blender).</p>');
    add(g1);
    const g2 = group('Finition', RIM_FINISHES[state.rimFinish].label);
    g2.appendChild(swatches(Object.entries(RIM_FINISHES).map(([id, f]) => ({ id, hex: f.color, label: f.label })),
      RIM_FINISHES[state.rimFinish].color, (f) => update({ rimFinish: f.id })));
    add(g2);
    const cal = CALIPER_COLORS.find((c) => c.hex === state.caliper);
    const g3 = group('Étriers Brembo', cal?.label);
    g3.appendChild(swatches(CALIPER_COLORS, state.caliper, (c) => update({ caliper: c.hex })));
    add(g3);
  }

  if (activeTab === 'chassis') {
    const cm = Math.round(state.rideHeight * 100);
    const g1 = group('Hauteur de caisse', `${cm > 0 ? '+' : ''}${cm} cm`);
    g1.appendChild(slider(-0.07, 0.045, 0.005, state.rideHeight, (v) => {
      state.rideHeight = v; saveConfig(state);
      g1.querySelector('em').textContent = `${Math.round(v * 100) > 0 ? '+' : ''}${Math.round(v * 100)} cm`;
    }, ['Posé', 'Origine', 'Haut']));
    add(g1);
    const g2 = group('Suspension pneumatique');
    g2.appendChild(chips(RIDE_PRESETS, (r) => Math.abs(r.v - state.rideHeight) < 0.003, (r) => update({ rideHeight: r.v })));
    add(g2);
  }

  if (activeTab === 'lights') {
    const g1 = group('Éclairage extérieur');
    g1.appendChild(chips([
      { id: 'headlights', label: 'Phares Matrix LED' },
      { id: 'drl', label: 'Signature DRL' },
      { id: 'smokedLights', label: 'Optiques fumées' },
    ], (i) => state[i.id], (i) => update({ [i.id]: !state[i.id] }), true));
    add(g1);
    const g2 = group('Ambiance', state.night ? 'Nuit' : 'Jour');
    g2.appendChild(chips([{ id: false, label: '☀ Jour' }, { id: true, label: '☾ Nuit' }], (i) => i.id === state.night, (i) => update({ night: i.id })));
    add(g2);
  }

  if (activeTab === 'interior') {
    const g1 = group('LED d’ambiance');
    g1.appendChild(swatches(AMBIENT_COLORS.map((hex) => ({ hex })), state.ambientColor, (c) => update({ ambientColor: c.hex })));
    add(g1);
    const g2 = group('Teinte personnalisée');
    const hue = new THREE.Color(state.ambientColor).getHSL({}).h;
    g2.appendChild(slider(0, 1, 0.005, hue, (h) => {
      state.ambientColor = '#' + new THREE.Color().setHSL(h, 1, 0.5).getHexString();
      applyAll();
    }));
    g2.querySelector('input').style.accentColor = 'auto';
    g2.querySelector('input').classList.add('hue');
    add(g2);
    const g3 = group('Intensité', `${Math.round(state.ambientIntensity * 100)} %`);
    g3.appendChild(slider(0, 1.5, 0.05, state.ambientIntensity, (v) => {
      state.ambientIntensity = v; saveConfig(state);
      g3.querySelector('em').textContent = `${Math.round(v * 100)} %`;
    }));
    add(g3);
    const g4 = group('Sièges baquets', SEAT_MATERIALS[state.seat].label);
    g4.appendChild(chips(Object.entries(SEAT_MATERIALS).map(([id, s]) => ({ id, label: s.label })), (i) => i.id === state.seat, (i) => update({ seat: i.id })));
    add(g4);
    const g5 = group('Cockpit numérique');
    g5.appendChild(chips([{ id: 'screensOn', label: 'Double écran allumé' }], () => state.screensOn, () => update({ screensOn: !state.screensOn }), true));
    add(g5);
  }
}

// =====================================================================
//  Menu : modèle, versions, options
// =====================================================================
$('#btn-menu').addEventListener('click', () => { renderVersions(); $('#drawer').classList.remove('hidden'); });
$('#btn-close-drawer').addEventListener('click', () => $('#drawer').classList.add('hidden'));
$('#drawer').addEventListener('click', (e) => { if (e.target.id === 'drawer') $('#drawer').classList.add('hidden'); });

$('#file-input').addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  e.target.value = '';
  if (!f) return;
  $('#drawer').classList.add('hidden');
  await loadUserFile(f);
});
$('#btn-rotate-model').addEventListener('click', async () => {
  if (modelSource === 'demo') { toast('La démo est déjà orientée correctement'); return; }
  state.modelRotation = (state.modelRotation + Math.PI / 2) % (Math.PI * 2);
  saveConfig(state);
  const stored = await readStoredModel();
  if (stored?.blob) await loadUserFile(stored.blob instanceof File ? stored.blob : new File([stored.blob], stored.name), { remember: false });
  else if (modelSource === 'bundled') {
    const scene = await loadGLB('./models/car.glb', stage.renderer);
    await useModel(scene, 'bundled', { normalize: true, rotationY: state.modelRotation });
  }
});
$('#btn-reset-model').addEventListener('click', async () => {
  await clearStoredModel();
  state.modelRotation = 0;
  loadDemo();
  toast('Voiture de démonstration rechargée');
});

function renderReport() {
  const r = binder.report;
  const rows = Object.entries(r.found).map(([k, n]) => `<p class="ok">✔ ${k} × ${n}</p>`).join('');
  const miss = r.missing.map((k) => `<p class="warn">✖ ${k} manquant</p>`).join('');
  const warn = r.warnings.map((w) => `<p class="warn">⚠ ${w}</p>`).join('');
  $('#report-body').innerHTML = rows + miss + warn || '<p class="muted">Rien de reconnu.</p>';
}

function renderVersions() {
  const list = loadVersions();
  const ul = $('#versions');
  ul.innerHTML = list.length ? '' : '<li class="muted">Aucune version sauvegardée</li>';
  list.forEach((v, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${v.name.replace(/</g, '&lt;')}</span>`;
    const load = document.createElement('button'); load.textContent = 'Charger';
    load.onclick = () => { const { night, autoRotate, quality, modelRotation } = state; Object.assign(state, v.config, { night, autoRotate, quality, modelRotation }); applyAll(); renderPanel(); toast(`« ${v.name} » appliquée`); };
    const del = document.createElement('button'); del.textContent = '✕';
    del.onclick = () => { list.splice(i, 1); saveVersions(list); renderVersions(); };
    li.append(load, del);
    ul.appendChild(li);
  });
}
$('#btn-save-version').addEventListener('click', () => {
  const name = $('#version-name').value.trim() || `Version ${loadVersions().length + 1}`;
  const { night, autoRotate, quality, modelRotation, ...config } = state;
  const list = loadVersions();
  list.unshift({ name, config: structuredClone(config), date: Date.now() });
  saveVersions(list);
  $('#version-name').value = '';
  renderVersions();
  toast(`« ${name} » sauvegardée`);
});

const optAuto = $('#opt-autorotate');
optAuto.checked = state.autoRotate;
optAuto.addEventListener('change', () => {
  state.autoRotate = optAuto.checked; saveConfig(state);
  stage.controls.autoRotate = state.autoRotate && currentView === 'exterior';
});
const optQ = $('#opt-quality');
optQ.checked = state.quality === 'high';
stage.setQuality(state.quality);
optQ.addEventListener('change', () => { state.quality = optQ.checked ? 'high' : 'balanced'; saveConfig(state); stage.setQuality(state.quality); });

// Bouton retour Android : ferme le menu / revient à l'extérieur
window.addEventListener('popstate', () => {
  if (!$('#drawer').classList.contains('hidden')) $('#drawer').classList.add('hidden');
  else if (currentView !== 'exterior') setView('exterior');
  history.pushState(null, '');
});
history.pushState(null, '');

// Debug / tests automatisés
window.__app = { stage, state, setView, selectTab, update, get binder() { return binder; } };

renderPanel();
boot().then(loop);
