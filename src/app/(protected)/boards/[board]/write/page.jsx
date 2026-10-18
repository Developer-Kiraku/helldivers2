import { notFound } from 'next/navigation';
import { boards } from '@/lib/data';
import BoardEditor from '@/components/BoardEditor';

export default async function Page({ params }) {
  const { board } = await params;
  if (!boards[board]) notFound();
  return <BoardEditor board={board} />;
}
