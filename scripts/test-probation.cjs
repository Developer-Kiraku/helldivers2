const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const {start,stop,client}=require('./test-functional.cjs');
const root=path.resolve(__dirname,'..');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run(){
 const {probationDeadline,settleProbation,startProbation}=await import(pathToFileURL(path.join(root,'src/lib/server/probation.mjs')));
 assert.equal(probationDeadline('2026-01-31T03:00:00.000Z'),'2026-02-28T03:00:00.000Z');
 assert.equal(probationDeadline('2028-01-31T03:00:00.000Z'),'2028-02-29T03:00:00.000Z');
 assert.equal(probationDeadline('2026-12-31T15:30:00.000Z'),'2027-01-31T15:30:00.000Z'); // Jan 1 -> Feb 1 KST
 assert.equal(probationDeadline('2026-03-30T16:00:00.000Z'),'2026-04-29T16:00:00.000Z'); // Mar 31 -> Apr 30 KST
 const boundary={id:'boundary',role:'apprentice',status:'active',createdAt:'2026-01-31T03:00:00.000Z'};
 startProbation(boundary);const unit={users:[boundary,{...boundary,id:'member',role:'member'}],sessions:[{userId:'boundary'},{userId:'member'}],audit:[]};
 assert.equal(settleProbation(unit,'2026-02-28T02:59:59.999Z'),false);
 assert.equal(settleProbation(unit,'2026-02-28T03:00:00.000Z'),true);assert.equal(boundary.status,'withdrawn');assert.equal(unit.users[1].status,'active');assert.deepEqual(unit.sessions,[{userId:'member'}]);assert.equal(unit.audit.length,1);assert.equal(settleProbation(unit,'2026-03-01T00:00:00.000Z'),false);
 await fs.mkdir(path.join(root,'work'),{recursive:true});const directory=await fs.mkdtemp(path.join(root,'work','hd-probation-'));const file=path.join(directory,'db.json');
 try{
  await start(file);const admin=client(),deputy=client(),member=client(),apprentice=client();
  for(const [actor,loginId]of[[admin,'admin'],[deputy,'subadmin'],[member,'user1'],[apprentice,'user2']])await actor.call('/api/auth/login','POST',{loginId,password:'1234'});
  const pending=(await deputy.call('/api/admin/users')).data.users.find(u=>u.id==='u-user2');assert.equal(pending.canApprove,true);assert.equal(pending.probationExpiresAt,probationDeadline(pending.createdAt));
  await member.call('/api/admin/users/u-user2/approve','POST',{},403);await apprentice.call('/api/admin/users/u-user2/approve','POST',{},403);
  const approved=(await deputy.call('/api/admin/users/u-user2/approve','POST',{})).data.user;assert.equal(approved.role,'member');assert.ok(!('approvedBy' in approved));assert.ok(approved.approvedAt);
  assert.equal(JSON.parse(await fs.readFile(file,'utf8')).users.find(user=>user.id==='u-user2').approvedBy,'u-subadmin');
  await deputy.call('/api/admin/users/u-user2/approve','POST',{},409);assert.equal((await apprentice.call('/api/auth/me')).data.user.role,'member');
  await admin.call('/api/admin/users/u-user2','PATCH',{role:'apprentice'});const renewed=(await apprentice.call('/api/auth/me')).data.user;assert.equal(renewed.approvedAt,null);assert.equal(renewed.probationExpiresAt,probationDeadline(renewed.probationStartedAt));
  await admin.call('/api/admin/users/u-user2/approve','POST',{});await stop();
  let db=JSON.parse(await fs.readFile(file,'utf8'));const template=db.users.find(u=>u.id==='u-user1');const at=new Date().toISOString();
  const legacy={...template,id:'p-legacy',nickname:'만료견습',loginId:'legacy',role:'apprentice',createdAt:new Date(Date.now()-45*86400000).toISOString()};delete legacy.probationExpiresAt;delete legacy.approvedAt;
  const idle={...template,id:'p-idle',nickname:'자동견습',loginId:'idle',role:'apprentice',createdAt:at,probationStartedAt:at,probationExpiresAt:new Date(Date.now()+3000).toISOString(),approvedAt:null,approvedBy:null,kakao:{id:'idle-kakao'}};
  const approvedPast={...template,id:'p-approved',nickname:'승인회원',loginId:'approved',role:'member',probationExpiresAt:new Date(Date.now()-86400000).toISOString(),approvedAt:at,approvedBy:'u-admin'};
  db.users.push(legacy,idle,approvedPast);db.sessions.push(...['p-legacy','p-idle'].map(userId=>({userId,tokenHash:createHash('sha256').update(userId).digest('hex'),expiresAt:new Date(Date.now()+86400000).toISOString()})));await fs.writeFile(file,JSON.stringify(db));
  await start(file);
  // Next logs Ready before its config/instrumentation initialization completes.
  for(let i=0;i<50;i++){db=JSON.parse(await fs.readFile(file,'utf8'));if(db.users.find(u=>u.id==='p-legacy').status==='withdrawn')break;await sleep(100)}
  assert.equal(db.users.find(u=>u.id==='p-legacy').status,'withdrawn');
  console.log('Startup expiry passed. Waiting for the minute worker without sending HTTP requests...');
  const until=Date.now()+70000;while(Date.now()<until){db=JSON.parse(await fs.readFile(file,'utf8'));if(db.users.find(u=>u.id==='p-idle').status==='withdrawn')break;await sleep(500)}
  const expired=db.users.find(u=>u.id==='p-idle');assert.equal(expired.status,'withdrawn');assert.equal(expired.kakao,null);assert.equal(expired.loginId,null);assert.equal(expired.passwordHash,null);assert.equal(expired.withdrawalReason,'probation_expired');assert.ok(!db.sessions.some(s=>s.userId==='p-idle'));assert.equal(db.audit.filter(a=>a.targetId==='p-idle'&&a.action==='user.withdraw.probation_expired').length,1);assert.equal(db.users.find(u=>u.id==='p-approved').status,'active');
  await client('hd_session=p-idle').call('/api/bootstrap','GET',undefined,401);await deputy.call('/api/admin/users/p-idle/approve','POST',{},404);
  await stop();db=JSON.parse(await fs.readFile(file,'utf8'));const requestExpiry={...template,id:'p-request',nickname:'요청만료',loginId:'expired-request',role:'apprentice',createdAt:at,probationStartedAt:at,probationExpiresAt:new Date(Date.now()+4000).toISOString(),approvedAt:null,approvedBy:null};db.users.push(requestExpiry);db.sessions.push({userId:'p-request',tokenHash:createHash('sha256').update('request-expired-token').digest('hex'),expiresAt:new Date(Date.now()+86400000).toISOString()});await fs.writeFile(file,JSON.stringify(db));
  await start(file);await sleep(4200);await client('hd_session=request-expired-token').call('/api/bootstrap','GET',undefined,401);
  db=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(db.users.find(u=>u.id==='p-request').status,'withdrawn');assert.ok(!db.sessions.some(s=>s.userId==='p-request'));
  await deputy.call('/api/admin/users/p-request/approve','POST',{},404);
  assert.equal((await apprentice.call('/api/auth/me')).data.user.role,'member');
  console.log('PASS: calendar-month boundaries, approval permissions, renewal, legacy migration, idle worker, expiry on rejected requests, session revocation and approved-member retention.');
 }finally{await stop();await fs.rm(directory,{recursive:true,force:true})}
}
run().catch(error=>{console.error(error);process.exitCode=1});
