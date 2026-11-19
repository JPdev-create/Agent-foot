import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// =====================================================================
//  Stage : rendu, studio, jour/nuit, post-process, caméras
// =====================================================================

const lerp = THREE.MathUtils.lerp;
const DAY = { bg: new THREE.Color('#d6d9dd'), floor: new THREE.Color('#b9bcc0') };
const NIGHT = { bg: new THREE.Color('#04060a'), floor: new THREE.Color('#0b0d11') };

export class Stage {
  constructor(container) {
    this.container = container;
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.03, 200);
    this.camera.position.set(4.8, 1.7, 5.2);

    // Environnement studio (reflets PBR) généré, aucun HDR à télécharger
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.background = DAY.bg.clone();
    this.scene.fog = new THREE.Fog(DAY.bg.clone(), 14, 38);

    this._buildStudio();
    this._buildComposer();

    // Contrôles
    const c = (this.controls = new OrbitControls(this.camera, r.domElement));
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.enablePan = false;
    c.autoRotateSpeed = 0.6;
    this.setOrbitLimits('exterior');
    c.target.set(0, 0.6, 0);
    c.addEventListener('start', () => { this.userInteracting = true; this.onUserInteract?.(); });
    c.addEventListener('end', () => { this.userInteracting = false; });

    this.night = 0;        // 0 jour -> 1 nuit (valeur animée)
    this.nightTarget = 0;
    this.tween = null;
    this.timer = new THREE.Timer();
    this.quality = 'high';

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  _buildStudio() {
    const s = this.scene;
    // Sol
    const floorMat = (this.floorMat = new THREE.MeshStandardMaterial({ color: DAY.floor.clone(), roughness: 0.55, metalness: 0.0 }));
    const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 96), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);
    // Disque "plateau tournant" discret sous la voiture
    const plate = new THREE.Mesh(new THREE.RingGeometry(3.1, 3.16, 128), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25 }));
    plate.rotation.x = -Math.PI / 2; plate.position.y = 0.002;
    this.plate = plate;
    s.add(plate);

    // Lumières jour
    this.hemi = new THREE.HemisphereLight('#ffffff', '#8a8f96', 0.6);
    s.add(this.hemi);
    const key = (this.key = new THREE.DirectionalLight('#fff6ea', 2.4));
    key.position.set(4, 8, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = key.shadow.camera.bottom = -4;
    key.shadow.camera.right = key.shadow.camera.top = 4;
    key.shadow.camera.near = 1; key.shadow.camera.far = 20;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    s.add(key);

    // Lumières nuit
    this.moon = new THREE.DirectionalLight('#7f9cff', 0);
    this.moon.position.set(-5, 6, -4);
    s.add(this.moon);

    this.headSpots = [];
    for (let i = 0; i < 2; i++) {
      const sp = new THREE.SpotLight('#eef3ff', 0, 30, 0.42, 0.55, 1.6);
      sp.castShadow = i === 0;
      sp.shadow.mapSize.set(1024, 1024);
      sp.shadow.bias = -0.0005;
      s.add(sp, sp.target);
      this.headSpots.push(sp);
    }
    // spot orienté vers l'arrière/le sol (un PointLight créait un reflet visible à travers la voiture)
    this.tailLight = new THREE.SpotLight('#ff1020', 0, 5, 1.0, 0.8, 2);
    s.add(this.tailLight, this.tailLight.target);
    this.cabinLight = new THREE.PointLight('#00c8ff', 0, 1.6, 2);
    s.add(this.cabinLight);
  }

  _buildComposer() {
    const r = this.renderer;
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.2, 0.45, 1.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  setQuality(q) {
    this.quality = q;
    const pr = q === 'high' ? Math.min(window.devicePixelRatio, 2) : Math.min(window.devicePixelRatio, 1.25);
    this.renderer.setPixelRatio(pr);
    this.key.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024);
    this.key.shadow.map?.dispose(); this.key.shadow.map = null;
    this.resize();
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    // en portrait on recule un peu pour que la voiture tienne dans l'écran
    this.camera.fov = w < h ? 50 : 38;
    // en portrait, le centre visuel est remonté au-dessus du panneau de l'atelier
    // en paysage (téléphone), le panneau est à droite : on décale le centre vers la gauche
    if (w < h) this.camera.setViewOffset(w, h, 0, h * 0.14, w, h);
    else if (h <= 560) this.camera.setViewOffset(w, h, w * 0.2, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
  }

  // -------------------------------------------------------------------
  attachCar(binder) {
    if (this.binder) { this.scene.remove(this.binder.root); this.binder.dispose(); }
    this.binder = binder;
    this.scene.add(binder.root);
    const a = binder.lightAnchors;
    [a.headL, a.headR].forEach((p, i) => {
      const sp = this.headSpots[i];
      sp.position.copy(p).add(new THREE.Vector3(0, 0, 0.05));
      sp.target.position.set(p.x * 1.8, 0, p.z + 6);
    });
    this.tailLight.position.copy(a.tail).add(new THREE.Vector3(0, -0.05, -0.08));
    this.tailLight.target.position.set(0, 0, a.tail.z - 2.5);
    this.cabinLight.position.copy(a.cabin);
  }

  // -------------------------------------------------------------------
  //  Caméras
  // -------------------------------------------------------------------
  setOrbitLimits(mode) {
    const c = this.controls;
    c.rotateSpeed = 0.8;
    c.enableZoom = true;
    if (mode === 'exterior') {
      c.minDistance = 2.6; c.maxDistance = Math.max(12, this.fitDistance() * 1.4);
      c.minPolarAngle = 0.15; c.maxPolarAngle = Math.PI / 2 - 0.04;
    } else if (mode === 'detail') {
      c.minDistance = 0.35; c.maxDistance = 6;
      c.minPolarAngle = 0.1; c.maxPolarAngle = Math.PI / 2 + 0.2;
    } else if (mode === 'interior') {
      // caméra "tête" : on orbite sur un rayon minuscule = regarder autour de soi
      c.minDistance = c.maxDistance = 0.06;
      c.enableZoom = false;
      c.minPolarAngle = 0.35; c.maxPolarAngle = 2.5;
      c.rotateSpeed = -0.35; // le décor suit le doigt
    }
  }

  /** Transition douce vers (position, cible) */
  flyTo(pos, target, mode, duration = 0.9) {
    this.controls.autoRotate = false;
    this.controls.enabled = false;
    // On relâche les limites pendant le vol, on les applique à l'arrivée
    const c = this.controls;
    c.minDistance = 0; c.maxDistance = Infinity; c.minPolarAngle = 0; c.maxPolarAngle = Math.PI;
    this.tween = {
      t: 0, d: duration, mode,
      p0: this.camera.position.clone(), p1: pos.clone(),
      t0: c.target.clone(), t1: target.clone(),
    };
  }

  /** distance pour que la voiture tienne en largeur, quel que soit le format d'écran */
  fitDistance(width = 4.7, min = 5.6) {
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const landscapePhone = this.camera.aspect > 1 && this.container.clientHeight <= 560;
    const aspect = this.camera.aspect * (landscapePhone ? 0.6 : 1); // zone visible hors panneau
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    return Math.max(min, (width / 2) / Math.tan(hfov / 2));
  }

  viewExterior() {
    const d = this.fitDistance();
    const ty = 0.45;
    this.flyTo(new THREE.Vector3(d * 0.66, 1.5 + d * 0.07, d * 0.75), new THREE.Vector3(0, ty, 0), 'exterior');
  }

  viewInterior(which = 'driver') {
    const b = this.binder;
    const anchor = which === 'driver' ? b.parts.camDriver : b.parts.camPassenger;
    const eye = anchor.getWorldPosition(new THREE.Vector3());
    // regarde vers l'avant (+Z) ; la cible est à 6 cm devant les yeux
    const target = eye.clone().add(new THREE.Vector3(which === 'driver' ? -0.004 : 0.004, -0.02, 0.06));
    this.flyTo(eye, target, 'interior', 1.1);
  }

  viewDetail(kind) {
    const b = this.binder;
    const wb = b.bounds;
    let target, pos, width = 1.2;
    if (kind === 'wheel') {
      width = 0.95;
      const w = b.parts.wheelGroups.FL || b.parts.wheelGroups.FR;
      target = w ? w.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0.75, 0.3, 1.16);
      pos = target.clone().add(new THREE.Vector3(Math.sign(target.x || 1) * 1.25, 0.15, 0.55));
    } else if (kind === 'rear') {
      width = 2.2;
      target = new THREE.Vector3(0, 0.35, wb.box.min.z + 0.1);
      pos = new THREE.Vector3(1.5, 0.75, wb.box.min.z - 2.4);
    } else if (kind === 'front') {
      width = 1.1;
      target = new THREE.Vector3(wb.size.x * 0.28, 0.65, wb.box.max.z - 0.05);
      pos = target.clone().add(new THREE.Vector3(1.1, 0.25, 1.2));
    } else if (kind === 'spoiler') {
      width = 1.8;
      target = new THREE.Vector3(0, wb.box.max.y - 0.05, wb.box.min.z + 0.5);
      pos = new THREE.Vector3(1.3, wb.box.max.y + 0.75, wb.box.min.z - 1.2);
    }
    // distance adaptée à la taille de la pièce et au format de l'écran
    const dir = pos.clone().sub(target).normalize();
    pos = target.clone().addScaledVector(dir, this.fitDistance(width, 1.0));
    this.flyTo(pos, target, 'detail');
  }

  // -------------------------------------------------------------------
  setNight(on) { this.nightTarget = on ? 1 : 0; }

  /** Appelé chaque frame pour mélanger jour/nuit */
  _applyLighting(state, mat, screens) {
    const n = this.night;
    const s = this.scene;
    s.environmentIntensity = lerp(1.0, 0.14, n);
    s.background.copy(DAY.bg).lerp(NIGHT.bg, n);
    s.fog.color.copy(s.background);
    this.floorMat.color.copy(DAY.floor).lerp(NIGHT.floor, n);
    this.floorMat.roughness = lerp(0.55, 0.22, n);
    this.floorMat.metalness = lerp(0.0, 0.35, n);
    this.plate.material.opacity = lerp(0.25, 0.06, n);
    this.key.intensity = lerp(2.4, 0.0, n);
    this.hemi.intensity = lerp(0.6, 0.04, n);
    this.moon.intensity = lerp(0, 0.9, n);

    const headOn = state.headlights || n > 0.5 ? 1 : 0;
    const headPow = lerp(headOn ? 1.6 : 0.25, 4, n);
    mat.headlight.emissiveIntensity = headPow;
    mat.drl.emissiveIntensity = state.drl ? lerp(3.2, 6, n) : 0.05;
    mat.taillight.emissiveIntensity = lerp(state.headlights ? 2 : 0.7, 6, n);
    mat.lightHousing.color.set(state.smokedLights ? '#0b0c0e' : '#5a6068');
    this.headSpots.forEach((sp) => { sp.intensity = (headOn ? lerp(0, 900, n) : 0); });
    this.tailLight.intensity = lerp(0, 3, n);

    const amb = state.ambientIntensity;
    mat.ambient.emissive.set(state.ambientColor);
    mat.ambient.emissiveIntensity = lerp(1.6, 4.2, n) * amb;
    this.cabinLight.color.set(state.ambientColor);
    this.cabinLight.intensity = lerp(0.05, 0.9, n) * amb;
    screens.cluster.material.emissiveIntensity = state.screensOn ? lerp(1.0, 0.75, n) : 0;
    screens.center.material.emissiveIntensity = state.screensOn ? lerp(1.0, 0.75, n) : 0;

    this.bloom.strength = lerp(0.06, 1.0, n);
    this.bloom.radius = lerp(0.2, 0.6, n);
    this.bloom.threshold = lerp(2.5, 0.6, n);
    this.renderer.toneMappingExposure = lerp(1.0, 1.15, n);
  }

  frame(state, mat, screens) {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    // jour/nuit
    const k = 1 - Math.exp(-dt * 3.2);
    this.night += (this.nightTarget - this.night) * k;
    if (Math.abs(this.nightTarget - this.night) < 0.001) this.night = this.nightTarget;
    this._applyLighting(state, mat, screens);

    // vol de caméra
    if (this.tween) {
      const tw = this.tween;
      tw.t += dt;
      const x = Math.min(tw.t / tw.d, 1);
      const e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      this.camera.position.lerpVectors(tw.p0, tw.p1, e);
      this.controls.target.lerpVectors(tw.t0, tw.t1, e);
      if (x >= 1) {
        this.tween = null;
        this.setOrbitLimits(tw.mode);
        this.controls.enabled = true;
        this.controls.autoRotate = tw.mode === 'exterior' && state.autoRotate;
      }
    }
    this.controls.update();
    screens.update(dt);
    this.composer.render(dt);
    return dt;
  }
}
