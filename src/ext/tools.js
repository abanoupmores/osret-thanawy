// التذكيرات (إعدادات + بديل Windows) • الاجتماع الأسبوعية الثابتة • تحديث التطبيق (إشعار + تنزيل وتثبيت على أندرويد)
import {Capacitor,registerPlugin} from '@capacitor/core';
import {APP_VERSION,WEEKDAYS} from '../config.js';

export const verCmp=(a,b)=>{const A=String(a).split('.').map(n=>parseInt(n)||0),B=String(b).split('.').map(n=>parseInt(n)||0);for(let i=0;i<Math.max(A.length,B.length);i++){const d=(A[i]||0)-(B[i]||0);if(d)return d>0?1:-1}return 0};
const pad=n=>String(n).padStart(2,'0');

export function installTools(X){
  const {db,$,esc,ic,pg,om,toast,PG}=X,F=X.fire,S=()=>X.S();

  // ===== التذكيرات =====
  const DEF={d1:true,h1:true,m15:true,at:true,tue:true,bd:true};
  const key=()=>'rm_'+X.uid();
  const rem=()=>{try{return {...DEF,...JSON.parse(localStorage.getItem(key())||'{}')}}catch(e){return {...DEF}}};
  const OFFS=[['d1',864e5,'بكرة','قبل الموعد بيوم'],['h1',36e5,'بعد ساعة','قبل الموعد بساعة'],['m15',9e5,'بعد 15 دقيقة','قبل الموعد بـ 15 دقيقة'],['at',0,'حان الآن','عند الموعد']];
  X.ext.rem=rem;X.ext.offs=OFFS;
  const permState=async()=>{
    if(X.Capacitor.isNativePlatform()){try{return (await X.LN.checkPermissions()).display}catch(e){return 'unknown'}}
    return 'Notification' in window?({granted:'granted',denied:'denied',default:'prompt'}[Notification.permission]):'unsupported';
  };
  PG.remind={t:'التذكيرات والإعدادات',v:()=>{
    const r=rem(),S2=X.isS(),T=(k,l,h)=>`<label class="opt"><input type="checkbox" ${r[k]?'checked':''} onchange="rmSet('${k}',this.checked)"><span>${l}${h?`<br><small class="s">${h}</small>`:''}</span></label>`;
    setTimeout(async()=>{const e=$('#rmp');if(e){const p=await permState();e.textContent={granted:'مفعّلة ✓',denied:'مرفوضة — فعّلها من إعدادات الجهاز',prompt:'لم تُطلب بعد',unsupported:'غير مدعومة على هذا الجهاز',unknown:'غير معروفة'}[p]||p}},50);
    return pg(`<div class="card"><h3>تذكيرات الأحداث (اجتماع / فعالية / نشاط)</h3>${OFFS.map(o=>T(o[0],o[3])).join('')}</div>
    ${S2?`<div class="card"><h3>تنبيهات الخادم</h3>${T('tue','تقرير الحضور كل ثلاثاء 9 صباحًا')}${T('bd','أعياد ميلاد المخدومين مع نسبة الحضور')}</div>`:''}
    <div class="card"><h3>إذن الإشعارات</h3><div class="row sp"><span class="s">الحالة: <b id="rmp">...</b></span><span class="row"><button class="btn sm o" onclick="rmAsk()">السماح</button><button class="btn sm o" onclick="rmTest()">تجربة</button></span></div>
    <div class="s" style="margin-top:8px">${X.Capacitor.isNativePlatform()?'على الموبايل التذكيرات بتتجدول على الجهاز وبتفضل شغالة حتى لو التطبيق مقفول، وبتتحدث كل ما تفتح التطبيق.':'على الكمبيوتر التذكيرات بتظهر طول ما التطبيق مفتوح.'}</div></div>
    <div class="card"><h3>عن التطبيق</h3><div class="row sp"><span>الإصدار</span><b dir="ltr">${APP_VERSION}</b></div><button class="btn sm o" style="margin-top:10px" onclick="go('upd')">${ic('upd')} التحديثات</button></div>`);
  }};
  window.rmSet=(k,v)=>{const r=rem();r[k]=!!v;try{localStorage.setItem(key(),JSON.stringify(r))}catch(e){toast('تعذر حفظ الإعداد',0);return}X.sched();toast('تم الحفظ')};
  window.rmAsk=async()=>{
    try{
      if(X.Capacitor.isNativePlatform()){const p=await X.LN.requestPermissions();toast(p.display==='granted'?'تم تفعيل الإشعارات':'الإذن مرفوض',p.display==='granted')}
      else if('Notification' in window){const p=await Notification.requestPermission();toast(p==='granted'?'تم تفعيل الإشعارات':'الإذن مرفوض',p==='granted')}
      else toast('الإشعارات غير مدعومة هنا',0);
    }catch(e){toast('تعذر طلب الإذن',0)}
    X.render(1);
  };
  window.rmTest=async()=>{
    if(X.Capacitor.isNativePlatform()){await X.ping('تجربة إشعار','التذكيرات شغالة ✔');toast('هيظهر الإشعار حالًا')}
    else if('Notification' in window&&Notification.permission==='granted'){new Notification('تجربة إشعار',{body:'التذكيرات شغالة ✔'})}
    else toast('اسمح بالإشعارات الأول',0);
  };
  // بديل Windows/الويب: تنبيه أثناء تشغيل التطبيق (Notification API) + شريط داخل التطبيق
  X.ext.startTick=()=>{
    if(X.Capacitor.isNativePlatform())return;
    const iv=setInterval(()=>{
      const r=rem(),now=Date.now(),m=X.mem();
      S().events.filter(e=>(X.isS()||!m||e.section==='both'||e.section===m.section)&&e.when>now-6e4).forEach(e=>{
        OFFS.forEach(o=>{
          if(!r[o[0]])return;const t=e.when-o[1];if(now<t||now>t+9e4)return;
          const k='fired_'+e.id+o[0];if(sessionStorage.getItem(k))return;try{sessionStorage.setItem(k,'1')}catch(x){}
          const body='ميعادها '+X.fmt(e.when)+' ('+o[2]+')';toast('🔔 '+e.title);
          if('Notification' in window&&Notification.permission==='granted')try{new Notification('تذكير: '+e.title,{body})}catch(x){}
        });
      });
    },30000);
    X.unsub(()=>clearInterval(iv));
  };

  // ===== الاجتماع الأسبوعية الثابتة =====
  const ev0=(d,t)=>{const [h,mi]=t.split(':').map(Number);return new Date(d.getFullYear(),d.getMonth(),d.getDate(),h,mi,0,0)};
  const wkSec=()=>X.isA()?(['boys','girls'].includes(X.wsec())?X.wsec():''):X.me().section,wkId=()=>'weekly_'+wkSec();
  const wid=(w,when)=>{const d=new Date(when);return `wk_${w.section}_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`};
  let genBusy=false;
  async function gen(w,fresh){
    if(genBusy||!X.isS()||!w||!w.enabled)return 0;genBusy=true;
    try{
      const now=Date.now(),end=now+Math.min(12,Math.max(1,w.weeks||8))*7*864e5,last=fresh?0:(w.lastGen||0);
      let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+((w.day-d.getDay()+7)%7));
      const have=new Set(S().events.map(e=>e.id)),b=F.writeBatch(db);let n=0,mx=last;
      for(let k=0;k<14;k++){
        const t=ev0(d,w.time).getTime();d.setDate(d.getDate()+7);
        if(t<now-36e5||t>end)continue;if(t<=last&&!fresh)continue;
        const id=wid(w,t);if(have.has(id)){mx=Math.max(mx,t);continue}
        b.set(F.doc(db,'events',id),{type:'rehearsal',title:w.title||'اجتماع الأسبوع',when:t,section:w.section,note:'',created:Date.now(),weekly:true,series:'weekly'});n++;mx=Math.max(mx,t);
      }
      if(n||mx>last){b.set(F.doc(db,'config',wkId()),{lastGen:mx},{merge:true});await b.commit()}
      return n;
    }finally{genBusy=false}
  }
  let tmr=null;X.ext.autoWeekly=()=>{clearTimeout(tmr);tmr=setTimeout(()=>{const w=S().weekly;if(w&&w.enabled)gen(w,false).catch(e=>console.warn('weekly',e.code||e))},3000)};
  PG.weekly={t:'الاجتماع الأسبوعية الثابتة',v:()=>{
    if(!X.isS())return pg('<div class="card s">للخادم فقط</div>');
    if(!wkSec())return pg('<div class="card s">اختار قسم (بنين أو بنات) من الصفحة الرئيسية الأول.</div>');
    const w=S().weekly||{},up=S().events.filter(e=>e.weekly&&e.when>Date.now()).sort((a,b)=>a.when-b.when);
    return pg(`<div class="card"><h3>${w.enabled?'مفعّلة ✓':'غير مفعّلة'}</h3>
     <label>العنوان</label><input id="wt" maxlength="60" value="${esc(w.title||'اجتماع الأسبوع')}">
     <label>اليوم</label><select id="wd">${WEEKDAYS.map((n,i)=>`<option value="${i}" ${(w.day??5)===i?'selected':''}>كل ${n}</option>`).join('')}</select>
     <label>الوقت</label><input id="wh" type="time" value="${esc(w.time||'18:00')}">
     <div class="s" style="margin:4px 0 8px">القسم: ${X.chName(wkSec())}</div>
     <label>عدد الأسابيع القادمة اللي تتجهز مقدمًا (1–12)</label><input id="ww" type="number" min="1" max="12" value="${w.weeks||8}">
     <button class="btn g" onclick="wkSave(true)">حفظ وإنشاء المواعيد</button>${w.enabled?`<div style="height:8px"></div><button class="btn no" onclick="wkSave(false)">إيقاف التكرار (المواعيد المنشورة تفضل)</button>`:''}
     <div class="s" style="margin-top:8px">بتتحول لأحداث «اجتماع» عادية، فالحضور والنقاط والتقارير والتذكيرات شغالة عليها كالمعتاد. مواعيد اتحذفت قبل كده مش بترجع.</div></div>
     <div class="card"><h3>المواعيد القادمة (${up.length})</h3>${up.slice(0,10).map(e=>`<div class="li"><span class="nic" style="background:#f4e8c6">📖</span><div class="t"><b>${esc(e.title)}</b><span class="s">${X.fmt(e.when)} · ${X.chName(e.section)}</span></div></div>`).join('')||'<div class="s">لا يوجد</div>'}</div>`);
  }};
  window.wkSave=async on=>{
    const w0=S().weekly||{};let w;
    if(on){
      const title=$('#wt').value.trim(),time=$('#wh').value,day=+$('#wd').value,weeks=Math.round(+$('#ww').value);
      if(!title||!/^\d{2}:\d{2}$/.test(time)||!(weeks>=1&&weeks<=12)){toast('راجع العنوان والوقت وعدد الأسابيع',0);return}
      w={enabled:true,title,time,day,section:wkSec(),weeks,lastGen:0,updatedAt:Date.now(),by:X.me().name||''};
    }else w={...w0,enabled:false,updatedAt:Date.now()};
    try{
      if(!wkSec()){toast('اختار القسم',0);return}await F.setDoc(F.doc(db,'config',wkId()),w,{merge:true});
      if(on){const n=await gen(w,true);
        await F.addDoc(F.collection(db,'notifs'),{to:'all',section:w.section,kind:'event',title:'اجتماع أسبوعي ثابت',body:'كل '+WEEKDAYS[w.day]+' الساعة '+w.time,at:Date.now()});
        toast('تم — اتجهز '+n+' ميعاد')}
      else toast('اتوقف التكرار');
    }catch(e){toast(e&&e.code==='permission-denied'?'مفيش صلاحية':'فشل الحفظ',0)}
  };

  // ===== إشعار تحديث التطبيق (بدون تنزيل/تثبيت تلقائي) =====
  const newer=()=>{const u=S().upd;return !!(u&&u.isActive&&u.version&&verCmp(u.version,APP_VERSION)>0)};
  // ----- تنزيل وتثبيت التحديث (أندرويد فقط؛ على ويندوز/المتصفح يبقى الرابط اليدوي) -----
  const native=(()=>{try{return Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android'}catch(e){return false}})();
  const Apk=native?registerPlugin('ApkInstaller'):null;
  const ups={st:'idle',pct:0,msg:''};          // idle | perm | dl | ready | err
  const UPERR={
    BAD_URL:'رابط التحديث غير صالح (لازم https).',BUSY:'التنزيل شغال بالفعل.',TOO_BIG:'حجم الملف أكبر من المسموح.',
    BAD_FILE:'الملف المنزّل غير صالح أو ناقص. جرّب مرة تانية.',HASH_MISMATCH:'بصمة الملف (SHA-256) لا تطابق المنشورة، لم يتم التثبيت حفاظًا على أمانك.',
    WRONG_PACKAGE:'الملف ده مش تحديث لتطبيق الخدمة، لم يتم التثبيت.',NOT_NEWER:'الملف ده مش أحدث من النسخة المثبتة.',
    SIGNATURE_MISMATCH:'النسخة الجديدة موقّعة بمفتاح مختلف عن المثبتة، فأندرويد مش هيقبل التحديث فوقها. احذف التطبيق مرة واحدة وثبّت الجديد (بياناتك على السيرفر آمنة).',
    NEEDS_PERMISSION:'لازم تسمح للتطبيق بتثبيت التحديثات من الإعدادات.',NO_FILE:'الملف اتمسح، حمّل التحديث تاني.',
    TOO_MANY_REDIRECTS:'رابط التحميل بيحوّل كتير.',BAD_REDIRECT:'رابط التحميل حوّل لعنوان غير آمن.',DOWNLOAD_FAILED:'فشل التحميل. اتأكد من الإنترنت وجرّب تاني.',INSTALL_FAILED:'تعذّر فتح مثبّت أندرويد.'
  };
  const upMsg=e=>{const c=String((e&&(e.message||e.code))||'');return UPERR[c]||(/^HTTP_/.test(c)?'السيرفر رد بخطأ ('+c.slice(5)+'). تأكد إن رابط التحميل شغال وعام.':'تعذّر إكمال التحديث ('+c.slice(0,40)+').')};
  const upBar=()=>{const el=$('#upbar');if(el)el.style.width=ups.pct+'%';const t=$('#upst');if(t)t.textContent=upLine()};
  const upLine=()=>ups.st==='dl'?'جاري التحميل '+ups.pct+'%':ups.st==='perm'?UPERR.NEEDS_PERMISSION+' بعد ما تسمح ارجع واضغط «تحديث الآن» تاني.':ups.st==='ready'?'اكتمل التحميل — أكمل التثبيت من شاشة أندرويد.':ups.st==='err'?ups.msg:'';
  window.upGo=async()=>{
    const u=S().upd;if(!Apk||!u||!u.url||ups.st==='dl')return;
    try{
      const ok=await Apk.canInstall();
      if(!ok.allowed){ups.st='perm';X.render();try{await Apk.openInstallSettings()}catch(e){}return}
      ups.st='dl';ups.pct=0;X.render();
      const h=await Apk.addListener('progress',e=>{ups.pct=e.total>0?Math.min(99,Math.floor(e.received*100/e.total)):0;upBar()});
      try{await Apk.download({url:u.url,sha256:u.sha256||''})}finally{try{h.remove()}catch(e){}}
      ups.pct=100;ups.st='ready';X.render();
      await Apk.install();
    }catch(e){ups.st='err';ups.msg=upMsg(e);X.render();toast(ups.msg,0)}
  };
  const upBox=u=>`<div class="card"><h3>إصدار جديد: <span dir="ltr">${esc(u.version)}</span></h3><div class="lyr">${esc(u.notes||'تحديث جديد يتضمن مميزات وتحسينات جديدة')}</div>
    ${native&&u.url?`<button class="btn g" style="margin-top:10px" onclick="upGo()" ${ups.st==='dl'?'disabled':''}>${ic('upd')} ${ups.st==='dl'?'جاري التحميل...':'تحديث الآن'}</button>
      <div class="pbar" style="${ups.st==='idle'?'display:none':''}"><i id="upbar" style="width:${ups.pct}%"></i></div><div class="s" id="upst" style="margin-top:6px">${esc(upLine())}</div>
      <div class="s" style="margin-top:6px">التطبيق بيحمّل الملف ويتحقق من بصمته وتوقيعه، وبعدها بيفتح مثبّت أندرويد وإنت اللي بتوافق على التثبيت.</div>`:''}
    ${u.url?`<a class="btn ${native?'o':'g'}" style="margin-top:10px;text-decoration:none" href="${esc(u.url)}" target="_blank" rel="noopener noreferrer">${ic('dl')} ${native?'تحميل من المتصفح (بديل)':'تحميل التحديث'}</a>`:''}
    ${u.sha256?`<div class="s" style="margin-top:8px">للتحقق من سلامة الملف (SHA-256):</div><div class="hash" dir="ltr">${esc(u.sha256)}</div>`:''}
    <div class="s" style="margin-top:6px">حمّل الملف من الرابط فقط إذا كان من مصدر الخدمة الرسمي، وقارن البصمة قبل التثبيت.</div></div>`;
  PG.upd={t:'التحديثات',v:()=>{
    const u=S().upd;
    return pg(`<div class="card"><div class="row sp"><span>الإصدار الحالي</span><b dir="ltr">${APP_VERSION}</b></div></div>
    ${newer()?upBox(u):`<div class="card s">${u&&u.isActive?'أنت على آخر إصدار ✓':'لا توجد تحديثات منشورة'}</div>`}
    ${X.isA()?`<div class="card"><h3>نشر إشعار تحديث (للمخدومين والخدام)</h3>
     <input id="uv" dir="ltr" inputmode="decimal" placeholder="رقم الإصدار الجديد (مثال: 4.1)" value="${esc(u&&u.version||'')}">
     <textarea id="un" rows="3" placeholder="ملاحظات التحديث للمستخدمين">${esc(u&&u.notes||'')}</textarea>
     <input id="ul" dir="ltr" inputmode="url" placeholder="رابط التحميل https://..." value="${esc(u&&u.url||'')}">
     <input id="us" dir="ltr" placeholder="SHA-256 للملف (اختياري، 64 حرف)" value="${esc(u&&u.sha256||'')}">
     <button class="btn g" onclick="upPub(true)">نشر التحديث الآن</button>${u&&u.isActive?`<div style="height:8px"></div><button class="btn no" onclick="upPub(false)">إلغاء / إيقاف التحديث الحالي</button>`:''}
     <div class="s" style="margin-top:8px">الرابط لازم يكون رابط تحميل مباشر https لملف APK (مثلاً من GitHub Release العام). على أندرويد المستخدم بيضغط «تحديث الآن» والتطبيق بيتحقق من البصمة والتوقيع قبل فتح المثبّت؛ بدون بصمة بيتحقق من التوقيع فقط.</div></div>`:''}`);
  }};
  window.upPub=async on=>{
    if(!X.isA())return;let d;
    if(on){
      const version=$('#uv').value.trim(),notes=$('#un').value.trim(),url=$('#ul').value.trim(),sha=$('#us').value.trim().toLowerCase();
      if(!/^\d+(\.\d+){0,3}$/.test(version)){toast('رقم الإصدار غلط (مثال 4.1)',0);return}
      if(verCmp(version,APP_VERSION)<=0&&!confirm('الإصدار ده مش أحدث من الحالي ('+APP_VERSION+'). تنشر برضه؟'))return;
      if(url&&!/^https:\/\/[^\s]+$/i.test(url)){toast('الرابط لازم يبدأ بـ https://',0);return}
      if(sha&&!/^[a-f0-9]{64}$/.test(sha)){toast('البصمة لازم تكون 64 حرف hex',0);return}
      d={version,notes,url,sha256:sha,isActive:true,updatedAt:Date.now(),by:X.me().name||''};
    }else d={isActive:false,updatedAt:Date.now()};
    try{await F.setDoc(F.doc(db,'config','app_update'),d,{merge:true});
      if(on)await F.addDoc(F.collection(db,'notifs'),{to:'all',section:'both',kind:'msg',title:'تحديث جديد متوفر',body:'الإصدار '+d.version+(d.notes?' — '+d.notes.slice(0,120):''),at:Date.now()});
      toast(on?'تم نشر التحديث لكل الأعضاء بنجاح':'تم إيقاف إشعار التحديث')}catch(e){toast(e&&e.code==='permission-denied'?'مفيش صلاحية: انشر القواعد':'فشل الحفظ',0)}
  };

  // ===== عناصر الصفحة الرئيسية =====
  X.ext.homeExtras=()=>{
    let h='';const u=S().upd;
    if(newer())h+=`<div class="card" onclick="go('upd')" style="border:2px solid var(--gold2)"><div class="row sp"><b>${ic('upd')} تحديث جديد متوفر (<span dir="ltr">${esc(u.version)}</span>)</b><span class="ch">${ic('chev')}</span></div></div>`;
    const ap=X.ext.activePolls?X.ext.activePolls():[];
    if(ap.length)h+=`<div class="card" onclick="go('polls')"><div class="row sp"><b>${ic('poll')} ${X.isS()?'تصويت نشط':'رأيك يهمنا'}: ${esc(ap[0].question)}</b><span class="ch">${ic('chev')}</span></div></div>`;
    return h;
  };
}
