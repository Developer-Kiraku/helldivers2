import { notFound } from 'next/navigation';
import { boards } from '@/lib/data';
import BoardPage from '@/components/BoardPage';
import { requirePageUser } from '@/lib/server/auth';

export default async function Page({ params }) {
  await requirePageUser();
  const { board } = await params;
  if (!boards[board]) notFound();
  return <BoardPage key={board} board={board} />;
}
