// الترانيم والمجلدات وسلة المحذوفات ومشغل الصوت
// collections: hymnFolders / hymns  (Soft Delete عبر الحقل deleted)
import {getStorage,ref as sref,uploadBytesResumable,getDownloadURL,deleteObject} from 'firebase/storage';

// تطبيع عربي للبحث (إزالة التشكيل وتوحيد الألف والياء والتاء المربوطة)
export const nz=s=>String(s||'').replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase();

// تحويل روابط Google Drive / Dropbox إلى روابط مباشرة قابلة للتشغيل
export function normAudio(u){
  u=String(u||'').trim();if(!u)return '';
  try{
    const x=new URL(u);
    if(/(^|\.)drive\.google\.com$/.test(x.hostname)||/(^|\.)docs\.google\.com$/.test(x.hostname)){
      const m=x.pathname.match(/\/file\/d\/([^/]+)/),id=m?m[1]:x.searchParams.get('id');
      if(id)return 'https://docs.google.com/uc?export=download&id='+id;
    }
    if(/(^|\.)dropbox\.com$/.test(x.hostname)){x.hostname='dl.dropboxusercontent.com';x.searchParams.delete('dl');x.searchParams.set('raw','1');return x.toString()}
  }catch(e){}
  return u;
}
export const okUrl=u=>!u||/^https:\/\/[^\s]+$/i.test(u);
const mmss=t=>{if(!isFinite(t)||t<0)t=0;t=Math.floor(t);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};

