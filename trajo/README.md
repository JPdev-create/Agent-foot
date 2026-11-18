# Trajo 🚗

Application Android qui enregistre **toute seule** tes trajets en voiture :
dès que le téléphone se connecte au **Wi-Fi du boîtier CarPlay / Android Auto**
(par défaut `AutoBox-9678`) ou au **Bluetooth** de la voiture, le trajet démarre
(distance GPS, durée, vitesse). Il se termine 1 min 30 après la coupure du moteur.

## Ce qu'elle fait

- **Trajets automatiques** : distance, durée, vitesse moyenne et max, tracé du parcours, coût estimé
- **Pleins** : montant, litres, kilométrage, prix au litre, avec la **consommation réelle**
  calculée de plein complet à plein complet
- **Entretien et frais** : vidange, révision, pneus, contrôle technique, assurance, péages…,
  avec un rappel de la prochaine vidange
- **Tableau de bord** : compteur estimé, km et coûts du mois, graphique sur 6 mois, totaux de l'année
- **Export CSV** des trajets et des pleins (frais kilométriques, Excel)
- Toutes les données restent **sur le téléphone**

## Installation (Samsung S25 Ultra)

1. Télécharge `Trajo.apk` sur le téléphone et ouvre-le.
2. Autorise « Installer des applis inconnues » pour l'appli qui l'ouvre (Fichiers, Chrome…).
3. Lance **Trajo** → onglet **Réglages** :
   - **Wi-Fi de la voiture** : `AutoBox-9678` est déjà rempli (modifiable)
   - **Bluetooth** (facultatif) : sélectionne le Bluetooth de la 208
   - Autorise **toutes** les lignes (localisation « Toujours autoriser », Bluetooth,
     notifications, batterie non restreinte)
   - Saisis le **kilométrage actuel** du compteur
4. Paramètres Samsung → Batterie → Limites d'utilisation en arrière-plan →
   **Applications jamais en veille** → ajoute Trajo.

## Construire l'APK

```bash
sudo apt install aapt apksigner zipalign dalvik-exchange openjdk-17-jdk
./build.sh   # → build/Trajo.apk
```

Le projet est en Java pur (aucune bibliothèque externe), compilé sans Android Studio.
La clé de signature `keystore/compteur208.jks` doit rester la même : les mises à jour
s'installeront par-dessus, sans perdre les données.
