import { config } from '@/lib/server/config';
import { readStore } from '@/lib/server/store';
import { AppError, requireUser } from '@/lib/server/auth';
import { searchMapAddress } from '@/lib/server/map-search.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const attempts = new Map();
export async function GET(request) {
  try {
    const actor = await readStore((db) =>
      requireUser(db, request.cookies.get(config.cookie)?.value),
    );
    const q = new URL(request.url).searchParams.get('q')?.trim() || '';
    if (q.length < 2 || q.length > 300) throw new AppError(400, '주소를 2~300자로 입력해주세요.');
    const timestamp = Date.now();
    for (const [id, item] of attempts) if (timestamp - item.start > 60000) attempts.delete(id);
    const recent = attempts.get(actor.id) || { start: timestamp, count: 0 };
    if (recent.count >= 20)
      throw new AppError(429, '주소 검색이 많습니다. 잠시 후 다시 시도해주세요.');
    recent.count++;
    attempts.set(actor.id, recent);
    return Response.json(
      { results: await searchMapAddress(q, config.kakaoClientId) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof AppError
            ? error.message
            : error.name === 'TimeoutError'
              ? '주소 검색 시간이 초과되었습니다. 다시 시도해주세요.'
              : error.message || '주소 검색에 실패했습니다.',
      },
      {
        status: error instanceof AppError ? error.status : 502,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    );
  }
}
