import { requirePageUser } from '@/lib/server/auth';
import SlidingPuzzle from '@/components/SlidingPuzzle';
export const metadata = { title: '슬라이딩 퍼즐' };
export default async function Page() {
  await requirePageUser();
  return <SlidingPuzzle />;
}
