import { NextResponse } from 'next/server';
import { readStore } from '@/lib/server/store';
import { AppError, fail, verifyOrigin } from '@/lib/server/auth';
import { tokenHash } from '@/lib/server/passwords';
import { validateNickname } from '@/lib/server/community';

export const runtime = 'nodejs';
const respond = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request) {
  try {
    verifyOrigin(request);
    const raw = await request.text();
    if (raw.length > 1000) fail(413, '요청 크기가 너무 큽니다.');
    let input;
    try { input = JSON.parse(raw); } catch { fail(400, '요청 정보를 확인해주세요.'); }
    const ticket = request.cookies.get('hd_signup')?.value;
    const result = await readStore(db => {
      const pending = (db.pendingRegistrations || []).some(item => ticket && item.ticketHash === tokenHash(ticket) && Date.parse(item.expiresAt) > Date.now());
      if (!pending) fail(401, '카카오 인증이 만료되었습니다. 다시 인증해주세요.');
      try {
        const nickname = validateNickname(input?.nickname, db);
        return { nickname, available: true, message: '사용 가능한 닉네임입니다.' };
      } catch (error) {
        if (error instanceof AppError && error.status === 409) return { nickname: input.nickname.trim(), available: false, message: error.message };
        throw error;
      }
    });
    return respond(result);
  } catch (error) {
    return respond({ error: error instanceof AppError ? error.message : '닉네임을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.' }, error instanceof AppError ? error.status : 500);
  }
}
