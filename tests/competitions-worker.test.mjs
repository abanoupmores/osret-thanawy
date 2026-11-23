import {processCompetitionRequests,gradeCompetitionAttempts,revealEndedAnswers} from '../tools/admin-worker/competitions.mjs';
import assert from 'node:assert/strict';
class Snap{constructor(ref,data){this.ref=ref;this.exists=!!data;this._data=data}data(){return this._data}}
class Ref{constructor(db,path){this.db=db;this.path=path;this.id=path.split('/').at(-1)}async get(){return new Snap(this,this.db.data.get(this.path))}async update(v){const old=this.db.data.get(this.path);if(!old)throw Error('missing '+this.path);this.db.data.set(this.path,{...old,...v})}}
class Query{constructor(db,col,filters=[],lim=1000){this.db=db;this.col=col;this.filters=filters;this.lim=lim}where(k,op,v){return new Query(this.db,this.col,[...this.filters,[k,op,v]],this.lim)}limit(n){return new Query(this.db,this.col,this.filters,n)}async get(){const docs=[];for(const [p,v] of this.db.data){if(!p.startsWith(this.col+'/'))continue;if(this.filters.every(([k,op,x])=>op==='=='&&v[k]===x))docs.push(new Snap(new Ref(this.db,p),v));if(docs.length>=this.lim)break}return{docs,size:docs.length}}}
class DB{constructor(){this.data=new Map()}doc(p){return new Ref(this,p)}collection(c){return new Query(this,c)}async runTransaction(fn){const writes=[];const tx={get:async r=>r.get(),create:(r,v)=>writes.push(['create',r,v]),set:(r,v,opt)=>writes.push(['set',r,v,opt]),update:(r,v)=>writes.push(['update',r,v])};await fn(tx);for(const [op,r,v,opt] of writes){const old=this.data.get(r.path);if(op==='create'){if(old)throw Error('already exists');this.data.set(r.path,v)}else if(op==='set')this.data.set(r.path,opt?.merge?{...(old||{}),...v}:v);else{if(!old)throw Error('missing '+r.path);this.data.set(r.path,{...old,...v})}}}}
const db=new DB(),now=Date.now(),comp='c1',member='m1',uid='u1';
db.data.set('users/s1',{role:'servant',section:'boys',status:'active'});db.data.set('users/sg',{role:'servant',section:'girls',status:'active'});
db.data.set('members/m1',{uid,section:'boys',name:'مينا',points:10});
db.data.set('competitionRequests/c1',{action:'create',competitionId:comp,title:'اختبار',description:'',section:'boys',startsAt:now-60000,endsAt:now+60000,durationMin:0,isPublished:true,questions:[{id:'q1',type:'mcq',text:'السؤال؟',options:['أ','ب'],points:3}],answers:{q1:{type:'mcq',answer:1}},requestedBy:'s1',requestedByName:'خادم',status:'pending',createdAt:now});
await processCompetitionRequests(db);
const pub=db.data.get('competitions/c1');assert.ok(pub);assert.equal('answers' in pub,false);assert.equal(pub.isActive,true);assert.equal(db.data.get('secrets/competition_answers_c1').answers.q1.answer,1);
db.data.set('competitionAttempts/c1_m1',{competitionId:comp,memberId:member,memberUid:uid,memberName:'اسم مزور',section:'boys',answers:{q1:1},status:'pending',submittedAt:{toMillis:()=>now},createdAt:now});
await gradeCompetitionAttempts(db);
assert.equal(db.data.get('competitionAttempts/c1_m1').status,'graded');assert.equal('correct' in db.data.get('competitionAttempts/c1_m1').breakdown.q1,false,'correct answer stays hidden before competition ends');assert.equal(db.data.get('competitionAttempts/c1_m1').memberName,'مينا');assert.equal(db.data.get('members/m1').points,13);assert.equal(db.data.get('adjustments/competition_c1_m1').pts,3);assert.equal(db.data.get('competitionLeaderboard/c1_m1').pointsAwarded,3);
await gradeCompetitionAttempts(db);assert.equal(db.data.get('members/m1').points,13,'must not award twice');
pub.endsAt=now-1000;db.data.set('competitions/c1',pub);db.data.set('competitionAttempts/c1_m1',{...db.data.get('competitionAttempts/c1_m1'),showAnswers:false});await revealEndedAnswers(db);assert.equal(db.data.get('competitionAttempts/c1_m1').showAnswers,true);assert.equal(db.data.get('competitionAttempts/c1_m1').breakdown.q1.correct,'ب');
console.log('PASS competition request hides answer key');console.log('PASS grading awards points once and trusts member record');console.log('PASS leaderboard and answer reveal');

// خادمة بنات تحاول إنشاء مسابقة لقسم البنين => يجب أن تفشل (Admin SDK يتجاوز القواعد فالتحقق داخل الكود)
db.data.set('competitionRequests/c2',{...db.data.get('competitionRequests/c1'),competitionId:'c9',requestedBy:'sg',status:'pending'});
await processCompetitionRequests(db);
assert.notEqual(db.data.get('competitionRequests/c2').status,'done');assert.equal(db.data.has('competitions/c9'),false);
console.log('PASS cross-section competition request is rejected');
