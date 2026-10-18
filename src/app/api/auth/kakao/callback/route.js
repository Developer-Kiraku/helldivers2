import { applicationUrl } from '@/lib/server/application-url.mjs';
import { NextResponse } from 'next/server';
import { config } from '@/lib/server/config';
import { createToken, tokenHash } from '@/lib/server/passwords';
import { cookieOptions, createSession, setSessionCookie } from '@/lib/server/auth';
import { transaction, audit } from '@/lib/server/store';

export async function GET(request) {
  const url=new URL(request.url),state=request.cookies.get('hd_oauth_state')?.value;
  function failure(code){const response=NextResponse.redirect(applicationUrl(`/login?error=${code}`,request.url,config.origin));response.cookies.set('hd_oauth_state','',{...cookieOptions,maxAge:0});return response;}
  if(!state||state!==url.searchParams.get('state')||!url.searchParams.get('code')||!config.kakaoClientId||!config.kakaoRedirectUri)return failure('kakao-invalid-state');
  try{
    const form=new URLSearchParams({grant_type:'authorization_code',client_id:config.kakaoClientId,redirect_uri:config.kakaoRedirectUri,code:url.searchParams.get('code')});if(config.kakaoClientSecret)form.set('client_secret',config.kakaoClientSecret);
    const tokenResponse=await fetch('https://kauth.kakao.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form,cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!tokenResponse.ok)return failure('kakao-auth-failed');
    const tokens=await tokenResponse.json();
    const userResponse=await fetch('https://kapi.kakao.com/v2/user/me',{headers:{Authorization:`Bearer ${tokens.access_token}`},cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!userResponse.ok)return failure('kakao-auth-failed');
    const kakao=await userResponse.json();if(!kakao.id)return failure('kakao-auth-failed');
    const result=await transaction(db=>{
      const user=db.users.find(user=>user.kakao?.id===String(kakao.id));
      if(user){if(user.status!=='active')return {blocked:true};const token=createSession(db,user);audit(db,user.id,'login.kakao',user.id);return {token};}
      const ticket=createToken();db.pendingRegistrations=(db.pendingRegistrations||[]).filter(item=>Date.parse(item.expiresAt)>Date.now());
      db.pendingRegistrations.push({ticketHash:tokenHash(ticket),kakaoId:String(kakao.id),expiresAt:new Date(Date.now()+600000).toISOString()});return {ticket};
    });
    if(result.blocked)return failure('account-blocked');
    const response=NextResponse.redirect(applicationUrl(result.token?'/':'/signup',request.url,config.origin));response.cookies.set('hd_oauth_state','',{...cookieOptions,maxAge:0});
    if(result.token)setSessionCookie(response,result.token);else response.cookies.set('hd_signup',result.ticket,{...cookieOptions,maxAge:600});
    return response;
  }catch{return failure('kakao-auth-failed');}
}
