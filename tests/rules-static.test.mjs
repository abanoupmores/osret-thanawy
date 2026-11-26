// فحص بنيوي ساكن لـ firestore.rules و storage.rules (لا يُشغّل Firebase Emulator — انظر rules.emulator.test.mjs لاختبار حقيقي).
import fs from 'fs';
let ok=true;const t=(n,c)=>{if(!c)ok=false;console.log(c?'PASS':'FAIL',n)};
const R=fs.readFileSync(new URL('../firestore.rules',import.meta.url),'utf8'),S=fs.readFileSync(new URL('../storage.rules',import.meta.url),'utf8');
const bal=(s,a,b)=>[...s].reduce((n,c)=>n+(c===a?1:c===b?-1:0),0)===0;
t('الأقواس متوازنة (rules)',bal(R,'{','}')&&bal(R,'(',')')&&bal(R,'[',']'));
t('الأقواس متوازنة (storage)',bal(S,'{','}')&&bal(S,'(',')')&&bal(S,'[',']'));
t('لا يوجد allow if true',!/if\s+true\s*;/.test(R)&&!/if\s+true\s*;/.test(S));
t('لا بقايا كود الخدام/secrets/servant',!/servantCode|secrets\/servant/.test(R));
t('لا بقايا choir',!/choir/i.test(R)&&!/choir/i.test(S));
// استخراج كتل match على مستوى المستندات
const blocks=R.split(/\n    match \//).slice(1).map(s=>({name:s.match(/^([A-Za-z]+)\//)[1],body:s}));
t('تم استخراج كتل المجموعات ('+blocks.length+')',blocks.length>=17);
const sectionOwned=['members','events','attendance','adjustments','notifs','hymnFolders','hymns','polls','pollVotes','competitions','linkContests','competitionRequests','competitionLeaderboard','competitionAttempts','adminRequests'];
for(const c of sectionOwned){const b=blocks.find(x=>x.name===c);t('عزل القسم مفروض في '+c,!!b&&/inScope\(|readSec\(|staffOf\(|isAdmin\(\)/.test(b.body)&&!/allow read: if signedIn\(\);/.test(b.body))}
const users=blocks.find(x=>x.name==='users').body;
t('users: لا إنشاء بدور admin',!/role == 'admin'.*\n.*allow create/.test(users)&&![...users.matchAll(/allow create:[\s\S]*?;/g)].some(m=>/role == 'admin'/.test(m[0])));
t('users: التسجيل الذاتي pending فقط',/status == 'pending'/.test(users));
t('users: تعديل النفس لا يشمل role/section/status',/changed\(\)\.hasOnly\(\['name', 'contact', 'phone', 'photo'\]\)/.test(users));
t('users: كل update مقيد بـ hasOnly',[...users.matchAll(/allow update:[\s\S]*?;/g)].every(m=>/hasOnly/.test(m[0])));
t('config: لا كتابة إلا المدير أو weekly القسم',/allow write: if isAdmin\(\) \|\| \(isServant\(\) && configId == 'weekly_' \+ mySec\(\)\)/.test(R));
t('الشات: غرف بحسب القسم + المدير',/sectionChats[\s\S]*mySec\(\) == room/.test(R)&&/servantChat[\s\S]*isServant\(\) && mySec\(\) == room/.test(R));
t('لا قاعدة عامة match /{document=**}',!/\{document=\*\*\}/.test(R));
t('storage: المسار يتضمن القسم والمدير/الخادم فقط للكتابة',/hymns\/\{section\}\/\{hymnId\}\/\{file\}/.test(S)&&/isServantOf\(section\)/.test(S));
const lc=blocks.find(x=>x.name==='linkContests').body;
t('المسابقات: الرابط https فقط والدرجة العظمى محدودة',/matches\('\^https:\/\//.test(lc)&&/maxPts <= 100/.test(lc));
t('درجة المسابقة: حدود 0..maxPts وقسم المخدوم',/contestPtsOk/.test(R)&&/pts <= get\(.*linkContests/.test(R));
const adj=blocks.find(x=>x.name==='adjustments').body;
t('نقاط الأنشطة: النقاط = مجموع قيم الإعدادات والتونية للبنين فقط',/actPts\(\)/.test(adj)&&/request\.resource\.data\.pts == actPts\(\)/.test(adj)&&/section == 'boys' \|\| !\('tunic' in/.test(adj));
t('النقاط اليدوية تتطلب سببًا',/typedOrReasoned\(\)/.test(adj)&&/size\(\) > 0/.test(adj));
t('نقاط حضور QR الافتراضية 0 في القواعد',/cfgNum\('max', 0\)/.test(R));
process.exit(ok?0:1);
