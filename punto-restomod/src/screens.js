import * as THREE from 'three';

// =====================================================================
//  Écrans numériques animés (compteur + écran central) dessinés en canvas
//  et appliqués comme texture émissive sur Screen_Cluster / Screen_Center.
// =====================================================================

export class DigitalScreens {
  constructor() {
    this.accent = '#00c8ff';
    this.cluster = this._make(1024, 384);
    this.center = this._make(1024, 384);
    this.t = 0;
    this.speed = 0;
    this._last = 0;
    this.draw(0);
  }

  _make(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const material = new THREE.MeshStandardMaterial({
      color: '#000', emissive: '#fff', emissiveMap: tex, emissiveIntensity: 1.0,
      roughness: 0.08, metalness: 0, map: null,
    });
    return { canvas, ctx: canvas.getContext('2d'), tex, material };
  }

  setAccent(hex) { this.accent = hex; this.draw(this.t, true); }

  update(dt) {
    this.t += dt;
    if (this.t - this._last < 1 / 20) return; // 20 fps suffisent
    this._last = this.t;
    this.draw(this.t);
  }

  draw(t) {
    this.speed = 62 + Math.sin(t * 0.6) * 38 + Math.sin(t * 1.7) * 6;
    this._drawCluster(t);
    this._drawCenter(t);
    this.cluster.tex.needsUpdate = true;
    this.center.tex.needsUpdate = true;
  }

  _bg(g, w, h) {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#05070b');
    grd.addColorStop(1, '#0b1018');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }

  _drawCluster(t) {
    const { ctx: g, canvas } = this.cluster;
    const w = canvas.width, h = canvas.height, a = this.accent;
    this._bg(g, w, h);
    const rpm = 1500 + (this.speed / 100) * 4800 + Math.sin(t * 3) * 200;

    // Jauge compte-tours (gauche)
    const gauge = (cx, val, max, label, unit, redline) => {
      const r = 150;
      const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
      g.lineCap = 'round';
      g.lineWidth = 14;
      g.strokeStyle = '#1a2230';
      g.beginPath(); g.arc(cx, h / 2 + 20, r, a0, a1); g.stroke();
      const av = a0 + (a1 - a0) * Math.min(val / max, 1);
      const grd = g.createLinearGradient(cx - r, 0, cx + r, 0);
      grd.addColorStop(0, a); grd.addColorStop(1, '#ffffff');
      g.strokeStyle = grd;
      g.shadowColor = a; g.shadowBlur = 24;
      g.beginPath(); g.arc(cx, h / 2 + 20, r, a0, av); g.stroke();
      g.shadowBlur = 0;
      if (redline) {
        g.strokeStyle = '#ff2a3a'; g.lineWidth = 6;
        g.beginPath(); g.arc(cx, h / 2 + 20, r + 16, a0 + (a1 - a0) * redline, a1); g.stroke();
      }
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.font = '600 78px system-ui, sans-serif';
      g.fillText(Math.round(label), cx, h / 2 + 40);
      g.fillStyle = '#8a97a8';
      g.font = '500 24px system-ui, sans-serif';
      g.fillText(unit, cx, h / 2 + 76);
    };
    gauge(200, rpm, 7000, rpm / 1000 * 1000 | 0, 'tr/min', 0.86);
    gauge(w - 200, this.speed, 260, this.speed, 'km/h');

    // Centre : rapport + mode
    g.textAlign = 'center';
    g.fillStyle = a;
    g.font = '700 120px system-ui, sans-serif';
    g.shadowColor = a; g.shadowBlur = 30;
    g.fillText(String(Math.min(6, 2 + Math.floor(this.speed / 30))), w / 2, h / 2 + 30);
    g.shadowBlur = 0;
    g.font = '600 26px system-ui, sans-serif';
    g.fillStyle = '#ff2a3a';
    g.fillText('SPORT', w / 2, h / 2 + 80);
    g.fillStyle = '#8a97a8';
    g.font = '500 22px system-ui, sans-serif';
    g.fillText('ABARTH  •  1.4 T-JET', w / 2, 52);
    // Barre températures / boost
    const boost = 0.4 + 0.5 * (this.speed / 100);
    g.fillStyle = '#1a2230'; g.fillRect(w / 2 - 110, h - 70, 220, 10);
    g.fillStyle = a; g.fillRect(w / 2 - 110, h - 70, 220 * Math.min(boost, 1), 10);
    g.fillStyle = '#8a97a8'; g.font = '500 18px system-ui, sans-serif';
    g.fillText('TURBO ' + (boost * 1.3).toFixed(1) + ' bar', w / 2, h - 30);
  }

  _drawCenter(t) {
    const { ctx: g, canvas } = this.center;
    const w = canvas.width, h = canvas.height, a = this.accent;
    this._bg(g, w, h);
    // "Carte" stylisée
    g.save();
    g.beginPath(); g.rect(20, 20, w * 0.62, h - 40); g.clip();
    g.fillStyle = '#0d1420'; g.fillRect(20, 20, w * 0.62, h - 40);
    g.strokeStyle = '#1c2a3d'; g.lineWidth = 3;
    for (let i = -5; i < 14; i++) {
      g.beginPath(); g.moveTo(20 + i * 60 + ((t * 20) % 60), 20); g.lineTo(20 + i * 60 - 140 + ((t * 20) % 60), h); g.stroke();
      g.beginPath(); g.moveTo(20, 40 + i * 50); g.lineTo(w * 0.62 + 20, 70 + i * 50); g.stroke();
    }
    g.strokeStyle = a; g.lineWidth = 10; g.lineCap = 'round';
    g.shadowColor = a; g.shadowBlur = 18;
    g.beginPath(); g.moveTo(330, h - 20); g.bezierCurveTo(320, 220, 460, 200, 470, 60); g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(330, h - 70); g.lineTo(312, h - 30); g.lineTo(348, h - 30); g.fill();
    g.restore();
    // Panneau média / clim
    const x0 = w * 0.62 + 40;
    g.fillStyle = '#121a26'; this._round(g, x0, 20, w - x0 - 20, 160, 18); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = '600 30px system-ui, sans-serif';
    g.fillText('Night Drive', x0 + 24, 70);
    g.fillStyle = '#8a97a8'; g.font = '500 22px system-ui, sans-serif';
    g.fillText('Synthwave Radio', x0 + 24, 104);
    g.fillStyle = '#1a2230'; g.fillRect(x0 + 24, 135, w - x0 - 68, 6);
    g.fillStyle = a; g.fillRect(x0 + 24, 135, (w - x0 - 68) * ((t * 0.02) % 1), 6);
    g.fillStyle = '#121a26'; this._round(g, x0, 200, w - x0 - 20, 164, 18); g.fill();
    g.fillStyle = a; g.font = '700 54px system-ui, sans-serif';
    g.fillText('21.0°', x0 + 24, 280);
    g.fillStyle = '#8a97a8'; g.font = '500 22px system-ui, sans-serif';
    g.fillText('AMBIANCE  ●', x0 + 24, 330);
    g.fillStyle = a; g.beginPath(); g.arc(w - 70, 316, 14, 0, Math.PI * 2); g.fill();
  }

  _round(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
}
