import {initializeApp} from 'firebase/app';
import {getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,onAuthStateChanged,updatePassword,deleteUser,sendPasswordResetEmail} from 'firebase/auth';
import {getFirestore,doc,setDoc,getDoc,collection,query,orderBy,limit,where,onSnapshot,writeBatch,increment,addDoc,updateDoc,deleteDoc,deleteField,getDocs,runTransaction,startAfter,serverTimestamp} from 'firebase/firestore';
import QRCode from 'qrcode';
import {Html5Qrcode} from 'html5-qrcode';
import {Capacitor} from '@capacitor/core';
import {LocalNotifications as LN} from '@capacitor/local-notifications';
import {Share} from '@capacitor/share';
import {Filesystem,Directory} from '@capacitor/filesystem';
import {CFG,VERSES,APP_VERSION} from './config.js';
import {BG,setBg,getBgKey,preview,splashBg} from './bg.js';
import {installExt,startExt} from './ext/index.js';
import {calcAuto,manualPts} from './pts.js';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const app=CFG.ready?initializeApp(CFG.firebase):null,auth=CFG.ready?getAuth(app):null,db=CFG.ready?getFirestore(app):null;

// ---------- ثوابت ----------
const CH={boys:'بنين',girls:'بنات'},CHK=Object.keys(CH);
const SECN={boys:'قسم البنين',girls:'قسم البنات',both:'البنين والبنات',all:'البنين والبنات',general:'المدير العام'};
const chName=k=>SECN[k]||'';
const TY={rehearsal:['📖','اجتماع'],concert:['🎉','فعالية'],other:['📌','نشاط']};
const IC={
link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
users:'<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c3 0 4.8 1.9 4.8 5"/>',
check:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2.2 2.2L15.5 13"/>',
cal:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M12 14h2M8 17h2M12 17h2"/>',
star:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/>',
bell:'<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',
dots:'<circle cx="7" cy="7" r="1.8"/><circle cx="17" cy="7" r="1.8"/><circle cx="7" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
cake:'<path d="M4 20h16v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path d="M4 16c2 1.5 3 1.5 4 0s2-1.5 4 0 3 1.5 4 0 2-1.5 4 0M12 12V8M12 5.5v.5"/>',
qr:'<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h3v3h-3zM19 14h1.5M14 19.5h1.5M18 18v2.5h2.5"/>',
edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
share:'<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
back:'<path d="M15 5l-7 7 7 7"/>',
chev:'<path d="M15 6l-6 6 6 6"/>',
out:'<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
book:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
chart:'<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
img:'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4.5 3.5"/>',
cup:'<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
cam:'<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'};
const ic=(n,c='')=>`<svg class="i ${c}" viewBox="0 0 24 24">${IC[n]}</svg>`;

// ---------- الحالة ----------
let uid,me,page='home',arg=null,hist=[],vint=null,entry=null,fch='all',mq='',bt=null,atab='qr',rt='m',ptM=null,tmpPhoto='',scanner=null,scanKind='event',scanBusy=0,vi=0,booted=0,nInit=0,mode='in',loginAs=null,pend=null,st;
const freshS=()=>({members:[],pendM:[],events:[],att:[],notifs:[],adj:[],cfg:{},hymns:[],folders:[],polls:[],votes:[],linkContests:[],upd:null,weekly:null,reqs:[],users:[]});
let unsubs=[],S=freshS();
const qrs={},qpend=new Set();
// الأدوار: member | servant | admin (المدير العام). المدير يستخدم نفس شاشات الخادم + لوحة إدارة. الصلاحيات الحقيقية تُفرض في firestore.rules.
const isA=()=>!!me&&me.role==='admin';
const isS=()=>!!me&&(me.role==='servant'||me.role==='admin');
let wsec=(()=>{try{const v=localStorage.getItem('wsec');return ['boys','girls','all'].includes(v)?v:'boys'}catch(e){return 'boys'}})();
// نطاق القراءة: [قسمي,'both'] للجميع؛ المدير في عرض «الكل» بلا فلتر (القواعد تسمح له فقط)
const scopeSecs=()=>me?(isA()?(wsec==='all'?null:[wsec,'both']):[me.section,'both']):[];
const SQ=(name,...c)=>{const s=scopeSecs();return query(collection(db,name),...(s?[where('section','in',s)]:[]),...c)};
// القسم الذي يُوسَم به أي مستند جديد: الخادم دائمًا قسمه، المدير يختار (boys/girls/both)
const newSec=want=>isA()?(['boys','girls','both'].includes(want)?want:(wsec==='boys'||wsec==='girls'?wsec:'')):(me?me.section:'');
const secOpts=(both,sel)=>{const L2=isA()?[...(both?[['both','البنين والبنات معًا']]:[]),['boys','قسم البنين'],['girls','قسم البنات']]:[[me.section,SECN[me.section]]];const s0=sel||(isA()?(wsec==='boys'||wsec==='girls'?wsec:(both?'both':'boys')):me.section);return L2.map(([k,n])=>`<option value="${k}" ${k===s0?'selected':''}>${n}</option>`).join('')};
const secLogo=s=>s==='boys'?'logo-boys.png':s==='girls'?'logo-girls.png':'logo.png';
const curSecKey=()=>me?(isA()?(wsec==='all'?'':wsec):me.section):(entry&&(entry.sec==='boys'||entry.sec==='girls')?entry.sec:'');
const C=()=>({max:5,step:5,open:15,close:60,zero:30,concert:75,solo:85,low:60,welcomePts:5,...S.cfg});
const mem=()=>me&&S.members.find(m=>m.id===me.memberId);

// ---------- أدوات ----------
const norm=v=>String(v||'').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g,'').slice(-10);
const PHONE_DOM='@phone.osret-thanawy.app';
const toMail=v=>{v=String(v||'').trim();if(v.includes('@'))return v.toLowerCase();const d=norm(v);return d.length>=10?'0'+d+PHONE_DOM:''};
const fmt=ms=>new Date(ms).toLocaleString('ar-EG',{weekday:'long',day:'numeric',month:'long',hour:'numeric',minute:'2-digit'});
const fmtD=ms=>new Date(ms).toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const ago=ms=>{const m=Math.round((Date.now()-ms)/6e4);if(m<1)return 'الآن';if(m<60)return 'منذ '+m+' د';const h=Math.round(m/60);if(h<24)return 'منذ '+h+' س';return 'منذ '+Math.round(h/24)+' يوم'};
const toast=(t,ok=1)=>{const e=$('#toast');e.textContent=t;e.className='show '+(ok?'ok':'bad');clearTimeout(toast.t);toast.t=setTimeout(()=>e.className='',3200)};
const ERR=e=>({'auth/email-already-in-use':'الحساب ده موجود، سجّل دخول','auth/invalid-credential':'الرقم أو الباسورد غلط','auth/wrong-password':'الرقم أو الباسورد غلط','auth/user-not-found':'الرقم أو الباسورد غلط','auth/weak-password':'الباسورد 6 على الأقل','auth/invalid-email':'اكتب رقم تليفون أو إيميل صحيح','auth/network-request-failed':'مفيش اتصال بالنت','auth/too-many-requests':'محاولات كتير، استنى شوية','auth/operation-not-allowed':'فعّل Email/Password في Firebase'}[e.code]||'حصلت مشكلة، حاول تاني');
const av=(m,c='')=>`<span class="av ${c}">${m&&m.photo?`<img src="${m.photo}" alt="">`:esc(((m&&m.name)||'؟')[0])}</span>`;
const wa=p=>`https://wa.me/20${norm(p)}`;
const phoneShow=p=>p?'0'+norm(p):'بدون رقم';
function qrImg(txt,cls='qr'){if(qrs[txt])return `<img class="${cls}" src="${qrs[txt]}" alt="QR">`;if(!qpend.has(txt)){qpend.add(txt);QRCode.toDataURL(txt,{width:420,margin:1,color:{dark:'#0f2a5c'}}).then(u=>{qrs[txt]=u;render(2)})}return `<div class="${cls}" style="height:${cls==='qr'?210:104}px"></div>`}
function nextBd(b){if(!b)return null;const [y,mo,d]=b.split('-').map(Number),n=new Date(),s=new Date(n.getFullYear(),n.getMonth(),n.getDate());let t=new Date(n.getFullYear(),mo-1,d);if(t<s)t=new Date(n.getFullYear()+1,mo-1,d);return{t,days:Math.round((t-s)/864e5),age:t.getFullYear()-y}}

// ---------- النقاط والحضور ----------
// قبل الميعاد بـ open دقيقة (حد أقصى 30) حتى الميعاد = max نقاط، وبعده تُخصم نقطة كل step دقيقة، وبعد zero دقيقة بلا نقاط، ويُقفل بعد close دقيقة
function calc(ev,now){return calcAuto(C(),ev,now)}
function evFor(m){const c=C(),n=Date.now();return S.events.filter(e=>e.type==='rehearsal'&&e.when+c.close*6e4<n&&e.when>=(m.added||0)-864e5&&(e.section==='both'||e.section===m.section))}
function stat(m,days){let E=evFor(m);if(days)E=E.filter(e=>e.when>Date.now()-days*864e5);const ids=new Set(E.map(e=>e.id)),a=S.att.filter(x=>x.memberId===m.id&&ids.has(x.eventId)).length;return{t:E.length,a,p:E.length?Math.round(a/E.length*100):null}}
function elig(p){const c=C();if(p===null)return['لا توجد بيانات','gray'];if(p>=c.solo)return['ملتزم ممتاز','ok'];if(p>=c.concert)return['ملتزم','wa'];return['محتاج افتقاد','no']}
const col=p=>p===null?'#8a93aa':p>=C().solo?'#1f9d6b':p>=C().concert?'#d98e1c':'#d6455d';
// 4.1.0: عملية ذرّية (Transaction): attendance + members.points/attended معًا أو لا شيء، ومنع التكرار.
// opt (للخادم فقط): {mode:'auto'|'ontime'|'late'|'custom', late, custom} — انظر src/pts.js
async function checkIn(ev,m,byS,opt){
 if(!byS&&ev.section!=='both'&&ev.section!==m.section)return 'الحدث ده لقسم تاني';
 const attId=ev.id+'_'+m.id,ref=doc(db,'attendance',attId),mref=doc(db,'members',m.id);
 let r;
 if(byS){r=manualPts(C(),ev,Date.now(),opt||{mode:calc(ev,Date.now())?'auto':'ontime'});if(!r)return 'قيمة النقاط غير صالحة'}
 else{r=calc(ev,Date.now());if(!r)return Date.now()<ev.when?'التسجيل لسه ماتفتحش':'التسجيل اتقفل، كلّم الخادم'}
 const res=await runTransaction(db,async tx=>{
  const a=await tx.get(ref);if(a.exists())return 'dup';
  const ms=await tx.get(mref);if(!ms.exists())return 'nom';
  tx.set(ref,{eventId:ev.id,memberId:m.id,name:m.name,section:m.section,title:ev.title,when:ev.when,status:r.late>0?'l':'p',pts:r.pts,at:Date.now(),manual:!!byS,...(byS?{by:me.name||''}:{})});
  tx.update(mref,{points:increment(r.pts),attended:increment(1),lastAtt:attId});
  return 'ok';
 });
 if(res==='dup')return 'اتسجل حضوره قبل كده ✔';
 if(res==='nom')return 'سجل المخدوم غير موجود';
 return{r};
}
const okMsg=(x,m)=>{const who=m&&isS()?m.name+': ':'';return who+(x.r.late?`اتسجل (متأخر ${x.r.late} د): +${x.r.pts} نقطة`:`🎉 في الميعاد: +${x.r.pts} نقطة`)};

// ---------- الدخول والتسجيل (5.0.0: أقسام بنين/بنات + مدير عام + موافقة على الحسابات) ----------
// ملاحظة أمنية: اختيار القسم/الدور هنا تسهيل للواجهة فقط. الحماية الفعلية في firestore.rules (دور/قسم/حالة الحساب من مستند users).
const head=()=>{const k=curSecKey();return `<div class="hhead"><div class="panel"><div class="logos"><img class="lg-main" src="logo.png" alt="">${k?`<img class="lg-sec" src="${secLogo(k)}" alt="">`:''}</div><b>${esc(CFG.service)}</b><small>${esc(CFG.church)}${k?' · '+SECN[k]:''}</small></div></div>`};
function profileForm(p={}){return `<input id="nm" placeholder="الاسم بالكامل" value="${esc(p.n||'')}"><input id="ph" inputmode="tel" placeholder="رقم التليفون" value="${esc(p.ph||'')}"><div id="kM"><label>تاريخ الميلاد</label><input id="birth" type="date" value="${esc(p.birth||'')}"><label>صورتك (اختياري)</label><input id="profilePhoto" type="file" accept="image/*" onchange="ph(this)"></div>`}
const readForm=()=>{const o=$('#osec'),r=o?$('#orole').value:entry.role,s=o?o.value:entry.sec;return{n:$('#nm').value.trim(),ph:norm($('#ph').value),role:r,section:s,birth:r==='member'?($('#birth').value||''):'',photo:r==='member'?tmpPhoto:''}};
function entryOk(u){
 if(!entry)return true;
 if(entry.sec==='admin'){if(u.role!=='admin'){toast('هذا الحساب ليس حساب المدير العام',0);return false}return true}
 if(u.role==='admin'){toast('حساب المدير العام يدخل من «دخول المدير العام»',0);return false}
 if(u.section!==entry.sec){toast('الحساب ده تابع لـ '+SECN[u.section]+'، اختار القسم الصح',0);return false}
 if(entry.role&&u.role!==entry.role){toast('الحساب ده مسجّل كـ '+(u.role==='servant'?'خادم':'مخدوم')+'، اختار الزر الصح',0);return false}
 return true}
