import {build} from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
const stub=new URL('./stubs/firebase.js',import.meta.url).pathname;
await build({entryPoints:['__ROOT__/src/main.js'],bundle:true,outfile:'/home/claude/work/test/www/app.js',format:'iife',
 plugins:[{name:'stub',setup(b){b.onResolve({filter:/^(firebase\/|qrcode$|html5-qrcode$|@capacitor\/)/},()=>({path:stub}))}}],logLevel:'error'});
console.log('bundle ok');
