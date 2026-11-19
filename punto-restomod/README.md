# Punto Restomod — configurateur 3D Android

Application Android de visualisation et de personnalisation 3D d'une **Fiat Punto Abarth (Evo)** en restomod :
kit carbone, jantes, étriers, hauteur de caisse, Matrix LED, cockpit numérique et ambiance RGB, en mode jour et nuit.

Stack : **Three.js** (rendu PBR, bloom, ombres) + **Vite** + **Capacitor 8** (APK Android).

## Fonctionnalités
- Vue orbitale 360° (rotation au doigt, zoom au pincement, rotation automatique)
- Vues **Conducteur** et **Passager** : on regarde autour de soi dans l'habitacle
- Vues **Détails** : jante et étrier, optique Matrix LED, diffuseur, becquet
- **Jour / Nuit** : phares avec faisceau au sol, feux arrière, ambiance intérieure, bloom
- Atelier :
  - **Peinture** : 9 teintes, finitions brillant, métallisé (paillettes), satiné, mat
  - **Carbone** : forgé, tressé ou couleur carrosserie ; chaque pièce se monte ou se démonte
  - **Jantes** : 4 designs, 5 finitions, étriers rouge, jaune, bleu ou noir
  - **Châssis** : hauteur de caisse de −7 à +4,5 cm, préréglages de suspension pneumatique
  - **Éclairage** : Matrix LED, DRL, optiques fumées
  - **Intérieur** : LED d'ambiance (8 préréglages + teinte libre + intensité), sièges Alcantara ou cuir, double écran animé
- **Mes versions** : sauvegarder et recharger des configurations
- **Import .glb** depuis le téléphone, mémorisé entre deux lancements, avec rapport de nomenclature

Tant qu'aucun modèle n'est chargé, l'app affiche une **voiture de démonstration procédurale** qui respecte déjà la nomenclature.

➡️ **Guide Blender : [NOMENCLATURE.md](NOMENCLATURE.md)**

## Structure
```
src/
  main.js           état, interface de l'atelier, menu, chargement des modèles
  stage.js          rendu, studio, jour/nuit, bloom, caméras
  carBinder.js      lit un modèle selon la nomenclature et expose l'API de l'atelier
  nomenclature.js   ⭐ les noms d'objets reconnus
  materials.js      matériaux PBR et textures procédurales (carbone, Alcantara…)
  screens.js        compteur et écran central animés
  placeholderCar.js voiture de démonstration
  storage.js        sauvegardes, IndexedDB, chargeur GLB (Draco et Meshopt)
public/models/      mets car.glb ici pour l'embarquer dans l'APK
```

## Développement
```bash
npm install
npm run dev        # http://localhost:5173 (s'ouvre aussi depuis le téléphone, même Wi-Fi)
npm run build
```

## Compiler l'APK
**Automatique** : le workflow GitHub Actions `Punto Restomod APK` compile l'APK à chaque push sur `punto-restomod/` et le publie dans les *Releases* du dépôt.

**À la main** (Android Studio ou SDK installé, JDK 21) :
```bash
npm run build
npx cap add android      # la première fois seulement
npx cap sync android
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```
