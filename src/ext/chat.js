// الشات (5.0.0): غرفة لكل قسم (بنين/بنات) + «اجتماع الخدام» لكل قسم.
// Firestore مباشرة (onSnapshot) — بلا أي خدمة خارجية. العزل بين الغرف مفروض في firestore.rules وليس في الواجهة فقط.
//   sectionChats/{section}/messages/{messageId}    section ∈ boys, girls — أعضاء القسم + المدير العام فقط
//   servantChat/{section}/messages/{messageId}     خدام القسم + المدير العام فقط
// الرسائل لا تُعدَّل ولا تُحذف (القواعد تمنع update/delete للجميع).
export function installChat(X){
  const {db,$,esc,PG,toast}=X,F=X.fire,PAGE=30;
  Object.assign(X.IC,{
    chat:'<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/>',
    lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
  });
  const st={room:null,map:new Map(),cursor:null,more:false,busy:false,unsub:null,draft:'',stick:true,top:0,sending:false,thumbs:{}};
  const isSrv=r=>String(r).startsWith('srv:'),secOf=r=>isSrv(r)?r.slice(4):r;
  const path=r=>isSrv(r)?['servantChat',secOf(r),'messages']:['sectionChats',r,'messages'];
  const rname=r=>isSrv(r)?'اجتماع الخدام — '+X.chName(secOf(r)):'محادثة '+X.chName(r);
  const myRoom=()=>{const m=X.mem();return m&&X.CHK.includes(m.section)?m.section:null};
  const can=r=>X.CHK.includes(secOf(r))&&(X.isA()||(X.isS()?X.me().section===secOf(r):(!isSrv(r)&&r===myRoom())));
  const myRooms=()=>X.isA()?[...X.CHK,...X.CHK.map(k=>'srv:'+k)]:[X.me().section,'srv:'+X.me().section];
  const ms=m=>{const c=m.createdAt;return c&&c.toMillis?c.toMillis():(+c||Date.now())};
  const okPhoto=p=>typeof p==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(p);
  const hhmm=t=>new Date(t).toLocaleTimeString('ar-EG',{hour:'numeric',minute:'2-digit'});

  function leave(){
    if(st.unsub){try{st.unsub()}catch(e){}st.unsub=null}
    st.room=null;st.map=new Map();st.cursor=null;st.more=false;st.busy=false;st.draft='';
  }
  const prevNav=X.ext.onNav;
  X.ext.onNav=()=>{prevNav&&prevNav();leave()};
  X.ext.chat={leave,myRoom};

  function open(room){
    leave();st.room=room;st.stick=true;
    const q=F.query(F.collection(db,...path(room)),F.orderBy('createdAt','desc'),F.limit(PAGE));
    let first=true;
    st.unsub=F.onSnapshot(q,s=>{
      if(st.room!==room)return;
      s.docs.forEach(d=>st.map.set(d.id,{id:d.id,...d.data({serverTimestamps:'estimate'})}));
      if(first){first=false;st.cursor=s.docs.length?s.docs[s.docs.length-1]:null;st.more=s.docs.length>=PAGE}
      paint();
    },e=>{console.warn('chat',e&&e.code);toast('مفيش صلاحية لدخول الغرفة دي',0)});
  }

  async function older(){
    if(st.busy||!st.more||!st.cursor||!st.room)return;
    st.busy=true;const room=st.room,l=$('#chatList'),h0=l?l.scrollHeight:0,t0=l?l.scrollTop:0;
    try{
      const s=await F.getDocs(F.query(F.collection(db,...path(room)),F.orderBy('createdAt','desc'),F.startAfter(st.cursor),F.limit(PAGE)));
      if(st.room!==room)return;
      s.docs.forEach(d=>st.map.set(d.id,{id:d.id,...d.data({serverTimestamps:'estimate'})}));
      if(s.docs.length)st.cursor=s.docs[s.docs.length-1];
      st.more=s.docs.length>=PAGE;
      paint({h0,t0});
    }catch(e){toast('تعذر تحميل الرسائل القديمة',0)}
    finally{st.busy=false}
  }

  function body(){
    const L=[...st.map.values()].sort((a,b)=>ms(a)-ms(b)||(a.id<b.id?-1:1)),uid=X.uid();let day='',h='';
    if(st.more)h+=`<button class="btn sm o" style="margin:0 auto 10px" onclick="chatOlder()">⬆ عرض رسائل أقدم</button>`;
    if(!L.length)return h+'<div class="s" style="text-align:center;padding:30px 0">لسه مفيش رسائل. ابدأ المحادثة 👋</div>';
    for(const m of L){
      const t=ms(m),d=new Date(t).toDateString();
      if(d!==day){day=d;h+=`<div class="cd">${esc(X.fmtD(t))}</div>`}
      const mine=m.senderUid===uid,nm=String(m.senderName||'؟');
      h+=`<div class="cm ${mine?'me':'o'}"><span class="av">${okPhoto(m.senderPhoto)?`<img src="${esc(m.senderPhoto)}" alt="">`:esc(nm[0])}</span><div class="cb"><div class="cn"><b>${esc(nm)}</b>${m.senderRole==='servant'?'<i>خادم</i>':m.senderRole==='admin'?'<i>المدير العام</i>':''}</div><div class="ct">${esc(m.text)}</div><div class="cs">${hhmm(t)}</div></div></div>`;
    }
    return h;
  }
  function paint(keep){
    const l=$('#chatList');if(!l)return;
    const t=l.scrollTop;l.innerHTML=body();
    if(keep&&keep.h0!=null)l.scrollTop=l.scrollHeight-keep.h0+keep.t0;
    else l.scrollTop=st.stick?l.scrollHeight:t;
  }
  window.chatScroll=el=>{st.stick=el.scrollHeight-el.scrollTop-el.clientHeight<60;st.top=el.scrollTop;if(el.scrollTop<40)older()};
  window.chatOlder=()=>older();
  window.chatDraft=v=>{st.draft=v};
  window.chatKey=e=>{if(e.key==='Enter'&&!e.shiftKey&&window.innerWidth>700){e.preventDefault();window.chatSend()}};

  // صورة مصغّرة (≈56px) تُحفظ داخل كل رسالة — لا تُرسل الصورة الكاملة
  function thumb(src){
    if(!src)return Promise.resolve('');
    if(st.thumbs[src]!==undefined)return Promise.resolve(st.thumbs[src]);
    return new Promise(res=>{
      const im=new Image();
      im.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=56;const g=c.getContext('2d'),s=Math.min(im.width,im.height);
        g.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,56,56);let u=c.toDataURL('image/jpeg',.6);if(u.length>8000)u='';st.thumbs[src]=u;res(u)}catch(e){res('')}};
      im.onerror=()=>res('');im.src=src;
    });
  }
  window.chatSend=async()=>{
    const ta=$('#chatIn'),text=(ta?ta.value:st.draft).trim(),room=st.room;
    if(!text||st.sending||!room)return;
    if(text.length>1000){toast('الرسالة طويلة (حتى 1000 حرف)',0);return}
    st.sending=true;
    try{
      const u=X.me(),m=X.mem(),photo=await thumb(X.isS()?(u.photo||''):((m&&m.photo)||''));
      const ref=F.doc(F.collection(db,...path(room)));
      await F.setDoc(ref,{messageId:ref.id,senderUid:X.uid(),senderName:u.name||'',senderPhoto:photo,senderRole:u.role,section:secOf(room),text,createdAt:F.serverTimestamp()});
      st.draft='';st.stick=true;const t2=$('#chatIn');if(t2)t2.value='';
    }catch(e){toast(e&&e.code==='permission-denied'?'مفيش صلاحية للإرسال':'تعذر الإرسال، تأكد من الاتصال',0)}
    finally{st.sending=false}
  };

  PG.chat={t:r=>r?rname(r):(X.isS()?'الشات':(myRoom()?rname(myRoom()):'الشات')),v:r=>{
    if(!r&&!X.isS())r=myRoom();
    if(!r){
      if(!X.isS())return `<div class="pg"><div class="card s">مفيش غرفة شات لحسابك لأنه مش مربوط بقسم.</div></div>`;
      const row=(k,sub,ic)=>`<div class="li" onclick="go('chat','${k}')"><span class="nic" style="background:#e4ecfb;color:var(--navy)">${X.ic(ic)}</span><div class="t"><b>${rname(k)}</b><span class="s">${sub}</span></div><span class="ch">${X.ic('chev')}</span></div>`;
      const R=myRooms();return `<div class="pg"><div class="card"><h3>غرف الأقسام</h3>${R.filter(k=>!isSrv(k)).map(k=>row(k,'محادثة '+X.chName(k),'chat')).join('')}</div><div class="card"><h3>للخدام فقط</h3>${R.filter(isSrv).map(k=>row(k,'لا يراها أي مخدوم','lock')).join('')}</div></div>`;
    }
    if(!can(r))return `<div class="pg"><div class="card s">مفيش صلاحية لدخول الغرفة دي.</div></div>`;
    if(st.room!==r)queueMicrotask(()=>{if(st.room!==r)open(r)});
    requestAnimationFrame(()=>{const l=$('#chatList');if(l)l.scrollTop=st.stick?l.scrollHeight:st.top});
    return `<div class="pg chat"><div class="s" style="text-align:center">${X.ic('lock')} الرسائل محفوظة ولا يمكن تعديلها أو حذفها</div><div id="chatList" class="chl" onscroll="chatScroll(this)">${body()}</div><div class="chc"><textarea id="chatIn" rows="1" maxlength="1000" placeholder="اكتب رسالة..." oninput="chatDraft(this.value)" onkeydown="chatKey(event)">${esc(st.draft)}</textarea><button class="btn g" onclick="chatSend()">إرسال</button></div></div>`;
  }};
}
