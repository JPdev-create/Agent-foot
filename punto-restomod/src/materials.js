import * as THREE from 'three';

// =====================================================================
//  Matériaux PBR + textures procédurales (aucun fichier à télécharger)
// =====================================================================

function canvasTex(size, draw, { srgb = true, repeat = 1 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- Carbone tressé (sergé 2x2) -----------------------------
function twillCarbon() {
  const cells = 16;
  const drawCell = (g, s, height) => {
    const cs = s / cells;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const horizontal = ((x + y) >> 1) % 2 === 0; // motif sergé
        const px = x * cs, py = y * cs;
        const grad = horizontal
          ? g.createLinearGradient(px, py, px, py + cs)
          : g.createLinearGradient(px, py, px + cs, py);
        if (height) {
          grad.addColorStop(0, '#202020'); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, '#202020');
        } else {
          grad.addColorStop(0, '#0a0a0b');
          grad.addColorStop(0.5, horizontal ? '#3a3b3e' : '#26272a');
          grad.addColorStop(1, '#0a0a0b');
        }
        g.fillStyle = grad;
        g.fillRect(px, py, cs, cs);
        // fibres
        g.strokeStyle = height ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.035)';
        g.lineWidth = 1;
        for (let i = 1; i < 6; i++) {
          g.beginPath();
          if (horizontal) { g.moveTo(px, py + (cs * i) / 6); g.lineTo(px + cs, py + (cs * i) / 6); }
          else { g.moveTo(px + (cs * i) / 6, py); g.lineTo(px + (cs * i) / 6, py + cs); }
          g.stroke();
        }
      }
    }
  };
  return {
    map: canvasTex(512, (g, s) => drawCell(g, s, false), { repeat: 3 }),
    bump: canvasTex(512, (g, s) => drawCell(g, s, true), { srgb: false, repeat: 3 }),
  };
}

