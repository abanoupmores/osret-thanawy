// in-memory Firebase stub (للاختبار فقط)
const DB=window.__DB=window.__DB||{};let seq=0;
const clone=o=>JSON.parse(JSON.stringify(o));
class Ref{constructor(path){this.path=path;const p=path.split('/');this.col=p[0];this.id=p[1]}}
const doc=(a,c,i)=>{if(a instanceof ColRef)return new Ref(a.col+'/'+(c||('auto'+(++seq)+Math.random().toString(36).slice(2,6))));return new Ref(c+'/'+i)};
class ColRef{constructor(c){this.col=c}}
const collection=(d,c)=>new ColRef(c);
const where=(f,o,v)=>({t:'w',f,o,v}),orderBy=(f,d)=>({t:'o',f,d}),limit=n=>({t:'l',n});
const query=(c,...cs)=>({col:c.col,cs});
const listeners=[];
const get=(col)=>Object.entries(DB[col]||{}).map(([id,d])=>({id,d}));
function run(q){let rows=get(q.col);const cs=q.cs||[];
 cs.filter(c=>c.t==='w').forEach(c=>{rows=rows.filter(r=>{const x=r.d[c.f];if(c.o==='==')return x===c.v;if(c.o==='in')return c.v.includes(x);return true})});
 cs.filter(c=>c.t==='o').forEach(c=>{rows.sort((a,b)=>(a.d[c.f]>b.d[c.f]?1:-1)*(c.d==='desc'?-1:1))});
 const l=cs.find(c=>c.t==='l');if(l)rows=rows.slice(0,l.n);return rows}
const snapDocs=rows=>({docs:rows.map(r=>({id:r.id,data:()=>clone(r.d)})),docChanges:()=>rows.map(r=>({type:'added',doc:{data:()=>clone(r.d)}}))});
function notify(){listeners.slice().forEach(l=>l())}
const onSnapshot=(t,cb,err)=>{
 const f=()=>{if(t instanceof Ref){const d=(DB[t.col]||{})[t.id];cb({exists:()=>!!d,data:()=>d?clone(d):undefined,id:t.id})}else cb(snapDocs(run(t)))};
 const l=()=>setTimeout(f,0);listeners.push(l);setTimeout(f,0);return ()=>{const i=listeners.indexOf(l);if(i>=0)listeners.splice(i,1)}};
const getDoc=async r=>{const d=(DB[r.col]||{})[r.id];return{exists:()=>!!d,data:()=>d?clone(d):undefined,id:r.id}};
const INC=n=>({__inc:n}),DEL={__del:1};
const apply=(old,patch,merge)=>{const o=merge?{...old}:{};for(const k in patch){const v=patch[k];if(v&&v.__inc!==undefined)o[k]=(+old[k]||0)+v.__inc;else if(v&&v.__del)delete o[k];else o[k]=clone({x:v}).x}return o};
const FAIL=()=>window.__failWrites&&window.__failWrites();
const setDoc=async(r,d,opt)=>{if(FAIL())throw{code:'permission-denied'};(DB[r.col]=DB[r.col]||{});DB[r.col][r.id]=apply(DB[r.col][r.id]||{},d,opt&&opt.merge);notify()};
const updateDoc=async(r,d)=>{if(FAIL())throw{code:'permission-denied'};const o=(DB[r.col]||{})[r.id];if(!o)throw{code:'not-found'};DB[r.col][r.id]=apply(o,d,true);notify()};
const addDoc=async(c,d)=>{const r=doc(c);await setDoc(r,d);return r};
const deleteDoc=async r=>{if(FAIL())throw{code:'permission-denied'};delete (DB[r.col]||{})[r.id];notify()};
const writeBatch=()=>{const ops=[];return{set:(r,d,o)=>ops.push(()=>{(DB[r.col]=DB[r.col]||{});DB[r.col][r.id]=apply(DB[r.col][r.id]||{},d,o&&o.merge)}),update:(r,d)=>ops.push(()=>{const o=(DB[r.col]||{})[r.id];if(!o)throw{code:'not-found'};DB[r.col][r.id]=apply(o,d,true)}),delete:r=>ops.push(()=>{delete (DB[r.col]||{})[r.id]}),commit:async()=>{if(FAIL())throw{code:'permission-denied'};const snap=clone(DB);try{ops.forEach(f=>f())}catch(e){Object.keys(DB).forEach(k=>delete DB[k]);Object.assign(DB,snap);throw e}notify()}}};
const getDocs=async q=>snapDocs(run(q)),startAfter=()=>({t:'s'}),serverTimestamp=()=>Date.now();
const runTransaction=async(d,fn)=>{const snap=clone(DB),ops=[];
 const tx={get:async r=>getDoc(r),set:(r,x)=>ops.push(()=>{(DB[r.col]=DB[r.col]||{});DB[r.col][r.id]=apply({},x,false)}),
  update:(r,x)=>ops.push(()=>{const o=(DB[r.col]||{})[r.id];if(!o)throw{code:'not-found'};DB[r.col][r.id]=apply(o,x,true)}),
  delete:r=>ops.push(()=>{delete (DB[r.col]||{})[r.id]})};
 const out=await fn(tx);try{ops.forEach(f=>f())}catch(e){Object.keys(DB).forEach(k=>delete DB[k]);Object.assign(DB,snap);throw e}notify();return out};
export {doc,collection,query,orderBy,limit,where,onSnapshot,getDoc,setDoc,updateDoc,addDoc,deleteDoc,writeBatch,getDocs,startAfter,serverTimestamp,runTransaction};
export const updatePassword=async()=>{},deleteUser=async()=>{},sendPasswordResetEmail=async()=>{};
export const increment=INC,deleteField=()=>DEL,getFirestore=()=>({}),initializeApp=()=>({});
let acb=null;window.__login=uid=>{window.__cur=uid?{uid,email:uid+'@t'}:null;acb&&acb(window.__cur)};
export const getAuth=()=>({get currentUser(){return window.__cur}}),onAuthStateChanged=(a,cb)=>{acb=cb;setTimeout(()=>cb(window.__cur||null),0)},signOut=async()=>{window.__cur=null;acb&&acb(null)},createUserWithEmailAndPassword=async()=>{},signInWithEmailAndPassword=async()=>{};
export const getStorage=()=>({}),ref=()=>({}),uploadBytesResumable=()=>{throw{code:'storage/bucket-not-found'}},getDownloadURL=async()=>'',deleteObject=async()=>{};
export const Capacitor={isNativePlatform:()=>false},LocalNotifications={},Share={},Filesystem={},Directory={Cache:'CACHE'},registerPlugin=()=>({});
export default {toDataURL:async t=>'data:image/png;base64,iVBORw0KGgo='};
export class Html5Qrcode{}