if(CFG.ready)onAuthStateChanged(auth,async u=>{
 if(!u){uid=null;me=null;return login()}
 uid=u.uid;
 try{
  const d=await getDoc(doc(db,'users',uid));
  if(!d.exists()){if(pend)await mkUser(pend);else onboard();return}
  const p=d.data();
  const okShape=(p.role==='admin'&&p.section==='general')||((p.role==='member'||p.role==='servant')&&(p.section==='boys'||p.section==='girls'));
  if(!okShape){await signOut(auth);toast('بيانات الحساب غير صالحة، كلّم المدير العام',0);return}
  me={id:uid,...p};
  if(!entryOk(me)){await signOut(auth);return}
  if(me.status==='pending'){pending();return}
  if(me.status==='suspended'||me.status==='rejected'){const m=me.status==='suspended'?'الحساب موقوف، كلّم المدير العام أو خادم القسم':'تم رفض طلب التسجيل، كلّم الخادم المسؤول';await signOut(auth);toast(m,0);return}
  if(me.status!=='active'){await signOut(auth);toast('حالة الحساب غير معروفة',0);return}
  if(me.mustChangePw){forcePw();return}
  start();
 }catch(e){toast('تعذر تحميل الحساب. راجع الاتصال وقواعد Firebase',0)}
});
const rolBtn=(cls,r,t,s)=>`<button class="role ${cls}" onclick="pr('${r}')"><span><b>${t}</b><small>${s}</small></span><span class="ico">${ic('user')}</span></button>`;
const loginForm=(t,canReg)=>`<div class="card">${entry.sec!=='admin'?`<div class="secbadge"><img src="${secLogo(entry.sec)}" alt=""><b>${t}</b></div>`:`<h3 style="text-align:center;font-size:18px">${t}</h3>`}<input id="ct" inputmode="email" autocomplete="username" placeholder="رقم التليفون أو الإيميل"><input id="pw" type="password" autocomplete="current-password" placeholder="الباسورد"><button class="btn g" onclick="sub()">دخول</button><div style="height:8px"></div><button class="btn sm o" onclick="forgot()">نسيت كلمة السر؟</button>${canReg?`<div style="height:8px"></div><button class="btn o" onclick="tg()">إنشاء حساب جديد</button>`:''}<div style="height:8px"></div><button class="btn o" onclick="${entry.sec==='admin'?'pe(null)':'pr(null)'}">رجوع</button></div>`;
function login(){
 document.body.dataset.page='login';document.body.dataset.sec=curSecKey();$('#nav').innerHTML='';let h='';
 if(!CFG.ready){$('#app').innerHTML=`<div class="wrap">${head()}<div class="pg"><div class="card"><h3>الإعداد ناقص ⚙️</h3><div class="s">لم يتم ضبط إعدادات Firebase بعد. املأ الملف <b dir="ltr">src/firebase-config.json</b> بقيم مشروعك ثم أعد البناء (الخطوات في FIREBASE-SETUP-AR.md).</div></div></div></div>`;return}
 if(!entry){
  h=`<div class="card"><h3 style="text-align:center;font-size:18px">اختر قسمك</h3><div class="secpick"><button class="secbtn boys" onclick="pe('boys')"><img src="logo-boys.png" alt=""><b>قسم البنين</b><small>أسرة رجالة ثانوي</small></button><button class="secbtn girls" onclick="pe('girls')"><img src="logo-girls.png" alt=""><b>قسم البنات</b><small>أسرة تماف إيريني ثانوي بنات</small></button></div></div><button class="btn o admlink" onclick="pe('admin')">${ic('user')} دخول المدير العام</button>`;
 }else if(entry.sec==='admin'){h=loginForm('دخول المدير العام',false)}
 else if(!entry.role){
  h=`<div class="card"><div class="secbadge"><img src="${secLogo(entry.sec)}" alt=""><b>${SECN[entry.sec]}</b></div>${rolBtn('m','member','مخدوم','الدخول أو التسجيل كمخدوم')}${rolBtn('s','servant','خادم','الدخول أو التسجيل كخادم')}<button class="btn o" onclick="pe(null)">رجوع</button></div>`;
 }else if(mode==='up'){
  h=`<div class="card"><div class="secbadge"><img src="${secLogo(entry.sec)}" alt=""><b>تسجيل ${entry.role==='servant'?'خادم':'مخدوم'} — ${SECN[entry.sec]}</b></div>${profileForm()}<input id="ct" inputmode="email" autocomplete="username" placeholder="رقم التليفون أو الإيميل (لتسجيل الدخول)"><input id="pw" type="password" autocomplete="new-password" placeholder="الباسورد (6 أحرف على الأقل)"><div class="s" style="margin-bottom:8px">بعد التسجيل، حسابك بيتفعّل بعد موافقة ${entry.role==='servant'?'المدير العام':'خادم القسم أو المدير العام'}.</div><button class="btn g" onclick="sub()">إرسال طلب التسجيل</button><div style="height:10px"></div><button class="btn o" onclick="tg()">عندي حساب بالفعل</button></div>`;
 }else h=loginForm('دخول '+(entry.role==='servant'?'الخادم':'المخدوم')+' — '+SECN[entry.sec],true);
 $('#app').innerHTML=`<div class="wrap">${head()}<div class="pg">${h}${verseCard()}</div></div>`;
 if(mode==='up'&&entry&&entry.role==='servant'){const k=$('#kM');if(k)k.style.display='none'}
}
window.pe=s=>{entry=s?{sec:s,role:null}:null;mode='in';tmpPhoto='';login()};
window.pr=r=>{if(!entry)return;entry.role=r;mode='in';tmpPhoto='';login()};
window.tg=()=>{mode=mode==='in'?'up':'in';tmpPhoto='';login()};
window.forgot=async()=>{const v=($('#ct').value||'').trim();
 if(!v.includes('@')){toast('الحساب بالرقم: اطلب من الخادم أو المدير العام إعادة تعيين الباسورد',0);return}
 try{await sendPasswordResetEmail(auth,v.toLowerCase());toast('لو الإيميل مسجّل هيوصلك رابط إعادة التعيين')}catch(e){toast(ERR(e),0)}};
window.sub=async()=>{
 const ct=$('#ct').value.trim(),id=toMail(ct),pw=$('#pw').value;
 if(!id){toast('اكتب رقم تليفون صحيح أو إيميل',0);return}if(pw.length<6){toast('الباسورد 6 على الأقل',0);return}
 try{
  if(mode==='in'||!entry||entry.sec==='admin')await signInWithEmailAndPassword(auth,id,pw);
  else{const f=readForm();if(!f.n||!f.ph){toast('اكتب الاسم ورقم التليفون',0);return}pend={...f,c:ct};await createUserWithEmailAndPassword(auth,id,pw)}
 }catch(e){pend=null;toast(ERR(e),0)}
};
function onboard(p){
 $('#nav').innerHTML='';document.body.dataset.page='login';
 const s0=(p&&p.section)||(entry&&entry.sec!=='admin'&&entry.sec)||'boys',r0=(p&&p.role)||(entry&&entry.role)||'member';
 $('#app').innerHTML=`<div class="wrap">${head()}<div class="pg"><div class="card"><h3>كمّل بياناتك</h3><label>القسم</label><select id="osec"><option value="boys">قسم البنين</option><option value="girls">قسم البنات</option></select><label>أنا</label><select id="orole" onchange="onbChg()"><option value="member">مخدوم</option><option value="servant">خادم</option></select>${profileForm(p||{})}<div class="s" style="margin-bottom:8px">طلبك بيتراجع قبل تفعيل الحساب.</div><button class="btn g" onclick="fin()">إرسال الطلب</button><div style="height:10px"></div><button class="btn o" onclick="out()">خروج</button></div></div></div>`;
 $('#osec').value=s0;$('#orole').value=r0;onbChg()}
window.onbChg=()=>{const k=$('#kM');if(k)k.style.display=$('#orole').value==='member'?'block':'none'};
window.fin=async()=>{const f=readForm();if(!f.n||!f.ph){toast('اكتب الاسم ورقم التليفون',0);return}await mkUser({...f,c:(auth.currentUser.email||'').replace(PHONE_DOM,'')})};
async function mkUser(p){
 try{
  if(!['member','servant'].includes(p.role)||!['boys','girls'].includes(p.section))throw new Error('bad');
  const now=Date.now();let data;
  if(p.role==='servant'){
   data={name:p.n,role:'servant',section:p.section,status:'pending',contact:p.c||'',phone:p.ph||'',memberId:'',createdAt:now};
   await setDoc(doc(db,'users',uid),data);
  }else{
   const mr=doc(collection(db,'members'));
   data={name:p.n,role:'member',section:p.section,status:'pending',contact:p.c||'',phone:p.ph||'',memberId:mr.id,createdAt:now};
   const b=writeBatch(db);
   b.set(mr,{name:p.n,phone:p.ph||'',birth:p.birth||'',section:p.section,photo:p.photo||'',uid,points:0,attended:0,added:now,welcomeEligible:true,welcomePaid:false,approved:false});
   b.set(doc(db,'users',uid),data);await b.commit();
  }
  pend=null;tmpPhoto='';me={id:uid,...data};pending();
 }catch(e){const bad=e&&e.code==='permission-denied';pend=null;toast(bad?'تعذر إرسال الطلب: تأكد من نشر قواعد Firestore':'تعذر إنشاء الحساب، حاول تاني',0);onboard(p)}
}
function pending(){
 $('#nav').innerHTML='';document.body.dataset.page='login';document.body.dataset.sec=me.section;
 const who=me.role==='servant'?'المدير العام':'خادم القسم أو المدير العام';
 $('#app').innerHTML=`<div class="wrap">${head()}<div class="pg"><div class="card" style="text-align:center"><h3>طلبك قيد المراجعة ⏳</h3><div class="s" style="margin-bottom:12px">تم استلام طلب التسجيل في ${SECN[me.section]}. هيتفعّل حسابك بعد موافقة ${who}.</div><button class="btn g" onclick="chk()">تحديث الحالة</button><div style="height:10px"></div><button class="btn o" onclick="out()">خروج</button></div>${verseCard()}</div></div>`}
window.chk=async()=>{try{const d=await getDoc(doc(db,'users',uid));if(!d.exists())return;const p=d.data();me={id:uid,...p};
 if(p.status==='active'){if(p.mustChangePw)forcePw();else start()}
 else if(p.status==='pending')toast('لسه تحت المراجعة');
 else{await signOut(auth);toast(p.status==='suspended'?'الحساب موقوف':'تم رفض الطلب',0)}}catch(e){toast('تعذر التحديث',0)}};

function resetData(){X.ext.onNav&&X.ext.onNav();unsubs.forEach(f=>f());unsubs=[];booted=0;nInit=0;S=freshS();clearInterval(vint)}
window.out=async()=>{resetData();page='home';arg=null;hist=[];$('#nav').innerHTML='';entry=null;await signOut(auth)};
window.setW=k=>{if(!isA()||!['boys','girls','all'].includes(k)||k===wsec)return;wsec=k;try{localStorage.setItem('wsec',k)}catch(e){}resetData();start()};

