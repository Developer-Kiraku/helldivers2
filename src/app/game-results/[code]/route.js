import { getGameShare, gameShareHtml } from '@/lib/server/game-share-page';
import { applicationUrl } from '@/lib/server/application-url.mjs';
import { config } from '@/lib/server/config';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request, { params }) {
  const share = await getGameShare((await params).code);
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
  if (!share) return new Response('공유된 게임 결과를 찾을 수 없습니다.', { status: 404, headers });
  const origin = applicationUrl('/', request.url, config.origin).origin;
  return new Response(gameShareHtml(share, origin), {
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}
