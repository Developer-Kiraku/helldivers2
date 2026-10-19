import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createPool} from '../src/lib/server/postgres.mjs';
import harness from './test-functional.cjs';
const url=new URL(process.env.DATABASE_URL),schema=`hd_api_${randomBytes(6).toString('hex')}`;
const adminPool=createPool(url.href);
await adminPool.query(`CREATE SCHEMA ${schema}`);
url.searchParams.set('options',`-c search_path=${schema}`);
process.env.DATABASE_URL=url.href;
try {
 await harness.start('work/postgres-http-unused.json',{databaseUrl:url.href});
 const admin=harness.client(),member=harness.client();
 assert.equal((await member.call('/api/health')).data.storage,'postgresql');
 await member.call('/api/bootstrap','GET',undefined,401);
 await admin.call('/api/auth/login','POST',{loginId:'admin',password:'1234'});
 await member.call('/api/auth/login','POST',{loginId:'user1',password:'1234'});
 const bootstrap=(await member.call('/api/bootstrap')).data;
 for(const board of ['notice','guide','talk','qna'])assert.equal(bootstrap.posts[board].length,18);
 const post=(await member.call('/api/posts','POST',{board:'qna',category:'질문',title:'PostgreSQL API 검증',content:'DB에 저장되는 본문',bodyHtml:'',images:[],poll:{question:'확인',options:['찬성','반대']}})).data.post;
 await admin.call(`/api/posts/${post.id}/poll`,'POST',{choices:[post.poll.options[0].id]});
 await admin.call(`/api/posts/${post.id}/comments`,'POST',{body:'PostgreSQL 댓글'});
 await admin.call('/api/admin/users/u-user2/approve','POST',{});
 await harness.stop();await harness.start('work/postgres-http-unused.json',{databaseUrl:url.href});
 const persisted=(await member.call(`/api/posts/${post.id}`)).data;
 assert.equal(persisted.comments[0].body,'PostgreSQL 댓글');
 assert.equal(persisted.post.poll.totalVoters,1);
 assert.equal((await admin.call('/api/admin/users')).data.users.find(user=>user.id==='u-user2').role,'member');
 await member.call('/api/auth/logout','POST',{});
 await member.call('/api/bootstrap','GET',undefined,401);
 console.log('PASS: PostgreSQL HTTP health, authentication, 18-post boards, posting, polls, comments, approval, session restart persistence and logout');
}finally {
 await harness.stop();await adminPool.query(`DROP SCHEMA ${schema} CASCADE`);await adminPool.end();
}