// ---------- البيانات ----------
const L=(q,k)=>unsubs.push(onSnapshot(q,s=>{const a=s.docs.map(d=>({id:d.id,...d.data()}));if(k==='members'){S.pendM=a.filter(m=>m.approved===false);S.members=a.filter(m=>m.approved!==false)}else S[k]=a;render();sched()},e=>console.warn(k,e.code)));
function start(){
 if(booted)return;booted=1;entry=null;page='home';arg=null;hist=[];
 unsubs.push(onSnapshot(doc(db,'users',uid),s=>{if(!s.exists())return;const n={id:uid,...s.data()};if(n.status!=='active'||n.role!==me.role||n.section!==me.section){toast('تغيّرت حالة حسابك، سجّل دخول من جديد',0);out();return}me=n},()=>{}));
 unsubs.push(onSnapshot(doc(db,'config','main'),s=>{S.cfg=s.data()||{};render()},()=>{}));
 L(SQ('members',...(isS()?[]:[where('approved','==',true)]),limit(500)),'members');
 L(SQ('events',orderBy('when','desc'),limit(200)),'events');
 if(isS()){
  L(SQ('attendance',limit(5000)),'att');
  L(SQ('adjustments',limit(2000)),'adj');
  L(SQ('notifs',orderBy('at','desc'),limit(100)),'notifs');
 }else if(me.memberId){
  L(query(collection(db,'attendance'),where('memberId','==',me.memberId)),'att');
  L(query(collection(db,'adjustments'),where('memberId','==',me.memberId)),'adj');
  unsubs.push(onSnapshot(query(collection(db,'notifs'),where('section','in',[me.section,'both']),where('to','in',['all',me.memberId])),s=>{S.notifs=s.docs.map(x=>({id:x.id,...x.data()}));if(nInit){s.docChanges().forEach(c=>{if(c.type==='added'){const n=c.doc.data();toast('🔔 '+n.title);ping(n.title,n.body)}})}nInit=1;render();sched()},e=>console.warn('notifs',e.code)));
 }
 startExt(X);
 render();
 clearInterval(vint);vint=setInterval(()=>{vi++;const e=$('#vb');if(e){e.style.opacity=0;setTimeout(()=>{e.innerHTML=vtxt();e.style.opacity=1},600)}},9000);
}
const vtxt=()=>{const v=VERSES[vi%VERSES.length];return `${v[0]}<small>${v[1]}</small>`};
const verseCard=()=>`<div class="card"><div class="vb" id="vb">${vtxt()}</div></div>`;
const lastSeen=()=>+localStorage.getItem('ns_'+uid)||0;
const unread=()=>isS()?0:S.notifs.filter(n=>n.at>lastSeen()).length;

// ---------- إشعارات الجهاز ----------
const sched=()=>{clearTimeout(st);st=setTimeout(doSched,2500)};
async function ping(title,body){if(!Capacitor.isNativePlatform())return;try{await LN.schedule({notifications:[{id:Math.floor(Math.random()*9e5)+5e4,title,body,schedule:{at:new Date(Date.now()+600)}}]})}catch(e){}}
function weekSummary(){const R=S.members.map(x=>({x,p:stat(x).p})).filter(o=>o.p!==null),avg=R.length?Math.round(R.reduce((a,o)=>a+o.p,0)/R.length):0,low=R.filter(o=>o.p<C().low).sort((a,b)=>a.p-b.p);return{avg,low,n:R.length}}
async function doSched(){
 if(!Capacitor.isNativePlatform()||!me)return;
 try{
  const p=await LN.requestPermissions();if(p.display!=='granted')return;
  const pe=await LN.getPending();if(pe.notifications.length)await LN.cancel({notifications:pe.notifications.map(n=>({id:n.id}))});
  const A=[],now=Date.now(),m=mem();
  const rm=X.ext.rem?X.ext.rem():{d1:1,h1:1,m15:0,at:0,tue:1,bd:1},OF=X.ext.offs||[['d1',864e5,'بكرة'],['h1',36e5,'بعد ساعة']];
  S.events.filter(e=>e.when>now&&(isS()||!m||e.section==='both'||e.section===m.section)).sort((a,b)=>a.when-b.when).slice(0,20).forEach((e,i)=>{OF.forEach((o,j)=>{if(rm[o[0]]&&e.when-o[1]>now)A.push({id:3000+i*4+j,title:'تذكير: '+e.title,body:'ميعادها '+fmt(e.when)+' ('+o[2]+')',schedule:{at:new Date(e.when-o[1])}})})});
  if(isS()){
   const w=weekSummary(),names=w.low.slice(0,4).map(o=>o.x.name.split(' ')[0]+' '+o.p+'%').join('، ');
   const body='متوسط الحضور '+w.avg+'%'+(w.low.length?' — يحتاجون افتقاد: '+names:' — الكل ملتزم')+'. افتح التقرير للتفاصيل';
   for(let k=0;k<4&&rm.tue;k++){const d=new Date();d.setDate(d.getDate()+((2-d.getDay()+7)%7)+k*7);d.setHours(9,0,0,0);if(d.getTime()>now)A.push({id:2000+k,title:'📊 تقرير الحضور الأسبوعي',body,schedule:{at:d}})}
   S.members.slice(0,300).forEach((x,i)=>{if(!rm.bd)return;const b=nextBd(x.birth);if(!b)return;const dt=new Date(b.t.getFullYear(),b.t.getMonth(),b.t.getDate(),8,0);if(dt.getTime()>now&&dt.getTime()-now<60*864e5){const s=stat(x);A.push({id:1000+i,title:'🎂 عيد ميلاد '+x.name,body:'نسبة حضوره '+(s.p===null?'—':s.p+'%')+' — فرصة للافتقاد',schedule:{at:dt}})}})
  }
  if(A.length)await LN.schedule({notifications:A});
 }catch(e){}
}

// ---------- الإطار والتنقل ----------
const PG={};
const go=window.go=(p,a=null)=>{X.ext.onNav&&X.ext.onNav();hist.push([page,arg]);page=p;arg=a;render(1)};
window.tab=p=>{X.ext.onNav&&X.ext.onNav();hist=[];page=p;arg=null;render(1)};
window.back=()=>{X.ext.onNav&&X.ext.onNav();const h=hist.pop();if(h){page=h[0];arg=h[1]}else{page='home';arg=null}render(1)};
const cm=window.cm=()=>{$('#md').style.display='none';render(2)};
const om=h=>{$('#mb').innerHTML=h;$('#md').style.display='flex'};
function navBar(){
 const act=page==='notifs'?'notifs':page==='profile'?'profile':'home',u=unread();
 $('#nav').innerHTML=[['home','home','الرئيسية'],['notifs','bell','الإشعارات'],['profile','user','الملف الشخصي']].map(x=>`<button class="${act===x[0]?'on':''}" onclick="tab('${x[0]}')">${ic(x[1])}${x[2]}${x[0]==='notifs'&&u?`<b>${u}</b>`:''}</button>`).join('');
}
function render(f){
 if(!me)return;
 const a=document.activeElement;
 if(!f&&a&&['INPUT','TEXTAREA','SELECT'].includes(a.tagName))return;
 if($('#md').style.display==='flex'&&!f)return;
 document.body.dataset.page=page;document.body.dataset.sec=curSecKey();
 document.body.classList.toggle('custom-bg',!!getBgKey());
 const P=PG[page]||PG.home,el=$('#app'),y=el.scrollTop;
 const title=typeof P.t==='function'?P.t(arg):P.t,right=P.act?P.act(arg):'';
 el.innerHTML=`<div class="wrap">${P.bare?'':`<header class="top"><span style="width:42px">${right}</span><h1>${title}</h1><button class="ib" onclick="back()">${ic('back')}</button></header>`}${P.v(arg)}</div>`;
 navBar();el.scrollTop=f===1?0:y;
}
window.sv=(k,v)=>{if(k==='atab')atab=v;else if(k==='rt')rt=v;else if(k==='bt')bt=v;else if(k==='ptM')ptM=v;else if(k==='arg')arg=v;render(2)};
window.ptM_=id=>{ptM=id;$('#md').style.display='none';go('points')};
const pg=h=>`<div class="pg">${h}</div>`;

// ---------- الرئيسية ----------
const tile=(p,i,t,badge)=>`<button class="tile" onclick="go('${p}')">${badge?`<em>${badge}</em>`:''}${ic(i)}<span>${t}</span></button>`;
const polBadge=()=>{const n=X.ext.activePolls?X.ext.activePolls().length:0;return n&&!isS()?n:''};
PG.home={bare:1,v:()=>{
 const e=nextEv(isS()?null:mem()),m=mem();
 const T=isS()?[tile('members','users','مخدومي'),tile('attend','check','الحضور'),tile('sched','cal','الجداول والأنشطة'),tile('points','star','النقاط'),tile('hymns','music','الترانيم'),tile('competitions','cup','المسابقات'),tile('polls','poll','التصويت',polBadge()),tile('notifs','bell','الإشعارات',unread()||''),tile('chat','chat','الشات'),...(isS()?[tile('requests','users','طلبات التسجيل',(S.pendM.length+(isA()?S.users.filter(u=>u.status==='pending'&&u.role==='servant').length:0))||'')]:[]),...(isA()?[tile('admin','gear','لوحة المدير العام')]:[]),tile('more','dots','المزيد')]
  :[tile('attend','check','حضوري'),tile('sched','cal','الجداول والأنشطة'),tile('points','star','نقاطي'),tile('board','cup','لوحة الترتيب'),tile('hymns','music','الترانيم'),tile('competitions','cup','المسابقات'),tile('polls','poll','التصويت',polBadge()),tile('notifs','bell','الإشعارات',unread()||''),tile('chat','chat','الشات'),tile('more','dots','المزيد')];
 return head()+pg(`<section class="home-intro"><div class="home-intro-copy"><span class="eyebrow">أهلاً بيك في ${esc(curSecKey()?SECN[curSecKey()]:CFG.service)}</span><h2>${isA()?'أهلاً بالمدير العام':isS()?'ربنا يقوّي خدمتك':`أهلاً يا ${esc((me&&me.name||'صديقنا').split(' ')[0])}`}</h2><p>${esc(CFG.service)} — ${esc(CFG.church)}</p></div><span class="home-cross">✝</span></section><div class="home-section-head"><div><span class="eyebrow">مساحتك الروحية</span><h3>الخدمات والأقسام</h3></div><span class="section-mark">✦</span></div>${isA()?`<div class="chips">${[['boys','قسم البنين'],['girls','قسم البنات'],['all','عرض القسمين']].map(([k,n])=>`<button class="${wsec===k?'on':''}" onclick="setW('${k}')">${n}</button>`).join('')}</div>`:''}<div class="grid2 home-grid">${T.join('')}</div>${isS()?'':m?`<div class="card hero home-points"><div><div class="s">رصيد نقاطك</div><div class="pts">${m.points||0}</div><div class="s">${chName(m.section)} · نسبة حضورك ${stat(m).p===null?'—':stat(m).p+'%'}</div></div><span class="points-seal">✦</span></div>`:''}${X.ext.homeExtras?X.ext.homeExtras():''}<div class="home-section-head"><div><span class="eyebrow">تابع خدمتك</span><h3>الحدث القادم</h3></div></div><div class="card home-event">${e?`<div class="event-symbol">${TY[e.type][0]}</div><div class="event-copy"><b>${esc(e.title)}</b><div class="s">${fmt(e.when)}</div>${e.note?`<div class="event-note">${esc(e.note)}</div>`:''}</div>`:'<div class="event-symbol">✧</div><div class="event-copy"><b>مفيش أحداث قادمة</b><div class="s">تابع الإشعارات لمعرفة كل جديد</div></div>'}</div>${verseCard()}`);
}};
function nextEv(m){const n=Date.now(),c=C();return S.events.filter(e=>e.when+c.close*6e4>n&&(!m||e.section==='both'||e.section===m.section)).sort((a,b)=>a.when-b.when)[0]}

