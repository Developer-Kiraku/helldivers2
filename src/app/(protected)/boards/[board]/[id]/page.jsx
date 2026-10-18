import { notFound } from 'next/navigation';
import { boards } from '@/lib/data';
import ArticlePage from '@/components/ArticlePage';

export default async function Page({ params }) {
  const { board, id } = await params;
  if (!boards[board]) notFound();
  return <ArticlePage board={board} id={id} />;
}
