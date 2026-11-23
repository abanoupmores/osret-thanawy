// امتدادات خدمة أسرة ثانوي (الأقسام، الوسائط، التصويت، المسابقات، الإدارة) — نقطة الدخول.
// كل الوحدات تعمل فوق نفس Firebase ونفس بنية الصفحات (PG) دون استبدال أي شاشة قائمة.
import {installHymns} from './hymns.js';
import {installPolls} from './polls.js';
import {installInsights} from './insights.js';
import {installTools} from './tools.js';
import {installChat} from './chat.js';
import {installCompetitions} from './competitions.js';
import {installAdmin} from './admin.js';

const ICONS={
music:'<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
pin:'<path d="M9 4h6l-1 6 3 3v2H7v-2l3-3zM12 15v6"/>',
up:'<path d="M6 15l6-6 6 6"/>',
down:'<path d="M6 9l6 6 6-6"/>',
play:'<path d="M7 4l13 8-13 8z"/>',
pause:'<path d="M7 4h4v16H7zM13 4h4v16h-4z"/>',
poll:'<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M7.5 9h6M7.5 13h9M7.5 17h4"/>',
clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
dl:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
hist:'<path d="M3.5 12a8.5 8.5 0 1 0 3-6.5M3.5 4v4.5H8M12 8v4l3 2"/>',
x:'<path d="M6 6l12 12M18 6L6 18"/>',
upd:'<path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5"/>'
};

export function installExt(X){
  Object.assign(X.IC,ICONS);
  X.ext={};
  installHymns(X);
  installPolls(X);
  installInsights(X);
  installTools(X);
  installChat(X);
  installCompetitions(X);
  installAdmin(X);
}

// تُستدعى من start() بعد تسجيل الدخول: مستمعات الـ collections الجديدة فقط.
// أي فشل صلاحيات (قواعد غير منشورة) يظهر في console فقط ولا يؤثر على الشاشات القديمة.
export function startExt(X){
  const {db,S}=X,F=X.fire,SQ=X.SQ,me=X.me(),sec=X.isA()?(['boys','girls'].includes(X.wsec())?X.wsec():null):me.section;
  X.L(SQ('hymnFolders',F.limit(500)),'folders');
  X.L(SQ('hymns',F.limit(1500)),'hymns');
  X.L(SQ('polls',F.limit(200)),'polls');
  X.L(SQ('competitions',F.limit(200)),'competitions');
  if(X.isS()){
    X.L(SQ('competitionRequests',F.limit(200)),'compRequests');
    X.L(SQ('competitionAttempts',F.limit(5000)),'compAttempts');
    X.L(SQ('competitionLeaderboard',F.limit(5000)),'compLeaderboard');
  } else if(me.memberId){
    X.L(F.query(F.collection(db,'competitionAttempts'),F.where('memberId','==',me.memberId),F.where('memberUid','==',X.uid()),F.limit(500)),'compAttempts');
    X.L(SQ('competitionLeaderboard',F.limit(5000)),'compLeaderboard');
  }
  if(X.isS())X.L(SQ('pollVotes',F.limit(5000)),'votes');
  else if(me.memberId)X.L(F.query(F.collection(db,'pollVotes'),F.where('memberId','==',me.memberId)),'votes');
  X.unsub(F.onSnapshot(F.doc(db,'config','app_update'),s=>{S().upd=s.exists()?s.data():null;X.render()},e=>console.warn('app_update',e.code)));
  // الاجتماع الأسبوعي الثابت: مستند لكل قسم config/weekly_{section}
  if(X.isS()&&sec)X.unsub(F.onSnapshot(F.doc(db,'config','weekly_'+sec),s=>{S().weekly=s.exists()?s.data():null;X.render();if(X.ext.autoWeekly)X.ext.autoWeekly()},e=>console.warn('weekly',e.code)));
  // طلبات إدارية (إعادة تعيين الباسورد / مزامنة رقم الدخول) — الخادم يرى طلبات قسمه فقط، المدير الكل
  if(X.isS())X.L(SQ('adminRequests',F.limit(200)),'reqs');
  // حسابات المستخدمين: الخادم = مخدومو قسمه فقط، المدير العام = الجميع
  if(X.isA())X.L(F.query(F.collection(db,'users'),F.limit(1000)),'users');
  else if(X.isS())X.L(F.query(F.collection(db,'users'),F.where('section','==',me.section),F.where('role','==','member'),F.limit(1000)),'users');
  X.ext.startTick&&X.ext.startTick();
}
