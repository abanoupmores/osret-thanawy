// اختبار منطق المهمة الإدارية (Admin SDK يتجاوز القواعد فالتحقق من القسم/الدور داخل الكود): node tests/admin-worker.test.mjs
import {handle,norm,phoneMail,DEFAULT_PW} from '../tools/admin-worker/lib.mjs';
let ok=true;const t=(n,a,b)=>{const g=JSON.stringify(a)===JSON.stringify(b);if(!g)ok=false;console.log(g?'PASS':'FAIL',n,g?'':'got '+JSON.stringify(a)+' expected '+JSON.stringify(b))};
function env(){
  const D={
    'users/ADM':{role:'admin',section:'general',status:'active'},
    'users/SB':{role:'servant',section:'boys',status:'active'},'users/SG':{role:'servant',section:'girls',status:'active'},
    'users/SP':{role:'servant',section:'boys',status:'pending'},'users/SX':{role:'servant',section:'boys',status:'suspended'},
    'users/UB':{role:'member',section:'boys',status:'active',memberId:'MB',phone:'1012345678'},
    'users/UG':{role:'member',section:'girls',status:'active',memberId:'MG'},
    'users/UR':{role:'member',section:'boys',status:'active',memberId:'MR'},
    'members/MB':{uid:'UB',section:'boys'},'members/MG':{uid:'UG',section:'girls'},'members/MR':{uid:'UR',section:'boys'}};
  const calls=[];
  const A={UB:{uid:'UB',email:'01012345678@phone.osret-thanawy.app'},UG:{uid:'UG',email:'01099999999@phone.osret-thanawy.app'},UR:{uid:'UR',email:'real@gmail.com'},SB:{uid:'SB',email:'01000000001@phone.osret-thanawy.app'}};
  const db={doc:p=>({get:async()=>({exists:p in D,data:()=>D[p],ref:null}),update:async x=>{calls.push(['upd',p,x]);D[p]={...D[p],...x}}})};
  const auth={updateUser:async(u,x)=>{calls.push(['auth',u,x]);Object.assign(A[u],x.email?{email:x.email}:{})},revokeRefreshTokens:async u=>calls.push(['revoke',u]),
    getUser:async u=>A[u],getUserByEmail:async e=>{const f=Object.values(A).find(x=>x.email===e);if(!f)throw{code:'auth/user-not-found'};return f}};
  return {db,auth,calls,D};
}
const H=async(r,e)=>(await handle(r,e)).status;
t('norm',[norm('٠١٠١٢٣٤٥٦٧٨'),norm('+20 101 234 5678')],['1012345678','1012345678']);
t('phoneMail',phoneMail('01012345678'),'01012345678@phone.osret-thanawy.app');
let e=env();
t('reset: خادم بنين لمخدوم بنين',await H({type:'resetPassword',targetUid:'UB',memberId:'MB',requestedBy:'SB'},e),'done');
t('reset: الباسورد المؤقت + revoke + mustChangePw',[e.calls.some(c=>c[0]==='auth'&&c[2].password===DEFAULT_PW),e.calls.some(c=>c[0]==='revoke'),e.D['users/UB'].mustChangePw],[true,true,true]);
e=env();t('reset: خادم بنين لمخدومة بنات = مرفوض',await H({type:'resetPassword',targetUid:'UG',memberId:'MG',requestedBy:'SB'},e),'failed');t('  لا تغيير',e.calls.length,0);
e=env();t('reset: خادمة بنات لمخدوم بنين = مرفوض',await H({type:'resetPassword',targetUid:'UB',memberId:'MB',requestedBy:'SG'},e),'failed');
e=env();t('reset: المدير العام لأي قسم',await H({type:'resetPassword',targetUid:'UG',memberId:'MG',requestedBy:'ADM'},e),'done');
e=env();t('reset: المدير العام لخادم',await H({type:'resetPassword',targetUid:'SB',memberId:'',requestedBy:'ADM'},e),'done');
e=env();t('reset: خادم لخادم آخر = مرفوض',await H({type:'resetPassword',targetUid:'SB',memberId:'',requestedBy:'SB'},e),'failed');
e=env();t('reset: مخدوم يطلب لنفسه = مرفوض',await H({type:'resetPassword',targetUid:'UB',memberId:'MB',requestedBy:'UB'},e),'failed');
e=env();t('reset: خادم معلّق/موقوف = مرفوض',[await H({type:'resetPassword',targetUid:'UB',memberId:'MB',requestedBy:'SP'},e),await H({type:'resetPassword',targetUid:'UB',memberId:'MB',requestedBy:'SX'},e)],['failed','failed']);
e=env();t('reset: memberId لا يطابق',await H({type:'resetPassword',targetUid:'UB',memberId:'MR',requestedBy:'SB'},e),'failed');
e=env();t('reset: هدف غير موجود',await H({type:'resetPassword',targetUid:'NOPE',memberId:'MB',requestedBy:'SB'},e),'failed');
e=env();t('reset: لا يُعاد تعيين المدير',await H({type:'resetPassword',targetUid:'ADM',memberId:'',requestedBy:'ADM'},e),'failed');
e=env();t('reset: حقل section مزوّر في الطلب لا يفيد',await H({type:'resetPassword',targetUid:'UG',memberId:'MG',requestedBy:'SB',section:'girls'},e),'failed');
e=env();t('phone: خادم يغيّر لمخدوم قسمه',await H({type:'changePhone',targetUid:'UB',memberId:'MB',newPhone:'01111111111',requestedBy:'SB'},e),'done');
t('phone: الإيميل الجديد',e.calls.find(c=>c[0]==='auth')[2].email,'01111111111@phone.osret-thanawy.app');
e=env();t('phone: خادم بنين لمخدومة بنات = مرفوض',await H({type:'changePhone',targetUid:'UG',memberId:'MG',newPhone:'01111111111',requestedBy:'SB'},e),'failed');
e=env();t('phone: رقم مستخدم عند حساب آخر',await H({type:'changePhone',targetUid:'UB',memberId:'MB',newPhone:'01099999999',requestedBy:'SB'},e),'failed');
e=env();t('phone: ذاتي لنفسه مسموح (مخدوم)',await H({type:'changePhone',targetUid:'UB',memberId:'',newPhone:'01122222222',requestedBy:'UB'},e),'done');
e=env();t('phone: مخدوم لغيره مرفوض',await H({type:'changePhone',targetUid:'UR',memberId:'',newPhone:'01122222222',requestedBy:'UB'},e),'failed');
e=env();t('phone: حساب بإيميل حقيقي skipped',await H({type:'changePhone',targetUid:'UR',memberId:'MR',newPhone:'01122222222',requestedBy:'SB'},e),'skipped');
e=env();t('phone: رقم قصير',await H({type:'changePhone',targetUid:'UB',memberId:'MB',newPhone:'123',requestedBy:'SB'},e),'failed');
e=env();t('نوع مجهول',await H({type:'deleteEverything',targetUid:'UB',requestedBy:'SB'},e),'failed');
process.exit(ok?0:1);
