#!/usr/bin/env bash
# Construit l'APK Android de Compteur 208, sans Android Studio.
# Outils requis (Ubuntu/Debian) : sudo apt install aapt apksigner zipalign dalvik-exchange dexdump openjdk-17-jdk
set -euo pipefail
cd "$(dirname "$0")"

ANDROID_JAR="${ANDROID_JAR:-build/android-34.jar}"
if [ ! -f "$ANDROID_JAR" ]; then
  mkdir -p build
  echo "Téléchargement de android.jar (API 34)…"
  curl -sSL -o "$ANDROID_JAR" https://raw.githubusercontent.com/Reginer/aosp-android-jar/main/android-34/android.jar
fi

rm -rf build/gen build/classes build/*.apk build/classes.dex
mkdir -p build/gen build/classes

echo "1/5 Ressources"
aapt package -f -m -M AndroidManifest.xml -S res -I "$ANDROID_JAR" -J build/gen -F build/res.apk

echo "2/5 Compilation Java"
javac --release 8 -nowarn -Xlint:none -encoding UTF-8 -cp "$ANDROID_JAR" -d build/classes $(find src build/gen -name '*.java')

echo "3/5 Conversion Dalvik"
dalvik-exchange --dex --min-sdk-version=26 --output=build/classes.dex build/classes

# Garde-fou : Android ne sait pas exécuter les lambdas Java non converties (plantage au lancement).
if command -v dexdump >/dev/null && dexdump -d build/classes.dex | grep -q "invoke-custom"; then
  echo "ERREUR : lambdas Java détectées (->, ::). Utiliser des classes anonymes." >&2
  exit 1
fi

echo "4/5 Assemblage"
cp build/res.apk build/unsigned.apk
(cd build && aapt add unsigned.apk classes.dex >/dev/null)
zipalign -f 4 build/unsigned.apk build/aligned.apk

echo "5/5 Signature"
apksigner sign --ks keystore/compteur208.jks --ks-pass pass:compteur208 --key-pass pass:compteur208 \
  --out build/Compteur208.apk build/aligned.apk
apksigner verify build/Compteur208.apk
echo "OK → build/Compteur208.apk"
