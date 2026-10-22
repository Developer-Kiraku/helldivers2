import { requirePageUser } from '@/lib/server/auth';
import PostHistoryPage from '@/components/PostHistoryPage';
export const metadata = { title: '게시글 변경 이력' };
export default async function Page() {
  await requirePageUser(['operator', 'deputy']);
  return <PostHistoryPage />;
}
