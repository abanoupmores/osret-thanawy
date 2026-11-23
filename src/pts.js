// منطق النقاط النقي (بدون Firebase) — قابل للاختبار مباشرة بـ node (tests/pts.test.mjs).
// c = إعدادات النقاط {max,step,open,close,zero}، ev = الحدث {when}، now = وقت التسجيل بالملّي ثانية.

// التسجيل التلقائي (QR): يرجع null خارج فترة التسجيل (قبل open بدقيقة حتى 30، أو بعد close).
export function calcAuto(c,ev,now){
  const t=(now-ev.when)/6e4;
  if(t<-Math.min(c.open,30)||t>c.close)return null;
  if(t<=0)return{pts:c.max,late:0};
  const late=Math.floor(t);
  return{pts:t>=c.zero?0:Math.max(0,c.max-Math.floor(t/c.step)),late};
}

// نقاط تأخير بعدد دقائق معيّن وفق نظام النقاط المعتمد (نفس معادلة calcAuto)
export function ptsForLate(c,min){
  if(min<=0)return c.max;
  return min>=c.zero?0:Math.max(0,c.max-Math.floor(min/c.step));
}

// التسجيل اليدوي (الخادم). لا يرجع صفرًا لمجرد أن التسجيل خارج الفترة.
// o.mode: 'auto' (حسب الوقت الحالي، فقط داخل الفترة) | 'ontime' (في الميعاد = max)
//       | 'late' (o.late دقائق تأخير) | 'custom' (o.custom نقاط يحددها الخادم 0..20)
// يرجع {pts,late} أو null لو الإدخال غير صالح.
export function manualPts(c,ev,now,o){
  o=o||{};
  switch(o.mode){
    case 'auto':return calcAuto(c,ev,now);
    case 'ontime':return{pts:c.max,late:0};
    case 'late':{const m=Math.floor(+o.late);if(!Number.isFinite(m)||m<1||m>600)return null;return{pts:ptsForLate(c,m),late:m}}
    case 'custom':{const p=+o.custom;if(!Number.isInteger(p)||p<0||p>20)return null;return{pts:p,late:0}}
    default:return null;
  }
}
