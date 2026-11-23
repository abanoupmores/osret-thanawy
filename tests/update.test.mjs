// يحتاج stub لـ @capacitor/core: شغّله عبر tests/run-update-test.sh (ينشئ stub مؤقتًا)
globalThis.window=globalThis;
let pass=0,fail=0;const ok=(c,n)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n)};
const toasts=[];let renders=0,upd={isActive:true,version:'4.1.2',url:'https://x/y.apk',sha256:''};
function mk(apk){globalThis.__APK=apk;return import('../src/ext/tools.js?'+Math.random())}
const X={db:{},$:()=>null,esc:s=>String(s??''),ic:()=>'',pg:h=>h,om:()=>{},toast:(m)=>toasts.push(m),PG:{},fire:{},S:()=>({upd}),isS:()=>false,render:()=>renders++,me:()=>({}),uid:()=>'u',IC:{},ext:{}};
const calls=[];
const apk=(o={})=>({canInstall:async()=>({allowed:o.allowed!==false}),openInstallSettings:async()=>calls.push('settings'),
 addListener:async(n,cb)=>({remove(){calls.push('rm')}}),download:async a=>{calls.push('dl:'+a.url+'|'+a.sha256);if(o.dlErr)throw new Error(o.dlErr);return{sha256:'a'}},
 install:async()=>{calls.push('install');if(o.insErr)throw new Error(o.insErr)}});

// 1) صلاحية التثبيت ناقصة -> يفتح الإعدادات ولا يحمّل
let m=await mk(apk({allowed:false}));m.installTools(X);await window.upGo();
ok(calls.join()==='settings','بدون إذن: يفتح إعدادات التثبيت فقط ولا يحمّل');

// 2) مسار ناجح: تحميل ثم تثبيت، مع تمرير الرابط والبصمة
calls.length=0;upd.sha256='ab'.repeat(32);m=await mk(apk());m.installTools(X);await window.upGo();
ok(calls[0]==='dl:https://x/y.apk|'+'ab'.repeat(32),'يمرّر الرابط والبصمة للمثبّت');
ok(calls.includes('rm')&&calls.at(-1)==='install','يزيل المستمع ثم يستدعي install بعد نجاح التحميل');

// 3) فشل البصمة: لا install + رسالة عربية
calls.length=0;toasts.length=0;m=await mk(apk({dlErr:'HASH_MISMATCH'}));m.installTools(X);await window.upGo();
ok(!calls.includes('install'),'بصمة غير مطابقة: لا يفتح المثبّت');
ok(/بصمة الملف/.test(toasts.at(-1)||''),'رسالة واضحة لفشل البصمة');

// 4) اختلاف التوقيع: رسالة الانتقال
calls.length=0;toasts.length=0;m=await mk(apk({dlErr:'SIGNATURE_MISMATCH'}));m.installTools(X);await window.upGo();
ok(/موقّعة بمفتاح مختلف/.test(toasts.at(-1)||'')&&!calls.includes('install'),'اختلاف التوقيع: يشرح الحذف وإعادة التثبيت ولا يثبّت');

// 5) HTTP خطأ + خطأ مجهول لا يكسر
toasts.length=0;m=await mk(apk({dlErr:'HTTP_404'}));m.installTools(X);await window.upGo();
ok(/404/.test(toasts.at(-1)||''),'خطأ HTTP 404 يظهر رقمه');
toasts.length=0;m=await mk(apk({dlErr:'WHATEVER'}));m.installTools(X);await window.upGo();
ok(toasts.length===1,'خطأ مجهول يظهر كرسالة ولا يرمي استثناء');

// 6) بدون رابط: لا شيء
calls.length=0;upd={isActive:true,version:'4.1.2',url:''};m=await mk(apk());m.installTools(X);await window.upGo();
ok(calls.length===0,'بدون رابط لا يحدث شيء');

// 7) verCmp
const v=m.verCmp;ok(v('4.1.2','4.1.1')===1&&v('4.1.1','4.1.1')===0&&v('4.1','4.1.0')===0&&v('4.10','4.9')===1,'مقارنة الإصدارات');
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
