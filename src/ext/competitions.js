// المسابقات (5.1.0): الخادم ينشر رابط مسابقة (Google Form أو أي رابط https)، والمخدومون يفتحونه من التطبيق.
// بعد انتهاء المسابقة يدخل الخادم درجة كل مخدوم، فتتحوّل تلقائيًا إلى نقاط في التطبيق.
//   linkContests/{id}            { section, title, description, url, deadline, maxPts, closed, createdBy, createdAt }
//   adjustments/lc_{id}_{member} { type:'contest', contestId, memberId, section, pts, reason, by, at }  ← النقاط (يمكن تصحيحها لاحقًا)
export function installCompetitions(X){
  const {db,$,esc,ic,pg,om,toast,PG}=X,F=X.fire,S=()=>X.S();
  const err=e=>e&&e.code==='permission-denied'?'مفيش صلاحية. تأكد من نشر قواعد Firestore الأخيرة':e&&e.code==='unavailable'?'الاتصال بالإنترنت غير متاح':'تعذر التنفيذ، حاول تاني';
  const list=()=>(S().linkContests||[]).slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const aid=(c,m)=>'lc_'+c+'_'+m;
  const drafts={};  // درجات مكتوبة ولم تُحفظ: تبقى عند تحديث الصفحة
  window.lcDraft=(c,m,v)=>{drafts[c+'_'+m]=v};
  const myAdj=c=>{const m=X.mem();return m?S().adj.find(a=>a.id===aid(c.id,m.id)):null};
  const open=c=>!c.closed&&(!c.deadline||Date.now()<=c.deadline);
  const dl=n=>n?new Date(n).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}):'بدون موعد نهائي';
  const pill=c=>c.closed?'<span class="pill gray">مغلقة</span>':open(c)?'<span class="pill ok">مفتوحة</span>':'<span class="pill wa">انتهى الموعد</span>';
  const loc=n=>{const d=new Date(n),p=v=>String(v).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())};
  const goodUrl=u=>{try{const x=new URL(u);return x.protocol==='https:'&&x.hostname.includes('.')}catch(e){return false}};

  const card=c=>{const a=myAdj(c),isS=X.isS();
    return `<div class="card"><div class="row sp"><b style="font-size:16px">🏆 ${esc(c.title)}</b>${pill(c)}</div>
    ${c.description?`<div class="s" style="margin:6px 0">${esc(c.description)}</div>`:''}
    <div class="s">القسم: ${X.chName(c.section)} · آخر موعد: ${dl(c.deadline)} · الدرجة العظمى: ${c.maxPts} نقطة</div>
    ${!isS&&a?`<div class="card" style="background:#e9f8f1;margin:10px 0 0"><b>درجتك: ${a.pts} نقطة ✔</b><div class="s">اتضافت لرصيدك</div></div>`:''}
    <div class="row" style="margin-top:10px;gap:8px">
      <a class="btn g" style="text-decoration:none;flex:2" href="${esc(c.url)}" target="_blank" rel="noopener">${ic('link')} افتح المسابقة</a>
      ${isS?`<button class="btn o" style="flex:1" onclick="go('contest','${c.id}')">النتائج</button>`:`<button class="btn o" style="flex:1" onclick="lcCopy('${c.id}')">نسخ</button>`}
    </div></div>`};
  PG.competitions={t:()=>'المسابقات',act:()=>X.isS()?`<button class="ib" onclick="lcForm()">${ic('plus')}</button>`:'',v:()=>{
    const L=list();
    const sub=X.isA()&&X.wsec()==='all'?'':'';
    return pg(`${sub}${L.map(card).join('')||'<div class="card s" style="text-align:center">'+(X.isS()?'مفيش مسابقات. اضغط + وانشر رابط مسابقة.':'مفيش مسابقات حاليًا.')+'</div>'}`);
  }};
  window.lcCopy=async id=>{const c=list().find(x=>x.id===id);if(!c)return;try{await navigator.clipboard.writeText(c.url);toast('تم نسخ الرابط')}catch(e){toast(c.url)}};

  window.lcForm=()=>{if(!X.isS())return;
    om(`<h3 style="margin-top:0">نشر مسابقة جديدة</h3>
    <input id="lt" placeholder="عنوان المسابقة (مثال: مسابقة سفر الرؤيا)">
    <textarea id="ld" placeholder="وصف قصير (اختياري)" rows="2"></textarea>
    <input id="lu" dir="ltr" inputmode="url" placeholder="https:// رابط المسابقة (Google Form مثلًا)">
    <label>آخر موعد (اختياري)</label><input id="ldl" type="datetime-local">
    <label>الدرجة العظمى (نقاط)</label><input id="lm" type="number" min="1" max="100" value="10">
    <label>القسم</label><select id="ls">${X.secOpts(true)}</select>
    <button class="btn g" onclick="lcSave()">نشر للمخدومين</button>`)};
  window.lcSave=async()=>{
    const title=$('#lt').value.trim(),url=$('#lu').value.trim(),max=parseInt($('#lm').value,10),dv=$('#ldl').value,section=X.newSec($('#ls').value);
    if(!title){toast('اكتب عنوان المسابقة',0);return}
    if(!goodUrl(url)){toast('الرابط لازم يبدأ بـ https://',0);return}
    if(!(max>=1&&max<=100)){toast('الدرجة العظمى من 1 لـ 100',0);return}
    if(!section){toast('اختار القسم',0);return}
    const c={section,title,description:$('#ld').value.trim(),url,deadline:dv?new Date(dv).getTime():0,maxPts:max,closed:false,createdBy:X.uid(),createdByName:X.me().name||'',createdAt:Date.now()};
    try{const b=F.writeBatch(db),r=F.doc(F.collection(db,'linkContests'));
      b.set(r,c);
      b.set(F.doc(F.collection(db,'notifs')),{to:'all',section,kind:'msg',title:'🏆 مسابقة جديدة: '+title,body:'افتح المسابقات من الرئيسية وادخل على الرابط'+(dv?' قبل '+dl(c.deadline):''),at:Date.now()});
      await b.commit();$('#md').style.display='none';toast('تم نشر المسابقة');X.render()}
    catch(e){toast(err(e),0)}};

  PG.contest={t:()=>'نتائج المسابقة',v:id=>{
    const c=list().find(x=>x.id===id);if(!c)return pg('<div class="card s">المسابقة غير موجودة</div>');
    if(!X.isS())return pg('<div class="card s">للخدام فقط</div>');
    const M=S().members.filter(m=>c.section==='both'||m.section===c.section).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar'));
    const adj=m=>S().adj.find(a=>a.id===aid(c.id,m.id));
    return pg(`${card(c).replace(/<div class="row" style="margin-top:10px;gap:8px">[\s\S]*<\/div><\/div>$/,'</div>')}
    <div class="card"><h3>الدرجات (من ${c.maxPts})</h3><div class="s" style="margin-bottom:8px">شوف نتيجة الرابط وادخل درجة كل مخدوم. الدرجة بتتحوّل نقط فورًا، وتقدر تصححها بعدين.</div>
    ${M.map(m=>{const a=adj(m);return `<div class="li"><div class="t"><b>${esc(m.name)}</b><span class="s">${a?'الدرجة الحالية: '+a.pts:'لم تُدخل'}</span></div><div class="row" style="flex:none;gap:6px"><input id="lp_${m.id}" type="number" min="0" max="${c.maxPts}" step="1" value="${drafts[c.id+'_'+m.id]!==undefined?drafts[c.id+'_'+m.id]:(a?a.pts:'')}" oninput="lcDraft('${c.id}','${m.id}',this.value)" placeholder="0" style="width:74px;margin:0;text-align:center"><button class="btn sm g" style="width:auto" onclick="lcAward('${c.id}','${m.id}')">حفظ</button></div></div>`}).join('')||'<div class="s">مفيش مخدومين</div>'}
    <button class="btn" style="margin-top:10px" onclick="lcAll('${c.id}')">حفظ كل الدرجات المكتوبة</button></div>
    <div class="row" style="gap:8px"><button class="btn o" onclick="lcToggle('${c.id}')">${c.closed?'إعادة فتح':'إغلاق المسابقة'}</button><button class="btn o" style="color:var(--no);border-color:var(--no)" onclick="lcDel('${c.id}')">حذف</button></div>`);
  }};
  async function award(c,m,val){
    const aref=F.doc(db,'adjustments',aid(c.id,m.id)),mref=F.doc(db,'members',m.id);
    return F.runTransaction(db,async tx=>{
      const [a,mm]=await Promise.all([tx.get(aref),tx.get(mref)]);
      const old=a.exists()?(a.data().pts||0):0,d=val-old;
      if(d===0&&a.exists())return 0;
      tx.set(aref,{memberId:m.id,section:m.section,pts:val,type:'contest',contestId:c.id,reason:'مسابقة: '+c.title,by:X.me().name||'',at:Date.now()});
      tx.update(mref,{points:(mm.data().points||0)+d});
      delete drafts[c.id+'_'+m.id];
      tx.set(F.doc(F.collection(db,'notifs')),{to:m.id,section:m.section,kind:'pts',title:'🏆 نتيجة المسابقة',body:c.title+' — درجتك '+val+' من '+c.maxPts+' (اتضافت لرصيدك)',at:Date.now()});
      return d});
  }
  const readVal=(c,id)=>{const el=$('#lp_'+id);if(!el||el.value==='')return null;const v=Number(el.value);return Number.isInteger(v)&&v>=0&&v<=c.maxPts?v:NaN};
  window.lcAward=async(cid,mid)=>{const c=list().find(x=>x.id===cid),m=S().members.find(x=>x.id===mid);if(!c||!m)return;
    const v=readVal(c,mid);if(v===null){toast('اكتب الدرجة',0);return}if(Number.isNaN(v)){toast('الدرجة من 0 لـ '+c.maxPts+' (رقم صحيح)',0);return}
    try{await award(c,m,v);toast('تم حفظ درجة '+m.name)}catch(e){toast(err(e),0)}};
  window.lcAll=async cid=>{const c=list().find(x=>x.id===cid);if(!c)return;let ok=0,bad=0;
    for(const m of S().members.filter(m=>c.section==='both'||m.section===c.section)){const v=readVal(c,m.id);if(v===null)continue;if(Number.isNaN(v)){bad++;continue}
      try{await award(c,m,v);ok++}catch(e){bad++}}
    toast(ok?'تم حفظ '+ok+' درجة'+(bad?' — وفشل '+bad:''):(bad?'فيه درجات غير صالحة':'مفيش درجات مكتوبة'),bad&&!ok?0:1)};
  window.lcToggle=async id=>{const c=list().find(x=>x.id===id);if(!c)return;try{await F.updateDoc(F.doc(db,'linkContests',id),{closed:!c.closed});toast(c.closed?'تم فتح المسابقة':'تم الإغلاق')}catch(e){toast(err(e),0)}};
  window.lcDel=async id=>{if(!confirm('حذف المسابقة؟ (النقاط اللي اتمنحت تفضل في الرصيد)'))return;try{await F.deleteDoc(F.doc(db,'linkContests',id));window.back();toast('تم الحذف')}catch(e){toast(err(e),0)}};
}
