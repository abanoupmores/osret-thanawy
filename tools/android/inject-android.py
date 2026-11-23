#!/usr/bin/env python3
"""
يُشغَّل في GitHub Actions بعد `npx cap add android` وقبل البناء.
يضيف إلى مشروع Android المولّد: التوقيع الثابت (Release)، versionCode/versionName،
صلاحيات التثبيت، وإضافة ApkInstaller. آمن لإعادة التشغيل (idempotent) ويفشل بوضوح
لو تغيّر شكل ملفات القالب (بدل أن يُنتج APK غير موقّع أو ناقص بصمت).

متغيرات البيئة: VERSION_CODE (رقم صحيح > 0)، VERSION_NAME. مسار المشروع: الوسيط الأول (الافتراضي .)
"""
import json, os, re, shutil, sys

root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
and_dir = os.path.join(root, 'android')
app = os.path.join(and_dir, 'app')

def die(msg):
    print('::error::' + msg); sys.exit(1)

def read(p):
    with open(p, encoding='utf-8') as f: return f.read()

def write(p, s):
    with open(p, 'w', encoding='utf-8', newline='\n') as f: f.write(s)

# ---- المدخلات ----
vc = os.environ.get('VERSION_CODE', '')
vn = os.environ.get('VERSION_NAME', '')
if not re.fullmatch(r'[1-9][0-9]{0,8}', vc): die('VERSION_CODE غير صالح: %r' % vc)
if not re.fullmatch(r'[0-9A-Za-z._-]{1,30}', vn): die('VERSION_NAME غير صالح: %r' % vn)
if int(vc) > 2000000000: die('VERSION_CODE أكبر من الحد المسموح')

cap = json.loads(read(os.path.join(root, 'capacitor.config.json')))
app_id = cap['appId']
if app_id != 'org.osretthanawy.service': die('appId تغيّر! يجب أن يبقى org.osretthanawy.service للحفاظ على التحديث (وُجد %s)' % app_id)

# ---- 1) build.gradle: الإصدار + التوقيع ----
gp = os.path.join(app, 'build.gradle')
g = read(gp)
if 'OSRET_SIGNING' not in g:
    g, n1 = re.subn(r'versionCode\s+\d+', 'versionCode %s' % vc, g, count=1)
    g, n2 = re.subn(r'versionName\s+"[^"]*"', 'versionName "%s"' % vn, g, count=1)
    if n1 != 1 or n2 != 1: die('لم أجد versionCode/versionName في build.gradle (تغيّر القالب)')
    signing = '''    // OSRET_SIGNING — توقيع Release ثابت من متغيرات البيئة (GitHub Secrets). لا أسرار في الملفات.
    signingConfigs {
        release {
            def ksPath = System.getenv("OSRET_KS_PATH")
            if (ksPath) {
                storeFile file(ksPath)
                storePassword System.getenv("OSRET_KS_PASS")
                keyAlias System.getenv("OSRET_KEY_ALIAS")
                keyPassword System.getenv("OSRET_KEY_PASS")
            }
        }
    }
'''
    bt = re.search(r'\n\s*buildTypes\s*\{', g)
    if not bt: die('لم أجد buildTypes في build.gradle')
    head, tail = g[:bt.start()], g[bt.start():]
    tail, n4 = re.subn(r'(release\s*\{)', r'\1\n            signingConfig signingConfigs.release', tail, count=1)
    if n4 != 1: die('لم أجد buildTypes.release في build.gradle')
    g = head + '\n' + signing.rstrip('\n') + tail
else:
    g = re.sub(r'versionCode\s+\d+', 'versionCode %s' % vc, g, count=1)
    g = re.sub(r'versionName\s+"[^"]*"', 'versionName "%s"' % vn, g, count=1)
write(gp, g)
if 'applicationId "%s"' % app_id not in g: die('applicationId في build.gradle لا يطابق %s' % app_id)

# ---- 2) AndroidManifest: صلاحيات + FileProvider ----
mp = os.path.join(app, 'src', 'main', 'AndroidManifest.xml')
m = read(mp)
perms = [
    '<uses-permission android:name="android.permission.CAMERA"/>',
    '<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>',
    '<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"/>',
    '<uses-feature android:name="android.hardware.camera" android:required="false"/>',
]
add = ''
for p in perms:
    name = re.search(r'android:name="([^"]+)"', p).group(1)
    if name not in m: add += '    ' + p + '\n'
if add:
    if '</manifest>' not in m: die('AndroidManifest بلا </manifest>')
    m = m.replace('</manifest>', add + '</manifest>', 1)
if 'androidx.core.content.FileProvider' not in m:
    prov = '''        <provider android:name="androidx.core.content.FileProvider" android:authorities="${applicationId}.fileprovider" android:exported="false" android:grantUriPermissions="true">
            <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/file_paths"/>
        </provider>
'''
    if '</application>' not in m: die('AndroidManifest بلا </application>')
    m = m.replace('</application>', prov + '    </application>', 1)
write(mp, m)

# file_paths.xml: يجب أن يغطي cache/updates (قالب Capacitor يضع cache-path بـ path="." فيكفي)
fp = os.path.join(app, 'src', 'main', 'res', 'xml', 'file_paths.xml')
os.makedirs(os.path.dirname(fp), exist_ok=True)
if not os.path.exists(fp):
    write(fp, '<?xml version="1.0" encoding="utf-8"?>\n<paths>\n    <cache-path name="updates" path="updates/" />\n</paths>\n')
else:
    x = read(fp)
    covered = re.search(r'<cache-path[^>]*path="(\.|updates/?)"', x)
    if not covered:
        if '</paths>' not in x: die('file_paths.xml بلا </paths>')
        x = x.replace('</paths>', '    <cache-path name="updates" path="updates/" />\n</paths>', 1)
        write(fp, x)

# ---- 3) إضافة ApkInstaller + MainActivity ----
pkg_dir = os.path.join(app, 'src', 'main', 'java', *app_id.split('.'))
os.makedirs(pkg_dir, exist_ok=True)
for f in ('ApkInstallerPlugin.java', 'MainActivity.java'):
    shutil.copyfile(os.path.join(root, 'native', 'android', f), os.path.join(pkg_dir, f))

print('OK: versionCode=%s versionName=%s appId=%s' % (vc, vn, app_id))
