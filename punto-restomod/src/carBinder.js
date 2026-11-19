import * as THREE from 'three';
import { roleOf, rimVariantOf, wheelPosOf, carbonPartOf, WHEEL_POSITIONS } from './nomenclature.js';

// =====================================================================
//  CarBinder : analyse un modèle (placeholder OU .glb Blender) d'après
//  la nomenclature et expose une API unique pour l'atelier.
// =====================================================================

const TARGET_LENGTH = 4.065; // longueur réelle Punto Evo (m)

export class CarBinder {
  /**
   * @param {THREE.Object3D} model  racine du modèle
   * @param {object} mat            bibliothèque de matériaux (materials.js)
   * @param {object} screens        DigitalScreens
   * @param {object} opts           { normalize, rotationY, keepOriginal }
   */
  constructor(model, mat, screens, opts = {}) {
    this.mat = mat;
    this.screens = screens;
    this.report = { found: {}, missing: [], warnings: [] };

    this.root = new THREE.Group();
    this.root.name = 'CarRoot';
    this.body = new THREE.Group();  // suit la hauteur de caisse
    this.body.name = 'CarBody';
    this.wheels = new THREE.Group();
    this.wheels.name = 'CarWheels';
    this.root.add(this.body, this.wheels);
    this.body.add(model);

    if (opts.normalize) this._normalize(model, opts.rotationY || 0);
    this.root.updateMatrixWorld(true);

    this.parts = {
      paint: [], carbon: {}, glass: [], headlights: [], drl: [], taillights: [], housings: [],
      rims: [], rimVariants: {}, calipers: [], tires: [], ambient: [], seats: [], screens: [],
      wheelGroups: {}, camDriver: null, camPassenger: null,
    };
    this._scan(model, opts.keepOriginal);
    this._groupWheels(model);
    this._estimateMissing(model);
    this._buildReport();
  }

  // -------------------------------------------------------------------
  _normalize(model, rotY) {
    model.rotation.y = rotY;
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const len = Math.max(size.x, size.z);
    if (len > 0) model.scale.multiplyScalar(TARGET_LENGTH / len);
    model.updateMatrixWorld(true);
    box.setFromObject(model);
    const c = box.getCenter(new THREE.Vector3());
    model.position.x -= c.x;
    model.position.z -= c.z;
    model.position.y -= box.min.y;
    model.updateMatrixWorld(true);
  }

  _scan(model, keepOriginal) {
    const P = this.parts, M = this.mat;
    model.traverse((o) => {
      const role = roleOf(o.name);
      if (!role) return;
      this.report.found[role] = (this.report.found[role] || 0) + 1;

      if (role === 'CAM_DRIVER') { P.camDriver = o; return; }
      if (role === 'CAM_PASSENGER') { P.camPassenger = o; return; }
      if (role === 'WHEEL') { const pos = wheelPosOf(o.name); if (pos && !P.wheelGroups[pos]) P.wheelGroups[pos] = o; return; }

      const meshes = [];
      o.traverse((c) => { if (c.isMesh) meshes.push(c); });
      if (!meshes.length) {
        // un groupe "Rim_Variant_X_FL" ou "Carbon_Diffuser" sans mesh direct : rien à peindre
        if (role === 'RIM') this._registerRimVariant(o);
        if (role === 'CARBON') this._registerCarbon(o);
        return;
      }
      const setMat = (m) => meshes.forEach((x) => { if (roleOf(x.name) === null || x === o || roleOf(x.name) === role) x.material = m; });

      switch (role) {
        case 'BODY_PAINT': setMat(M.paint); P.paint.push(...meshes); break;
        case 'CARBON': setMat(M.carbon); this._registerCarbon(o); break;
        case 'GLASS': setMat(M.glass); P.glass.push(...meshes); meshes.forEach((m) => { m.renderOrder = 2; m.castShadow = false; }); break;
        case 'HEADLIGHT_LED': setMat(M.headlight); P.headlights.push(...meshes); break;
        case 'DRL_LED': setMat(M.drl); P.drl.push(...meshes); break;
        case 'TAILLIGHT_LED': setMat(M.taillight); P.taillights.push(...meshes); break;
        case 'LIGHT_HOUSING': if (!keepOriginal) setMat(M.lightHousing); P.housings.push(...meshes); break;
        case 'RIM': setMat(M.rim); P.rims.push(...meshes); this._registerRimVariant(o); break;
        case 'CALIPER': setMat(M.caliper); P.calipers.push(...meshes); break;
        case 'TIRE': if (!keepOriginal) setMat(M.tire); P.tires.push(...meshes); break;
        case 'BRAKE_DISC': if (!keepOriginal) setMat(M.disc); break;
        case 'AMBIENT_LED': setMat(M.ambient); P.ambient.push(...meshes); break;
        case 'SCREEN_CLUSTER': setMat(this.screens.cluster.material); P.screens.push(...meshes); break;
        case 'SCREEN_CENTER': setMat(this.screens.center.material); P.screens.push(...meshes); break;
        case 'SEAT': setMat(M.seat); P.seats.push(...meshes); break;
        case 'BODY_TRIM': if (!keepOriginal) setMat(M.trim); break;
        case 'CHROME': if (!keepOriginal) setMat(M.chrome); break;
        default: break; // INTERIOR : garde son matériau d'origine
      }
    });
    model.traverse((o) => {
      if (o.isMesh) {
        if (o.castShadow === false && o.receiveShadow === false && !P.glass.includes(o)) { o.castShadow = true; o.receiveShadow = true; }
        if (o.material && o.material.map) o.material.map.anisotropy = 8;
      }
    });
  }

