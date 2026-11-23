// سجل الحضور والغياب التفصيلي، التحليلات، لوحة الترتيب والأوائل/المنتظمين، تصفير نقاط (كتسوية مسجّلة)، كارنيه QR مكبّر
export function installInsights(X){
  const {db,$,esc,ic,pg,om,toast,PG}=X,F=X.fire,S=()=>X.S();
  const st={hf:'all',bm:'pts',bc:null};

  // ---------- سجل الحضور والغياب ----------
  function histRows(m){
    const E=X.evFor(m).sort((a,b)=>b.when-a.when),ids=new Set(E.map(e=>e.id)),A=new Map(S().att.filter(x=>x.memberId===m.id).map(x=>[x.eventId,x]));
    const rows=E.map(e=>({t:e.title,when:e.when,a:A.get(e.id)||null}));
    // سجلات حضور لأحداث محذوفة/قديمة تبقى ظاهرة (لا نخفي أي سجل حضور)
    S().att.filter(x=>x.memberId===m.id&&!ids.has(x.eventId)).forEach(x=>rows.push({t:x.title||'حدث',when:x.when||x.at,a:x,extra:true}));
    return rows.sort((a,b)=>b.when-a.when);
  }
  PG.history={t:'سجل الحضور والغياب',v:id=>{
    const m=X.isS()?S().members.find(x=>x.id===id):X.mem();
    if(!m)return pg('<div class="card s">مفيش بيانات</div>');
    const R=histRows(m),s=X.stat(m),pres=R.filter(r=>r.a).length,abs=R.filter(r=>!r.a).length,L=R.filter(r=>st.hf==='all'||(st.hf==='p'?r.a:!r.a));
    return pg(`<div class="card row sp"><div style="text-align:right"><b>${esc(m.name)}</b><div class="s">${X.chName(m.section)}</div><div class="s">حضر ${pres} · غاب ${abs}</div></div><div><b style="font-size:26px;color:${s.p===null?'#8a93aa':s.p>=X.C().solo?'var(--ok)':s.p>=X.C().concert?'var(--wa)':'var(--no)'}">${s.p===null?'—':s.p+'%'}</b></div></div>
    <div class="chips">${[['all','الكل'],['p','حضور'],['a','غياب']].map(c=>`<button class="${st.hf===c[0]?'on':''}" onclick="hiF('${c[0]}')">${c[1]}</button>`).join('')}</div>
    <div class="card">${L.map(r=>`<div class="li"><span class="nic" style="background:${r.a?(r.a.status==='l'?'#fdeccd':'#dff3e9'):'#fde3e7'}">${r.a?(r.a.status==='l'?'⏰':'✅'):'❌'}</span><div class="t"><b>${esc(r.t)}</b><span class="s">${X.fmt(r.when)}${r.a?(r.a.status==='l'?' · متأخر':' · حاضر')+(r.a.manual?' · يدوي':''):' · غائب'}</span></div>${r.a?`<b style="color:var(--ok)">+${r.a.pts}</b>`:''}</div>`).join('')||'<div class="s" style="padding:10px">لا توجد سجلات</div>'}</div>`);
  }};
  window.hiF=k=>{st.hf=k;X.render(2)};

  // ---------- التحليلات (للخادم) ----------
  PG.analytics={t:'الإحصائيات والتحليلات',v:()=>{
    if(!X.isS())return pg('<div class="card s">للخادم فقط</div>');
    const c=X.C(),M=S().members,now=Date.now();
    const past=S().events.filter(e=>e.type==='rehearsal'&&e.when+c.close*6e4<now).sort((a,b)=>b.when-a.when).slice(0,10).reverse();
    const bars=past.map(e=>{const el=M.filter(m=>(e.section==='both'||e.section===m.section)&&e.when>=(m.added||0)-864e5).length,got=S().att.filter(a=>a.eventId===e.id).length,p=el?Math.min(100,Math.round(got/el*100)):0;return{e,el,got,p}});
    const P=M.map(m=>X.stat(m).p).filter(p=>p!==null),avg=P.length?Math.round(P.reduce((a,b)=>a+b,0)/P.length):0;
    const el1=P.filter(p=>p>=c.solo).length,el2=P.filter(p=>p>=c.concert&&p<c.solo).length,el3=P.filter(p=>p<c.concert).length;
    const byC=X.CHK.map(k=>{const L=M.filter(m=>m.section===k),pp=L.map(m=>X.stat(m).p).filter(p=>p!==null);return{k,n:L.length,avg:pp.length?Math.round(pp.reduce((a,b)=>a+b,0)/pp.length):null}}).filter(o=>o.n);
    return pg(`<div class="grid2" style="margin-bottom:12px"><div class="card" style="text-align:center;margin:0"><div class="s">إجمالي الأعضاء</div><b style="font-size:30px;color:var(--navy)">${M.length}</b></div><div class="card" style="text-align:center;margin:0"><div class="s">متوسط الحضور</div><b style="font-size:30px;color:var(--navy)">${P.length?avg+'%':'—'}</b></div></div>
    <div class="card"><h3>نشاط الحضور (آخر ${bars.length||10} اجتماعات)</h3>${bars.length?`<div class="cols">${bars.map(o=>`<div class="col" title="${esc(o.e.title)}: ${o.got}/${o.el}"><span class="s">${o.p}%</span><div class="cb"><i style="height:${o.p}%"></i></div><span class="s cd">${new Date(o.e.when).toLocaleDateString('ar-EG',{day:'numeric',month:'numeric'})}</span></div>`).join('')}</div>`:'<div class="s">لا توجد بيانات حضور بعد</div>'}</div>
    <div class="card"><h3>مستوى الالتزام</h3><div class="row sp"><span>ملتزم ممتاز (${c.solo}%+)</span><b style="color:var(--ok)">${el1}</b></div><div class="row sp"><span>ملتزم (${c.concert}%+)</span><b style="color:var(--wa)">${el2}</b></div><div class="row sp"><span>محتاج افتقاد</span><b style="color:var(--no)">${el3}</b></div></div>
    <div class="card"><h3>حسب القسم</h3>${byC.map(o=>`<div class="li"><div class="t"><b>${X.chName(o.k)}</b><span class="s">${o.n} مخدوم</span></div><b>${o.avg===null?'—':o.avg+'%'}</b></div>`).join('')||'<div class="s">لا بيانات</div>'}</div>
    <div class="s" style="color:#fff;margin:0 4px 10px">البيانات من سجلات الحضور المسجلة في التطبيق (حتى 5000 سجل).</div>`);
  }};

  // ---------- لوحة الترتيب: النقاط / الانتظام + الأوائل ----------
  PG.board={t:'لوحة الترتيب',v:()=>{
    const m=X.mem(),k=st.bc||(m&&m.section)||'all',reg=st.bm==='reg';
    let L=S().members.filter(x=>k==='all'||x.section===k).map(x=>({x,s:X.stat(x)}));
    if(reg){L=L.filter(o=>o.s.p!==null).sort((a,b)=>b.s.p-a.s.p||b.s.a-a.s.a||(b.x.points||0)-(a.x.points||0))}
    else L.sort((a,b)=>(b.x.points||0)-(a.x.points||0));
    const val=o=>reg?o.s.p+'%':(o.x.points||0),top=L.slice(0,3),med=['🥇','🥈','🥉'];
    const pod=top.length?`<div class="podium">${[1,0,2].filter(i=>top[i]).map(i=>`<div class="pd p${i}"><span class="av">${top[i].x.photo?`<img src="${top[i].x.photo}" alt="">`:esc((top[i].x.name||'؟')[0])}</span><b>${med[i]}</b><span class="pn">${esc((top[i].x.name||'').split(' ').slice(0,2).join(' '))}</span><span class="s">${val(top[i])}</span></div>`).join('')}</div>`:'';
    return pg(`<div class="tabs"><button class="${!reg?'on':''}" onclick="bdM('pts')">الأعلى نقاطًا</button><button class="${reg?'on':''}" onclick="bdM('reg')">لوحة الشرف للمنتظمين</button></div>
    ${X.isA()&&X.wsec()==='all'?`<div class="chips">${['all',...X.CHK].map(x=>`<button class="${k===x?'on':''}" onclick="bdC('${x}')">${x==='all'?'الكل':X.chName(x)}</button>`).join('')}</div>`:''}
    ${pod}<div class="card">${L.map((o,i)=>`<div class="li" style="${m&&o.x.id===m.id?'background:#f4e8c6;border-radius:12px;padding-inline:8px':''}"><b style="width:28px;color:var(--gold)">${med[i]||i+1}</b>${X.av(o.x)}<span class="t"><b>${esc(o.x.name)}</b>${reg?`<span class="s">${o.s.a} من ${o.s.t} اجتماع</span>`:''}</span><b>${val(o)}</b></div>`).join('')||'<div class="s">لم يتم تسجيل نقاط بعد</div>'}</div>`);
  }};
  window.bdM=k=>{st.bm=k;X.render(2)};window.bdC=k=>{st.bc=k;X.render(2)};

  // ---------- تصفير نقاط مخدوم: يُسجَّل كخصم في الدفتر (لا يُمسح أي سجل) ----------
  window.ptReset=async id=>{
    const m=S().members.find(x=>x.id===id);if(!m)return;const cur=m.points||0;
    if(!cur){toast('رصيد النقاط صفر بالفعل',0);return}
    if(!confirm(`تصفير نقاط ${m.name} (${cur})؟ هيتسجل كخصم في السجل ومش هيتمسح أي حضور.`))return;
    try{
      const b=F.writeBatch(db);
      b.set(F.doc(F.collection(db,'adjustments')),{memberId:id,pts:-cur,reason:'تصفير النقاط',by:X.me().name,at:Date.now(),kind:'reset'});
      b.update(F.doc(db,'members',id),{points:F.increment(-cur)});
      b.set(F.doc(F.collection(db,'notifs')),{to:id,kind:'pts',title:'تم خصم نقاط',body:'تصفير رصيد النقاط ('+cur+')',at:Date.now()});
      await b.commit();toast('تم تصفير النقاط');X.render(1);
    }catch(e){toast(e&&e.code==='permission-denied'?'مفيش صلاحية':'فشل التنفيذ',0)}
  };

  // ---------- كارنيه QR مكبّر (خلفية بيضاء كاملة لسهولة المسح) ----------
  const qb=document.createElement('div');qb.id='qbig';qb.onclick=()=>{qb.style.display='none'};document.body.appendChild(qb);
  window.qrBig=async txt=>{const mm=S().members.find(x=>x.id===txt.slice(3)),name=mm?mm.name:'';
    try{const u=await X.qrData(txt);qb.innerHTML=`<div class="qbx"><img class="qrbig" src="${u}" alt="QR"><b>${esc(name||'')}</b><span>اضغط في أي مكان للإغلاق</span></div>`;qb.style.display='flex'}
    catch(e){toast('تعذر عرض الكود',0)}
  };
}
