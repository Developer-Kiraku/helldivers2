import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { transaction, audit } from '@/lib/server/store';
import { config } from '@/lib/server/config';
import { AppError, fail, verifyOrigin, cookieOptions, createSession, setSessionCookie, publicUser, userForToken } from '@/lib/server/auth';
import { tokenHash } from '@/lib/server/passwords';
import { validateNickname, now } from '@/lib/server/community';
import { startProbation } from '@/lib/server/probation.mjs';

export async function POST(request){
 try{
  verifyOrigin(request);const raw=await request.text();if(raw.length>10000)fail(413,'요청 크기가 너무 큽니다.');let input;try{input=JSON.parse(raw)}catch{fail(400,'요청 정보를 확인해주세요.')}
  const ticket=request.cookies.get('hd_signup')?.value;
  const result=await transaction(db=>{
   if(userForToken(db,request.cookies.get(config.cookie)?.value))fail(409,'이미 로그인되어 있습니다.');
   const pending=(db.pendingRegistrations||[]).find(item=>ticket&&item.ticketHash===tokenHash(ticket)&&Date.parse(item.expiresAt)>Date.now());if(!pending)fail(401,'카카오 인증을 먼저 완료해주세요.');
   if(input.agreements?.age!==true||input.agreements?.terms!==true||input.agreements?.collect!==true)fail(400,'필수 동의 항목을 모두 확인해주세요.');
   if(db.users.some(user=>user.kakao?.id===pending.kakaoId))fail(409,'이미 가입했거나 이용이 제한된 계정입니다.');
   const user={id:randomUUID(),loginId:null,passwordHash:null,role:'apprentice',nickname:validateNickname(input.nickname,db),photo:'',kakao:{id:pending.kakaoId,connectedAt:now()},status:'active',createdAt:now(),updatedAt:now(),lastLoginAt:null,agreements:{ageConfirmed:true,termsVersion:config.termsVersion,privacyVersion:config.termsVersion,agreedAt:now()}};
   startProbation(user);db.users.push(user);db.pendingRegistrations=db.pendingRegistrations.filter(item=>item!==pending);const token=createSession(db,user);audit(db,user.id,'user.register',user.id);return {user:publicUser(user),token};
  });
  const response=NextResponse.json({user:result.user},{status:201});setSessionCookie(response,result.token);response.cookies.set('hd_signup','',{...cookieOptions,maxAge:0});return response;
 }catch(error){return NextResponse.json({error:error instanceof AppError?error.message:'가입을 처리하지 못했습니다.'},{status:error instanceof AppError?error.status:500});}
}
