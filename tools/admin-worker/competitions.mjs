// معالجة المسابقات وتصحيح الإجابات خارج التطبيق باستخدام Firebase Admin SDK.
// لا تُرسل الإجابات الصحيحة إلى العميل؛ تحفظ في secrets/ ولا تقرؤها قواعد Firestore.
const normText=v=>String(v??'').normalize('NFKC').trim().replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').toLowerCase();
const fail=(e)=>String(e?.code||e?.message||e).slice(0,180);
export async function processCompetitionRequests(db){
  const snap=await db.collection('competitionRequests').where('status','==','pending').limit(30).get();
  for(const d of snap.docs){
    const r=d.data();
    try{
      const servant=await db.doc('users/'+r.requestedBy).get();
      const sv=servant.exists?servant.data():{};
      const isAdm=sv.role==='admin'&&sv.section==='general'&&sv.status==='active',isSrv=sv.role==='servant'&&sv.status==='active'&&['boys','girls'].includes(sv.section);
      if(!isAdm&&!isSrv)throw new Error('صاحب الطلب ليس خادمًا أو مديرًا مفعّلًا');
      // الخادم لا يتعدى قسمه (Admin SDK يتجاوز القواعد فنتحقق هنا)
      const secOk=s=>isAdm?['boys','girls','both'].includes(s):s===sv.section;
      if(!r.competitionId)throw new Error('معرّف المسابقة غير صالح');
      const compRef=db.doc('competitions/'+r.competitionId),secretRef=db.doc('secrets/competition_answers_'+r.competitionId);
      if(['activate','deactivate'].includes(r.action)){
        await db.runTransaction(async tx=>{const [req,comp]=await Promise.all([tx.get(d.ref),tx.get(compRef)]);if(!req.exists||req.data().status!=='pending')return;if(!comp.exists||!comp.data().isPublished)throw new Error('المسابقة غير منشورة');if(!secOk(comp.data().section))throw new Error('المسابقة خارج قسم صاحب الطلب');tx.update(compRef,{isActive:r.action==='activate',updatedAt:Date.now()});tx.update(d.ref,{status:'done',processedAt:Date.now(),message:r.action==='activate'?'تم تفعيل المسابقة':'تم إيقاف المسابقة'});});
        console.log('Competition toggled:',r.competitionId,r.action);continue;
      }
      if(r.action==='publish'){
        await db.runTransaction(async tx=>{const [req,comp]=await Promise.all([tx.get(d.ref),tx.get(compRef)]);if(!req.exists||req.data().status!=='pending')return;if(!comp.exists||comp.data().isPublished)throw new Error('المسودة غير موجودة أو منشورة بالفعل');if(!secOk(comp.data().section))throw new Error('المسابقة خارج قسم صاحب الطلب');tx.update(compRef,{isPublished:true,isActive:true,updatedAt:Date.now(),publishedBy:r.requestedBy});tx.update(d.ref,{status:'done',processedAt:Date.now(),message:'تم نشر المسابقة'});});
        console.log('Competition published:',r.competitionId);continue;
      }
      if(!['create','update'].includes(r.action||'create'))throw new Error('نوع طلب غير معروف');
      if(!Array.isArray(r.questions)||!r.questions.length||r.questions.length>80)throw new Error('عدد الأسئلة غير صالح');
      const clean=[];
      for(const [i,q] of r.questions.entries()){
        if(!['mcq','tf','text'].includes(q.type)||typeof q.text!=='string'||!q.text.trim())throw new Error('بيانات سؤال غير صالحة');
        const id='q'+(i+1),a=r.answers?.[id];if(!a||a.type!==q.type)throw new Error('مفتاح إجابة ناقص');
        if(q.type==='mcq'&&(!Array.isArray(q.options)||q.options.length<2||q.options.length>8||q.options.some(x=>typeof x!=='string'||!x.trim())||new Set(q.options).size!==q.options.length||!Number.isInteger(a.answer)||a.answer<0||a.answer>=q.options.length))throw new Error('اختيارات السؤال غير صالحة');
        if(q.type==='tf'&&typeof a.answer!=='boolean')throw new Error('إجابة صح وخطأ غير صالحة');
        if(q.type==='text'&&(typeof a.answer!=='string'||!a.answer.trim()))throw new Error('الإجابة النموذجية ناقصة');
        clean.push({id,type:q.type,text:q.text.trim(),options:q.type==='mcq'?q.options.map(x=>String(x).trim()):[],points:Math.max(0,Math.min(100,Number(q.points)||0))});
      }
      const now=Date.now();if(!Number.isFinite(r.startsAt)||!Number.isFinite(r.endsAt)||r.endsAt<=r.startsAt)throw new Error('موعد المسابقة غير صالح');
      const pub={title:String(r.title||'').trim().slice(0,120),description:String(r.description||'').slice(0,500),section:r.section,startsAt:r.startsAt,endsAt:r.endsAt,durationMin:Math.max(0,Math.min(240,Number(r.durationMin)||0)),isPublished:!!r.isPublished,isActive:!!r.isPublished,questions:clean,createdBy:r.requestedBy,createdByName:String(r.requestedByName||'').slice(0,100),createdAt:r.createdAt||now,updatedAt:now,sourceRequestId:d.id};
      if(!pub.title)throw new Error('اسم المسابقة مطلوب');
      if(!secOk(pub.section))throw new Error('القسم غير مسموح لصاحب الطلب');
      await db.runTransaction(async tx=>{
        const [req,existing,secret]=await Promise.all([tx.get(d.ref),tx.get(compRef),tx.get(secretRef)]);
        if(!req.exists||req.data().status!=='pending')return;
        if(r.action==='update'){
          if(!existing.exists||existing.data().isPublished||!secret.exists)throw new Error('لا يمكن تعديل المسابقة المنشورة أو غير الموجودة');if(!secOk(existing.data().section)||existing.data().section!==pub.section)throw new Error('المسابقة خارج قسم صاحب الطلب');
          pub.createdAt=existing.data().createdAt||pub.createdAt;
          tx.set(compRef,pub);tx.set(secretRef,{competitionId:r.competitionId,answers:r.answers,createdAt:now,updatedAt:now});
        }else{
          if(existing.exists||secret.exists)throw new Error('المسابقة موجودة بالفعل');
          tx.create(compRef,pub);tx.create(secretRef,{competitionId:r.competitionId,answers:r.answers,createdAt:now});
        }
        tx.update(d.ref,{status:'done',processedAt:now,message:r.action==='update'?'تم تحديث المسودة':'تم إنشاء المسابقة ونقل مفتاح الإجابة إلى التخزين الخاص'});
      });
      console.log('Competition saved:',r.competitionId);
    }catch(e){const code=String(e?.code||'');if(!['unavailable','deadline-exceeded','aborted','internal','resource-exhausted'].includes(code))await d.ref.update({status:'failed',message:fail(e),processedAt:Date.now()});console.error('Competition request failed:',d.id,fail(e));}
  }
  return snap.size;
}

