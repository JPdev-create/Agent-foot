import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// =====================================================================
//  Persistance : config courante, "Mes versions", modèle .glb importé
// =====================================================================

const LS_CONFIG = 'punto.config.v1';
const LS_VERSIONS = 'punto.versions.v1';

export function loadJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
export function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
}
export const loadConfig = (fallback) => ({ ...fallback, ...loadJSON(LS_CONFIG, {}) });
export const saveConfig = (cfg) => saveJSON(LS_CONFIG, cfg);
export const loadVersions = () => loadJSON(LS_VERSIONS, []);
export const saveVersions = (v) => saveJSON(LS_VERSIONS, v);

// ---------- IndexedDB : on garde le .glb importé entre deux lancements ----
function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('punto-restomod', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function storeModel(file) {
  try {
    const db = await idb();
    await new Promise((res, rej) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').put({ blob: file, name: file.name, settings: {} }, 'model');
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  } catch (e) { console.warn('Impossible de mémoriser le modèle', e); }
}
export async function readStoredModel() {
  try {
    const db = await idb();
    return await new Promise((res) => {
      const r = db.transaction('files').objectStore('files').get('model');
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => res(null);
    });
  } catch { return null; }
}
export async function clearStoredModel() {
  try {
    const db = await idb();
    db.transaction('files', 'readwrite').objectStore('files').delete('model');
  } catch { /* rien */ }
}

// ---------- Chargement glTF / GLB ---------------------------------------
let loader;
function getLoader(renderer) {
  if (loader) return loader;
  loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('./draco/');
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

export function loadGLB(url, renderer, onProgress) {
  return new Promise((resolve, reject) => {
    getLoader(renderer).load(url, (gltf) => resolve(gltf.scene), (e) => {
      if (e.total) onProgress?.(e.loaded / e.total);
    }, reject);
  });
}

/** Vérifie si un modèle est embarqué dans l'APK (public/models/car.glb) */
export async function bundledModelUrl() {
  const url = './models/car.glb';
  try {
    const r = await fetch(url, { method: 'HEAD' });
    const type = r.headers.get('content-type') || '';
    if (r.ok && !type.includes('text/html')) return url;
  } catch { /* pas de modèle embarqué */ }
  return null;
}

export { THREE };
