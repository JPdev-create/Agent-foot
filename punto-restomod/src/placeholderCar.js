import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// =====================================================================
//  Voiture de démonstration procédurale (proportions Punto Evo 3 portes)
//  -> sert tant que tu n'as pas chargé ton propre modèle .glb.
//  Tous les objets respectent la NOMENCLATURE : le même code pilote ce
//  placeholder et ton futur modèle Blender.
//
//  Repère : Y = haut, +Z = avant de la voiture, +X = côté gauche (conducteur).
// =====================================================================

const L = 4.065;            // longueur (m)
const ZF = 1.16;            // essieu avant
const ZR = -1.35;           // essieu arrière (empattement 2.51 m)
const WHEEL_R = 0.30;       // rayon roue
const ARCH_R = 0.37;        // rayon passage de roue
const TRACK = 0.735;        // demi-voie
const ARCH_DX = Math.sqrt(ARCH_R ** 2 - 0.1 ** 2);
const ARCH_A0 = Math.PI + Math.atan2(0.1, ARCH_DX);
const ARCH_A1 = -Math.atan2(0.1, ARCH_DX);

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// déformation "carrosserie" : galbe vers le haut + arrondi avant/arrière en vue de dessus
const bodyTaper = (y, z) => (1 - 0.09 * smooth(0.55, 1.0, y)) * (1 - 0.13 * Math.pow(Math.min(1, Math.abs(z) / 2.06), 6));
const glassTaper = (y, z) => (1 - 0.2 * smooth(0.95, 1.45, y)) * (1 - 0.1 * Math.pow(Math.min(1, Math.abs(z) / 2.06), 6));

function deform(geo, taper) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setX(i, p.getX(i) * taper(p.getY(i), p.getZ(i)));
  }
  p.needsUpdate = true;
}

/** Extrude un profil latéral (u = z, v = y) sur la largeur, centré sur xCenter. */
function extrudeProfile(shape, width, xCenter, bevel, taper, { smoothNormals = true } = {}) {
  const depth = Math.max(0.001, width - bevel * 2);
  let geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8,
    bevelSegments: 5, curveSegments: 28,
  });
  geo.translate(0, 0, -depth / 2);
  geo.rotateY(-Math.PI / 2);
  geo.translate(xCenter, 0, 0);
  if (taper) deform(geo, taper);
  if (smoothNormals) {
    geo.deleteAttribute('normal');
    geo.deleteAttribute('uv');
    geo = mergeVertices(geo, 1e-4);
    geo.computeVertexNormals();
    // UV projetées (pour le carbone / paillettes)
    const p = geo.attributes.position;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getZ(i) * 1.5; uv[i * 2 + 1] = p.getY(i) * 1.5 + p.getX(i); }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  return geo;
}

