import { applicationUrl } from '@/lib/server/application-url.mjs';
import { NextResponse } from 'next/server';
import { config } from '@/lib/server/config';
import { createToken } from '@/lib/server/passwords';
import { cookieOptions, getCurrentUser } from '@/lib/server/auth';
import { transaction } from '@/lib/server/store';
import { registerOAuthState } from '@/lib/server/oauth-state.mjs';

export async function GET(request) {
  if (await getCurrentUser())
    return NextResponse.redirect(applicationUrl('/', request.url, config.origin));
  if (!config.kakaoClientId || !config.kakaoRedirectUri)
    return NextResponse.redirect(
      applicationUrl('/login?error=kakao-not-configured', request.url, config.origin),
    );
  const state = createToken();
  const url = new URL('https://kauth.kakao.com/oauth/authorize');
  const registered = await transaction((db) =>
    registerOAuthState(db, state, request.cookies.get('hd_oauth_state')?.value),
  );
  if (!registered)
    return NextResponse.redirect(
      applicationUrl('/login?error=kakao-auth-failed', request.url, config.origin),
    );
  url.searchParams.set('client_id', config.kakaoClientId);
  url.searchParams.set('redirect_uri', config.kakaoRedirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'private, no-store');
  response.cookies.set('hd_signup', '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set('hd_oauth_state', state, { ...cookieOptions, maxAge: 600 });
  return response;
}
