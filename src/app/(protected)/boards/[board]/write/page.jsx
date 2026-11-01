import { notFound } from 'next/navigation';
import { boards } from '@/lib/data';
import BoardEditor from '@/components/BoardEditor';
import { requirePageUser } from '@/lib/server/auth';

export default async function Page({ params }) {
  await requirePageUser();
  const { board } = await params;
  if (!boards[board]) notFound();
  return <BoardEditor board={board} />;
}
