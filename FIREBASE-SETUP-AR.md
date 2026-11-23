# إعداد Firebase — خدمة أسرة ثانوي

> ⚠ استخدم **مشروع Firebase جديد** لهذا التطبيق. نشر هذه القواعد على مشروع يستخدمه تطبيق آخر (مثل تطبيق كورال) سيستبدل قواعده ويكسره.

## 1) إنشاء المشروع
Firebase Console → Add project (خطة Spark المجانية تكفي لمعظم الميزات).

## 2) Authentication
Build → Authentication → Sign-in method → فعّل **Email/Password** فقط. (حسابات الأرقام تُحوَّل داخليًا إلى `0xxxxxxxxxx@phone.osret-thanawy.app`.)

## 3) Firestore
Build → Firestore Database → Create (production mode). ثم:
```
npm i -g firebase-tools
firebase login
firebase use --add            # اختر المشروع
firebase deploy --only firestore:rules,firestore:indexes
```
الفهارس مطلوبة (events و notifs بالقسم + الوقت) وموجودة في `firestore.indexes.json`.

## 4) تسجيل تطبيق ويب وأخذ الإعداد
Project settings → Your apps → Web (</>) → انسخ القيم الست إلى `src/firebase-config.json`:
`apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId`. (هذه مفاتيح عميلة عامة وليست أسرارًا؛ الحماية بالقواعد.) ثم `npm run check-config`.

تسجيل تطبيق Android في Firebase **غير مطلوب** (التطبيق يستخدم Web SDK داخل Capacitor).

## 5) تجهيز المدير العام (آمن)
لا يوجد تسجيل أو كود سري للمدير. نفّذ على جهازك مرة واحدة:
1. Project settings → Service accounts → Generate new private key (احفظه محليًا ولا ترفعه).
2. ```
   npm i firebase-admin
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json ADMIN_PHONE=01XXXXXXXXX ADMIN_PASSWORD='كلمة-قوية' ADMIN_NAME='المدير العام' node tools/provision-admin.mjs
   ```
   (PowerShell: اضبط المتغيرات بـ `$env:` قبل الأمر.)
بديل يدوي: أنشئ مستخدمًا في Authentication ثم أضف في Firestore مستند `users/{uid}` بالحقول: `name, role:"admin", section:"general", status:"active", memberId:"", createdAt`.

## 6) المهمة الإدارية (إعادة تعيين الباسورد/تغيير رقم الدخول) — مجانية
GitHub Secret `FIREBASE_SERVICE_ACCOUNT` (نص JSON للمفتاح) + Variable `FIREBASE_PROJECT_ID`. تعمل `admin-worker.yml` و`competition-worker.yml` بجدول. بدونها تبقى هذه الطلبات معلّقة فقط؛ باقي التطبيق يعمل.

## 7) Storage (اختياري)
فقط لرفع ملفات صوتية للترانيم. يمكن الاكتفاء بروابط Drive/Dropbox. لو فعّلته: `firebase deploy --only storage` (قد يتطلب Blaze حسب سياسة Firebase الحالية). المسار: `hymns/{section}/{hymnId}/{file}`.

## 8) Cloud Functions
غير مستخدمة (لا تكلفة Blaze). التنفيذ المميز عبر GitHub Actions + Admin SDK، وهو يعيد التحقق من الدور والقسم والحالة.

## نموذج البيانات
`users/{uid}`: `role` (member|servant|admin)، `section` (boys|girls|general)، `status` (pending|active|suspended|rejected). كل مستند تابع لقسم فيه `section` (boys|girls|both للمشترك الذي يكتبه المدير فقط).
