import {build} from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
const stub=new URL('./stubs/firebase.js',import.meta.url).pathname;
await build({stdin:{contents:`export {normAudio,okUrl,nz} from '/home/claude/work/proj/src/ext/hymns.js';export {verCmp} from '/home/claude/work/proj/src/ext/tools.js'`,resolveDir:'.',loader:'js'},bundle:true,format:'esm',outfile:'u.mjs',plugins:[{name:'s',setup(b){b.onResolve({filter:/^firebase\//},()=>({path:stub}))}}],logLevel:'error'});
globalThis.window=globalThis;
const m=await import('./u.mjs');let ok=true;const t=(n,a,b)=>{const g=JSON.stringify(a)===JSON.stringify(b);if(!g)ok=false;console.log(g?'PASS':'FAIL',n,g?'':JSON.stringify(a))};
t('drive',m.normAudio('https://drive.google.com/file/d/ABC123/view?usp=sharing'),'https://docs.google.com/uc?export=download&id=ABC123');
t('drive id=',m.normAudio('https://drive.google.com/open?id=XYZ'),'https://docs.google.com/uc?export=download&id=XYZ');
t('dropbox',m.normAudio('https://www.dropbox.com/s/abc/a.mp3?dl=0'),'https://dl.dropboxusercontent.com/s/abc/a.mp3?raw=1');
t('direct',m.normAudio('https://x.com/a.mp3'),'https://x.com/a.mp3');
t('okUrl',[m.okUrl(''),m.okUrl('https://a.b'),m.okUrl('http://a.b'),m.okUrl('javascript:alert(1)')],[true,true,false,false]);
t('nz',m.nz('يَا رَبِّي أُحِبُّكَ'),m.nz('يا ربي احبك'));
t('ver',[m.verCmp('4.1','4.0.0'),m.verCmp('4.0.0','4.0'),m.verCmp('3.9','4.0.0'),m.verCmp('4.10','4.9')],[1,0,-1,1]);
process.exit(ok?0:1)
