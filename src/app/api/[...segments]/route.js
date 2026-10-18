import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { transaction, readStore, audit } from '@/lib/server/store';
import { config } from '@/lib/server/config';
import { fail, AppError, requireUser, userForToken, publicUser, createSession, setSessionCookie, clearSessionCookie, verifyOrigin } from '@/lib/server/auth';
import { tokenHash, verifyPassword, hashPassword } from '@/lib/server/passwords';
import { now, cleanPost, validateNickname, validImage, postForId, memberForId, canDeletePost, canRequest, serializePost, serializeComment } from '@/lib/server/community';
import { roleLabels, outranks, isStaff, memberCapabilities } from '@/lib/roles';
import { approveApprentice, startProbation, withdrawMember } from '@/lib/server/probation.mjs';
import { approvalList } from '@/lib/approvals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const attempts = globalThis.__hdLoginAttempts ||= new Map();
const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
async function body(request) {
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 13000000) fail(413, '요청 크기가 너무 큽니다.');
  try { return raw ? JSON.parse(raw) : {}; } catch { fail(400, '올바른 JSON 요청이 필요합니다.'); }
}
function safeReason(value) { const reason = typeof value === 'string' ? value.trim() : ''; if (reason.length < 2 || reason.length > 1000) fail(400, '사유를 2~1,000자로 입력해주세요.'); return reason; }
function bootstrap(db, actor) {
  return { user: publicUser(actor), posts: Object.fromEntries(['notice','guide','talk'].map(board => [board, db.posts.filter(post => post.board === board && !post.deletedAt).sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)).map(post => serializePost(db, post, actor))])), stats: { totalMembers: db.users.filter(user => user.status === 'active').length, onlineMembers: new Set(db.sessions.filter(session => Date.parse(session.expiresAt) > Date.now() && db.users.some(user => user.id === session.userId && user.status === 'active')).map(session => session.userId)).size } };
}

