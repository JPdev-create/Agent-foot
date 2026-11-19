# Nomenclature Blender → application

L'app reconnaît chaque objet par le **début de son nom**, sans tenir compte des majuscules.
`Body_Paint`, `Body_Paint.001` et `Body_Paint_Porte_G` sont donc tous lus comme de la carrosserie peinte.
Un nom peut être porté par un **objet maillage** ou par un **groupe/Empty parent** : dans ce cas, tous ses enfants sont concernés.

## 1. Orientation et échelle (dans Blender)

| Règle | Détail |
|---|---|
| **Avant de la voiture vers −Y** | En vue de face (pavé num. `1`), la voiture te regarde. |
| **Conducteur à gauche = côté +X** | Volant côté +X (conduite à gauche). |
| Roues posées sur le sol | Le bas des pneus à Z = 0, idéalement. |
| Échelle | Peu importe : l'app remet la voiture à 4,065 m. Si elle arrive de travers, menu ⋯ → **Pivoter 90°**. |
| Applique les transformations | `Ctrl+A` → *All Transforms* sur tout avant l'export. |

## 2. Les noms à utiliser

### Carrosserie
| Nom | Ce que l'app en fait |
|---|---|
| `Body_Paint` | Reçoit la **couleur + finition** (brillant / métallisé / satiné / mat). Toutes les tôles peintes. |
| `Body_Trim` | Plastiques noirs, joints, grilles, bas de caisse (matériau noir satiné). |
| `Chrome` | Logos, échappements, inserts (chrome). |
| `Glass` | Toutes les vitres (verre teinté réaliste). |

### Kit carbone (chaque pièce peut être montée ou démontée dans l'atelier)
| Nom | Pièce |
|---|---|
| `Carbon_Splitter` | Lame avant |
| `Carbon_Skirt_L`, `Carbon_Skirt_R` | Jupes latérales |
| `Carbon_Diffuser` | Diffuseur arrière (ailettes comprises) |
| `Carbon_Spoiler` | Becquet |
| `Carbon_Mirror_L`, `Carbon_Mirror_R` | Coques de rétroviseurs |

> Le motif carbone (forgé ou tressé) est une texture appliquée par l'app, qui a besoin d'un **dépliage UV** propre sur ces pièces (*Smart UV Project* suffit).

### Éclairage
| Nom | Rôle | Jour | Nuit |
|---|---|---|---|
| `Headlight_LED` | Modules Matrix LED (phares) | faible | **allumé + faisceau au sol** |
| `DRL_LED` | Signature lumineuse de jour | allumée | très lumineuse (bloom) |
| `Taillight_LED` | Feux arrière (bandeau compris) | faible | **rouge vif + halo au sol** |
| `Light_Housing` | Boîtiers et lentilles | fumé ou clair selon l'option | |

### Roues ⚠️ structure importante
Chaque roue est un **groupe (Empty) parent** nommé `Wheel_FL`, `Wheel_FR`, `Wheel_RL`, `Wheel_RR`
(FL = avant gauche, FR = avant droite, RL = arrière gauche, RR = arrière droite).
Les roues ne descendent pas avec la carrosserie quand tu règles la hauteur de caisse.

```
Wheel_FL            (Empty, placé au centre de la roue)
├── Tire_FL         pneu
├── Brake_Disc_FL   disque
├── Caliper_FL      étrier (reçoit la couleur Brembo)
└── Rim_FL          jante (reçoit la finition noir brillant / satiné / gunmetal…)
```

**Plusieurs designs de jantes** : mets-les tous dans chaque roue, nommés `Rim_Variant_<Nom>_<Position>` :
```
Wheel_FL
├── Rim_Variant_Y5_FL
├── Rim_Variant_Turbofan_FL
└── Rim_Variant_BBS_FL
```
L'atelier affiche automatiquement les boutons « Y5 », « Turbofan », « BBS ».
⚠️ **Laisse toutes les variantes visibles** dans Blender, c'est l'app qui masque celles qui ne sont pas choisies. Un objet caché peut ne pas être exporté.

S'il n'y a pas de groupe `Wheel_XX`, l'app en crée un à partir des pièces suffixées `_FL`, `_FR`, etc.

### Intérieur
| Nom | Rôle |
|---|---|
| `Interior_Ambient_LED` | Bandeaux d'ambiance (tableau de bord, portes, aérateurs, console). Couleur RGB réglable. |
| `Screen_Cluster` | Compteur numérique. **UV : l'écran entier doit couvrir 0→1.** |
| `Screen_Center` | Écran central tactile. **UV : 0→1.** |
| `Seat_` | Sièges (`Seat_Driver`, `Seat_Passenger`, `Seat_Rear`…). Reçoivent Alcantara / cuir. |
| `Interior_` | Tout le reste de l'habitacle. **Garde son matériau d'origine.** |
| `Cam_Driver` | *Empty* placé à la position des **yeux du conducteur**. |
| `Cam_Passenger` | *Empty* à la position des yeux du passager. |

Sans `Cam_Driver` / `Cam_Passenger`, l'app estime la position, mais c'est moins précis.

> Les objets qui ne commencent par aucun de ces préfixes sont affichés tels quels, avec leurs matériaux d'origine.

## 3. Export

1. `Fichier → Exporter → glTF 2.0 (.glb)`
2. Format : **glTF Binary (.glb)**
3. Inclure : *Selected Objects* décoché, *Custom Properties* inutile
4. Transformer : **+Y Up** coché (valeur par défaut)
5. Données → Maillage : *Apply Modifiers* coché
6. Compression : *Draco* possible (l'app sait la décoder), utile au-dessus de 50 Mo

## 4. Dans l'app

- Menu **⋯ → Charger un fichier .glb** depuis le téléphone. Le modèle est **mémorisé**, pas besoin de recommencer à chaque lancement.
- **Rapport de nomenclature** (même menu) : liste les pièces trouvées (✔) et celles qui manquent (✖).
- Pour **embarquer** le modèle dans l'APK : copie-le dans `punto-restomod/public/models/car.glb` et relance la compilation.

## 5. Conseils pour l'assemblage (Punto + intérieur moderne)

1. Importe la Punto Abarth (Sketchfab, en `.glb`), puis l'intérieur moderne (`Fichier → Importer`).
2. Supprime l'intérieur d'origine de la Punto.
3. Mets l'intérieur à l'échelle et place-le (sièges à environ 45 cm du plancher, volant devant `Cam_Driver`).
4. Sépare les pièces au besoin : mode Édition, sélection, `P` → *By Material* ou *Selection*.
5. Renomme selon ce tableau (double-clic dans l'Outliner).
6. Vérifie le poids : vise **moins de 300 000 triangles** et des textures en 2K pour rester fluide sur mobile (*Decimate* si besoin).
