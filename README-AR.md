# خدمة أسرة ثانوي — كنيسة مارجرجس أبو زعبل البلد (الإصدار 5.0.0)

تطبيق Android (Capacitor) + نسخة Windows (Electron) لإدارة الحضور والنقاط والفعاليات والمسابقات والشات، بقسمين منفصلين: **البنين** و**البنات**، ومعهم **المدير العام**.

## الأدوار
| الدور | القسم | الصلاحية |
|---|---|---|
| مخدوم / مخدومة | boys / girls | يرى بيانات قسمه فقط (+ المحتوى المشترك) |
| خادم / خادمة | boys / girls | يدير مخدومي قسمه فقط، ويوافق على تسجيلهم |
| المدير العام | general | الأقسام كلها + الموافقة على الخدام + إيقاف/تفعيل الحسابات + الإعدادات |

الحماية الحقيقية في `firestore.rules` (وليس بإخفاء الأزرار). المدير العام لا يُنشأ من التطبيق أبدًا (انظر FIREBASE-SETUP-AR.md).

## الخطوات المختصرة (GitHub)
1. أنشئ مستودعًا جديدًا (Private) وارفع **محتويات** هذا الـ ZIP (ليس المجلد الأب).
2. أنشئ مشروع Firebase **جديد مخصص للتطبيق** وأكمل FIREBASE-SETUP-AR.md.
3. من GitHub: Settings → Secrets and variables → Actions، أضف:
   - Secret `FIREBASE_CONFIG_JSON` = محتوى `firebase-config.json` (ست قيم من تسجيل تطبيق ويب).
   - Secrets التوقيع: `ANDROID_KEYSTORE_BASE64`، `ANDROID_KEYSTORE_PASSWORD`، `ANDROID_KEY_ALIAS`، `ANDROID_KEY_PASSWORD`.
   - للمهمة الإدارية (إعادة تعيين الباسورد): Secret `FIREBASE_SERVICE_ACCOUNT` + Variable `FIREBASE_PROJECT_ID`.
4. Actions → **Build APK** → Run workflow. الناتج APK في Artifacts/Releases.
5. Windows: Actions → **Build Windows**.

> لو لم تضبط `FIREBASE_CONFIG_JSON` يُبنى التطبيق لكن يعرض شاشة «الإعداد ناقص».

## تشغيل محلي
```
npm install
# عدّل src/firebase-config.json ثم:
npm run check-config
npm run build        # ينتج www/app.js
npm test             # اختبارات المنطق والقواعد الساكنة
```
Android: يُبنى عبر GitHub Actions (يولّد مجلد android وقت البناء ويحقن `native/android` و`tools/android/inject-android.py`). معرّف التطبيق: `org.osretthanawy.service` (مختلف عن أي تطبيق كورال سابق).

## تدفق الحسابات
- مخدوم يسجل من قسمه ← حسابه **pending** ← خادم نفس القسم (أو المدير) يوافق من «طلبات التسجيل».
- خادم يسجل ← **pending** ← المدير العام فقط يوافق. أو المدير ينشئ حساب خادم مباشرة (الباسورد المؤقت 123456 ويُجبر على تغييره).
- الإيقاف: الخادم يوقف مخدومي قسمه، المدير يوقف أي حساب.
- نسيت كلمة السر: بالإيميل الحقيقي عبر رابط Firebase؛ بحساب الرقم عبر خادمه/المدير (المهمة الإدارية على GitHub Actions).

## ما يحتاج منك
انظر آخر TEST-REPORT-AR.md: قائمة «ما لم يُختبر».
