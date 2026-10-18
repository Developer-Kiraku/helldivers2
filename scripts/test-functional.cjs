/* Runs against an isolated temporary JSON file. Requires npm run build first. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createHash, randomBytes } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const origin = `http://127.0.0.1:${process.env.TEST_PORT || 3150}`;
let server, output = '', passed = 0;
async function start(file) {
  output = '';
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', new URL(origin).port], {
    cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, JSON_DB_FILE: file, APP_ORIGIN: origin, COOKIE_SECURE: 'false', DEMO_AUTH_ENABLED: 'true', SEED_PASSWORD: '1234', KAKAO_REST_API_KEY: '', KAKAO_CLIENT_SECRET: '' },
  });
  server.stdout.on('data', chunk => { output += chunk }); server.stderr.on('data', chunk => { output += chunk });
  for (let i = 0; i < 200; i++) {
    if (server.exitCode !== null) throw Error(output);
    if (output.includes('Ready in')) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error(`Server timeout: ${output}`);
}
async function stop() { if (!server || server.exitCode !== null) return; const child = server; await new Promise(resolve => { child.once('exit', resolve); child.kill(); }); }
function client(cookie = '') {
  return { cookie, async call(url, method = 'GET', body, status = 200, extraHeaders = {}) {
    const headers = { Cookie: this.cookie, ...(!['GET', 'HEAD'].includes(method) ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...extraHeaders };
    if (headers.Origin === null) delete headers.Origin;
    const response = await fetch(origin + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const text = await response.text();
    assert.ok((Array.isArray(status) ? status : [status]).includes(response.status), `${method} ${url}: expected ${status}, got ${response.status}: ${text.slice(0, 400)}`); passed++;
    const cookie = response.headers.get('set-cookie'); if (cookie?.startsWith('hd_session=')) this.cookie = cookie.split(';')[0];
    let data; try { data = JSON.parse(text) } catch { data = text }
    return { data, response };
  }};
}
const draft = (board = 'talk', title = '기능 검증 글') => ({ board, title, category: board === 'notice' ? '공지' : board === 'guide' ? '무기' : board === 'qna' ? '질문' : '잡담', content: '임시 JSON에 저장되는 본문', bodyHtml: '<p>본문 <a href="https://example.com">링크</a><script>alert(1)</script><img src=x onerror=alert(1)></p>', images: [] });
async function run() {
  await fs.mkdir(path.join(root, 'work'), {recursive:true});
  const directory = await fs.mkdtemp(path.join(root, 'work', 'hd-functional-')); const file = path.join(directory, 'test-db.json');
  try {
    await start(file);
    const guest = client(), admin = client(), deputy = client(), member = client(), apprentice = client();
    for (const route of ['/', '/profile', '/boards/guide', '/boards/talk', '/admin/users', '/admin/requests', '/admin/approvals']) {
      const {response} = await guest.call(route, 'GET', undefined, 307); assert.equal(new URL(response.headers.get('location'), origin).pathname, '/login');
    }
    await guest.call('/login'); await guest.call('/signup'); await guest.call('/api/bootstrap', 'GET', undefined, 401); await guest.call('/api/admin/requests', 'GET', undefined, 401);
    await guest.call('/api/auth/login', 'POST', {loginId:'admin', password:'1234'}, 403, {Origin:null});
    await guest.call('/api/auth/login', 'POST', {loginId:'admin', password:'1234'}, 403, {Origin:'https://untrusted.example'});
    await guest.call('/api/auth/login', 'POST', {loginId:'admin', password:'wrong'}, 401);
    for (const [actor, loginId, nickname, role] of [[admin,'admin','라미아','operator'], [deputy,'subadmin','부운영자','deputy'], [member,'user1','헬다이버','member'], [apprentice,'user2','견습헬다이버','apprentice']]) {
      const {data,response} = await actor.call('/api/auth/login', 'POST', {loginId,password:'1234'});
      assert.equal(data.user.nickname,nickname);assert.equal(data.user.role,role);assert.ok(data.user.lastLoginAt);assert.ok(data.user.createdAt);assert.ok(!('passwordHash' in data.user));assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
      for (const route of ['/login','/signup']) { const r = await actor.call(route,'GET',undefined,307);assert.equal(new URL(r.response.headers.get('location'),origin).pathname,'/'); }
    }
    for (const route of ['/', '/profile', '/boards/notice', '/boards/guide', '/boards/talk', '/boards/guide/write', '/boards/qna', '/boards/qna/write']) await member.call(route);
    await admin.call('/admin/users'); await admin.call('/admin/requests','GET',undefined,307); await admin.call('/admin/approvals'); await deputy.call('/admin/users'); await deputy.call('/admin/requests','GET',undefined,307); await deputy.call('/admin/approvals'); await member.call('/admin/users','GET',undefined,307);await member.call('/admin/approvals','GET',undefined,307);
    await guest.call('/api/admin/approvals','GET',undefined,401);await member.call('/api/admin/approvals','GET',undefined,403);await apprentice.call('/api/admin/approvals','GET',undefined,403);
    for(const staff of [admin,deputy]){const pending=(await staff.call('/api/admin/approvals')).data.requests;assert.equal(pending.length,1);assert.equal(pending[0].type,'member_approval');assert.equal(pending[0].targetId,'u-user2');assert.equal(pending[0].canApprove,true);assert.equal(pending[0].canReject,false);}
    const operatorMembers=(await admin.call('/api/admin/users')).data.users;
    assert.equal(operatorMembers.find(u=>u.id==='u-admin').canExpel,false);assert.equal(operatorMembers.find(u=>u.id==='u-admin').canChangeRole,false);
    assert.equal(operatorMembers.find(u=>u.id==='u-subadmin').canExpel,true);assert.equal(operatorMembers.find(u=>u.id==='u-user1').canChangeRole,true);
    const deputyMembers=(await deputy.call('/api/admin/users')).data.users;
    assert.ok(deputyMembers.every(u=>!u.canExpel&&!u.canChangeRole));assert.ok(deputyMembers.filter(u=>['operator','deputy'].includes(u.role)).every(u=>!u.canRequestExpel));
    assert.ok(deputyMembers.filter(u=>['member','apprentice'].includes(u.role)).every(u=>u.canRequestExpel));
    await deputy.call('/api/admin/users/u-user1','PATCH',{role:'deputy'},403);await member.call('/api/admin/users','GET',undefined,403);
    await member.call('/api/posts','POST',draft('notice'),403);await apprentice.call('/api/posts','POST',draft('notice'),403);
    assert.equal((await member.call('/api/bootstrap')).data.posts.qna.length,18);
    const question=(await member.call('/api/posts','POST',draft('qna','장비 질문'))).data.post;
    await member.call('/boards/qna/'+question.id);await member.call('/boards/qna/'+question.id+'/edit');
    for(const board of ['talk','qna']){
      const item=board==='qna'?question:(await member.call('/api/posts','POST',draft('talk','목록 댓글 테스트'))).data.post;
      await guest.call('/api/posts/'+item.id+'/comments','POST',{body:'접근 차단 확인'},401);
      await member.call('/api/posts/'+item.id+'/comments','POST',{body:'   '},400);
      const answer=(await deputy.call('/api/posts/'+item.id+'/comments','POST',{body:'목록에서 작성한 답변'})).data.comment;
      const detail=(await member.call('/api/posts/'+item.id)).data;
      assert.equal(detail.comments.length,1);assert.equal(detail.comments[0].id,answer.id);assert.equal(detail.comments[0].body,'목록에서 작성한 답변');
      const listed=(await member.call('/api/bootstrap')).data.posts[board].find(p=>p.id===item.id);assert.equal(listed.comments,1);
    }
    await member.call('/api/posts/'+question.id,'PATCH',{...draft('qna'),title:'수정된 장비 질문'});
    const notice=(await deputy.call('/api/posts','POST',draft('notice'))).data.post;
    const pinnedNotice=(await admin.call('/api/posts','POST',{...draft('notice','상단 고정 검증'),pinned:true})).data.post;
    assert.equal(pinnedNotice.pinned,true);
    const normalNotice=(await deputy.call('/api/posts','POST',draft('notice','일반 공지 검증'))).data.post;
    assert.equal(normalNotice.pinned,false);
    let noticeList=(await member.call('/api/bootstrap')).data.posts.notice;
    assert.ok(noticeList.findIndex(p=>p.id===pinnedNotice.id)<noticeList.findIndex(p=>p.id===normalNotice.id));
    await admin.call(`/api/posts/${pinnedNotice.id}`,'PATCH',draft('notice','고정 유지 검증'));
    assert.equal((await admin.call(`/api/posts/${pinnedNotice.id}`)).data.post.pinned,true);
    await member.call(`/api/posts/${pinnedNotice.id}`,'PATCH',{...draft('notice'),pinned:false},403);
    await admin.call(`/api/posts/${pinnedNotice.id}`,'PATCH',{...draft('notice'),pinned:false});
    assert.equal((await admin.call(`/api/posts/${pinnedNotice.id}`)).data.post.pinned,false);
    await deputy.call(`/api/posts/${normalNotice.id}`,'PATCH',{...draft('notice'),pinned:true});
    assert.equal((await deputy.call(`/api/posts/${normalNotice.id}`)).data.post.pinned,true);
    await admin.call('/api/posts','POST',{...draft('notice'),pinned:'true'},400);
    await member.call('/api/posts','POST',{...draft('guide'),pinned:true},400);
    await admin.call(`/api/posts/${pinnedNotice.id}`,'DELETE',{});
    await deputy.call(`/api/posts/${normalNotice.id}`,'DELETE',{});

    const post=(await member.call('/api/posts','POST',draft())).data.post;
    const guide=(await apprentice.call('/api/posts','POST',draft('guide'))).data.post;
    assert.ok(!post.bodyHtml.includes('<script'));assert.ok(!post.bodyHtml.includes('onerror'));assert.match(post.bodyHtml,/noopener noreferrer/);
    await member.call(`/api/posts/${post.id}`,'PATCH',{...draft(),title:'수정된 글'});await apprentice.call(`/api/posts/${post.id}`,'PATCH',draft(),403);
    await deputy.call(`/api/posts/${post.id}`,'DELETE',{},403);await apprentice.call(`/api/posts/${post.id}`,'DELETE',{},403);
    await member.call('/api/posts','POST',{...draft(),category:'없는 분류'},400);await member.call('/api/posts','POST',{...draft(),images:Array(6).fill('/images/community-squad.png')},400);
    await member.call('/api/profile','PATCH',{nickname:'라미아'},409);await member.call('/api/profile','PATCH',{photo:'data:image/svg+xml;base64,abcd'},400);
    const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=';
    const profile=(await member.call('/api/profile','PATCH',{nickname:'테스트헬다이버',photo,role:'operator',loginId:'evil'})).data.user;
    assert.equal(profile.role,'member');assert.equal(profile.loginId,'user1');assert.equal(profile.photo,photo);
    const author=(await admin.call(`/api/posts/${post.id}`)).data.post;assert.equal(author.author,'테스트헬다이버');assert.equal(author.authorPhoto,photo);
    await member.call(`/api/posts/${post.id}/comments`,'POST',{body:'저장되는 댓글'});assert.ok((await member.call(`/api/posts/${post.id}`)).data.comments.some(c=>c.body==='저장되는 댓글'));
    for (const value of [1,1,-1]) await member.call(`/api/posts/${post.id}/vote`,'POST',{value});
    const voted=(await member.call(`/api/posts/${post.id}`)).data.post;assert.equal(voted.likes,0);assert.equal(voted.dislikes,1);assert.equal(voted.myVote,-1);
    // Polls keep ballots separate from recommendation votes and never expose anonymous identities.
    const pollDraft={question:'오늘의 작전 시간?',options:['21시','22시','23시'],multiple:false,anonymous:true,endsAt:null};
    for(const board of ['notice','guide','talk']){
      const actor=board==='notice'?admin:member;
      const item=(await actor.call('/api/posts','POST',{...draft(board),poll:pollDraft})).data.post;
      assert.equal(item.poll.options.length,3);assert.equal(item.content,draft(board).content);
    }
    for(const poll of [{...pollDraft,options:['하나']},{...pollDraft,options:['중복','중복']},{...pollDraft,endsAt:'bad'},{...pollDraft,endsAt:'2000-01-01T00:00:00Z'}])await member.call('/api/posts','POST',{...draft(),poll},400);
    const pollPost=(await member.call('/api/posts','POST',{...draft(),poll:pollDraft})).data.post;
    const pollUrl='/api/posts/'+pollPost.id+'/poll',optionIds=pollPost.poll.options.map(o=>o.id);
    await guest.call(pollUrl,'POST',{choices:[optionIds[0]]},401);
    await member.call(pollUrl,'POST',{choices:['fake']},400);await member.call(pollUrl,'POST',{choices:optionIds.slice(0,2)},400);
    await Promise.all([member.call(pollUrl,'POST',{choices:[optionIds[0]]}),client(member.cookie).call(pollUrl,'POST',{choices:[optionIds[0]]})]);
    let pollResult=(await admin.call('/api/posts/'+pollPost.id)).data.post.poll;
    assert.equal(pollResult.totalVoters,1);assert.equal(pollResult.options[0].count,1);assert.ok(!JSON.stringify(pollResult).includes('u-user1'));assert.ok(!('ballots' in pollResult));assert.ok(!('voters' in pollResult.options[0]));
    await member.call(pollUrl,'POST',{choices:[optionIds[1]]});await apprentice.call(pollUrl,'POST',{choices:[optionIds[2]]});
    await member.call('/api/posts/'+pollPost.id,'PATCH',{...draft(),poll:{...pollDraft,options:['교체','시도']}});
    pollResult=(await member.call('/api/posts/'+pollPost.id)).data.post.poll;assert.equal(pollResult.totalVoters,2);assert.equal(pollResult.options[0].count,0);assert.equal(pollResult.options[1].count,1);assert.deepEqual(pollResult.myChoices,[optionIds[1]]);
    await member.call(pollUrl,'POST',{choices:[]});assert.equal((await member.call('/api/posts/'+pollPost.id)).data.post.poll.totalVoters,1);
    await admin.call(pollUrl,'PATCH',{close:true},403);await member.call(pollUrl,'PATCH',{close:true});await member.call(pollUrl,'POST',{choices:[optionIds[0]]},409);
    const publicPoll=(await member.call('/api/posts','POST',{...draft('guide'),poll:{...pollDraft,multiple:true,anonymous:false}})).data.post;
    await member.call('/api/posts/'+publicPoll.id+'/poll','POST',{choices:publicPoll.poll.options.slice(0,2).map(o=>o.id)});
    pollResult=(await admin.call('/api/posts/'+publicPoll.id)).data.post.poll;assert.equal(pollResult.totalVoters,1);assert.equal(pollResult.options[0].count,1);assert.equal(pollResult.options[1].count,1);assert.deepEqual(pollResult.options[0].voters,['테스트헬다이버']);
    const scheduledPoll=(await member.call('/api/posts','POST',{...draft(),poll:{...pollDraft,endsAt:new Date(Date.now()+3600000).toISOString()}})).data.post;
    await member.call('/api/posts/'+scheduledPoll.id+'/poll','POST',{choices:[scheduledPoll.poll.options[0].id]});
    await member.call(pollUrl,'PATCH',{close:true},409);
    await member.call('/api/posts/'+publicPoll.id+'/poll','POST',{choices:[publicPoll.poll.options[0].id,publicPoll.poll.options[0].id]},400);
    const requests='/api/admin/requests';
    await member.call(requests,'POST',{type:'post_delete',targetId:guide.id,reason:'검토 요청'},403);await deputy.call(requests,'POST',{type:'post_delete',targetId:notice.id,reason:'검토 요청'},403);
    const req=(await deputy.call(requests,'POST',{type:'post_delete',targetId:post.id,reason:'게시글 검토'})).data.request;
    assert.ok((await admin.call('/api/admin/approvals')).data.requests.some(r=>r.id===req.id));assert.ok((await deputy.call('/api/admin/approvals')).data.requests.every(r=>r.type==='member_approval'));
    await deputy.call(requests,'POST',{type:'post_delete',targetId:post.id,reason:'중복 검토'},409);await member.call(requests,'GET',undefined,403);
    assert.ok((await admin.call(requests)).data.requests.some(r=>r.id===req.id));await deputy.call(`${requests}/${req.id}/review`,'POST',{decision:'approved'},403);
    await admin.call(`${requests}/${req.id}/review`,'POST',{decision:'approved',note:'삭제 승인'});await admin.call(`${requests}/${req.id}/review`,'POST',{decision:'approved'},409);await member.call(`/api/posts/${post.id}`,'GET',undefined,404);
    assert.equal((await admin.call('/api/admin/approvals')).data.requests.find(r=>r.id===req.id).status,'approved');
    const rejected=(await deputy.call(requests,'POST',{type:'post_delete',targetId:guide.id,reason:'거부 테스트'})).data.request;
    await admin.call(`${requests}/${rejected.id}/review`,'POST',{decision:'rejected',note:'유지'});await member.call(`/api/posts/${guide.id}`);
    const stale=(await deputy.call(requests,'POST',{type:'user_expel',targetId:'u-user1',reason:'등급 변경 검증'})).data.request;
    await admin.call('/api/admin/users/u-user1','PATCH',{role:'deputy'});await admin.call(`${requests}/${stale.id}/review`,'POST',{decision:'approved'},409);await admin.call(`${requests}/${stale.id}/review`,'POST',{decision:'rejected'});
    await admin.call('/api/admin/users/u-user1','PATCH',{role:'operator'},403);await admin.call('/api/admin/users/u-user1','PATCH',{role:'member'});
    await deputy.call('/api/admin/users/u-user2/expel','POST',{reason:'직접 강퇴 금지'},403);
    const expel=(await deputy.call(requests,'POST',{type:'user_expel',targetId:'u-user2',reason:'강퇴 승인 테스트'})).data.request;
    const results=await Promise.all([admin.call(`${requests}/${expel.id}/review`,'POST',{decision:'approved'},[200,409]),client(admin.cookie).call(`${requests}/${expel.id}/review`,'POST',{decision:'approved'},[200,409])]);
    assert.deepEqual(results.map(r=>r.response.status).sort(),[200,409]);await apprentice.call('/api/bootstrap','GET',undefined,401);await guest.call('/api/auth/login','POST',{loginId:'user2',password:'1234'},401);
    const expelled=(await admin.call('/api/admin/users')).data.users.find(u=>u.id==='u-user2');assert.equal(expelled.canExpel,false);assert.equal(expelled.canChangeRole,false);assert.equal(expelled.canApprove,false);
    await admin.call(`/api/posts/${notice.id}`,'DELETE',{});await deputy.call(`/api/posts/${notice.id}`,'GET',undefined,404);
    const own=(await member.call('/api/posts','POST',draft())).data.post;await member.call(`/api/posts/${own.id}`,'DELETE',{});
    const concurrent=await Promise.all(Array.from({length:5},(_,i)=>member.call('/api/posts','POST',draft('guide',`동시 저장 ${i}`))));
    let db=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(db.posts.filter(p=>p.title.startsWith('동시 저장')).length,5);assert.ok(db.users.every(u=>!u.passwordHash||u.passwordHash!=='1234'));assert.ok(db.sessions.every(s=>s.tokenHash!==admin.cookie.split('=')[1]));
    await stop();
    // Stand in for a completed Kakao provider exchange, only in the isolated test DB.
    const ticket=randomBytes(32).toString('hex');db=JSON.parse(await fs.readFile(file,'utf8'));
    db.posts.find(p=>p.id===scheduledPoll.id).poll.endsAt=new Date(Date.now()-1000).toISOString();
    db.pendingRegistrations=[{ticketHash:createHash('sha256').update(ticket).digest('hex'),kakaoId:'test-kakao-verified-1',expiresAt:new Date(Date.now()+600000).toISOString()}];await fs.writeFile(file,JSON.stringify(db));
    await start(file);assert.equal((await member.call('/api/posts/'+question.id)).data.comments[0].body,'목록에서 작성한 답변');assert.equal((await member.call('/api/bootstrap')).data.posts.qna.find(p=>p.id===question.id).title,'수정된 장비 질문');assert.equal((await admin.call('/api/posts/'+scheduledPoll.id)).data.post.poll.closed,true);await member.call('/api/posts/'+scheduledPoll.id+'/poll','POST',{choices:[]},409);assert.equal((await admin.call('/api/posts/'+pollPost.id)).data.post.poll.closed,true);assert.equal((await admin.call('/api/posts/'+publicPoll.id)).data.post.poll.totalVoters,1);await admin.call('/api/bootstrap');assert.equal((await member.call('/api/auth/me')).data.user.nickname,'테스트헬다이버');await member.call(`/api/posts/${concurrent[0].data.post.id}`);assert.equal((await admin.call(requests)).data.requests.find(r=>r.id===req.id).status,'approved');
    const signup=client(`hd_signup=${ticket}`);assert.equal((await signup.call('/api/auth/signup-info')).data.verified,true);
    await signup.call('/api/auth/register','POST',{nickname:'신입대원',agreements:{age:'true',terms:true,collect:true}},400);
    const registered=(await signup.call('/api/auth/register','POST',{nickname:'신입대원',role:'operator',agreements:{age:true,terms:true,collect:true}},201)).data.user;
    assert.equal(registered.role,'apprentice');assert.equal(registered.kakao.id,'test-kakao-verified-1');assert.equal(registered.probationStartedAt,registered.createdAt);assert.ok(Date.parse(registered.probationExpiresAt)>Date.parse(registered.createdAt));assert.equal(registered.approvedAt,null);await signup.call('/api/bootstrap');
    assert.ok((await deputy.call('/api/admin/approvals')).data.requests.some(r=>r.type==='member_approval'&&r.targetId===registered.id&&r.status==='pending'));
    await member.call(`/api/admin/users/${registered.id}/approve`,'POST',{},403);await deputy.call(`/api/admin/users/${registered.id}/approve`,'POST',{});
    for(const staff of [admin,deputy]){const approvals=(await staff.call('/api/admin/approvals')).data.requests;assert.ok(!approvals.some(r=>r.targetId===registered.id&&r.status==='pending'));assert.ok(approvals.some(r=>r.targetId===registered.id&&r.status==='approved'&&r.reviewerNickname==='부운영자'));}
    await client(`hd_signup=${ticket}`).call('/api/auth/register','POST',{nickname:'재사용검증',agreements:{age:true,terms:true,collect:true}},401);
    const second=client();await second.call('/api/auth/login','POST',{loginId:'user1',password:'1234'});await member.call('/api/profile','DELETE',{confirm:false},400);await member.call('/api/profile','DELETE',{confirm:true});await second.call('/api/bootstrap','GET',undefined,401);await guest.call('/api/auth/login','POST',{loginId:'user1',password:'1234'},401);
    assert.equal((await admin.call(`/api/posts/${concurrent[0].data.post.id}`)).data.post.author,'탈퇴한 회원');await admin.call('/api/profile','DELETE',{confirm:true},403);
    await admin.call('/api/admin/users/u-admin/expel','POST',{reason:'본인 강퇴 금지'},403);await admin.call('/api/admin/users/u-subadmin/expel','POST',{reason:'하위 부운영자 강퇴'});await deputy.call('/api/bootstrap','GET',undefined,401);
    await client('hd_session=tampered').call('/api/bootstrap','GET',undefined,401);
    await guest.call('/api/auth/register','POST',{nickname:'가입검증',agreements:{age:true,terms:true,collect:true}},401);
    assert.equal((await guest.call('/api/auth/signup-info')).data.verified,false);
    for (const url of ['/api/auth/kakao','/api/auth/kakao/callback?code=fake&state=fake']) { const result=await guest.call(url,'GET',undefined,307);assert.equal(new URL(result.response.headers.get('location'),origin).pathname,'/login'); }
    await admin.call('/api/auth/logout','POST');await admin.call('/api/bootstrap','GET',undefined,401);
    db=JSON.parse(await fs.readFile(file,'utf8'));assert.ok(db.audit.some(a=>a.action==='user.withdraw'));assert.equal(db.users.find(u=>u.id==='u-user1').passwordHash,null);
    console.log(`PASS: ${passed} HTTP assertions + field, persistence, sanitization, concurrency and session checks.`);
  } finally { await stop(); await fs.rm(directory,{recursive:true,force:true}); }
}
if(require.main===module)run().catch(error=>{console.error(error,output);process.exitCode=1});
module.exports={start,stop,client};
