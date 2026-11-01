import { notFound } from 'next/navigation';
import WarbondDetail from '@/components/WarbondDetail';
import { warbondForSlug, warbondPageNumber } from '@/lib/warbonds.mjs';

export async function generateMetadata({ params }) {
  const warbond = warbondForSlug((await params).slug);
  return { title: warbond ? `${warbond.label} · 전쟁 채권 사전` : '전쟁 채권 사전' };
}
export default async function Page({ params, searchParams }) {
  const warbond = warbondForSlug((await params).slug);
  if (!warbond) notFound();
  const pageNumber = warbondPageNumber((await searchParams).page, warbond.pages.length);
  return <WarbondDetail warbond={warbond} pageNumber={pageNumber} />;
}
