// اختبارات منطق النقاط النقي: node tests/pts.test.mjs  (لا تحتاج أي حزم)
import {calcAuto,ptsForLate,manualPts} from '../src/pts.js';
let ok=true;const t=(n,a,b)=>{const g=JSON.stringify(a)===JSON.stringify(b);if(!g)ok=false;console.log(g?'PASS':'FAIL',n,g?'':'got '+JSON.stringify(a)+' expected '+JSON.stringify(b))};
const c={max:5,step:5,open:15,close:60,zero:30};const W=1e12,m=60000,ev={when:W};
t('auto: قبل الفتح',calcAuto(c,ev,W-16*m),null);
t('auto: فتح التسجيل',calcAuto(c,ev,W-15*m),{pts:5,late:0});
t('auto: في الميعاد',calcAuto(c,ev,W),{pts:5,late:0});
t('auto: 4 د تأخير',calcAuto(c,ev,W+4*m),{pts:5,late:4});
t('auto: 5 د تأخير',calcAuto(c,ev,W+5*m),{pts:4,late:5});
t('auto: 29 د',calcAuto(c,ev,W+29*m),{pts:0,late:29});
t('auto: 30 د = 0',calcAuto(c,ev,W+30*m),{pts:0,late:30});
t('auto: بعد القفل',calcAuto(c,ev,W+61*m),null);
t('auto: open>30 يُقص إلى 30',calcAuto({...c,open:45},ev,W-31*m),null);
t('ptsForLate',[ptsForLate(c,0),ptsForLate(c,4),ptsForLate(c,5),ptsForLate(c,10),ptsForLate(c,25),ptsForLate(c,30),ptsForLate(c,99)],[5,5,4,3,0,0,0]);
// إصلاح البند 2: اليدوي خارج الفترة لا يرجع null/صفر عشوائيًا
t('manual: بعد القفل + في الميعاد',manualPts(c,ev,W+3*3600e3,{mode:'ontime'}),{pts:5,late:0});
t('manual: auto خارج الفترة = null (الواجهة لا تعرضه)',manualPts(c,ev,W+3*3600e3,{mode:'auto'}),null);
t('manual: auto داخل الفترة',manualPts(c,ev,W+5*m,{mode:'auto'}),{pts:4,late:5});
t('manual: متأخر 12 د',manualPts(c,ev,W+3*3600e3,{mode:'late',late:12}),{pts:3,late:12});
t('manual: متأخر 0 د مرفوض',manualPts(c,ev,W,{mode:'late',late:0}),null);
t('manual: متأخر نص',manualPts(c,ev,W,{mode:'late',late:'abc'}),null);
t('manual: مخصص 3',manualPts(c,ev,W,{mode:'custom',custom:3}),{pts:3,late:0});
t('manual: مخصص 0 مسموح',manualPts(c,ev,W,{mode:'custom',custom:0}),{pts:0,late:0});
t('manual: مخصص 21 مرفوض',manualPts(c,ev,W,{mode:'custom',custom:21}),null);
t('manual: مخصص سالب مرفوض',manualPts(c,ev,W,{mode:'custom',custom:-1}),null);
t('manual: مخصص كسري مرفوض',manualPts(c,ev,W,{mode:'custom',custom:2.5}),null);
t('manual: بدون mode',manualPts(c,ev,W,{}),null);
t('manual: max مخصص من الإعدادات',manualPts({...c,max:10},ev,W,{mode:'ontime'}),{pts:10,late:0});
process.exit(ok?0:1);
