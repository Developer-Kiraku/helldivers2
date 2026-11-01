import { NextResponse } from 'next/server';
import { readStore } from '@/lib/server/store';
import { config } from '@/lib/server/config';
import { cookieOptions, userForToken } from '@/lib/server/auth';
import { postSharePath, validSharePath } from '@/lib/server/share-links.mjs';
import { boards } from '@/lib/data';
import { canReadPost } from '@/lib/post-access.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request, { params }) {
  const { code } = await params;
  const path = `/s/${code}`;
  const missing = () => {
    const response = new NextResponse('게시글을 찾을 수 없습니다.', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
    response.cookies.set('hd_shared_post', '', { ...cookieOptions, maxAge: 0 });
    return response;
  };
  const result = await readStore((db) => {
    const viewer = userForToken(db, request.cookies.get(config.cookie)?.value);
    // Do not reveal even the existence or title of a shared post before login.
    if (!viewer) return { signedIn: false, target: '/login' };
    if (!validSharePath(path)) return null;
    const matches = db.posts.filter(
      (post) => !post.deletedAt && boards[post.board] && postSharePath(post) === path,
    );
    if (matches.length !== 1) return null;
    if (!canReadPost(matches[0], viewer)) return null;
    return {
      target: `/boards/${matches[0].board}/${encodeURIComponent(matches[0].id)}`,
      signedIn: true,
    };
  });
  if (!result) return missing();
  const response = NextResponse.redirect(new URL(result.target, config.origin || request.url));
  response.headers.set('Cache-Control', 'private, no-store');
  const remember = !result.signedIn && validSharePath(path);
  response.cookies.set('hd_shared_post', remember ? path : '', {
    ...cookieOptions,
    maxAge: remember ? 3600 : 0,
  });
  return response;
}
