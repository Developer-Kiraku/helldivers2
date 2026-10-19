import { NextResponse } from 'next/server';
import { readStore, transaction, audit } from '@/lib/server/store';
import { AppError, requireUser, verifyOrigin } from '@/lib/server/auth';
import { config } from '@/lib/server/config';
import { boards } from '@/lib/data';
import { isStaff } from '@/lib/roles';
import { polishPost, PolishError, validatePolishInput } from '@/lib/server/ai-polish.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request) {
  try {
    verifyOrigin(request);
    const token = request.cookies.get(config.cookie)?.value;
    const actor = await readStore(db => requireUser(db, token));
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 100000) throw new AppError(413, '보정 요청이 너무 큽니다.');
    let input;
    try { input = JSON.parse(raw); } catch { throw new AppError(400, '올바른 요청이 필요합니다.'); }
    validatePolishInput(input);
    if (!Object.hasOwn(boards, input.board)) throw new AppError(400, '게시판을 확인해주세요.');
    if (input.board === 'notice' && !isStaff(actor.role)) throw new AppError(403, '공지사항은 운영진만 작성할 수 있습니다.');
    if (!process.env.OPENAI_API_KEY) throw new AppError(503, 'AI 내용 보정이 아직 설정되지 않았습니다. 운영자에게 문의해주세요.');
    // Reserve usage atomically across instances; never hold a DB lock during the API request.
    await transaction(db => {
      const user = requireUser(db, token);
      const recent = db.audit.filter(item => item.actorId === user.id && item.action === 'ai.polish' && Date.parse(item.createdAt) > Date.now() - 3600000);
      if (recent.length >= 20 || recent.some(item => Date.parse(item.createdAt) > Date.now() - 10000)) throw new AppError(429, 'AI 보정 요청이 많습니다. 잠시 후 다시 시도해주세요. (시간당 최대 20회)');
      audit(db, user.id, 'ai.polish', input.board);
    });
    return json(await polishPost(input));
  } catch (error) {
    if (error instanceof AppError || error instanceof PolishError) return json({ error: error.message }, error.status);
    return json({ error: 'AI 보정을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.' }, 500);
  }
}
