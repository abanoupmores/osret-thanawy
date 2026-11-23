// تجهيز حساب «المدير العام» بشكل آمن — يعمل على جهازك فقط (لا يُرفع ولا يُبنى داخل التطبيق).
// المتطلبات: npm i firebase-admin، ومفتاح حساب خدمة (Service Account JSON) تنزّله أنت من Firebase Console.
// الاستخدام (PowerShell/Bash):
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json ADMIN_PHONE=01XXXXXXXXX ADMIN_PASSWORD='كلمة-سر-قوية' ADMIN_NAME='المدير العام' node tools/provision-admin.mjs
// لا توجد كلمة سر أو كود افتراضي. المفتاح والكلمة لا يُحفظان في أي ملف.
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
const {ADMIN_PHONE,ADMIN_PASSWORD,ADMIN_NAME,ADMIN_EMAIL}=process.env;
const norm=v=>String(v||'').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g,'').slice(-10);
const email=ADMIN_EMAIL?ADMIN_EMAIL.toLowerCase():(norm(ADMIN_PHONE).length>=10?'0'+norm(ADMIN_PHONE)+'@phone.osret-thanawy.app':'');
if(!email||!ADMIN_PASSWORD||ADMIN_PASSWORD.length<8){console.error('حدد ADMIN_PHONE (أو ADMIN_EMAIL) و ADMIN_PASSWORD (8 أحرف على الأقل)');process.exit(1)}
initializeApp({credential:applicationDefault()});
const auth=getAuth(),db=getFirestore();
let user;
try{user=await auth.getUserByEmail(email);console.log('الحساب موجود في Authentication، سيُرقّى لمدير عام (كلمة السر لم تتغير)')}
catch(e){if(e.code!=='auth/user-not-found')throw e;user=await auth.createUser({email,password:ADMIN_PASSWORD});console.log('تم إنشاء حساب Authentication')}
const ref=db.doc('users/'+user.uid),ex=await ref.get();
await ref.set({name:ADMIN_NAME||'المدير العام',role:'admin',section:'general',status:'active',memberId:'',contact:ADMIN_PHONE?norm(ADMIN_PHONE):email,phone:ADMIN_PHONE?norm(ADMIN_PHONE):'',createdAt:ex.exists?(ex.data().createdAt||Date.now()):Date.now()},{merge:false});
console.log('✓ المدير العام جاهز. uid=',user.uid,' | اسم الدخول:',email);
