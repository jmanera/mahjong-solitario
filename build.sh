#!/bin/bash
# Compila el APK sin Gradle (aapt2 + javac + d8 + apksigner). Resultado: Mahjong.apk
set -e
cd "$(dirname "$0")"
SDK=${ANDROID_HOME:-$HOME/Android/Sdk}
BT=$SDK/build-tools/$(ls "$SDK/build-tools" | sort -V | grep -v rc | tail -1)
JAR=$SDK/platforms/android-35/android.jar
node tools/test.js >/dev/null
rm -rf build && mkdir -p build/classes build/dex
"$BT/aapt2" compile --dir app/res -o build/res.zip
"$BT/aapt2" link -o build/unsigned.apk -I "$JAR" --manifest app/AndroidManifest.xml -A app/assets build/res.zip
javac -nowarn --release 8 -classpath "$JAR" -d build/classes app/src/es/juan/mahjong/*.java 2>&1 | grep -v -e '^Note:' -e 'warning' || true
"$BT/d8" --release --lib "$JAR" --min-api 24 --output build/dex build/classes/es/juan/mahjong/*.class
(cd build/dex && zip -q ../unsigned.apk classes.dex)
"$BT/zipalign" -f 4 build/unsigned.apk build/aligned.apk
[ -f release.keystore ] || keytool -genkeypair -keystore release.keystore -storepass mahjong -keypass mahjong \
  -alias mahjong -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Mahjong" >/dev/null 2>&1
"$BT/apksigner" sign --ks release.keystore --ks-pass pass:mahjong --key-pass pass:mahjong --out Mahjong.apk build/aligned.apk
echo "OK: $(pwd)/Mahjong.apk"
