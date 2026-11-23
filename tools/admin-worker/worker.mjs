// مهمة إدارية مجانية: تنفّذ طلبات adminRequests (إعادة تعيين باسورد المخدوم / تحديث رقم الدخول) بـ Admin SDK.
// تعمل على GitHub Actions (.github/workflows/admin-worker.yml) — بدون Cloud Functions وبدون Blaze.
// المفتاح FIREBASE_SERVICE_ACCOUNT يُحفظ في GitHub Secrets فقط، ولا يوجد داخل التطبيق إطلاقًا.
import admin from 'firebase-admin';
import {handle,PROJECT_ID} from './lib.mjs';

const raw=process.env.FIREBASE_SERVICE_ACCOUNT;
if(!raw){console.log('::warning::السر FIREBASE_SERVICE_ACCOUNT غير مضبوط في GitHub Secrets — لم يُنفَّذ أي طلب.');process.exit(0)}
let sa;try{sa=JSON.parse(raw)}catch(e){console.error('::error::FIREBASE_SERVICE_ACCOUNT ليس JSON صالحًا');process.exit(1)}
if(!PROJECT_ID){console.error('::error::المتغير FIREBASE_PROJECT_ID غير مضبوط (Repository Variable)');process.exit(1)}
if(sa.project_id!==PROJECT_ID){console.error('::error::المفتاح لمشروع مختلف ('+sa.project_id+'). المتوقع '+PROJECT_ID);process.exit(1)}
admin.initializeApp({credential:admin.credential.cert(sa)});
const db=admin.firestore(),auth=admin.auth();

const snap=await db.collection('adminRequests').where('status','==','pending').limit(50).get();
const docs=snap.docs.sort((a,b)=>(a.data().createdAt||0)-(b.data().createdAt||0));
console.log('طلبات منتظرة:',docs.length);
let bad=0;
for(const d of docs){
  let res;
  try{res=await handle(d.data(),{db,auth})}catch(e){res={status:'failed',message:String((e&&(e.code||e.message))||e).slice(0,120)};bad++}
  await d.ref.update({status:res.status,message:res.message||'',doneAt:Date.now()});
  console.log(d.id,d.data().type,'->',res.status,res.message||'');
}
process.exit(0);
