import { requirePageUser } from '@/lib/server/auth';
import RequestsPage from '@/components/RequestsPage';
export const metadata = { title: '요청 승인 목록' };
export default async function Page() {
  await requirePageUser(['operator', 'deputy']);
  return <RequestsPage />;
}
