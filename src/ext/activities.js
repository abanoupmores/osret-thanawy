// نظام النقاط بالأنشطة (5.2.0). الخادم يسجّل لكل مخدوم أنشطة يوم معيّن، والنقاط تُحسب من إعدادات المدير:
//   البنين: حضور القداس، لبس التونية، التناول، حضور مدارس الأحد
//   البنات: حضور القداس، التناول، حضور مدارس الأحد
//   + نقاط إضافية يدوية بسبب مكتوب (صفحة «النقاط»)
// السجل: adjustments/ac_{YYYY-MM-DD}_{memberId} = { type:'activity', date, items:{mass,tunic,communion,school}, pts, ... }
// يمكن تعديل اليوم لاحقًا (يُحسب الفرق فقط). القواعد تتحقق أن pts = مجموع القيم من الإعدادات.
export function installActivities(X){
  const {db,$,esc,ic,pg,toast,PG}=X,F=X.fire,S=()=>X.S();
  const ACTS={boys:[['mass','حضور القداس','⛪'],['tunic','لبس التونية','👕'],['communion','التناول','🍞'],['school','حضور مدارس الأحد','📖']],
              girls:[['mass','حضور القداس','⛪'],['communion','التناول','🍞'],['school','حضور مدارس الأحد','📖']]};
  const DEF={mass:5,tunic:3,communion:5,school:5};
  const val=k=>{const v=S().cfg[k+'Pts'];return Number.isInteger(v)?v:DEF[k]};
  const today=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
  const st={date:today(),sec:'boys',draft:{}};
  const sec=()=>X.isA()?(['boys','girls'].includes(X.wsec())?X.wsec():st.sec):X.me().section;
  const aid=(d,m)=>'ac_'+d+'_'+m;
  const saved=(m)=>{const a=S().adj.find(x=>x.id===aid(st.date,m.id));return a&&a.items?a.items:{}};
  const eff=m=>st.draft[m.id]||saved(m);
  const total=(s,it)=>ACTS[s].reduce((n,[k])=>n+(it[k]===true?val(k):0),0);
  const names=(s,it)=>ACTS[s].filter(([k])=>it[k]===true).map(([,n])=>n);
  const err=e=>e&&e.code==='permission-denied'?'مفيش صلاحية. تأكد من نشر قواعد Firestore الأخيرة':'تعذر الحفظ، حاول تاني';

  PG.acts={t:()=>'تسجيل الأنشطة',v:()=>{
    if(!X.isS())return pg('<div class="card s">للخدام فقط</div>');
    const s=sec(),M=S().members.filter(m=>m.section===s).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar'));
    const legend=ACTS[s].map(([k,n,e])=>`<span class="pill gray" style="margin:2px">${e} ${n}: ${val(k)}</span>`).join('');
    return pg(`<div class="card">
      ${X.isA()&&X.wsec()==='all'?`<div class="chips">${['boys','girls'].map(k=>`<button class="${s===k?'on':''}" onclick="acSec('${k}')">${X.chName(k)}</button>`).join('')}</div>`:`<div class="s" style="margin-bottom:6px">${X.chName(s)}</div>`}
      <label>تاريخ اليوم</label><input id="acd" type="date" value="${st.date}" max="${today()}" onchange="acDate(this.value)">
      <div style="margin-top:8px">${legend}</div></div>
    <div class="card"><h3>المخدومون (${M.length})</h3>
    ${M.map(m=>{const it=eff(m),dirty=!!st.draft[m.id],has=S().adj.some(x=>x.id===aid(st.date,m.id));
      return `<div class="li" style="display:block"><div class="row sp"><b>${esc(m.name)}</b><span class="s">${has&&!dirty?'محفوظ: ':'المجموع: '}<b>${total(s,it)}</b> نقطة</span></div>
      <div class="row w" style="gap:6px;margin-top:6px">${ACTS[s].map(([k,n,e])=>`<label class="achk ${it[k]===true?'on':''}"><input type="checkbox" ${it[k]===true?'checked':''} onchange="acTog('${m.id}','${k}',this.checked)">${e} ${n}</label>`).join('')}
      ${dirty?`<button class="btn sm g" style="width:auto" onclick="acSave('${m.id}')">حفظ</button>`:''}</div></div>`}).join('')||'<div class="s">مفيش مخدومين</div>'}
    <button class="btn" style="margin-top:10px" onclick="acSaveAll()">حفظ كل التعديلات</button></div>
    <div class="s" style="padding:0 6px">لنقاط إضافية بسبب مكتوب: صفحة «النقاط».</div>`);
  }};
  window.acSec=k=>{st.sec=k;st.draft={};X.render()};
  window.acDate=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){return}if(v>today()){toast('مينفعش تاريخ في المستقبل',0);return}st.date=v;st.draft={};X.render()};
  window.acTog=(mid,k,on)=>{const m=S().members.find(x=>x.id===mid);if(!m)return;const base=st.draft[mid]||{...saved(m)};st.draft[mid]={...base,[k]:!!on};X.render()};

  async function saveRow(m){
    const s=m.section,date=st.date,src=st.draft[m.id];if(!src)return 'skip';
    const items={};ACTS[s].forEach(([k])=>{items[k]=src[k]===true});
    const pts=total(s,items),nm=names(s,items);
    const aref=F.doc(db,'adjustments',aid(date,m.id)),mref=F.doc(db,'members',m.id);
    await F.runTransaction(db,async tx=>{
      const [a,mm]=await Promise.all([tx.get(aref),tx.get(mref)]);
      const old=a.exists()?(a.data().pts||0):0,d=pts-old;
      if(!a.exists()&&pts===0)return;
      tx.set(aref,{memberId:m.id,section:s,type:'activity',date,items,pts,reason:'أنشطة '+date+': '+(nm.join('، ')||'لا شيء'),by:X.me().name||'',at:Date.now()});
      if(d!==0)tx.update(mref,{points:(mm.data().points||0)+d});
      if(d>0)tx.set(F.doc(F.collection(db,'notifs')),{to:m.id,section:s,kind:'pts',title:'⭐ نقاط جديدة',body:'+'+d+' نقطة — '+nm.join('، '),at:Date.now()});
    });
    delete st.draft[m.id];return 'ok';
  }
  window.acSave=async mid=>{const m=S().members.find(x=>x.id===mid);if(!m)return;try{await saveRow(m);toast('تم حفظ '+m.name);X.render()}catch(e){toast(err(e),0)}};
  window.acSaveAll=async()=>{const ids=Object.keys(st.draft);if(!ids.length){toast('مفيش تعديلات للحفظ');return}let ok=0,bad=0;
    for(const id of ids){const m=S().members.find(x=>x.id===id);if(!m)continue;try{await saveRow(m);ok++}catch(e){bad++}}
    toast(ok?'تم حفظ '+ok+(bad?' — وفشل '+bad:''):err({}),bad&&!ok?0:1);X.render()};
}
