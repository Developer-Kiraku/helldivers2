import { notFound, redirect } from 'next/navigation';
import { boards } from '@/lib/data';
import ArticlePage from '@/components/ArticlePage';
import { readStore } from '@/lib/server/store';
import { requirePageUser } from '@/lib/server/auth';
import { canReadPost } from '@/lib/post-access.mjs';

export default async function Page({ params }) {
  const { board, id } = await params;
  if (!boards[board]) notFound();
  const user = await requirePageUser();
  const movedTo = await readStore((db) => {
    const post = db.posts.find((item) => item.id === id && !item.deletedAt);
    return post && post.board !== board && canReadPost(post, user) ? post.board : null;
  });
  if (movedTo) redirect(`/boards/${movedTo}/${id}`);
  return <ArticlePage board={board} id={id} />;
}
