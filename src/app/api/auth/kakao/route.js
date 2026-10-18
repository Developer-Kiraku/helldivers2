import { NextResponse } from 'next/server';
import { config } from '@/lib/server/config';
import { createToken } from '@/lib/server/passwords';
import { cookieOptions, getCurrentUser } from '@/lib/server/auth';

export async function GET(request) {
  if(await getCurrentUser())return NextResponse.redirect(new URL('/',request.url));
  if(!config.kakaoClientId||!config.kakaoRedirectUri)return NextResponse.redirect(new URL('/login?error=kakao-not-configured',request.url));
  const state=createToken();const url=new URL('https://kauth.kakao.com/oauth/authorize');
  url.searchParams.set('client_id',config.kakaoClientId);url.searchParams.set('redirect_uri',config.kakaoRedirectUri);url.searchParams.set('response_type','code');url.searchParams.set('state',state);
  const response=NextResponse.redirect(url);response.cookies.set('hd_oauth_state',state,{...cookieOptions,maxAge:600});return response;
}