function mk(name, geo, mat, parent, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------------
export function buildPlaceholderCar(mat) {
  const root = new THREE.Group();
  root.name = 'PuntoAbarth_Demo';

  buildBody(root, mat);
  buildCarbonKit(root, mat);
  buildLights(root, mat);
  buildInterior(root, mat);
  for (const pos of ['FL', 'FR', 'RL', 'RR']) root.add(buildWheel(pos, mat));

  const camD = new THREE.Object3D(); camD.name = 'Cam_Driver'; camD.position.set(0.37, 1.16, -0.46); root.add(camD);
  const camP = new THREE.Object3D(); camP.name = 'Cam_Passenger'; camP.position.set(-0.37, 1.16, -0.46); root.add(camP);
  return root;
}

// ---------------------------------------------------------------------
function buildBody(root, mat) {
  const W = 1.687;

  // Bloc avant (capot, bouclier, ailes avant)
  const front = new THREE.Shape();
  front.moveTo(0.78, 0.20);
  front.lineTo(ZF - ARCH_DX, 0.20);
  front.absarc(ZF, 0.30, ARCH_R, ARCH_A0, ARCH_A1, true);
  front.lineTo(1.97, 0.20);
  front.quadraticCurveTo(2.06, 0.28, 2.045, 0.50);
  front.quadraticCurveTo(2.03, 0.67, 1.88, 0.735);
  front.quadraticCurveTo(1.35, 0.85, 0.84, 0.925);
  front.lineTo(0.78, 0.93);
  front.closePath();
  mk('Body_Paint_Front', extrudeProfile(front, W, 0, 0.07, bodyTaper), mat.paint, root);

  // Flancs (portières) : deux tôles fines pour garder l'habitacle ouvert
  const side = new THREE.Shape();
  side.moveTo(0.78, 0.20);
  side.lineTo(0.78, 0.93);
  side.quadraticCurveTo(-0.4, 0.965, -1.50, 1.0);
  side.lineTo(-1.78, 1.005);
  side.lineTo(-1.78, 0.20);
  side.lineTo(ZR - ARCH_DX, 0.20);
  side.absarc(ZR, 0.30, ARCH_R, ARCH_A0, ARCH_A1, true);
  side.closePath();
  const sw = 0.09;
  mk('Body_Paint_Side_L', extrudeProfile(side, sw, W / 2 - sw / 2, 0.035, bodyTaper), mat.paint, root);
  mk('Body_Paint_Side_R', extrudeProfile(side, sw, -W / 2 + sw / 2, 0.035, bodyTaper), mat.paint, root);

  // Bloc arrière (hayon / bouclier)
  const rear = new THREE.Shape();
  rear.moveTo(-1.78, 0.20);
  rear.lineTo(-1.78, 1.005);
  rear.quadraticCurveTo(-1.90, 1.0, -1.985, 0.95);
  rear.quadraticCurveTo(-2.06, 0.75, -2.045, 0.45);
  rear.quadraticCurveTo(-2.035, 0.24, -1.95, 0.20);
  rear.closePath();
  mk('Body_Paint_Rear', extrudeProfile(rear, W, 0, 0.07, bodyTaper), mat.paint, root);

  // Plancher / bas de caisse
  mk('Body_Trim_Underbody', new THREE.BoxGeometry(1.5, 0.04, 3.7), mat.trim, root).position.set(0, 0.21, 0);

  // Habitacle vitré (on supprime la face du bas pour garder l'intérieur visible)
  const gh = new THREE.Shape();
  gh.moveTo(1.05, 0.89);
  gh.quadraticCurveTo(0.55, 1.24, 0.0, 1.415);
  gh.quadraticCurveTo(-0.72, 1.47, -1.43, 1.415);
  gh.quadraticCurveTo(-1.76, 1.30, -1.975, 0.92);
  gh.lineTo(-1.5, 0.90);
  gh.closePath();
  let g = new THREE.ExtrudeGeometry(gh, { depth: 1.36, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 4, curveSegments: 24 });
  g.translate(0, 0, -0.68); g.rotateY(-Math.PI / 2);
  deform(g, glassTaper);
  g = g.toNonIndexed ? (g.index ? g.toNonIndexed() : g) : g;
  g = dropTriangles(g, (ys) => ys.every((y) => y < 0.95));
  g.computeVertexNormals();
  mk('Glass_Greenhouse', g, mat.glass, root, { cast: false, receive: false }).renderOrder = 2;

  // Pavillon
  const roof = new THREE.Shape();
  roof.moveTo(0.07, 1.405);
  roof.quadraticCurveTo(-0.72, 1.48, -1.47, 1.405);
  roof.lineTo(-1.45, 1.375);
  roof.quadraticCurveTo(-0.72, 1.445, 0.05, 1.375);
  roof.closePath();
  mk('Body_Paint_Roof', extrudeProfile(roof, 1.2, 0, 0.02, null), mat.paint, root);

  // Montants (A, B, C) qui suivent le galbe du vitrage
  const hwAt = (y, z) => 0.71 * glassTaper(y, z);
  const pillar = (name, pts2d, r) => {
    for (const s of [1, -1]) {
      const pts = pts2d.map(([z, y]) => new THREE.Vector3(s * hwAt(y, z), y, z));
      const curve = new THREE.CatmullRomCurve3(pts);
      mk(`${name}_${s > 0 ? 'L' : 'R'}`, new THREE.TubeGeometry(curve, 24, r, 10, false), mat.paint, root);
    }
  };
  const qb = (a, c, b, n = 8) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n; return [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
  });
  pillar('Body_Paint_PillarA', qb([1.02, 0.91], [0.55, 1.24], [0.02, 1.41]), 0.03);
  pillar('Body_Paint_PillarB', [[-0.62, 0.97], [-0.66, 1.2], [-0.70, 1.43]], 0.035);
  pillar('Body_Paint_PillarC', qb([-1.42, 1.41], [-1.76, 1.30], [-1.96, 0.95]), 0.05);
  // Custode arrière pleine (gros montant C typique de la Punto 3p)
  for (const s of [1, -1]) {
    const q = new THREE.Shape();
    q.moveTo(-1.22, 0.97); q.lineTo(-1.38, 1.40); q.lineTo(-1.50, 1.40);
    q.quadraticCurveTo(-1.80, 1.22, -1.93, 0.97); q.closePath();
    const qg = new THREE.ExtrudeGeometry(q, { depth: 0.02, bevelEnabled: false, curveSegments: 12 });
    qg.rotateY(-Math.PI / 2);
    const p = qg.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, s * hwAt(p.getY(i), p.getZ(i)) + p.getX(i) * s);
    qg.computeVertexNormals();
    mk(`Body_Paint_Quarter_${s > 0 ? 'L' : 'R'}`, qg, mat.paint, root);
  }

  // Rétroviseurs (pied + coque ; la coque carbone est dans le kit)
  for (const s of [1, -1]) {
    const m = mk(`Body_Trim_Mirror_${s > 0 ? 'L' : 'R'}`, new RoundedBoxGeometry(0.10, 0.06, 0.08, 3, 0.02), mat.trim, root);
    m.position.set(s * 0.80, 0.98, 0.70);
    const glass = mk(`Chrome_MirrorGlass_${s > 0 ? 'L' : 'R'}`, new THREE.PlaneGeometry(0.15, 0.085), mat.chrome, root);
    glass.position.set(s * 0.90, 1.03, 0.655); glass.rotation.y = Math.PI;
  }

  // Calandre / entrées d'air / logo
  mk('Body_Trim_Grille_Low', new RoundedBoxGeometry(1.15, 0.17, 0.08, 3, 0.03), mat.trim, root).position.set(0, 0.36, 2.02);
  mk('Body_Trim_Grille_Up', new RoundedBoxGeometry(0.62, 0.07, 0.06, 3, 0.02), mat.trim, root).position.set(0, 0.62, 1.995);
  for (const s of [1, -1]) {
    mk(`Body_Trim_Intake_${s > 0 ? 'L' : 'R'}`, new RoundedBoxGeometry(0.2, 0.12, 0.06, 3, 0.03), mat.trim, root).position.set(s * 0.66, 0.36, 1.95);
  }
  const badge = mk('Chrome_Badge_Front', new THREE.CylinderGeometry(0.045, 0.045, 0.015, 32), mat.chrome, root);
  badge.rotation.x = Math.PI / 2; badge.position.set(0, 0.62, 2.03);
  const badgeR = mk('Chrome_Badge_Rear', new THREE.CylinderGeometry(0.04, 0.04, 0.015, 32), mat.chrome, root);
  badgeR.rotation.x = Math.PI / 2; badgeR.position.set(0, 0.74, -2.05);
  // Échappements
  for (const x of [0.32, 0.45]) {
    const e = mk('Chrome_Exhaust', new THREE.CylinderGeometry(0.04, 0.04, 0.12, 24, 1, true), mat.chrome, root);
    e.rotation.x = Math.PI / 2; e.position.set(-x, 0.24, -2.0);
  }
}

