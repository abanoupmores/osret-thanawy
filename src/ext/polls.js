// نظام التصويت: إنشاء/نشر/إنهاء، اختيار واحد أو أكثر، منع التكرار، نقطة للمصوّت، عرض النتائج وأسماء المصوّتين
// polls/{id}  +  pollVotes/{pollId}_{memberId}  (معرّف ثابت = لا يمكن التصويت مرتين)
export function installPolls(X){
  const {db,$,esc,ic,pg,om,toast,PG}=X,F=X.fire,S=()=>X.S();
  const st={opts:['',''],multi:false,section:'',busy:false};
  const votePts=()=>{const v=(S().cfg||{}).votePts;return v==null||v===''||!Number.isFinite(+v)?1:Math.max(0,Math.min(5,Math.round(+v)))};
  X.ext.votePts=votePts;
  const polls=()=>S().polls.filter(p=>!p.deleted).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const eligible=(p,m)=>!!m&&(p.section==='both'||p.section===m.section);
  const myVote=(p)=>{const m=X.mem();return m?S().votes.find(v=>v.pollId===p.id&&v.memberId===m.id):null};
  const tally=p=>{const n=(p.options||[]).length,c=Array(n).fill(0);let t=0;S().votes.filter(v=>v.pollId===p.id).forEach(v=>{t++;(v.choices||[]).forEach(i=>{if(i>=0&&i<n)c[i]++})});return{c,t}};
  const res=p=>p.final&&Array.isArray(p.final.counts)?{c:p.final.counts,t:p.final.total||0}:null;
  const bars=(p,r)=>(p.options||[]).map((o,i)=>{const n=r.c[i]||0,pc=r.t?Math.round(n/r.t*100):0;return `<div style="margin:8px 0"><div class="row sp"><span>${esc(o)}</span><b>${n} <span class="s">(${pc}%)</span></b></div><div class="bar" style="margin-top:4px"><i style="width:${pc}%;background:var(--navy2)"></i></div></div>`}).join('');
  const closeM=()=>{$('#md').style.display='none';X.render(2)};
  const errMsg=e=>e&&e.code==='permission-denied'?'مفيش صلاحية: انشر قواعد Firestore الجديدة':e&&e.code==='unavailable'?'مفيش اتصال بالنت':'حصلت مشكلة، حاول تاني';

  // ---------- الخادم ----------
  function sView(){
    const L=polls(),act=L.filter(p=>p.isActive),dr=L.filter(p=>!p.isActive&&!p.endedAt),ended=L.filter(p=>!p.isActive&&p.endedAt);
    const card=p=>{const r=p.isActive||!res(p)?tally(p):res(p);
      return `<div class="card"><div class="row sp"><b>${esc(p.question)}</b><span class="pill ${p.isActive?'ok':p.endedAt?'gray':'wa'}">${p.isActive?'نشط':p.endedAt?'منتهي':'مسودة'}</span></div>
      <div class="s">${X.chName(p.section)} · ${p.allowMultiple?'أكثر من اختيار':'اختيار واحد'} · ${r.t} مشارك</div>${bars(p,r)}
      <div class="row w" style="margin-top:10px">${p.isActive?`<button class="btn sm no" onclick="plEnd('${p.id}')">إنهاء التصويت وإخفاؤه</button>`:!p.endedAt?`<button class="btn sm g" onclick="plPublish('${p.id}')">نشر الآن</button>`:`<button class="btn sm o" onclick="plReopen('${p.id}')">إعادة فتح</button>`}<button class="btn sm o" onclick="plWho('${p.id}')">من صوّت؟</button>${!p.isActive?`<button class="btn sm o" onclick="plDel('${p.id}')">حذف</button>`:''}</div></div>`};
    return pg(`<button class="btn g" onclick="plForm()" style="margin-bottom:12px">${ic('plus')} إنشاء تصويت جديد</button>
      ${act.map(card).join('')||'<div class="card s">لا يوجد تصويت نشط حاليًا</div>'}
      ${dr.length?'<h3 style="color:#fff;margin:14px 4px 8px">مسودات</h3>'+dr.map(card).join(''):''}
      ${ended.length?'<h3 style="color:#fff;margin:14px 4px 8px">تصويتات سابقة</h3>'+ended.map(card).join(''):''}`);
  }
  window.plForm=()=>{st.opts=['',''];st.multi=false;st.section=X.isA()?(['boys','girls'].includes(X.wsec())?X.wsec():'both'):X.me().section;
    const draw=()=>`<h3 style="margin-top:0">إنشاء تصويت جديد</h3><input id="plq" maxlength="200" placeholder="السؤال؟"><div id="plo">${st.opts.map((o,i)=>`<div class="row"><input data-i="${i}" class="plop" maxlength="100" placeholder="الخيار رقم ${i+1}" value="${esc(o)}">${st.opts.length>2?`<button class="ib" style="color:var(--no)" onclick="plOptDel(${i})">${ic('x')}</button>`:''}</div>`).join('')}</div><button class="btn sm o" onclick="plOptAdd()">+ إضافة خيار جديد</button><div style="height:10px"></div>
    <label><input type="checkbox" id="plm" style="width:auto;margin:0 0 0 8px" ${st.multi?'checked':''} onchange="plMulti(this.checked)"> السماح باختيار أكثر من إجابة؟</label>
    <label>من يحق له التصويت</label><select id="plc" onchange="plChoir(this.value)">${X.secOpts(true,st.section)}</select>
    <div class="row"><button class="btn g" onclick="plSave(true)">نشر الآن</button><button class="btn o" onclick="plSave(false)">حفظ كمسودة</button></div>`;
    window._plDraw=draw;om(draw())};
  const keep=()=>{const q=$('#plq');const v=q?q.value:'';document.querySelectorAll('.plop').forEach(e=>{st.opts[+e.dataset.i]=e.value});return v};
  const redraw=q=>{om(window._plDraw());$('#plq').value=q};
  window.plOptAdd=()=>{const q=keep();if(st.opts.length>=10){toast('الحد الأقصى 10 خيارات',0);return}st.opts.push('');redraw(q)};
  window.plOptDel=i=>{const q=keep();st.opts.splice(i,1);redraw(q)};
  window.plMulti=v=>{st.multi=!!v};window.plChoir=v=>{st.section=v};
  window.plSave=async pub=>{
    if(st.busy)return;const q=$('#plq').value.trim();keep();
    const opts=st.opts.map(o=>o.trim()).filter(Boolean);
    if(!q||opts.length<2){toast('يرجى كتابة السؤال وخيارات كافية (اتنين على الأقل)',0);return}
    if(new Set(opts.map(o=>o.toLowerCase())).size!==opts.length){toast('فيه خيارات مكررة',0);return}
    const sec=X.newSec(st.section);if(!sec){toast('اختار القسم',0);return}
    st.busy=true;
    try{
      const b=F.writeBatch(db),ref=F.doc(F.collection(db,'polls'));
      b.set(ref,{question:q,options:opts,allowMultiple:st.multi,section:sec,isActive:!!pub,deleted:false,total:0,createdAt:Date.now(),createdBy:X.uid(),createdByName:X.me().name||''});
      if(pub)b.set(F.doc(F.collection(db,'notifs')),{to:'all',section:sec,kind:'msg',title:'تصويت جديد: رأيك يهمنا',body:q,at:Date.now()});
      await b.commit();closeM();toast(pub?'تم نشر التصويت بنجاح':'اتحفظت كمسودة');
    }catch(e){toast(errMsg(e),0)}finally{st.busy=false}
  };
  window.plPublish=async id=>{const p=S().polls.find(x=>x.id===id);if(!p)return;try{const b=F.writeBatch(db);b.update(F.doc(db,'polls',id),{isActive:true,endedAt:0});b.set(F.doc(F.collection(db,'notifs')),{to:'all',section:p.section,kind:'msg',title:'تصويت جديد: رأيك يهمنا',body:p.question,at:Date.now()});await b.commit();toast('تم نشر التصويت بنجاح')}catch(e){toast(errMsg(e),0)}};
  window.plEnd=async id=>{const p=S().polls.find(x=>x.id===id);if(!p||!confirm('إنهاء التصويت وإخفاؤه عن المخدومين؟'))return;const r=tally(p);try{await F.updateDoc(F.doc(db,'polls',id),{isActive:false,endedAt:Date.now(),final:{counts:r.c,total:r.t}});toast('تم إنهاء التصويت')}catch(e){toast(errMsg(e),0)}};
  window.plReopen=async id=>{try{await F.updateDoc(F.doc(db,'polls',id),{isActive:true,endedAt:0});toast('اتفتح التصويت تاني')}catch(e){toast(errMsg(e),0)}};
  window.plDel=async id=>{if(!confirm('إخفاء التصويت من القائمة؟ (الأصوات تفضل محفوظة)'))return;try{await F.updateDoc(F.doc(db,'polls',id),{deleted:true});toast('تم')}catch(e){toast(errMsg(e),0)}};
  window.plWho=id=>{
    const p=S().polls.find(x=>x.id===id);if(!p)return;const V=S().votes.filter(v=>v.pollId===id).sort((a,b)=>(a.at||0)-(b.at||0));
    const done=new Set(V.map(v=>v.memberId)),miss=S().members.filter(m=>(p.section==='both'||m.section===p.section)&&!done.has(m.id));
    om(`<h3 style="margin-top:0">${esc(p.question)}</h3><div class="s">صوّت ${V.length} · لم يصوّت ${miss.length}</div>
     <div class="card">${V.map(v=>`<div class="li"><div class="t"><b>${esc(v.name||'عضو غير معروف')}</b><span class="s">${(v.choices||[]).map(i=>esc((p.options||[])[i]||'؟')).join('، ')} · ${X.ago(v.at||0)}</span></div></div>`).join('')||'<div class="s">لا أصوات بعد</div>'}</div>
     <div class="card"><h3>لم يصوّتوا</h3>${miss.map(m=>`<div class="li"><div class="t"><b>${esc(m.name)}</b><span class="s">${X.chName(m.section)}</span></div></div>`).join('')||'<div class="s">الكل صوّت</div>'}</div>`);
  };

  // ---------- المخدوم ----------
  function mView(){
    const m=X.mem();if(!m)return pg('<div class="card s">حسابك مش مربوط بسجل مخدوم.</div>');
    const L=polls().filter(p=>eligible(p,m)),act=L.filter(p=>p.isActive),old=L.filter(p=>!p.isActive&&p.endedAt&&res(p));
    const card=p=>{const v=myVote(p),pts=votePts();
      if(v)return `<div class="card"><b>${esc(p.question)}</b><div class="pill ok" style="margin:8px 0">✓ تم تسجيل صوتك${v.pts?` (+${v.pts} نقطة)`:''}</div><div class="s">إجمالي المشاركات: ${p.total||0} · اخترت: ${(v.choices||[]).map(i=>esc((p.options||[])[i]||'')).join('، ')}</div></div>`;
      return `<div class="card"><h3>رأيك يهمنا</h3><b>${esc(p.question)}</b><div class="s" style="margin:4px 0 8px">${p.allowMultiple?'تقدر تختار أكتر من اختيار':'اختار إجابة واحدة'}${pts?` · +${pts} نقطة بعد التصويت`:''}</div>
      ${(p.options||[]).map((o,i)=>`<label class="opt"><input type="${p.allowMultiple?'checkbox':'radio'}" name="po_${p.id}" value="${i}"><span>${esc(o)}</span></label>`).join('')}
      <button class="btn g" style="margin-top:8px" onclick="plVote('${p.id}')">تأكيد اختياراتي</button></div>`};
    return pg(`${act.map(card).join('')||'<div class="card s">لا يوجد تصويت نشط حاليًا</div>'}${old.length?'<h3 style="color:#fff;margin:14px 4px 8px">نتائج سابقة</h3>'+old.map(p=>`<div class="card"><b>${esc(p.question)}</b><div class="s">${res(p).t} مشارك</div>${bars(p,res(p))}</div>`).join(''):''}`);
  }
  window.plVote=async id=>{
    if(st.busy)return;const p=S().polls.find(x=>x.id===id),m=X.mem();if(!p||!m)return;
    if(!p.isActive){toast('التصويت انتهى',0);return}if(!eligible(p,m)){toast('التصويت ده مش لقسمك',0);return}if(myVote(p)){toast('صوّتت قبل كده',0);return}
    const ch=[...document.querySelectorAll(`input[name="po_${id}"]:checked`)].map(e=>+e.value);
    if(!ch.length){toast('اختار إجابة',0);return}if(!p.allowMultiple&&ch.length>1){toast('اختيار واحد بس',0);return}
    st.busy=true;const pts=votePts();
    try{
      const b=F.writeBatch(db),vid=id+'_'+m.id;
      b.set(F.doc(db,'pollVotes',vid),{pollId:id,memberId:m.id,name:m.name||'',section:m.section,choices:ch,pts,at:Date.now()});
      b.update(F.doc(db,'polls',id),{total:F.increment(1)});
      if(pts>0)b.update(F.doc(db,'members',m.id),{points:F.increment(pts),lastVotePoll:id});
      await b.commit();toast('شكراً لمشاركتك رأيك!'+(pts?` (+${pts} نقطة)`:''));X.render(2);
    }catch(e){toast(e&&e.code==='permission-denied'?'مش مسموح (يمكن صوّتت قبل كده أو التصويت اتقفل)':errMsg(e),0)}finally{st.busy=false}
  };

  PG.polls={t:'التصويت',v:()=>X.isS()?sView():mView()};
  X.ext.activePolls=()=>{const m=X.isS()?null:X.mem();return polls().filter(p=>p.isActive&&(X.isS()||(eligible(p,m)&&!myVote(p))))};
  // صفوف دفتر النقاط الخاصة بالتصويت
  X.ext.voteLedger=mid=>S().votes.filter(v=>v.memberId===mid&&v.pts>0).map(v=>{const p=S().polls.find(x=>x.id===v.pollId);return{at:v.at,t:'تصويت: '+((p&&p.question)||'تصويت'),p:v.pts,k:'v'}});
}