// ---------- المخدومين (للخادم) ----------
const ring=p=>{const r=29,c=2*Math.PI*r,v=p===null?0:p;return `<div class="ring"><svg viewBox="0 0 70 70"><circle cx="35" cy="35" r="${r}" fill="none" stroke="#e9e2cf" stroke-width="7"/><circle cx="35" cy="35" r="${r}" fill="none" stroke="${col(p)}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-v/100)}"/></svg><b style="color:${col(p)}">${p===null?'—':p+'%'}</b></div>`};
const mrow=x=>{const s=stat(x);return `<div class="li" onclick="go('member','${x.id}')">${av(x)}<div class="t"><b>${esc(x.name)}</b><span class="s">${phoneShow(x.phone)}${x.birth?' · '+x.birth:''}</span></div><div style="text-align:left"><span class="bdg">${chName(x.section)}</span><div class="s" style="color:${col(s.p)};font-weight:700">${s.p===null?'—':s.p+'%'}</div></div><span class="ch">${ic('chev')}</span></div>`};
const mlist=()=>{const q=mq.trim(),L2=S.members.filter(x=>(fch==='all'||x.section===fch)&&(!q||(x.name+' '+norm(x.phone)).includes(q))).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar'));return L2.map(mrow).join('')||'<div class="s" style="padding:10px">لسه مفيش مخدومين</div>'};
PG.members={t:'مخدومي',act:()=>`<button class="ib" onclick="mf()">${ic('plus')}</button>`,v:()=>pg(`<div class="search">${ic('search')}<input id="msq" placeholder="ابحث بالاسم أو رقم الهاتف" value="${esc(mq)}" oninput="sq(this.value)"></div>${isA()&&wsec==='all'?`<div class="chips">${['all',...CHK].map(x=>`<button class="${fch===x?'on':''}" onclick="setF('${x}')">${x==='all'?'الكل ('+S.members.length+')':chName(x)}</button>`).join('')}</div>`:''}<div class="card" id="ml">${mlist()}</div>`)};
window.sq=v=>{mq=v;$('#ml').innerHTML=mlist()};
window.setF=k=>{fch=k;render(2)};
PG.member={t:'بيانات المخدوم',act:id=>`<button class="ib" onclick="mf('${id}')">${ic('edit')}</button>`,v:id=>{
 const x=S.members.find(m=>m.id===id);if(!x)return pg('<div class="card s">المخدوم غير موجود</div>');
 const s=stat(x);
 return pg(`<div class="card" style="text-align:center">${av(x,'xl').replace('class="av xl"','class="av xl" style="margin:0 auto 8px"')}<h2 style="margin:6px 0">${esc(x.name)}</h2><span class="bdg">${chName(x.section)}</span>
 <div class="li" style="margin-top:12px"><span class="ch">${ic('phone')}</span><span class="t" style="text-align:right">${phoneShow(x.phone)}</span></div>
 <div class="li"><span class="ch">${ic('cake')}</span><span class="t" style="text-align:right">${x.birth||'—'}</span></div>${bdBtn(x)}
 <div class="row sp" style="padding-top:12px"><div style="text-align:right"><b>نسبة الحضور</b><div class="s">${s.a} من ${s.t} اجتماع</div></div>${ring(s.p)}</div>
 <div class="row sp" style="padding-top:8px"><div style="text-align:right"><b>رمز الحضور</b><div class="s">امسح الكود لتسجيل الحضور</div></div>${qrImg('KM|'+x.id,'qr sm')}</div>
 <div style="height:10px"></div><button class="btn" onclick="mfull('${x.id}')">عرض كامل البيانات</button><div style="height:8px"></div><button class="btn o" onclick="go('history','${x.id}')">${ic('hist')} سجل الحضور والغياب</button></div>${accCard(x)}${welcomeCard(x)}`);
}};
window.mfull=id=>{const x=S.members.find(m=>m.id===id),s=stat(x),e=elig(s.p),H=ledger(x).slice(0,12);
 om(`<div style="text-align:center">${av(x,'xl').replace('class="av xl"','class="av xl" style="margin:0 auto"')}<h2 style="margin:8px 0 2px">${esc(x.name)}</h2><span class="bdg">${chName(x.section)}</span></div><div class="card" style="margin-top:12px"><div class="row sp"><b style="font-size:26px;color:${col(s.p)}">${s.p===null?'—':s.p+'%'}</b><span class="pill ${e[1]}">${e[0]}</span></div><div class="s">${s.a} من ${s.t} اجتماع · ${x.points||0} نقطة${x.uid?' · عنده حساب 📱':' · بدون حساب'}</div></div><div class="card"><h3>آخر الحركات</h3>${H.map(ledRow).join('')||'<div class="s">لسه</div>'}</div><div class="row w"><button class="btn sm o" onclick="location.href='tel:0${norm(x.phone)}'">📞 اتصال</button><button class="btn sm o" onclick="window.open('${wa(x.phone)}','_blank')">واتساب</button><button class="btn sm o" onclick="mf('${x.id}')">تعديل</button><button class="btn sm g" onclick="ptM_('${x.id}')">النقاط ±</button></div>`)};
window.ph=inp=>{const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=160;const g=c.getContext('2d'),s=Math.min(im.width,im.height);g.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,160,160);tmpPhoto=c.toDataURL('image/jpeg',.7);if($('#pv'))$('#pv').innerHTML=`<img src="${tmpPhoto}" alt="">`};im.src=r.result};r.readAsDataURL(f)};
window.mf=id=>{const x=id?S.members.find(m=>m.id===id):{};tmpPhoto=x.photo||'';
 om(`<h3 style="margin-top:0">${id?'تعديل':'إضافة'} مخدوم</h3><div class="row"><span class="av" id="pv" style="width:64px;height:64px">${x.photo?`<img src="${x.photo}" alt="">`:ic('cam')}</span><input type="file" accept="image/*" onchange="ph(this)" style="margin:0"></div><div style="height:8px"></div><input id="fn" placeholder="الاسم" value="${esc(x.name||'')}"><input id="fp" inputmode="tel" placeholder="رقم التليفون" value="${esc(x.phone?'0'+norm(x.phone):'')}"><label>تاريخ الميلاد</label><input id="fb" type="date" value="${x.birth||''}">${id?`<div class="s" style="margin:4px 0 8px">القسم: ${chName(x.section)} (لا يمكن تغيير القسم)</div>`:`<label>القسم</label><select id="fc">${secOpts(false)}</select>`}${x.uid?'<div class="s" style="margin:4px 0 8px">تغيير الرقم لحساب مفعّل: بيتسجّل طلب إداري لتحديث رقم الدخول (لحد ما يتنفذ يفضل الدخول بالرقم القديم).</div>':''}<button class="btn g" onclick="sm('${id||''}')">حفظ</button>${id?`<div style="height:8px"></div><button class="btn no" onclick="dm('${id}')">حذف المخدوم</button>`:''}`)};
window.sm=async id=>{const n=$('#fn').value.trim();if(!n){toast('اكتب الاسم',0);return}
 const old=id?S.members.find(m=>m.id===id):null,sec0=id?old.section:newSec($('#fc')&&$('#fc').value);if(!sec0){toast('اختار القسم أولًا',0);return}
 const d={name:n,phone:norm($('#fp').value),birth:$('#fb').value,photo:tmpPhoto};
 const dup=d.phone&&S.members.find(m=>m.id!==id&&norm(m.phone)===d.phone);
 if(dup&&(dup.uid||(old&&old.uid))){toast('الرقم ده مربوط بحساب مخدوم تاني: '+dup.name,0);return}
 try{
  if(id){
   await updateDoc(doc(db,'members',id),d);
   if(old&&old.uid){
    try{await updateDoc(doc(db,'users',old.uid),{name:d.name,phone:d.phone});
     if(d.phone&&norm(old.phone)!==d.phone)await reqAdmin('changePhone',{targetUid:old.uid,memberId:id,newPhone:d.phone})}
    catch(e){toast('اتحفظت البيانات لكن تعذر تحديث حساب الدخول',0);$('#md').style.display='none';render(2);return}
   }
  }else await addDoc(collection(db,'members'),{...d,section:sec0,uid:'',points:0,attended:0,added:Date.now(),welcomeEligible:true,welcomePaid:false,approved:true});
  $('#md').style.display='none';render(2);toast('تم الحفظ')}catch(e){toast('فشل الحفظ: تأكد من القواعد',0)}};
window.dm=async id=>{if(confirm('حذف المخدوم نهائيًا؟')){await deleteDoc(doc(db,'members',id));$('#md').style.display='none';hist=[];page='members';render(1)}};

// ---------- الجداول والأنشطة ----------
const erow=(e,click)=>`<div class="li" ${click?`onclick="${click}"`:''}><span class="nic" style="background:#f4e8c6">${TY[e.type][0]}</span><div class="t"><b>${esc(e.title)}</b><span class="s">${fmt(e.when)} · ${chName(e.section)}</span>${e.note?`<span class="s">${esc(e.note)}</span>`:''}</div>${click?`<span class="ch">${ic('chev')}</span>`:''}</div>`;
PG.sched={t:'الجداول والأنشطة',v:()=>{
 const n=Date.now(),m=isS()?null:mem(),E=S.events.filter(e=>!m||e.section==='both'||e.section===m.section),cl=C().close*6e4,up=E.filter(e=>e.when+cl>=n).sort((a,b)=>a.when-b.when),past=E.filter(e=>e.when+cl<n).slice(0,12),click=e=>isS()?`openEv('${e.id}')`:'';
 return pg(`<div class="card"><h3>القادمة</h3>${up.map(e=>erow(e,click(e))).join('')||'<div class="s">مفيش</div>'}</div><div class="card"><h3>السابقة</h3>${past.map(e=>erow(e,click(e))).join('')||'<div class="s">مفيش</div>'}</div>${isS()?`<button class="fab" onclick="ef()">${ic('plus')}</button>`:''}`);
}};
window.openEv=id=>go('attend',id);
window.ef=()=>om(`<h3 style="margin-top:0">حدث جديد</h3><select id="et"><option value="rehearsal">اجتماع</option><option value="concert">فعالية</option><option value="other">نشاط آخر</option></select><input id="ei" placeholder="العنوان (مثال: اجتماع الأسرة)"><label>الميعاد</label><input id="ew" type="datetime-local"><label>القسم</label><select id="ec">${secOpts(true)}</select><input id="en" placeholder="ملاحظة (اختياري)"><button class="btn g" onclick="ne()">نشر وإبلاغ المخدومين</button>`);
window.ne=async()=>{const t=$('#ei').value.trim(),w=$('#ew').value;if(!t||!w){toast('اكتب العنوان والميعاد',0);return}
 const e={type:$('#et').value,title:t,when:new Date(w).getTime(),section:newSec($('#ec').value),note:$('#en').value.trim(),created:Date.now()};
 if(!e.section){toast('اختار القسم',0);return}
 try{await addDoc(collection(db,'events'),e);await addDoc(collection(db,'notifs'),{to:'all',section:e.section,kind:'event',title:TY[e.type][1]+' جديدة: '+t,body:'ميعادها '+fmt(e.when)+(e.note?' — '+e.note:''),at:Date.now()});$('#md').style.display='none';render(2);toast('تم النشر وإبلاغ المخدومين')}catch(x){toast('فشل النشر',0)}};

// ---------- الحضور ----------
function defEv(){const n=Date.now(),E=[...S.events];return E.find(e=>calc(e,n))||E.filter(e=>e.when>n).sort((a,b)=>a.when-b.when)[0]||E.sort((a,b)=>b.when-a.when)[0]}
const curEv=()=>S.events.find(e=>e.id===arg)||defEv();
PG.attend={t:()=>isS()?'تسجيل الحضور':'حضوري',v:()=>isS()?sAttend():mAttend()};
function sAttend(){
 const ev=curEv();if(!ev)return pg('<div class="card s">مفيش أحداث. أضف اجتماع من «الجداول والأنشطة».</div>');
 const M=S.members.filter(x=>ev.section==='both'||x.section===ev.section),A=Object.fromEntries(S.att.filter(a=>a.eventId===ev.id).map(a=>[a.memberId,a])),n=Object.keys(A).length,open=calc(ev,Date.now());
 const evs=[...S.events].sort((a,b)=>b.when-a.when).slice(0,25);
 return pg(`<select onchange="sv('arg',this.value)">${evs.map(e=>`<option value="${e.id}" ${e.id===ev.id?'selected':''}>${TY[e.type][0]} ${esc(e.title)} — ${new Date(e.when).toLocaleDateString('ar-EG',{day:'numeric',month:'short'})}</option>`).join('')}</select>
 <div class="tabs"><button class="${atab==='qr'?'on':''}" onclick="sv('atab','qr')">بالـ QR</button><button class="${atab==='man'?'on':''}" onclick="sv('atab','man')">يدوي</button></div>
 <div class="card" style="text-align:center"><div class="s">${fmt(ev.when)} · <b style="color:${open?'var(--ok)':'var(--no)'}">${open?'التسجيل مفتوح':Date.now()<ev.when?'التسجيل لسه ماتفتحش':'التسجيل مقفول (إضافة يدوية فقط)'}</b></div><div style="font-weight:700;margin-top:6px">الحضور ${n} من ${M.length}</div></div>
 ${atab==='qr'?`<div class="card" style="text-align:center"><h3>كود الحدث (للمخدوم اللي معاه موبايل)</h3>${qrImg('KC|'+ev.id)}<div class="s">المخدوم يفتح التطبيق ← حضوري ← مسح QR</div></div><button class="btn" onclick="scan('member')">${ic('qr')} مسح كود مخدوم</button><div class="s" style="text-align:center;margin:8px 0 12px">أو اضغط على «يدوي» لتسجيل اللي معهمش موبايل</div>`
 :`<div class="card"><h3>المخدومين (تسجيل يدوي)</h3>${M.map(x=>{const a=A[x.id];return `<div class="li">${av(x)}<div class="t"><b>${esc(x.name)}</b>${a?`<span class="s">${a.status==='l'?'متأخر':'حاضر'} · +${a.pts}${a.manual?' · يدوي':''}</span>`:''}</div>${a?`<button class="btn sm o" onclick="ra('${a.id}','${x.id}',${a.pts})">إلغاء</button>`:`<button class="btn sm g" onclick="ma('${x.id}')">حضر</button>`}</div>`}).join('')||'<div class="s">مفيش</div>'}</div>`}
 <button class="btn no" onclick="de('${ev.id}')">حذف الحدث</button>`);
}
// الحضور اليدوي: نافذة اختيار طريقة احتساب النقاط ثم تسجيل ذرّي. لا يُمنح صفر لمجرد أن التسجيل خارج الفترة.
window.ma=mid=>{const ev=curEv(),m=S.members.find(x=>x.id===mid);if(!ev||!m)return;
 const c=C(),auto=calc(ev,Date.now()),def=auto?'auto':'ontime';
 om(`<h3 style="margin-top:0">تسجيل حضور: ${esc(m.name)}</h3><div class="s" style="margin-bottom:8px">${esc(ev.title)} · ${fmt(ev.when)}</div><label>طريقة احتساب النقاط</label><select id="mm" onchange="mmChg()">${auto?`<option value="auto">حسب التوقيت الحالي (+${auto.pts})</option>`:''}<option value="ontime" ${def==='ontime'?'selected':''}>في الميعاد (+${c.max})</option><option value="late">متأخر بعدد دقائق (حسب نظام النقاط)</option><option value="custom">نقاط يحددها الخادم</option></select><div id="mmL" style="display:none"><label>دقائق التأخير</label><input id="mml" type="number" min="1" inputmode="numeric" value="5"></div><div id="mmC" style="display:none"><label>عدد النقاط (0 إلى 20)</label><input id="mmc" type="number" min="0" max="20" inputmode="numeric" value="${c.max}"></div><div class="s" id="mmP" style="margin:6px 0 10px"></div><button class="btn g" onclick="maDo('${mid}')">تسجيل الحضور</button>`);mmChg()};
