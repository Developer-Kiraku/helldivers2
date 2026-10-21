import 'server-only';
import path from 'node:path';

export const config = {
  dataFile: path.resolve(process.env.JSON_DB_FILE || path.join(process.cwd(), 'data', 'db.json')),
  demoAuth:
    process.env.DEMO_AUTH_ENABLED === 'true' ||
    (process.env.NODE_ENV !== 'production' &&
      !process.env.RENDER &&
      process.env.DEMO_AUTH_ENABLED !== 'false'),
  sessionHours: 24,
  cookie: 'hd_session',
  secureCookies:
    Boolean(process.env.RENDER) ||
    /^https:\/\//.test(process.env.APP_ORIGIN || '') ||
    (process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production'),
  origin: process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || '',
  kakaoClientId: process.env.KAKAO_REST_API_KEY || '',
  kakaoClientSecret: process.env.KAKAO_CLIENT_SECRET || '',
  kakaoRedirectUri:
    process.env.KAKAO_REDIRECT_URI ||
    (process.env.RENDER_EXTERNAL_URL
      ? `${process.env.RENDER_EXTERNAL_URL}/api/auth/kakao/callback`
      : ''),
  termsVersion: '2026-10-18',
};
