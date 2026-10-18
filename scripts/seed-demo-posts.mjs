// Add examples through the normal local API, preserving all existing posts.
import {posts as examples} from '../src/lib/data.js';
const origin='http://localhost:3000';
const sessions={};
async function call(loginId,path,body) {
 const response=await fetch(`${origin}/api/${path}`,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:sessions[loginId]||''},body:body?JSON.stringify(body):undefined});
 const data=await response.json();
 if(!response.ok)throw Error(`${path}: ${data.error||response.status}`);
 const cookie=response.headers.get('set-cookie');if(cookie)sessions[loginId]=cookie.split(';')[0];
 return data;
}
for(const loginId of ['admin','subadmin','user1'])await call(loginId,'auth/login',{loginId,password:process.env.SEED_PASSWORD||'1234'});
try {
 const {posts}=await call('admin','bootstrap');
 for(const [board,items] of Object.entries(examples)) {
  let count=posts[board].length;
  const titles=new Set(posts[board].map(post=>post.title));
  for(const [index,item] of items.entries()) {
   if(count>=18)break;
   if(titles.has(item.title))continue;
   const loginId=board==='notice'?(index%2?'subadmin':'admin'):['user1','subadmin','admin'][index%3];
   await call(loginId,'posts',{board,category:item.category,title:item.title,content:item.content,bodyHtml:'',images:[],...(board==='notice'?{pinned:false}:{})});
   titles.add(item.title);count++;
  }
  console.log(`${board}: ${count} posts`);
 }
} finally {
 for(const loginId of Object.keys(sessions))await call(loginId,'auth/logout',{});
}
