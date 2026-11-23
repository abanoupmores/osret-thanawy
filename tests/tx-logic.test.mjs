// يختبر تسلسل Transaction (حضور يدوي، منع التكرار، إلغاء بنقاط مسجّلة، ترحيبية مرة واحدة) فوق stub في الذاكرة.
// ملاحظة: يختبر منطق الـ Transaction فقط، لا Firestore Rules (تحتاج Emulator).
globalThis.window=globalThis;
const S=await import('./stubs/firebase.js');
const {doc,runTransaction,increment}=S;const db={};
let ok=true;const t=(n,a,b)=>{const g=JSON.stringify(a)===JSON.stringify(b);if(!g)ok=false;console.log(g?'PASS':'FAIL',n,g?'':'got '+JSON.stringify(a)+' expected '+JSON.stringify(b))};
const DB=window.__DB;DB.members={M1:{name:'أ',points:10,attended:2,welcomeEligible:true,welcomePaid:false},OLD:{name:'قديم',points:3,attended:1}};
async function checkIn(ev,m,pts,late,byS){const attId=ev.id+'_'+m.id,ref=doc(db,'attendance',attId),mref=doc(db,'members',m.id);
 return runTransaction(db,async tx=>{const a=await tx.get(ref);if(a.exists())return 'dup';const ms=await tx.get(mref);if(!ms.exists())return 'nom';
  tx.set(ref,{eventId:ev.id,memberId:m.id,pts,status:late?'l':'p',manual:!!byS});tx.update(mref,{points:increment(pts),attended:increment(1),lastAtt:attId});return 'ok'})}
async function cancel(aid,mid){return runTransaction(db,async tx=>{const ar=doc(db,'attendance',aid),a=await tx.get(ar);if(!a.exists())return null;const p=+a.data().pts||0,mr=doc(db,'members',a.data().memberId||mid),ms=await tx.get(mr);tx.delete(ar);if(ms.exists())tx.update(mr,{points:increment(-p),attended:increment(-1)});return p})}
const ev={id:'E1'};
t('حضور يدوي أول مرة',await checkIn(ev,{id:'M1'},4,true,true),'ok');
t('النقاط والحضور اتحدّثوا معًا',[DB.members.M1.points,DB.members.M1.attended,DB.attendance.E1_M1.pts,DB.members.M1.lastAtt],[14,3,4,'E1_M1']);
t('منع تسجيل مرتين',await checkIn(ev,{id:'M1'},5,false,true),'dup');
t('لا نقاط مكررة',[DB.members.M1.points,DB.members.M1.attended],[14,3]);
t('مخدوم غير موجود',await checkIn(ev,{id:'NOPE'},5,false,true),'nom');
t('لا سجل حضور يتيم',(DB.attendance||{}).E1_NOPE,undefined);
t('إلغاء يعكس النقاط المسجّلة فعلًا (4 لا 5)',await cancel('E1_M1','M1'),4);
t('بعد الإلغاء',[DB.members.M1.points,DB.members.M1.attended,DB.attendance.E1_M1],[10,2,undefined]);
t('إلغاء مرتين لا يخصم',await cancel('E1_M1','M1'),null);
t('الرصيد ثابت بعد الإلغاء الثاني',DB.members.M1.points,10);
async function welcome(id,p){const mref=doc(db,'members',id),aref=doc(db,'adjustments','welcome_'+id);
 return runTransaction(db,async tx=>{const ms=await tx.get(mref);if(!ms.exists())return 'nom';const d=ms.data();if(d.welcomeEligible!==true)return 'inel';if(d.welcomePaid===true)return 'paid';if((await tx.get(aref)).exists())return 'paid';
  tx.set(aref,{memberId:id,pts:p,type:'welcome'});tx.update(mref,{points:increment(p),welcomePaid:true,welcomePts:p});return p})}
t('ترحيبية: المؤهل',await welcome('M1',5),5);
t('ترحيبية: الرصيد',[DB.members.M1.points,DB.members.M1.welcomePaid,DB.adjustments.welcome_M1.type],[15,true,'welcome']);
t('ترحيبية: لا تتكرر',await welcome('M1',5),'paid');
t('ترحيبية: الرصيد ثابت',DB.members.M1.points,15);
t('ترحيبية: المخدوم القديم (بدون حقل) غير مؤهل',await welcome('OLD',5),'inel');
t('ترحيبية: القديم لم يتغير',DB.members.OLD.points,3);
process.exit(ok?0:1);