export async function gradeCompetitionAttempts(db){
  const snap=await db.collection('competitionAttempts').where('status','==','pending').limit(50).get();
  for(const d of snap.docs){
    try{
      const a=d.data(),compRef=db.doc('competitions/'+a.competitionId),secretRef=db.doc('secrets/competition_answers_'+a.competitionId);
      const [compSnap,secretSnap,memberSnap]=await Promise.all([compRef.get(),secretRef.get(),db.doc('members/'+a.memberId).get()]);
      if(!compSnap.exists||!secretSnap.exists||!memberSnap.exists)throw new Error('بيانات المسابقة أو المخدوم غير مكتملة');
      const c=compSnap.data(),m=memberSnap.data(),now=Date.now();
      if(m.uid!==a.memberUid||m.section!==a.section||!(c.section==='both'||c.section===m.section))throw new Error('تعذر التحقق من عضوية المشارك');
      const submittedAt=a.submittedAt?.toMillis?.()||0;
      if(!c.isPublished||!submittedAt||submittedAt<c.startsAt||submittedAt>c.endsAt)throw new Error('وقت تسليم المحاولة غير صالح أو المسابقة غير منشورة');
      const key=secretSnap.data().answers||{},given=a.answers||{};let score=0,maxScore=0;const breakdown={};
      for(const q of c.questions||[]){const k=key[q.id];if(!k)throw new Error('مفتاح إجابة غير موجود');const max=Math.max(0,Number(q.points)||0);maxScore+=max;const v=given[q.id];let ok=false,correct=k.answer;
        if(q.type==='mcq')ok=Number.isInteger(v)&&v===k.answer;
        else if(q.type==='tf')ok=typeof v==='boolean'&&v===k.answer;
        else if(q.type==='text')ok=typeof v==='string'&&normText(v)===normText(k.answer);
        const got=ok?max:0;score+=got;
        let shown=typeof v==='undefined'?'—':String(v);if(q.type==='mcq')shown=Number.isInteger(v)?(q.options?.[v]||'إجابة غير صالحة'):'—';if(q.type==='tf')shown=typeof v==='boolean'?(v?'صح':'خطأ'):'—';
        breakdown[q.id]={question:q.text,given:shown,correctAnswer:ok,score:got,max};
      }
      const pointsAwarded=score,adjustRef=db.doc('adjustments/competition_'+a.competitionId+'_'+a.memberId),memberRef=db.doc('members/'+a.memberId),rankRef=db.doc('competitionLeaderboard/'+a.competitionId+'_'+a.memberId),notifRef=db.doc('notifs/competition_result_'+a.competitionId+'_'+a.memberId);
      await db.runTransaction(async tx=>{
        const [attemptNow,adjNow,memNow,notifNow]=await Promise.all([tx.get(d.ref),tx.get(adjustRef),tx.get(memberRef),tx.get(notifRef)]);
        if(!attemptNow.exists||attemptNow.data().status!=='pending')return;
        const already=adjNow.exists;const award=already?Number(adjNow.data().pts)||0:pointsAwarded;
        if(!already&&award>0){tx.create(adjustRef,{memberId:a.memberId,section:m.section,pts:award,reason:'مسابقة: '+c.title,by:'competition-worker',at:now,competitionId:a.competitionId,source:'competition'});tx.update(memberRef,{points:(Number(memNow.data().points)||0)+award});}
        tx.set(rankRef,{competitionId:a.competitionId,memberId:a.memberId,memberName:m.name||'مخدوم',section:m.section,score,maxScore,pointsAwarded:award,gradedAt:now},{merge:true});
        if(!notifNow.exists)tx.create(notifRef,{to:a.memberId,section:m.section,kind:'pts',title:'نتيجة مسابقة: '+c.title,body:'حصلت على '+score+' من '+maxScore+' درجة و '+award+' نقطة.',at:now});
        tx.update(d.ref,{status:'graded',memberName:m.name||'مخدوم',score,maxScore,pointsAwarded:award,breakdown,gradedAt:now,showAnswers:false});
      });
      console.log('Attempt graded:',d.id,'score',score,'/',maxScore);
    }catch(e){
      console.error('Attempt grading failed:',d.id,fail(e));
      // فشل البيانات نهائي فقط؛ أخطاء الشبكة تظل pending لتُعاد في التشغيل التالي.
      const msg=fail(e);if(/غير مكتملة|غير موجود|غير صالح|غير متاحة|التحقق من عضوية|مفتاح إجابة/.test(msg))await d.ref.update({status:'failed',error:msg,failedAt:Date.now()});
    }
  }
  return snap.size;
}


export async function revealEndedAnswers(db){
  const snap=await db.collection('competitionAttempts').where('showAnswers','==',false).limit(100).get();
  const now=Date.now();let count=0;
  for(const d of snap.docs){const a=d.data();if(a.showAnswers)continue;const [cSnap,kSnap]=await Promise.all([db.doc('competitions/'+a.competitionId).get(),db.doc('secrets/competition_answers_'+a.competitionId).get()]);if(!cSnap.exists||!kSnap.exists||now<=cSnap.data().endsAt)continue;const c=cSnap.data(),key=kSnap.data().answers||{},breakdown={...(a.breakdown||{})};for(const q of c.questions||[]){const k=key[q.id];if(!k)continue;const correct=q.type==='mcq'?(q.options?.[k.answer]||''):q.type==='tf'?(k.answer?'صح':'خطأ'):String(k.answer);breakdown[q.id]={...(breakdown[q.id]||{}),correct}}await d.ref.update({showAnswers:true,breakdown});count++}
  return count;
}
