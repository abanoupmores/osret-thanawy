// اختبار قواعد Firestore على Firebase Emulator (يحتاج Java + firebase-tools + إنترنت لتنزيل الـ emulator أول مرة).
// التشغيل: npm i -D @firebase/rules-unit-testing firebase-tools ثم:  npm run test:rules
// ⚠ هذا الملف لم يُشغَّل داخل بيئة التسليم (لا إنترنت/emulator هناك) — شغّله قبل الاعتماد على القواعد.
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,deleteDoc,collection,getDocs,query,where,addDoc,writeBatch} from 'firebase/firestore';
import fs from 'fs';
const env=await initializeTestEnvironment({projectId:'rules-test',firestore:{rules:fs.readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});
let bad=0;const T=async(name,p)=>{try{await p;console.log('PASS',name)}catch(e){bad++;console.log('FAIL',name,String(e.message||e).slice(0,160))}};
const U=(id,d)=>({name:id,phone:'0100',memberId:'',createdAt:1,status:'active',...d});
await env.withSecurityRulesDisabled(async ctx=>{const d=ctx.firestore();
  await setDoc(doc(d,'users/adm'),U('adm',{role:'admin',section:'general'}));
  await setDoc(doc(d,'users/sb'),U('sb',{role:'servant',section:'boys'}));
  await setDoc(doc(d,'users/sg'),U('sg',{role:'servant',section:'girls'}));
  await setDoc(doc(d,'users/mb'),U('mb',{role:'member',section:'boys',memberId:'MB'}));
  await setDoc(doc(d,'users/mg'),U('mg',{role:'member',section:'girls',memberId:'MG'}));
  await setDoc(doc(d,'users/pend'),U('pend',{role:'servant',section:'boys',status:'pending'}));
  await setDoc(doc(d,'members/MB'),{name:'b',section:'boys',points:0,attended:0,uid:'mb',approved:true});
  await setDoc(doc(d,'members/MG'),{name:'g',section:'girls',points:0,attended:0,uid:'mg',approved:true});
  await setDoc(doc(d,'events/EB'),{title:'b',section:'boys',when:Date.now()+1e6,type:'rehearsal'});
  await setDoc(doc(d,'events/EG'),{title:'g',section:'girls',when:Date.now()+1e6,type:'rehearsal'});
  await setDoc(doc(d,'events/EBOTH'),{title:'both',section:'both',when:Date.now()+1e6,type:'other'});
});
const as=id=>env.authenticatedContext(id).firestore();
const Q=(d,c,s)=>getDocs(query(collection(d,c),where('section','in',s)));
// 1-5 دخول الأدوار وقراءة النطاق الصحيح
await T('boys member reads own section members',assertSucceeds(Q(as('mb'),'members',['boys','both'])));
await T('girls servant reads girls members',assertSucceeds(Q(as('sg'),'members',['girls','both'])));
await T('admin reads both sections (no filter)',assertSucceeds(getDocs(collection(as('adm'),'members'))));
// 6-7 عزل الأقسام
await T('boys servant CANNOT read girls members query',assertFails(Q(as('sb'),'members',['girls','both'])));
await T('boys servant CANNOT read girls member by id',assertFails(getDoc(doc(as('sb'),'members/MG'))));
await T('girls servant CANNOT read boys event by id',assertFails(getDoc(doc(as('sg'),'events/EB'))));
await T('girls servant CANNOT write boys event',assertFails(updateDoc(doc(as('sg'),'events/EB'),{title:'x'})));
await T('boys servant reads both-section event',assertSucceeds(getDoc(doc(as('sb'),'events/EBOTH'))));
await T('servant CANNOT edit both-section event',assertFails(updateDoc(doc(as('sb'),'events/EBOTH'),{title:'x'})));
await T('servant CANNOT create event for other section',assertFails(setDoc(doc(as('sb'),'events/new1'),{title:'x',section:'girls',when:1,type:'other'})));
await T('admin creates both-section event',assertSucceeds(setDoc(doc(as('adm'),'events/new2'),{title:'x',section:'both',when:1,type:'other'})));
// 8 المخدوم لا يستعمل وظائف الخادم
await T('member CANNOT create event',assertFails(setDoc(doc(as('mb'),'events/new3'),{title:'x',section:'boys',when:1,type:'other'})));
await T('member CANNOT edit another member',assertFails(updateDoc(doc(as('mb'),'members/MB'),{points:999})));
await T('member CANNOT read servant chat',assertFails(getDocs(collection(as('mb'),'servantChat/boys/messages'))));
await T('boys servant CANNOT read girls chat room',assertFails(getDocs(collection(as('sb'),'sectionChats/girls/messages'))));
// 9-10 لا ترقية ذاتية ولا تغيير قسم
await T('member CANNOT change own role',assertFails(updateDoc(doc(as('mb'),'users/mb'),{role:'servant'})));
await T('member CANNOT make self admin',assertFails(updateDoc(doc(as('mb'),'users/mb'),{role:'admin',section:'general'})));
await T('member CANNOT change own section',assertFails(updateDoc(doc(as('mb'),'users/mb'),{section:'girls'})));
await T('member CANNOT change own status',assertFails(updateDoc(doc(as('mb'),'users/mb'),{status:'active'})));
await T('servant CANNOT approve self (pending)',assertFails(updateDoc(doc(as('pend'),'users/pend'),{status:'active'})));
await T('member CAN edit own name',assertSucceeds(updateDoc(doc(as('mb'),'users/mb'),{name:'new'})));
await T('nobody can self-register as admin',assertFails(setDoc(doc(env.authenticatedContext('x1').firestore(),'users/x1'),{name:'x',role:'admin',section:'general',status:'active',memberId:'',createdAt:1})));
await T('self-register as active servant denied',assertFails(setDoc(doc(env.authenticatedContext('x2').firestore(),'users/x2'),{name:'x',role:'servant',section:'boys',status:'active',memberId:'',createdAt:1})));
await T('self-register as pending servant allowed',assertSucceeds(setDoc(doc(env.authenticatedContext('x3').firestore(),'users/x3'),{name:'x',role:'servant',section:'boys',status:'pending',memberId:'',createdAt:1})));
await T('pending servant CANNOT read members',assertFails(Q(as('pend'),'members',['boys','both'])));
// 11 المدير
await T('admin approves servant',assertSucceeds(updateDoc(doc(as('adm'),'users/pend'),{status:'active'})));
await T('boys servant CANNOT suspend a servant',assertFails(updateDoc(doc(as('sb'),'users/pend'),{status:'suspended'})));
await T('boys servant CAN suspend boys member',assertSucceeds(updateDoc(doc(as('sb'),'users/mb'),{status:'suspended'})));
await T('girls servant CANNOT suspend boys member',assertFails(updateDoc(doc(as('sg'),'users/mb'),{status:'active'})));
await T('suspended member loses access',assertFails(Q(as('mb'),'members',['boys','both'])));
// مسابقات الرابط
await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'linkContests/CB'),{title:'t',url:'https://forms.gle/x',maxPts:10,section:'boys',closed:false})});
await T('boys servant creates contest',assertSucceeds(setDoc(doc(as('sb'),'linkContests/c1'),{title:'t',url:'https://forms.gle/x',maxPts:10,section:'boys',closed:false})));
await T('contest with http link denied',assertFails(setDoc(doc(as('sb'),'linkContests/c2'),{title:'t',url:'http://x.com/a',maxPts:10,section:'boys',closed:false})));
await T('boys servant CANNOT create girls contest',assertFails(setDoc(doc(as('sb'),'linkContests/c3'),{title:'t',url:'https://forms.gle/x',maxPts:10,section:'girls',closed:false})));
await T('member CANNOT create contest',assertFails(setDoc(doc(as('mb'),'linkContests/c4'),{title:'t',url:'https://forms.gle/x',maxPts:10,section:'boys',closed:false})));
await T('girls member CANNOT read boys contest',assertFails(getDoc(doc(as('mg'),'linkContests/CB'))));
await T('servant awards 8/10',assertSucceeds(setDoc(doc(as('sb'),'adjustments/lc_CB_MB'),{type:'contest',contestId:'CB',memberId:'MB',section:'boys',pts:8,reason:'x',by:'sb',at:1})));
await T('servant CANNOT award above max',assertFails(setDoc(doc(as('sb'),'adjustments/lc_CB_MB2'),{type:'contest',contestId:'CB',memberId:'MB',section:'boys',pts:11,reason:'x',by:'sb',at:1})));
await T('member CANNOT award himself',assertFails(setDoc(doc(as('mb'),'adjustments/lc_CB_MB3'),{type:'contest',contestId:'CB',memberId:'MB',section:'boys',pts:10,reason:'x',by:'mb',at:1})));
// نقاط الأنشطة
const act=(id,d)=>setDoc(doc(as('sb'),'adjustments/'+id),d);
const A=(o)=>({memberId:'MB',section:'boys',type:'activity',date:'2026-11-26',reason:'x',by:'sb',at:1,...o});
await T('activity mass+tunic = 8 (defaults 5+3)',assertSucceeds(act('ac_2026-11-26_MB',A({items:{mass:true,tunic:true,communion:false,school:false},pts:8}))));
await T('activity wrong total denied',assertFails(act('ac_2026-11-25_MB',A({date:'2026-11-25',items:{mass:true,tunic:false,communion:false,school:false},pts:50}))));
await T('activity bad id denied',assertFails(act('zzz',A({items:{mass:true,tunic:false,communion:false,school:false},pts:5}))));
await T('girls servant CANNOT record activity for boys member',assertFails(setDoc(doc(as('sg'),'adjustments/ac_2026-11-24_MB'),A({date:'2026-11-24',items:{mass:true,tunic:false,communion:false,school:false},pts:5}))));
await T('manual points without reason denied',assertFails(addDoc(collection(as('sb'),'adjustments'),{memberId:'MB',section:'boys',pts:5,reason:'',by:'sb',at:1})));
await T('manual points with reason allowed',assertSucceeds(addDoc(collection(as('sb'),'adjustments'),{memberId:'MB',section:'boys',pts:5,reason:'مشاركة مميزة',by:'sb',at:1})));
await T('member CANNOT write activity',assertFails(setDoc(doc(as('mb'),'adjustments/ac_2026-11-23_MB'),A({date:'2026-11-23',by:'mb',items:{mass:true,tunic:false,communion:false,school:false},pts:5}))));
await env.cleanup();
console.log(bad?`\n${bad} FAILED`:'\nall passed');process.exit(bad?1:0);
