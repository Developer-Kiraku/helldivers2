import { requirePageUser } from '@/lib/server/auth';
import PointGuide from '@/components/PointGuide';
export const metadata = { title: '포인트 얻는 방법' };
export default async function Page() {
  await requirePageUser();
  return <PointGuide />;
}