export function installHymns(X){
  const {db,$,esc,ic,pg,om,toast,PG}=X,F=X.fire,S=()=>X.S();
  const st={q:'',sel:new Set(),selMode:false,sort:false,tt:'h',busy:false,img:null,imgClr:false,file:null};
  const cmpF=(a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||(a.order??0)-(b.order??0)||(a.name||'').localeCompare(b.name||'','ar');
  const folders=()=>S().folders.filter(f=>!f.deleted).sort(cmpF);
  const trashedF=()=>S().folders.filter(f=>f.deleted);
  const fById=id=>S().folders.find(f=>f.id===id);
  const inF=id=>S().hymns.filter(h=>!h.deleted&&h.folderId===id).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar'));
  const trashedH=()=>S().hymns.filter(h=>h.deleted);
  const who=()=>({createdBy:X.uid(),createdByName:X.me().name||''});
  // قسم مجلد جديد: الخادم = قسمه، المدير = القسم المختار أو «both» في عرض القسمين (مكتبة مشتركة)
  const fSec=()=>X.isA()?(['boys','girls'].includes(X.wsec())?X.wsec():'both'):X.me().section;
  const closeM=()=>{$('#md').style.display='none';X.render(2)};
  const errMsg=e=>{const c=e&&e.code;if(c==='permission-denied')return 'مفيش صلاحية: انشر قواعد Firestore الجديدة (firestore.rules)';if(c==='unavailable'||c==='network-request-failed')return 'مفيش اتصال بالنت';return 'فشل الحفظ، حاول تاني'};

  // ---------- المشغل (عنصر صوت واحد خارج #app علشان التحديثات ماتوقفش التشغيل) ----------
  const AU=new Audio();AU.preload='none';let cur=null;
  const mini=document.createElement('div');mini.id='mini';document.body.appendChild(mini);
  const playing=()=>cur&&!AU.paused&&!AU.ended;
  function drawMini(){
    if(!cur){mini.style.display='none';return}
    mini.style.display='flex';
    mini.innerHTML=`<button class="mb" onclick="hyToggle()">${ic(playing()?'pause':'play')}</button><span class="mt" onclick="go('hymn','${cur.id}')">${esc(cur.name)}</span><button class="mb" onclick="hyStop()">${ic('x')}</button>`;
  }
  function sync(){
    const r=$('#aup'),t=$('#aut'),b=$('#apb');
    if(r&&cur&&r.dataset.h===cur.id){if(AU.duration)r.value=String(Math.round(AU.currentTime/AU.duration*1000))}
    if(t&&cur&&t.dataset.h===cur.id)t.textContent=mmss(AU.currentTime)+' / '+mmss(AU.duration);
    if(b&&cur&&b.dataset.h===cur.id)b.innerHTML=ic(playing()?'pause':'play');
    drawMini();
  }
  ['timeupdate','loadedmetadata','play','pause','ended'].forEach(ev=>AU.addEventListener(ev,sync));
  AU.addEventListener('error',()=>{if(cur)toast('تعذر تشغيل الملف الصوتي، تأكد من الرابط',0);sync()});
  window.hyPlay=id=>{
    const h=S().hymns.find(x=>x.id===id);if(!h||!h.audioUrl){toast('مفيش ملف صوتي للترنيمة دي',0);return}
    if(cur&&cur.id===id){if(AU.paused)AU.play().catch(()=>toast('تعذر التشغيل',0));else AU.pause();return}
    cur={id,name:h.name};AU.src=normAudio(h.audioUrl);AU.play().catch(()=>toast('تعذر تشغيل الملف الصوتي، تأكد من الرابط',0));drawMini();X.render(2);
  };
  window.hyToggle=()=>{if(!cur)return;if(AU.paused)AU.play().catch(()=>{});else AU.pause()};
  window.hyStop=()=>{AU.pause();AU.removeAttribute('src');AU.load();cur=null;drawMini();X.render(2)};
  window.hySeek=v=>{if(AU.duration)AU.currentTime=AU.duration*(+v)/1000};

  // ---------- قائمة المجلدات ----------
  const frow=(f,i,L)=>{const n=inF(f.id).length,S2=X.isS(),sel=st.sel.has(f.id);
    return `<div class="li" onclick="${st.selMode?`hySelF('${f.id}')`:`go('folder','${f.id}')`}">
      ${st.selMode?`<span class="chk ${sel?'on':''}">${sel?'✓':''}</span>`:`<span class="nic" style="background:#f4e8c6;color:#7d5a10">${ic('folder')}</span>`}
      <div class="t"><b>${esc(f.name)}</b><span class="s">${n?n+' ترنيمة':'فارغ'}${f.pinned?' · 📌 مثبت':''}</span></div>
      ${S2&&st.sort&&!st.selMode?`<span class="row" onclick="event.stopPropagation()"><button class="btn sm o" onclick="fdPin('${f.id}')">${ic('pin')}</button><button class="btn sm o" onclick="fdMove('${f.id}',-1)" ${i===0||(L[i-1].pinned||0)!==(f.pinned||0)?'disabled':''}>${ic('up')}</button><button class="btn sm o" onclick="fdMove('${f.id}',1)" ${i===L.length-1||(L[i+1].pinned||0)!==(f.pinned||0)?'disabled':''}>${ic('down')}</button></span>`:`<span class="ch">${ic('chev')}</span>`}
    </div>`};
  const hrow=h=>{const sel=st.sel.has(h.id),S2=X.isS();
    return `<div class="li" onclick="${st.selMode?`hySelH('${h.id}')`:`go('hymn','${h.id}')`}">
      ${st.selMode?`<span class="chk ${sel?'on':''}">${sel?'✓':''}</span>`:`<span class="nic" style="background:#e4ecfb;color:var(--navy)">${ic('music')}</span>`}
      <div class="t"><b>${esc(h.name)}</b><span class="s">${h.audioUrl?'🔊 صوت':''}${h.audioUrl&&h.lyrics?' · ':''}${h.lyrics?'📝 كلمات':''}${!h.audioUrl&&!h.lyrics?'بدون محتوى':''}${S2&&st.q?' · '+esc((fById(h.folderId)||{}).name||''):''}</span></div>
      <span class="ch">${ic('chev')}</span></div>`};
  function hList(){
    const q=nz(st.q.trim());
    if(!q){const L=folders();return L.map((f,i)=>frow(f,i,L)).join('')||'<div class="s" style="padding:10px">لسه مفيش مجلدات'+(X.isS()?' — اضغط «+ مجلد»':'')+'</div>'}
    const F2=folders().filter(f=>nz(f.name).includes(q)),H=S().hymns.filter(h=>!h.deleted&&fById(h.folderId)&&!fById(h.folderId).deleted&&(nz(h.name).includes(q)||nz(h.lyrics).includes(q)));
    return (F2.length?'<div class="s" style="padding:6px 2px">المجلدات</div>'+F2.map((f,i)=>frow(f,i,F2)).join(''):'')+(H.length?'<div class="s" style="padding:6px 2px">الترانيم</div>'+H.map(hrow).join(''):'')||'<div class="s" style="padding:10px">مفيش نتائج</div>';
  }
  window.hySq=v=>{st.q=v;$('#hl').innerHTML=hList()};
  PG.hymns={t:'الترانيم',act:()=>X.isS()?`<button class="ib" onclick="fdAdd()">${ic('plus')}</button>`:'',v:()=>{
    const S2=X.isS(),nT=trashedH().length+trashedF().length;
    return pg(`<div class="search">${ic('search')}<input id="hsq" placeholder="ابحث عن ترنيمة أو مجلد" value="${esc(st.q)}" oninput="hySq(this.value)"></div>
    ${S2?`<div class="chips"><button onclick="fdAdd()">+ مجلد</button><button onclick="hyForm('',null)">+ ترنيمة</button><button class="${st.sort?'on':''}" onclick="hyMode('sort')">ترتيب وتثبيت</button><button class="${st.selMode?'on':''}" onclick="hyMode('sel')">تحديد</button><button onclick="go('htrash')">🗑 السلة${nT?' ('+nT+')':''}</button></div>
    ${st.selMode?`<div class="card row sp"><span class="s">محدد: ${st.sel.size}</span><span class="row"><button class="btn sm o" onclick="fdEmptyPick()">اختيار الفارغة</button><button class="btn sm no" onclick="fdTrash()">نقل للسلة</button></span></div>`:''}`:''}
    <div class="card" id="hl">${hList()}</div>`)}};
  window.hyMode=k=>{if(k==='sort'){st.sort=!st.sort;st.selMode=false}else{st.selMode=!st.selMode;st.sort=false}st.sel=new Set();X.render(2)};
  window.hySelF=id=>{st.sel.has(id)?st.sel.delete(id):st.sel.add(id);X.render(2)};
  window.hySelH=id=>{st.sel.has(id)?st.sel.delete(id):st.sel.add(id);X.render(2)};

  // ---------- عمليات المجلدات ----------
  window.fdAdd=()=>om(`<h3 style="margin-top:0">إضافة مجلد</h3><input id="fdn" maxlength="80" placeholder="اسم المجلد"><button class="btn g" onclick="fdSave('')">حفظ</button>`);
  window.fdEdit=id=>{const f=fById(id);if(!f)return;om(`<h3 style="margin-top:0">تعديل اسم المجلد</h3><input id="fdn" maxlength="80" value="${esc(f.name)}"><button class="btn g" onclick="fdSave('${id}')">حفظ</button>`)};
  window.fdSave=async id=>{
    const n=$('#fdn').value.trim();if(!n){toast('اكتب اسم المجلد',0);return}
    if(folders().some(f=>f.id!==id&&nz(f.name)===nz(n))){toast('فيه مجلد بنفس الاسم',0);return}
    if(st.busy)return;st.busy=true;
    try{
      if(id)await F.updateDoc(F.doc(db,'hymnFolders',id),{name:n,updatedAt:Date.now()});
      else{const mx=S().folders.reduce((a,f)=>Math.max(a,f.order||0),0);await F.addDoc(F.collection(db,'hymnFolders'),{name:n,section:fSec(),order:mx+1,pinned:false,deleted:false,createdAt:Date.now(),updatedAt:Date.now(),...who()})}
      closeM();toast('تم الحفظ');
    }catch(e){toast(errMsg(e),0)}finally{st.busy=false}
  };
  window.fdPin=async id=>{const f=fById(id);if(!f)return;try{await F.updateDoc(F.doc(db,'hymnFolders',id),{pinned:!f.pinned,updatedAt:Date.now()})}catch(e){toast(errMsg(e),0)}};
  window.fdMove=async(id,d)=>{
    const f=fById(id);if(!f)return;const grp=folders().filter(x=>!!x.pinned===!!f.pinned),i=grp.findIndex(x=>x.id===id),j=i+d;
    if(j<0||j>=grp.length)return;
    [grp[i],grp[j]]=[grp[j],grp[i]];
    try{const b=F.writeBatch(db);grp.forEach((x,k)=>{if((x.order??-1)!==k+1)b.update(F.doc(db,'hymnFolders',x.id),{order:k+1,updatedAt:Date.now()})});await b.commit()}catch(e){toast(errMsg(e),0)}
  };
  window.fdEmptyPick=()=>{st.sel=new Set(folders().filter(f=>!inF(f.id).length).map(f=>f.id));if(!st.sel.size)toast('مفيش مجلدات فارغة');X.render(2)};
  window.fdTrash=async(ids)=>{
    ids=ids||[...st.sel].filter(id=>fById(id));if(!ids.length){toast('حدد مجلدات الأول',0);return}
    if(!confirm(`نقل ${ids.length} مجلد للسلة؟ (الترانيم اللي جواها هتختفي معاهم ويمكن استعادتهم)`))return;
    try{const b=F.writeBatch(db);ids.forEach(id=>b.update(F.doc(db,'hymnFolders',id),{deleted:true,deletedAt:Date.now(),updatedAt:Date.now()}));await b.commit();st.sel=new Set();st.selMode=false;toast('اتنقلت للسلة');if(X.page()==='folder')X.back();else X.render(2)}catch(e){toast(errMsg(e),0)}
  };
  window.fdPinned=id=>window.fdPin(id);

  // ---------- صفحة المجلد ----------
  PG.folder={t:id=>(fById(id)||{}).name||'مجلد',act:id=>X.isS()?`<button class="ib" onclick="hyForm('','${id}')">${ic('plus')}</button>`:'',v:id=>{
    const f=fById(id);if(!f||f.deleted)return pg('<div class="card s">المجلد غير موجود أو في السلة</div>');
    const L=inF(id),S2=X.isS();
    return pg(`${S2?`<div class="chips"><button onclick="hyForm('','${id}')">+ ترنيمة</button><button onclick="fdEdit('${id}')">تعديل الاسم</button><button onclick="fdPin('${id}')">${f.pinned?'إلغاء التثبيت':'تثبيت في الأعلى'}</button><button class="${st.selMode?'on':''}" onclick="hyMode('sel')">تحديد</button><button onclick="fdTrash(['${id}'])">نقل المجلد للسلة</button></div>
      ${st.selMode?`<div class="card row sp"><span class="s">محدد: ${st.sel.size}</span><span class="row"><button class="btn sm o" onclick="hyMovePick()">نقل لمجلد</button><button class="btn sm no" onclick="hyTrash()">نقل للسلة</button></span></div>`:''}`:''}
      <div class="card">${L.map(hrow).join('')||`<div class="s" style="padding:10px">لا توجد ترانيم في هذا المجلد${S2?' — اضغط «+ ترنيمة»':''}</div>`}</div>`);
  }};

  // ---------- صفحة الترنيمة + المشغل ----------
  PG.hymn={t:id=>(S().hymns.find(h=>h.id===id)||{}).name||'ترنيمة',act:id=>X.isS()?`<button class="ib" onclick="hyForm('${id}')">${ic('edit')}</button>`:'',v:id=>{
    const h=S().hymns.find(x=>x.id===id);if(!h||h.deleted)return pg('<div class="card s">الترنيمة غير موجودة أو في السلة</div>');
    const L=inF(h.folderId),i=L.findIndex(x=>x.id===id),f=fById(h.folderId),img=h.image||h.imageUrl,isCur=cur&&cur.id===id;
    const pos=isCur&&AU.duration?Math.round(AU.currentTime/AU.duration*1000):0;
    return pg(`<div class="card" style="text-align:center">${img?`<img class="himg" src="${esc(img)}" alt="" onerror="this.style.display='none'">`:`<span class="nic" style="margin:0 auto 8px;background:#e4ecfb;color:var(--navy);width:70px;height:70px">${ic('music')}</span>`}
      <h2 style="margin:6px 0 2px">${esc(h.name)}</h2><span class="bdg">${esc(f?f.name:'—')}</span></div>
      ${h.audioUrl?`<div class="card"><div class="player"><button class="pbtn" id="apb" data-h="${id}" onclick="hyPlay('${id}')">${ic(isCur&&playing()?'pause':'play')}</button><div style="flex:1;min-width:0"><input type="range" id="aup" data-h="${id}" min="0" max="1000" value="${pos}" oninput="hySeek(this.value)" style="margin:0"><div class="s" id="aut" data-h="${id}" style="text-align:left;direction:ltr">${isCur?mmss(AU.currentTime)+' / '+mmss(AU.duration):'0:00 / 0:00'}</div></div></div>
        <div class="row sp" style="margin-top:8px"><button class="btn sm o" ${i<=0?'disabled':''} onclick="hyNav('${i>0?L[i-1].id:''}')">السابقة</button><button class="btn sm o" ${i<0||i>=L.length-1?'disabled':''} onclick="hyNav('${i>=0&&i<L.length-1?L[i+1].id:''}')">التالية</button></div></div>`:''}
      ${h.lyrics?`<div class="card"><h3>الكلمات</h3><div class="lyr">${esc(h.lyrics)}</div></div>`:'<div class="card s">لا توجد كلمات مضافة</div>'}
      ${X.isS()?`<button class="btn no" onclick="hyTrash(['${id}'])">${ic('trash')} نقل للسلة</button>`:''}`);
  }};
  window.hyNav=id=>{if(id)window.sv('arg',id)};

  // ---------- نموذج الترنيمة ----------
  window.hyForm=(id,fid)=>{
    const h=id?S().hymns.find(x=>x.id===id):{},FL=folders();
    if(!FL.length){toast('أنشئ مجلدًا الأول',0);return}
    st.img=null;st.imgClr=false;st.file=null;
    const cf=h.folderId||fid||FL[0].id;
    om(`<h3 style="margin-top:0">${id?'تعديل الترنيمة':'إضافة ترنيمة'}</h3>
     <label>المجلد</label><select id="hf">${FL.map(f=>`<option value="${f.id}" ${f.id===cf?'selected':''}>${esc(f.name)}</option>`).join('')}</select>
     <input id="hn" maxlength="120" placeholder="اسم الترنيمة" value="${esc(h.name||'')}">
     <label>كلمات الترنيمة</label><textarea id="hlx" rows="6" placeholder="الكلمات">${esc(h.lyrics||'')}</textarea>
     <label>رابط الصوت المباشر (https — يدعم Google Drive و Dropbox)</label><input id="ha" inputmode="url" dir="ltr" placeholder="https://..." value="${esc(h.audioUrl||'')}">
     <label>أو رفع ملف MP3 من الجهاز (يحتاج تفعيل Firebase Storage)</label><input id="haf" type="file" accept="audio/*" onchange="hyPickAudio(this)">
     <label>صورة الترنيمة (اختياري)</label><div class="row"><span class="av" id="hpv" style="width:56px;height:56px;border-radius:12px">${h.image||h.imageUrl?`<img src="${esc(h.image||h.imageUrl)}" alt="">`:ic('img')}</span><input type="file" accept="image/*" onchange="hyPickImg(this)" style="margin:0"></div>
     <input id="hi" inputmode="url" dir="ltr" placeholder="أو رابط صورة https (اختياري)" value="${esc(h.imageUrl||'')}" style="margin-top:8px">
     <div class="s" id="hprog"></div>
     <button class="btn g" id="hsv" onclick="hySave('${id||''}')">حفظ</button>`);
  };
  window.hyPickAudio=inp=>{const f=inp.files[0];st.file=null;if(!f)return;if(f.size>25*1024*1024){toast('الملف أكبر من 25 ميجا',0);inp.value='';return}if(!/^audio\//.test(f.type)&&!/\.(mp3|m4a|wav|ogg|aac)$/i.test(f.name)){toast('اختار ملف صوتي',0);inp.value='';return}st.file=f;$('#hprog').textContent='الملف: '+f.name};
  window.hyPickImg=inp=>{const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),k=Math.min(1,360/Math.max(im.width,im.height));c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);st.img=c.toDataURL('image/jpeg',.6);$('#hpv').innerHTML=`<img src="${st.img}" alt="">`};im.onerror=()=>toast('الصورة غير صالحة',0);im.src=r.result};r.readAsDataURL(f)};
  function upload(file,path,onp){return new Promise((res,rej)=>{const t=uploadBytesResumable(sref(getStorage(X.app),path),file,{contentType:file.type||'audio/mpeg'});t.on('state_changed',s=>onp(Math.round(s.bytesTransferred/s.totalBytes*100)),rej,async()=>{try{res({url:await getDownloadURL(t.snapshot.ref),path})}catch(e){rej(e)}})})}
  window.hySave=async id=>{
    if(st.busy)return;
    const name=$('#hn').value.trim(),lyrics=$('#hlx').value,folderId=$('#hf').value;let au=$('#ha').value.trim();const im=$('#hi').value.trim();
    if(!name){toast('اكتب اسم الترنيمة',0);return}
    if(!folderId||!fById(folderId)||fById(folderId).deleted){toast('اختار مجلدًا',0);return}
    if(!okUrl(au)||!okUrl(im)){toast('الروابط لازم تبدأ بـ https://',0);return}
    if(S().hymns.some(h=>!h.deleted&&h.id!==id&&h.folderId===folderId&&nz(h.name)===nz(name))&&!confirm('فيه ترنيمة بنفس الاسم في المجلد ده. تكمّل؟'))return;
    const old=id?S().hymns.find(h=>h.id===id)||{}:{};
    st.busy=true;const btn=$('#hsv');if(btn)btn.disabled=true;
    try{
      const hsec=id?(old.section||fById(folderId).section):fById(folderId).section;
      const ref=id?F.doc(db,'hymns',id):F.doc(F.collection(db,'hymns'));let audioPath=au===old.audioUrl?(old.audioPath||''):'';
      if(st.file){
        try{const up=await upload(st.file,`hymns/${hsec}/${ref.id}/${Date.now()}_${st.file.name.replace(/[^\w.\-]+/g,'_')}`,p=>{$('#hprog').textContent='جاري الرفع '+p+'%'});au=up.url;audioPath=up.path}
        catch(e){const c=e&&e.code;toast(c==='storage/unauthorized'||c==='storage/unauthenticated'?'الرفع ممنوع: فعّل Firebase Storage وانشر storage.rules، أو استخدم رابط صوت':c==='storage/bucket-not-found'||c==='storage/project-not-found'?'Firebase Storage غير مفعّل — استخدم رابط صوت مباشر':'فشل رفع الملف، ما اتحفظش شيء',0);return}
      }
      const data={name,lyrics,folderId,audioUrl:au,audioPath,imageUrl:im,image:st.img!==null?st.img:(old.image||''),updatedAt:Date.now()};
      if(im&&st.img===null&&!old.image)data.image='';
      if(id)await F.updateDoc(ref,data);
      else await F.setDoc(ref,{...data,section:hsec,deleted:false,originalFolderId:'',createdAt:Date.now(),...who()});
      st.file=null;closeM();toast('تم الحفظ');
    }catch(e){toast(errMsg(e),0)}finally{st.busy=false;const b=$('#hsv');if(b)b.disabled=false}
  };

  // ---------- نقل / سلة الترانيم ----------
  window.hyMovePick=()=>{
    const ids=[...st.sel].filter(id=>S().hymns.some(h=>h.id===id));if(!ids.length){toast('حدد ترانيم الأول',0);return}
    om(`<h3 style="margin-top:0">نقل ${ids.length} ترنيمة إلى</h3><select id="hmt">${folders().map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join('')}</select><button class="btn g" onclick="hyMove()">نقل</button>`);
  };
  window.hyMove=async()=>{
    const to=$('#hmt').value,ids=[...st.sel];if(!to||!ids.length)return;
    try{const b=F.writeBatch(db);ids.forEach(id=>b.update(F.doc(db,'hymns',id),{folderId:to,updatedAt:Date.now()}));await b.commit();st.sel=new Set();st.selMode=false;closeM();toast('تم النقل')}catch(e){toast(errMsg(e),0)}
  };
  window.hyTrash=async ids=>{
    ids=ids||[...st.sel].filter(id=>S().hymns.some(h=>h.id===id));if(!ids.length){toast('حدد ترانيم الأول',0);return}
    if(!confirm(`نقل ${ids.length} ترنيمة للسلة؟ يمكن استعادتها.`))return;
    try{const b=F.writeBatch(db);ids.forEach(id=>{const h=S().hymns.find(x=>x.id===id);b.update(F.doc(db,'hymns',id),{deleted:true,deletedAt:Date.now(),originalFolderId:h?h.folderId:'',updatedAt:Date.now()})});await b.commit();if(cur&&ids.includes(cur.id))window.hyStop();st.sel=new Set();st.selMode=false;toast('اتنقلت للسلة');if(X.page()==='hymn')X.back();else X.render(2)}catch(e){toast(errMsg(e),0)}
  };

  // ---------- سلة المحذوفات ----------
  PG.htrash={t:'سلة المحذوفات',v:()=>{
    if(!X.isS())return pg('<div class="card s">للخادم فقط</div>');
    const H=trashedH().sort((a,b)=>(b.deletedAt||0)-(a.deletedAt||0)),Fo=trashedF().sort((a,b)=>(b.deletedAt||0)-(a.deletedAt||0));
    return pg(`<div class="tabs"><button class="${st.tt==='h'?'on':''}" onclick="htTab('h')">الألحان المحذوفة (${H.length})</button><button class="${st.tt==='f'?'on':''}" onclick="htTab('f')">المجلدات المحذوفة (${Fo.length})</button></div>
    <div class="card">${st.tt==='h'?(H.map(h=>`<div class="li"><span class="nic" style="background:#fde3e7">${ic('music')}</span><div class="t"><b>${esc(h.name)}</b><span class="s">من: ${esc((fById(h.originalFolderId||h.folderId)||{}).name||'مجلد محذوف')} · ${X.ago(h.deletedAt||0)}</span></div><button class="btn sm g" onclick="htRestoreH('${h.id}')">استعادة</button><button class="btn sm no" onclick="htDelH('${h.id}')">حذف</button></div>`).join('')||'<div class="s" style="padding:10px">السلة فارغة تماماً</div>')
      :(Fo.map(f=>`<div class="li"><span class="nic" style="background:#fde3e7">${ic('folder')}</span><div class="t"><b>${esc(f.name)}</b><span class="s">${inF(f.id).length} ترنيمة · ${X.ago(f.deletedAt||0)}</span></div><button class="btn sm g" onclick="htRestoreF('${f.id}')">استعادة</button><button class="btn sm no" onclick="htDelF('${f.id}')">حذف</button></div>`).join('')||'<div class="s" style="padding:10px">السلة فارغة تماماً</div>')}</div>`);
  }};
  window.htTab=k=>{st.tt=k;X.render(2)};
  window.htRestoreF=async id=>{try{await F.updateDoc(F.doc(db,'hymnFolders',id),{deleted:false,deletedAt:0,updatedAt:Date.now()});toast('اتسترجع المجلد')}catch(e){toast(errMsg(e),0)}};
  window.htRestoreH=async id=>{
    const h=S().hymns.find(x=>x.id===id);if(!h)return;const fid=h.originalFolderId||h.folderId,f=fById(fid);
    try{
      const b=F.writeBatch(db);
      if(!f){toast('المجلد الأصلي اتحذف نهائيًا، انقل الترنيمة لمجلد آخر الأول',0);return window.htPickFolder(id)}
      if(f.deleted){if(!confirm('المجلد الأصلي في السلة. نستعيده معاها؟'))return;b.update(F.doc(db,'hymnFolders',fid),{deleted:false,deletedAt:0,updatedAt:Date.now()})}
      b.update(F.doc(db,'hymns',id),{deleted:false,deletedAt:0,folderId:fid,originalFolderId:'',updatedAt:Date.now()});await b.commit();toast('اتسترجعت');
    }catch(e){toast(errMsg(e),0)}
  };
  window.htPickFolder=id=>om(`<h3 style="margin-top:0">استرجاع إلى مجلد</h3><select id="hmt">${folders().map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join('')}</select><button class="btn g" onclick="htRestoreTo('${id}')">استعادة</button>`);
  window.htRestoreTo=async id=>{const to=$('#hmt').value;if(!to){toast('مفيش مجلد متاح',0);return}try{await F.updateDoc(F.doc(db,'hymns',id),{deleted:false,deletedAt:0,folderId:to,originalFolderId:'',updatedAt:Date.now()});closeM();toast('اتسترجعت')}catch(e){toast(errMsg(e),0)}};
  window.htDelH=async id=>{
    const h=S().hymns.find(x=>x.id===id);if(!h||!confirm('حذف الترنيمة نهائيًا؟ لا يمكن التراجع.'))return;
    try{await F.deleteDoc(F.doc(db,'hymns',id));if(h.audioPath){try{await deleteObject(sref(getStorage(X.app),h.audioPath))}catch(e){}}toast('اتحذفت نهائيًا')}catch(e){toast(errMsg(e),0)}
  };
  window.htDelF=async id=>{
    const n=inF(id).length;if(n){toast('المجلد فيه ترانيم. انقلها أو احذفها الأول',0);return}
    const hs=S().hymns.filter(h=>h.folderId===id||h.originalFolderId===id);if(hs.length){toast('فيه ترانيم في السلة تابعة للمجلد ده. احذفها أو استرجعها الأول',0);return}
    if(!confirm('حذف المجلد نهائيًا؟'))return;
    try{await F.deleteDoc(F.doc(db,'hymnFolders',id));toast('اتحذف نهائيًا')}catch(e){toast(errMsg(e),0)}
  };
  X.ext.onNav=()=>{st.selMode=false;st.sort=false;st.sel=new Set()};
  X.ext.hymnStats=()=>({folders:folders().length,hymns:S().hymns.filter(h=>!h.deleted).length,trash:trashedH().length+trashedF().length});
}
