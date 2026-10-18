import 'server-only';
import path from 'node:path';

export const config = {
  dataFile: path.resolve(process.env.JSON_DB_FILE || path.join(process.cwd(), 'data', 'db.json')),
  demoAuth: process.env.DEMO_AUTH_ENABLED !== 'false',
  sessionHours: 24,
  cookie: 'hd_session',
  secureCookies: process.env.COOKIE_SECURE === 'true',
  origin: process.env.APP_ORIGIN || '',
  kakaoClientId: process.env.KAKAO_REST_API_KEY || '',
  kakaoClientSecret: process.env.KAKAO_CLIENT_SECRET || '',
  kakaoRedirectUri: process.env.KAKAO_REDIRECT_URI || '',
  termsVersion: '2026-10-18',
};