// ---------- Carbone forgé (copeaux aléatoires) ----------------------
function forgedCarbon() {
  const rnd = mulberry(7);
  const chips = [];
  for (let i = 0; i < 900; i++) {
    chips.push({ x: rnd(), y: rnd(), w: 0.02 + rnd() * 0.07, h: 0.01 + rnd() * 0.03, a: rnd() * Math.PI, l: rnd() });
  }
  const draw = (height) => (g, s) => {
    g.fillStyle = height ? '#555' : '#0b0b0c';
    g.fillRect(0, 0, s, s);
    for (const c of chips) {
      for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
        g.save();
        g.translate(c.x * s + ox, c.y * s + oy);
        g.rotate(c.a);
        const v = Math.floor(height ? 80 + c.l * 175 : 14 + c.l * 52);
        g.fillStyle = `rgb(${v},${v},${v + (height ? 0 : 3)})`;
        g.beginPath();
        g.ellipse(0, 0, c.w * s * 0.5, c.h * s * 0.5, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    }
  };
  return {
    map: canvasTex(1024, draw(false), { repeat: 1.5 }),
    bump: canvasTex(1024, draw(true), { srgb: false, repeat: 1.5 }),
  };
}

// ---------- Alcantara / cuir ----------------------------------------
function noiseTex(base, amp, size = 256, repeat = 4) {
  const rnd = mulberry(3);
  return canvasTex(size, (g, s) => {
    const img = g.createImageData(s, s);
    for (let i = 0; i < s * s; i++) {
      const n = (rnd() - 0.5) * amp;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = base + n;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { srgb: false, repeat });
}

// ---------- Paillettes peinture métallisée --------------------------
function flakeNormal() {
  const rnd = mulberry(11);
  return canvasTex(256, (g, s) => {
    const img = g.createImageData(s, s);
    for (let i = 0; i < s * s; i++) {
      img.data[i * 4] = 128 + (rnd() - 0.5) * 70;
      img.data[i * 4 + 1] = 128 + (rnd() - 0.5) * 70;
      img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { srgb: false, repeat: 30 });
}

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// =====================================================================
//  Bibliothèque
// =====================================================================
export const PAINT_FINISHES = {
  brillant:  { label: 'Brillant',   metalness: 0.05, roughness: 0.22, clearcoat: 1.0, clearcoatRoughness: 0.03, flakes: false },
  metallise: { label: 'Métallisé',  metalness: 0.75, roughness: 0.32, clearcoat: 1.0, clearcoatRoughness: 0.04, flakes: true },
  satine:    { label: 'Satiné',     metalness: 0.35, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.35, flakes: false },
  mat:       { label: 'Mat',        metalness: 0.15, roughness: 0.78, clearcoat: 0.0, clearcoatRoughness: 1.0, flakes: false },
};

export const PAINT_COLORS = [
  { id: 'rosso',  label: 'Rosso Abarth',     hex: '#b3121b' },
  { id: 'bianco', label: 'Bianco Gara',      hex: '#e9e9e6' },
  { id: 'nero',   label: 'Nero Scorpione',   hex: '#0d0d0f' },
  { id: 'grigio', label: 'Grigio Campovolo', hex: '#6b7076' },
  { id: 'nardo',  label: 'Gris Nardo',       hex: '#8d9093' },
  { id: 'blu',    label: 'Blu Podio',        hex: '#1b3d8f' },
  { id: 'verde',  label: 'Verde Monza',      hex: '#1f4d3a' },
  { id: 'giallo', label: 'Giallo Modena',    hex: '#e6b400' },
  { id: 'arancio',label: 'Arancio Racing',   hex: '#e35205' },
];

export const RIM_FINISHES = {
  noir_brillant: { label: 'Noir brillant', color: '#0b0b0c', metalness: 0.4, roughness: 0.12, clearcoat: 1 },
  noir_satine:   { label: 'Noir satiné',   color: '#121214', metalness: 0.3, roughness: 0.48, clearcoat: 0.2 },
  gunmetal:      { label: 'Gunmetal',      color: '#3a3d42', metalness: 0.9, roughness: 0.3,  clearcoat: 0.6 },
  bronze:        { label: 'Bronze',        color: '#6b5232', metalness: 0.95, roughness: 0.28, clearcoat: 0.6 },
  argent:        { label: 'Argent',        color: '#c9cbce', metalness: 1.0, roughness: 0.18, clearcoat: 0.6 },
};

export const CALIPER_COLORS = [
  { id: 'rouge', label: 'Rouge', hex: '#c8102e' },
  { id: 'jaune', label: 'Jaune', hex: '#f2c200' },
  { id: 'bleu',  label: 'Bleu',  hex: '#1450c8' },
  { id: 'noir',  label: 'Noir',  hex: '#151515' },
];

export const SEAT_MATERIALS = {
  alcantara: { label: 'Alcantara', color: '#1b1b1d', roughness: 1.0, sheen: 1, bumpScale: 0.6 },
  cuir:      { label: 'Cuir nappa', color: '#141414', roughness: 0.45, sheen: 0, bumpScale: 0.25 },
  cuir_rouge:{ label: 'Cuir rouge', color: '#6e0b10', roughness: 0.45, sheen: 0, bumpScale: 0.25 },
};

export function createMaterials() {
  const twill = twillCarbon();
  const forged = forgedCarbon();
  const flakes = flakeNormal();
  const fabric = noiseTex(128, 90, 256, 6);
  const leather = noiseTex(128, 40, 256, 10);

  const m = {};

  m.paint = new THREE.MeshPhysicalMaterial({ color: PAINT_COLORS[0].hex, side: THREE.DoubleSide });
  m.paint.userData.flakes = flakes;

  m.carbon = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0.25, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.02,
    map: twill.map, bumpMap: twill.bump, bumpScale: 0.6,
  });
  m.carbon.userData.patterns = { tresse: twill, forge: forged };

  m.trim = new THREE.MeshStandardMaterial({ color: '#0e0e10', roughness: 0.6, metalness: 0.1 });
  m.chrome = new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.05, metalness: 1 });
  m.glass = new THREE.MeshPhysicalMaterial({
    color: '#0c0f12', metalness: 0, roughness: 0.02, transparent: true, opacity: 0.38,
    clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
  });
  m.lightHousing = new THREE.MeshPhysicalMaterial({
    color: '#111316', metalness: 0.6, roughness: 0.15, clearcoat: 1,
  });

  m.tire = new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.92, metalness: 0 });
  m.rim = new THREE.MeshPhysicalMaterial({ color: '#0b0b0c' });
  m.caliper = new THREE.MeshPhysicalMaterial({ color: CALIPER_COLORS[0].hex, roughness: 0.3, metalness: 0.1, clearcoat: 1 });
  m.disc = new THREE.MeshStandardMaterial({ color: '#7d7f82', roughness: 0.35, metalness: 1 });

  // Éclairages (émissifs — l'intensité est pilotée par le mode jour/nuit)
  m.headlight = new THREE.MeshStandardMaterial({ color: '#dfe8ff', emissive: '#e8f0ff', emissiveIntensity: 0.4, roughness: 0.1 });
  m.drl = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 2, roughness: 0.2 });
  m.taillight = new THREE.MeshStandardMaterial({ color: '#3a0306', emissive: '#ff0a1a', emissiveIntensity: 0.6, roughness: 0.2 });
  m.ambient = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#00c8ff', emissiveIntensity: 2, toneMapped: true });

  m.seat = new THREE.MeshPhysicalMaterial({ color: '#1b1b1d', roughness: 1, bumpMap: fabric, bumpScale: 0.6, sheen: 1, sheenColor: '#555', sheenRoughness: 0.8 });
  m.seat.userData.textures = { alcantara: fabric, cuir: leather, cuir_rouge: leather };
  m.seatAccent = new THREE.MeshStandardMaterial({ color: '#c8102e', roughness: 0.5 });

  m.interior = new THREE.MeshStandardMaterial({ color: '#16161a', roughness: 0.75, metalness: 0.05 });
  m.interiorSoft = new THREE.MeshStandardMaterial({ color: '#232327', roughness: 0.9 });
  m.interiorAlu = new THREE.MeshStandardMaterial({ color: '#8a8d92', roughness: 0.3, metalness: 1 });
  m.piano = new THREE.MeshPhysicalMaterial({ color: '#050505', roughness: 0.05, clearcoat: 1 });

  return m;
}