async function handler(request, context) {
  try {
    const { segments } = await context.params; const path = segments.join('/'); const method = request.method;
    if (!['GET','HEAD'].includes(method)) verifyOrigin(request);
    const token = request.cookies.get(config.cookie)?.value;
    if (path === 'auth/login' && method === 'POST') {
      if (!config.demoAuth) fail(403, '임시 계정 로그인이 비활성화되어 있습니다. 카카오로 로그인해주세요.');
      const input = await body(request); if (typeof input.loginId !== 'string' || input.loginId.length > 100 || typeof input.password !== 'string' || input.password.length > 256) fail(400, '아이디와 비밀번호를 확인해주세요.');
      const key = `${request.headers.get('x-forwarded-for') || 'local'}:${input.loginId}`; const attempt = attempts.get(key);
      if (attempt && attempt.count >= 8 && Date.now() - attempt.started < 60000) fail(429, '로그인 시도가 많습니다. 잠시 후 다시 시도해주세요.');
      const result = await transaction(db => {
        const user = db.users.find(user => user.loginId === input.loginId && user.status === 'active');
        if (!user || !verifyPassword(input.password, user.passwordHash)) return null;
        const newToken = createSession(db, user); audit(db, user.id, 'login', user.id); return { token: newToken, user: publicUser(user) };
      });
      if (!result) { const current = attempt && Date.now()-attempt.started<60000 ? attempt : { count:0,started:Date.now() }; attempts.set(key,{...current,count:current.count+1});fail(401, '아이디 또는 비밀번호가 올바르지 않습니다.'); }
      attempts.delete(key);const response = json({ user: result.user });setSessionCookie(response,result.token);return response;
    }
    if (path === 'auth/logout' && method === 'POST') {
      await transaction(db => { db.sessions = db.sessions.filter(session => !token || session.tokenHash !== tokenHash(token)); });
      const response = json({ ok:true });clearSessionCookie(response);return response;
    }
    if (path === 'auth/me' && method === 'GET') return readStore(db => json({ user: publicUser(userForToken(db,token)), demoAuthEnabled:config.demoAuth, kakaoConfigured:Boolean(config.kakaoClientId && config.kakaoRedirectUri) }));
    const input = method === 'GET' ? {} : await body(request);
    const result = await transaction(db => {
      const actor = requireUser(db,token);
      if (path === 'bootstrap' && method === 'GET') return bootstrap(db,actor);
      if (path === 'profile' && method === 'PATCH') {
        if (input.nickname !== undefined) actor.nickname = validateNickname(input.nickname,db,actor.id);
        if (input.photo !== undefined) actor.photo = validImage(input.photo);
        actor.updatedAt=now();audit(db,actor.id,'profile.update',actor.id);return {user:publicUser(actor)};
      }
      if (path === 'profile' && method === 'DELETE') {
        if (actor.role==='operator') fail(403,'메인 운영자는 직접 탈퇴할 수 없습니다. 운영권 이전 후 처리해주세요.');
        if(input.confirm!==true) fail(400,'탈퇴 확인이 필요합니다.');
        withdrawMember(db,actor,'self');audit(db,actor.id,'user.withdraw',actor.id);return {ok:true};
      }
      if(path==='posts'&&method==='POST'){
        const board=input.board;if(board==='notice'&&!isStaff(actor.role))fail(403,'공지사항은 운영진만 작성할 수 있습니다.');
        const clean=cleanPost(input,board),post={...clean,id:randomUUID(),board,authorId:actor.id,pinned:clean.pinned ?? false,views:0,createdAt:now(),updatedAt:now(),deletedAt:null};db.posts.unshift(post);audit(db,actor.id,'post.create',post.id);return {post:serializePost(db,post,actor)};
      }
      if(segments[0]==='posts'&&segments[1]){
        const post=postForId(db,segments[1]);const author=db.users.find(user=>user.id===post.authorId);
        if(segments.length===2&&method==='GET')return {post:serializePost(db,post,actor),comments:db.comments.filter(comment=>comment.postId===post.id&&!comment.deletedAt).map(comment=>serializeComment(db,comment,actor))};
        if(segments.length===2&&method==='PATCH'){
          if(actor.id!==post.authorId)fail(403,'본인이 작성한 게시글만 수정할 수 있습니다.');
          if(post.board==='notice'&&!isStaff(actor.role))fail(403,'공지사항 수정 권한이 없습니다.');
          Object.assign(post,cleanPost(input,post.board),{updatedAt:now()});audit(db,actor.id,'post.update',post.id);return {post:serializePost(db,post,actor)};
        }
        if(segments.length===2&&method==='DELETE'){
          if(!canDeletePost(actor,author))fail(403,'게시글을 삭제할 권한이 없습니다.');
          post.deletedAt=now();audit(db,actor.id,'post.delete',post.id,{reason:typeof input.reason==='string'?input.reason.slice(0,1000):'직접 삭제'});return {ok:true};
        }
        if(segments[2]==='comments'&&segments.length===3&&method==='POST'){
          const text=typeof input.body==='string'?input.body.trim():'';if(!text||text.length>1000)fail(400,'댓글은 1~1,000자로 입력해주세요.');
          const comment={id:randomUUID(),postId:post.id,authorId:actor.id,body:text,createdAt:now(),deletedAt:null};db.comments.push(comment);return {comment:serializeComment(db,comment,actor)};
        }
        if(segments[2]==='vote'&&segments.length===3&&method==='POST'){
          if(![0,1,-1].includes(input.value))fail(400,'추천 값을 확인해주세요.');
          db.votes=db.votes.filter(vote=>!(vote.userId===actor.id&&vote.postId===post.id));if(input.value)db.votes.push({postId:post.id,userId:actor.id,value:input.value});return {post:serializePost(db,post,actor)};
        }
      }
      if(path==='admin/users'&&method==='GET'){
        if(!isStaff(actor.role))fail(403,'회원 목록은 운영진만 볼 수 있습니다.');
        return {users:db.users.filter(user=>user.status!=='withdrawn').map(user=>({...publicUser(user),...memberCapabilities(actor,user)}))};
      }
      if(path==='admin/approvals'&&method==='GET'){
        if(!isStaff(actor.role))fail(403,'운영자·부운영자만 요청 승인 목록을 볼 수 있습니다.');
        return {requests:approvalList(db,actor)};
      }
      if(segments[0]==='admin'&&segments[1]==='users'&&segments[2]){
        const target=memberForId(db,segments[2]);
        if(segments.length===4&&segments[3]==='approve'&&method==='POST'){
          if(!isStaff(actor.role))fail(403,'운영자·부운영자만 견습회원 승인이 가능합니다.');
          if(target.role!=='apprentice')fail(409,'승인 대기 중인 견습회원이 아닙니다.');
          approveApprentice(target,actor.id);audit(db,actor.id,'user.approve',target.id);return {user:publicUser(target)};
        }
        if(segments[3]==='expel'&&method==='POST'){
          if(actor.role!=='operator'||!outranks(actor.role,target.role))fail(403,'하위 등급 회원만 강퇴할 수 있습니다.');
          const reason=safeReason(input.reason);target.status='expelled';target.updatedAt=now();db.sessions=db.sessions.filter(session=>session.userId!==target.id);audit(db,actor.id,'user.expel',target.id,{reason});return {ok:true};
        }
        if(segments.length===3&&method==='PATCH'){
          if(actor.role!=='operator'||!outranks(actor.role,target.role)||!['deputy','member','apprentice'].includes(input.role))fail(403,'회원 등급을 변경할 권한이 없습니다.');
          const previous=target.role;
          if(previous==='apprentice'&&input.role!=='apprentice'){approveApprentice(target,actor.id);audit(db,actor.id,'user.approve',target.id);}
          target.role=input.role;target.updatedAt=now();
          if(previous!=='apprentice'&&input.role==='apprentice')startProbation(target,target.updatedAt);
          audit(db,actor.id,'user.role',target.id,{previous,role:input.role});return {user:publicUser(target)};
        }
      }
      if(path==='admin/requests'&&method==='POST'){
        if(actor.role!=='deputy')fail(403,'부운영자만 처리 요청을 등록할 수 있습니다.');
        if(!['post_delete','user_expel'].includes(input.type))fail(400,'요청 종류를 확인해주세요.');
        const post=input.type==='post_delete'?postForId(db,input.targetId):null;
        const target=post?db.users.find(user=>user.id===post.authorId):memberForId(db,input.targetId);
        if(!canRequest(actor,target))fail(403,'일반회원·견습회원에 대해서만 요청할 수 있습니다.');
        if(db.requests.some(item=>item.type===input.type&&item.targetId===input.targetId&&item.status==='pending'))fail(409,'이미 대기 중인 요청이 있습니다.');
        const item={id:randomUUID(),type:input.type,targetId:input.targetId,targetUserId:target.id,targetSnapshot:post?post.title:target.nickname,board:post?.board||null,requestedBy:actor.id,reason:safeReason(input.reason),status:'pending',createdAt:now(),reviewedAt:null,reviewedBy:null,reviewNote:''};db.requests.unshift(item);audit(db,actor.id,'request.create',item.id);return {request:item};
      }
      if(path==='admin/requests'&&method==='GET'){
        if(!isStaff(actor.role))fail(403,'운영진만 요청 목록을 볼 수 있습니다.');
        return {requests:db.requests.filter(item=>actor.role==='operator'||item.requestedBy===actor.id).map(item=>({...item,requesterNickname:db.users.find(user=>user.id===item.requestedBy)?.nickname||'탈퇴한 회원',reviewerNickname:db.users.find(user=>user.id===item.reviewedBy)?.nickname||null}))};
      }
      if(segments[0]==='admin'&&segments[1]==='requests'&&segments[2]&&segments[3]==='review'&&method==='POST'){
        if(actor.role!=='operator')fail(403,'운영자만 요청을 승인하거나 거부할 수 있습니다.');
        const item=db.requests.find(item=>item.id===segments[2]);if(!item)fail(404,'요청을 찾을 수 없습니다.');if(item.status!=='pending')fail(409,'이미 처리된 요청입니다.');if(!['approved','rejected'].includes(input.decision))fail(400,'처리 결과를 확인해주세요.');
        if(input.decision==='approved'){
          const requester=db.users.find(user=>user.id===item.requestedBy&&user.status==='active');
          const target=db.users.find(user=>user.id===item.targetUserId);
          if(!requester||requester.role!=='deputy'||!target||!canRequest(requester,target)||!outranks(actor.role,target.role))fail(409,'현재 회원 등급 또는 요청자 상태가 변경되어 승인할 수 없습니다.');
          if(item.type==='post_delete'){const post=postForId(db,item.targetId);post.deletedAt=now();audit(db,actor.id,'post.delete.approved',post.id,{requestId:item.id});}
          else{if(target.status!=='active')fail(409,'이미 탈퇴하거나 강퇴된 회원입니다.');target.status='expelled';target.updatedAt=now();db.sessions=db.sessions.filter(session=>session.userId!==target.id);audit(db,actor.id,'user.expel.approved',target.id,{requestId:item.id});}
        }
        item.status=input.decision;item.reviewedAt=now();item.reviewedBy=actor.id;item.reviewNote=typeof input.note==='string'?input.note.trim().slice(0,1000):'';audit(db,actor.id,'request.review',item.id,{decision:item.status});return {request:item};
      }
      fail(404,'요청한 API를 찾을 수 없습니다.');
    },method!=='GET');
    const response=json(result);if(path==='profile'&&method==='DELETE')clearSessionCookie(response);return response;
  }catch(error){if(error instanceof AppError)return json({error:error.message},error.status);console.error('Community API error:',error);return json({error:'요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'},500);}
}
export const GET=handler;
export const POST=handler;
export const PATCH=handler;
export const DELETE=handler;
