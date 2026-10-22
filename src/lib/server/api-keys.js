import 'server-only';
import { config } from './config';
const legacyKey = '3d1f509c6041af3403927f3ed4883fed';
export function kakaoShareSettings(db) {
  const saved = db.integrationSettings?.kakaoJavaScriptKey;
  const javaScriptKey =
    saved !== undefined ? saved : (process.env.KAKAO_JAVASCRIPT_KEY ?? legacyKey);
  return {
    javaScriptKey,
    configured: Boolean(javaScriptKey),
    source:
      saved !== undefined
        ? '관리 메뉴'
        : process.env.KAKAO_JAVASCRIPT_KEY !== undefined
          ? '서버 환경변수'
          : '기존 설정',
  };
}
export function apiKeySettings(db) {
  return {
    kakao: kakaoShareSettings(db),
    serverKeys: [
      { name: '카카오 로그인 · REST API 키', configured: Boolean(config.kakaoClientId) },
      {
        name: '카카오 로그인 · Client Secret',
        configured: Boolean(config.kakaoClientSecret),
        optional: true,
      },
      { name: 'OpenAI API 키', configured: Boolean(process.env.OPENAI_API_KEY), optional: true },
    ],
    origin: config.origin,
    updatedAt: db.integrationSettings?.updatedAt || null,
  };
}
