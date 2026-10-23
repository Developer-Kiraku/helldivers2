import { readStore } from '@/lib/server/store';
import { requireUser, AppError } from '@/lib/server/auth';
import { config } from '@/lib/server/config';
import { mapSettings } from '@/lib/server/api-keys';
import { normalizeMaps } from '@/lib/post-maps.mjs';
import { mapDocument } from '@/lib/server/map-document.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const settings = await readStore((db) => {
      requireUser(db, request.cookies.get(config.cookie)?.value);
      return mapSettings(db);
    });
    const input = Object.fromEntries(new URL(request.url).searchParams);
    if (input.provider === 'kakao') {
      input.lat = Number(input.lat);
      input.lng = Number(input.lng);
    }
    const [map] = normalizeMaps([input]);
    return new Response(mapDocument(map, settings), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    });
  } catch (error) {
    return new Response(error instanceof AppError ? error.message : '지도 정보를 확인해주세요.', {
      status: error instanceof AppError ? error.status : 400,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
}