function dropTriangles(geo, predicate) {
  const p = geo.attributes.position;
  const keep = [];
  for (let i = 0; i < p.count; i += 3) {
    const ys = [p.getY(i), p.getY(i + 1), p.getY(i + 2)];
    if (!predicate(ys)) for (let k = 0; k < 3; k++) keep.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  return out;
}

// ---------------------------------------------------------------------
function buildCarbonKit(root, mat) {
  // Lame avant
  const spl = new THREE.Shape();
  spl.moveTo(-0.80, 0); spl.lineTo(0.80, 0); spl.quadraticCurveTo(0.86, 0.10, 0.72, 0.13);
  spl.lineTo(-0.72, 0.13); spl.quadraticCurveTo(-0.86, 0.10, -0.80, 0);
  const splG = new THREE.ExtrudeGeometry(spl, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
  splG.rotateX(-Math.PI / 2);
  const s = mk('Carbon_Splitter', splG, mat.carbon, root);
  s.position.set(0, 0.17, 1.96);

  // Jupes latérales
  for (const sd of [1, -1]) {
    const g = new RoundedBoxGeometry(0.07, 0.07, 1.68, 3, 0.02);
    const m = mk(`Carbon_Skirt_${sd > 0 ? 'L' : 'R'}`, g, mat.carbon, root);
    m.position.set(sd * 0.835, 0.19, -0.095);
  }

  // Diffuseur + ailettes
  const diff = new THREE.Group(); diff.name = 'Carbon_Diffuser'; root.add(diff);
  const base = mk('Carbon_Diffuser_Base', new RoundedBoxGeometry(1.30, 0.035, 0.36, 2, 0.012), mat.carbon, diff);
  base.position.set(0, 0.17, -1.93); base.rotation.x = -0.18;
  for (let i = -3; i <= 3; i++) {
    if (Math.abs(i) === 2) continue;
    const f = mk('Carbon_Diffuser_Fin', new THREE.BoxGeometry(0.012, 0.11, 0.32), mat.carbon, diff);
    f.position.set(i * 0.17, 0.22, -1.95); f.rotation.x = -0.18;
  }

  // Becquet de toit
  const spo = new THREE.Group(); spo.name = 'Carbon_Spoiler'; root.add(spo);
  const blade = mk('Carbon_Spoiler_Blade', new RoundedBoxGeometry(1.14, 0.03, 0.30, 3, 0.012), mat.carbon, spo);
  blade.position.set(0, 1.40, -1.58); blade.rotation.x = 0.16;
  for (const sd of [1, -1]) {
    const e = mk('Carbon_Spoiler_End', new RoundedBoxGeometry(0.025, 0.08, 0.30, 2, 0.01), mat.carbon, spo);
    e.position.set(sd * 0.57, 1.385, -1.58); e.rotation.x = 0.16;
  }

  // Coques de rétroviseurs
  for (const sd of [1, -1]) {
    const c = mk(`Carbon_Mirror_${sd > 0 ? 'L' : 'R'}`, new RoundedBoxGeometry(0.20, 0.11, 0.11, 4, 0.045), mat.carbon, root);
    c.position.set(sd * 0.90, 1.03, 0.71);
  }
}

// ---------------------------------------------------------------------
function buildLights(root, mat) {
  for (const sd of [1, -1]) {
    const side = sd > 0 ? 'L' : 'R';
    // Optique avant : boîtier fumé allongé qui remonte vers le capot
    const hg = new RoundedBoxGeometry(0.40, 0.11, 0.12, 4, 0.04);
    const h = mk(`Light_Housing_Front_${side}`, hg, mat.lightHousing, root);
    h.position.set(sd * 0.50, 0.715, 1.90);
    h.rotation.set(-0.35, sd * 0.42, sd * 0.06);
    // 3 modules Matrix LED
    for (let i = 0; i < 3; i++) {
      const p = mk(`Headlight_LED_${side}_${i}`, new THREE.CylinderGeometry(0.024, 0.024, 0.02, 24), mat.headlight, h, { cast: false });
      p.rotation.x = Math.PI / 2; p.position.set(sd * (-0.12 + i * 0.09), -0.005, 0.06);
    }
    // Signature DRL en "boomerang"
    const drlCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sd * -0.18, 0.035, 0.062),
      new THREE.Vector3(sd * 0.10, 0.04, 0.062),
      new THREE.Vector3(sd * 0.18, 0.0, 0.055),
      new THREE.Vector3(sd * 0.17, -0.04, 0.05),
    ]);
    mk(`DRL_LED_${side}`, new THREE.TubeGeometry(drlCurve, 32, 0.006, 8, false), mat.drl, h, { cast: false });

    // Feux arrière fumés
    const t = mk(`Light_Housing_Rear_${side}`, new RoundedBoxGeometry(0.26, 0.15, 0.06, 4, 0.025), mat.lightHousing, root);
    t.position.set(sd * 0.60, 0.86, -1.985); t.rotation.y = sd * -0.3;
    const tc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sd * -0.10, 0.05, -0.032), new THREE.Vector3(sd * 0.09, 0.05, -0.032),
      new THREE.Vector3(sd * 0.10, -0.04, -0.032), new THREE.Vector3(sd * -0.06, -0.05, -0.032),
    ]);
    mk(`Taillight_LED_${side}`, new THREE.TubeGeometry(tc, 32, 0.007, 8, false), mat.taillight, t, { cast: false });
  }
  // Bandeau LED arrière traversant (touche restomod)
  const bar = mk('Taillight_LED_Bar', new THREE.BoxGeometry(0.80, 0.008, 0.01), mat.taillight, root, { cast: false });
  bar.position.set(0, 0.89, -2.035);
}