const manOpt=()=>({mode:$('#mm').value,late:$('#mml')?$('#mml').value:0,custom:$('#mmc')?$('#mmc').value:0});
window.mmChg=()=>{const o=manOpt(),k=o.mode;$('#mmL').style.display=k==='late'?'block':'none';$('#mmC').style.display=k==='custom'?'block':'none';
 const ev=curEv(),r=ev&&manualPts(C(),ev,Date.now(),o);$('#mmP').textContent=r?'هتتسجل: +'+r.pts+' نقطة'+(r.late?' (تأخير '+r.late+' د)':''):'اكتب قيمة صحيحة'};
window.maDo=async mid=>{const ev=curEv(),m=S.members.find(x=>x.id===mid);if(!ev||!m)return;
 try{const x=await checkIn(ev,m,true,manOpt());$('#md').style.display='none';typeof x==='string'?toast(x,0):toast(okMsg(x,m));render(2)}catch(e){toast(e&&e.code==='permission-denied'?'مفيش صلاحية':'فشل التسجيل',0)}};
// إلغاء الحضور: يقرأ النقاط المسجّلة فعلًا داخل Transaction ويعكسها بدقة (لا يعتمد على قيمة قديمة في الشاشة)
window.ra=async(aid,mid)=>{if(!confirm('إلغاء تسجيل الحضور؟'))return;
 try{const r=await runTransaction(db,async tx=>{const ar=doc(db,'attendance',aid),a=await tx.get(ar);if(!a.exists())return null;
   const p=+a.data().pts||0,mr=doc(db,'members',a.data().memberId||mid),ms=await tx.get(mr);
   tx.delete(ar);if(ms.exists())tx.update(mr,{points:increment(-p),attended:increment(-1)});return p});
  toast(r===null?'الحضور اتلغى قبل كده':'اتلغى الحضور وارتجعت '+r+' نقطة',r!==null)}catch(e){toast('فشل الإلغاء',0)}};
window.de=async id=>{if(confirm('حذف الحدث؟ سجلات الحضور تفضل محفوظة.')){await deleteDoc(doc(db,'events',id));arg=null;render(1)}};
function mAttend(){
 const m=mem();if(!m)return pg('<div class="card s">حسابك مش مربوط بسجل مخدوم.</div>');
 const e=nextEv(m),open=e&&calc(e,Date.now()),c=C(),H=S.att.filter(x=>x.memberId===m.id).sort((a,b)=>b.at-a.at).slice(0,15);
 return pg(`${e?`<div class="card"><h3>${TY[e.type][0]} ${esc(e.title)}</h3><div class="s">${fmt(e.when)}</div></div>`:'<div class="card s">مفيش أحداث قادمة</div>'}
 ${open?`<button class="btn g" style="font-size:18px;padding:18px" onclick="scan('event')">${ic('cam')} سجّل حضورك (مسح QR)</button><div class="s" style="text-align:center;margin:6px 0 12px">لو سجلت دلوقتي هتاخد ${open.pts} نقطة</div>`:e?`<div class="card"><div class="s">التسجيل بيفتح قبل الميعاد بـ ${Math.min(c.open,30)} دقيقة</div></div>`:''}
 <div class="card" style="text-align:center"><h3>رمزك الشخصي</h3><div onclick="qrBig('KM|${m.id}')">${qrImg('KM|'+m.id)}</div><div class="s">لو الخادم بيمسح الحضور، وريه الكود ده — اضغط على الكود لتكبيره</div></div>
 <div class="card"><div class="row sp"><h3 style="margin:0">سجل الحضور</h3><button class="btn sm o" onclick="go('history')">كل السجل والغياب</button></div>${H.map(x=>`<div class="li"><div class="t"><b>${esc(x.title)}</b><span class="s">${fmt(x.when)}</span></div><b style="color:var(--ok)">+${x.pts}</b></div>`).join('')||'<div class="s">لسه</div>'}</div>`);
}
window.scan=async kind=>{
 scanKind=kind;scanBusy=0;$('#scant').textContent=kind==='member'?'امسح كود المخدوم':'امسح كود الحدث';$('#scan').style.display='flex';scanner=new Html5Qrcode('rd');
 try{await scanner.start({facingMode:'environment'},{fps:10,qrbox:240},onCode,()=>{})}catch(e){await stopScan();toast('اسمح للتطبيق بالكاميرا',0)}
};
async function onCode(t){
 if(scanBusy)return;
 try{
  if(scanKind==='member'&&t.startsWith('KM|')){
   scanBusy=1;const m=S.members.find(x=>x.id===t.slice(3)),ev=curEv();
   if(!m)toast('المخدوم غير موجود',0);else if(!ev)toast('اختار حدث الأول',0);else{const x=await checkIn(ev,m,true);typeof x==='string'?toast(m.name+': '+x,0):toast(okMsg(x,m))}
   setTimeout(()=>{scanBusy=0},2500);
  }else if(scanKind==='event'&&t.startsWith('KC|')){
   scanBusy=1;await stopScan();const m=mem();let ev=S.events.find(e=>e.id===t.slice(3));
   if(!ev){const d=await getDoc(doc(db,'events',t.slice(3)));if(d.exists())ev={id:d.id,...d.data()}}
   if(!ev||!m)return toast('الكود غير صالح',0);
   const x=await checkIn(ev,m,false);typeof x==='string'?toast(x,0):toast(okMsg(x,m));
  }
 }catch(e){toast('فشل التسجيل، حاول تاني',0);scanBusy=0}
}
window.stopScan=async()=>{try{if(scanner){await scanner.stop();scanner.clear()}}catch(e){}scanner=null;$('#scan').style.display='none';render(2)};

// ---------- النقاط ----------
function ledger(m){const A=S.att.filter(x=>x.memberId===m.id).map(x=>({at:x.at,t:x.title,p:x.pts,k:'a'})),J=S.adj.filter(x=>x.memberId===m.id).map(x=>({at:x.at,t:x.reason||(x.pts<0?'خصم نقاط':'إضافة نقاط'),p:x.pts,k:'j'}));const V=X.ext.voteLedger?X.ext.voteLedger(m.id):[];return[...A,...J,...V].sort((a,b)=>b.at-a.at)}
const ledRow=r=>`<div class="li"><span class="nic" style="background:${r.p<0?'#fde3e7':r.k==='a'?'#dff3e9':'#fdeccd'}">${r.p<0?'⚠️':r.k==='a'?'✅':'⭐'}</span><div class="t"><b>${esc(r.t)}</b><span class="s">${ago(r.at)}</span></div><b style="color:${r.p<0?'var(--no)':'var(--ok)'}">${r.p>0?'+':''}${r.p}</b></div>`;
PG.points={t:()=>isS()?'النقاط':'نقاطي',v:()=>{
 if(!isS()){const m=mem();if(!m)return pg('<div class="card s">مفيش بيانات</div>');const s=stat(m),e=elig(s.p);return pg(`<div class="card hero" style="text-align:center"><div class="s">${ic('star')} رصيد النقاط</div><div class="pts">${m.points||0}</div><span class="pill ${e[1]}">${e[0]}</span></div><div class="card"><h3>تفصيل النقاط</h3>${ledger(m).map(ledRow).join('')||'<div class="s">لسه مفيش حركات</div>'}</div><button class="btn o" onclick="go('rules')">${ic('book')} قواعد الحضور والنقاط</button>`)}
 const L2=[...S.members].sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar')),m=S.members.find(x=>x.id===ptM);
 return pg(`<div class="card"><h3>اختر المخدوم</h3><select onchange="sv('ptM',this.value)"><option value="">— اختر —</option>${L2.map(x=>`<option value="${x.id}" ${x.id===ptM?'selected':''}>${esc(x.name)} (${chName(x.section)})</option>`).join('')}</select></div>
 ${m?`<div class="card hero" style="text-align:center"><div class="s">رصيد ${esc(m.name)}</div><div class="pts">${m.points||0}</div></div>
 <div class="card"><h3>إضافة / خصم نقاط</h3><select id="pk"><option value="-1">خصم نقاط</option><option value="1">إضافة نقاط</option></select><input id="pv2" type="number" min="1" inputmode="numeric" placeholder="عدد النقاط"><input id="pr" placeholder="السبب (يظهر للمخدوم)"><button class="btn g" onclick="doAdj()">تأكيد</button><div class="s" style="margin-top:8px">هيوصل للمخدوم إشعار بالخصم أو الإضافة.</div><div style="height:8px"></div><button class="btn sm o" onclick="ptReset('${m.id}')">تصفير نقاط المخدوم (يتسجل كخصم)</button></div>
 <div class="card"><h3>تفصيل النقاط وتاريخ الخصومات</h3>${ledger(m).map(ledRow).join('')||'<div class="s">لسه</div>'}</div>`:'<div class="card s">اختار مخدوم علشان تشوف نقاطه أو تخصم منه.</div>'}`);
}};
window.doAdj=async()=>{const m=S.members.find(x=>x.id===ptM),v=Math.abs(parseInt($('#pv2').value)),sg=+$('#pk').value,why=$('#pr').value.trim();
 if(!m||!v){toast('اكتب عدد النقاط',0);return}if(sg<0&&!why&&!confirm('تخصم من غير سبب؟'))return;
 const p=sg*v;try{const b=writeBatch(db);b.set(doc(collection(db,'adjustments')),{memberId:m.id,section:m.section,pts:p,reason:why,by:me.name,at:Date.now()});b.update(doc(db,'members',m.id),{points:increment(p)});
  b.set(doc(collection(db,'notifs')),{to:m.id,section:m.section,kind:'pts',title:p<0?'تم خصم نقاط':'تمت إضافة نقاط',body:(p<0?'خصم '+v+' نقطة':'إضافة '+v+' نقطة')+(why?' — '+why:''),at:Date.now()});await b.commit();toast('تم');render(1)}catch(e){toast('فشل التنفيذ',0)}};