export function applyPaint(mat, colorHex, finishId) {
  const f = PAINT_FINISHES[finishId] || PAINT_FINISHES.brillant;
  mat.color.set(colorHex);
  mat.metalness = f.metalness;
  mat.roughness = f.roughness;
  mat.clearcoat = f.clearcoat;
  mat.clearcoatRoughness = f.clearcoatRoughness;
  mat.normalMap = f.flakes ? mat.userData.flakes : null;
  mat.normalScale = new THREE.Vector2(0.15, 0.15);
  mat.needsUpdate = true;
}

export function applyCarbonPattern(mat, pattern) {
  const p = mat.userData.patterns[pattern] || mat.userData.patterns.tresse;
  mat.map = p.map;
  mat.bumpMap = p.bump;
  mat.bumpScale = pattern === 'forge' ? 0.9 : 0.6;
  mat.roughness = pattern === 'forge' ? 0.3 : 0.38;
  mat.needsUpdate = true;
}

export function applyRimFinish(mat, finishId) {
  const f = RIM_FINISHES[finishId] || RIM_FINISHES.noir_brillant;
  mat.color.set(f.color);
  mat.metalness = f.metalness;
  mat.roughness = f.roughness;
  mat.clearcoat = f.clearcoat;
  mat.clearcoatRoughness = 0.05;
  mat.needsUpdate = true;
}

export function applySeat(mat, id) {
  const s = SEAT_MATERIALS[id] || SEAT_MATERIALS.alcantara;
  mat.color.set(s.color);
  mat.roughness = s.roughness;
  mat.sheen = s.sheen;
  mat.bumpMap = mat.userData.textures[id];
  mat.bumpScale = s.bumpScale;
  mat.needsUpdate = true;
}
