#!/usr/bin/env python3
"""اختبار tools/android/inject-android.py على قالب Capacitor 6 مبسّط (بدون SDK). لا يغني عن البناء الفعلي في GitHub Actions."""
import os, re, shutil, subprocess, sys, tempfile
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
T = tempfile.mkdtemp(); ok = fail = 0
def check(c, n):
    global ok, fail
    ok += bool(c); fail += (not c); print(('PASS ' if c else 'FAIL ') + n)
def w(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf-8').write(s)
def run(code='57', name='4.1.1', cwd=T):
    return subprocess.run([sys.executable, os.path.join(R, 'tools/android/inject-android.py'), cwd], env={**os.environ, 'VERSION_CODE': code, 'VERSION_NAME': name}, capture_output=True, text=True)
shutil.copy(os.path.join(R, 'capacitor.config.json'), T); shutil.copytree(os.path.join(R, 'native'), os.path.join(T, 'native'))
A = os.path.join(T, 'android/app')
w(A + '/build.gradle', '''android {
    defaultConfig {
        applicationId "org.osretthanawy.service"
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
        }
    }
}
''')
w(A + '/src/main/AndroidManifest.xml', '<manifest>\n<application>\n<activity android:name=".MainActivity"/>\n</application>\n<uses-permission android:name="android.permission.INTERNET" />\n</manifest>\n')
r = run(); check(r.returncode == 0, 'التشغيل الأول ينجح')
g = open(A + '/build.gradle', encoding='utf-8').read()
check('versionCode 57' in g and 'versionName "4.1.1"' in g, 'versionCode/versionName مضبوطان')
bt = g[g.index('buildTypes'):]
check('signingConfig signingConfigs.release' in bt, 'سطر التوقيع داخل buildTypes.release')
check(g.count('signingConfig signingConfigs.release') == 1, 'سطر التوقيع مرة واحدة فقط')
sc = g[g.index('signingConfigs {'):g.index('buildTypes')]
check('signingConfig signingConfigs' not in sc, 'لا حقن خاطئ داخل signingConfigs')
check('System.getenv("OSRET_KS_PASS")' in g and not re.search(r'storePassword\s+"', g), 'كلمات المرور من البيئة فقط')
m = open(A + '/src/main/AndroidManifest.xml', encoding='utf-8').read()
check(all(x in m for x in ('REQUEST_INSTALL_PACKAGES', 'CAMERA', 'POST_NOTIFICATIONS', 'FileProvider')), 'الصلاحيات و FileProvider')
check(os.path.exists(A + '/src/main/res/xml/file_paths.xml'), 'file_paths.xml')
check(all(os.path.exists(A + '/src/main/java/org/osretthanawy/service/' + f) for f in ('MainActivity.java', 'ApkInstallerPlugin.java')), 'ملفات Java منسوخة')
r = run('58'); g2 = open(A + '/build.gradle', encoding='utf-8').read()
check(r.returncode == 0 and 'versionCode 58' in g2 and g2.count('signingConfigs {') == 1, 'إعادة التشغيل آمنة (لا تكرار) وتحدّث versionCode')
check(open(A + '/src/main/AndroidManifest.xml', encoding='utf-8').read().count('REQUEST_INSTALL_PACKAGES') == 1, 'لا تكرار للصلاحيات')
check(run('0').returncode != 0 and run('abc').returncode != 0 and run('3000000000').returncode != 0, 'يرفض versionCode غير صالح')
check(run('5', 'bad name!').returncode != 0, 'يرفض versionName غير صالح')
w(A + '/build.gradle', 'android { }'); shutil.rmtree(A + '/../x', ignore_errors=True)
check(run().returncode != 0, 'يفشل بوضوح لو تغيّر قالب build.gradle')
import json; c = json.load(open(T + '/capacitor.config.json')); c['appId'] = 'x.y.z'; json.dump(c, open(T + '/capacitor.config.json', 'w'))
w(A + '/build.gradle', g); check(run().returncode != 0, 'يرفض تغيير appId')
print('\n%d passed, %d failed' % (ok, fail)); sys.exit(1 if fail else 0)