// ---------------------------------------------------------------------
function buildInterior(root, mat) {
  const I = new THREE.Group(); I.name = 'Interior'; root.add(I);

  mk('Interior_Floor', new THREE.BoxGeometry(1.52, 0.03, 2.5), mat.interiorSoft, I).position.set(0, 0.25, -0.5);
  mk('Interior_Headliner', new THREE.BoxGeometry(1.08, 0.01, 1.4), mat.interiorSoft, I).position.set(0, 1.37, -0.7);
  mk('Interior_Trunk', new THREE.BoxGeometry(1.4, 0.6, 0.02), mat.interior, I).position.set(0, 0.6, -1.45);

  // Planche de bord
  const dash = new THREE.Shape();
  dash.moveTo(0.80, 0.55); dash.lineTo(0.80, 0.93); dash.quadraticCurveTo(0.62, 0.95, 0.52, 0.90);
  dash.quadraticCurveTo(0.47, 0.82, 0.50, 0.66); dash.lineTo(0.60, 0.55); dash.closePath();
  mk('Interior_Dash', extrudeProfile(dash, 1.52, 0, 0.02, null), mat.interiorSoft, I);
  mk('Interior_Dash_Trim', new THREE.BoxGeometry(1.46, 0.035, 0.01), mat.piano, I).position.set(0, 0.80, 0.505);
  mk('Interior_Ambient_LED_Dash', new THREE.BoxGeometry(1.42, 0.006, 0.006), mat.ambient, I, { cast: false }).position.set(0, 0.778, 0.50);

  // Double dalle numérique sous une même vitre (façon MBUX)
  const scr = new THREE.Group(); scr.position.set(0.18, 1.0, 0.62); scr.rotation.x = 0.18; I.add(scr);
  mk('Interior_Screen_Bezel', new RoundedBoxGeometry(0.78, 0.16, 0.025, 3, 0.01), mat.piano, scr);
  const cl = mk('Screen_Cluster', new THREE.PlaneGeometry(0.36, 0.135), mat.interior, scr, { cast: false });
  cl.position.set(0.19, 0, -0.0135); cl.rotation.y = Math.PI;
  const ce = mk('Screen_Center', new THREE.PlaneGeometry(0.36, 0.135), mat.interior, scr, { cast: false });
  ce.position.set(-0.19, 0, -0.0135); ce.rotation.y = Math.PI;

  // Aérateurs turbine + anneaux LED
  for (const x of [0.64, 0.10, -0.08, -0.62]) {
    const v = mk('Interior_Vent', new THREE.CylinderGeometry(0.042, 0.042, 0.03, 32), mat.interiorAlu, I);
    v.rotation.x = Math.PI / 2; v.position.set(x, 0.86, 0.505);
    const ring = mk('Interior_Ambient_LED_Vent', new THREE.TorusGeometry(0.045, 0.004, 8, 40), mat.ambient, I, { cast: false });
    ring.position.set(x, 0.86, 0.49);
  }

  // Volant sport à méplat + palettes
  const wheel = new THREE.Group(); wheel.name = 'Interior_SteeringWheel';
  wheel.position.set(0.37, 0.90, 0.27); wheel.rotation.x = 0.35; I.add(wheel);
  const pts = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * 0.18, Math.max(Math.sin(a) * 0.18, -0.145), 0));
  }
  mk('Interior_Wheel_Rim', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 128, 0.018, 12, true), mat.seat, wheel);
  mk('Interior_Wheel_Mark', new THREE.BoxGeometry(0.03, 0.012, 0.04), mat.seatAccent, wheel).position.set(0, 0.18, 0);
  for (const a of [0, Math.PI, -Math.PI / 2]) {
    const sp = mk('Interior_Wheel_Spoke', new THREE.BoxGeometry(0.15, 0.03, 0.015), mat.piano, wheel);
    sp.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.075, 0.01); sp.rotation.z = a;
  }
  const hub = mk('Interior_Wheel_Hub', new THREE.CylinderGeometry(0.06, 0.065, 0.04, 32), mat.piano, wheel);
  hub.rotation.x = Math.PI / 2; hub.position.z = 0.015;
  for (const sd of [1, -1]) {
    const pd = mk('Interior_Paddle', new RoundedBoxGeometry(0.07, 0.10, 0.008, 2, 0.003), mat.interiorAlu, wheel);
    pd.position.set(sd * 0.13, 0.03, 0.045);
  }
  const col = mk('Interior_Column', new THREE.CylinderGeometry(0.035, 0.05, 0.3, 16), mat.interior, I);
  col.position.set(0.37, 0.845, 0.43); col.rotation.x = -(Math.PI / 2 - 0.35);

  // Console centrale + LED
  mk('Interior_Console', new RoundedBoxGeometry(0.22, 0.2, 0.75, 3, 0.03), mat.interior, I).position.set(0, 0.38, 0.06);
  mk('Interior_Console_Top', new THREE.BoxGeometry(0.20, 0.01, 0.5), mat.piano, I).position.set(0, 0.485, 0.15);
  for (const sd of [1, -1]) {
    mk('Interior_Ambient_LED_Console', new THREE.BoxGeometry(0.005, 0.005, 0.7), mat.ambient, I, { cast: false }).position.set(sd * 0.112, 0.45, 0.06);
  }
  mk('Interior_Gear', new THREE.CylinderGeometry(0.02, 0.025, 0.07, 16), mat.interiorAlu, I).position.set(0, 0.52, 0.25);

  // Panneaux de portes + LED
  for (const sd of [1, -1]) {
    const side = sd > 0 ? 'L' : 'R';
    mk(`Interior_Door_${side}`, new RoundedBoxGeometry(0.04, 0.48, 1.35, 3, 0.015), mat.interiorSoft, I).position.set(sd * 0.745, 0.68, 0.0);
    mk(`Interior_Door_Arm_${side}`, new RoundedBoxGeometry(0.08, 0.04, 0.5, 2, 0.015), mat.seat, I).position.set(sd * 0.71, 0.70, -0.05);
    mk(`Interior_Ambient_LED_Door_${side}`, new THREE.BoxGeometry(0.005, 0.005, 1.2), mat.ambient, I, { cast: false }).position.set(sd * 0.722, 0.88, 0.0);
  }

  // Pédalier alu
  for (const [x, w] of [[0.48, 0.06], [0.38, 0.09], [0.28, 0.06]]) {
    const p = mk('Interior_Pedal', new THREE.BoxGeometry(w, 0.09, 0.012), mat.interiorAlu, I);
    p.position.set(x, 0.36, 0.63); p.rotation.x = -0.4;
  }

  // Sièges baquets
  const bucket = (name, x, z) => {
    const g = new THREE.Group(); g.name = name; g.position.set(x, 0, z); I.add(g);
    mk(`${name}_Cushion`, new RoundedBoxGeometry(0.46, 0.11, 0.50, 4, 0.04), mat.seat, g).position.set(0, 0.42, 0);
    const back = new THREE.Group(); back.position.set(0, 0.46, -0.24); back.rotation.x = -0.22; g.add(back);
    mk(`${name}_Back`, new RoundedBoxGeometry(0.44, 0.74, 0.10, 4, 0.04), mat.seat, back).position.set(0, 0.37, 0);
    for (const sd of [1, -1]) {
      const b = mk(`${name}_Bolster`, new RoundedBoxGeometry(0.08, 0.50, 0.17, 4, 0.035), mat.seat, back);
      b.position.set(sd * 0.215, 0.27, 0.05); b.rotation.y = sd * -0.35;
      const cb = mk(`${name}_BolsterCushion`, new RoundedBoxGeometry(0.07, 0.10, 0.48, 3, 0.03), mat.seat, g);
      cb.position.set(sd * 0.20, 0.48, 0); cb.rotation.z = sd * 0.3;
      mk('Interior_SeatStripe', new THREE.BoxGeometry(0.012, 0.66, 0.104), mat.seatAccent, back).position.set(sd * 0.09, 0.37, 0);
      mk('Interior_SeatHarnessSlot', new THREE.BoxGeometry(0.06, 0.03, 0.11), mat.interior, back).position.set(sd * 0.08, 0.6, 0);
    }
  };
  bucket('Seat_Driver', 0.37, -0.12);
  bucket('Seat_Passenger', -0.37, -0.12);
  mk('Seat_Rear_Cushion', new RoundedBoxGeometry(1.2, 0.13, 0.42, 4, 0.04), mat.seat, I).position.set(0, 0.42, -0.98);
  const rb = mk('Seat_Rear_Back', new RoundedBoxGeometry(1.2, 0.55, 0.10, 4, 0.04), mat.seat, I);
  rb.position.set(0, 0.72, -1.25); rb.rotation.x = -0.2;
}

