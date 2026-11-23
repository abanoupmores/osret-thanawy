// مسابقات مستقلة عن التصويت. مفاتيح الإجابات تُرسل إلى competitionRequests
// ولا تظهر في competitions العامة؛ ينقلها GitHub Worker إلى secrets/.
export function installCompetitions(X){
  const {db,$,esc,ic,pg,om,toast,PG}=X,F=X.fire,S=()=>X.S();
  const st={questions:[],busy:false,section:'',editing:false,editingCompId:null,keepMeta:false};
  const err=e=>e?.code==='permission-denied'?'لا توجد صلاحية. تأكد من نشر قواعد Firestore وتشغيل Worker.':e?.code==='unavailable'?'الاتصال بالإنترنت غير متاح.':'تعذر تنفيذ العملية. حاول مرة أخرى.';
  const comps=()=>S().competitions.filter(c=>!c.deleted).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const myAttempt=c=>{const m=X.mem();return m?S().compAttempts.find(a=>a.competitionId===c.id&&a.memberId===m.id):null};
  const status=c=>{const n=Date.now();if(!c.isPublished)return 'مسودة';if(c.isActive===false)return 'متوقفة';if(n<(c.startsAt||0))return 'قادمة';if(n<=(c.endsAt||0))return 'نشطة';return 'منتهية'};
  const eligible=(c,m)=>m&&(c.section==='both'||c.section===m.section);
  const dateVal=n=>n?new Date(n).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'}):'—';
  const localInput=n=>{const d=new Date(n),p=v=>String(v).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())};
  const close=()=>{$('#md').style.display='none';X.render(2)};
  function qHtml(q,i){return `<div class="card comp-qedit"><div class="row sp"><b>السؤال ${i+1}</b><button class="ib" style="color:var(--no)" onclick="cqDel(${i})">${ic('x')}</button></div>
    <select class="cq-type" data-i="${i}" onchange="cqType(${i},this.value)"><option value="mcq" ${q.type==='mcq'?'selected':''}>اختيار من متعدد</option><option value="tf" ${q.type==='tf'?'selected':''}>صح أو خطأ</option><option value="text" ${q.type==='text'?'selected':''}>إجابة نصية</option></select>
    <input class="cq-text" data-i="${i}" maxlength="500" placeholder="نص السؤال" value="${esc(q.text||'')}">
    ${q.type==='mcq'?`<div class="cq-options">${q.options.map((o,j)=>`<div class="row"><input class="cq-opt" data-i="${i}" data-j="${j}" maxlength="180" placeholder="الاختيار ${j+1}" value="${esc(o)}"><button class="ib" onclick="cqOptDel(${i},${j})">${ic('x')}</button></div>`).join('')}</div><button class="btn sm o" onclick="cqOptAdd(${i})">+ إضافة اختيار</button><label>الإجابة الصحيحة</label><select class="cq-answer" data-i="${i}">${q.options.map((o,j)=>`<option value="${j}" ${String(q.answer)===String(j)?'selected':''}>${esc(o||'اختيار '+(j+1))}</option>`).join('')}</select>`:q.type==='tf'?`<label>الإجابة الصحيحة</label><select class="cq-answer" data-i="${i}"><option value="true" ${String(q.answer)==='true'?'selected':''}>صح</option><option value="false" ${String(q.answer)==='false'?'selected':''}>خطأ</option></select>`:`<label>الإجابة النموذجية</label><input class="cq-answer" data-i="${i}" value="${esc(q.answer||'')}" placeholder="الإجابة النموذجية">`}
    <label>نقاط السؤال</label><input class="cq-points" data-i="${i}" type="number" min="0" max="100" value="${Number.isFinite(Number(q.points))?Number(q.points):1}"></div>`}
  function collectQuestions(){
    st.questions=st.questions.map((q,i)=>{const text=$(`.cq-text[data-i="${i}"]`)?.value?.trim()||'';const points=Math.max(0,Math.min(100,Number($(`.cq-points[data-i="${i}"]`)?.value)||0));
      if(q.type==='mcq'){const options=[...document.querySelectorAll(`.cq-opt[data-i="${i}"]`)].map(e=>e.value.trim());const answer=Number($(`.cq-answer[data-i="${i}"]`)?.value||0);return{...q,text,points,options,answer}}
      if(q.type==='tf')return{...q,text,points,answer:$(`.cq-answer[data-i="${i}"]`)?.value==='true'};
      return{...q,text,points,answer:$(`.cq-answer[data-i="${i}"]`)?.value?.trim()||''};
    });return st.questions;
  }
  function drawForm(){
    const meta=st.keepMeta?{title:$('#c-title')?.value||'',desc:$('#c-desc')?.value||'',section:$('#c-sec')?.value||st.section,start:$('#c-start')?.value||'',end:$('#c-end')?.value||'',duration:$('#c-duration')?.value||'0'}:null;
    const qs=st.questions.map(qHtml).join('');
    om(`<h3 style="margin-top:0">${st.editing?'تعديل مسابقة':'إنشاء مسابقة جديدة'}</h3>
      <label>اسم المسابقة</label><input id="c-title" maxlength="120" placeholder="مثال: مسابقة سفر يونان">
      <label>وصف مختصر</label><textarea id="c-desc" rows="2" maxlength="500" placeholder="تفاصيل وتعليمات المسابقة"></textarea>
      <label>الفئة المستهدفة</label><select id="c-sec">${X.secOpts(true,st.section)}</select>
      <div class="row"><div class="t"><label>بداية المسابقة</label><input id="c-start" type="datetime-local"></div><div class="t"><label>نهاية المسابقة</label><input id="c-end" type="datetime-local"></div></div>
      <label>مدة الحل بالدقائق (اختياري)</label><input id="c-duration" type="number" min="0" max="240" value="0" placeholder="0 = بدون عداد">
      <div class="row sp" style="margin:14px 0 8px"><h3 style="margin:0">الأسئلة (${st.questions.length})</h3><button class="btn sm o" onclick="cqAdd()">+ سؤال</button></div>
      <div id="cq-list">${qs||'<div class="s">أضف أول سؤال للمسابقة.</div>'}</div>
      <div class="row w" style="margin-top:12px"><button class="btn g" onclick="cqSave(true)">حفظ ونشر / جدولة</button><button class="btn o" onclick="cqSave(false)">حفظ كمسودة</button></div>
      <p class="s">لن تظهر الإجابات الصحيحة للمخدومين. النشر والتصحيح يتمان عبر GitHub Worker.</p>`);
    if(meta){$('#c-title').value=meta.title;$('#c-desc').value=meta.desc;$('#c-sec').value=meta.section;$('#c-start').value=meta.start;$('#c-end').value=meta.end;$('#c-duration').value=meta.duration;}
    st.keepMeta=true;
  }
  window.cqAdd=()=>{collectQuestions();if(st.questions.length>=80){toast('الحد الأقصى 80 سؤالًا',0);return}st.questions.push({type:'mcq',text:'',options:['',''],answer:0,points:1});drawForm()};
  window.cqDel=i=>{collectQuestions();st.questions.splice(i,1);drawForm()};
  window.cqType=(i,type)=>{collectQuestions();st.questions[i]={type,text:st.questions[i].text,points:st.questions[i].points,options:type==='mcq'?['','']:[],answer:type==='tf'?true:type==='text'?'':0};drawForm()};
  window.cqOptAdd=i=>{collectQuestions();if(st.questions[i].options.length>=8){toast('الحد الأقصى 8 اختيارات',0);return}st.questions[i].options.push('');drawForm()};
  window.cqOptDel=(i,j)=>{collectQuestions();if(st.questions[i].options.length<=2){toast('لازم يفضل اختيارين على الأقل',0);return}st.questions[i].options.splice(j,1);st.questions[i].answer=0;drawForm()};
  window.cqForm=()=>{st.questions=[{type:'mcq',text:'',options:['',''],answer:0,points:1}];st.section='';st.editing=false;st.editingCompId=null;st.keepMeta=false;drawForm()};
  window.cqEdit=id=>{const c=comps().find(x=>x.id===id),r=(S().compRequests||[]).find(x=>x.id===c?.sourceRequestId&&x.status==='done'&&x.answers);if(!c||c.isPublished||!r){toast('المسودة غير قابلة للتعديل حاليًا',0);return}st.editing=true;st.editingCompId=id;st.section=c.section||'';st.questions=(c.questions||[]).map(q=>{const a=r.answers?.[q.id]||{};return{type:q.type,text:q.text,options:q.options||[],answer:a.answer,points:q.points}});st.keepMeta=false;drawForm();$('#c-title').value=c.title||'';$('#c-desc').value=c.description||'';$('#c-sec').value=c.section||st.section;$('#c-start').value=localInput(c.startsAt);$('#c-end').value=localInput(c.endsAt);$('#c-duration').value=c.durationMin||0;};
  window.cqPublishDraft=async id=>{const c=comps().find(x=>x.id===id);if(!c||c.isPublished)return;try{const rid=F.doc(F.collection(db,'competitionRequests')).id;await F.setDoc(F.doc(db,'competitionRequests',rid),{action:'publish',competitionId:id,section:c.section,requestedBy:X.uid(),status:'pending',createdAt:Date.now()});toast('تم إرسال طلب نشر المسابقة.')}catch(e){toast(err(e),0)}};
  window.cqToggle=async(id,active)=>{const c=comps().find(x=>x.id===id);if(!c||!c.isPublished)return;const rid=F.doc(F.collection(db,'competitionRequests')).id;try{await F.setDoc(F.doc(db,'competitionRequests',rid),{action:active?'activate':'deactivate',section:c.section,competitionId:id,requestedBy:X.uid(),status:'pending',createdAt:Date.now()});toast(active?'تم إرسال طلب تفعيل المسابقة':'تم إرسال طلب إيقاف المسابقة')}catch(e){toast(err(e),0)}};
  window.cqSave=async publish=>{
    if(st.busy)return;const qs=collectQuestions(),title=$('#c-title')?.value.trim()||'',description=$('#c-desc')?.value.trim()||'',section=X.newSec($('#c-sec')?.value);if(!section){toast('اختار القسم',0);return}
    const startsAt=new Date($('#c-start')?.value||'').getTime(),endsAt=new Date($('#c-end')?.value||'').getTime(),durationMin=Math.max(0,Math.min(240,Number($('#c-duration')?.value)||0));
    if(!title||!qs.length||qs.some(q=>!q.text)){toast('اكتب اسم المسابقة وكل الأسئلة',0);return}
    if(!Number.isFinite(startsAt)||!Number.isFinite(endsAt)||startsAt<=0||endsAt<=startsAt){toast('حدد بداية ونهاية صحيحتين للمسابقة',0);return}
    for(const q of qs){if(q.points<0){toast('النقاط غير صحيحة',0);return}if(q.type==='mcq'&&(q.options.length<2||q.options.some(x=>!x)||new Set(q.options).size!==q.options.length||q.answer<0||q.answer>=q.options.length)){toast('راجع اختيارات وإجابة أحد الأسئلة',0);return}if(q.type==='text'&&!q.answer){toast('اكتب الإجابة النموذجية للسؤال النصي',0);return}}
    st.busy=true;
    try{const compId=st.editingCompId||F.doc(F.collection(db,'competitions')).id;const questions=qs.map((q,i)=>({id:'q'+(i+1),type:q.type,text:q.text,options:q.type==='mcq'?q.options:[],points:q.points}));const answers={};qs.forEach((q,i)=>answers['q'+(i+1)]={type:q.type,answer:q.answer,points:q.points});
      const requestId=st.editingCompId?F.doc(F.collection(db,'competitionRequests')).id:compId;await F.setDoc(F.doc(db,'competitionRequests',requestId),{action:st.editingCompId?'update':'create',competitionId:compId,title,description,section,startsAt,endsAt,durationMin,isPublished:!!publish,questions,answers,requestedBy:X.uid(),requestedByName:X.me().name||'',status:'pending',createdAt:Date.now()});
      close();toast('تم إرسال المسابقة للمعالجة. ستظهر بعد تشغيل Worker.');
    }catch(e){toast(err(e),0)}finally{st.busy=false}
  };
  function adminView(){
    const L=comps(),req=S().compRequests||[],attempts=S().compAttempts||[];
    return pg(`<button class="btn g" onclick="cqForm()" style="margin-bottom:12px">${ic('plus')} إنشاء مسابقة جديدة</button>
      ${req.filter(r=>r.status==='pending').map(r=>`<div class="card"><b>${esc(r.title||'مسابقة جديدة')}</b><div class="pill wa">في انتظار Worker</div></div>`).join('')}
      ${req.filter(r=>r.status==='failed').map(r=>`<div class="card"><b>${esc(r.title||'طلب مسابقة')}</b><div class="pill no">تعذر التنفيذ</div><div class="s">${esc(r.message||'راجع GitHub Actions')}</div></div>`).join('')}
      ${L.map(c=>{const a=attempts.filter(x=>x.competitionId===c.id);return `<div class="card comp-card"><div class="row sp"><b>${esc(c.title)}</b><span class="pill ${status(c)==='نشطة'?'ok':status(c)==='قادمة'?'wa':'gray'}">${status(c)}</span></div><p class="s">${c.section==='both'?'كل المخدومين':X.chName(c.section)} · ${c.questions?.length||0} سؤال · ${a.length} محاولة</p><div class="s">${dateVal(c.startsAt)} — ${dateVal(c.endsAt)}</div>${!c.isPublished?`<div class="row w"><button class="btn sm o" onclick="cqEdit('${c.id}')">تعديل المسودة</button><button class="btn sm g" onclick="cqPublishDraft('${c.id}')">نشر المسابقة</button></div>`:`<div class="row w"><button class="btn sm o" onclick="cqToggle('${c.id}',${c.isActive===false?'true':'false'})">${c.isActive===false?'تفعيل':'إيقاف مؤقت'}</button><button class="btn sm o" onclick="cqResults('${c.id}')">عرض النتائج والترتيب</button></div>`}</div>`}).join('')||'<div class="card s">لا توجد مسابقات بعد.</div>'}`);
  }
  window.cqResults=id=>{const c=comps().find(x=>x.id===id);if(!c)return;const A=(S().compAttempts||[]).filter(a=>a.competitionId===id).sort((a,b)=>(b.pointsAwarded||0)-(a.pointsAwarded||0));om(`<h3 style="margin-top:0">${esc(c.title)} — النتائج</h3><div class="s">${A.length} محاولة</div>${A.map((a,i)=>`<div class="li"><b>${i+1}</b><div class="t"><b>${esc(a.memberName||'مخدوم')}</b><span class="s">${a.status==='graded'?'تم التصحيح':a.status==='failed'?'تعذر التصحيح':'قيد التصحيح'} · ${a.score??'—'}/${a.maxScore??'—'}</span></div><b>+${a.pointsAwarded||0}</b></div>`).join('')||'<div class="s">لا توجد محاولات بعد.</div>'}`)};
  function memberView(){
    const m=X.mem();if(!m)return pg('<div class="card s">حسابك غير مربوط بسجل مخدوم.</div>');
    const L=comps().filter(c=>eligible(c,m));
    return pg(`<div class="comp-hero card"><div class="s">✦ مسابقات خدمة أسرة ثانوي</div><h2>شارك واكتشف معلومات جديدة</h2><p class="s">جاوب على الأسئلة واجمع نقاط المسابقات.</p></div>
      ${L.map(c=>{const a=myAttempt(c),s=status(c),available=s==='نشطة',rank=(S().compLeaderboard||[]).filter(x=>x.competitionId===c.id).sort((x,y)=>(y.pointsAwarded||0)-(x.pointsAwarded||0)).slice(0,5);return `<div class="card comp-card"><div class="row sp"><b>${esc(c.title)}</b><span class="pill ${s==='نشطة'?'ok':s==='قادمة'?'wa':'gray'}">${s}</span></div>${c.description?`<p>${esc(c.description)}</p>`:''}<div class="s">${c.questions?.length||0} سؤال · ${dateVal(c.startsAt)} إلى ${dateVal(c.endsAt)}</div>
      ${a?`<div class="pill ${a.status==='graded'?'ok':'wa'}" style="margin-top:10px">${a.status==='graded'?`تم التصحيح · ${a.score}/${a.maxScore} · +${a.pointsAwarded||0} نقطة`:'تم تسليم إجابتك — في انتظار التصحيح'}</div>${a.status==='graded'&&a.showAnswers?`<button class="btn sm o" onclick="cqReview('${c.id}')">مراجعة الإجابات</button>`:''}`:available?`<button class="btn g" onclick="cqSolve('${c.id}')">ابدأ المسابقة</button>`:s==='قادمة'?'<div class="s">المسابقة لم تبدأ بعد.</div>':s==='متوقفة'?'<div class="s">المسابقة متوقفة مؤقتًا.</div>':'<div class="s">انتهى وقت المشاركة.</div>'}
      ${rank.length?`<div class="comp-rank"><b>🏆 أفضل المشاركين</b>${rank.map((r,i)=>`<div class="row sp"><span>${i+1}. ${esc(r.memberName||'مخدوم')}</span><b>${r.pointsAwarded||0} نقطة</b></div>`).join('')}</div>`:''}</div>`}).join('')||'<div class="card s">لا توجد مسابقات متاحة لك حاليًا.</div>'}`);
  }
  window.cqSolve=id=>{const c=comps().find(x=>x.id===id),m=X.mem();if(!c||!m||status(c)!=='نشطة'||myAttempt(c)){toast('المسابقة غير متاحة أو سبق تسليمها',0);return}
    om(`<h3 style="margin-top:0">${esc(c.title)}</h3><p class="s">${esc(c.description||'اقرأ كل سؤال واختر إجابتك بعناية.')}</p><div id="cq-timer" class="pill wa" style="margin-bottom:10px">${c.durationMin?`المدة: ${c.durationMin} دقيقة`:'بدون توقيت محدد'}</div>${(c.questions||[]).map((q,i)=>`<div class="card"><b>${i+1}. ${esc(q.text)}</b>${q.type==='mcq'?(q.options||[]).map((o,j)=>`<label class="opt"><input type="radio" name="ans_${esc(q.id)}" value="${j}"><span>${esc(o)}</span></label>`).join(''):q.type==='tf'?`<label class="opt"><input type="radio" name="ans_${esc(q.id)}" value="true"><span>صح</span></label><label class="opt"><input type="radio" name="ans_${esc(q.id)}" value="false"><span>خطأ</span></label>`:`<input class="cq-text-answer" data-q="${esc(q.id)}" maxlength="500" placeholder="اكتب إجابتك">`}</div>`).join('')}<button class="btn g" onclick="cqSubmit('${c.id}')">تسليم الإجابات النهائية</button><p class="s">بعد التسليم لن تستطيع تعديل إجاباتك أو إعادة المحاولة.</p>`);
    if(c.durationMin){const until=Date.now()+c.durationMin*60000;window.__cqTimer=setInterval(()=>{const el=$('#cq-timer');if(!el){clearInterval(window.__cqTimer);return}const left=Math.max(0,until-Date.now());el.textContent='الوقت المتبقي: '+Math.ceil(left/60000)+' دقيقة';if(!left){clearInterval(window.__cqTimer);window.cqSubmit(id,true)}},10000)}
  };
  window.cqSubmit=async(id,auto=false)=>{if(st.busy)return;const c=comps().find(x=>x.id===id),m=X.mem();if(!c||!m||status(c)!=='نشطة'||myAttempt(c)){toast('المسابقة انتهت أو تم تسليمها بالفعل',0);return}if(!auto&&!confirm('هل أنت متأكد من تسليم إجاباتك نهائيًا؟'))return;
    const answers={};(c.questions||[]).forEach(q=>{if(q.type==='text')answers[q.id]=$(`.cq-text-answer[data-q="${q.id}"]`)?.value?.trim()||'';else{const v=document.querySelector(`input[name="ans_${q.id}"]:checked`);if(v)answers[q.id]=q.type==='tf'?v.value==='true':Number(v.value)}});
    st.busy=true;try{const id2=id+'_'+m.id;await F.setDoc(F.doc(db,'competitionAttempts',id2),{competitionId:id,memberId:m.id,memberUid:X.uid(),memberName:m.name||'',section:m.section,answers,status:'pending',createdAt:Date.now(),submittedAt:F.serverTimestamp()});if(window.__cqTimer)clearInterval(window.__cqTimer);close();toast('تم تسليم المسابقة. سيتم تصحيحها تلقائيًا.')}catch(e){toast(err(e),0)}finally{st.busy=false}
  };
  window.cqReview=id=>{const a=myAttempt(comps().find(c=>c.id===id)||{});if(!a)return;om(`<h3 style="margin-top:0">مراجعة الإجابات</h3><div class="card">${Object.entries(a.breakdown||{}).map(([qid,v])=>`<div class="li"><div class="t"><b>${esc(v.question||qid)}</b><span class="s">إجابتك: ${esc(String(v.given??'—'))} · الصحيحة: ${esc(String(v.correct??'—'))}</span></div><b>${v.correctAnswer?'✓':'✕'} ${v.score||0}/${v.max||0}</b></div>`).join('')}</div>`)};
  PG.competitions={t:()=>X.isS()?'إدارة المسابقات':'المسابقات',v:()=>X.isS()?adminView():memberView()};
  X.ext.competitionBadge=()=>X.isS()?0:comps().filter(c=>status(c)==='نشطة'&&!myAttempt(c)).length;
}
