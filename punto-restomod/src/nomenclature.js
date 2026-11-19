// =====================================================================
//  NOMENCLATURE — le contrat entre le modèle Blender et l'application
// ---------------------------------------------------------------------
//  Chaque objet du fichier .glb est reconnu par le DÉBUT de son nom
//  (insensible à la casse). Ex : "Body_Paint", "Body_Paint.001",
//  "Body_Paint_Door_L" sont tous reconnus comme carrosserie peinte.
//  Voir NOMENCLATURE.md pour le guide complet côté Blender.
// =====================================================================

export const ROLES = {
  // --- Carrosserie ---------------------------------------------------
  BODY_PAINT:      ['Body_Paint'],            // tôles peintes (reçoit la couleur/finition)
  BODY_TRIM:       ['Body_Trim'],             // plastiques noirs, joints, grilles
  CHROME:          ['Chrome'],                // inserts chromés / logos
  GLASS:           ['Glass'],                 // vitres (pare-brise, latérales, lunette)
  // --- Kit carbone (chaque pièce peut être masquée individuellement) --
  CARBON:          ['Carbon_'],               // Carbon_Splitter, Carbon_Skirt_L, ...
  // --- Éclairage -----------------------------------------------------
  HEADLIGHT_LED:   ['Headlight_LED'],         // optiques principales (Matrix LED)
  DRL_LED:         ['DRL_LED'],               // signature lumineuse de jour
  TAILLIGHT_LED:   ['Taillight_LED'],         // feux arrière LED
  LIGHT_HOUSING:   ['Light_Housing'],         // boîtiers / lentilles fumées
  // --- Roues (doivent être dans un groupe Wheel_FL / FR / RL / RR) ----
  WHEEL:           ['Wheel_'],                // groupe parent d'une roue
  RIM:             ['Rim'],                   // jante (Rim_FL, Rim_Variant_A_FL, ...)
  TIRE:            ['Tire'],                  // pneu
  CALIPER:         ['Caliper'],               // étrier de frein
  BRAKE_DISC:      ['Brake_Disc'],            // disque
  // --- Intérieur -----------------------------------------------------
  AMBIENT_LED:     ['Interior_Ambient_LED'],  // bandeaux d'ambiance RGB
  SCREEN_CLUSTER:  ['Screen_Cluster'],        // compteur numérique (UV 0..1 = tout l'écran)
  SCREEN_CENTER:   ['Screen_Center'],         // écran central tactile (UV 0..1)
  SEAT:            ['Seat_'],                 // sièges baquets (reçoit cuir / Alcantara)
  INTERIOR:        ['Interior_'],             // reste de l'habitacle (garde son matériau)
  // --- Repères caméra (objets vides / Empty) --------------------------
  CAM_DRIVER:      ['Cam_Driver'],            // position des yeux conducteur
  CAM_PASSENGER:   ['Cam_Passenger'],         // position des yeux passager
};

// Pièces du kit carbone pilotées depuis l'atelier.
export const CARBON_PARTS = [
  { id: 'Carbon_Splitter', label: 'Lame avant' },
  { id: 'Carbon_Skirt',    label: 'Jupes latérales' },
  { id: 'Carbon_Diffuser', label: 'Diffuseur' },
  { id: 'Carbon_Spoiler',  label: 'Becquet' },
  { id: 'Carbon_Mirror',   label: 'Coques rétros' },
];

// Positions des roues
export const WHEEL_POSITIONS = ['FL', 'FR', 'RL', 'RR'];

/** Renvoie le rôle d'un objet d'après son nom, ou null. L'ordre compte. */
const ORDER = [
  'CAM_DRIVER', 'CAM_PASSENGER',
  'AMBIENT_LED', 'SCREEN_CLUSTER', 'SCREEN_CENTER', 'SEAT',
  'HEADLIGHT_LED', 'DRL_LED', 'TAILLIGHT_LED', 'LIGHT_HOUSING',
  'BRAKE_DISC', 'CALIPER', 'TIRE', 'RIM', 'WHEEL',
  'CARBON', 'BODY_PAINT', 'BODY_TRIM', 'CHROME', 'GLASS', 'INTERIOR',
];
export function roleOf(name = '') {
  const n = name.toLowerCase();
  for (const role of ORDER) {
    if (ROLES[role].some((p) => n.startsWith(p.toLowerCase()))) return role;
  }
  return null;
}

/** "Rim_Variant_Turbofan_FL" -> "Turbofan" ; "Rim_FL" -> null */
export function rimVariantOf(name = '') {
  const m = /^rim_variant_([^_.]+)/i.exec(name);
  return m ? m[1] : null;
}

/** "Wheel_FL" / "Rim_FL" / "Tire_RR.001" -> "FL" ... */
export function wheelPosOf(name = '') {
  const m = /_(FL|FR|RL|RR)(?:[._]|$)/i.exec(name);
  return m ? m[1].toUpperCase() : null;
}

/** "Carbon_Skirt_L.002" -> "Carbon_Skirt" */
export function carbonPartOf(name = '') {
  const p = CARBON_PARTS.find((c) => name.toLowerCase().startsWith(c.id.toLowerCase()));
  return p ? p.id : null;
}
