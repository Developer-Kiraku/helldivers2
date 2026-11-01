import { notFound } from 'next/navigation';
import WarbondDetail from '@/components/WarbondDetail';
import { warbondForSlug, warbondPageNumber } from '@/lib/warbonds.mjs';
import { requirePageUser } from '@/lib/server/auth';

export async function generateMetadata({ params }) {
  await requirePageUser();
  const warbond = warbondForSlug((await params).slug);
  return { title: warbond ? `${warbond.label} · 전쟁 채권 사전` : '전쟁 채권 사전' };
}
export default async function Page({ params, searchParams }) {
  await requirePageUser();
  const warbond = warbondForSlug((await params).slug);
  if (!warbond) notFound();
  const pageNumber = warbondPageNumber((await searchParams).page, warbond.pages.length);
  return <WarbondDetail warbond={warbond} pageNumber={pageNumber} />;
}
