import { notFound } from 'next/navigation';
import { boards } from '@/lib/data';
import BoardPage from '@/components/BoardPage';

export default async function Page({ params }) {
  const { board } = await params;
  if (!boards[board]) notFound();
  return <BoardPage board={board} />;
}
