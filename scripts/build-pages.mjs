import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const destination=path.join(root,'pages-dist');
if(path.relative(root,destination)!=='pages-dist')throw Error('Invalid preview output directory');
await fs.rm(destination,{recursive:true,force:true});await fs.mkdir(destination,{recursive:true});
const result=await build({absWorkingDir:root,entryPoints:['preview/main.jsx'],entryNames:'[name]-[hash]',outdir:destination,bundle:true,minify:true,jsx:'automatic',platform:'browser',format:'esm',target:['es2022'],metafile:true,define:{'process.env.NODE_ENV':'"production"'},alias:{'next/link':path.join(root,'preview/router.jsx'),'next/navigation':path.join(root,'preview/router.jsx')},plugins:[{name:'pages-preview',setup(plugin){
 plugin.onResolve({filter:/CommunityProvider$/},()=>({path:path.join(root,'preview/provider.jsx')}));
 plugin.onResolve({filter:/^\.\/images\//},({path:asset})=>({path:asset,external:true}));
 plugin.onLoad({filter:/\.(jsx|js|css)$/},async({path:filename})=>{if(!filename.startsWith(path.join(root,'src')))return;let contents=await fs.readFile(filename,'utf8');contents=contents.replace(/(["'])\/images\//g,'$1./images/');if(filename.endsWith('Shell.jsx'))contents=contents.replace('src={previewRoute}','src={`${location.pathname}#${previewRoute}`}');return {contents,loader:filename.endsWith('.css')?'css':'jsx'}});
}}]});
if(Object.keys(result.metafile.inputs).some(filename=>filename.replaceAll('\\','/').includes('src/lib/server/')))throw Error('Server code must not be published to Pages');
await fs.cp(path.join(root,'public/images'),path.join(destination,'images'),{recursive:true});
const [script,details]=Object.entries(result.metafile.outputs).find(([filename,output])=>filename.endsWith('.js')&&output.entryPoint==='preview/main.jsx');
await fs.writeFile(path.join(destination,'index.html'),`<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>헬다이버즈2 커뮤니티 · 디자인 미리보기</title><link rel="stylesheet" href="./${path.basename(details.cssBundle)}"></head><body><div id="root"></div><script type="module" src="./${path.basename(script)}"></script></body></html>`);
await fs.writeFile(path.join(destination,'.nojekyll'),'');
console.log('Read-only Pages preview built in pages-dist. Server code and live data excluded.');
