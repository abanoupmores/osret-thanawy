#!/bin/sh
# اختبار منطق «تحديث الآن» على مثبّت وهمي — بلا شبكة ولا حزم. من جذر المشروع: sh tests/run-update-test.sh
set -e
R=$(cd "$(dirname "$0")/.." && pwd); T=$(mktemp -d)
mkdir -p "$T/node_modules/@capacitor/core" "$T/ext"
echo '{"type":"module"}' > "$T/package.json"
echo '{"name":"@capacitor/core","type":"module","main":"index.js"}' > "$T/node_modules/@capacitor/core/package.json"
printf "export const Capacitor={isNativePlatform:()=>true,getPlatform:()=>'android'};\nexport const registerPlugin=()=>globalThis.__APK;\n" > "$T/node_modules/@capacitor/core/index.js"
cp "$R/src/config.js" "$T/"; cp "$R/src/ext/tools.js" "$T/ext/"
sed "s#'../src/ext/tools.js?'#'./ext/tools.js?'#" "$R/tests/update.test.mjs" > "$T/update.test.mjs"
cd "$T" && node update.test.mjs
