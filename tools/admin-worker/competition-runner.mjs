import admin from 'firebase-admin';
import {processCompetitionRequests,gradeCompetitionAttempts,revealEndedAnswers} from './competitions.mjs';
const raw=process.env.FIREBASE_SERVICE_ACCOUNT;
if(!raw){console.log('::warning::FIREBASE_SERVICE_ACCOUNT غير مضبوط.');process.exit(0)}
let sa;try{sa=JSON.parse(raw)}catch{console.error('::error::FIREBASE_SERVICE_ACCOUNT ليس JSON صالحًا');process.exit(1)}
if(!process.env.FIREBASE_PROJECT_ID||sa.project_id!==process.env.FIREBASE_PROJECT_ID){console.error('::error::مفتاح مشروع Firebase غير صحيح');process.exit(1)}
admin.initializeApp({credential:admin.credential.cert(sa)});
const db=admin.firestore();
await processCompetitionRequests(db);
await gradeCompetitionAttempts(db);
await revealEndedAnswers(db);