// ---------- الإشعارات ----------
const NI={event:['🎼','#fdeccd'],pts:['⭐','#fdeccd'],msg:['✉️','#e4ecfb'],bd:['🎂','#fde3ec']};
const nrow=n=>{const k=NI[n.kind]||NI.msg;return `<div class="li"><span class="nic" style="background:${k[1]}">${n.kind==='pts'&&/خصم/.test(n.title)?'⚠️':k[0]}</span><div class="t"><b>${esc(n.title)}</b><span class="s">${esc(n.body)}</span></div><span class="s">${ago(n.at)}</span></div>`};
PG.notifs={t:'الإشعارات',act:()=>isS()?`<button class="ib" onclick="nf()">${ic('plus')}</button>`:'',v:()=>{
 localStorage.setItem('ns_'+uid,Date.now());
 const N=[...S.notifs].sort((a,b)=>b.at-a.at).slice(0,40);
 if(!isS())return pg(`<div class="card">${N.map(nrow).join('')||'<div class="s">مفيش إشعارات</div>'}</div>`);
 const bd=S.members.map(x=>({x,b:nextBd(x.birth)})).filter(o=>o.b&&o.b.days<=14).sort((a,b)=>a.b.days-b.b.days),w=weekSummary();
 return pg(`<div class="card"><h3>🎂 أعياد ميلاد قريبة</h3>${bd.map(o=>{const s=stat(o.x);return `<div class="li">${av(o.x)}<div class="t"><b>عيد ميلاد ${esc(o.x.name)}</b><span class="s">${o.b.days===0?'النهارده 🎉':'بعد '+o.b.days+' يوم'} · ${o.b.age} سنة · نسبة الحضور ${s.p===null?'—':s.p+'%'}${s.p!==null&&s.p<C().low?' (محتاج افتقاد)':''}</span></div><div class="row w" style="gap:6px;flex:none"><button class="btn sm g" onclick="bdGreet('${o.x.id}')">🎂 تهنئة</button><a class="btn sm o" href="${wa(o.x.phone)}" target="_blank">واتساب</a></div></div>`}).join('')||'<div class="s">مفيش في الأسبوعين الجايين</div>'}</div>
 <div class="card"><h3>📊 تقرير الثلاثاء</h3><div class="s">متوسط الحضور ${w.avg}% · ${w.low.length} محتاجين افتقاد</div><div style="height:8px"></div><button class="btn sm" onclick="go('report')">فتح التقرير</button></div>
 <div class="card"><h3>الرسائل المُرسلة</h3>${N.map(nrow).join('')||'<div class="s">لسه</div>'}</div>`);
}};
window.nf=()=>{om(`<h3 style="margin-top:0">إرسال إشعار</h3>${isA()?`<label>القسم</label><select id="ns">${secOpts(true)}</select>`:''}<label>إلى</label><select id="nt"><option value="all">كل المخدومين</option><optgroup label="مخدوم بعينه">${S.members.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</optgroup></select><input id="ni" placeholder="العنوان (مثال: ميعاد الاجتماع)"><textarea id="nb" rows="3" placeholder="الرسالة"></textarea><button class="btn g" onclick="sn()">إرسال</button>`)};
window.sn=async()=>{const t=$('#ni').value.trim();if(!t){toast('اكتب العنوان',0);return}const to=$('#nt').value,sec=to==='all'?newSec($('#ns')&&$('#ns').value):((S.members.find(x=>x.id===to)||{}).section||'');if(!sec){toast('اختار القسم',0);return}try{await addDoc(collection(db,'notifs'),{to,section:sec,kind:'msg',title:t,body:$('#nb').value.trim(),at:Date.now()});$('#md').style.display='none';render(2);toast('تم الإرسال')}catch(e){toast('فشل الإرسال',0)}};

// ---------- الملف الشخصي ----------
PG.profile={t:'الملف الشخصي',act:()=>`<button class="ib" onclick="pf()">${ic('edit')}</button>`,v:()=>{
 if(isS())return pg(`<div class="card" style="text-align:center">${av(me,'xl').replace('class="av xl"','class="av xl" style="margin:0 auto 8px"')}<h2 style="margin:6px 0">${esc(me.name)}</h2><span class="bdg">${isA()?'المدير العام':'خادم — '+chName(me.section)}</span><div class="li" style="margin-top:12px"><span class="ch">${ic('phone')}</span><span class="t" style="text-align:right">${phoneShow(me.phone)}</span></div></div><button class="btn o" onclick="go('more')">${ic('dots')} المزيد</button><div style="height:8px"></div><button class="btn no" onclick="out()">${ic('out')} تسجيل خروج</button>`);
 const m=mem();if(!m)return pg(`<div class="card"><h2>${esc(me.name)}</h2></div><button class="btn no" onclick="out()">تسجيل خروج</button>`);
 const s=stat(m),e=elig(s.p);
 return pg(`<div class="card" style="text-align:center">${av(m,'xl').replace('class="av xl"','class="av xl" style="margin:0 auto 8px"')}<h2 style="margin:6px 0">${esc(m.name)}</h2><span class="bdg">${chName(m.section)}</span>
 <div class="li" style="margin-top:12px"><span class="ch">${ic('phone')}</span><span class="t" style="text-align:right">${phoneShow(m.phone)}</span></div><div class="li"><span class="ch">${ic('cake')}</span><span class="t" style="text-align:right">${m.birth||'—'}</span></div>
 <div class="row sp" style="padding-top:12px"><div style="text-align:right"><b>نسبة حضورك</b><div class="s">${s.a} من ${s.t} اجتماع</div><span class="pill ${e[1]}" style="margin-top:6px">${e[0]}</span></div>${ring(s.p)}</div>
 <div class="row sp" style="padding-top:8px"><div style="text-align:right"><b>رمز الحضور</b><div class="s">${m.points||0} نقطة</div></div><span onclick="qrBig('KM|${m.id}')">${qrImg('KM|'+m.id,'qr sm')}</span></div></div>
 <button class="btn o" onclick="go('more')">${ic('dots')} المزيد</button><div style="height:8px"></div><button class="btn no" onclick="out()">${ic('out')} تسجيل خروج</button>`);
}};
window.pf=()=>{const m=mem();if(isS()){spfForm();return}if(!m){om(`<h3 style="margin-top:0">تعديل بياناتي</h3><input id="fn" value="${esc(me.name)}" placeholder="الاسم"><input id="fp" inputmode="tel" value="${esc(me.phone?'0'+norm(me.phone):'')}" placeholder="رقم التليفون"><button class="btn g" onclick="spf()">حفظ</button>`);return}
 tmpPhoto=m.photo||'';om(`<h3 style="margin-top:0">تعديل بياناتي</h3><div class="row"><span class="av" id="pv" style="width:64px;height:64px">${m.photo?`<img src="${m.photo}" alt="">`:ic('cam')}</span><input type="file" accept="image/*" onchange="ph(this)" style="margin:0"></div><div style="height:8px"></div><input id="fn" value="${esc(m.name)}" placeholder="الاسم"><input id="fp" inputmode="tel" value="${esc(m.phone?'0'+norm(m.phone):'')}" placeholder="رقم التليفون"><label>تاريخ الميلاد</label><input id="fb" type="date" value="${m.birth||''}"><button class="btn g" onclick="spf()">حفظ</button>`)};
window.spf=async()=>{const n=$('#fn').value.trim(),p=norm($('#fp').value);if(!n){toast('اكتب الاسم',0);return}
 try{const oldP=norm(me.phone);await updateDoc(doc(db,'users',uid),isS()?{name:n,phone:p,photo:tmpPhoto}:{name:n,phone:p});me={...me,name:n,phone:p,...(isS()?{photo:tmpPhoto}:{})};if(isS()&&p&&oldP!==p)await reqAdmin('changePhone',{targetUid:uid,memberId:'',newPhone:p});const m=mem();if(!isS()&&m)await updateDoc(doc(db,'members',m.id),{name:n,phone:p,birth:$('#fb').value,photo:tmpPhoto});$('#md').style.display='none';render(2);toast('تم الحفظ')}catch(e){toast('فشل الحفظ',0)}};

// ---------- المزيد ----------
const mrowL=(p,i,t)=>`<div class="li" onclick="go('${p}')"><span class="nic" style="background:#e4ecfb;color:var(--navy)">${ic(i)}</span><div class="t"><b>${t}</b></div><span class="ch">${ic('chev')}</span></div>`;
PG.more={t:'المزيد',v:()=>pg(`<div class="card">${isA()?mrowL('admin','gear','لوحة المدير العام'):''}${isS()?mrowL('requests','users','طلبات التسجيل')+mrowL('accounts','user','الحسابات والصلاحيات')+mrowL('report','chart','التقرير الأسبوعي')+mrowL('analytics','chart','الإحصائيات والتحليلات')+mrowL('weekly','clock','الاجتماع الأسبوعي الثابت')+mrowL('htrash','trash','سلة المحذوفات (الترانيم)')+mrowL('set','gear','الإعدادات ونظام النقاط'):mrowL('history','hist','سجل حضوري وغيابي')}${mrowL('board','cup','لوحة الترتيب')}${mrowL('remind','bell','التذكيرات والإعدادات')}${mrowL('upd','upd','التحديثات')}${mrowL('rules','book','القواعد (الرولز)')}${mrowL('bgs','img','الخلفية')}<div class="li" onclick="out()"><span class="nic" style="background:#fde3e7;color:var(--no)">${ic('out')}</span><div class="t"><b>تسجيل خروج</b></div></div></div>`)};

// ---------- القواعد ----------
const R=(i,t)=>`<div class="rule"><i>${i}</i><div>${t}</div></div>`;
PG.rules={t:'الرولز',v:()=>{const c=C(),o=Math.min(c.open,30);return pg(`<div class="tabs"><button class="${rt==='m'?'on':''}" onclick="sv('rt','m')">المخدوم</button><button class="${rt==='s'?'on':''}" onclick="sv('rt','s')">الخادم</button></div>
 ${rt==='m'?`<div class="card"><h3>الحضور والنقاط</h3>
 ${R('1',`تسجيل الحضور بيفتح قبل ميعاد الاجتماع بـ <b>${o}</b> دقيقة.`)}
 ${R('2',`الحضور من وقت فتح التسجيل لحد ميعاد الاجتماع بالظبط = <b>${c.max}</b> نقط.`)}
 ${R('3',`التأخير: كل <b>${c.step}</b> دقايق بتتخصم نقطة، وبعد <b>${c.zero}</b> دقيقة تأخير بدون نقط خالص.`)}
 ${R('4',`بعد الاجتماع بـ <b>${c.close}</b> دقيقة التسجيل بيتقفل، وبعدها الخادم بس هو اللي يضيف حضورك يدويًا.`)}
 ${R('5','معاك موبايل؟ امسح كود الحدث من التطبيق. مفيش موبايل؟ الخادم بيسجّلك يدويًا.')}
 ${R('6','النقاط بتتحسب على نسبة الحضور وحسب نظام الخادم.')}
 ${R('7','من حق الخادم يخصم نقاط، وبيوصلك إشعار بالسبب.')}
 ${R('8',`الالتزام: نسبة حضور <b>${c.concert}%</b> فأكتر = ملتزم، و<b>${c.solo}%</b> فأكتر = ملتزم ممتاز.`)}</div>`
 :`<div class="card"><h3>مسؤوليات الخادم</h3>
 ${R('1','أضف المخدومين (الاسم، التليفون، تاريخ الميلاد، الصورة) أو خليهم يسجلوا بنفسهم.')}
 ${R('2','سجّل الحضور بمسح كود المخدوم، أو يدويًا لو معاهوش موبايل.')}
 ${R('3','انشر الاجتماعات والفعاليات من «الجداول والأنشطة» ويوصل إشعار للمخدومين.')}
 ${R('4','وصلك إشعار بعيد ميلاد المخدوم مع نسبة حضوره للافتقاد.')}
 ${R('5','تقرير الحضور بيجيلك كل ثلاثاء الساعة 9 صباحًا بنسب كل مخدوم.')}
 ${R('6','تقدر تعدّل نظام النقاط من «الإعدادات».')}
 ${R('7','تقدر تخصم أو تضيف نقاط، والمخدوم بيتبلغ تلقائيًا.')}</div>`}
 <div class="card"><h3>الأقسام</h3>${CHK.map((k,i)=>`<div class="li"><span class="nic" style="background:#f4e8c6;font-weight:700;color:#7d5a10">${i+1}</span><div class="t"><b>${chName(k)}</b></div></div>`).join('')}</div>`)}};

// ---------- الترتيب: انتقلت إلى ext/insights.js (نقاط + لوحة الشرف للمنتظمين) ----------

// ---------- التقرير الأسبوعي ----------
PG.report={t:'تقرير الحضور الأسبوعي',v:()=>{
 const c=C(),d=new Date();d.setDate(d.getDate()-((d.getDay()-2+7)%7));
 const rows=S.members.filter(x=>fch==='all'||x.section===fch).map(x=>({x,a:stat(x),w:stat(x,7)})).sort((a,b)=>(a.a.p??101)-(b.a.p??101)),w=weekSummary();
 const txt=`تقرير حضور ${CFG.service} — ${curSecKey()?SECN[curSecKey()]:'القسمين'}\n${fmtD(d.getTime())}\n\n`+rows.map(o=>`${o.x.name} (${chName(o.x.section)}): ${o.a.p===null?'—':o.a.p+'%'}`).join('\n');window._rt=txt;
 return pg(`<div class="card" style="text-align:center"><div class="s">${fmtD(d.getTime())}</div><div class="row sp" style="margin-top:8px"><div><div class="s">متوسط الحضور</div><b style="font-size:24px;color:var(--navy)">${w.avg}%</b></div><div><div class="s">يحتاجون افتقاد</div><b style="font-size:24px;color:var(--no)">${w.low.length}</b></div><div><div class="s">المخدومين</div><b style="font-size:24px">${S.members.length}</b></div></div></div>
 <div class="chips">${['all',...CHK].map(x=>`<button class="${fch===x?'on':''}" onclick="setF('${x}')">${x==='all'?'الكل':chName(x)}</button>`).join('')}</div>
 <div class="card">${rows.map(o=>`<div class="li" onclick="go('member','${o.x.id}')">${av(o.x)}<div class="t"><b>${esc(o.x.name)}</b><span class="s">${chName(o.x.section)} · الأسبوع: ${o.w.t?o.w.a+'/'+o.w.t:'—'} · الإجمالي: ${o.a.a} من ${o.a.t}</span><div class="bar" style="margin-top:5px"><i style="width:${o.a.p||0}%;background:${col(o.a.p)}"></i></div></div><b style="color:${o.a.p!==null&&o.a.p<c.low?'var(--no)':col(o.a.p)};font-size:17px">${o.a.p===null?'—':o.a.p+'%'}</b></div>`).join('')||'<div class="s">لسه مفيش بيانات</div>'}</div>
 <div class="s" style="margin-bottom:10px">الأحمر = أقل من ${c.low}% (محتاج افتقاد).</div><button class="btn g" onclick="window.open('https://wa.me/?text='+encodeURIComponent(window._rt),'_blank')">${ic('share')} مشاركة التقرير</button>`)}};

