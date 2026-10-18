import { NextResponse } from 'next/server';
import { readStore } from '@/lib/server/store';
import { config } from '@/lib/server/config';
import { cookieOptions, userForToken } from '@/lib/server/auth';
import { postSharePath, validSharePath } from '@/lib/server/share-links.mjs';
import { boards } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request, { params }) {
  const { code } = await params;
  const path = `/s/${code}`;
  const missing = () => {
    const response = new NextResponse('게시글을 찾을 수 없습니다.', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set('hd_shared_post', '', { ...cookieOptions, maxAge: 0 });
    return response;
  };
  if (!validSharePath(path)) return missing();
  const result = await readStore(db => {
    const matches = db.posts.filter(post => !post.deletedAt && boards[post.board] && postSharePath(post) === path);
    if (matches.length !== 1) return null;
    return { target: `/boards/${matches[0].board}/${encodeURIComponent(matches[0].id)}`, signedIn: Boolean(userForToken(db, request.cookies.get(config.cookie)?.value)) };
  });
  if (!result) return missing();
  const response = NextResponse.redirect(new URL(result.signedIn ? result.target : '/login', config.origin || request.url));
  response.headers.set('Cache-Control', 'private, no-store');
  response.cookies.set('hd_shared_post', result.signedIn ? '' : path, { ...cookieOptions, maxAge: result.signedIn ? 0 : 3600 });
  return response;
}