// ---------------------------------------------------------------------
//  Roues : chaque groupe Wheel_XX contient pneu, disque, étrier et
//  plusieurs variantes de jante (Rim_Variant_<Nom>_XX) commutables.
// ---------------------------------------------------------------------
export const RIM_VARIANTS = [
  { id: 'Y5', label: 'Y 5 branches' },
  { id: 'Mono5', label: 'Monobloc 5' },
  { id: 'M10', label: '10 rayons' },
  { id: 'Turbofan', label: 'Turbofan' },
];

function buildWheel(pos, mat) {
  const left = pos.endsWith('L');
  const front = pos.startsWith('F');
  const w = new THREE.Group();
  w.name = `Wheel_${pos}`;
  w.position.set(left ? TRACK : -TRACK, WHEEL_R, front ? ZF : ZR);
  if (!left) w.scale.x = -1; // miroir : la face de jante regarde toujours vers l'extérieur

  // Pneu (profil révolutionné, axe X)
  const prof = [
    [0.212, -0.098], [0.24, -0.106], [0.272, -0.107], [0.292, -0.1], [0.3, -0.08],
    [0.302, 0], [0.3, 0.08], [0.292, 0.1], [0.272, 0.107], [0.24, 0.106], [0.212, 0.098],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const tire = new THREE.LatheGeometry(prof, 64);
  tire.rotateZ(Math.PI / 2);
  mk(`Tire_${pos}`, tire, mat.tire, w);

  // Disque + étrier
  const disc = new THREE.CylinderGeometry(0.168, 0.168, 0.026, 48);
  disc.rotateZ(Math.PI / 2);
  mk(`Brake_Disc_${pos}`, disc, mat.disc, w).position.x = -0.02;
  const cs = new THREE.Shape();
  const a0 = THREE.MathUtils.degToRad(8), a1 = THREE.MathUtils.degToRad(78);
  cs.absarc(0, 0, 0.19, a0, a1, false);
  cs.absarc(0, 0, 0.125, a1, a0, true);
  const cg = new THREE.ExtrudeGeometry(cs, { depth: 0.075, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3 });
  cg.translate(0, 0, -0.0375);
  cg.rotateY(Math.PI / 2);
  if (!front) cg.rotateX(Math.PI * 0.08);
  mk(`Caliper_${pos}`, cg, mat.caliper, w).position.x = 0.005;

  // Jantes
  for (const v of RIM_VARIANTS) {
    const g = buildRim(v.id, mat);
    g.name = `Rim_Variant_${v.id}_${pos}`;
    g.visible = v.id === 'Y5';
    w.add(g);
  }
  return w;
}

function buildRim(variant, mat) {
  const g = new THREE.Group();
  const barrel = new THREE.CylinderGeometry(0.206, 0.206, 0.19, 56, 1, true);
  barrel.rotateZ(Math.PI / 2);
  mk('Rim_Barrel', barrel, mat.rim, g);
  const lip = new THREE.TorusGeometry(0.208, 0.01, 12, 72);
  lip.rotateY(Math.PI / 2);
  mk('Rim_Lip', lip, mat.rim, g).position.x = 0.095;
  const hub = new THREE.CylinderGeometry(0.058, 0.066, 0.05, 32);
  hub.rotateZ(Math.PI / 2);
  mk('Rim_Hub', hub, mat.rim, g).position.x = 0.07;
  const cap = new THREE.CylinderGeometry(0.03, 0.03, 0.01, 32);
  cap.rotateZ(Math.PI / 2);
  mk('Caliper_Cap', cap, mat.caliper, g).position.x = 0.097;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const nut = new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8); nut.rotateZ(Math.PI / 2);
    mk('Chrome_Nut', nut, mat.chrome, g).position.set(0.09, Math.cos(a) * 0.045, Math.sin(a) * 0.045);
  }

  // Branche reliant (r0, a0) à (r1, a1) dans le plan de jante, légèrement concave
  const spoke = (a0, r0, a1, r1, width, thick, { taper = 0.75, twist = 0 } = {}) => {
    const A = new THREE.Vector3(0.058, Math.cos(a0) * r0, Math.sin(a0) * r0);
    const B = new THREE.Vector3(0.094, Math.cos(a1) * r1, Math.sin(a1) * r1);
    const len = A.distanceTo(B);
    const geo = new THREE.BoxGeometry(thick, width, len, 1, 1, 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0) p.setY(i, p.getY(i) * taper);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat.rim);
    m.name = 'Rim_Spoke'; m.castShadow = true;
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.up.set(1, 0, 0);
    m.lookAt(B);
    if (twist) m.rotateZ(twist);
    g.add(m);
  };

  const TAU = Math.PI * 2;
  if (variant === 'Y5') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      spoke(a, 0.045, a, 0.125, 0.04, 0.03, { taper: 0.9 });
      spoke(a, 0.115, a + 0.2, 0.205, 0.026, 0.026, { taper: 0.9 });
      spoke(a, 0.115, a - 0.2, 0.205, 0.026, 0.026, { taper: 0.9 });
    }
  } else if (variant === 'Mono5') {
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; spoke(a, 0.045, a, 0.205, 0.07, 0.032, { taper: 0.6 }); }
  } else if (variant === 'M10') {
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; spoke(a, 0.045, a + 0.06, 0.205, 0.024, 0.026, { taper: 0.8 }); }
  } else if (variant === 'Turbofan') {
    for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU; spoke(a, 0.075, a + 0.12, 0.2, 0.03, 0.012, { taper: 1.2, twist: 0.7 }); }
    const ring = new THREE.TorusGeometry(0.085, 0.012, 10, 48); ring.rotateY(Math.PI / 2);
    mk('Rim_Ring', ring, mat.rim, g).position.x = 0.08;
  }
  return g;
}