// ---------- الإعدادات ----------
PG.set={t:'الإعدادات',v:()=>{const c=C(),f=(k,l)=>`<label>${l}</label><input id="c_${k}" type="number" value="${c[k]}" ${isA()?'':'disabled'}>`;
 return pg(`<div class="card"><h3>نظام النقاط</h3>${f('max','نقاط الحضور في الميعاد (حتى 20)')}${f('step','خصم نقطة كل (دقيقة تأخير)')}${f('zero','بدون نقاط بعد (دقيقة تأخير)')}${f('open','فتح التسجيل قبل الاجتماع بـ (دقيقة، حتى 30)')}${f('close','قفل التسجيل بعد الاجتماع بـ (دقيقة)')}<h3>الاستحقاق والافتقاد</h3>${f('concert','حد الالتزام (%)')}${f('solo','حد الالتزام الممتاز (%)')}${f('low','حد الافتقاد (%)')}<h3>النقاط الترحيبية</h3>${f('welcomePts','نقاط ترحيبية للمخدوم الجديد (تُصرف مرة واحدة، 0 = إيقاف)')}${isA()?`<button class="btn g" onclick="sc()">حفظ</button>`:'<div class="s">تعديل نظام النقاط من المدير العام فقط.</div>'}</div><button class="btn o" onclick="go('rules')">${ic('book')} معاينة القواعد كما يراها المخدوم</button>`)}};
window.sc=async()=>{if(!isA()){toast('للمدير العام فقط',0);return}const d={};['max','step','zero','open','close','concert','solo','low','welcomePts'].forEach(k=>d[k]=+$('#c_'+k).value);
 if(d.open>30||d.open<0||d.step<1||d.max<0||d.max>20||d.zero<1||!Number.isInteger(d.welcomePts)||d.welcomePts<0||d.welcomePts>50){toast('راجع القيم (فتح التسجيل حتى 30 دقيقة، النقاط حتى 20، الترحيبية 0–50 عدد صحيح)',0);return}
 try{await setDoc(doc(db,'config','main'),d,{merge:true});toast('تم الحفظ')}catch(e){toast('فشل الحفظ',0)}};

// ---------- الخلفيات ----------
PG.bgs={t:'الخلفية',v:()=>{const cur=getBgKey();return pg(`<div class="grid2">${[['','تلقائي (خلفية لكل صفحة)'],...Object.keys(BG).map(k=>[k,BG[k].n])].map(([k,n])=>`<button class="bgc ${cur===k?'on':''}" onclick="pickBg('${k}')"><div class="pv">${preview(k)}</div><span>${n}${cur===k?' ✓':''}</span></button>`).join('')}</div>`)}};
window.pickBg=k=>{setBg(k);render(2)};



// ---------- 4.1.0: تفعيل الحسابات، الطلبات الإدارية، كلمة المرور الإجبارية، النقاط الترحيبية، ملف الخادم ----------
const DEFAULT_PW='123456';
// طلب إداري يُنفَّذ عبر GitHub Actions (Admin SDK) — الخطة المجانية لا تسمح بـ Cloud Functions. لا تُخزَّن أي كلمة مرور.
const reqAdmin=(type,data)=>addDoc(collection(db,'adminRequests'),{type,...data,section:(data&&data.section)||(me.role==='admin'?'general':me.section),requestedBy:uid,requestedByName:me.name||'',status:'pending',createdAt:Date.now()});
function forcePw(){
 $('#nav').innerHTML='';
 $('#app').innerHTML=`<div class="wrap">${head()}<div class="pg"><div class="card"><h3>لازم تغيّر الباسورد</h3><div class="s" style="margin-bottom:8px">حسابك اتفعّل بباسورد مؤقت. اختار باسورد جديد قبل ما تكمل.</div><input id="np1" type="password" placeholder="الباسورد الجديد (6 أحرف على الأقل)"><input id="np2" type="password" placeholder="أعد كتابة الباسورد"><button class="btn g" onclick="savePw()">حفظ ومتابعة</button><div style="height:10px"></div><button class="btn o" onclick="out()">خروج</button></div></div></div>`;
}
window.savePw=async()=>{const a=$('#np1').value,b=$('#np2').value;
 if(a.length<6){toast('الباسورد 6 على الأقل',0);return}if(a!==b){toast('الباسورد غير متطابق',0);return}if(a===DEFAULT_PW){toast('اختار باسورد غير المؤقت',0);return}
 try{await updatePassword(auth.currentUser,a);await updateDoc(doc(db,'users',uid),{mustChangePw:false});me={...me,mustChangePw:false};toast('تم تغيير الباسورد');start()}
 catch(e){toast(e&&e.code==='auth/requires-recent-login'?'سجّل خروج وادخل تاني بالباسورد المؤقت ثم غيّره':'تعذر تغيير الباسورد',0)}};
// تطبيق Firebase ثانوي (نفس المشروع) لإنشاء حساب المخدوم دون تسجيل خروج الخادم — لا مفاتيح Admin ولا صلاحيات إضافية
let secAuth=null;const sec=()=>secAuth||(secAuth=getAuth(initializeApp(CFG.firebase,'activator')));
window.actAcc=async id=>{
 const m0=S.members.find(x=>x.id===id);if(!m0||!isS())return;
 const mail=toMail(m0.phone);if(!mail||mail.includes('@')&&!mail.endsWith(PHONE_DOM)){toast('رقم التليفون ناقص أو غير صالح',0);return}
 if(m0.uid){toast('الحساب مفعّل بالفعل',0);return}
 if(!confirm(`تفعيل حساب ${m0.name}؟\nاسم المستخدم: ${phoneShow(m0.phone)}\nالباسورد المؤقت: ${DEFAULT_PW} (هيتطلب منه تغييره أول دخول)`))return;
 let cred=null;
 try{
  const fr=await getDoc(doc(db,'members',id));if(!fr.exists()){toast('المخدوم غير موجود',0);return}
  if(fr.data().uid){toast('الحساب مفعّل بالفعل',0);return}
  const o=S.members.find(x=>x.id!==id&&x.uid&&norm(x.phone)===norm(m0.phone));
  if(o){toast('الرقم ده مربوط بحساب مخدوم تاني: '+o.name,0);return}
  cred=await createUserWithEmailAndPassword(sec(),mail,DEFAULT_PW);
  const nu=cred.user.uid,b=writeBatch(db);
  b.update(doc(db,'members',id),{uid:nu});
  b.set(doc(db,'users',nu),{name:m0.name,role:'member',section:m0.section,status:'active',contact:norm(m0.phone),phone:norm(m0.phone),memberId:id,mustChangePw:true,createdAt:Date.now()});
  await b.commit();
  try{await signOut(sec())}catch(e){}
  toast('تم تفعيل الحساب ✔ الدخول بالرقم والباسورد '+DEFAULT_PW);render(2);
 }catch(e){
  if(cred){try{await deleteUser(cred.user)}catch(x){}toast('فشل ربط الحساب، تم التراجع (لم يُنشأ حساب)',0)}
  else if(e&&e.code==='auth/email-already-in-use')await linkAcc(id);
  else toast(e&&e.code==='permission-denied'?'مفيش صلاحية: انشر قواعد Firestore 4.1.0':ERR(e||{}),0);
 }
};
// الرقم له حساب Authentication بالفعل: ربطه بسجل المخدوم لو الحساب الموجود له سجل فارغ مكرر (بدون نقاط/حضور)
async function linkAcc(id){
 const m=S.members.find(x=>x.id===id),p=norm(m.phone);let u=[];
 try{const q=await getDocs(query(collection(db,'users'),where('section','==',m.section),where('role','==','member'),where('phone','==',p)));u=q.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.role==='member')}catch(e){}
 if(!u.length){toast('فيه حساب دخول بنفس الرقم لكن مالوش ملف في التطبيق. اطلب من المخدوم يسجّل دخول ويكمّل بياناته ثم اربطه.',0);return}
 if(u.length>1){toast('أكتر من حساب بنفس الرقم، راجعهم يدويًا',0);return}
 const a=u[0];
 if(a.memberId===id){await updateDoc(doc(db,'members',id),{uid:a.id});toast('تم ربط الحساب الموجود بسجل المخدوم');return}
 const o=S.members.find(x=>x.id===a.memberId);
 if(o&&(o.uid!==a.id||o.points||o.attended)){toast('الحساب الموجود له سجل نقاط/حضور خاص به — ادمجهم يدويًا لتفادي فقد بيانات',0);return}
 if(!confirm(`فيه حساب موجود بنفس الرقم (${a.name||''}). ربطه بسجل ${m.name} وحذف السجل الفارغ المكرر؟`))return;
 try{const b=writeBatch(db);b.update(doc(db,'members',id),{uid:a.id});b.update(doc(db,'users',a.id),{memberId:id});if(o)b.delete(doc(db,'members',o.id));await b.commit();toast('تم ربط الحساب الموجود ✔ (المخدوم يعيد فتح التطبيق)');render(2)}
 catch(e){toast('فشل الربط',0)}
}
window.rstPw=async id=>{const m=S.members.find(x=>x.id===id);if(!m||!m.uid)return;
 if(S.reqs.some(r=>r.memberId===id&&r.type==='resetPassword'&&r.status==='pending')){toast('فيه طلب إعادة تعيين منتظر التنفيذ بالفعل',0);return}
 if(!confirm(`إعادة تعيين باسورد ${m.name} إلى ${DEFAULT_PW} وإجباره على تغييره؟\nبيتنفذ عن طريق المهمة الإدارية (GitHub Actions) وليس فورًا.`))return;
 try{await reqAdmin('resetPassword',{targetUid:m.uid,memberId:id});toast('اتسجّل الطلب. شغّل «Admin Worker» من GitHub Actions لتنفيذه فورًا');render(2)}catch(e){toast('فشل تسجيل الطلب',0)}};
function accCard(x){if(!isS())return '';
 const R=(S.reqs||[]).filter(r=>r.memberId===x.id).sort((a,b)=>b.createdAt-a.createdAt).slice(0,3),lbl={pending:'⏳ منتظر التنفيذ',done:'✅ تم',failed:'⚠️ فشل',skipped:'ℹ️ تم جزئيًا'},tn={resetPassword:'إعادة تعيين الباسورد',changePhone:'تحديث رقم الدخول'};
 return `<div class="card" style="margin-top:12px"><h3>حساب الدخول</h3>${x.uid?`<div class="s">✅ الحساب مفعّل · اسم المستخدم: ${phoneShow(x.phone)}</div><div style="height:8px"></div><button class="btn sm o" onclick="rstPw('${x.id}')">إعادة تعيين الباسورد (${DEFAULT_PW})</button>`:`<div class="s">لا يوجد حساب دخول لهذا المخدوم.</div><div style="height:8px"></div><button class="btn g" onclick="actAcc('${x.id}')">تفعيل حساب المخدوم</button>`}${R.map(r=>`<div class="s" style="margin-top:6px">${tn[r.type]||r.type}: ${lbl[r.status]||r.status}${r.message?' — '+esc(r.message):''}</div>`).join('')}</div>`}

