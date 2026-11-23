// يتحقق أن src/firebase-config.json مملوء (لا يختلق بيانات). الاستخدام: npm run check-config
import fs from 'fs';
const p=new URL('../src/firebase-config.json',import.meta.url);
const c=JSON.parse(fs.readFileSync(p,'utf8'));
const need=['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'];
const miss=need.filter(k=>!c[k]);
if(miss.length){console.error('✗ ناقص في src/firebase-config.json: '+miss.join(', ')+'\n  راجع FIREBASE-SETUP-AR.md');process.exit(1)}
console.log('✓ إعداد Firebase مكتمل للمشروع: '+c.projectId);
