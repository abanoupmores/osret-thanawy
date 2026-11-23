// 5.0.0 — إدارة الحسابات والطلبات. الصلاحيات الحقيقية في firestore.rules؛ الواجهة هنا للراحة فقط.
//  - الخادم: يوافق على/يرفض طلبات مخدومي قسمه، ويوقف/يفعّل حساباتهم.
//  - المدير العام: يوافق على الخدام، ينشئ حساب خادم، يوقف/يفعّل أي حساب، ويرى القسمين.
import {initializeApp} from 'firebase/app';
import {getAuth,createUserWithEmailAndPassword,signOut,deleteUser} from 'firebase/auth';
export function installAdmin(X){
  const {db,$,esc,ic,pg,om,toast,PG}=X,F=X.fire,S=()=>X.S();
  const TMP_PW='123456',lbl={pending:['بانتظار الموافقة','wa'],active:['مفعّل','ok'],suspended:['موقوف','no'],rejected:['مرفوض','gray']};
  const pill=s=>{const l=lbl[s]||[s,'gray'];return `<span class="pill ${l[1]}">${l[0]}</span>`};
  const err=e=>e&&e.code==='permission-denied'?'مفيش صلاحية لتنفيذ ده':'تعذر التنفيذ، حاول تاني';
  const pendServ=()=>X.isA()?S().users.filter(u=>u.role==='servant'&&u.status==='pending'):[];
  X.ext.pendingCount=()=>S().pendM.length+pendServ().length;

  PG.requests={t:'طلبات التسجيل',v:()=>{
    if(!X.isS())return pg('<div class="card s">للخدام فقط</div>');
    const M=S().pendM,V=pendServ();
    const row=(n,sub,kind,id)=>`<div class="li"><div class="t"><b>${esc(n)}</b><span class="s">${sub}</span></div><div class="row w" style="gap:6px;flex:none"><button class="btn sm ok" onclick="rqOk('${kind}','${id}')">قبول</button><button class="btn sm no" onclick="rqNo('${kind}','${id}')">رفض</button></div></div>`;
    return pg(`${X.isA()?`<div class="card"><h3>طلبات الخدام (${V.length})</h3>${V.map(u=>row(u.name,X.chName(u.section)+' · '+X.norm(u.phone),'u',u.id)).join('')||'<div class="s">لا توجد طلبات</div>'}</div>`:''}<div class="card"><h3>طلبات المخدومين (${M.length})</h3>${M.map(m=>row(m.name,X.chName(m.section)+' · '+X.norm(m.phone),'m',m.id)).join('')||'<div class="s">لا توجد طلبات</div>'}</div>`);
  }};
  async function setStatus(uid,status,mem){
    const b=F.writeBatch(db);
    b.update(F.doc(db,'users',uid),{status});
    if(mem&&status==='active')b.update(F.doc(db,'members',mem),{approved:true});
    await b.commit();
  }
  window.rqOk=async(k,id)=>{try{
    if(k==='u')await setStatus(id,'active');
    else{const m=S().pendM.find(x=>x.id===id);if(!m||!m.uid)return;await setStatus(m.uid,'active',m.id)}
    toast('تم التفعيل')}catch(e){toast(err(e),0)}};
  window.rqNo=async(k,id)=>{if(!confirm('رفض الطلب؟'))return;try{
    const uid=k==='u'?id:(S().pendM.find(x=>x.id===id)||{}).uid;if(!uid)return;
    await F.updateDoc(F.doc(db,'users',uid),{status:'rejected'});toast('تم الرفض')}catch(e){toast(err(e),0)}};

  PG.accounts={t:'الحسابات والصلاحيات',act:()=>X.isA()?`<button class="ib" onclick="svForm()">${ic('plus')}</button>`:'',v:()=>{
    if(!X.isS())return pg('<div class="card s">للخدام فقط</div>');
    const L=S().users.filter(u=>u.role!=='admin').sort((a,b)=>(a.section+a.role+a.name).localeCompare(b.section+b.role+b.name,'ar'));
    const scoped=X.isA()&&X.wsec()!=='all'?L.filter(u=>u.section===X.wsec()):L;
    return pg(`<div class="card"><h3>الحسابات (${scoped.length})</h3>${scoped.map(u=>`<div class="li"><div class="t"><b>${esc(u.name)}</b><span class="s">${u.role==='servant'?'خادم':'مخدوم'} · ${X.chName(u.section)} · ${X.norm(u.phone)}</span></div><div style="flex:none;text-align:left">${pill(u.status)}<div style="height:6px"></div>${u.status==='active'?`<button class="btn sm no" onclick="acSet('${u.id}','suspended')">إيقاف</button>`:u.status==='suspended'?`<button class="btn sm ok" onclick="acSet('${u.id}','active')">تفعيل</button>`:''}</div></div>`).join('')||'<div class="s">لا توجد حسابات</div>'}</div>`);
  }};
  window.acSet=async(id,s)=>{if(!confirm(s==='suspended'?'إيقاف الحساب؟':'تفعيل الحساب؟'))return;try{await F.updateDoc(F.doc(db,'users',id),{status:s});toast('تم')}catch(e){toast(err(e),0)}};

  PG.admin={t:'لوحة المدير العام',v:()=>{
    if(!X.isA())return pg('<div class="card s">للمدير العام فقط</div>');
    const U=S().users,cnt=(sec,role,st)=>U.filter(u=>u.section===sec&&u.role===role&&(!st||u.status===st)).length;
    const card=sec=>`<div class="card"><div class="secbadge"><img src="${X.secLogo(sec)}" alt=""><b>${X.chName(sec)}</b></div><div class="row sp"><span>مخدومون مفعّلون</span><b>${cnt(sec,'member','active')}</b></div><div class="row sp"><span>خدام مفعّلون</span><b>${cnt(sec,'servant','active')}</b></div><div class="row sp"><span>طلبات معلّقة</span><b>${U.filter(u=>u.section===sec&&u.status==='pending').length}</b></div></div>`;
    return pg(`${card('boys')}${card('girls')}<button class="btn g" onclick="go('requests')">${ic('users')} طلبات التسجيل (${X.ext.pendingCount()})</button><div style="height:8px"></div><button class="btn o" onclick="go('accounts')">${ic('user')} الحسابات والصلاحيات</button><div style="height:8px"></div><button class="btn o" onclick="svForm()">${ic('plus')} إنشاء حساب خادم</button><div style="height:8px"></div><button class="btn o" onclick="go('set')">${ic('gear')} الإعدادات ونظام النقاط</button>`);
  }};

  // إنشاء حساب خادم بواسطة المدير العام عبر تطبيق Firebase ثانوي (لا تسجيل خروج للمدير، ولا مفاتيح Admin)
  let secAuth=null;const sa=()=>secAuth||(secAuth=getAuth(initializeApp(X.CFG.firebase,'servant-provision')));
  window.svForm=()=>{if(!X.isA())return;om(`<h3 style="margin-top:0">إنشاء حساب خادم</h3><input id="sn" placeholder="الاسم"><input id="sp" inputmode="tel" placeholder="رقم التليفون (اسم الدخول)"><label>القسم</label><select id="ss"><option value="boys">قسم البنين</option><option value="girls">قسم البنات</option></select><div class="s" style="margin:6px 0">الباسورد المؤقت ${TMP_PW} ويُطلب تغييره عند أول دخول.</div><button class="btn g" onclick="svSave()">إنشاء</button>`)};
  window.svSave=async()=>{
    if(!X.isA())return;const n=$('#sn').value.trim(),mail=X.toMail($('#sp').value),sec=$('#ss').value;
    if(!n||!mail||mail.includes('@')&&!mail.endsWith('@phone.osret-thanawy.app')){toast('اكتب الاسم ورقم تليفون صحيح',0);return}
    let cred=null;
    try{
      cred=await createUserWithEmailAndPassword(sa(),mail,TMP_PW);
      await F.setDoc(F.doc(db,'users',cred.user.uid),{name:n,role:'servant',section:sec,status:'active',contact:X.norm($('#sp').value),phone:X.norm($('#sp').value),memberId:'',mustChangePw:true,createdAt:Date.now()});
      try{await signOut(sa())}catch(e){}
      $('#md').style.display='none';X.render(2);toast('تم إنشاء حساب الخادم ✔');
    }catch(e){
      if(cred){try{await deleteUser(cred.user)}catch(x){}}
      toast(e&&e.code==='auth/email-already-in-use'?'الرقم ده له حساب بالفعل':err(e),0);
    }
  };
}