// ----- تهنئة عيد الميلاد: صورة المخدوم في برواز "Happy Birthday" وتتبعت واتساب -----
const loadImg=src=>new Promise(res=>{if(!src)return res(null);const i=new Image();if(/^https?:/.test(src))i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src});
const rr=(g,x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()};
const goldG=(g,x0,y0,x1,y1)=>{const k=g.createLinearGradient(x0,y0,x1,y1);[[0,'#f7e3a1'],[.3,'#d9b45c'],[.55,'#a67c25'],[.8,'#e6c26f'],[1,'#8c651d']].forEach(([o,c])=>k.addColorStop(o,c));return k};
async function bdCard(x,age){
 const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 g.imageSmoothingQuality='high';
 let k=g.createLinearGradient(0,0,W,H);k.addColorStop(0,'#3d202b');k.addColorStop(.55,'#5a3340');k.addColorStop(1,'#1b2a52');g.fillStyle=k;g.fillRect(0,0,W,H);
 k=g.createRadialGradient(540,640,60,540,640,700);k.addColorStop(0,'rgba(255,214,130,.35)');k.addColorStop(1,'rgba(255,214,130,0)');g.fillStyle=k;g.fillRect(0,0,W,H);
 let seed=[...String(x.id)].reduce((a,ch)=>a*31+ch.charCodeAt(0)|0,7);const rnd=()=>{seed=seed*1664525+1013904223|0;return((seed>>>0)%10000)/10000};
 const cols=['#f6c453','#e8788a','#7fc8f8','#9be3a6','#fff'];
 for(let i=0;i<90;i++){g.save();g.translate(rnd()*W,rnd()*H);g.rotate(rnd()*6.28);g.fillStyle=cols[i%5];g.globalAlpha=.55+rnd()*.4;g.fillRect(0,0,10+rnd()*14,5+rnd()*7);g.restore()}
 [[120,170,'#e8788a'],[210,100,'#f6c453'],[960,180,'#7fc8f8'],[870,105,'#9be3a6']].forEach(([bx,by,col])=>{g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=3;g.beginPath();g.moveTo(bx,by+62);g.quadraticCurveTo(bx+14,by+120,bx-6,by+170);g.stroke();
  const rg=g.createRadialGradient(bx-18,by-20,6,bx,by,66);rg.addColorStop(0,'#fff');rg.addColorStop(.25,col);rg.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=rg;g.beginPath();g.ellipse(bx,by,52,64,0,0,6.28);g.fill()});
 // برواز مزخرف
 g.save();g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=45;g.shadowOffsetY=22;rr(g,230,350,620,620,34);g.fillStyle=goldG(g,230,350,850,970);g.fill();g.restore();
 rr(g,246,366,588,588,24);g.strokeStyle='rgba(60,35,10,.55)';g.lineWidth=4;g.stroke();
 rr(g,260,380,560,560,16);g.fillStyle='#f6ecd6';g.fill();
 const px=278,py=398,ps=524,im=await loadImg(x.photo);
 g.save();rr(g,px,py,ps,ps,10);g.clip();
 if(im){const sq=Math.min(im.width,im.height);g.drawImage(im,(im.width-sq)/2,(im.height-sq)/2,sq,sq,px,py,ps,ps)}
 else{g.fillStyle='#79535b';g.fillRect(px,py,ps,ps);g.fillStyle='#fff';g.font='700 260px system-ui, Tahoma, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(((x.name||'؟')[0]),px+ps/2,py+ps/2+10)}
 g.restore();rr(g,px,py,ps,ps,10);g.strokeStyle='rgba(120,85,30,.6)';g.lineWidth=3;g.stroke();
 [[230,350],[850,350],[230,970],[850,970]].forEach(([cx,cy])=>{g.beginPath();g.arc(cx,cy,20,0,6.28);g.fillStyle=goldG(g,cx-20,cy-20,cx+20,cy+20);g.fill();g.strokeStyle='#6b4a14';g.lineWidth=3;g.stroke()});
 // شريط Happy Birthday على البرواز
 g.fillStyle='#8c651d';g.beginPath();g.moveTo(120,285);g.lineTo(70,285);g.lineTo(105,335);g.lineTo(70,385);g.lineTo(150,385);g.fill();
 g.beginPath();g.moveTo(960,285);g.lineTo(1010,285);g.lineTo(975,335);g.lineTo(1010,385);g.lineTo(930,385);g.fill();
 g.save();g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=22;g.shadowOffsetY=10;rr(g,110,260,860,140,22);g.fillStyle=goldG(g,110,260,970,400);g.fill();g.restore();
 rr(g,124,272,832,116,14);g.strokeStyle='rgba(255,246,214,.75)';g.lineWidth=3;g.stroke();
 g.textAlign='center';g.textBaseline='middle';g.direction='ltr';g.font='italic 700 88px Georgia, "Times New Roman", serif';g.fillStyle='rgba(255,247,222,.65)';g.fillText('Happy Birthday',541,333);g.fillStyle='#4a2514';g.fillText('Happy Birthday',540,331);
 // الاسم والتهنئة
 g.direction='rtl';g.fillStyle='#f6e9c8';g.font='700 76px system-ui, Tahoma, "Noto Sans Arabic", sans-serif';g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=14;g.fillText(x.name||'',540,1062,900);g.shadowBlur=0;
 g.fillStyle='#e6c987';g.font='500 46px system-ui, Tahoma, "Noto Sans Arabic", sans-serif';g.fillText('كل سنة وإنت طيب 🎂',540,1150);
 g.fillStyle='rgba(246,233,200,.85)';g.font='400 38px system-ui, Tahoma, "Noto Sans Arabic", sans-serif';g.fillText(age?`${age} سنة — ربنا يفرّح قلبك ويبارك حياتك`:'ربنا يفرّح قلبك ويبارك حياتك',540,1220,900);
 g.fillStyle='#d9bd85';g.font='700 34px system-ui, Tahoma, "Noto Sans Arabic", sans-serif';g.fillText('خدمة أسرة ثانوي',540,1295);
 rr(g,22,22,W-44,H-44,36);g.strokeStyle=goldG(g,0,0,W,H);g.lineWidth=6;g.stroke();
 return await new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error('blob')),'image/png'));
}
const blobB64=b=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=no;r.readAsDataURL(b)});
window.bdGreet=async id=>{
 const x=S.members.find(m=>m.id===id);if(!x)return;const b=nextBd(x.birth),first=(x.name||'').split(' ')[0];
 toast('بجهّز صورة التهنئة…');
 let blob;try{blob=await bdCard(x,b?b.age:null)}catch(e){toast('تعذّر تجهيز الصورة',0);return}
 const msg=`كل سنة وإنت طيب يا ${first} 🎂🎉\nربنا يفرّح قلبك ويبارك حياتك ✝️`,fname='happy-birthday-'+id+'.png';
 try{
  if(Capacitor.isNativePlatform()){
   const r=await Filesystem.writeFile({path:fname,data:await blobB64(blob),directory:Directory.Cache});
   await Share.share({title:'تهنئة عيد ميلاد',text:msg,files:[r.uri],dialogTitle:'ابعت التهنئة على واتساب'});return}
  const f=new File([blob],fname,{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:msg});return}
 }catch(e){if(e&&(e.name==='AbortError'||/cancel/i.test(String(e.message||''))))return}
 const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=fname;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);
 window.open(wa(x.phone)+'?text='+encodeURIComponent(msg),'_blank');toast('الصورة اتحفظت — ابعتها في محادثة واتساب اللي اتفتحت');
};
const bdBtn=x=>{if(!isS())return '';const b=nextBd(x.birth);return b&&b.days<=14?`<div style="height:10px"></div><button class="btn g" onclick="bdGreet('${x.id}')">🎂 تهنئة بعيد الميلاد${b.days===0?' (النهارده!)':''}</button>`:''};
// ----- النقاط الترحيبية -----
const wPts=()=>{const v=C().welcomePts;return Number.isInteger(v)&&v>=0?v:5};
function welcomeCard(x){if(!isS())return '';
 if(x.welcomePaid===true)return `<div class="card"><h3>🎁 النقاط الترحيبية</h3><div class="s">تم صرف النقاط الترحيبية: <b>+${x.welcomePts||0}</b> نقطة · ${x.welcomeAt?fmtD(x.welcomeAt):''} · بواسطة ${esc(x.welcomeBy||'')}</div></div>`;
 if(x.welcomeEligible===true)return `<div class="card"><h3>🎁 النقاط الترحيبية</h3><button class="btn g" onclick="giveWelcome('${x.id}')">إضافة النقاط الترحيبية (+${wPts()})</button></div>`;
 return ''}
window.giveWelcome=async id=>{
 const m=S.members.find(x=>x.id===id);if(!m||!isS())return;
 if(!confirm(`صرف ${wPts()} نقطة ترحيبية لـ ${m.name}؟ (تُصرف مرة واحدة فقط ولا يمكن تكرارها)`))return;
 const mref=doc(db,'members',id),aref=doc(db,'adjustments','welcome_'+id),cref=doc(db,'config','main');
 try{
  const res=await runTransaction(db,async tx=>{
   const ms=await tx.get(mref);if(!ms.exists())return 'nom';
   const d=ms.data();if(d.welcomeEligible!==true)return 'inel';if(d.welcomePaid===true)return 'paid';
   if((await tx.get(aref)).exists())return 'paid';
   const cs=await tx.get(cref),cv=cs.exists()?cs.data().welcomePts:undefined,p=(typeof cv==='number'&&cv>=0)?cv:5;
   if(p<=0)return 'zero';
   const now=Date.now();
   tx.set(aref,{memberId:id,section:m.section,pts:p,type:'welcome',reason:'نقاط ترحيبية',by:me.name||'',byUid:uid,at:now});
   tx.update(mref,{points:increment(p),welcomePaid:true,welcomePts:p,welcomeAt:now,welcomeBy:me.name||''});
   tx.set(doc(collection(db,'notifs')),{to:id,section:m.section,kind:'pts',title:'🎁 نقاط ترحيبية',body:'تمت إضافة '+p+' نقطة ترحيبية لرصيدك',at:now});
   return p;
  });
  if(typeof res==='number')toast('تم صرف '+res+' نقطة ترحيبية لـ '+m.name);
  else toast({paid:'النقاط الترحيبية اتصرفت قبل كده',inel:'المخدوم ده مش مؤهل للنقاط الترحيبية',zero:'قيمة النقاط الترحيبية صفر — اضبطها من الإعدادات',nom:'سجل المخدوم غير موجود'}[res]||'تعذر الصرف',0);
  render(2);
 }catch(e){toast(e&&e.code==='permission-denied'?'مفيش صلاحية أو اتصرفت قبل كده':'فشل الصرف',0)}
};
// ----- ملف الخادم الشخصي -----
function spfForm(){tmpPhoto=me.photo||'';
 om(`<h3 style="margin-top:0">تعديل بياناتي</h3><div class="row"><span class="av" id="pv" style="width:64px;height:64px">${tmpPhoto?`<img src="${esc(tmpPhoto)}" alt="">`:ic('cam')}</span><input type="file" accept="image/*" onchange="ph(this)" style="margin:0"></div><div style="height:6px"></div><button class="btn sm o" onclick="rmPh()">حذف الصورة</button><div style="height:8px"></div><input id="fn" value="${esc(me.name)}" placeholder="الاسم"><input id="fp" inputmode="tel" value="${esc(me.phone?'0'+norm(me.phone):'')}" placeholder="رقم التليفون"><div class="s" style="margin-bottom:8px">لو غيّرت الرقم، رقم الدخول بيتحدّث عبر طلب إداري (لحد ما يتنفذ يفضل الدخول بالرقم القديم).</div><button class="btn g" onclick="spf()">حفظ</button>`)}
window.rmPh=()=>{tmpPhoto='';if($('#pv'))$('#pv').innerHTML=ic('cam')};

// ---------- امتداد دمج الإضافات (ترانيم، تصويت، تحليلات، تذكيرات، تحديثات) ----------
const X={app,db,auth,$,esc,ic,IC,pg,om,toast,PG,CFG,CH,CHK,SECN,chName,toMail,SQ,newSec,secOpts,secLogo,isA,wsec:()=>wsec,setW:k=>window.setW(k),av,fmt,fmtD,ago,norm,stat,evFor,C,mem,isS,Capacitor,LN,sched,ping,
 fire:{doc,setDoc,getDoc,collection,query,orderBy,limit,where,onSnapshot,writeBatch,increment,addDoc,updateDoc,deleteDoc,deleteField,getDocs,runTransaction,startAfter,serverTimestamp},
 S:()=>S,me:()=>me,uid:()=>uid,page:()=>page,render,back:()=>window.back(),L,unsub:f=>unsubs.push(f),
 qrData:t=>QRCode.toDataURL(t,{width:720,margin:2,color:{dark:'#000000'}})};
installExt(X);


// ----- 3D: ميلان خفيف للأزرار والبلاطات عند اللمس/المرور -----
(()=>{if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;let t=null;
 const rst=()=>{if(t){t.style.setProperty('--rx','0deg');t.style.setProperty('--ry','0deg');t=null}};
 document.addEventListener('pointermove',e=>{const el=e.target.closest&&e.target.closest('.tile,.bgc,.home-intro');if(el!==t)rst();if(!el)return;t=el;const r=el.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;el.style.setProperty('--ry',(px*12).toFixed(1)+'deg');el.style.setProperty('--rx',(-py*12).toFixed(1)+'deg')},{passive:true});
 document.addEventListener('pointerup',rst);document.addEventListener('pointercancel',rst);document.addEventListener('pointerleave',rst);
})();
// ---------- بداية التشغيل ----------
setBg(getBgKey(),false);
$('#spbg').innerHTML=splashBg();
setTimeout(()=>{const s=$('#splash');if(s){s.style.opacity=0;setTimeout(()=>s.remove(),650)}},1900);
