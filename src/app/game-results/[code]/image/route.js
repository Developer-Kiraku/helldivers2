import { getGameShare } from '@/lib/server/game-share-page';
import { renderGameResultImage } from '@/lib/server/game-result-image';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const images = new Map();
export async function GET(request, { params }) {
  const { code } = await params;
  const share = await getGameShare(code);
  if (!share)
    return new Response('결과를 찾을 수 없습니다.', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  let image = images.get(code);
  if (!image) {
    image = renderGameResultImage(share.result).then((response) => response.arrayBuffer());
    images.set(code, image);
    if (images.size > 24) images.delete(images.keys().next().value);
    image.catch(() => images.delete(code));
  }
  return new Response(await image, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300',
      'X-Robots-Tag': 'noindex',
      ...(new URL(request.url).searchParams.has('download')
        ? { 'Content-Disposition': 'attachment; filename="game-result.png"' }
        : {}),
    },
  });
}