  _registerCarbon(o) {
    const id = carbonPartOf(o.name);
    if (!id) return;
    (this.parts.carbon[id] ||= new Set()).add(o);
  }

  _registerRimVariant(o) {
    const v = rimVariantOf(o.name);
    if (!v) return;
    (this.parts.rimVariants[v] ||= new Set()).add(o);
  }

  _groupWheels(model) {
    const P = this.parts;
    // Si pas de groupes Wheel_XX, on en fabrique à partir des pièces suffixées _FL/_FR/...
    for (const pos of WHEEL_POSITIONS) {
      if (P.wheelGroups[pos]) continue;
      const loose = [];
      model.traverse((o) => {
        const r = roleOf(o.name);
        if ((r === 'RIM' || r === 'TIRE' || r === 'CALIPER' || r === 'BRAKE_DISC') && wheelPosOf(o.name) === pos) {
          // on ne garde que le plus haut ancêtre "roue" pour éviter les doublons
          let p = o.parent, nested = false;
          while (p && p !== model) { if (loose.includes(p)) nested = true; p = p.parent; }
          if (!nested) loose.push(o);
        }
      });
      if (loose.length) {
        const g = new THREE.Group(); g.name = `Wheel_${pos}`;
        const c = new THREE.Box3();
        loose.forEach((o) => c.expandByObject(o));
        c.getCenter(g.position);
        model.add(g);
        g.updateMatrixWorld(true);
        loose.forEach((o) => g.attach(o));
        P.wheelGroups[pos] = g;
      }
    }
    // Les roues ne suivent pas la hauteur de caisse
    for (const g of Object.values(P.wheelGroups)) this.wheels.attach(g);
  }

  _estimateMissing(model) {
    const P = this.parts;
    const box = new THREE.Box3().setFromObject(this.body);
    const size = box.getSize(new THREE.Vector3());
    const ctr = box.getCenter(new THREE.Vector3());
    this.bounds = { box, size, center: ctr };
    if (!P.camDriver) {
      P.camDriver = new THREE.Object3D(); P.camDriver.name = 'Cam_Driver(auto)';
      P.camDriver.position.set(ctr.x + size.x * 0.22, box.min.y + size.y * 0.75, ctr.z - size.z * 0.09);
      this.body.add(P.camDriver);
    }
    if (!P.camPassenger) {
      P.camPassenger = new THREE.Object3D(); P.camPassenger.name = 'Cam_Passenger(auto)';
      P.camPassenger.position.set(ctr.x - size.x * 0.22, box.min.y + size.y * 0.75, ctr.z - size.z * 0.09);
      this.body.add(P.camPassenger);
    }
    this.root.updateMatrixWorld(true);
    // positions des projecteurs (pour les SpotLights de nuit)
    const avg = (meshes, sign) => {
      const v = new THREE.Vector3(), t = new THREE.Vector3(); let n = 0;
      meshes.forEach((m) => { m.getWorldPosition(t); if (Math.sign(t.x || 1) === sign) { v.add(t); n++; } });
      return n ? v.divideScalar(n) : null;
    };
    const fz = box.max.z, rz = box.min.z;
    this.lightAnchors = {
      headL: avg([...P.headlights, ...P.drl], 1) || new THREE.Vector3(size.x * 0.3, size.y * 0.48, fz),
      headR: avg([...P.headlights, ...P.drl], -1) || new THREE.Vector3(-size.x * 0.3, size.y * 0.48, fz),
      tail: avg(P.taillights, 1) ? new THREE.Vector3(0, avg(P.taillights, 1).y, rz) : new THREE.Vector3(0, size.y * 0.6, rz),
      cabin: new THREE.Vector3(ctr.x, box.min.y + size.y * 0.62, ctr.z),
    };
  }

  _buildReport() {
    const need = ['BODY_PAINT', 'GLASS', 'RIM', 'TIRE', 'HEADLIGHT_LED', 'TAILLIGHT_LED', 'AMBIENT_LED', 'SEAT'];
    this.report.missing = need.filter((r) => !this.report.found[r]);
    const wheels = Object.keys(this.parts.wheelGroups);
    if (wheels.length < 4) this.report.warnings.push(`Roues détectées : ${wheels.join(', ') || 'aucune'} (attendu : FL, FR, RL, RR)`);
  }

  // ===================================================================
  //  API utilisée par l'atelier
  // ===================================================================
  get carbonIds() { return Object.keys(this.parts.carbon); }
  get rimVariantIds() { return Object.keys(this.parts.rimVariants); }

  setCarbonVisible(id, visible) {
    this.parts.carbon[id]?.forEach((o) => { o.visible = visible; });
  }

  setCarbonUsesPaint(usePaint) {
    for (const set of Object.values(this.parts.carbon)) {
      set.forEach((o) => o.traverse((c) => { if (c.isMesh) c.material = usePaint ? this.mat.paint : this.mat.carbon; }));
    }
  }

  setRimVariant(id) {
    const ids = this.rimVariantIds;
    if (!ids.length) return;
    const pick = ids.includes(id) ? id : ids[0];
    for (const [v, set] of Object.entries(this.parts.rimVariants)) set.forEach((o) => { o.visible = v === pick; });
  }

  setRideHeight(offset) { this.body.position.y = offset; }

  dispose() {
    this.root.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose();
        const own = (m) => m && !Object.values(this.mat).includes(m) && m !== this.screens.cluster.material && m !== this.screens.center.material;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (own(m)) m.dispose(); });
      }
    });
  }
}
